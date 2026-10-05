/**
 * @file supabase.ts
 * @description Supabase 클라이언트 초기화 모듈
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.')
}

// 브라우저 및 서버 사이드 공용 Supabase 클라이언트 인스턴스
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
