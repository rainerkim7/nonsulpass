/**
 * @file lib/exam-helper.ts
 * @description 대학별(홍익대, 경희대, 동국대 등) 시험 ID에 따른 문항 및 제시문, 채점기준 프리셋 반환 및 Supabase DB 동적 연동 헬퍼
 */

import { supabase } from '@/lib/supabase'
import { HONGIK_ALL_EXAMS } from '@/data/hongik-data'
import { KHU_2027_MOCK_EXAM, KHU_2027_MOCK_SOCIAL_EXAM } from '@/data/khu-data'
import { DONGGUK_2027_MOCK_EXAM } from '@/data/dongguk-data'

export interface QuestionPassage {
  badge: string
  paragraphs: string[]
}

export interface RubricItemSub {
  name: string
  desc: string
  points: string
}

export interface RubricCategoryItem {
  category: string
  subItems: RubricItemSub[]
}

export interface QuestionRubric {
  facultyWeight?: string
  totalScore: string
  items: RubricCategoryItem[]
  deductions: string[]
}

export interface QuestionData {
  id: string
  label: string
  tag: string
  title: string
  note: string
  limit: string
  placeholder: string
  passages: QuestionPassage[]
  tipTitle: string
  tipDesc: string
  modelAnswer: string
  modalTitle: string
  modalPill: string
  modalLength: string
  modalCallout: string
  rubric: QuestionRubric
}

export interface QuestionsMap {
  q1: QuestionData
  q2: QuestionData
  [key: string]: QuestionData
}

/**
 * DB에 저장된 다양한 형태의 questions 데이터(배열 또는 q1/q2 객체)를
 * 프론트엔드 표준 QuestionsMap 형태로 완벽히 정규화(Normalize)하는 헬퍼 함수
 */
export function normalizeQuestionsData(rawQuestions: any, examMeta?: any): QuestionsMap {
  if (!rawQuestions) return getQuestionsData(examMeta?.id)

  // 1. 이미 { q1: {...}, q2: {...} } 형태인 경우
  if (rawQuestions.q1 && rawQuestions.q1.passages) {
    return rawQuestions as QuestionsMap
  }

  // 2. [ {...}, {...} ] 배열 형태인 경우 (홍익대 데이터셋 또는 올인원 추출기 파싱 결과)
  if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
    const map: any = {}
    rawQuestions.forEach((q: any, idx: number) => {
      const qKey = `q${idx + 1}`
      const passages: QuestionPassage[] = (q.passages || []).map((p: any, pIdx: number) => {
        // 실제 시험지 원문 원칙: 임의의 요약 제목(title)은 절대 뱃지로 노출하지 않음
        let badge = p.badge
        if (!badge && p.id && typeof p.id === 'string' && (p.id.startsWith('[') || p.id.startsWith('제시문'))) {
          badge = p.id.startsWith('[') ? `[제시문 ${p.id.replace(/[\[\]]/g, '')}]` : p.id
        }
        if (!badge) {
          const hangulLabels = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차']
          badge = `[제시문 ${hangulLabels[pIdx] || pIdx + 1}]`
        }
        return {
          badge,
          paragraphs: Array.isArray(p.paragraphs)
            ? p.paragraphs
            : p.content
            ? p.content.split('\n\n').filter(Boolean)
            : []
        }
      })

      // 실제 시험지 원칙: 임의의 소제목(예: "[가치 있는 기록...]")을 제거하고 오직 시험지 고유 식별 번호만 유지
      let rawLabel = q.label || ''
      if (!rawLabel && q.title) {
        rawLabel = q.title.split('.')[0].replace(/【|】/g, '').trim()
      }
      if (!rawLabel) rawLabel = `문제 ${idx + 1}`
      const cleanLabel = rawLabel.replace(/\s*[\.·]?\s*\[.*?\]/g, '').trim()
      const titleNumber = cleanLabel.startsWith('【') ? cleanLabel : `【${cleanLabel.replace(/문항/g, '문제')}】`

      // 실제 출제 문제 발문 전문
      let cleanNote = q.questionText || q.note || ''
      if (!cleanNote && q.title) {
        const parts = q.title.split(/【.*?】/)
        if (parts.length > 1 && parts[1].trim()) {
          cleanNote = parts[1].trim()
        }
      }

      map[qKey] = {
        id: qKey,
        label: cleanLabel.replace(/【|】/g, '').trim(),
        tag: q.tag || examMeta?.title || `${examMeta?.year || ''} ${cleanLabel}`,
        title: titleNumber,
        note: cleanNote,
        limit: q.limit || q.targetLength || '800±100자',
        placeholder: q.placeholder || `여기에 ${cleanLabel} 답안을 작성하세요.`,
        passages: passages,
        tipTitle: q.tipTitle || '출제위원 핵심 채점 팁',
        tipDesc: q.tipDesc || q.keyArguments?.join(' · ') || '제시문의 핵심 논점을 정확히 비교·분석하고 완결된 문장으로 서술하세요.',
        modelAnswer: q.modelAnswer || '모범 답안을 준비 중입니다.',
        modalTitle: q.modalTitle || `${q.label || `문항 ${idx + 1}`} 공식 예시(모범) 답안`,
        modalPill: q.modalPill || `${examMeta?.year || ''} 문항 ${idx + 1}`,
        modalLength: q.modalLength || `${q.targetLength || q.limit || '800자 내외'} 충족`,
        modalCallout: q.modalCallout || `💡 출제 핵심 포인트: ${q.keyArguments?.slice(0, 2).join(' / ') || '핵심 논점 분석'}`,
        rubric: q.rubric || {
          facultyWeight: examMeta?.targetFaculty || examMeta?.target_faculty || '인문계열',
          totalScore: `${q.points || q.score || 50}점 만점 (정밀채점 100점 환산)`,
          items: q.scoringCriteria
            ? [
                {
                  category: '채점 기준 등급별 평가 요소',
                  subItems: (q.scoringCriteria || []).map((sc: any) => ({
                    name: `[${sc.grade}등급 (${sc.range})]`,
                    desc: sc.description,
                    points: sc.range
                  }))
                }
              ]
            : [],
          deductions: [
            '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
            '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
          ]
        }
      }
    })
    return map as QuestionsMap
  }

  return getQuestionsData(examMeta?.id)
}

