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
  high_school_region?: string
  target_university?: string
  role: UserRole
}

export const MAX_TARGET_UNIVERSITIES = 6

/**
 * profiles.target_university 문자열(단일 대학명 또는 JSON 배열)을 최대 6개 배열로 안전하게 파싱
 */
export function parseTargetUniversities(raw?: string | null): string[] {
  if (!raw || raw === '미정') return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, MAX_TARGET_UNIVERSITIES)
      }
    } catch {
      // JSON 파싱 실패 시 단일 문자열 폴백
    }
  }
  return [trimmed]
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
  // 목표 대학 목록 (최대 6개) 및 업데이트 함수
  targetUniversities: string[]
  updateTargetUniversities: (universities: string[]) => Promise<boolean>
  updateProfile: (params: {
    name: string
    highSchoolRegion: string
    newPassword?: string
  }) => Promise<{ error: string | null }>
  login: (email: string, password: string) => Promise<{ error: string | null }>
  signup: (email: string, password: string, name: string, highSchoolRegion?: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  // 인증 모달 제어
  isAuthModalOpen: boolean
  authModalMode: 'login' | 'signup'
  allowSignup: boolean
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
  // 개인정보 수정 모달 제어
  isProfileModalOpen: boolean
  openProfileModal: () => void
  closeProfileModal: () => void
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
  targetUniversities: [],
  updateTargetUniversities: async () => false,
  updateProfile: async () => ({ error: null }),
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: async () => {},
  isAuthModalOpen: false,
  authModalMode: 'login',
  allowSignup: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isProfileModalOpen: false,
  openProfileModal: () => {},
  closeProfileModal: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 로그인 / 회원가입 전역 팝업 모달 상태 및 회원가입 허용 정책 상태
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')
  const [allowSignup, setAllowSignup] = useState<boolean>(false)
  // 개인정보 수정 모달 상태
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false)

  // 관리자 운영 정책에서 신규 회원가입 허용 여부(allowSignup) 실시간 조회
  const fetchSignupPolicy = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/grading-policy', { cache: 'no-store' })
      const data = await res.json()
      const allowed = Boolean(data?.policy?.allowSignup)
      setAllowSignup(allowed)
      return allowed
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    fetchSignupPolicy()
  }, [fetchSignupPolicy])

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
          high_school_region: '서울특별시',
          target_university: '미정',
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

  // 2. 이메일 / 비밀번호 회원가입 (관리자 정책상 회원가입 중단 상태일 경우 원천 차단)
  const signup = async (
    email: string,
    password: string,
    name: string,
    highSchoolRegion?: string
  ): Promise<{ error: string | null }> => {
    try {
      // 실행 직전 최신 정책 재확인하여 차단 상태에서의 우회 가입 방지
      const isAllowed = await fetchSignupPolicy()
      if (!isAllowed) {
        return { error: '현재 개발 테스트 기간으로 신규 회원가입이 일시 중단되어 있습니다.' }
      }

      const cleanEmail = email.trim()
      const cleanName = name.trim() || '수험생'
      const cleanRegion = highSchoolRegion || '서울특별시'

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            name: cleanName,
            high_school_region: cleanRegion,
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
            high_school_region: cleanRegion,
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

  // 4. 목표 대학 목록(최대 6개) 저장 및 로컬 프로필 즉시 동기화
  const updateTargetUniversities = async (universities: string[]): Promise<boolean> => {
    if (!user) return false
    try {
      const cleaned = Array.from(new Set(universities.filter(Boolean))).slice(0, MAX_TARGET_UNIVERSITIES)
      const serialized = JSON.stringify(cleaned)

      const { error } = await supabase
        .from('profiles')
        .update({ target_university: serialized })
        .eq('id', user.id)

      if (error) {
        console.error('[AuthProvider] 목표 대학 저장 오류:', error.message)
        return false
      }

      setProfile((prev) =>
        prev
          ? { ...prev, target_university: serialized }
          : {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email?.split('@')[0] || '수험생',
              target_university: serialized,
              role: 'user',
            }
      )
      return true
    } catch (err) {
      console.error('[AuthProvider] 목표 대학 저장 예외:', err)
      return false
    }
  }

  // 5. 개인정보(이름, 고등학교 소재 지역, 비밀번호) 수정
  const updateProfile = async ({
    name,
    highSchoolRegion,
    newPassword,
  }: {
    name: string
    highSchoolRegion: string
    newPassword?: string
  }): Promise<{ error: string | null }> => {
    if (!user) return { error: '로그인 상태가 아닙니다.' }
    try {
      const cleanName = name.trim()
      if (!cleanName) return { error: '이름을 입력해 주세요.' }
      const cleanRegion = highSchoolRegion || '서울특별시'

      // (1) Supabase Auth 메타데이터 및 비밀번호(입력 시) 업데이트
      const authPayload: {
        data: { name: string; high_school_region: string }
        password?: string
      } = {
        data: {
          name: cleanName,
          high_school_region: cleanRegion,
        },
      }
      if (newPassword && newPassword.trim().length > 0) {
        authPayload.password = newPassword.trim()
      }

      const { data: authData, error: authError } = await supabase.auth.updateUser(authPayload)
      if (authError) {
        return { error: authError.message }
      }
      if (authData?.user) {
        setUser(authData.user)
      }

      // (2) profiles 테이블 동기화
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          name: cleanName,
          high_school_region: cleanRegion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (dbError) {
        return { error: dbError.message }
      }

      setProfile((prev) =>
        prev
          ? { ...prev, name: cleanName, high_school_region: cleanRegion }
          : {
              id: user.id,
              email: user.email || '',
              name: cleanName,
              high_school_region: cleanRegion,
              role: user.email?.includes('admin') ? 'admin' : 'user',
            }
      )

      return { error: null }
    } catch (err: any) {
      return { error: err.message || '개인정보 수정 중 오류가 발생했습니다.' }
    }
  }

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
    // 모달 오픈 시 최신 회원가입 허용 정책 동기화
    fetchSignupPolicy()
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const openProfileModal = () => {
    setIsProfileModalOpen(true)
  }

  const closeProfileModal = () => {
    setIsProfileModalOpen(false)
  }

  const isAuthenticated = !!user
  const role: UserRole = profile?.role || (user?.email?.includes('admin') ? 'admin' : 'user')
  const isAdmin = role === 'admin'
  const userDisplayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '수험생'
  const userLegacy = userDisplayName
  const targetUniversities = parseTargetUniversities(profile?.target_university)

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
        targetUniversities,
        updateTargetUniversities,
        updateProfile,
        login,
        signup,
        logout,
        isAuthModalOpen,
        authModalMode,
        allowSignup,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
