/**
 * @file app/api/admin/parse-integrated-doc/route.ts
 * @description 대학 입학처의 통합 보고서(문항, 제시문, 문항해설, 채점기준, 모범답안 포함 전문)를
 *              Gemini AI가 지능적으로 분석하여 탭 1, 탭 2, 탭 3 데이터로 자동 분해(Auto-Slicing)하는 API
 */

import { NextResponse } from 'next/server'

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
      univId = 'khu',
      univName = '경희대학교',
      targetFaculty = '',
      documentText = '',
      selectedTabs = { tab1: true, tab2: true, tab3: true }
    } = body

    if (!documentText || documentText.trim().length < 50) {
      return NextResponse.json(
        { error: '분석할 대학 입학처 보고서 텍스트가 너무 짧거나 누락되었습니다. 보고서 전문을 입력해 주세요.' },
        { status: 400 }
      )
    }

    const shouldParseTab1 = selectedTabs?.tab1 !== false
    const shouldParseTab2 = selectedTabs?.tab2 !== false
    const shouldParseTab3 = selectedTabs?.tab3 !== false

    const facultySection = targetFaculty
      ? `\n[선택된 목표 계열/트랙]: ${targetFaculty}\n※ 반드시 위 계열("${targetFaculty}")에 해당하는 문항, 수리논술 유무, 제시문, 배점 및 채점 기준을 최우선으로 정확히 추출하십시오.\n`
      : ''

    // 선택된 탭별 프롬프트 가이드 동적 조합
    const tabInstructions = []
    if (shouldParseTab1) {
      tabInstructions.push(`1. "tab1_exam" (탭 1: 기출문제 응시 데이터)
   - year: 학년도 (예: "2027학년도" 또는 "2026학년도")
   - title: 공식 시험 명칭 (예: "2027학년도 경희대학교 모의논술고사 (인문·체육계열)")
   - type: 시험 유형 ("기출문제" 또는 "모의논술" 또는 "예상문제")
   - targetFaculty: 대상 계열 (예: "인문계열 (공통)", "인문·체육계열", "사회계열" 등)
     ※ [계열 분류 절대 원칙]: 반드시 실제 출제되는 '시험지(문제) 트랙' 단위로만 작성하십시오. 사범대, 법학부, 경영대 등 수험생 모집 학과/단과대 명칭으로 세분화하지 마십시오. 모든 인문 학과가 공통 시험을 치르는 대학은 '인문계열 (공통)', 수리논술 유무 등으로 시험지 자체가 분리된 대학은 '인문·체육계열' 또는 '사회계열' 등으로만 작성하십시오.
   - totalTime: 시험 시간(분 단위 정수, 통상 120)
   - totalLength: 총 답안 분량 요건 (예: "논제 I (801~900자) / 논제 II (1,001~1,100자)")
   - summary: 핵심 출제 주제 및 지문 요약 1~2문장
   - questions: 문서 내 각 문항(논제 I, 논제 II 등)별 상세 정보 배열
     - id: 문항 번호 (1, 2, 3...)
     - label: 문항 라벨 (예: "문제 1", "문제 2", "논제 I")
      - title: 문항 식별 타이틀 (반드시 "【문제 1】", "【논제 I】" 등 시험지 고유 번호만 작성하며, 임의의 주제 요약이나 소제목을 절대 포함하지 마십시오)
      - questionText: 문항의 공식 출제 발문 전문 (예: "(가)의 화자가 제시한... 서술하시오.")
     - limit: 해당 문항 규정 글자 수
     - score: 해당 문항 배점
     - passages: 해당 문항에 딸린 제시문 목록 ([가], [나], [다] 등)
       - badge: 제시문 식별자 (예: "제시문 [가]")
       - content: 제시문의 본문 텍스트 전문 (누락 없이 원문 복원)
        ※ [제시문 원문 보존 절대 원칙]: 실제 대학 출제 시험지 원문에 없는 임의의 소제목, 요약 타이틀을 제시문에 절대 추가하거나 창작하지 마십시오. 오직 시험지 원문에 표기된 순수 기호 식별자(예: "[제시문 가]" 또는 "[가]")와 본문 내용만 그대로 추출하십시오.
     - modelAnswer: 문서에 수록된 공식 예시답안 전문`)
    }

    if (shouldParseTab2) {
      tabInstructions.push(`2. "tab2_trends" (탭 2: 출제 경향 및 유형별 경향 총괄 분석)
   - 문서의 문항 해설 및 출제의도를 바탕으로 해당 대학의 대표 문항 유형 배열 구성
   - 각 유형별:
     - questionNumber: "문제 1 유형", "문제 2 유형" 등
     - questionType: 유형 명칭 (예: "비교·대조 및 문학작품 해석 적용형", "다자 비교 및 비판적 평가형", "수리논술 기대효용 극대화형")
     - examTime: 권장 시간 및 분량 (예: "60분 권장 / 801~900자 엄수")
     - scoreWeight: 공식 배점 (예: "100점 만점 (기본 60점)" 또는 "35점 배점")
     - questionTemplate: 전형적 발문 출제 공식 (따옴표 포함)
     - passageStructure: { "base": "기준틀 제시문", "targets": "적용대상 제시문" }
     - description: 출제 의도 및 접근법 해설
     - writingFormula: 고득점 3단계 작성 공식 배열 (서론, 본론, 결론별 step, title, desc, charGuide)
     - frequentThemes: 핵심 출제 개념 키워드 5~6개 배열`)
    }

    if (shouldParseTab3) {
      tabInstructions.push(`3. "tab3_scoring" (탭 3: 채점 기준 및 배점 체계)
   - scoringRules: 모집단위별/논제별 점수 배정 카드 3~4개 배열
     - faculty: 계열 및 문항 명칭 (예: "인문·체육계열 논제 I", "사회계열 논제 II")
     - chip: 핵심 평가 유형 (예: "정량평가", "수리논술 포함", "다각도 비교")
     - score: 배점 및 기본점수 (예: "100점 만점 (기본 60점)")
     - subDesc: 상세 평가 방향 요약
   - rubrics: 문서의 [채점 기준: 내용평가] 및 [원고지/분량 감점]에 명시된 세부 가산점/감점 기준 루브릭 배열
     - category: 평가 항목명
     - ratio: 배점/감점폭 (예: "20점 가점", "최대 40점 감점")
     - desc: 평가 기준 핵심 설명
     - details: 세부 채점 요건 목록 (불릿 목록)`)
    }

    const systemPrompt = `당신은 대한민국 최고 권위의 대입 논술 수석 출제위원이자 논술 교육 연구소장입니다.
제공된 텍스트는 특정 대학("${univName}")의 입학처 공식 <선행학습 영향평가 보고서> 또는 <논술고사 출제 및 채점 가이드라인> 전문입니다.

당신의 임무는 이 문서를 정밀하게 분석하여, 사용자가 선택한 특정 탭의 데이터만 완벽히 구조화하여 순수 JSON으로만 출력하는 것입니다.
선택되지 않은 탭은 반드시 null로 출력하십시오.

【추출 및 생성 규칙】:
${tabInstructions.join('\n\n')}

【출력 JSON 형식】:
{
  "tab1_exam": ${shouldParseTab1 ? '{\n    "year": "2027학년도",\n    "title": "...",\n    "type": "모의논술",\n    "targetFaculty": "...",\n    "totalTime": 120,\n    "totalLength": "...",\n    "summary": "...",\n    "questions": [...]\n  }' : 'null'},
  "tab2_trends": ${shouldParseTab2 ? '[\n    {\n      "questionNumber": "문제 1 유형",\n      "questionType": "...",\n      "examTime": "...",\n      "scoreWeight": "...",\n      "questionTemplate": "...",\n      "passageStructure": { "base": "...", "targets": "..." },\n      "description": "...",\n      "writingFormula": [...],\n      "frequentThemes": [...]\n    }\n  ]' : 'null'},
  "tab3_scoring": ${shouldParseTab3 ? '{\n    "scoringRules": [...],\n    "rubrics": [...]\n  }' : 'null'}
}
`

    const userPrompt = `[대상 대학명]: ${univName} (대학 ID: ${univId})${facultySection}
[선택된 추출 대상 탭]: ${[
      shouldParseTab1 ? '탭 1(기출문제)' : null,
      shouldParseTab2 ? '탭 2(출제경향)' : null,
      shouldParseTab3 ? '탭 3(채점기준)' : null
    ].filter(Boolean).join(', ')}

[입학처 공식 통합 보고서 전문]:
${documentText.trim()}

위 문서에서 사용자가 선택한 [${[
      shouldParseTab1 ? '탭 1(기출문제)' : null,
      shouldParseTab2 ? '탭 2(출제경향)' : null,
      shouldParseTab3 ? '탭 3(채점기준)' : null
    ].filter(Boolean).join(', ')}] 항목만 집중 정밀 분석하여 JSON 규격으로 반환하십시오.`

    // Gemini API 호출 (최신 모델 및 503/429 재시도 폴백 지원)
    const models = ['gemini-flash-latest', 'gemini-pro-latest', 'gemini-3-flash-preview']
    let resultJson = null
    let lastError = null

    for (const model of models) {
      // 503(Service Unavailable) 또는 429(Rate Limit) 발생 시 1회 재시도
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(res => setTimeout(res, 1000))
          }

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
                  temperature: 0.2,
                  responseMimeType: 'application/json'
                }
              })
            }
          )

          if (!geminiRes.ok) {
            const errText = await geminiRes.text()
            lastError = new Error(`Model ${model} failed (${geminiRes.status}): ${errText}`)
            if ((geminiRes.status === 503 || geminiRes.status === 429) && attempt === 0) {
              continue
            }
            break
          }

          const data = await geminiRes.json()
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            resultJson = JSON.parse(text)
            break
          }
        } catch (err: any) {
          lastError = err
          if (attempt === 0) continue
        }
      }
      if (resultJson) break
    }

    if (!resultJson) {
      return NextResponse.json(
        { error: lastError?.message || '통합 문서 자동 분해 및 분석 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: resultJson
    })
  } catch (error: any) {
    console.error('[Parse Integrated Doc API Error]:', error)
    return NextResponse.json({ error: error.message || '서버 오류' }, { status: 500 })
  }
}
