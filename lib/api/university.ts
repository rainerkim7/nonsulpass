/**
 * @file university.ts
 * @description Supabase DB 기반 대학별 논술 정보 및 3개 탭 데이터 페칭 모듈
 */

import { supabase } from '@/lib/supabase'
import { HONGIK_OVERVIEW, HONGIK_TRENDS, HONGIK_RUBRIC, HONGIK_ALL_EXAMS } from '@/data/hongik-data'
import { KHU_OVERVIEW, KHU_2027_MOCK_EXAM, KHU_ALL_EXAMS } from '@/data/khu-data'
import { DONGGUK_OVERVIEW, DONGGUK_ALL_EXAMS, DONGGUK_TRENDS, DONGGUK_RUBRIC } from '@/data/dongguk-data'

export interface UniversityData {
  id: string
  name: string
  faculty: string
  examDuration: string
  totalQuestions: string
  charPerQuestion: string
  examFormat: string
  isActive: boolean
}

export interface ExamItem {
  id: string
  univId: string
  year: string
  title: string
  type: '기출문제' | '모의논술' | '예상문제'
  targetFaculty: string
  totalTime: number
  totalLength: string
  level: string
  summary: string
}

export interface TrendItem {
  questionNumber: string
  questionType: string
  examTime: string
  scoreWeight: string
  questionTemplate: string
  passageStructure: {
    base: string
    targets: string
  }
  description: string
  writingFormula: {
    step: string
    title: string
    desc: string
    charGuide: string
  }[]
  frequentThemes: string[]
}

export interface ScoringRuleItem {
  faculty: string
  chip?: string
  score: string
  subDesc: string
}

export interface RubricItem {
  category: string
  ratio: string
  desc: string
  details: string[]
}

/**
 * 대학 기본 정보 및 시험 규격 조회
 */
export async function getUniversity(univId: string): Promise<UniversityData> {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .eq('id', univId)
      .single()

    if (error || !data) {
      if (univId === 'khu') {
        return {
          id: 'khu',
          name: KHU_OVERVIEW.university,
          faculty: KHU_OVERVIEW.faculty,
          examDuration: KHU_OVERVIEW.examDuration,
          totalQuestions: KHU_OVERVIEW.totalQuestions,
          charPerQuestion: KHU_OVERVIEW.charPerQuestion,
          examFormat: KHU_OVERVIEW.examFormat,
          isActive: true,
        }
      }
      if (univId === 'dongguk') {
        return {
          id: 'dongguk',
          name: DONGGUK_OVERVIEW.university,
          faculty: DONGGUK_OVERVIEW.faculty,
          examDuration: DONGGUK_OVERVIEW.examDuration,
          totalQuestions: DONGGUK_OVERVIEW.totalQuestions,
          charPerQuestion: DONGGUK_OVERVIEW.charPerQuestion,
          examFormat: DONGGUK_OVERVIEW.examFormat,
          isActive: true,
        }
      }
      if (univId === 'hongik') {
        return {
          id: 'hongik',
          name: HONGIK_OVERVIEW.university,
          faculty: HONGIK_OVERVIEW.faculty,
          examDuration: HONGIK_OVERVIEW.examDuration,
          totalQuestions: HONGIK_OVERVIEW.totalQuestions,
          charPerQuestion: HONGIK_OVERVIEW.charPerQuestion,
          examFormat: HONGIK_OVERVIEW.examFormat,
          isActive: true,
        }
      }
      throw new Error(`대학 정보를 찾을 수 없습니다: ${univId}`)
    }

    return {
      id: data.id,
      name: data.name,
      faculty: data.faculty,
      examDuration: data.exam_duration,
      totalQuestions: data.total_questions,
      charPerQuestion: data.char_per_question,
      examFormat: data.exam_format,
      isActive: data.is_active,
    }
  } catch (err) {
    console.warn(`[getUniversity] Fallback 사용 (${univId}):`, err)
    if (univId === 'dongguk') {
      return {
        id: 'dongguk',
        name: DONGGUK_OVERVIEW.university,
        faculty: DONGGUK_OVERVIEW.faculty,
        examDuration: DONGGUK_OVERVIEW.examDuration,
        totalQuestions: DONGGUK_OVERVIEW.totalQuestions,
        charPerQuestion: DONGGUK_OVERVIEW.charPerQuestion,
        examFormat: DONGGUK_OVERVIEW.examFormat,
        isActive: true,
      }
    }
    if (univId === 'khu') {
      return {
        id: 'khu',
        name: KHU_OVERVIEW.university,
        faculty: KHU_OVERVIEW.faculty,
        examDuration: KHU_OVERVIEW.examDuration,
        totalQuestions: KHU_OVERVIEW.totalQuestions,
        charPerQuestion: KHU_OVERVIEW.charPerQuestion,
        examFormat: KHU_OVERVIEW.examFormat,
        isActive: true,
      }
    }
    return {
      id: 'hongik',
      name: HONGIK_OVERVIEW.university,
      faculty: HONGIK_OVERVIEW.faculty,
      examDuration: HONGIK_OVERVIEW.examDuration,
      totalQuestions: HONGIK_OVERVIEW.totalQuestions,
      charPerQuestion: HONGIK_OVERVIEW.charPerQuestion,
      examFormat: HONGIK_OVERVIEW.examFormat,
      isActive: true,
    }
  }
}

