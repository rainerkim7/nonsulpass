'use client'

/**
 * @file components/univ/UniversityDetailPage.tsx
 * @description 대학별 논술 전용 상세 페이지 컴포넌트 (홍익대, 경희대, 동국대 등 동적 DB 연동 및 3대 탭)
 */

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Sliders,
  ArrowLeft,
  FileText,
  TrendingUp,
  ClipboardList,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import Brand from '@/components/common/Brand'
import { HONGIK_OVERVIEW, HONGIK_ALL_EXAMS, HONGIK_TRENDS, HONGIK_RUBRIC } from '@/data/hongik-data'
import { KHU_OVERVIEW, KHU_ALL_EXAMS } from '@/data/khu-data'
import { DONGGUK_OVERVIEW, DONGGUK_ALL_EXAMS, DONGGUK_TRENDS, DONGGUK_RUBRIC } from '@/data/dongguk-data'
import { UNIVERSITY_EXAM_TRACKS } from '@/lib/constants/universities'
import {
  getUniversity,
  getUniversityExams,
  getUniversityTrends,
  getUniversityRubrics,
  type ScoringRuleItem,
  type RubricItem,
  type TrendItem
} from '@/lib/api/university'

interface UniversityDetailPageProps {
  univId?: string
  onBack: () => void
  onStartExam: (univName?: string, examId?: string, questionId?: 'q1' | 'q2') => void
}

