/**
 * @file supabase.ts
 * @description Supabase 클라이언트 초기화 모듈
 *              (Vercel의 SUPABASE_URL 및 로컬 NEXT_PUBLIC_SUPABASE_URL 범용 호환 및 빌드 타임 안전망 적용)
 */

import { createClient } from '@supabase/supabase-js'

// 1. Vercel 환경 변수(SUPABASE_URL, PUBLIC_SUPABASE_URL) 및 Next.js 표준(NEXT_PUBLIC_SUPABASE_URL) 순차 탐색
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-anon-key'

// 빌드 타임 콘솔 경고 (런타임에서만 경고 출력)
if (
  (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL && !process.env.PUBLIC_SUPABASE_URL) ||
  (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY && !process.env.PUBLIC_SUPABASE_ANON_KEY)
) {
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    console.warn('[Supabase] Supabase URL 또는 ANON KEY가 설정되지 않아 임시 플레이스홀더를 사용합니다.')
  }
}

// 2. 브라우저 및 서버 사이드 공용 Supabase 클라이언트 인스턴스 (빌드 시 절대 크래시 발생하지 않음)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