/**
 * 탭 1: 대학별 시험(기출/모의/예상) 목록 조회
 */
export async function getUniversityExams(univId: string): Promise<ExamItem[]> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('univ_id', univId)
      .order('year', { ascending: false })

    if (error || !data || data.length === 0) {
      if (univId === 'dongguk') {
        return DONGGUK_ALL_EXAMS.map((e) => ({
          id: e.id,
          univId: 'dongguk',
          year: e.year,
          title: e.title,
          type: e.type,
          targetFaculty: e.targetFaculty,
          totalTime: e.totalTime,
          totalLength: e.totalLength,
          level: e.level,
          summary: e.summary,
        }))
      }
      if (univId === 'khu') {
        return KHU_ALL_EXAMS.map((e) => ({
          id: e.id,
          univId: 'khu',
          year: e.year,
          title: e.title,
          type: e.type,
          targetFaculty: e.targetFaculty,
          totalTime: e.totalTime,
          totalLength: e.totalLength,
          level: e.level,
          summary: e.summary,
        }))
      }
      if (univId === 'hongik') {
        return HONGIK_ALL_EXAMS.map((e) => ({
          id: e.id,
          univId: 'hongik',
          year: e.year,
          title: e.title,
          type: e.type,
          targetFaculty: e.targetFaculty,
          totalTime: e.totalTime,
          totalLength: e.totalLength,
          level: e.level,
          summary: e.summary,
        }))
      }
      return []
    }

    return data.map((d: any) => ({
      id: d.id,
      univId: d.univ_id,
      year: String(d.year),
      title: d.title,
      type: d.type,
      targetFaculty: d.target_faculty,
      totalTime: d.total_time,
      totalLength: d.total_length,
      level: d.level,
      summary: d.summary,
    }))
  } catch (err) {
    console.warn(`[getUniversityExams] Fallback 사용 (${univId}):`, err)
    if (univId === 'dongguk') return []
    if (univId === 'khu') {
      return KHU_ALL_EXAMS.map((e) => ({
        id: e.id,
        univId: 'khu',
        year: e.year,
        title: e.title,
        type: e.type,
        targetFaculty: e.targetFaculty,
        totalTime: e.totalTime,
        totalLength: e.totalLength,
        level: e.level,
        summary: e.summary,
      }))
    }
    return HONGIK_ALL_EXAMS.map((e) => ({
      id: e.id,
      univId: 'hongik',
      year: e.year,
      title: e.title,
      type: e.type,
      targetFaculty: e.targetFaculty,
      totalTime: e.totalTime,
      totalLength: e.totalLength,
      level: e.level,
      summary: e.summary,
    }))
  }
}

/**
 * 특정 시험의 상세 정보 및 questions(문항/제시문) 단건 조회
 */
export async function getExamDetail(examId: string) {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (err) {
    console.warn(`[getExamDetail] DB 조회 오류 (${examId}):`, err)
    return null
  }
}

/**
 * 탭 2: 대학별 출제 경향 및 유형 분석 조회
 */
