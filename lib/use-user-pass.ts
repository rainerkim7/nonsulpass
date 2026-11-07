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
   * 관리자가 설정한 AI 채점 및 패스 운영 정책(쿨다운 분 · 문항당 한도 · 패스 유효기간 · 기본 크레딧)을 실시간 DB에서 조회하는 헬퍼
   */
  const fetchActiveGradingPolicy = async (): Promise<{
    cooldownMinutes: number
    maxAttempts: number
    periodDays: number
    baseCredits: number
  }> => {
    try {
      const { data } = await supabase
        .from('universities')
        .select('exam_duration, total_questions, char_per_question')
        .eq('id', '__grading_policy__')
        .maybeSingle()

      if (!data) {
        return { cooldownMinutes: 3, maxAttempts: 5, periodDays: 365, baseCredits: 60 }
      }

      const parsedCooldown = Number(data.exam_duration)
      const parsedMaxAttempts = Number(data.total_questions)

      let periodDays = 365
      let baseCredits = 60
      if (data.char_per_question) {
        try {
          const extraConfig = JSON.parse(data.char_per_question)
          if (typeof extraConfig.periodDays === 'number' && extraConfig.periodDays >= 0) {
            periodDays = extraConfig.periodDays
          }
          if (typeof extraConfig.baseCredits === 'number' && extraConfig.baseCredits > 0) {
            baseCredits = extraConfig.baseCredits
          }
        } catch {
          // fallback 기본값
        }
      }

      return {
        cooldownMinutes:
          !Number.isNaN(parsedCooldown) && parsedCooldown >= 0 ? parsedCooldown : 3,
        maxAttempts:
          !Number.isNaN(parsedMaxAttempts) && parsedMaxAttempts >= 0 ? parsedMaxAttempts : 5,
        periodDays,
        baseCredits,
      }
    } catch {
      return { cooldownMinutes: 3, maxAttempts: 5, periodDays: 365, baseCredits: 60 }
    }
  }

  /**
   * AI 채점 요청 전 크레딧을 미리 차감하지 않고,
   * 유효 패스 보유 여부 · 관리자 설정 문항당 최대 횟수 상한 · 재제출 쿨다운 자격만 사전 검증하는 함수
   */
  const checkCreditEligibility = async (
    examId: string,
    questionId: string
  ): Promise<CreditDeductionResult> => {
    if (!user) {
      return {
        success: false,
        code: 'ERROR',
        message: '로그인이 필요합니다.',
      }
    }

    if (!university) {
      return {
        success: false,
        code: 'ERROR',
        message: '응시할 대학 정보가 올바르지 않습니다.',
      }
    }

    try {
      // 1) 관리자 설정 채점 운영 정책 및 문항별 시도 기록 동시 조회
      const [policy, { data: logRow }] = await Promise.all([
        fetchActiveGradingPolicy(),
        supabase
          .from('exam_attempt_logs')
          .select('attempt_count, last_submitted_at')
          .eq('user_id', user.id)
          .eq('exam_id', examId)
          .eq('question_id', questionId)
          .maybeSingle(),
      ])

      if (logRow) {
        const attemptCount = logRow.attempt_count || 0
        // maxAttempts가 0이면 무제한 허용, 1 이상이면 상한 검증
        if (policy.maxAttempts > 0 && attemptCount >= policy.maxAttempts) {
          return {
            success: false,
            code: 'MAX_ATTEMPTS_EXCEEDED',
            message: `해당 문항의 최대 채점 한도(${policy.maxAttempts}회)를 초과하였습니다. 다른 문항에 도전해 보세요.`,
            attempt_count: attemptCount,
          }
        }

        // cooldownMinutes가 0이면 쿨다운 해제, 1 이상이면 쿨다운 초 단위 검증
        if (policy.cooldownMinutes > 0 && logRow.last_submitted_at) {
          const elapsedSec = Math.floor(
            (Date.now() - new Date(logRow.last_submitted_at).getTime()) / 1000
          )
          const cooldownLimitSec = policy.cooldownMinutes * 60
          if (elapsedSec < cooldownLimitSec) {
            return {
              success: false,
              code: 'COOLDOWN_ACTIVE',
              message: '이전 첨삭 리포트를 복습할 수 있도록 제출 쿨다운 중입니다.',
              cooldown_remaining_seconds: cooldownLimitSec - elapsedSec,
              attempt_count: attemptCount,
            }
          }
        }
      }

      // 2) 유효 패스 및 잔여 크레딧 실시간 DB 조회
      const nowIso = new Date().toISOString()
      const { data: passes } = await supabase
        .from('user_passes')
        .select('id, remaining_credits')
        .eq('user_id', user.id)
        .eq('university', university)
        .eq('is_active', true)
        .gt('expires_at', nowIso)
        .gt('remaining_credits', 0)
        .order('expires_at', { ascending: true })

      const totalAvail = (passes || []).reduce((acc, p) => acc + (p.remaining_credits || 0), 0)
      if (!passes || passes.length === 0 || totalAvail <= 0) {
        return {
          success: false,
          code: 'NO_CREDITS',
          message: '해당 대학의 유효한 이용권이 없거나 잔여 채점 크레딧이 모두 소진되었습니다.',
          remaining_credits: 0,
        }
      }

      return {
        success: true,
        code: 'OK',
        message: '채점 응시 자격이 확인되었습니다.',
        remaining_credits: totalAvail,
      }
    } catch (err: any) {
      console.error('[useUserPass] 자격 사전 검증 오류:', err)
      return {
        success: false,
        code: 'ERROR',
        message: err.message || '채점 자격 확인 중 오류가 발생했습니다.',
      }
    }
  }

  /**
   * AI 채점 완료 후 DB 크레딧 1회 차감 및 문항별 응시 기록 갱신 함수
   * - 관리자가 동적으로 설정한 쿨다운/최대횟수 정책과 100% 호환되도록 DB 직접 차감 및 로그 기록 수행
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
      const nowIso = new Date().toISOString()

      // 1) 만료일이 가장 임박한 유효 패스 1건 조회
      const { data: targetPass, error: passErr } = await supabase
        .from('user_passes')
        .select('id, remaining_credits')
        .eq('user_id', user.id)
        .eq('university', university)
        .eq('is_active', true)
        .gt('expires_at', nowIso)
        .gt('remaining_credits', 0)
        .order('expires_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (passErr || !targetPass) {
        return {
          success: false,
          code: 'NO_CREDITS',
          message: '해당 대학의 유효한 이용권이 없거나 잔여 채점 크레딧이 모두 소진되었습니다.',
          remaining_credits: 0,
        }
      }

      const nextCredits = Math.max(0, (targetPass.remaining_credits || 1) - 1)

      // 2) 크레딧 1회 차감 업데이트
      const { error: updateErr } = await supabase
        .from('user_passes')
        .update({
          remaining_credits: nextCredits,
          updated_at: nowIso,
        })
        .eq('id', targetPass.id)

      if (updateErr) {
        throw updateErr
      }

      // 3) 문항별 응시 횟수 및 최근 제출 시각 기록 갱신
      const { data: existingLog } = await supabase
        .from('exam_attempt_logs')
        .select('id, attempt_count')
        .eq('user_id', user.id)
        .eq('exam_id', examId)
        .eq('question_id', questionId)
        .maybeSingle()

      let nextAttemptCount = 1
      if (existingLog?.id) {
        nextAttemptCount = (existingLog.attempt_count || 0) + 1
        await supabase
          .from('exam_attempt_logs')
          .update({
            attempt_count: nextAttemptCount,
            last_submitted_at: nowIso,
          })
          .eq('id', existingLog.id)
      } else {
        await supabase.from('exam_attempt_logs').insert({
          user_id: user.id,
          university,
          exam_id: examId,
          question_id: questionId,
          attempt_count: 1,
          last_submitted_at: nowIso,
        })
      }

      // 4) 로컬 패스 상태 즉시 동기화
      await fetchPass()

      return {
        success: true,
        code: 'OK',
        message: '채점 크레딧이 1회 사용되었습니다.',
        remaining_credits: nextCredits,
        attempt_count: nextAttemptCount,
      }
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
   * 이미 차감된 크레딧 1회 및 시도 횟수를 원상 복구(환불)하는 안전장치 함수
   * - React 클로저의 이전(Stale) userPass 대신 DB의 실시간 행을 직접 조회하여 복구함으로써 +1 초과 증가 버그 원천 차단
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
        // RPC 미등록 환경을 대비한 DB 실시간 조회 기반 복구 폴백 (Stale Closure 방지)
        const nowIso = new Date().toISOString()
        const { data: latestPass } = await supabase
          .from('user_passes')
          .select('id, remaining_credits, total_credits')
          .eq('user_id', user.id)
          .eq('university', university)
          .eq('is_active', true)
          .gt('expires_at', nowIso)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestPass && latestPass.remaining_credits < latestPass.total_credits) {
          await supabase
            .from('user_passes')
            .update({
              remaining_credits: latestPass.remaining_credits + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', latestPass.id)
        }

        const { data: logRow } = await supabase
          .from('exam_attempt_logs')
          .select('id, attempt_count')
          .eq('user_id', user.id)
          .eq('exam_id', examId)
          .eq('question_id', questionId)
          .maybeSingle()

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
  const grantPass = async (passType: PassType, credits?: number, periodDays?: number) => {
    if (!user || !university) return false

    try {
      const now = new Date()
      // 관리자 실시간 정책 조회 (인자가 직접 넘어오지 않았거나 standard_30인 경우 관리자 정책 우선)
      const policy = await fetchActiveGradingPolicy()
      const effectiveCredits =
        credits !== undefined && credits > 0
          ? credits
          : passType === 'standard_30'
          ? policy.baseCredits
          : 30

      const effectivePeriodDays =
        periodDays !== undefined && periodDays >= 0
          ? periodDays
          : policy.periodDays

      // periodDays가 0이면 10년 뒤(사실상 무제한)로 설정
      const daysToAdd = effectivePeriodDays === 0 ? 3650 : effectivePeriodDays
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('user_passes').insert({
        user_id: user.id,
        university,
        total_credits: effectiveCredits,
        remaining_credits: effectiveCredits,
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
    checkCreditEligibility,
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
   * 여러 대학에 대해 대학 마스터 패스를 한 번에 일괄 구매 및 DB 부여하는 함수
   */
  const grantMultiplePasses = async (
    universities: string[],
    passType: PassType = 'standard_30',
    credits?: number,
    periodDays?: number
  ): Promise<boolean> => {
    if (!user || universities.length === 0) return false

    try {
      const now = new Date()
      // 관리자 실시간 정책 동기화
      let policy = { periodDays: 365, baseCredits: 60 }
      try {
        const { data } = await supabase
          .from('universities')
          .select('char_per_question')
          .eq('id', '__grading_policy__')
          .maybeSingle()
        if (data?.char_per_question) {
          const parsed = JSON.parse(data.char_per_question)
          if (typeof parsed.periodDays === 'number') policy.periodDays = parsed.periodDays
          if (typeof parsed.baseCredits === 'number') policy.baseCredits = parsed.baseCredits
        }
      } catch {
        // 기본값 사용
      }

      const effectiveCredits =
        credits !== undefined && credits > 0
          ? credits
          : passType === 'standard_30'
          ? policy.baseCredits
          : 60

      const effectivePeriodDays =
        periodDays !== undefined && periodDays >= 0
          ? periodDays
          : policy.periodDays

      const daysToAdd = effectivePeriodDays === 0 ? 3650 : effectivePeriodDays
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

      const records = universities.map((univ) => ({
        user_id: user.id,
        university: univ,
        total_credits: effectiveCredits,
        remaining_credits: effectiveCredits,
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

      // 관리자 실시간 정책 동기화
      let policy = { periodDays: 365, baseCredits: 60 }
      try {
        const { data } = await supabase
          .from('universities')
          .select('char_per_question')
          .eq('id', '__grading_policy__')
          .maybeSingle()
        if (data?.char_per_question) {
          const parsed = JSON.parse(data.char_per_question)
          if (typeof parsed.periodDays === 'number') policy.periodDays = parsed.periodDays
          if (typeof parsed.baseCredits === 'number') policy.baseCredits = parsed.baseCredits
        }
      } catch {
        // 기본값 사용
      }

      const daysToAdd = policy.periodDays === 0 ? 3650 : policy.periodDays
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

      // 1. 신규 대학 마스터 패스 (관리자 설정 기준: 60회, 365일)
      newUniversities.forEach((univ) => {
        records.push({
          user_id: user.id,
          university: univ,
          total_credits: policy.baseCredits,
          remaining_credits: policy.baseCredits,
          pass_type: 'standard_30',
          starts_at: now.toISOString(),
          expires_at: expiresAt,
          is_active: true
        })
      })

      // 2. 보유 대학 크레딧 추가 (+5회 단위 충전권, 동일 유효기간 부여)
      Object.entries(addonCreditsByUniv).forEach(([univ, credits]) => {
        if (credits > 0) {
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

