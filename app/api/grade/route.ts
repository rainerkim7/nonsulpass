import { NextResponse } from 'next/server'
import type { GradingReportData } from '@/types/grading'

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
    const {
      university = '홍익대학교',
      examTitle = '2026 수시 인문계열 기출',
      questionLabel = '문제 1',
      questionTitle = '',
      charLimit = '800±100자',
      passages = [],
      rubric = null,
      modelAnswer = '',
      studentAnswer = '',
      studentName = '수험생',
    } = body

    if (!studentAnswer || studentAnswer.trim().length < 30) {
      return NextResponse.json(
        { error: '답안 내용이 너무 짧습니다. 최소 30자 이상 작성해 주세요.' },
        { status: 400 }
      )
    }

    // 학생 작성 답안의 공백 제외 글자 수 계산
    const rawCharCount = studentAnswer.replace(/\r\n/g, '\n').length

    // 제시문 텍스트 포맷팅
    const passagesText = Array.isArray(passages)
      ? passages
          .map((p: any) => `${p.badge || '[제시문]'}\n${Array.isArray(p.paragraphs) ? p.paragraphs.join('\n') : p.text || ''}`)
          .join('\n\n')
      : ''

    // 채점 기준표 텍스트 포맷팅
    const rubricText = rubric ? JSON.stringify(rubric, null, 2) : '대학별 공식 채점 지침에 따름'

    // 프롬프트 작성
    const systemPrompt = `당신은 대한민국 명문 대학 인문/사회계열 논술 출제위원장이자 수석 채점위원입니다.
학생이 제출한 논술 답안을 아래의 [문제 정보], [제시문], [공식 채점 기준표], [공식 모범답안]을 바탕으로 대학 입학처의 공식 채점 지침에 따라 엄밀하고 객관적이며 교육적으로 정밀 채점하십시오.

반드시 다음 JSON 규격에 맞추어 한국어로만 응답하십시오. (Markdown 코드블록 없이 순수 JSON만 출력)

{
  "examTitle": "${university} ${examTitle} ${questionLabel} 정밀 채점 리포트",
  "questionLabel": "${questionLabel}",
  "studentName": "${studentName}",
  "totalScore": 78, // 100점 만점 기준 실제 채점 총점 (숫자)
  "maxPossibleScore": 100,
  "cutlineScore": 82, // 해당 대학 학과의 예상 합격 커트라인 점수 (숫자)
  "statusVerdict": "합격 가능권", // "합격 안정권" (합격선 초과), "합격 가능권" (합격선 -5점 이내), "도전 권장" (합격선 -6점 이하) 중 택1
  "charCount": ${rawCharCount},
  "charStatus": "통과 · 감점 0점", // 규격(800±100자) 준수 여부 및 감점 명시 (예: "통과 · 감점 0점", "분량 미달(620자) · 감점 -5점")
  "conceptHits": {
    "matchedCount": 4, // 학생 답안에 정확히 등장한 핵심 개념어 수 (숫자)
    "targetTotal": 5, // 필수 도출 핵심 개념어 총수 (숫자)
    "keywords": ["핵심단어1", "핵심단어2", "핵심단어3", "핵심단어4"] // 학생이 성공적으로 서술한 핵심 개념어들
  },
  "structureGrade": "B+", // "A", "B+", "B", "C" 중 택1
  "criteria": [ // 공식 채점 기준표의 항목별 점수 및 피드백 (최소 2~4개)
    {
      "category": "평가 영역 명칭 (예: 제시문 분석 및 쟁점 도출 (60%))",
      "score": 52, // 획득 점수 (숫자)
      "maxScore": 60, // 해당 항목 배점 (숫자)
      "feedback": "학생 답안에서 해당 영역에 대한 구체적 평가 및 분석 이유",
      "warning": "필요시 감점 사유 (예: '양비론/절충론 감점 적용 (-10점)') 또는 생략"
    }
  ],
  "examinerVerdict": {
    "oneLiner": "출제위원의 날카롭고 직관적인 한 줄 총평 (따옴표로 감싸서 제시)",
    "coreAdvice": "이번 답안의 가장 핵심적인 개선 과제 및 다음 글쓰기를 위한 처방"
  },
  "deductions": [ // 학생 답안에서 가장 치명적인 감점 요인 2건
    {
      "location": "논증 · 문단 2",
      "originalSentence": "학생이 작성한 답안 중 실제 감점 원인이 된 문장 인용",
      "critique": "왜 이 문장이 논리적 비약이거나 감점 요인인지 구체적 비판",
      "penaltyScore": -10 // 감점 수치 (음수 숫자)
    }
  ],
  "rewrite": { // 가장 아쉬운 문단을 합격자 수준으로 1:1 다시 쓴 첨삭
    "beforeText": "학생의 아쉬운 원문 문단 발췌",
    "flawReason": "어떤 논리적 결함이나 제시문 오독이 있었는지 명시",
    "afterText": "출제 의도에 완벽히 부합하도록 수정한 합격자 수준의 모범 문장/문단"
  }
}
`

    const userPrompt = `[문제 발문]:
${questionTitle}

[규정 분량]:
${charLimit}

[제시문]:
${passagesText}

[공식 채점 기준표]:
${rubricText}

[공식 모범답안]:
${modelAnswer || '제시문과 발문의 논리적 일치 여부로 판단'}

[학생이 실제 작성한 답안]:
${studentAnswer}
`

    // Gemini API 호출 (지원 확인된 최신 모델 적용)
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite']
    let rawResponseText = ''
    let lastError: any = null

    for (const model of modelsToTry) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
              ],
              generationConfig: {
                temperature: 0.2, // 엄밀하고 일관된 채점을 위해 낮은 온도 설정
                responseMimeType: 'application/json'
              }
            })
          }
        )

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          lastError = new Error(`Model ${model} failed (${geminiRes.status}): ${errBody}`)
          continue
        }

        const data = await geminiRes.json()
        const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (textCandidate) {
          rawResponseText = textCandidate
          break
        }
      } catch (err) {
        lastError = err
      }
    }

    if (!rawResponseText) {
      throw lastError || new Error('Gemini API로부터 응답을 받지 못했습니다.')
    }

    // 마크다운 백틱 등이 포함되어 있을 경우 정제
    let cleanJson = rawResponseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const reportData: GradingReportData = JSON.parse(cleanJson)
    return NextResponse.json(reportData)
  } catch (error: any) {
    console.error('논술 AI 채점 에러:', error)
    return NextResponse.json(
      { error: error?.message || '논술 채점 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
