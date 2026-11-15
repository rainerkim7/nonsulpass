'use client'

/**
 * @file components/auth/ProfileEditModal.tsx
 * @description 로그인 회원의 개인정보(이름, 고등학교 소재 지역, 비밀번호) 수정 모달
 *              (ID인 이메일 주소는 읽기 전용으로 표시)
 */

import React, { useState, useEffect } from 'react'
import { X, User, Mail, MapPin, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { HIGH_SCHOOL_REGIONS } from '@/lib/constants/regions'

export default function ProfileEditModal() {
  const {
    isAuthenticated,
    isProfileModalOpen,
    closeProfileModal,
    user,
    profile,
    updateProfile,
  } = useAuth()

  const [name, setName] = useState('')
  const [highSchoolRegion, setHighSchoolRegion] = useState<string>('서울특별시')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 모달이 열릴 때마다 현재 회원 정보로 초기화
  useEffect(() => {
    if (isProfileModalOpen) {
      setName(profile?.name || user?.user_metadata?.name || '')
      setHighSchoolRegion(
        profile?.high_school_region || user?.user_metadata?.high_school_region || '서울특별시'
      )
      setNewPassword('')
      setConfirmPassword('')
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isProfileModalOpen, profile, user])

  if (!isProfileModalOpen || !isAuthenticated) return null

  const email = profile?.email || user?.email || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!name.trim()) {
      setErrorMessage('이름을 입력해 주세요.')
      return
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setErrorMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await updateProfile({
        name: name.trim(),
        highSchoolRegion,
        newPassword: newPassword.trim() || undefined,
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage('개인정보가 성공적으로 수정되었습니다.')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          closeProfileModal()
        }, 900)
      }
    } catch (err: any) {
      setErrorMessage(err.message || '개인정보 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-5 bg-slate-900/75 backdrop-blur-sm"
      onClick={closeProfileModal}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-extrabold tracking-wide text-blue-300">
              MY PROFILE
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-white">내 정보 수정</h3>
          <p className="text-xs text-slate-400 mt-1">
            이름, 고등학교 소재 지역 및 비밀번호를 변경할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={closeProfileModal}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 수정 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 이메일 ID (읽기 전용) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              이메일 주소 (ID · 변경 불가)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              이름
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 고등학교 소재 지역 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              고등학교 소재 지역
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                value={highSchoolRegion}
                onChange={(e) => setHighSchoolRegion(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {HIGH_SCHOOL_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 새 비밀번호 (선택) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-[11px] font-semibold text-slate-500">
              비밀번호를 변경하려면 아래에 새 비밀번호를 입력하세요. (미입력 시 기존 비밀번호 유지)
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                새 비밀번호 (선택)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="변경 시 최소 6자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="새 비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeProfileModal}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-sm transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              변경사항 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
