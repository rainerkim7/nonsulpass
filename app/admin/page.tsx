'use client'

/**
 * @file app/admin/page.tsx
 * @description 논술패스 Lab 대학별 기출문제 관리 및 Gemini AI 출제경향/채점기준 자동 생성 관리자 콘솔
 *              (단일 책임 원칙에 따라 각 탭별 전용 매니저 컴포넌트로 모듈화된 진입점,
 *               선택 대학 영구 보존: URL SearchParams 및 localStorage 하이브리드 동기화)
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Sparkles,
  BookOpen,
  Layers,
  Award,
  Sliders,
  ArrowLeft,
  School,
  CheckCircle2,
  AlertCircle,
  Plus,
  X
} from 'lucide-react'

// 하위 전용 매니저 컴포넌트 임포트
import AllInOneParser from './components/AllInOneParser'
import ExamsManager, { ExamItem } from './components/ExamsManager'
import TrendsManager, { TrendRow } from './components/TrendsManager'
import RubricsManager, { ScoringRuleRow, RubricRow } from './components/RubricsManager'

// 중앙 집중 대학 메타데이터 임포트
import {
  UNIVERSITIES,
  UNIVERSITY_FACULTIES,
  getUniversityName,
  registerDynamicUniversities,
  type UniversityMeta,
} from '@/lib/constants/universities'
import { useAuth } from '@/components/AuthGate'

// 브라우저 로컬 스토리지 키 (직전 선택 대학 기억)
const STORAGE_KEY = 'nonsulpass_admin_selected_univ'

function AdminConsoleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 관리자 권한 확인 (admin 계정 여부)
  const { isAdmin, isLoading: isAuthLoading } = useAuth()

  // 전체 관리 대상 대학 목록 상태 (기본 프리셋 + DB 추가 대학 병합)
  const [univList, setUnivList] = useState<UniversityMeta[]>(UNIVERSITIES)

  // 신규 대학 추가 모달 상태
  const [isAddUnivOpen, setIsAddUnivOpen] = useState<boolean>(false)
  const [newUnivId, setNewUnivId] = useState<string>('')
  const [newUnivName, setNewUnivName] = useState<string>('')
  const [newUnivFaculty, setNewUnivFaculty] = useState<string>('인문계열 (공통)')
  const [newUnivDuration, setNewUnivDuration] = useState<string>('120분')
  const [isAddingUniv, setIsAddingUniv] = useState<boolean>(false)

  // 1. 현재 선택된 대학 상태: URL 파라미터(?univ=...) -> localStorage -> 'hongik' 순으로 우선 복원
  const paramUniv = searchParams.get('univ')
  const [selectedUniv, setSelectedUniv] = useState<string>(() => {
    if (paramUniv) {
      return paramUniv
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return saved
      }
    }
    return 'hongik'
  })

  // DB에 등록된 대학 목록 동기화 로드
  const fetchUniversityList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/universities')
      const data = await res.json()
      if (data.success && Array.isArray(data.universities)) {
        registerDynamicUniversities(data.universities)
        setUnivList(data.universities)
      }
    } catch (err) {
      console.warn('[AdminPage] 대학 목록 동기화 실패:', err)
    }
  }, [])

  useEffect(() => {
    fetchUniversityList()
  }, [fetchUniversityList])

  // URL 파라미터가 브라우저 뒤로가기 등으로 변경되었을 때 동기화
  useEffect(() => {
    if (paramUniv && paramUniv !== selectedUniv) {
      setSelectedUniv(paramUniv)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, paramUniv)
      }
    }
  }, [paramUniv, selectedUniv])

  // 대학 선택 변경 핸들러 (상태 갱신 + localStorage 저장 + URL 동기화)
  const handleSelectUniv = useCallback((newUniv: string) => {
    setSelectedUniv(newUniv)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newUniv)
    }
    router.replace(`/admin?univ=${newUniv}`)
  }, [router])

  const [selectedFaculty, setSelectedFaculty] = useState<string>('인문계열 (공통)')
  const [customFaculty, setCustomFaculty] = useState<string>('')
  const [isCustomFaculty, setIsCustomFaculty] = useState<boolean>(false)

  // 2. 활성화된 관리자 탭 상태
  const [activeAdminTab, setActiveAdminTab] = useState<'all-in-one' | 'exams' | 'trends' | 'rubrics'>('all-in-one')

  // 3. 탭별 데이터 상태
  // (1) 기출/모의 시험지 목록
  const [exams, setExams] = useState<ExamItem[]>([])
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true)

  // (2) 출제 경향 (university_trends)
  const [trends, setTrends] = useState<TrendRow[]>([])
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(true)

  // (3) 채점 기준 및 루브릭 (scoring_rules & university_rubrics)
  const [scoringRules, setScoringRules] = useState<ScoringRuleRow[]>([])
  const [rubrics, setRubrics] = useState<RubricRow[]>([])
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true)

  // 4. 전역 알림 토스트 상태
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // 알림 토스트 헬퍼
  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }, [])

  // 기출문제 목록 조회
  const fetchExams = useCallback(async (univId: string) => {
    setIsLoadingExams(true)
    try {
      const res = await fetch(`/api/admin/exams?univ_id=${univId}`)
      const data = await res.json()
      if (data.success) {
        setExams(data.exams || [])
      } else {
        showNotice('error', `기출문제 로드 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `네트워크 오류: ${err.message}`)
    } finally {
      setIsLoadingExams(false)
    }
  }, [showNotice])

  // 출제 경향 목록 조회
  const fetchTrends = useCallback(async (univId: string) => {
    setIsLoadingTrends(true)
    try {
      const res = await fetch(`/api/admin/trends?univ_id=${univId}`)
      const data = await res.json()
      if (data.success) {
        setTrends(data.trends || [])
      } else {
        console.warn('출제경향 로드 실패:', data.error)
      }
    } catch (err: any) {
      console.warn('출제경향 네트워크 오류:', err.message)
    } finally {
      setIsLoadingTrends(false)
    }
  }, [])

  // 채점 기준 및 루브릭 목록 조회
  const fetchRubrics = useCallback(async (univId: string) => {
    setIsLoadingRubrics(true)
    try {
      const res = await fetch(`/api/admin/rubrics?univ_id=${univId}`)
      const data = await res.json()
      if (data.success) {
        setScoringRules(data.scoringRules || [])
        setRubrics(data.rubrics || [])
      } else {
        console.warn('루브릭 로드 실패:', data.error)
      }
    } catch (err: any) {
      console.warn('루브릭 네트워크 오류:', err.message)
    } finally {
      setIsLoadingRubrics(false)
    }
  }, [])

  // 대학 전체 데이터 일괄 새로고침 (올인원 저장 후 등)
  const refreshAllData = useCallback(() => {
    fetchUniversityList()
    fetchExams(selectedUniv)
    fetchTrends(selectedUniv)
    fetchRubrics(selectedUniv)
  }, [fetchUniversityList, fetchExams, fetchTrends, fetchRubrics, selectedUniv])

  // 신규 대학 추가 등록 핸들러
  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = newUnivId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const cleanName = newUnivName.trim()

    if (!cleanId || !cleanName) {
      showNotice('error', '대학 영문 ID(예: inha, ajou)와 한글 대학명(예: 인하대학교)을 모두 입력해 주세요.')
      return
    }

    setIsAddingUniv(true)
    try {
      const res = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          name: cleanName,
          faculty: newUnivFaculty.trim() || '인문계열 (공통)',
          exam_duration: newUnivDuration.trim() || '120분',
          is_active: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '대학 추가 실패')
      }

      await fetchUniversityList()
      handleSelectUniv(cleanId)
      setIsAddUnivOpen(false)
      setNewUnivId('')
      setNewUnivName('')
      setNewUnivFaculty('인문계열 (공통)')
      showNotice('success', `${cleanName}(${cleanId}) 대학이 추가되었습니다. 이제 기출·출제경향·채점기준을 업로드할 수 있습니다!`)
    } catch (err: any) {
      showNotice('error', err.message || '대학 추가 중 오류가 발생했습니다.')
    } finally {
      setIsAddingUniv(false)
    }
  }

  // 대학 변경 시 전체 데이터 로드 및 기본 계열 설정
  useEffect(() => {
    fetchExams(selectedUniv)
    fetchTrends(selectedUniv)
    fetchRubrics(selectedUniv)

    const faculties = UNIVERSITY_FACULTIES[selectedUniv] || ['인문계열']
    setSelectedFaculty(faculties[0])
    setIsCustomFaculty(false)
    setCustomFaculty('')
  }, [selectedUniv, fetchExams, fetchTrends, fetchRubrics])

  const currentUnivObj = univList.find((u) => u.id === selectedUniv)
  const currentUnivName = currentUnivObj?.name || getUniversityName(selectedUniv)

  // 관리자 권한 검사: 비관리자(일반 사용자) 계정 접근 차단 가드
  if (!isAuthLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">관리자 전용 접근 제한</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            이 페이지는 시스템 관리자(admin) 전용 콘솔입니다.<br />
            일반 사용자 계정으로는 관리자 화면에 접근할 수 없습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition"
          >
            <ArrowLeft size={16} />
            메인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      {/* 1. 상단 글로벌 네비게이션 헤더 */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              display: 'grid',
              placeItems: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: '#1e3a8a',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  논술패스 <span style={{ color: '#2563eb' }}>Lab</span>
                </span>
                <span className="admin-badge-blue">관리자 센터</span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                대학별 기출 관리 및 Gemini AI 출제경향·채점기준 엔진
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 현재 관리 중인 대학 상세 페이지로 바로 이동하여 작업 결과 확인 */}
            <Link
              href={`/?view=univ&univ=${selectedUniv}`}
              className="admin-btn-secondary"
              title={`${currentUnivName} 메인 분석 페이지로 바로 이동`}
            >
              <ArrowLeft size={14} />
              {currentUnivName} 메인 페이지로 이동
            </Link>
          </div>
        </div>
      </header>

      {/* 2. 전역 알림 토스트 배너 */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
            backgroundColor: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}
          className="animate-fadeIn"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} color="#16a34a" />
          ) : (
            <AlertCircle size={18} color="#dc2626" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 3. 메인 콘텐츠 컨테이너 */}
      <main className="admin-container">
        {/* 상단 컨트롤 바: 대학 선택 & 관리 탭 전환 버튼 */}
        <section className="admin-card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            {/* 관리 대상 대학 셀렉터 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                display: 'grid',
                placeItems: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#1d4ed8'
              }}>
                <School size={20} />
              </div>
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  관리 대상 대학
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <select
                    value={selectedUniv}
                    onChange={(e) => handleSelectUniv(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    {univList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.active ? '(서비스 활성)' : '(신규 등록 가능)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddUnivOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="목록에 없는 새로운 대학을 추가합니다"
                  >
                    <Plus size={14} />
                    새 대학 추가
                  </button>
                  <span className="admin-badge-green">
                    ● 전체 {univList.length}개 대학 관리 중
                  </span>
                </div>
              </div>
            </div>

            {/* 관리 탭 전환 버튼 네비게이션 */}
            <div className="admin-tab-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveAdminTab('all-in-one')}
                className={`admin-tab-btn ${activeAdminTab === 'all-in-one' ? 'active' : ''}`}
                style={{
                  color: activeAdminTab === 'all-in-one' ? '#1e3a8a' : '#2563eb',
                  fontWeight: 800
                }}
              >
                <Sparkles size={15} style={{ color: '#2563eb' }} />
                ⚡ 입학처 통합 보고서 올인원 추출기
              </button>
              <button
                type="button"
                onClick={() => setActiveAdminTab('exams')}
                className={`admin-tab-btn ${activeAdminTab === 'exams' ? 'active' : ''}`}
              >
                <BookOpen size={15} />
                기출·모의 문제 관리 ({exams.length}건)
              </button>
              <button
                type="button"
                onClick={() => setActiveAdminTab('trends')}
                className={`admin-tab-btn ${activeAdminTab === 'trends' ? 'active' : ''}`}
              >
                <Layers size={15} />
                출제 경향 및 유형 분석 편집 ({trends.length}건)
              </button>
              <button
                type="button"
                onClick={() => setActiveAdminTab('rubrics')}
                className={`admin-tab-btn ${activeAdminTab === 'rubrics' ? 'active' : ''}`}
              >
                <Award size={15} />
                채점 기준 및 배점 체계 편집 ({scoringRules.length + rubrics.length}건)
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TAB 1: ⚡ 입학처 통합 보고서 올인원 추출기 (All-in-One Parser) */}
        {/* ========================================================================= */}
        {activeAdminTab === 'all-in-one' && (
          <AllInOneParser
            selectedUniv={selectedUniv}
            univName={currentUnivName}
            selectedFaculty={selectedFaculty}
            setSelectedFaculty={setSelectedFaculty}
            customFaculty={customFaculty}
            setCustomFaculty={setCustomFaculty}
            isCustomFaculty={isCustomFaculty}
            setIsCustomFaculty={setIsCustomFaculty}
            onDataSaved={refreshAllData}
            showNotice={showNotice}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 기출·모의고사 관리 (Exams Manager) */}
        {/* ========================================================================= */}
        {activeAdminTab === 'exams' && (
          <ExamsManager
            selectedUniv={selectedUniv}
            univName={currentUnivName}
            exams={exams}
            isLoadingExams={isLoadingExams}
            onRefresh={() => fetchExams(selectedUniv)}
            showNotice={showNotice}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 출제 경향 및 유형 분석 편집 (Trends Manager) */}
        {/* ========================================================================= */}
        {activeAdminTab === 'trends' && (
          <TrendsManager
            univId={selectedUniv}
            univName={currentUnivName}
            trends={trends}
            isLoading={isLoadingTrends}
            onRefresh={() => fetchTrends(selectedUniv)}
            showNotice={showNotice}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 채점 기준 및 배점 체계 편집 (Rubrics Manager) */}
        {/* ========================================================================= */}
        {activeAdminTab === 'rubrics' && (
          <RubricsManager
            univId={selectedUniv}
            univName={currentUnivName}
            scoringRules={scoringRules}
            rubrics={rubrics}
            isLoading={isLoadingRubrics}
            onRefresh={() => fetchRubrics(selectedUniv)}
            showNotice={showNotice}
          />
        )}
      </main>

      {/* 신규 대학 추가 등록 모달 */}
      {isAddUnivOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <School size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  신규 논술 대학 추가 등록
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnivOpen(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUniversity} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  대학 영문 식별자 (ID) *
                </label>
                <input
                  type="text"
                  value={newUnivId}
                  onChange={(e) => setNewUnivId(e.target.value)}
                  placeholder="예: inha, ajou, dankook, pnu (영문 소문자)"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  한글 대학명 *
                </label>
                <input
                  type="text"
                  value={newUnivName}
                  onChange={(e) => setNewUnivName(e.target.value)}
                  placeholder="예: 인하대학교, 아주대학교, 부산대학교"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  모집 계열 트랙 (콤마로 복수 트랙 구분 가능)
                </label>
                <input
                  type="text"
                  value={newUnivFaculty}
                  onChange={(e) => setNewUnivFaculty(e.target.value)}
                  placeholder="예: 인문계열 (공통) 또는 인문계열, 사회계열"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  기본 시험 시간
                </label>
                <input
                  type="text"
                  value={newUnivDuration}
                  onChange={(e) => setNewUnivDuration(e.target.value)}
                  placeholder="예: 120분 (문항당 60분 권장)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddUnivOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAddingUniv}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 0,
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isAddingUniv ? '등록 중...' : '대학 등록 및 선택'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
            관리자 콘솔 로딩 중...
          </div>
        </div>
      }
    >
      <AdminConsoleContent />
    </Suspense>
  )
}
