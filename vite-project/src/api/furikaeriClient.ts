import type { FurikaeriForm } from '../types/furikaeri'

const GEMINI_API_URL = '/api/gemini'

function buildPrompt(form: FurikaeriForm): string {
  return `あなたは優しく寄り添う日記コーチです。ユーザーの今日一日を俯瞰的に振り返り、温かく励ますフィードバックを日本語で詳しくお願いします。

【今日は何がありましたか？】
${form.events || '（なし）'}

フィードバックは以下の点を意識してください：
- 全体を俯瞰して、今日のテーマや傾向を見つける
- つらかった出来事も成長の糧として前向きに捉える
- 気づきが含まれていれば特に大切にして深める
- 最後に明日への小さな励ましで締める
- 絵文字は使わず、落ち着いた文体で

最後に必ず「---END---」という文字列を付けて完了してください。`
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  error?: { message?: string; status?: string }
}

async function requestGemini(prompt: string): Promise<{ text: string; finishReason?: string }> {
  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const data = (await res.json()) as GeminiResponse

  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`
    return { text: `エラー: ${msg}` }
  }

  const parts = data.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('')
  return { text: text.trim() || 'フィードバックを取得できませんでした。', finishReason: data.candidates?.[0]?.finishReason }
}

function tail(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(-maxChars) : text
}

export async function analyzeFurikaeri(form: FurikaeriForm): Promise<string> {
  const basePrompt = buildPrompt(form)

  const contPrompt = (prevText: string) =>
    `あなたは優しく寄り添う日記コーチです。以下の「出来事」へのフィードバックの続きを、直前の文から自然に繋がるように日本語で出力してください。\n\n【出来事】\n${form.events || '（なし）'}\n\n【直前の出力の末尾（参考）】\n${tail(prevText, 320)}\n\n注意:\n- 前回の内容は繰り返さず、続きを書く\n- 絵文字は使わない\n- 最後に必ず「---END---」を付ける`

  // アプリ側の「回数制限」は極力緩める（無限ループ防止の安全装置だけ残す）
  const maxRequests = 8
  let combined = ''
  let lastText = ''

  for (let i = 0; i < maxRequests; i++) {
    const prompt = i === 0 ? basePrompt : contPrompt(lastText || combined)
    const r = await requestGemini(prompt)
    if (r.text.startsWith('エラー:')) return r.text

    const cleaned = r.text.replace(/\n*---END---\s*$/, '').trim()
    combined = combined ? `${combined}\n\n${cleaned}` : cleaned
    lastText = r.text

    // 完了マーカーが含まれていれば終了
    if (r.text.includes('---END---')) return combined

    // 連続でMAX_TOKENSっぽい場合は次のループで続きを取る
    // （ここでは止めずに継続）
  }

  // ここまで来るのはかなり稀（API上限/安全装置到達）
  return (
    combined +
    '\n\n（これ以上はアプリ側の安全装置で取得を止めました。出来事の文章を短くして再実行すると、最後まで出やすいです）'
  )
}
