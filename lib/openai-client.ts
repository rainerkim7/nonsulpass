/**
 * @file lib/openai-client.ts
 * @description OpenAI REST API 공통 클라이언트 유틸리티
 *              - 최신 차세대 모델 ChatGPT 6.1 Sol (gpt-6.1-sol) 및 Terra (gpt-6.1-terra) 전용 지원
 *              - 최신 max_completion_tokens 및 json_object 응답 포맷 지원
 *              - 일시적 429/503 오류 발생 시 자동 재시도 및 모델 폴백 지원
 */

export interface OpenAiCallOptions {
  /** OpenAI API 키 (미지정 시 process.env.OPENAI_API_KEY 사용) */
  apiKey?: string
  /** 시스템 프롬프트 */
  systemPrompt?: string
  /** 유저 프롬프트 (또는 지시문 전문) */
  userPrompt: string
  /** 생성 온도 (기본값: 0.2) */
  temperature?: number
  /** 최대 출력 토큰 (기본값: 16384, 대용량 문서의 경우 최대 65536) */
  maxTokens?: number
  /** JSON 응답 강제 여부 (기본값: true) */
  jsonMode?: boolean
  /** 우선 시도할 모델 식별자 (예: 'gpt-6.1-sol' 또는 'gpt-6.1-terra') */
  model?: string
  /** 폴백 모델 목록 */
  fallbackModels?: string[]
}

export interface OpenAiCallResult {
  text: string
  modelUsed: string
}

export const OPENAI_CHATGPT_MODELS = [
  'gpt-6.1-sol',
  'gpt-6.1-terra',
]

/**
 * OpenAI Chat Completions API를 호출하며, 장애 시 등록된 모델 라인업으로 순차 폴백합니다.
 */
export async function callOpenAiWithFallback(options: OpenAiCallOptions): Promise<OpenAiCallResult> {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다.')
  }

  const requestedModel = options.model && options.model.trim() ? options.model.trim() : 'gpt-6.1-sol'
  const fallbackList = options.fallbackModels || OPENAI_CHATGPT_MODELS
  const candidateModels = Array.from(new Set([requestedModel, ...fallbackList]))

  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  if (options.systemPrompt && options.systemPrompt.trim()) {
    messages.push({ role: 'system', content: options.systemPrompt.trim() })
  }
  messages.push({ role: 'user', content: options.userPrompt })

  let lastError: any = null

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const payload: Record<string, any> = {
          model,
          messages,
          max_completion_tokens: options.maxTokens || 16384,
        }

        // temperature 지원 여부 처리:
        // gpt-6.1-sol 및 gpt-6.1-terra 등 차세대 심층 추론 모델은 OpenAI 정책상 temperature(0.2 등)를 허용하지 않으므로 전송 제외
        const isReasoningModel = model.startsWith('gpt-6.') || model.startsWith('o1') || model.startsWith('o3')
        if (!isReasoningModel && typeof options.temperature === 'number') {
          payload.temperature = options.temperature
        }

        if (options.jsonMode !== false) {
          payload.response_format = { type: 'json_object' }
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          const errMsg = errBody?.error?.message || `HTTP ${res.status} ${res.statusText}`

          // 429(Rate limit)나 503(Server overload)인 경우 잠시 대기 후 1회 재시도
          if ((res.status === 429 || res.status >= 500) && attempt === 1) {
            console.warn(`[OpenAI ${model}] 일시적 상태 ${res.status}, 1.2초 후 재시도...`)
            await new Promise((r) => setTimeout(r, 1200))
            continue
          }

          throw new Error(`[OpenAI ${model} 실패]: ${errMsg}`)
        }

        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''

        if (!text) {
          throw new Error(`[OpenAI ${model}] 응답 텍스트가 비어 있습니다.`)
        }

        return {
          text,
          modelUsed: model,
        }
      } catch (err: any) {
        lastError = err
        console.warn(`[OpenAI ${model}] 시도 ${attempt} 실패:`, err.message)
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 800))
        }
      }
    }
  }

  throw lastError || new Error('모든 OpenAI 모델 호출에 실패했습니다.')
}

