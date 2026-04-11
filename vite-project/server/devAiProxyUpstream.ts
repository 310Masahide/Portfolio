/** 開発用 AI プロキシが中継する外部 API（URL・モデルは .env で上書き可） */

/** `.env` 未設定時の既定（GEMINI_API_URL / OPENAI_API_URL / OPENAI_MODEL で上書き） */
export const DEFAULT_GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/responses'

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

function trimEnvValue(v: string): string {
  const t = v.trim()
  return t.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim()
}

/** `env` は Vite `loadEnv` の結果を優先（開発サーバーで `.env` が確実に効く） */
function readAiEnv(key: string, defaultValue: string, env?: Record<string, string>): string {
  const raw = env?.[key] ?? process.env[key]
  if (raw == null || raw === '') return defaultValue
  const v = trimEnvValue(String(raw))
  return v || defaultValue
}

export function resolveGeminiApiUrl(env?: Record<string, string>): string {
  return readAiEnv('GEMINI_API_URL', DEFAULT_GEMINI_API_URL, env)
}

export function resolveOpenAiApiUrl(env?: Record<string, string>): string {
  return readAiEnv('OPENAI_API_URL', DEFAULT_OPENAI_API_URL, env)
}

export function resolveOpenAiModel(env?: Record<string, string>): string {
  return readAiEnv('OPENAI_MODEL', DEFAULT_OPENAI_MODEL, env)
}

export function fetchGeminiGenerate(
  apiKey: string,
  prompt: string,
  env?: Record<string, string>,
): Promise<Response> {
  const url = resolveGeminiApiUrl(env)
  return fetch(url, {
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
  })
}

export function fetchOpenAiResponses(
  apiKey: string,
  prompt: string,
  env?: Record<string, string>,
): Promise<Response> {
  const url = resolveOpenAiApiUrl(env)
  const model = resolveOpenAiModel(env)
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 900,
      temperature: 0.7,
    }),
  })
}
