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

    // 프롬프트 작성: 모범답안의 후광 효과를 배제하고 채점 기준표의 배점과 세부 논거 충족 여부로만 엄격 채점하는 블라인드 채점 시스템
    const systemPrompt = `당신은 대한민국 명문 대학 인문/사회계열 논술 출제위원장이자 수석 채점위원입니다.
제출된 답안을 아래의 [문제 발문], [제시문], [공식 채점 기준표]만을 엄격한 평가 잣대로 삼아 독립적이고 객관적인 블라인드 채점(Blind Grading)을 수행하십시오.

【블라인드 정밀 채점 원칙】
1. **절대적 채점 기준표 기반 평가 (후광 효과 배제)**:
   - 제출된 답안이 모범답안이든 누구의 글이든 상관없이, 오직 [공식 채점 기준표]의 각 영역별 배점과 세부 필수 요구조건을 실제로 충족했는지만으로 점수를 평가하십시오.
   - 답안이 유려하더라도 채점 기준표에 명시된 필수 논점이나 상반된 두 입장의 구체적 논거(예: 재정확대를 통한 유효수요 창출 vs 샤워실의 바보 부작용 등)를 구체적으로 서술하지 않고 추상적으로 얼버무렸다면, 반드시 해당 영역에서 감점(부분 점수)을 엄격히 적용하십시오.
   - 채점 기준표의 세부 논거를 100% 온전히 전개하지 못한 답안에 무비판적으로 100점 만점을 부여하는 것은 중대한 채점 오류입니다. (미흡한 영역이 있다면 80점대 등의 실질 점수를 부여할 것)
2. **배점 합산 일치**: "criteria" 배열의 각 평가 항목별 획득 점수("score")의 합계가 "totalScore"와 반드시 정확히 일치해야 합니다. (총점 100점 만점 기준)
3. **실질적 감점 요인 명시**: "deductions" 항목에는 채점 기준표 대비 실제 누락되거나 축약된 논점, 논리적 비약 등 구체적인 감점 사유와 감점 점수(음수)를 사실대로 기재하십시오.
4. **개념어 적중 및 분량**: 규정 분량(800±100자 등) 준수 여부 및 채점 기준의 핵심 개념어 도출 여부를 엄밀히 평가하십시오.

반드시 다음 JSON 규격에 맞추어 한국어로만 응답하십시오. (Markdown 코드블록 없이 순수 JSON만 출력)

{
  "examTitle": "${university} ${examTitle} ${questionLabel} 정밀 채점 리포트",
  "questionLabel": "${questionLabel}",
  "studentName": "${studentName}",
  "totalScore": 0, // criteria의 모든 항목 점수(score)를 합산한 100점 만점 기준 실제 채점 총점 (정수 숫자)
  "maxPossibleScore": 100,
  "cutlineScore": 82, // 해당 대학 학과의 예상 합격 커트라인 점수 (정수 숫자, 통상 80~85점)
  "statusVerdict": "합격 가능권", // "합격 안정권" (합격선 이상), "합격 가능권" (합격선 -5점 이내), "도전 권장" (합격선 -6점 이하) 중 택1
  "charCount": ${rawCharCount},
  "charStatus": "통과 · 감점 0점", // 규격 준수 여부 및 감점 명시 (예: "통과 · 감점 0점", "분량 미달(620자) · 감점 -5점")
  "conceptHits": {
    "matchedCount": 0, // 답안에 실제로 정확히 등장한 핵심 개념어 수 (숫자)
    "targetTotal": 5, // 필수 도출 핵심 개념어 총수 (숫자)
    "keywords": ["적중키워드1", "적중키워드2"] // 답안이 성공적으로 도출·활용한 핵심 개념어들
  },
  "structureGrade": "A", // "A", "B+", "B", "C", "D" 중 택1
  "criteria": [ // 공식 채점 기준표의 항목별 배점 및 획득 점수, 구체적 평가 피드백 (항목들의 score 합이 totalScore가 됨)
    {
      "category": "평가 영역 명칭 및 배점 (예: [제시문 아] 경기 안정화 정책과 상반된 두 견해 분석 (20점))",
      "score": 0, // 해당 영역 실제 획득 점수 (구체적 논거 누락 시 감점된 점수 반영)
      "maxScore": 20, // 해당 영역 배점 (숫자)
      "feedback": "답안에서 해당 영역에 대한 구체적 평가 및 감점/점수 부여 이유",
      "warning": "필요시 감점 요인 명시 (예: '유효수요 창출 및 샤워실의 바보 논거 서술 누락으로 6점 감점') 또는 생략"
    }
  ],
  "examinerVerdict": {
    "oneLiner": "출제위원의 날카롭고 직관적인 한 줄 총평 (따옴표로 감싸서 제시)",
    "coreAdvice": "이번 답안의 가장 핵심적인 개선 과제 및 다음 글쓰기를 위한 구체적 처방"
  },
  "deductions": [ // 실제 채점 기준표 대비 결함이나 감점이 발생한 항목 (실제 결함이 있는 경우 기재)
    {
      "location": "논증 · 문단 위치",
      "originalSentence": "답안 중 실제 감점 원인이 된 문장 인용",
      "critique": "채점 기준 대비 왜 이 서술이 감점 요인인지 구체적 비판 (예: 제시문 (아)의 상반된 두 핵심 논거가 생략되고 추상적 서술에 그침)",
      "penaltyScore": -6 // 감점 수치 (음수 숫자)
    }
  ],
  "rewrite": { // 가장 아쉬운 문단을 출제 기준에 100% 부합하도록 1:1 다시 쓴 첨삭
    "beforeText": "답안에서 가장 보완이 필요한 원문 문단 발췌",
    "flawReason": "어떤 논리적 결함이나 채점 기준 미충족(논거 누락)이 있었는지 명시",
    "afterText": "채점 기준표의 모든 요구조건을 완벽히 충족하도록 보완한 최고 수준의 모범 문장/문단"
  }
}
`

    // 프롬프트 본문: AI가 모범답안에 휘둘리지 않고 순수하게 채점 기준표로 답안을 평가하도록 구성
    const userPrompt = `[문제 발문]:
${questionTitle}

[규정 분량]:
${charLimit}

[제시문]:
${passagesText}

[공식 채점 기준표 및 배점 가이드]:
${rubricText}

[학생이 실제 작성한 답안 (평가 대상)]:
${studentAnswer}

[답안 첨삭용 참고자료 (※ 주의: 이 참고자료는 rewrite 작성 시 참고용이며, 학생 답안 채점은 오직 위의 [공식 채점 기준표]의 기준과 배점에 따라 독립적이고 엄격하게 수행해야 함)]:
${modelAnswer || '제시문과 발문의 논리적 일치 여부로 판단'}
`

    // Gemini API 호출 (채점 점수 일관성 유지를 위해 기존 모델 라인업 보존)
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite']
    let rawResponseText = ''
    let lastError: any = null

    for (const model of modelsToTry) {
      // 각 모델당 최대 2회 시도: 503(과부하) 또는 429(속도제한) 발생 시 0.8초 대기 후 즉시 1회 자동 재시도
      for (let attempt = 0; attempt < 2; attempt++) {
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

            // 구글 서버 일시적 과부하(503) 또는 속도제한(429) 수신 시 첫 번째 시도라면 0.8초 대기 후 재시도
            if ((geminiRes.status === 503 || geminiRes.status === 429) && attempt === 0) {
              console.warn(`[AI 정밀 채점] ${model} 모델 일시적 과부하 (${geminiRes.status}): 0.8초 후 자동 재시도합니다...`)
              await new Promise((resolve) => setTimeout(resolve, 800))
              continue
            }
            // 재시도에도 실패했거나 다른 상태코드(400 등)인 경우 루프 종료 후 다음 모델 시도
            break
          }

          const data = await geminiRes.json()
          const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (textCandidate) {
            rawResponseText = textCandidate
            break
          }
        } catch (err) {
          lastError = err
          // 네트워크 일시 오류 시 첫 번째 시도라면 0.8초 대기 후 재시도
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 800))
            continue
          }
        }
      }

      // 채점 결과 텍스트를 정상 획득했다면 추가 모델 시도를 중단하고 루프 탈출
      if (rawResponseText) {
        break
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
