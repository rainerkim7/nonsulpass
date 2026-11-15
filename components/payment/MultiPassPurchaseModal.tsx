'use client'

/**
 * @file components/payment/MultiPassPurchaseModal.tsx
 * @description 수시 논술 목표 대학 선택 및 관리 모달 (최대 6개 제한)
 *              - 크래딧 결제와 분리되어, 사용자가 지망하는 목표 대학을 최대 6개까지 자유롭게 설정/변경
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  Target,
  AlertCircle,
  Loader2,
  GraduationCap,
  CheckSquare,
  Square,
} from 'lucide-react'
import { SEOUL_UNIVERSITIES, type UniversityMeta } from '@/lib/constants/universities'
import { MAX_TARGET_UNIVERSITIES } from '@/lib/auth-context'

interface MultiPassPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  currentTargets?: string[]
  universities?: UniversityMeta[]
  onSaveTargets: (selectedUniversities: string[]) => Promise<boolean>
}

export default function MultiPassPurchaseModal({
  isOpen,
  onClose,
  currentTargets = [],
  universities = SEOUL_UNIVERSITIES,
  onSaveTargets,
}: MultiPassPurchaseModalProps) {
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // 모달이 열릴 때마다 현재 저장된 목표 대학 목록으로 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedUnivs(currentTargets.slice(0, MAX_TARGET_UNIVERSITIES))
      setIsSaving(false)
      setErrorMsg(null)
      setSuccessNotice(null)
    }
  }, [isOpen, currentTargets])

  if (!isOpen) return null

  // 목표 대학 선택/해제 토글 (최대 6개 제한)
  const handleToggleUniv = (univName: string) => {
    setErrorMsg(null)
    setSelectedUnivs((prev) => {
      if (prev.includes(univName)) {
        return prev.filter((u) => u !== univName)
      }
      if (prev.length >= MAX_TARGET_UNIVERSITIES) {
        setErrorMsg(`현행 대입 수시 논술 전형 기준에 따라 목표 대학은 최대 ${MAX_TARGET_UNIVERSITIES}개까지만 선택할 수 있습니다.`)
        return prev
      }
      return [...prev, univName]
    })
  }

  // 저장 핸들러
  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    try {
      const ok = await onSaveTargets(selectedUnivs)
      if (ok) {
        setSuccessNotice(`🎯 목표 대학 ${selectedUnivs.length}개가 저장되었습니다.`)
        setTimeout(() => {
          setSuccessNotice(null)
          onClose()
        }, 900)
      } else {
        setErrorMsg('목표 대학 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || '목표 대학 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    수시 6장 기준
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    나의 목표 대학 설정 (최대 {MAX_TARGET_UNIVERSITIES}개)
                  </h3>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {successNotice && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 선택 카운터 및 초기화 바 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-slate-200">
                목표 대학 선택
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  selectedUnivs.length >= MAX_TARGET_UNIVERSITIES
                    ? 'bg-blue-500/25 text-blue-200 border-blue-400/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {selectedUnivs.length} / {MAX_TARGET_UNIVERSITIES}개 선택됨
              </span>
            </div>

            {selectedUnivs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUnivs([])
                  setErrorMsg(null)
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                선택 전체 해제
              </button>
            )}
          </div>

          {/* 대학 선택 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {universities.map((univ) => {
              const isSelected = selectedUnivs.includes(univ.name)
              const isLimitReached = selectedUnivs.length >= MAX_TARGET_UNIVERSITIES && !isSelected

              return (
                <button
                  key={univ.id}
                  type="button"
                  onClick={() => handleToggleUniv(univ.name)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/70'
                      : isLimitReached
                      ? 'bg-slate-800/30 border-slate-800 text-slate-500 opacity-60 hover:opacity-80'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{univ.name}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            * 크래딧은 목표 대학 외 다른 대학 논술 시험에서도 자유롭게 사용할 수 있습니다.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <span>목표 대학 저장 ({selectedUnivs.length}/{MAX_TARGET_UNIVERSITIES})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
