'use client'

/**
 * @file components/AuthGate.tsx
 * @description Supabase Auth 기반 전역 인증 게이트웨이 및 호환 레이어
 *              (누구나 사이트를 탐색할 수 있도록 Public 탐색을 보장하며, 필요 시 AuthModal을 제공합니다)
 */

import React from 'react'
import { AuthProvider, useAuth, UserRole } from '@/lib/auth-context'
import AuthModal from '@/components/auth/AuthModal'

// 기존 파일들(HomePage, ExamWorkspace, AdminPage 등)과의 100% 호환용 export
export { useAuth }
export type { UserRole }

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()

  // 첫 마운트 시 극단적 레이아웃 시프트 방지용 로딩 스피너 (0.1초 이내 소멸)
  if (isLoading) {
    return (
      <div className="auth-gate-loading">
        <div className="auth-gate-spinner" />
      </div>
    )
  }

  return (
    <>
      {children}
      {/* 전역 로그인 / 회원가입 팝업 모달 */}
      <AuthModal />
    </>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGateInner>{children}</AuthGateInner>
    </AuthProvider>
  )
}