export default function UniversityDetailPage({
  univId = 'hongik',
  onBack,
  onStartExam,
}: UniversityDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'exams' | 'trends' | 'rubric'>('exams')
  const [filter, setFilter] = useState<'past' | 'mock' | 'expected'>('past')

  const isKhu = univId === 'khu'
  const isDongguk = univId === 'dongguk'
  const defaultOverview = isDongguk ? DONGGUK_OVERVIEW : isKhu ? KHU_OVERVIEW : HONGIK_OVERVIEW

  // Supabase DB 비동기 데이터 상태
  const [overview, setOverview] = useState(defaultOverview)
  const [exams, setExams] = useState<any[]>(isDongguk ? DONGGUK_ALL_EXAMS : isKhu ? KHU_ALL_EXAMS : HONGIK_ALL_EXAMS)
  const [trends, setTrends] = useState<TrendItem[]>(isDongguk ? DONGGUK_TRENDS : isKhu ? [] : HONGIK_TRENDS)
  const [scoringRules, setScoringRules] = useState<ScoringRuleItem[]>(
    isDongguk
      ? DONGGUK_OVERVIEW.scoringRules.map((s) => ({
          faculty: s.faculty,
          chip: '공통 평가',
          score: s.rule,
          subDesc: s.subDesc,
        }))
      : isKhu
      ? [
          { faculty: '인문·체육계열 논제 I', chip: '관점 적용형', score: '100점 (기본 60점)', subDesc: '관점의 정확한 파악과 문학 작품에 대한 창의적 적용력 중심 평가' },
          { faculty: '인문·체육계열 논제 II', chip: '분류 및 비판형', score: '100점 (기본 60점)', subDesc: '정확한 이분법적 분류와 상대 입장에 대한 논리적 비판 강도 평가' },
          { faculty: '사회계열 논제 I & II', chip: '수리 및 정책 평가', score: '100점 (수리 40점)', subDesc: '확률·통계 계산 및 사회현상 분석을 통한 최적 대안 도출 능력 평가' },
        ]
      : [
          { faculty: '사범대학 · 예술학과', chip: '인문학 집중', score: '문제 1 가중 · 60점 배점', subDesc: '국어, 문학, 윤리, 역사 제재 중심의 인문학적 독해 및 다각도 관점 대조 능력을 중점 평가합니다.' },
          { faculty: '경영대학 · 경제학부 · 법학부', chip: '사회과학 집중', score: '문제 2 가중 · 문제 1의 2배', subDesc: '경제, 법과 정치 제재의 사회적 원리를 실제 현실 쟁점에 적용하고 실효성 있는 대안을 도출하는 능력을 집중 평가합니다.' },
          { faculty: '캠퍼스자율전공 (인문)', chip: '균형 평가', score: '문제 1: 45점 / 문제 2: 55점', subDesc: '인문학적 비판 사고와 사회과학적 정책 대안 분석 역량을 고르게 종합 평가합니다.' },
        ]
  )
  const [rubrics, setRubrics] = useState<RubricItem[]>(isDongguk ? DONGGUK_RUBRIC : isKhu ? [] : HONGIK_RUBRIC)

  // 동적 계열 목록 추출: 실제 출제 문제지(시험 트랙) 기준 표준 프리셋 최우선 적용
  const availableFaculties = useMemo(() => {
    // 1) 등록된 서울 주요 대학 표준 출제 트랙 프리셋이 있는 경우 최우선 적용 (단일형 vs 분리형)
    if (UNIVERSITY_EXAM_TRACKS[univId]) {
      return UNIVERSITY_EXAM_TRACKS[univId]
    }
    // 2) 프리셋이 등록되지 않은 신규 대학의 경우 수집된 데이터 기반 동적 추출
    const list: string[] = []
    exams.forEach((e: any) => {
      const fac = e.targetFaculty || e.target_faculty
      if (fac && !list.includes(fac)) {
        list.push(fac)
      }
    })
    trends.forEach((t: any) => {
      const fac = t.passageStructure?.faculty || t.faculty
      if (fac && !list.includes(fac)) {
        list.push(fac)
      }
    })
    return list.length > 0 ? Array.from(new Set(list)) : ['인문계열 (공통)']
  }, [univId, exams, trends])

  const [selectedFacultyTab, setSelectedFacultyTab] = useState<string>(
    UNIVERSITY_EXAM_TRACKS[univId]?.[0] || ''
  )

  useEffect(() => {
    if (availableFaculties.length > 0 && (!selectedFacultyTab || !availableFaculties.includes(selectedFacultyTab))) {
      setSelectedFacultyTab(availableFaculties[0])
    }
  }, [availableFaculties, selectedFacultyTab])

  // Supabase DB에서 최신 데이터 비동기 동기화
  useEffect(() => {
    let isMounted = true
    async function fetchDbData() {
      try {
        const [univData, examsData, trendsData, rubricsData] = await Promise.all([
          getUniversity(univId),
          getUniversityExams(univId),
          getUniversityTrends(univId),
          getUniversityRubrics(univId),
        ])
        if (isMounted) {
          if (univData) {
            setOverview((prev) => ({
              ...prev,
              university: univData.name,
              faculty: univData.faculty,
              examDuration: univData.examDuration,
              totalQuestions: univData.totalQuestions,
              charPerQuestion: univData.charPerQuestion,
              examFormat: univData.examFormat,
            }))
          }
          if (examsData && examsData.length > 0) {
            setExams(examsData as any)
          }
          if (trendsData && trendsData.length > 0) {
            setTrends(trendsData as any)
          }
          if (rubricsData) {
            if (rubricsData.scoringRules && rubricsData.scoringRules.length > 0) {
              setScoringRules(rubricsData.scoringRules)
            }
            if (rubricsData.rubrics && rubricsData.rubrics.length > 0) {
              setRubrics(rubricsData.rubrics)
            }
          }
        }
      } catch (err) {
        console.warn(`[UniversityDetailPage] DB 데이터 조회 중 오류 (${univId}):`, err)
      }
    }
    fetchDbData()
    return () => {
      isMounted = false
    }
  }, [univId])

  // 선택된 계열에 해당하는 시험 목록 필터링
  const facultyExams = useMemo(() => {
    if (availableFaculties.length <= 1 || !selectedFacultyTab) return exams
    return exams.filter((item: any) => {
      const fac = item.targetFaculty || item.target_faculty
      if (!fac) return true
      return fac === selectedFacultyTab || fac.includes(selectedFacultyTab) || selectedFacultyTab.includes(fac)
    })
  }, [exams, selectedFacultyTab, availableFaculties.length])

  const expectedCount = facultyExams.filter((e: any) => e.type === '예상문제').length

  const filteredExams = facultyExams.filter((item: any) => {
    if (filter === 'past') return item.type === '기출문제'
    if (filter === 'mock') return item.type === '모의논술'
    return item.type === '예상문제'
  })

  // 출제 경향 계열 필터링
  const displayedTrends = useMemo(() => {
    if (!selectedFacultyTab || availableFaculties.length <= 1) return trends
    const matched = trends.filter((t: any) => {
      const fac = t.passageStructure?.faculty || t.faculty
      if (!fac) return true
      return fac === selectedFacultyTab || fac.includes(selectedFacultyTab) || selectedFacultyTab.includes(fac)
    })
    return matched.length > 0 ? matched : trends
  }, [trends, selectedFacultyTab, availableFaculties.length])

  // 채점 기준 배점 체계 계열 필터링
  const displayedRules = useMemo(() => {
    if (!selectedFacultyTab || availableFaculties.length <= 1) return scoringRules
    const matched = scoringRules.filter((r: any) => {
      return !r.faculty || r.faculty.includes(selectedFacultyTab) || selectedFacultyTab.includes(r.faculty)
    })
    return matched.length > 0 ? matched : scoringRules
  }, [scoringRules, selectedFacultyTab, availableFaculties.length])

  // 루브릭 기준 계열 필터링
  const displayedRubrics = useMemo(() => {
    if (!selectedFacultyTab || availableFaculties.length <= 1) return rubrics
    const matched = rubrics.filter((rub: any) => {
      if (!rub.category) return true
      if (rub.category.includes('[') && rub.category.includes(']')) {
        return rub.category.includes(selectedFacultyTab)
      }
      return true
    })
    return matched.length > 0 ? matched : rubrics
  }, [rubrics, selectedFacultyTab, availableFaculties.length])

  return (
    <main className="univ-detail-shell">
      {/* 상단 내비게이션 바 */}
      <header className="univ-detail-nav">
        <Brand onHome={onBack} />
        <div className="flex items-center gap-3">
          <Link
            href={`/admin?univ=${univId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
            title={`${overview.university} 관리자 콘솔로 이동`}
          >
            <Sliders className="w-3.5 h-3.5" />
            관리자 콘솔
          </Link>
          <button type="button" className="univ-back-btn" onClick={onBack}>
            <ArrowLeft /> 메인 화면으로 돌아가기
          </button>
        </div>
      </header>

      {/* 대학 논술 히어로 배너 */}
      <section className="univ-hero-banner">
        <div className="univ-hero-inner">
          <div className="univ-hero-title-area">
            <span className="univ-hero-pill">
              <GraduationCap className="w-3.5 h-3.5" /> 2027학년도 대입 수시 논술 대비
            </span>
            <h1>
              <span>{overview.university}</span> {selectedFacultyTab ? `${selectedFacultyTab} ` : (overview.faculty.includes('인문') ? '인문계열 ' : '')}논술 완벽 분석
            </h1>
            <p>
              {overview.university} 출제위원회의 공식 평가 가이드라인에 기반한 문항별 출제 패턴,
              핵심 감점 방지 팁 및 최근 기출·실전 모의논술을 한눈에 확인하세요.
            </p>
          </div>
        </div>
      </section>

      {/* 대학별 세부 모집 계열 전환 바 (2개 이상 계열 보유 시 노출) */}
      {availableFaculties.length > 1 && (
        <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 sticky top-[57px] z-30 shadow-md">
          <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                모집 계열:
              </span>
              <div className="inline-flex p-1 bg-slate-800/90 rounded-xl border border-slate-700/70 shadow-inner gap-1">
                {availableFaculties.map((fac) => {
                  const isSelected = selectedFacultyTab === fac
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => setSelectedFacultyTab(fac)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      }`}
                    >
                      {fac}
                    </button>
                  )
                })}
              </div>
            </div>
            <span className="text-[11.5px] text-slate-400">
              💡 <strong className="text-blue-400">{selectedFacultyTab}</strong> 전용 문항 구조 · 채점 기준이 적용 중입니다.
            </span>
          </div>
        </div>
      )}

      {/* 대학 상세 페이지 서브 탭 네비게이션 */}
      <div className="univ-subnav-bar">
        <div className="univ-subnav-inner">
          <button
            type="button"
            className={`univ-subnav-item ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            <FileText className="w-4 h-4" />
            <span>기출·모의고사 응시</span>
            <span className="univ-subnav-badge">{facultyExams.length}</span>
          </button>
          <button
            type="button"
            className={`univ-subnav-item ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <TrendingUp className="w-4 h-4" />
            <span>출제 경향 및 유형 분석</span>
          </button>
          <button
            type="button"
            className={`univ-subnav-item ${activeTab === 'rubric' ? 'active' : ''}`}
            onClick={() => setActiveTab('rubric')}
          >
            <ClipboardList className="w-4 h-4" />
            <span>채점 기준 및 배점 체계</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 기출·모의고사 응시 (기본 화면) */}
      {activeTab === 'exams' && (
        <>
          {/* 논술 기본 규격 요약 스트립 */}
          <div className="univ-overview-strip">
            <div className="univ-overview-grid">
              <div className="overview-cell">
                <span className="overview-label">시험 시간</span>
                <span className="overview-val">{overview.examDuration}</span>
                <span className="overview-sub">{selectedFacultyTab || overview.faculty}</span>
              </div>
              <div className="overview-cell">
                <span className="overview-label">답안 분량</span>
                <span className="overview-val">{overview.charPerQuestion}</span>
                <span className="overview-sub">
                  글자 수 규정 엄수 <span className="overview-sub-warn">(감점 주의)</span>
                </span>
              </div>
              <div className="overview-cell">
                <span className="overview-label">제시문 구성</span>
                <span className="overview-val">{overview.totalQuestions}</span>
                <span className="overview-sub">{isKhu ? (selectedFacultyTab === '사회계열' ? '논제 I [가]~[마] / 논제 II(수리)' : '논제 I [가]~[다] / 논제 II [라]~[사]') : '1번 (가)~(라) / 2번 (마)~(아)'}</span>
              </div>
              <div className="overview-cell">
                <span className="overview-label">답안 형식</span>
                <span className="overview-val">{overview.examFormat}</span>
                <span className="overview-sub">서론-본론-결론의 유기적 구성</span>
              </div>
            </div>
          </div>

          <div className="univ-content-shell">
            {/* 논술 기출 문제 및 모의 논술 문제 리스트 */}
            <section className="univ-section-block">
              <div className="univ-block-head">
                <div>
                  <h2><FileText className="w-5 h-5 text-blue-600" /> 논술 기출 문제 및 모의 논술 문제</h2>
                </div>
              </div>

              <div className="exam-filter-row">
                <div className="filter-tabs-group">
                  <div className="filter-tabs">
                    <button
                      type="button"
                      className={filter === 'past' ? 'active' : ''}
                      onClick={() => setFilter('past')}
                    >
                      기출문제 ({facultyExams.filter((e: any) => e.type === '기출문제').length})
                    </button>
                    <button
                      type="button"
                      className={filter === 'mock' ? 'active' : ''}
                      onClick={() => setFilter('mock')}
                    >
                      모의논술 ({facultyExams.filter((e: any) => e.type === '모의논술').length})
                    </button>
                  </div>

                  {/* 우측에 독립적으로 배치된 예상문제 버튼 */}
                  <button
                    type="button"
                    className={`filter-btn-expected ${filter === 'expected' ? 'active' : ''}`}
                    onClick={() => setFilter('expected')}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    예상문제 ({expectedCount})
                  </button>
                </div>
              </div>

              <div className="problem-list-container">
                {filteredExams.length === 0 ? (
                  <div className="problem-empty-state">
                    <Sparkles className="w-8 h-8 text-indigo-400 mb-2" />
                    <h4>등록된 {filter === 'expected' ? '실전 예상문제' : '문제'}가 아직 없습니다</h4>
                    <p>출제위원 AI 및 교수진의 최근 출제 경향을 반영한 실전 예상문제가 곧 리스트에 추가됩니다.</p>
                  </div>
                ) : (
                  filteredExams.map((exam: any) => (
                    <button
                      key={exam.id}
                      type="button"
                      className="problem-row"
                      onClick={() => onStartExam(overview.university, exam.id)}
                    >
                      <span className="problem-main">
                        <strong>{exam.title}</strong>
                        <span className="summary-snippet">📌 {exam.summary}</span>
                      </span>
                      <div className="problem-side-meta">
                        <ChevronRight className="w-4 h-4 problem-arrow" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* 탭 2: 출제 경향 및 유형 분석 */}
      {activeTab === 'trends' && (
        <div className="univ-content-shell">
          <section className="univ-section-block">
            <div className="univ-block-head" style={{ paddingBottom: '20px', marginBottom: '28px' }}>
              <div>
                <h2 style={{ marginBottom: '22px' }}>
                  <BookOpen className="w-5 h-5 text-blue-600" /> {overview.university} {selectedFacultyTab ? `[${selectedFacultyTab}] ` : ''}논술 출제 형식 및 유형별 경향 총괄 분석
                </h2>
                <p style={{ fontSize: '15.5px', marginTop: '0px', lineHeight: '1.6', color: '#475569', fontWeight: 500 }}>
                  {overview.university} 공식 출제 자료 및 선행학습 영향평가서를 정밀 분석하여 체계화한 핵심 출제 유형입니다.
                </p>
              </div>
            </div>
            <div className="trend-card-grid">
              {displayedTrends.length === 0 ? (
                <div
                  className="problem-empty-state"
                  style={{
                    gridColumn: '1 / -1',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <BookOpen className="w-8 h-8 text-slate-400 mb-2" />
                  <h4>등록된 출제 경향 및 유형 분석 데이터가 없습니다</h4>
                  <p>
                    관리자 페이지에서 {overview.university} 출제 자료 및 선행학습 영향평가서를 등록하면 문항 분석과 고득점 작성 공식이 자동으로 제공됩니다.
                  </p>
                </div>
              ) : (
                displayedTrends.map((trend: any, idx: number) => (
                  <div key={idx} className="trend-card">
                    <div className="trend-card-header">
                      <span className="trend-q-tag">{trend.questionNumber}</span>
                      <span className="trend-weight">{trend.examTime}</span>
                    </div>
                    <h3 className="text-[17.5px] font-extrabold text-slate-900 mb-1">{trend.questionType}</h3>
                    <div className="text-[14px] text-blue-700 font-bold mb-3.5">
                      ⚖️ 배점 가중: {trend.scoreWeight}
                    </div>

                    {/* 1. 전형적 발문 출제 공식 (문제 형식) */}
                    <div className="mb-3.5 p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-lg">
                      <span className="text-[14px] font-bold text-blue-900 block mb-2">
                        📋 전형적 문제 출제 공식 (발문 형식):
                      </span>
                      <p className="trend-template-text text-[14.5px] text-blue-950 font-medium leading-[1.7] bg-white p-3 rounded-lg border border-blue-100/80">
                        {trend.questionTemplate}
                      </p>
                    </div>

                    {/* 2. 제시문 구성 체계 */}
                    <div className="mb-3.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="text-[14px] font-bold text-slate-900 block">
                        🧩 제시문 구성 체계:
                      </span>
                      <p className="trend-passage-item text-[14px] text-slate-800 font-medium leading-relaxed pl-3 border-l-2 border-blue-500">
                        {trend.passageStructure?.base || ''}
                      </p>
                      <p className="trend-passage-item text-[14px] text-slate-800 font-medium leading-relaxed pl-3 border-l-2 border-amber-500">
                        {trend.passageStructure?.targets || ''}
                      </p>
                    </div>

                    {/* 3. 일반적 출제 경향 설명 */}
                    <p className="trend-desc">{trend.description}</p>

                    {/* 4. 고득점 3단계 작성 공식 */}
                    <div className="my-3.5">
                      <span className="text-[14px] font-bold text-slate-900 block mb-2.5">
                        ✍️ 고득점 3단계 작성 공식 & 분량 가이드:
                      </span>
                      <div className="space-y-2">
                        {(trend.writingFormula || []).map((f: any, fIdx: number) => (
                          <div key={fIdx} className="p-3 bg-white border border-slate-200 rounded-md shadow-xs">
                            <div className="flex items-center justify-between text-[14px] mb-1.5">
                              <strong className="trend-formula-title text-blue-700 font-bold">{f.step}: {f.title}</strong>
                              <span className="trend-char-guide text-[12.5px] text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded">{f.charGuide}</span>
                            </div>
                            <p className="trend-formula-desc text-[14px] text-slate-700 font-medium leading-relaxed">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 빈출 주제 키워드 */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                      <span className="text-[13.5px] font-bold text-slate-700 block mb-2">
                        💡 대표 빈출 핵심 개념:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(trend.frequentThemes || []).map((theme: any, tIdx: number) => (
                          <span key={tIdx} className="text-[13px] bg-slate-100 text-slate-800 px-3 py-1 rounded-full font-semibold">
                            #{theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* 탭 3: 채점 기준 및 배점 체계 */}
      {activeTab === 'rubric' && (
        <>
          {/* 대학별 수시 모집단위별 문항 배점 가중치 카드 섹션 */}
          <section className="scoring-rules-wrap" style={{ margin: '0 auto 36px' }}>
            <div className="scoring-rules-header">
              <h2 className="scoring-rules-title">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>{overview.university} {selectedFacultyTab ? `[${selectedFacultyTab}] ` : ''}수시 모집단위별 문항 배점 체계</span>
              </h2>
              <span className="scoring-rules-badge">공식 입시요강 기준</span>
            </div>
            <div className="scoring-rules-grid">
              {displayedRules.map((rule, rIdx) => (
                <div key={rIdx} className="scoring-rule-card">
                  <div className="scoring-card-head">
                    <span className="scoring-card-faculty">{rule.faculty}</span>
                    {rule.chip && <span className="scoring-card-chip">{rule.chip}</span>}
                  </div>
                  <div className="scoring-card-score">{rule.score}</div>
                  <p className="scoring-card-sub">{rule.subDesc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="univ-content-shell">
            {/* 공식 채점 기준 및 감점 방지 원칙 */}
            <section className="univ-section-block">
              <div className="univ-block-head" style={{ paddingBottom: '20px', marginBottom: '28px' }}>
                <div>
                  <h2 style={{ marginBottom: '22px' }}>
                    <Sparkles className="w-5 h-5 text-blue-600" /> 출제위원회 공식 채점 기준 및 감점 방지 원칙
                  </h2>
                  <p style={{ fontSize: '15.5px', marginTop: '0px', lineHeight: '1.6', color: '#475569', fontWeight: 500 }}>
                    {overview.university} 실제 문항카드에 명시된 공통 평가 요소와 실전 감점 방지 핵심 가이드입니다.
                  </p>
                </div>
              </div>
              <div className="rubric-board">
                {displayedRubrics.length === 0 ? (
                  <div
                    className="problem-empty-state"
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <Sparkles className="w-8 h-8 text-slate-400 mb-2" />
                    <h4>등록된 공식 채점 기준 및 감점 방지 원칙이 없습니다</h4>
                    <p>
                      관리자 페이지에서 {overview.university} 채점 기준표 및 감점 원칙 자료를 등록하면 공식 루브릭 보드가 표시됩니다.
                    </p>
                  </div>
                ) : (
                  displayedRubrics.map((item, idx) => (
                    <div key={idx} className="rubric-column-card">
                      <div className="rubric-col-top">
                        <span className="rubric-ratio">{item.ratio}</span>
                      </div>
                      <h3 className="rubric-col-name">{item.category}</h3>
                      <p className="rubric-col-desc">{item.desc}</p>
                      <ul className="rubric-bullet-points">
                        {item.details.map((detail, dIdx) => (
                          <li key={dIdx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      <footer className="home-footer">
        <Brand onHome={onBack} />
        <span>© 2027 Nonsul Pass Lab. {overview.university} 최근 공식 입시 데이터 탑재</span>
      </footer>
    </main>
  )
}
