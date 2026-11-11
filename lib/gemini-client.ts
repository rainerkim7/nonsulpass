/**
 * @file lib/gemini-client.ts
 * @description Google Gemini REST API 공통 클라이언트 유틸리티
 *              - 검증된 최신 Gemini 모델 라인업 순차 폴백 지원
 *              - 구글 서버 일시적 과부하(503) 및 속도 제한(429) 자동 재시도(Retry) 내장
 */

export interface GeminiCallOptions {
  /** Gemini API 키 (미지정 시 process.env.GEMINI_API_KEY 사용) */
  apiKey?: string
  /** 요청 parts 배열 (텍스트 또는 멀티모달 inlineData 포함 가능) */
  parts: Array<Record<string, any>>
  /** 생성 온도 (기본값: 0.2) */
  temperature?: number
  /** 최대 출력 토큰 수 (유료 등급 대용량 추출 시 65536 등 지정 가능) */
  maxOutputTokens?: number
  /** 응답 MIME 타입 (JSON 응답 시 'application/json') */
  responseMimeType?: string
  /** 우선 시도할 커스텀 모델 목록 (미지정 시 표준 모델 라인업 사용) */
  models?: string[]
  /** 모델당 최대 시도 횟수 (기본값: 2회 - 첫 실패가 503/429일 때 1회 재시도) */
  maxAttemptsPerModel?: number
  /** 재시도 대기 시간 (ms, 기본값: 800ms) */
  retryDelayMs?: number
}

export interface GeminiCallResult {
  /** Gemini 모델이 반환한 원문 텍스트 */
  text: string
  /** 실제 응답에 성공한 모델 식별자 */
  modelUsed: string
}

/**
 * 논술패스 Lab 유료 등급(Pay-as-you-go) 고성능 Gemini 모델 라인업
 * - Gemini 3.1 Pro, Gemini 4 Argon, Gemini 3.8 Flash
 */
export const PAID_PRO_GEMINI_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-4-argon',
  'gemini-3.8-flash',
]

/**
 * 논술패스 Lab 고속 비전/범용 모델 라인업 (손글씨 OCR 등 빠른 응답용)
 */
export const DEFAULT_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-4-argon',
]

/**
 * Gemini generateContent API를 모델 폴백 및 자동 재시도와 함께 호출하는 공통 함수
 */
export async function callGeminiWithFallback(
  options: GeminiCallOptions
): Promise<GeminiCallResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.')
  }

  const models =
    options.models && options.models.length > 0
      ? options.models
      : DEFAULT_GEMINI_MODELS
  const maxAttempts = options.maxAttemptsPerModel ?? 2
  const retryDelayMs = options.retryDelayMs ?? 800

  const generationConfig: Record<string, any> = {
    temperature: options.temperature ?? 0.2,
  }
  if (options.maxOutputTokens) {
    generationConfig.maxOutputTokens = options.maxOutputTokens
  }
  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType
  }

  let lastError: any = null

  for (const model of models) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: options.parts }],
              generationConfig,
            }),
          }
        )

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text()
          lastError = new Error(`Model ${model} failed (${geminiRes.status}): ${errBody}`)

          // 503(서버 과부하) 또는 429(속도 제한) 시 다음 attempt 진행
          if (
            (geminiRes.status === 503 || geminiRes.status === 429) &&
            attempt < maxAttempts - 1
          ) {
            console.warn(
              `[GeminiClient] ${model} 일시적 과부하 (${geminiRes.status}): ${retryDelayMs}ms 후 자동 재시도합니다...`
            )
            continue
          }
          // 404/400 등이거나 재시도 횟수를 소진한 경우 다음 모델로 폴백
          break
        }

        const data = await geminiRes.json()
        const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (textCandidate && typeof textCandidate === 'string') {
          return {
            text: textCandidate,
            modelUsed: model,
          }
        }
      } catch (err) {
        lastError = err
        if (attempt < maxAttempts - 1) {
          continue
        }
      }
    }
  }

  throw lastError || new Error('모든 Gemini 모델 호출에 실패했습니다.')
}

