/**
 * @file lib/ai-gateway.ts
 * @description Google Gemini 및 OpenAI ChatGPT 통합 AI 게이트웨이
 *              - 요청 모델 ID의 접두사에 따라 적절한 API 엔진으로 자동 라우팅
 *              - 'gpt-' / 'chatgpt-' 계열 -> OpenAI API (gpt-6.1-sol, gpt-6.1-terra)
 *              - 'gemini-' 계열 -> Google Gemini API
 *              - 특정 제공사 장애 시 상호 폴백 지원
 */

import { callGeminiWithFallback, PAID_PRO_GEMINI_MODELS } from './gemini-client'
import { callOpenAiWithFallback, OPENAI_CHATGPT_MODELS } from './openai-client'

export interface UnifiedAiCallOptions {
  /** 요청 모델 ID (예: 'gpt-6.1-sol', 'gpt-6.1-terra', 'gemini-3.1-pro-preview') */
  model?: string
  /** 시스템 프롬프트 */
  systemPrompt?: string
  /** 유저 프롬프트 전문 */
  userPrompt: string
  /** 온도 (기본값: 0.15~0.2) */
  temperature?: number
  /** 최대 출력 토큰 (기본값: 16384) */
  maxOutputTokens?: number
  /** JSON 응답 강제 여부 (기본값: true) */
  jsonMode?: boolean
}

export interface UnifiedAiCallResult {
  text: string
  modelUsed: string
}

/**
 * 모델 식별자를 판별하여 OpenAI 또는 Gemini로 투명하게 라우팅합니다.
 */
export async function callUnifiedAi(options: UnifiedAiCallOptions): Promise<UnifiedAiCallResult> {
  const model = (options.model || 'gemini-3.1-pro-preview').trim().toLowerCase()
  const isOpenAiModel = model.startsWith('gpt-') || model.startsWith('o3') || model.startsWith('chatgpt-')

  if (isOpenAiModel) {
    try {
      return await callOpenAiWithFallback({
        model: options.model,
        systemPrompt: options.systemPrompt,
        userPrompt: options.userPrompt,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxOutputTokens ?? 16384,
        jsonMode: options.jsonMode !== false,
      })
    } catch (openAiErr: any) {
      console.warn('[UnifiedAI] OpenAI 호출 실패, Gemini 라인업으로 비상 폴백 시도:', openAiErr.message)
      // OpenAI 실패 시 Gemini 최상위 Pro 모델로 긴급 폴백
      const geminiPrompt = options.systemPrompt
        ? `${options.systemPrompt}\n\n${options.userPrompt}`
        : options.userPrompt

      const geminiResult = await callGeminiWithFallback({
        parts: [{ text: geminiPrompt }],
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 16384,
        responseMimeType: options.jsonMode !== false ? 'application/json' : 'text/plain',
        models: PAID_PRO_GEMINI_MODELS,
      })

      return {
        text: geminiResult.text,
        modelUsed: `${geminiResult.modelUsed} (폴백 전환됨)`,
      }
    }
  }

  // 기본 Google Gemini 호출
  try {
    const geminiPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${options.userPrompt}`
      : options.userPrompt

    const requestedModels = Array.from(new Set([options.model || 'gemini-3.1-pro-preview', ...PAID_PRO_GEMINI_MODELS]))

    const geminiResult = await callGeminiWithFallback({
      parts: [{ text: geminiPrompt }],
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 16384,
      responseMimeType: options.jsonMode !== false ? 'application/json' : 'text/plain',
      models: requestedModels,
    })

    return {
      text: geminiResult.text,
      modelUsed: geminiResult.modelUsed,
    }
  } catch (geminiErr: any) {
    console.warn('[UnifiedAI] Gemini 호출 실패, OpenAI ChatGPT 라인업으로 비상 폴백 시도:', geminiErr.message)
    // Gemini 실패 시 OpenAI 6.1 Sol로 비상 폴백
    return await callOpenAiWithFallback({
      model: 'gpt-6.1-sol',
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxOutputTokens ?? 16384,
      jsonMode: options.jsonMode !== false,
      fallbackModels: OPENAI_CHATGPT_MODELS,
    })
  }
}

