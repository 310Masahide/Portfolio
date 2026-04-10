import type { IncomingMessage, ServerResponse } from 'http'
import type { Connect, ViteDevServer } from 'vite'
import { fetchGeminiGenerate, fetchOpenAiResponses } from './devAiProxyUpstream'

const MAX_AI_PROXY_BODY_BYTES = 100 * 1024

/** 同一 IP あたりの POST 回数（開発サーバー誤露出時のキー消費を緩やかに抑える） */
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_PER_WINDOW = 60

type PromptUpstream = (prompt: string) => Promise<Response>

type PromptProxyRouteOptions = {
  /** `resolveApiKey` が無いときに使う env キー名 */
  envKey: string
  /** 指定時は `envKey` より優先（例: GEMINI_API_KEY → 互換で VITE_GEMINI_API_KEY） */
  resolveApiKey?: (env: Record<string, string>) => string
  missingMessage: string
  nonAsciiMessage: string
  /** API キー・プロンプト・Vite `loadEnv` 結果で upstream を呼ぶ（キー検証後に渡される） */
  fetchUpstream: (
    apiKey: string,
    prompt: string,
    env: Record<string, string>,
  ) => Promise<Response>
}

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

/** 長期間アクセスのない IP エントリを Map から除去（メモリ肥大化防止） */
function pruneStaleRateBuckets(now: number): void {
  const ttl = RATE_LIMIT_WINDOW_MS * 3
  rateBuckets.forEach((b, key) => {
    if (now > b.resetAt + ttl) rateBuckets.delete(key)
  })
}

function allowRateLimit(clientKey: string): boolean {
  const now = Date.now()
  if (rateBuckets.size > 200) pruneStaleRateBuckets(now)
  let b = rateBuckets.get(clientKey)
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    rateBuckets.set(clientKey, b)
  }
  if (b.count >= RATE_LIMIT_MAX_PER_WINDOW) return false
  b.count += 1
  return true
}

/** サーバー専用の `GEMINI_API_KEY` を優先し、従来の `VITE_GEMINI_API_KEY` にフォールバック */
function resolveGeminiApiKey(env: Record<string, string>): string {
  return normalizeEnvValue(env.GEMINI_API_KEY ?? '') || normalizeEnvValue(env.VITE_GEMINI_API_KEY ?? '')
}

function isLocalhost(req: IncomingMessage): boolean {
  const a = req.socket.remoteAddress
  if (!a) return false
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1'
}

function resolvePromptApiKey(env: Record<string, string>, opts: PromptProxyRouteOptions): string {
  if (opts.resolveApiKey) return opts.resolveApiKey(env)
  return normalizeEnvValue(env[opts.envKey] ?? '')
}

function normalizeEnvValue(v: string): string {
  const trimmed = v.trim()
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  return unquoted.trim()
}

function isAsciiOnly(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    if (v.charCodeAt(i) > 127) return false
  }
  return true
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  if (res.writableEnded) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function readBodyLimited(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let total = 0
    let settled = false

    const finish413 = () => {
      if (settled) return
      settled = true
      req.destroy()
      if (!res.writableEnded) {
        sendJson(res, 413, { error: { message: 'Payload too large' } })
      }
      resolve(null)
    }

    req.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8')
      if (total + buf.length > maxBytes) {
        finish413()
        return
      }
      total += buf.length
      chunks.push(buf)
    })

    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks).toString('utf8'))
    })

    req.on('error', () => {
      if (settled) return
      settled = true
      sendJson(res, 400, { error: { message: 'Request body read error' } })
      resolve(null)
    })
  })
}

function requirePost(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method === 'POST') return true
  sendJson(res, 405, { error: { message: 'Method not allowed' } })
  return false
}

function requireAsciiApiKey(
  res: ServerResponse,
  key: string,
  opts: { missingMessage: string; nonAsciiMessage: string },
): string | null {
  if (!key) {
    sendJson(res, 500, { error: { message: opts.missingMessage } })
    return null
  }
  if (!isAsciiOnly(key)) {
    sendJson(res, 400, { error: { message: opts.nonAsciiMessage } })
    return null
  }
  return key
}

