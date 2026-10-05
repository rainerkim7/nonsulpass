'use client'

/**
 * @file app/admin/components/ExamsManager.tsx
 * @description 관리자 페이지 - 탭 1 기출·모의고사(exams) 목록 조회/삭제/신규등록 컴포넌트
 */

import React, { useState } from 'react'
import {
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Save
} from 'lucide-react'

export interface ExamItem {
  id: string
  univ_id: string
  year: string
  title: string
  type: string
  target_faculty?: string
  total_time?: number
  total_length?: string
  level?: string
  summary?: string
}

interface ExamsManagerProps {
  selectedUniv: string
  univName: string
  exams: ExamItem[]
  isLoadingExams: boolean
  onRefresh: () => void
  showNotice: (type: 'success' | 'error', message: string) => void
}

export default function ExamsManager({
  selectedUniv,
  univName,
  exams,
  isLoadingExams,
  onRefresh,
  showNotice
}: ExamsManagerProps) {
  const [examFilter, setExamFilter] = useState<'all' | '기출문제' | '모의논술' | '예상문제'>('all')

  // 새 기출문제 입력 폼 모달 상태
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [isSubmittingExam, setIsSubmittingExam] = useState<boolean>(false)
  const [newExamForm, setNewExamForm] = useState({
    year: '2026',
    title: '',
    type: '모의논술',
    target_faculty: '인문·사회계열 공통',
    total_time: 120,
    total_length: '총 1,600자 (800자×2문항)',
    level: '실전 난이도',
    summary: ''
  })

  // 기출문제 등록 핸들러
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExamForm.title.trim()) {
      showNotice('error', '시험명을 입력해 주세요.')
      return
    }

    setIsSubmittingExam(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          univ_id: selectedUniv,
          ...newExamForm
        })
      })

      const data = await res.json()
      if (data.success) {
        showNotice('success', `'${newExamForm.title}' 시험이 등록되었습니다.`)
        setShowAddModal(false)
        setNewExamForm({
          year: '2026',
          title: '',
          type: '모의논술',
          target_faculty: '인문·사회계열 공통',
          total_time: 120,
          total_length: '총 1,600자 (800자×2문항)',
          level: '실전 난이도',
          summary: ''
        })
        onRefresh()
      } else {
        showNotice('error', `등록 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `오류 발생: ${err.message}`)
    } finally {
      setIsSubmittingExam(false)
    }
  }

  // 기출문제 삭제 핸들러
  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`'${title}' 시험을 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        showNotice('success', '시험이 삭제되었습니다.')
        onRefresh()
      } else {
        showNotice('error', `삭제 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `삭제 오류: ${err.message}`)
    }
  }

  const filteredExams = exams.filter(e => examFilter === 'all' || e.type === examFilter)

  return (
    <section className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="text-blue-600" size={20} />
            {univName} 등록 기출·모의고사 목록 ({exams.length}건)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            학생들이 [탭 1: 기출·모의고사 응시]에서 직접 시험을 치르는 공식 시험 목록입니다.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingExams}
            className="admin-btn-secondary"
          >
            <RefreshCw size={13} className={isLoadingExams ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="admin-btn-primary"
          >
            <Plus size={16} />
            새 기출·모의 등록
          </button>
        </div>
      </div>

      {/* 기출 / 모의 / 예상 필터 탭 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
        {(['all', '기출문제', '모의논술', '예상문제'] as const).map(type => {
          const count = type === 'all' ? exams.length : exams.filter(e => e.type === type).length
          const label = type === 'all' ? '전체 보기' : type
          const isSelected = examFilter === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setExamFilter(type)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: isSelected ? 800 : 600,
                border: `1px solid ${isSelected ? '#1e3a8a' : '#cbd5e1'}`,
                backgroundColor: isSelected ? '#1e3a8a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* 기출문제 행 리스트 */}
      {isLoadingExams ? (
        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            Supabase DB에서 기출문제를 불러오는 중입니다...
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14.5px', fontWeight: 700, color: '#334155', margin: 0 }}>
            {univName}에 등록된 해당 조건의 기출·모의고사가 없습니다.
          </p>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0' }}>
            우측 상단의 '+ 새 기출·모의 등록' 버튼을 누르거나 올인원 추출기에서 영향평가서를 등록하세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#93c5fd'
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(30, 58, 138, 0.07)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              {/* 좌측: 학년도·유형 배지 + 시험명 & 한 줄 요약문 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                <span
                  className="admin-badge-blue"
                  style={{
                    width: '148px',
                    minWidth: '148px',
                    maxWidth: '148px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    flexShrink: 0,
                    padding: '5px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '-0.2px'
                  }}
                >
                  {(() => {
                    const matchYear = exam.year.match(/\d{4}/)?.[0] || '2026'
                    return `${matchYear}학년도 · ${exam.type}`
                  })()}
                </span>

                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{
                    fontSize: '15.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.35,
                    letterSpacing: '-0.3px'
                  }}>
                    {exam.title}
                  </span>
                  {exam.summary && (
                    <span style={{
                      fontSize: '13px',
                      color: '#64748b',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      📌 {exam.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 실시간 응시 가능 상태 & 삭제 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, marginLeft: '16px' }}>
                <span style={{
                  fontSize: '12px',
                  color: '#16a34a',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#f0fdf4',
                  border: '1px solid #dcfce7',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                  응시 가능
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteExam(exam.id, exam.title)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '6px 10px',
                    color: '#64748b',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626'
                    e.currentTarget.style.borderColor = '#fca5a5'
                    e.currentTarget.style.background = '#fef2f2'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#ffffff'
                  }}
                  title="시험 삭제"
                >
                  <Trash2 size={13} />
                  <span>삭제</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 새 기출·모의고사 등록 팝업 모달 */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }} className="animate-fadeIn">
          <div style={{
            width: '100%',
            maxWidth: '540px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                새 기출·모의고사 등록 ({univName})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    학년도
                  </label>
                  <input
                    type="text"
                    value={newExamForm.year}
                    onChange={e => setNewExamForm({ ...newExamForm, year: e.target.value })}
                    placeholder="예: 2026"
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    시험 유형
                  </label>
                  <select
                    value={newExamForm.type}
                    onChange={e => setNewExamForm({ ...newExamForm, type: e.target.value })}
                    className="admin-input"
                  >
                    <option value="모의논술">모의논술</option>
                    <option value="기출문제">기출문제</option>
                    <option value="예상문제">예상문제</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  시험 명칭
                </label>
                <input
                  type="text"
                  value={newExamForm.title}
                  onChange={e => setNewExamForm({ ...newExamForm, title: e.target.value })}
                  placeholder="예: 2026학년도 홍익대학교 모의논술 (인문계열)"
                  className="admin-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    시험 시간 (분)
                  </label>
                  <input
                    type="number"
                    value={newExamForm.total_time}
                    onChange={e => setNewExamForm({ ...newExamForm, total_time: Number(e.target.value) })}
                    placeholder="120"
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    권장 분량 요약
                  </label>
                  <input
                    type="text"
                    value={newExamForm.total_length}
                    onChange={e => setNewExamForm({ ...newExamForm, total_length: e.target.value })}
                    placeholder="총 1,600자 (800자×2문항)"
                    className="admin-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  한 줄 핵심 요약 (학생 리스트 노출)
                </label>
                <input
                  type="text"
                  value={newExamForm.summary}
                  onChange={e => setNewExamForm({ ...newExamForm, summary: e.target.value })}
                  placeholder="예: 권력의 집중과 분산 비판적 평가 및 AI 기술 번영 정책 대안 도출"
                  className="admin-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="admin-btn-secondary"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExam}
                  className="admin-btn-primary"
                >
                  <Save size={15} />
                  {isSubmittingExam ? '등록 중...' : '시험 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
