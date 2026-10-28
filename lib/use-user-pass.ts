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
   * AI 채점 오류 또는 사용자 취소 시 이미 차감된 크레딧 1회 및 시도 횟수를 원상 복구(환불)하는 함수
   * (DB에 refund_grading_credit RPC가 있으면 우선 호출하고, 아직 미적용 시 직접 테이블 업데이트 폴백)
   */
  const refundCredit = async (examId: string, questionId: string): Promise<boolean> => {
    if (!user || !university) return false

    try {
      const { error: rpcErr } = await supabase.rpc('refund_grading_credit', {
        p_user_id: user.id,
        p_university: university,
        p_exam_id: examId,
        p_question_id: questionId,
      })

      if (rpcErr) {
        // RPC 미등록 환경을 대비한 직접 복구 폴백
        if (userPass) {
          await supabase
            .from('user_passes')
            .update({
              remaining_credits: Math.min(userPass.total_credits, (userPass.remaining_credits || 0) + 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', userPass.id)
        }
        const { data: logRow } = await supabase
          .from('exam_attempt_logs')
          .select('id, attempt_count')
          .eq('user_id', user.id)
          .eq('exam_id', examId)
          .eq('question_id', questionId)
          .single()

        if (logRow) {
          await supabase
            .from('exam_attempt_logs')
            .update({
              attempt_count: Math.max(0, (logRow.attempt_count || 1) - 1),
              last_submitted_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            })
            .eq('id', logRow.id)
        }
      }

      await fetchPass()
      return true
    } catch (err) {
      console.warn('[useUserPass] 크레딧 환불 복구 중 오류:', err)
      return false
    }
  }

  /**
   * 결제 완료 또는 모의 결제 성공 시 패스 DB 즉시 충전 및 payment_orders 주문 내역 기록 헬퍼
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

      // 결제 주문 내역(payment_orders) 동시 기록 (실패 시 무시하여 패스 부여 보장)
      const amount = passType === 'standard_30' ? 19800 : passType === 'addon_10' ? 8900 : 4900
      const productType = passType === 'standard_30' ? 'PASS_30' : passType === 'addon_10' ? 'ADDON_10' : 'ADDON_5'
      const orderId = `ORD-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      try {
        await supabase.from('payment_orders').insert({
          order_id: orderId,
          user_id: user.id,
          product_type: productType,
          university,
          amount,
          status: 'PAID',
          pg_provider: 'tosspayments',
          paid_at: now.toISOString(),
        })
      } catch (orderErr) {
        console.warn('[useUserPass] payment_orders 기록 생략:', orderErr)
      }

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
    refundCredit,
    grantPass,
    isPurchaseModalOpen,
    openPurchaseModal: () => setIsPurchaseModalOpen(true),
    closePurchaseModal: () => setIsPurchaseModalOpen(false)
  }
}

/**
 * 로그인한 사용자가 구매한 모든 대학의 활성 패스 및 크레딧 목록을 종합 조회하는 훅
 */
export function useAllUserPasses() {
  const { user } = useAuth()
  const [allPasses, setAllPasses] = useState<UserPass[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchAllPasses = useCallback(async () => {
    if (!user) {
      setAllPasses([])
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
        .eq('is_active', true)
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: true })

      if (error) {
        console.warn('[useAllUserPasses] 패스 전체 조회 오류:', error.message)
        setAllPasses([])
      } else {
        setAllPasses((data as UserPass[]) || [])
      }
    } catch (err) {
      console.error('[useAllUserPasses] 예외 발생:', err)
      setAllPasses([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAllPasses()
  }, [fetchAllPasses])

  /**
   * 여러 대학에 대해 30일 마스터 패스를 한 번에 일괄 구매 및 DB 부여하는 함수
   */
  const grantMultiplePasses = async (
    universities: string[],
    passType: PassType = 'standard_30',
    credits: number = 30,
    periodDays: number = 30
  ): Promise<boolean> => {
    if (!user || universities.length === 0) return false

    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString()

      const records = universities.map((univ) => ({
        user_id: user.id,
        university: univ,
        total_credits: credits,
        remaining_credits: credits,
        pass_type: passType,
        starts_at: now.toISOString(),
        expires_at: expiresAt,
        is_active: true
      }))

      const { error } = await supabase.from('user_passes').insert(records)

      if (error) throw error
      await fetchAllPasses()
      return true
    } catch (err) {
      console.error('[useAllUserPasses] 다중 대학 패스 충전 실패:', err)
      return false
    }
  }

  /**
   * 신규 대학 패스 발급과 기존 보유 대학 크레딧 추가(+5회 단위)를 동시에 일괄 처리하는 함수
   */
  const purchasePassesAndAddons = async (
    newUniversities: string[],
    addonCreditsByUniv: Record<string, number>
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const now = new Date()
      const records: any[] = []

      // 1. 신규 대학 30일 마스터 패스 (각 30회, 30일)
      newUniversities.forEach((univ) => {
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        records.push({
          user_id: user.id,
          university: univ,
          total_credits: 30,
          remaining_credits: 30,
          pass_type: 'standard_30',
          starts_at: now.toISOString(),
          expires_at: expiresAt,
          is_active: true
        })
      })

      // 2. 보유 대학 크레딧 추가 (+5회 단위 충전권, 30일)
      Object.entries(addonCreditsByUniv).forEach(([univ, credits]) => {
        if (credits > 0) {
          const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          records.push({
            user_id: user.id,
            university: univ,
            total_credits: credits,
            remaining_credits: credits,
            pass_type: credits >= 10 ? 'addon_10' : 'addon_5',
            starts_at: now.toISOString(),
            expires_at: expiresAt,
            is_active: true
          })
        }
      })

      if (records.length === 0) return true

      const { error } = await supabase.from('user_passes').insert(records)
      if (error) throw error

      // 결제 주문 내역(payment_orders) 일괄 기록
      try {
        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '')
        const orderRows: any[] = []
        newUniversities.forEach((univ) => {
          orderRows.push({
            order_id: `ORD-${datePrefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            user_id: user.id,
            product_type: 'PASS_30',
            university: univ,
            amount: 19800,
            status: 'PAID',
            pg_provider: 'tosspayments',
            paid_at: now.toISOString(),
          })
        })
        Object.entries(addonCreditsByUniv).forEach(([univ, credits]) => {
          if (credits > 0) {
            orderRows.push({
              order_id: `ORD-${datePrefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
              user_id: user.id,
              product_type: credits >= 10 ? 'ADDON_10' : 'ADDON_5',
              university: univ,
              amount: (credits / 5) * 4900,
              status: 'PAID',
              pg_provider: 'tosspayments',
              paid_at: now.toISOString(),
            })
          }
        })
        if (orderRows.length > 0) {
          await supabase.from('payment_orders').insert(orderRows)
        }
      } catch (orderErr) {
        console.warn('[useAllUserPasses] payment_orders 기록 생략:', orderErr)
      }

      await fetchAllPasses()
      return true
    } catch (err) {
      console.error('[useAllUserPasses] 패스 및 크레딧 일괄 충전 실패:', err)
      return false
    }
  }

  return {
    allPasses,
    isLoading,
    refetchAllPasses: fetchAllPasses,
    grantMultiplePasses,
    purchasePassesAndAddons
  }
}

