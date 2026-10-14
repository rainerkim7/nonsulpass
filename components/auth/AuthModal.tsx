'use client'

import React, { useState } from 'react'
import { X, Lock, Mail, User, GraduationCap, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { SEOUL_UNIVERSITIES } from '@/lib/constants/universities'

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, login, signup } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [targetUniv, setTargetUniv] = useState('홍익대학교')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isAuthModalOpen) return null

  const isSignup = authModalMode === 'signup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email || !email.includes('@')) {
      setErrorMessage('올바른 이메일 주소를 입력해 주세요.')
      return
    }

    if (!password || password.length < 6) {
      setErrorMessage('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        setErrorMessage('비밀번호가 서로 일치하지 않습니다.')
        return
      }
      if (!name.trim()) {
        setErrorMessage('수험생 이름을 입력해 주세요.')
        return
      }
    }

    setIsLoading(true)

    try {
      if (isSignup) {
        const res = await signup(email, password, name, targetUniv)
        if (res.error) {
          if (res.error.includes('already registered')) {
            setErrorMessage('이미 가입된 이메일 주소입니다. 로그인해 주세요.')
          } else {
            setErrorMessage(res.error)
          }
        } else {
          setSuccessMessage('회원가입이 완료되었습니다!')
        }
      } else {
        const res = await login(email, password)
        if (res.error) {
          if (res.error.includes('Invalid login credentials')) {
            setErrorMessage('이메일 또는 비밀번호가 일치하지 않습니다.')
          } else {
            setErrorMessage(res.error)
          }
        } else {
          setSuccessMessage('로그인되었습니다!')
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || '인증 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={closeAuthModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={15} color="#ffffff" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', color: '#93c5fd' }}>
              NONSUL PASS LAB
            </span>
          </div>

          <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
            {isSignup ? '논술패스 수험생 회원가입' : '논술패스 계정 로그인'}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {isSignup
              ? '회원가입 후 실전 답안 제출 및 AI 1:1 맞춤 첨삭 리포트를 보관하세요.'
              : '로그인하여 이전 채점 리포트와 모의고사 응시 기록을 확인하세요.'}
          </p>

          <button
            onClick={closeAuthModal}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 로그인 / 회원가입 탭 전환 바 */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            margin: '16px 24px 0',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              openAuthModal('login')
              setErrorMessage(null)
            }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              fontWeight: !isSignup ? 800 : 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: !isSignup ? '#ffffff' : 'transparent',
              color: !isSignup ? '#1e3a8a' : '#64748b',
              boxShadow: !isSignup ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('signup')
              setErrorMessage(null)
            }}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              fontWeight: isSignup ? 800 : 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: isSignup ? '#ffffff' : 'transparent',
              color: isSignup ? '#1e3a8a' : '#64748b',
              boxShadow: isSignup ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            회원가입
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 회원가입 전용 필드: 이름 & 목표 대학 */}
          {isSignup && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  수험생 이름
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      caretColor: '#2563eb',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  목표 지망 대학
                </label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                  <select
                    value={targetUniv}
                    onChange={(e) => setTargetUniv(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {SEOUL_UNIVERSITIES.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* 공통 필드: 이메일 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              이메일 주소
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  caretColor: '#2563eb',
                }}
              />
            </div>
          </div>

          {/* 공통 필드: 비밀번호 */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="password"
                required
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  caretColor: '#2563eb',
                }}
              />
            </div>
          </div>

          {/* 회원가입 전용 필드: 비밀번호 확인 */}
          {isSignup && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                비밀번호 확인
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  placeholder="비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    caretColor: '#2563eb',
                  }}
                />
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '6px',
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>{isSignup ? '논술패스 회원가입 완료' : '로그인하기'}</span>
            {!isLoading && <ArrowRight size={15} />}
          </button>
        </form>

        {/* 하단 보조 안내 */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          {isSignup ? (
            <span>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                로그인하기
              </button>
            </span>
          ) : (
            <span>
              아직 계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                30초 만에 회원가입
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
