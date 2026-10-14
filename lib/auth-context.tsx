'use client'

/**
 * @file lib/auth-context.tsx
 * @description Supabase Auth 기반 전역 인증 및 세션 관리 프로바이더
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'user'

export interface UserProfile {
  id: string
  email: string
  name: string
  target_university?: string
  role: UserRole
}

export interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  isAdmin: boolean
  userDisplayName: string
  // 호환용 레거시 필드 (기존 컴포넌트에서 user: string으로 참조하던 경우 지원)
  userLegacy: string | null
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signup: (email: string, password: string, name: string, targetUniversity?: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  // 인증 모달 제어
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'signup'
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  userDisplayName: '게스트',
  userLegacy: null,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: async () => {},
  isAuthModalOpen: false,
  authModalMode: 'login',
  openAuthModal: () => {},
  closeAuthModal: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 로그인 / 회원가입 전역 팝업 모달 상태
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')

  // Supabase profiles 테이블에서 사용자 세부 프로필(이름, 역할 등) 조회
  const fetchProfile = useCallback(async (userId: string, userEmail: string, metaName?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('[AuthProvider] 프로필 조회 오류 (기본 프로필 생성 시도):', error.message)
      }

      if (data) {
        setProfile(data as UserProfile)
        return data as UserProfile
      } else {
        // DB 트리거가 아직 없는 경우 또는 레코드가 없는 경우 자동 생성 fallback
        const fallbackProfile: UserProfile = {
          id: userId,
          email: userEmail,
          name: metaName || userEmail.split('@')[0] || '수험생',
          target_university: '홍익대학교',
          role: userEmail.includes('admin') ? 'admin' : 'user'
        }
        try {
          await supabase.from('profiles').upsert(fallbackProfile)
        } catch (e) {}
        setProfile(fallbackProfile)
        return fallbackProfile
      }
    } catch (err) {
      console.error('[AuthProvider] 프로필 로드 실패:', err)
      return null
    }
  }, [])

  // 초기 세션 복원 및 인증 상태 실시간 리스너 연결
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user || null)
          if (initialSession?.user) {
            await fetchProfile(
              initialSession.user.id,
              initialSession.user.email || '',
              initialSession.user.user_metadata?.name
            )
          }
        }
      } catch (err) {
        console.error('[AuthProvider] 세션 초기화 오류:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user || null)
      if (newSession?.user) {
        await fetchProfile(
          newSession.user.id,
          newSession.user.email || '',
          newSession.user.user_metadata?.name
        )
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // 1. 이메일 / 비밀번호 로그인
  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        await fetchProfile(data.user.id, data.user.email || '', data.user.user_metadata?.name)
      }

      setIsAuthModalOpen(false)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || '로그인 중 오류가 발생했습니다.' }
    }
  }

  // 2. 이메일 / 비밀번호 회원가입
  const signup = async (
    email: string,
    password: string,
    name: string,
    targetUniversity?: string
  ): Promise<{ error: string | null }> => {
    try {
      const cleanEmail = email.trim()
      const cleanName = name.trim() || '수험생'
      const cleanTarget = targetUniversity || '홍익대학교'

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            name: cleanName,
            target_university: cleanTarget,
            role: cleanEmail.includes('admin') ? 'admin' : 'user'
          }
        }
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // profiles 테이블에 사용자 레코드 즉시 생성 보장
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            name: cleanName,
            target_university: cleanTarget,
            role: cleanEmail.includes('admin') ? 'admin' : 'user'
          })
        } catch (e) {}

        await fetchProfile(data.user.id, cleanEmail, cleanName)
      }

      setIsAuthModalOpen(false)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || '회원가입 중 오류가 발생했습니다.' }
    }
  }

  // 3. 로그아웃
  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (err) {
      console.error('[AuthProvider] 로그아웃 오류:', err)
    }
  }

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const isAuthenticated = !!user
  const role: UserRole = profile?.role || (user?.email?.includes('admin') ? 'admin' : 'user')
  const isAdmin = role === 'admin'
  const userDisplayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '수험생'
  const userLegacy = userDisplayName

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        profile,
        role,
        isAdmin,
        userDisplayName,
        userLegacy,
        login,
        signup,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
