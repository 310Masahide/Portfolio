/** 開発用 AI プロキシが中継する外部 API（モデル・エンドポイント設定） */

export const GEMINI_GENERATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export function fetchGeminiGenerate(apiKey: string, prompt: string): Promise<Response> {
  return fetch(GEMINI_GENERATE_URL, {
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

export function fetchOpenAiResponses(apiKey: string, prompt: string): Promise<Response> {
  return fetch(OPENAI_RESPONSES_URL, {
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
}
