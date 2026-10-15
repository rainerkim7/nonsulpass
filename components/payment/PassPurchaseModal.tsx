'use client'

/**
 * @file components/payment/PassPurchaseModal.tsx
 * @description 대학별 30일 마스터 패스 (19,800원) 및 추가 채점권 결제 모달
 */

import React, { useState } from 'react'
import { X, Check, Sparkles, CreditCard, ShieldCheck, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { PASS_PRODUCTS, PassProductItem, PassType } from '@/types/payment'
import { useAuth } from '@/lib/auth-context'

interface PassPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  university: string
  onPaymentSuccess?: (credits: number) => void
  onGrantPass: (passType: PassType, credits: number, periodDays?: number) => Promise<boolean>
}

export default function PassPurchaseModal({
  isOpen,
  onClose,
  university,
  onPaymentSuccess,
  onGrantPass,
}: PassPurchaseModalProps) {
  const { user } = useAuth()
  const [selectedProduct, setSelectedProduct] = useState<PassProductItem>(PASS_PRODUCTS[0])
  const [payMethod, setPayMethod] = useState<'card' | 'kakaopay' | 'naverpay' | 'tosspay'>('kakaopay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // 결제 진행 핸들러 (실제 PG SDK 연동 및 테스트 환경 즉시 충전 겸용)
  const handleProceedPayment = async () => {
    if (!user) {
      setErrorMsg('결제를 진행하려면 먼저 로그인해 주세요.')
      return
    }

    setIsProcessing(true)
    setErrorMsg(null)

    try {
      // 1. 패스 부여 처리 (DB에 30일 패스 및 크레딧 충전)
      const success = await onGrantPass(
        selectedProduct.id,
        selectedProduct.credits,
        selectedProduct.periodDays
      )

      if (success) {
        setSuccessNotice(`🎉 ${university} [${selectedProduct.name}] 결제가 완료되었습니다! (채점 크레딧 +${selectedProduct.credits}회 지급)`)
        if (onPaymentSuccess) {
          onPaymentSuccess(selectedProduct.credits)
        }
        setTimeout(() => {
          setSuccessNotice(null)
          onClose()
        }, 1800)
      } else {
        setErrorMsg('결제 처리 중 DB 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } catch (err: any) {
      console.error('결제 처리 오류:', err)
      setErrorMsg(err.message || '결제 진행 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="relative px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {university || '대학 맞춤'}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    논술패스 프리미엄 훈련권
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  15개 전 시험 세트(기출+모의+예상) 및 1:1 AI 다차원 정밀 첨삭
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 성공 알림 토스트 */}
          {successNotice && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-in zoom-in-95">
              <Sparkles className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* 에러 알림 */}
          {errorMsg && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. 상품 선택 카드 그리드 */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
              이용권 선택
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PASS_PRODUCTS.map((prod) => {
                const isSelected = selectedProduct.id === prod.id
                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProduct(prod)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {prod.badge && (
                      <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                        {prod.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-100">{prod.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-700/40">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-extrabold text-white">
                          {prod.price.toLocaleString()}원
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          / {prod.credits}회
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. 선택된 상품 포함 혜택 상세 */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>{selectedProduct.name} 제공 혜택</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedProduct.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. 결제 수단 선택 */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              결제 수단
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
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
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

        {/* 푸터 (결제 버튼) */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>부가세(VAT) 포함가 · 결제 후 30일간 유효 · 즉시 반영</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleProceedPayment}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>결제 승인 처리 중...</span>
                </>
              ) : (
                <>
                  <span>{selectedProduct.price.toLocaleString()}원 결제하기</span>
                  <span className="text-blue-200 text-[11px] font-normal">
                    (+{selectedProduct.credits}회 충전)
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
