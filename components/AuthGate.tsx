'use client'

import React, { useState, useEffect } from 'react'
import { Lock, ShieldAlert, ArrowRight, CheckCircle2, LogOut } from 'lucide-react'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 브라우저 로컬 저장소에서 이전 로그인 세션 확인
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('nonsulpass_auth')
      if (savedAuth === 'true') {
        setIsAuthenticated(true)
      }
    } catch (e) {
      console.error('인증 상태 확인 오류:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 임시 로그인 검증 처리 (ID: kmc, PW: 0422)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanUser = username.trim()
    const cleanPw = password.trim()

    if (cleanUser === 'kmc' && cleanPw === '0422') {
      try {
        localStorage.setItem('nonsulpass_auth', 'true')
      } catch (err) {
        console.error('인증 저장 실패:', err)
      }
      setIsAuthenticated(true)
    } else {
      setErrorMsg('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  // 관리자 로그아웃 처리
  const handleLogout = () => {
    if (confirm('임시 로그인 세션을 종료하고 사이트를 다시 잠그시겠습니까?')) {
      try {
        localStorage.removeItem('nonsulpass_auth')
      } catch (e) {}
      setIsAuthenticated(false)
      setUsername('')
      setPassword('')
    }
  }

  // 첫 마운트 로딩 중 깜빡임 방지용 빈 화면
  if (isLoading) {
    return (
      <div className="auth-gate-loading">
        <div className="auth-gate-spinner" />
      </div>
    )
  }

  // 인증이 완료된 경우 실제 서비스 화면 및 우측 상단 미니 로그아웃 컨트롤 노출
  if (isAuthenticated) {
    return (
      <>
        {children}
        {/* 인가된 사용자 편의용 우측 하단 미니 보안 잠금 배지 */}
        <button
          type="button"
          onClick={handleLogout}
          className="auth-logout-badge"
          title="임시 로그인 세션 종료 (화면 잠금)"
        >
          <Lock size={12} />
          <span>보안 잠금</span>
        </button>
      </>
    )
  }

  // 인증되지 않은 경우 전체 화면 임시 보안 로그인 게이트 노출
  return (
    <div className="auth-gate-overlay">
      <div className="auth-gate-card">
        <div className="auth-gate-header">
          <div className="auth-icon-wrap">
            <Lock className="auth-icon" />
          </div>
          <span className="auth-badge">INTERNAL TEST · 개발 비공개</span>
          <h2 className="auth-title">논술패스 LAB</h2>
          <p className="auth-desc">
            현재 2027학년도 대입 수시 논술 시스템 개발 및 내부 검증 중입니다.<br />
            인가된 담당자만 로그인 후 접근할 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {errorMsg && (
            <div className="auth-error-banner">
              <ShieldAlert size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-username">아이디 (ID)</label>
            <input
              id="auth-username"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password">비밀번호 (Password)</label>
            <input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn">
            <span>인증 및 사이트 입장</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span>인증 성공 시 이 브라우저에서는 세션이 안전하게 유지됩니다.</span>
        </div>
      </div>
    </div>
  )
}
