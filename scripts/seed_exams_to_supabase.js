/**
 * @file scripts/seed_exams_to_supabase.js
 * @description 로컬 data/ 폴더의 시험 문항 및 제시문 전체(홍익대 6개년, 경희대, 동국대)를 
 *              Supabase DB public.exams 테이블의 questions (JSONB) 컬럼으로 일괄 마이그레이션(Seed)하는 스크립트
 */

const fs = require('fs')
const path = require('path')

// 1. .env.local 환경 변수 로드
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=')
      if (k && v) process.env[k.trim()] = v.join('=').trim()
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL 또는 ANON KEY를 찾을 수 없습니다.')
  process.exit(1)
}

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('==================================================================')
  console.log('🚀 [논술패스 Lab] Supabase DB 시험 문제(questions) 일괄 마이그레이션 시작')
  console.log('==================================================================\n')

  // 1. DB의 exams 테이블에 questions 컬럼이 존재하는지 사전 점검
  const { error: testColErr } = await supabase
    .from('exams')
    .select('id, questions')
    .limit(1)

  if (testColErr && testColErr.message?.includes('questions')) {
    console.warn('⚠️ [주의] Supabase DB의 exams 테이블에 아직 "questions" 컬럼이 생성되지 않았습니다.')
    console.warn('👉 Supabase 대시보드(https://supabase.com) -> SQL Editor에서 아래 쿼리 1줄을 실행해 주세요:\n')
    console.log('   ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS questions JSONB;\n')
    console.log('   (또는 프로젝트의 supabase/add_questions_column.sql 내용 실행)')
    console.log('------------------------------------------------------------------')
    console.log('위 SQL 실행 후 이 스크립트를 다시 실행하시면 모든 문항과 제시문이 즉시 DB에 적재됩니다.\n')
    return
  }

  console.log('✅ Supabase "questions" 컬럼 감지 완료. 시험 데이터 로딩 중...\n')

  // 2. 각 대학별 로컬 데이터 로드
  // TS 파일을 직접 컴파일하지 않고 data 파일 내의 객체를 추출하기 위해 dynamic require 또는 JSON 변환 파싱
  const hongikExamsPath = path.resolve(__dirname, '../data/hongik-exams.ts')
  const khuDataPath = path.resolve(__dirname, '../data/khu-data.ts')
  const donggukDataPath = path.resolve(__dirname, '../data/dongguk-data.ts')

  let updatedCount = 0

  // (1) 홍익대학교 6개년 시험지 마이그레이션
  try {
    const hongikRaw = fs.readFileSync(hongikExamsPath, 'utf8')
    const match = hongikRaw.match(/export const HONGIK_ALL_EXAMS: HongikExamDetail\[\] = (\[[\s\S]*\]);?\s*$/)
    if (match && match[1]) {
      // JSON 호환 정리 후 파싱
      const cleaned = match[1]
        .replace(/\/\/.*$/gm, '') // 주석 제거
        .replace(/,\s*([\]}])/g, '$1') // trailing comma 제거
      const hongikExams = eval(cleaned)

      console.log(`📌 [홍익대학교] 총 ${hongikExams.length}개 시험지 데이터베이스 업서트 진행...`)
      for (const ex of hongikExams) {
        const { error } = await supabase
          .from('exams')
          .upsert({
            id: ex.id,
            univ_id: 'hongik',
            year: ex.year,
            title: ex.title,
            type: ex.type,
            target_faculty: ex.targetFaculty || '인문계열 (공통)',
            total_time: ex.totalTime || 120,
            total_length: ex.totalLength || '각 문항당 800±100자',
            level: ex.level || '대학 공식 출제',
            summary: ex.summary || '',
            questions: ex.questions || []
          })

        if (error) {
          console.error(`   ❌ [${ex.title}] 저장 오류:`, error.message)
        } else {
          console.log(`   ✅ [${ex.year}] ${ex.title} (문항 ${ex.questions?.length}개) -> DB 저장 완료`)
          updatedCount++
        }
      }
    }
  } catch (err) {
    console.error('❌ 홍익대 데이터 마이그레이션 실패:', err.message)
  }

  // (2) 경희대학교 시험지 마이그레이션
  try {
    console.log(`\n📌 [경희대학교] 모의논술 2개 시험지 업서트 진행...`)
    // 경희대 모의논술 데이터 추출
    const khuRaw = fs.readFileSync(khuDataPath, 'utf8')
    
    // khu-2027-1664 (인문체육)
    const khuHumanMatch = khuRaw.match(/export const KHU_2027_MOCK_EXAM = (\{[\s\S]*?\n\};?\n)/)
    if (khuHumanMatch && khuHumanMatch[1]) {
      const khuHuman = eval('(' + khuHumanMatch[1].replace(/as const/g, '').replace(/,\s*([\]}])/g, '$1') + ')')
      const { error } = await supabase.from('exams').upsert({
        id: khuHuman.id || 'khu-2027-1664',
        univ_id: 'khu',
        year: khuHuman.year,
        title: khuHuman.title,
        type: khuHuman.type,
        target_faculty: khuHuman.targetFaculty || '인문·체육계열',
        total_time: khuHuman.totalTime || 120,
        total_length: khuHuman.totalLength || '총 2,000자',
        level: khuHuman.level || '대학 공식 출제',
        summary: khuHuman.summary || '',
        questions: khuHuman.questions || {}
      })
      if (!error) {
        console.log(`   ✅ [${khuHuman.year}] ${khuHuman.title} -> DB 저장 완료`)
        updatedCount++
      }
    }

    // khu-2027-mock-social (사회계열)
    const khuSocialMatch = khuRaw.match(/export const KHU_2027_MOCK_SOCIAL_EXAM = (\{[\s\S]*?\n\};?\n)/)
    if (khuSocialMatch && khuSocialMatch[1]) {
      const khuSocial = eval('(' + khuSocialMatch[1].replace(/as const/g, '').replace(/,\s*([\]}])/g, '$1') + ')')
      const { error } = await supabase.from('exams').upsert({
        id: khuSocial.id || 'khu-2027-mock-social',
        univ_id: 'khu',
        year: khuSocial.year,
        title: khuSocial.title,
        type: khuSocial.type,
        target_faculty: khuSocial.targetFaculty || '사회계열',
        total_time: khuSocial.totalTime || 120,
        total_length: khuSocial.totalLength || '총 1,200자',
        level: khuSocial.level || '대학 공식 출제',
        summary: khuSocial.summary || '',
        questions: khuSocial.questions || {}
      })
      if (!error) {
        console.log(`   ✅ [${khuSocial.year}] ${khuSocial.title} -> DB 저장 완료`)
        updatedCount++
      }
    }
  } catch (err) {
    console.error('❌ 경희대 데이터 마이그레이션 실패:', err.message)
  }

  // (3) 동국대학교 시험지 마이그레이션
  try {
    console.log(`\n📌 [동국대학교] 모의논술 1개 시험지 업서트 진행...`)
    const donggukRaw = fs.readFileSync(donggukDataPath, 'utf8')
    const donggukMatch = donggukRaw.match(/export const DONGGUK_2027_MOCK_EXAM = (\{[\s\S]*?\n\};?\n)/)
    if (donggukMatch && donggukMatch[1]) {
      const donggukMock = eval('(' + donggukMatch[1].replace(/as const/g, '').replace(/,\s*([\]}])/g, '$1') + ')')
      const { error } = await supabase.from('exams').upsert({
        id: donggukMock.id || 'dongguk-2027-mock',
        univ_id: 'dongguk',
        year: donggukMock.year,
        title: donggukMock.title,
        type: donggukMock.type,
        target_faculty: donggukMock.targetFaculty || '인문계열 (공통)',
        total_time: donggukMock.totalTime || 100,
        total_length: donggukMock.totalLength || '총 3문항 1,500자',
        level: donggukMock.level || '대학 공식 출제',
        summary: donggukMock.summary || '',
        questions: donggukMock.questions || {}
      })
      if (!error) {
        console.log(`   ✅ [${donggukMock.year}] ${donggukMock.title} -> DB 저장 완료`)
        updatedCount++
      }
    }
  } catch (err) {
    console.error('❌ 동국대 데이터 마이그레이션 실패:', err.message)
  }

  console.log('\n==================================================================')
  console.log(`🎉 [마이그레이션 성공] 총 ${updatedCount}개 시험지의 문항 및 제시문 전문이 Supabase DB에 적재되었습니다!`)
  console.log('==================================================================\n')
}

runMigration()
