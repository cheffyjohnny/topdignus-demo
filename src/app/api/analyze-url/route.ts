import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Primary → fallback order. 2.5-flash is high-demand; 2.0-flash / 1.5-flash are stable.
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']

const FIELDS = [
  'NO', '대리점', '현장명', '주소', '최근 방문일',
  '건설사', '설비사', '담당자', '담당자 연락처', '규모', '비고',
]

async function callGemini(model: string, apiKey: string, prompt: string): Promise<Response> {
  return fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url이 필요합니다.' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY 환경변수가 없습니다.' }, { status: 500 })

  let articleText: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TopdiBot/1.0)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    $('script, style, nav, header, footer, aside, noscript').remove()
    articleText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `URL 가져오기 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 422 },
    )
  }

  const prompt = `다음은 건설/설비 관련 기사 본문입니다. 아래 JSON 필드에 맞게 정보를 추출하세요.
추출 불가한 필드는 null로 설정하세요. JSON만 반환하고 다른 텍스트는 쓰지 마세요.

필드: ${FIELDS.join(', ')}

기사 본문:
${articleText}`

  let lastError = ''

  for (const model of MODELS) {
    // Retry up to 2 times per model on 503
    for (let attempt = 0; attempt < 2; attempt++) {
      let geminiRes: Response
      try {
        geminiRes = await callGemini(model, apiKey, prompt)
      } catch (e: unknown) {
        lastError = `네트워크 오류: ${e instanceof Error ? e.message : String(e)}`
        break
      }

      if (geminiRes.status === 503) {
        // Wait briefly then retry (or move to next model on second attempt)
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500))
          continue
        }
        lastError = `${model}: 서버 과부하 (503)`
        break
      }

      if (!geminiRes.ok) {
        const err = await geminiRes.text()
        lastError = `${model}: ${err}`
        break
      }

      try {
        const data = await geminiRes.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
        const parsed = JSON.parse(rawText)
        return NextResponse.json({ result: parsed, model })
      } catch (e: unknown) {
        lastError = `${model}: 응답 파싱 실패 — ${e instanceof Error ? e.message : String(e)}`
        break
      }
    }
  }

  return NextResponse.json({ error: `AI 분석 실패: ${lastError}` }, { status: 500 })
}