export async function getUniversityTrends(univId: string): Promise<TrendItem[]> {
  try {
    const { data, error } = await supabase
      .from('university_trends')
      .select('*')
      .eq('univ_id', univId)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      if (univId === 'dongguk') {
        return DONGGUK_TRENDS
      }
      if (univId === 'hongik') {
        return HONGIK_TRENDS
      }
      return []
    }

    return data.map((d: any) => ({
      questionNumber: d.question_number,
      questionType: d.question_type,
      examTime: d.exam_time,
      scoreWeight: d.score_weight,
      questionTemplate: d.question_template,
      passageStructure: d.passage_structure || { base: '', targets: '' },
      description: d.description,
      writingFormula: d.writing_formula || [],
      frequentThemes: d.frequent_themes || [],
    }))
  } catch (err) {
    console.warn(`[getUniversityTrends] Fallback 사용 (${univId}):`, err)
    if (univId === 'dongguk') return DONGGUK_TRENDS
    return HONGIK_TRENDS
  }
}

/**
 * 탭 3: 대학별 모집단위 배점 체계 및 공식 루브릭 조회
 */
export async function getUniversityRubrics(univId: string): Promise<{
  scoringRules: ScoringRuleItem[]
  rubrics: RubricItem[]
}> {
  try {
    const [rulesRes, rubricsRes] = await Promise.all([
      supabase.from('scoring_rules').select('*').eq('univ_id', univId).order('display_order', { ascending: true }),
      supabase.from('university_rubrics').select('*').eq('univ_id', univId).order('display_order', { ascending: true }),
    ])

    const scoringRules = rulesRes.data && rulesRes.data.length > 0
      ? rulesRes.data.map((r: any) => ({
          faculty: r.faculty,
          chip: r.chip,
          score: r.score,
          subDesc: r.sub_desc,
        }))
      : univId === 'dongguk'
      ? DONGGUK_OVERVIEW.scoringRules.map((s) => ({
          faculty: s.faculty,
          chip: '공통 평가',
          score: s.rule,
          subDesc: s.subDesc,
        }))
      : [
          { faculty: '사범대학 · 예술학과', chip: '인문학 집중', score: '문제 1 가중 · 60점 배점', subDesc: '국어, 문학, 윤리, 역사 제재 중심의 인문학적 독해 및 다각도 관점 대조 능력을 중점 평가합니다.' },
          { faculty: '경영대학 · 경제학부 · 법학부', chip: '사회과학 집중', score: '문제 2 가중 · 문제 1의 2배', subDesc: '경제, 법과 정치 제재의 사회적 원리를 실제 현실 쟁점에 적용하고 실효성 있는 대안을 도출하는 능력을 집중 평가합니다.' },
          { faculty: '캠퍼스자율전공 (인문)', chip: '균형 평가', score: '문제 1: 45점 / 문제 2: 55점', subDesc: '인문학적 비판 사고와 사회과학적 정책 대안 분석 역량을 고르게 종합 평가합니다.' },
        ]

    const rubrics = rubricsRes.data && rubricsRes.data.length > 0
      ? rubricsRes.data.map((rb: any) => ({
          category: rb.category,
          ratio: rb.ratio,
          desc: rb.description,
          details: rb.details || [],
        }))
      : univId === 'dongguk'
      ? DONGGUK_RUBRIC
      : HONGIK_RUBRIC

    return { scoringRules, rubrics }
  } catch (err) {
    console.warn(`[getUniversityRubrics] Fallback 사용 (${univId}):`, err)
    if (univId === 'dongguk') {
      return {
        scoringRules: DONGGUK_OVERVIEW.scoringRules.map((s) => ({
          faculty: s.faculty,
          chip: '공통 평가',
          score: s.rule,
          subDesc: s.subDesc,
        })),
        rubrics: [],
      }
    }
    return {
      scoringRules: [
        { faculty: '사범대학 · 예술학과', chip: '인문학 집중', score: '문제 1 가중 · 60점 배점', subDesc: '국어, 문학, 윤리, 역사 제재 중심의 인문학적 독해 및 다각도 관점 대조 능력을 중점 평가합니다.' },
        { faculty: '경영대학 · 경제학부 · 법학부', chip: '사회과학 집중', score: '문제 2 가중 · 문제 1의 2배', subDesc: '경제, 법과 정치 제재의 사회적 원리를 실제 현실 쟁점에 적용하고 실효성 있는 대안을 도출하는 능력을 집중 평가합니다.' },
        { faculty: '캠퍼스자율전공 (인문)', chip: '균형 평가', score: '문제 1: 45점 / 문제 2: 55점', subDesc: '인문학적 비판 사고와 사회과학적 정책 대안 분석 역량을 고르게 종합 평가합니다.' },
      ],
      rubrics: HONGIK_RUBRIC,
    }
  }
}