/**
 * Supabase DB에서 해당 시험의 상세 정보 및 questions(문항/제시문)를 동적으로 조회
 */
export async function fetchExamQuestionsFromDb(examId: string): Promise<QuestionsMap | null> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (error || !data || !data.questions) {
      return null
    }

    return normalizeQuestionsData(data.questions, data)
  } catch (err) {
    console.warn(`[fetchExamQuestionsFromDb] DB 조회 오류 (${examId}):`, err)
    return null
  }
}

/**
 * 선택된 시험 ID에 따라 해당 시험의 문항, 제시문 및 채점기준 데이터를 반환하는 헬퍼 함수 (로컬 Fallback 프리셋)
 */
export function getQuestionsData(examId?: string): QuestionsMap {
  const targetId = examId || 'hongik-2026-humanities-real'

  // 1. 동국대학교 시험인 경우 동국대 전용 문항/제시문 데이터셋 반환
  if (targetId.startsWith('dongguk') || targetId.includes('dongguk')) {
    return DONGGUK_2027_MOCK_EXAM.questions as unknown as QuestionsMap
  }

  // 2. 경희대학교 시험인 경우 경희대 전용 문항/제시문 데이터셋 반환 (사회계열 vs 인문체육계열 분기)
  if (targetId.startsWith('khu') || targetId.includes('khu')) {
    if (targetId.includes('social') || targetId.includes('사회')) {
      return KHU_2027_MOCK_SOCIAL_EXAM.questions as unknown as QuestionsMap
    }
    return KHU_2027_MOCK_EXAM.questions as unknown as QuestionsMap
  }

  // 3. 홍익대학교 및 기타 기본 시험 데이터 매핑
  const foundExam = HONGIK_ALL_EXAMS.find((e) => e.id === targetId) || HONGIK_ALL_EXAMS[1]

  const q1Data = foundExam.questions[0]
  const hasQ2 = foundExam.questions && foundExam.questions.length > 1
  const q2Data = hasQ2 ? foundExam.questions[1] : foundExam.questions[0]

  return {
    q1: {
      id: 'q1',
      label: q1Data.title ? q1Data.title.split('.')[0].trim() : '문항 1',
      tag: `${foundExam.year} · ${foundExam.title}`,
      title: q1Data.title || `【문항 1】 ${foundExam.title}`,
      note: q1Data.questionText || '',
      limit: q1Data.targetLength || '800±100자',
      placeholder: `여기에 문항 1 답안을 작성하세요. (${q1Data.targetLength || '800자 내외'})`,
      passages: (q1Data.passages || []).map((p) => ({
        badge: p.title ? `${p.id} ${p.title}` : p.id,
        paragraphs: p.content ? p.content.split('\n\n').filter(Boolean) : []
      })),
      tipTitle: '출제위원 핵심 채점 팁',
      tipDesc: q1Data.keyArguments?.join(' · ') || '제시문의 핵심 논점을 정확히 비교·분석하고 완결된 문장으로 서술하세요.',
      modelAnswer: q1Data.modelAnswer || '모범 답안을 준비 중입니다.',
      modalTitle: `${q1Data.title || '문항 1'} 공식 예시(모범) 답안`,
      modalPill: `${foundExam.year} 문항 1`,
      modalLength: `${q1Data.targetLength || '800자 내외'} 충족`,
      modalCallout: `💡 출제 핵심 포인트: ${q1Data.keyArguments?.slice(0, 2).join(' / ') || '핵심 논점 분석'}`,
      rubric: {
        facultyWeight: foundExam.targetFaculty,
        totalScore: `${q1Data.points || 50}점 만점 (정밀채점 100점 환산)`,
        items: [
          {
            category: '채점 기준 등급별 평가 요소',
            subItems: (q1Data.scoringCriteria || []).map((sc) => ({
              name: `[${sc.grade}등급 (${sc.range})]`,
              desc: sc.description,
              points: sc.range
            }))
          },
          {
            category: '출제위원 핵심 평가 논점 및 배점 가이드',
            subItems: (q1Data.keyArguments || []).map((ka, idx) => ({
              name: `핵심 평가 영역 ${idx + 1}`,
              desc: ka,
              points: ''
            }))
          }
        ],
        deductions: [
          '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
          '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
        ]
      }
    },
    q2: {
      id: 'q2',
      label: q2Data.title ? q2Data.title.split('.')[0].trim() : '문항 2',
      tag: `${foundExam.year} · ${foundExam.title}`,
      title: q2Data.title || `【문항 2】 ${foundExam.title}`,
      note: q2Data.questionText || '',
      limit: q2Data.targetLength || '800±100자',
      placeholder: `여기에 문항 2 답안을 작성하세요. (${q2Data.targetLength || '800자 내외'})`,
      passages: (q2Data.passages || []).map((p) => ({
        badge: p.title ? `${p.id} ${p.title}` : p.id,
        paragraphs: p.content ? p.content.split('\n\n').filter(Boolean) : []
      })),
      tipTitle: '출제위원 핵심 채점 팁',
      tipDesc: q2Data.keyArguments?.join(' · ') || '제시문의 핵심 논점을 종합하고 대안적 해결 방안을 논술하세요.',
      modelAnswer: q2Data.modelAnswer || '모범 답안을 준비 중입니다.',
      modalTitle: `${q2Data.title || '문항 2'} 공식 예시(모범) 답안`,
      modalPill: `${foundExam.year} 문항 2`,
      modalLength: `${q2Data.targetLength || '800자 내외'} 충족`,
      modalCallout: `💡 출제 핵심 포인트: ${q2Data.keyArguments?.slice(0, 2).join(' / ') || '핵심 논점 분석'}`,
      rubric: {
        facultyWeight: foundExam.targetFaculty,
        totalScore: `${q2Data.points || 50}점 만점 (정밀채점 100점 환산)`,
        items: [
          {
            category: '채점 기준 등급별 평가 요소',
            subItems: (q2Data.scoringCriteria || []).map((sc) => ({
              name: `[${sc.grade}등급 (${sc.range})]`,
              desc: sc.description,
              points: sc.range
            }))
          },
          {
            category: '출제위원 핵심 평가 논점 및 배점 가이드',
            subItems: (q2Data.keyArguments || []).map((ka, idx) => ({
              name: `핵심 평가 영역 ${idx + 1}`,
              desc: ka,
              points: ''
            }))
          }
        ],
        deductions: [
          '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
          '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
        ]
      }
    }
  }
}
