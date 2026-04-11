import type { IncomingMessage, ServerResponse } from 'http'
import type { ViteDevServer } from 'vite'

const MAX_AI_PROXY_BODY_BYTES = 100 * 1024

const GEMINI_GENERATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

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
  res.statusCode = upstream.status
  res.setHeader('Content-Type', 'application/json')
  res.end(text)
}

/** POST の JSON `{ prompt }` を読み、upstream を呼び、レスポンスをそのまま返す */
async function handlePromptProxy(
  req: IncomingMessage,
  res: ServerResponse,
  fetchUpstream: (prompt: string) => Promise<Response>,
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
    sendJson(res, 500, {
      error: { message: e instanceof Error ? e.message : 'Unknown error' },
    })
  }
}

export function installDevAiProxy(server: ViteDevServer, env: Record<string, string>): void {
  const { middlewares } = server

  middlewares.use('/api/env-check', (_req, res) => {
    const geminiKey = normalizeEnvValue(env.VITE_GEMINI_API_KEY ?? '')
    const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY ?? '')
    sendJson(res, 200, {
      hasGeminiKey: Boolean(geminiKey),
      geminiKeyLength: geminiKey.length,
      hasOpenAIKey: Boolean(openaiKey),
      openaiKeyLength: openaiKey.length,
    })
  })

  middlewares.use('/api/gemini', async (req, res) => {
    if (!requirePost(req, res)) return
    const apiKey = requireAsciiApiKey(res, normalizeEnvValue(env.VITE_GEMINI_API_KEY ?? ''), {
      missingMessage: 'Server missing VITE_GEMINI_API_KEY',
      nonAsciiMessage:
        'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。Gemini の API Key を再コピーして貼り直してください。',
    })
    if (!apiKey) return
    await handlePromptProxy(req, res, (prompt) =>
      fetch(GEMINI_GENERATE_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
          },
        }),
      }),
    )
  })

  middlewares.use('/api/openai', async (req, res) => {
    if (!requirePost(req, res)) return
    const apiKey = requireAsciiApiKey(res, normalizeEnvValue(env.OPENAI_API_KEY ?? ''), {
      missingMessage: 'Server missing OPENAI_API_KEY',
      nonAsciiMessage:
        'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。OpenAI の API Key を再コピーして貼り直してください。',
    })
    if (!apiKey) return
    await handlePromptProxy(req, res, (prompt) =>
      fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: prompt,
          max_output_tokens: 900,
          temperature: 0.7,
        }),
      }),
    )
  })
}