async function forwardUpstreamJson(res: ServerResponse, upstream: Response): Promise<void> {
  const text = await upstream.text()
  if (upstream.ok) {
    res.statusCode = upstream.status
    res.setHeader('Content-Type', 'application/json')
    res.end(text)
    return
  }
  if (process.env.NODE_ENV !== 'production') {
    const preview = text.length > 800 ? `${text.slice(0, 800)}…` : text
    console.error('[devAiProxy] upstream error', upstream.status, preview)
  }
  sendJson(res, 502, { error: { message: 'Upstream request failed' } })
}

/** POST の JSON `{ prompt }` を読み、upstream を呼び、レスポンスをそのまま返す */
async function handlePromptProxy(
  req: IncomingMessage,
  res: ServerResponse,
  fetchUpstream: PromptUpstream,
): Promise<void> {
  try {
    const body = await readBodyLimited(req, res, MAX_AI_PROXY_BODY_BYTES)
    if (body === null) return
    let parsed: { prompt?: string }
    try {
      parsed = JSON.parse(body || '{}') as { prompt?: string }
    } catch {
      sendJson(res, 400, { error: { message: 'Invalid JSON body' } })
      return
    }
    const prompt = String(parsed.prompt ?? '')
    const upstream = await fetchUpstream(prompt)
    await forwardUpstreamJson(res, upstream)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[devAiProxy] handlePromptProxy', e)
    }
    sendJson(res, 500, { error: { message: 'Internal server error' } })
  }
}

function mountPromptProxyRoute(
  middlewares: Connect.Server,
  path: string,
  env: Record<string, string>,
  opts: PromptProxyRouteOptions,
): void {
  middlewares.use(path, async (req, res) => {
    if (!requirePost(req, res)) return
    const ip = req.socket.remoteAddress ?? 'unknown'
    if (!allowRateLimit(`${ip}:${path}`)) {
      sendJson(res, 429, { error: { message: 'Too many requests' } })
      return
    }
    const apiKey = requireAsciiApiKey(res, resolvePromptApiKey(env, opts), {
      missingMessage: opts.missingMessage,
      nonAsciiMessage: opts.nonAsciiMessage,
    })
    if (!apiKey) return
    const upstream: PromptUpstream = (prompt) => opts.fetchUpstream(apiKey, prompt, env)
    await handlePromptProxy(req, res, upstream)
  })
}

export function installDevAiProxy(server: ViteDevServer, env: Record<string, string>): void {
  const { middlewares } = server

  middlewares.use('/api/env-check', (req, res) => {
    if (!isLocalhost(req)) {
      sendJson(res, 404, { error: { message: 'Not found' } })
      return
    }
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: { message: 'Method not allowed' } })
      return
    }
    const geminiKey = resolveGeminiApiKey(env)
    const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY ?? '')
    sendJson(res, 200, {
      hasGeminiKey: Boolean(geminiKey),
      hasOpenAIKey: Boolean(openaiKey),
    })
  })

  mountPromptProxyRoute(middlewares, '/api/gemini', env, {
    envKey: 'GEMINI_API_KEY',
    resolveApiKey: resolveGeminiApiKey,
    missingMessage: 'Server missing GEMINI_API_KEY (or legacy VITE_GEMINI_API_KEY)',
    nonAsciiMessage:
      'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。Gemini の API Key を再コピーして貼り直してください。',
    fetchUpstream: fetchGeminiGenerate,
  })

  /** フロント未使用。curl/拡張用の OpenAI プロキシ（Responses API）。 */
  mountPromptProxyRoute(middlewares, '/api/openai', env, {
    envKey: 'OPENAI_API_KEY',
    missingMessage: 'Server missing OPENAI_API_KEY',
    nonAsciiMessage:
      'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。OpenAI の API Key を再コピーして貼り直してください。',
    fetchUpstream: fetchOpenAiResponses,
  })
}
