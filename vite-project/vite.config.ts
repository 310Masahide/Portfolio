import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeEnvValue(v: string): string {
  const trimmed = v.trim()
  // "..." や '...' で囲まれているケースを剥がす
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  return unquoted.trim()
}

function isAsciiOnly(v: string): boolean {
  return /^[\x00-\x7F]+$/.test(v)
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .env をサーバー側でも読めるようにする
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'ai-proxy',
        configureServer(server) {
          // デバッグ用（キーそのものは返さない）
          server.middlewares.use('/api/env-check', async (_req, res) => {
            const geminiKey = normalizeEnvValue(env.VITE_GEMINI_API_KEY ?? '')
            const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY ?? '')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                hasGeminiKey: Boolean(geminiKey),
                geminiKeyLength: geminiKey.length,
                hasOpenAIKey: Boolean(openaiKey),
                openaiKeyLength: openaiKey.length,
              }),
            )
          })

          server.middlewares.use('/api/gemini', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
              return
            }

            const apiKey = normalizeEnvValue(env.VITE_GEMINI_API_KEY ?? '')
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error: { message: 'Server missing VITE_GEMINI_API_KEY' },
                }),
              )
              return
            }

            if (!isAsciiOnly(apiKey)) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error: {
                    message:
                      'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。Gemini の API Key を再コピーして貼り直してください。',
                  },
                }),
              )
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}') as { prompt?: string }
                const prompt = String(parsed.prompt ?? '')

                const upstream = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
                    apiKey,
                  )}`,
                  {
                    method: 'POST',
                    headers: {
                      'content-type': 'application/json',
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
                  },
                )

                const text = await upstream.text()
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(text)
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: { message: e instanceof Error ? e.message : 'Unknown error' },
                  }),
                )
              }
            })
          })

          server.middlewares.use('/api/openai', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
              return
            }

            const apiKey = normalizeEnvValue(env.OPENAI_API_KEY ?? '')
            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error: { message: 'Server missing OPENAI_API_KEY' },
                }),
              )
              return
            }

            if (!isAsciiOnly(apiKey)) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  error: {
                    message:
                      'Invalid API key: non-ASCII characters detected. キーに日本語/全角文字が混ざっています。OpenAI の API Key を再コピーして貼り直してください。',
                  },
                }),
              )
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}') as { prompt?: string }
                const prompt = String(parsed.prompt ?? '')

                const upstream = await fetch('https://api.openai.com/v1/responses', {
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
                })

                const text = await upstream.text()
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(text)
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: { message: e instanceof Error ? e.message : 'Unknown error' },
                  }),
                )
              }
            })
          })
        },
      },
    ],
  }
})
