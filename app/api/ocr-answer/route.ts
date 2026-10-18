import { NextResponse } from 'next/server'

/**
 * @file app/api/ocr-answer/route.ts
 * @description 스마트폰 카메라로 촬영한 손글씨 논술 답안지/원고지 다중 이미지를 순서대로 Gemini Vision API로 전송하여
 *              원고지 교정 부호 및 문맥을 반영한 정제된 텍스트로 자동 전사(OCR)하는 API
 */

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { images, questionLabel = '논술 답안', charLimit = '' } = body

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: '변환할 이미지 데이터가 없습니다. 최소 1장 이상의 사진을 업로드해 주세요.' },
        { status: 400 }
      )
    }

    // Gemini API 멀티모달 parts 생성: 업로드된 순서대로 이미지 part 추가
    const parts: any[] = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (!img || !img.data) continue

      // base64 prefix(예: data:image/jpeg;base64,)가 남아있을 경우 제거
      const cleanData = img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
      const mimeType = img.mimeType || 'image/jpeg'

      parts.push({
        inlineData: {
          mimeType,
          data: cleanData
        }
      })
    }

    if (parts.length === 0) {
      return NextResponse.json(
        { error: '유효한 이미지 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // 논술 수기 답안 전용 정밀 OCR 프롬프트 추가
    const promptText = `당신은 대한민국 대학 입시 논술 전문 전사(Transcription) 및 교정 AI 전문가입니다.
제공된 이미지는 수험생이 실제 원고지나 노트에 손글씨(필기체)로 작성한 논술 답안지 사진입니다.
이미지는 작성 순서대로 (1페이지부터 마지막 페이지까지) 나열되어 있습니다.

아래 지침에 따라 이미지를 면밀히 판독하여 수험생이 최종적으로 작성하고자 한 완전한 답안 텍스트를 복원하십시오.

【전사 및 교정 지침】
1. **페이지 순서 연결**:
   - 제공된 이미지 순서대로 글의 흐름을 끊김 없이 하나로 자연스럽게 연결하십시오.
2. **원고지 교정 부호 완벽 반영**:
   - 삭제선(줄 긋기), 띄어쓰기 부호(∨), 글자 삽입(행간 추가), 문장 부호 수정 등 수험생의 수기 교정 표시가 있다면 이를 최종 반영된 결과물로 수정하여 전사하십시오.
3. **자연스러운 단락 및 줄바꿈**:
   - 원고지 한 줄의 끝 칸에 도달하여 물리적으로 다음 줄로 넘어간 줄바꿈은 하나의 문장으로 자연스럽게 이어붙이십시오.
   - 단락이 바뀌는 들여쓰기(첫 칸 비움)나 실제 문맥상 단락 구분이 일어나는 곳에만 줄바꿈(엔터)을 적용하십시오.
4. **불필요한 잡음 배제**:
   - 촬영 시 화면 가장자리에 찍힌 손가락, 책상 바닥, 그림자, 원고지 칸 번호(100, 200 등)나 여백 메모는 무시하고, 순수 논술 답안 본문만 추출하십시오.
5. **글자 왜곡 방지 및 정확성**:
   - 수험생의 손글씨 필기체가 다소 흘려 쓰여 있더라도, 국어 문맥 및 논술 논리 흐름을 바탕으로 가장 자연스럽고 올바른 한국어 단어로 정확하게 판독하십시오.
6. **출력 형식**:
   - 인사말, 부연 설명, 마크다운 코드 블록(백틱 \`\`\`) 등 어떠한 설명도 절대 포함하지 말고, 오직 [추출된 순수 답안 텍스트]만 그대로 출력하십시오.`

    parts.push({ text: promptText })

    // Gemini API 호출 (최신 고성능 비전 모델 라인업 및 503/429 장애 자동 재시도)
    const models = [
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
      'gemini-pro-latest'
    ]

    let resultText = ''
    let lastError: any = null
    let usedModel = ''

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(res => setTimeout(res, 800))
          }

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                  temperature: 0.1
                }
              })
            }
          )

          if (!geminiRes.ok) {
            const errText = await geminiRes.text()
            lastError = new Error(`Model ${model} failed (${geminiRes.status}): ${errText}`)
            if ((geminiRes.status === 503 || geminiRes.status === 429) && attempt === 0) {
              console.warn(`[OCR API] ${model} 과부하 (${geminiRes.status}): 0.8초 후 재시도`)
              continue
            }
            break
          }

          const data = await geminiRes.json()
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText && typeof rawText === 'string') {
            // 마크다운 코드블록 백틱이나 불필요한 앞뒤 공백 제거
            resultText = rawText
              .replace(/^```[a-zA-Z]*\n/, '')
              .replace(/\n```$/, '')
              .trim()
            usedModel = model
            break
          }
        } catch (err: any) {
          lastError = err
        }
      }

      if (resultText) break
    }

    if (!resultText) {
      throw lastError || new Error('Gemini API로부터 텍스트를 추출하지 못했습니다.')
    }

    return NextResponse.json({
      success: true,
      text: resultText,
      charCountWithSpaces: resultText.length,
      charCountWithoutSpaces: resultText.replace(/\s/g, '').length,
      modelUsed: usedModel
    })
  } catch (error: any) {
    console.error('[OCR Error]', error)
    return NextResponse.json(
      { error: error.message || '사진 판독 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
