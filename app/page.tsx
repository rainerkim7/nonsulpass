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
import { getUniversityName } from '@/lib/constants/universities'

type ViewMode = 'home' | 'univ' | 'exam' | 'report'

function MainContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. URL 쿼리 파라미터로부터 상태 초기화
  const paramView = (searchParams.get('view') as ViewMode) || 'home'
  const paramUniv = searchParams.get('univ') || 'hongik'
  const paramExam = searchParams.get('exam') || 'hongik-2026-humanities-real'
  const paramQ = (searchParams.get('q') as 'q1' | 'q2') || 'q1'

  const [view, setView] = useState<ViewMode>(paramView)
  const [selectedUnivId, setSelectedUnivId] = useState<string>(paramUniv)
  const [selectedUniv, setSelectedUniv] = useState<string>(getUniversityName(paramUniv))
  const [selectedExamId, setSelectedExamId] = useState<string>(paramExam)
  const [initialQuestion, setInitialQuestion] = useState<'q1' | 'q2'>(paramQ)

  // 2. Gemini AI 실시간 채점 결과 데이터 상태
  const [gradingReport, setGradingReport] = useState<GradingReportData | null>(null)

  // URL 파라미터가 브라우저 뒤로가기/앞으로가기 등으로 변경되었을 때 로컬 상태 동기화
  useEffect(() => {
    const currentView = (searchParams.get('view') as ViewMode) || 'home'
    const currentUniv = searchParams.get('univ') || 'hongik'
    const currentExam = searchParams.get('exam') || 'hongik-2026-humanities-real'
    const currentQ = (searchParams.get('q') as 'q1' | 'q2') || 'q1'

    setView(currentView)
    setSelectedUnivId(currentUniv)
    setSelectedUniv(getUniversityName(currentUniv))
    setSelectedExamId(currentExam)
    setInitialQuestion(currentQ)
  }, [searchParams])

  // URL 업데이트 및 상태 변경 헬퍼
  const updateUrlAndState = useCallback((newView: ViewMode, univId?: string, examId?: string, qId?: 'q1' | 'q2') => {
    const targetUnivId = univId || selectedUnivId
    const targetExamId = examId || selectedExamId
    const targetQId = qId || initialQuestion

    const params = new URLSearchParams()
    if (newView !== 'home') {
      params.set('view', newView)
      if (targetUnivId) params.set('univ', targetUnivId)
      if (newView === 'exam') {
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

  // 대학 상세 분석 페이지 이동
  const handleSelectUniv = (univId: string, _univName: string) => {
    if (['hongik', 'khu', 'dongguk'].includes(univId)) {
      updateUrlAndState('univ', univId)
    }
  }

  // 시험 모드 진입
  const handleStartExam = (univName?: string, examId?: string, questionId?: 'q1' | 'q2') => {
    let targetUnivId = selectedUnivId
    if (univName) {
      if (univName.includes('경희')) targetUnivId = 'khu'
      else if (univName.includes('동국')) targetUnivId = 'dongguk'
      else if (univName.includes('홍익')) targetUnivId = 'hongik'
    }
    if (examId) {
      if (examId.startsWith('khu')) targetUnivId = 'khu'
      else if (examId.startsWith('dongguk')) targetUnivId = 'dongguk'
    }

    const targetExam = examId || selectedExamId
    const targetQ = questionId || 'q1'

    updateUrlAndState('exam', targetUnivId, targetExam, targetQ)
  }

  // 채점 리포트 화면 이동
  const handleNavigateToReport = (report?: GradingReportData) => {
    if (report) {
      setGradingReport(report)
    }
    updateUrlAndState('report')
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
        onExam={() => updateUrlAndState('exam')}
        reportData={gradingReport}
        onHome={handleNavigateHome}
      />
    )
  }

  return (
    <HomePage
      onExam={handleStartExam}
      onReport={() => updateUrlAndState('report')}
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
