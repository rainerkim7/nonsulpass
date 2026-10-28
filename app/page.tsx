'use client'

/**
 * @file app/page.tsx
 * @description 논술패스 Lab 메인 라우팅 컨트롤러
 *              (URL 쿼리 파라미터 동기화, 새로고침 및 브라우저 뒤로가기 상태 유지 지원)
 */

import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import HomePage from '@/components/home/HomePage'
import UniversityDetailPage from '@/components/univ/UniversityDetailPage'
import ExamWorkspace from '@/components/exam/ExamWorkspace'
import ReportPage from '@/components/report/ReportPage'
import type { GradingReportData } from '@/types/grading'
import { getUniversityName, getUniversityId } from '@/lib/constants/universities'
import { getAllMergedUniversities } from '@/lib/api/university'

type ViewMode = 'home' | 'univ' | 'exam' | 'report'

function MainContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. URL 쿼리 파라미터로부터 상태 초기화
  const paramView = (searchParams.get('view') as ViewMode) || 'home'
  const paramUniv = searchParams.get('univ') || 'hongik'
  const paramExam = searchParams.get('exam') || 'hongik-2026-humanities-real'
  const paramQ = searchParams.get('q') || 'q1'

  const [view, setView] = useState<ViewMode>(paramView)
  const [selectedUnivId, setSelectedUnivId] = useState<string>(paramUniv)
  const [selectedUniv, setSelectedUniv] = useState<string>(getUniversityName(paramUniv))
  const [selectedExamId, setSelectedExamId] = useState<string>(paramExam)
  const [initialQuestion, setInitialQuestion] = useState<string>(paramQ)

  // 마운트 시 DB에 등록된 동적 대학 목록을 런타임 캐시에 동기화
  useEffect(() => {
    getAllMergedUniversities().then(() => {
      setSelectedUniv(getUniversityName(paramUniv))
    })
  }, [paramUniv])

  // 2. Gemini AI 실시간 채점 결과 데이터 상태 (localStorage 캐시 하이브리드 연동으로 유실 방지)
  const [gradingReport, setGradingReport] = useState<GradingReportData | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem('nonsul_active_grading_report')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // URL 파라미터가 브라우저 뒤로가기/앞으로가기 등으로 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    const currentView = (searchParams.get('view') as ViewMode) || 'home'
    const currentUniv = searchParams.get('univ') || 'hongik'
    const currentExam = searchParams.get('exam') || 'hongik-2026-humanities-real'
    const currentQ = searchParams.get('q') || 'q1'

    setView(currentView)
    setSelectedUnivId(currentUniv)
    setSelectedUniv(getUniversityName(currentUniv))
    setSelectedExamId(currentExam)
    setInitialQuestion(currentQ)
  }, [searchParams])

  // URL 업데이트 및 상태 변경 헬퍼
  const updateUrlAndState = useCallback((newView: ViewMode, univId?: string, examId?: string, qId?: string) => {
    const targetUnivId = univId || selectedUnivId
    const targetExamId = examId || selectedExamId
    const targetQId = qId || initialQuestion

    const params = new URLSearchParams()
    if (newView !== 'home') {
      params.set('view', newView)
      if (targetUnivId) params.set('univ', targetUnivId)
      if (newView === 'exam' || newView === 'report') {
        if (targetExamId) params.set('exam', targetExamId)
        if (targetQId) params.set('q', targetQId)
      }
    }

    const queryStr = params.toString()
    const targetUrl = queryStr ? `/?${queryStr}` : '/'
    router.push(targetUrl)

    setView(newView)
    if (univId) {
      setSelectedUnivId(univId)
      setSelectedUniv(getUniversityName(univId))
    }
    if (examId) setSelectedExamId(examId)
    if (qId) setInitialQuestion(qId)
  }, [router, selectedUnivId, selectedExamId, initialQuestion])

  // 3. 네비게이션 이벤트 핸들러
  // 홈 화면으로 복귀
  const handleNavigateHome = () => {
    updateUrlAndState('home')
  }

  // 대학 상세 분석 페이지 이동 (모든 활성/패스 보유 대학 동적 진입 지원)
  const handleSelectUniv = (univId: string, univName: string) => {
    if (!univId) return
    if (univName) setSelectedUniv(univName)
    updateUrlAndState('univ', univId)
  }

  // 시험 모드 진입 (모든 추가 대학 및 q1~q3+ 문항 동적 지원)
  const handleStartExam = (univName?: string, examId?: string, questionId?: string) => {
    let targetUnivId = selectedUnivId
    if (univName) {
      targetUnivId = getUniversityId(univName)
      setSelectedUniv(univName)
    } else if (examId && examId.includes('-')) {
      const prefix = examId.split('-')[0]
      if (prefix) targetUnivId = prefix
    }

    const targetExam = examId || selectedExamId
    const targetQ = questionId || 'q1'

    updateUrlAndState('exam', targetUnivId, targetExam, targetQ)
  }

  // 채점 리포트 화면 이동 (로컬 스토리지에 캐싱하여 리포트 유실 방지 및 현재 문항 탭 보존)
  const handleNavigateToReport = (report?: GradingReportData, questionId?: string) => {
    if (questionId) {
      setInitialQuestion(questionId)
    }
    if (report) {
      setGradingReport(report)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nonsul_active_grading_report', JSON.stringify(report))
        } catch (e) {
          console.warn('[App] 리포트 캐싱 오류:', e)
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('nonsul_active_grading_report')
          if (cached) setGradingReport(JSON.parse(cached))
        } catch {}
      }
    }
    updateUrlAndState('report', selectedUnivId, selectedExamId, questionId || initialQuestion)
  }

  // 4. 뷰 렌더링 분기
  if (view === 'univ') {
    return (
      <UniversityDetailPage
        univId={selectedUnivId}
        onBack={handleNavigateHome}
        onStartExam={handleStartExam}
      />
    )
  }

  if (view === 'exam') {
    return (
      <ExamWorkspace
        key={`${selectedUnivId}-${selectedExamId}`}
        selectedUniv={selectedUniv}
        selectedExamId={selectedExamId}
        initialQuestion={initialQuestion}
        onReport={handleNavigateToReport}
        onBack={() => updateUrlAndState('univ', selectedUnivId)}
        onHome={handleNavigateHome}
      />
    )
  }

  if (view === 'report') {
    return (
      <ReportPage
        onExam={() => updateUrlAndState('exam', selectedUnivId, selectedExamId, initialQuestion)}
        reportData={gradingReport}
        onHome={handleNavigateHome}
      />
    )
  }

  return (
    <HomePage
      onExam={handleStartExam}
      onReport={(report) => handleNavigateToReport(report)}
      onSelectUniv={handleSelectUniv}
    />
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
            논술패스 Lab 로딩 중...
          </div>
        </div>
      }
    >
      <MainContent />
    </Suspense>
  )
}
