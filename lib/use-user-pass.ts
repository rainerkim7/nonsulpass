'use client'

/**
 * @file lib/use-user-pass.ts
 * @description 사용자 대학별 이용권(패스), 잔여 크레딧 조회 및 원자적 채점 크레딧 차감 훅
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { UserPass, CreditDeductionResult, PassType } from '@/types/payment'

export function useUserPass(university?: string) {
  const { user } = useAuth()
  const [userPass, setUserPass] = useState<UserPass | null>(null)
  const [totalRemainingCredits, setTotalRemainingCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false)

  // 현재 대학의 유효한 패스 및 잔여 크레딧 조회
  const fetchPass = useCallback(async () => {
    if (!user || !university) {
      setUserPass(null)
      setTotalRemainingCredits(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('user_passes')
        .select('*')
        .eq('user_id', user.id)
        .eq('university', university)
        .eq('is_active', true)
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: true })

      if (error) {
        console.warn('[useUserPass] 패스 조회 오류:', error.message)
        setUserPass(null)
        setTotalRemainingCredits(0)
      } else if (data && data.length > 0) {
        // 유효한 첫 번째 패스 지정 및 잔여 크레딧 총합 계산
        setUserPass(data[0] as UserPass)
        const total = data.reduce((acc, curr) => acc + (curr.remaining_credits || 0), 0)
        setTotalRemainingCredits(total)
      } else {
        setUserPass(null)
        setTotalRemainingCredits(0)
      }
    } catch (err) {
      console.error('[useUserPass] 예외 발생:', err)
      setUserPass(null)
      setTotalRemainingCredits(0)
    } finally {
      setIsLoading(false)
    }
  }, [user, university])

  useEffect(() => {
    fetchPass()
  }, [fetchPass])

  /**
   * AI 채점 제출 전 DB 원자적 크레딧 차감 RPC 호출 (쿨다운 & 5회 상한 검증 포함)
   */
  const consumeCredit = async (examId: string, questionId: string): Promise<CreditDeductionResult> => {
    if (!user) {
      return {
        success: false,
        code: 'ERROR',
        message: '로그인이 필요합니다.'
      }
    }

    if (!university) {
      return {
        success: false,
        code: 'ERROR',
        message: '응시할 대학 정보가 올바르지 않습니다.'
      }
    }

    try {
      const { data, error } = await supabase.rpc('use_grading_credit', {
        p_user_id: user.id,
        p_university: university,
        p_exam_id: examId,
        p_question_id: questionId
      })

      if (error) {
        console.error('[useUserPass] use_grading_credit RPC 에러:', error)
        return {
          success: false,
          code: 'ERROR',
          message: error.message || '크레딧 차감 중 오류가 발생했습니다.'
        }
      }

      const result = data as CreditDeductionResult

      // 성공 시 로컬 상태 동기화 재조회
      if (result.success) {
        await fetchPass()
      }

      return result
    } catch (err: any) {
      console.error('[useUserPass] 크레딧 차감 실패:', err)
      return {
        success: false,
        code: 'ERROR',
        message: err.message || '채점 크레딧 차감 중 네트워크 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 결제 완료 또는 모의 결제 성공 시 패스 DB 즉시 충전 헬퍼
   */
  const grantPass = async (passType: PassType, credits: number, periodDays: number = 30) => {
    if (!user || !university) return false

    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('user_passes').insert({
        user_id: user.id,
        university,
        total_credits: credits,
        remaining_credits: credits,
        pass_type: passType,
        starts_at: now.toISOString(),
        expires_at: expiresAt,
        is_active: true
      })

      if (error) throw error
      await fetchPass()
      return true
    } catch (err) {
      console.error('[useUserPass] 패스 충전 실패:', err)
      return false
    }
  }

  return {
    userPass,
    remainingCredits: totalRemainingCredits,
    hasActivePass: !!userPass && totalRemainingCredits > 0,
    isLoading,
    refetchPass: fetchPass,
    consumeCredit,
    grantPass,
    isPurchaseModalOpen,
    openPurchaseModal: () => setIsPurchaseModalOpen(true),
    closePurchaseModal: () => setIsPurchaseModalOpen(false)
  }
}
