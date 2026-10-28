'use client'

/**
 * @file components/payment/MultiPassPurchaseModal.tsx
 * @description 서울 주요 대학 논술 패스 다중 선택 및 보유 대학 크레딧 추가 충전 결제 모달
 *              - 미보유 대학: 30일 마스터 패스 (대학당 19,800원 / 30회) 복수 선택
 *              - 보유 대학: '+크레딧' 버튼으로 5회 단위(+5, +10...) 추가 충전 (5회당 4,900원)
 *              - 모달 재오픈 시 이전 체크 상태 자동 초기화
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  Sparkles,
  CreditCard,
  Zap,
  AlertCircle,
  Loader2,
  GraduationCap,
  CheckSquare,
  Square,
  Plus,
  RotateCcw
} from 'lucide-react'
import { SEOUL_UNIVERSITIES, type UniversityMeta } from '@/lib/constants/universities'
import { useAuth } from '@/lib/auth-context'

interface MultiPassPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  ownedUniversities?: string[] // 이미 활성 패스를 보유하고 있는 대학명 목록
  universities?: UniversityMeta[] // 동적 확장된 대학 목록 (미전달 시 SEOUL_UNIVERSITIES 기본 사용)
  onSuccess?: () => void
  onPurchase: (
    newUniversities: string[],
    addonCreditsByUniv: Record<string, number>
  ) => Promise<boolean>
}

// 가격 및 크레딧 상수 (대학 페이지 PassPurchaseModal과 동일)
const PRICE_PER_NEW_UNIV = 19800 // 신규 대학 30일 마스터 패스 (30회)
const ADDON_CREDIT_STEP = 5 // 크레딧 추가 단위: 5회
const ADDON_PRICE_PER_STEP = 4900 // 5회당 4,900원 (대학 페이지 addon_5와 동일)

export default function MultiPassPurchaseModal({
  isOpen,
  onClose,
  ownedUniversities = [],
  universities = SEOUL_UNIVERSITIES,
  onSuccess,
  onPurchase,
}: MultiPassPurchaseModalProps) {
  const { user } = useAuth()

  // 신규 패스를 구매할 대학 목록 (체크박스)
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>([])
  // 이미 보유한 대학의 추가 크레딧 맵: { '홍익대학교': 10, '경희대학교': 5 }
  const [addonCredits, setAddonCredits] = useState<Record<string, number>>({})

  const [payMethod, setPayMethod] = useState<'kakaopay' | 'tosspay' | 'naverpay' | 'card'>('kakaopay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. 모달이 열릴 때마다 이전 선택 상태(체크 표시 및 크레딧 추가 내역) 깨끗이 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedUnivs([])
      setAddonCredits({})
      setIsProcessing(false)
      setErrorMsg(null)
      setSuccessNotice(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // 미보유 대학 선택/해제 토글
  const handleToggleUniv = (univName: string) => {
    if (ownedUniversities.includes(univName)) return
    setSelectedUnivs((prev) => {
      if (prev.includes(univName)) {
        return prev.filter((u) => u !== univName)
      } else {
        return [...prev, univName]
      }
    })
  }

  // 미보유 대학 전체 선택 / 전체 해제
  const unownedList = universities.filter((u) => !ownedUniversities.includes(u.name)).map((u) => u.name)
  const handleToggleAllUnowned = () => {
    if (selectedUnivs.length === unownedList.length) {
      setSelectedUnivs([])
    } else {
      setSelectedUnivs(unownedList)
    }
  }

  // 보유 대학 크레딧 추가 (+5회 단위 증가)
  const handleAddCredit = (univName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddonCredits((prev) => {
      const current = prev[univName] || 0
      return { ...prev, [univName]: current + ADDON_CREDIT_STEP }
    })
  }

  // 보유 대학 추가 크레딧 리셋 (0으로 되돌리기)
  const handleResetCredit = (univName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddonCredits((prev) => {
      const next = { ...prev }
      delete next[univName]
      return next
    })
  }

  // 금액 계산
  const newUnivPrice = selectedUnivs.length * PRICE_PER_NEW_UNIV
  const totalAddonCount = Object.values(addonCredits).reduce((sum, c) => sum + c, 0)
  const addonPrice = (totalAddonCount / ADDON_CREDIT_STEP) * ADDON_PRICE_PER_STEP
  const totalPrice = newUnivPrice + addonPrice
  const totalNewCredits = selectedUnivs.length * 30
  const totalAllCredits = totalNewCredits + totalAddonCount

  // 결제 진행
  const handleProceedPayment = async () => {
    if (!user) {
      setErrorMsg('결제를 진행하려면 먼저 로그인해 주세요.')
      return
    }

    if (selectedUnivs.length === 0 && totalAddonCount === 0) {
      setErrorMsg('구매할 대학 패스 또는 추가할 크레딧(+크레딧)을 선택해 주세요.')
      return
    }

    setIsProcessing(true)
    setErrorMsg(null)

    try {
      const success = await onPurchase(selectedUnivs, addonCredits)

      if (success) {
        const details: string[] = []
        if (selectedUnivs.length > 0) {
          details.push(`신규 패스 ${selectedUnivs.length}개 (+${totalNewCredits}회)`)
        }
        if (totalAddonCount > 0) {
          details.push(`크레딧 추가 +${totalAddonCount}회`)
        }

        setSuccessNotice(`🎉 결제가 성공적으로 완료되었습니다! (${details.join(', ')})`)
        if (onSuccess) {
          onSuccess()
        }
        setTimeout(() => {
          setSuccessNotice(null)
          onClose()
        }, 1600)
      } else {
        setErrorMsg('결제 처리 중 데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } catch (err: any) {
      console.error('패스/크레딧 결제 오류:', err)
      setErrorMsg(err.message || '결제 진행 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 상단 헤더 */}
        <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    목표 대학 패스 선택 & 크레딧 추가
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    대학 패스 19,800원 · 크레딧 5회당 4,900원
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  신규 대학 30일 마스터 패스를 선택하거나, 이미 보유한 대학의 채점 크레딧을 +5회 단위로 간편히 충전하세요.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 콘텐츠 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 성공 알림 토스트 */}
          {successNotice && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in zoom-in-95">
              <Sparkles className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* 에러 메시지 알림 */}
          {errorMsg && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 대학 다중 선택 영역 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  전체 대학 목록 ({universities.length}개 대학)
                </label>
                <span className="text-[11px] text-slate-400">
                  (미보유: 체크하여 신규 패스 추가 / 보유 대학: [+] 클릭)
                </span>
              </div>
              {unownedList.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllUnowned}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
                >
                  {selectedUnivs.length === unownedList.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> 전체 해제
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" /> 미보유 대학 전체 선택
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 전체 대학 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {universities.map((univ) => {
                const isOwned = ownedUniversities.includes(univ.name)
                const isSelected = selectedUnivs.includes(univ.name)
                const addedCredit = addonCredits[univ.name] || 0

                // 1) 이미 보유 중인 대학인 경우: [+] 버튼 및 5회 단위 숫자 표시항 제공
                if (isOwned) {
                  return (
                    <div
                      key={univ.id}
                      className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-between select-none ${
                        addedCredit > 0
                          ? 'bg-amber-500/15 border-amber-500/80 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800/40 border-slate-700/60'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {univ.name}
                        </span>
                      </div>

                      {/* + 버튼 및 숫자 표시항 */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleAddCredit(univ.name, e)}
                          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer flex items-center justify-center font-black"
                          title="클릭할 때마다 크레딧이 5회씩 추가됩니다 (5회당 4,900원)"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        {/* 숫자 표시항 (0회 또는 +5, +10회 등) */}
                        <div
                          className={`min-w-[42px] px-1.5 py-1 text-[11px] font-black rounded-lg text-center border flex items-center justify-center gap-0.5 ${
                            addedCredit > 0
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <span>{addedCredit > 0 ? `+${addedCredit}` : '0'}</span>
                          {addedCredit > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleResetCredit(univ.name, e)}
                              className="ml-0.5 p-0.5 hover:bg-black/20 rounded text-slate-900 cursor-pointer"
                              title="추가 취소 (0으로 초기화)"
                            >
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                // 2) 미보유 대학인 경우: 체크박스로 신규 30일 마스터 패스 선택
                return (
                  <div
                    key={univ.id}
                    onClick={() => handleToggleUniv(univ.name)}
                    className={`relative p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-600 bg-slate-900/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold truncate">{univ.name}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      19,800원
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 패스 혜택 요약 정보 */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>패스 및 크레딧 결제 안내</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11.5px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>신규 대학 마스터 패스: 대학당 19,800원 (15개 전 시험 해금 + 30회)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>보유 대학 크레딧 추가: 5회당 4,900원 (집중 첨삭 즉시 충전)</span>
              </div>
            </div>
          </div>

          {/* 결제 수단 선택 */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              결제 수단 선택
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'kakaopay', name: '카카오페이', color: 'text-amber-300' },
                { id: 'tosspay', name: '토스페이', color: 'text-blue-400' },
                { id: 'naverpay', name: '네이버페이', color: 'text-emerald-400' },
                { id: 'card', name: '신용/체크카드', color: 'text-slate-200' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayMethod(m.id as any)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    payMethod === m.id
                      ? 'bg-slate-700 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className={`w-3.5 h-3.5 ${m.color}`} />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 모달 하단 푸터 (금액 계산 및 결제 버튼) */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white">
                {totalPrice.toLocaleString()}원
              </span>
              <span className="text-xs text-blue-300 font-bold">
                (총 {totalAllCredits}회 채점권)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {selectedUnivs.length > 0 && (
                <span>신규 패스 {selectedUnivs.length}개 ({newUnivPrice.toLocaleString()}원)</span>
              )}
              {selectedUnivs.length > 0 && totalAddonCount > 0 && <span>·</span>}
              {totalAddonCount > 0 && (
                <span className="text-amber-300 font-semibold">
                  크레딧 추가 +{totalAddonCount}회 ({addonPrice.toLocaleString()}원)
                </span>
              )}
              {selectedUnivs.length === 0 && totalAddonCount === 0 && (
                <span>대학을 선택하거나 [+크레딧]을 클릭하세요</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleProceedPayment}
              disabled={isProcessing || totalPrice === 0}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                totalPrice === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>결제 승인 처리 중...</span>
                </>
              ) : (
                <>
                  <span>
                    {totalPrice > 0
                      ? `${totalPrice.toLocaleString()}원 결제하기`
                      : '대학 선택 / 크레딧 추가'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
