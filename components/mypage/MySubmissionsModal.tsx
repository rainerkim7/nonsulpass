'use client'

/**
 * @file components/mypage/MySubmissionsModal.tsx
 * @description 수험생이 이전에 제출한 논술 답안 및 AI 채점 리포트 이력 조회 모달
 */

import React, { useState, useEffect } from 'react'
import { X, Award, Calendar, FileText, ChevronRight, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import type { GradingReportData } from '@/types/grading'

interface SubmissionItem {
  id: string
  exam_id: string
  exam_title: string
  university: string
  question_label: string
  student_answer: string
  char_count: number
  total_score: number
  status_verdict: string
  grading_report: GradingReportData
  created_at: string
}

interface MySubmissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectReport: (report: GradingReportData) => void
}

export default function MySubmissionsModal({
  isOpen,
  onClose,
  onSelectReport,
}: MySubmissionsModalProps) {
  const { user, userDisplayName } = useAuth()
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 사용자의 제출 이력 조회
  useEffect(() => {
    if (!isOpen || !user) return

    async function fetchSubmissions() {
      setIsLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('student_submissions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })

        if (err) {
          throw err
        }
        setSubmissions(data || [])
      } catch (err: any) {
        console.error('[MySubmissions] 제출 목록 조회 오류:', err)
        setError(err.message || '제출 이력을 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubmissions()
  }, [isOpen, user])

  if (!isOpen) return null

  // 제출 답안 삭제
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('정말로 이 채점 리포트 이력을 삭제하시겠습니까?')) return

    try {
      const { error: delErr } = await supabase.from('student_submissions').delete().eq('id', id)
      if (delErr) throw delErr
      setSubmissions((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {userDisplayName} 학생의 AI 정밀 첨삭 보관함
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                지금까지 응시하고 채점받은 모든 모의논술 리포트와 점수 기록을 확인하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 본문 리스트 영역 */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-2" />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>제출 및 채점 이력을 불러오는 중입니다...</p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : submissions.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                아직 저장된 채점 리포트가 없습니다
              </h4>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
                원하는 대학의 기출·모의논술 문제를 풀고 답안을 제출하시면,<br />
                AI 출제위원의 정밀 채점 리포트가 이곳에 자동으로 영구 보관됩니다.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {submissions.map((item) => {
                const formattedDate = new Date(item.created_at).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                const isPass = item.total_score >= 82

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectReport(item.grading_report)
                      onClose()
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#93c5fd'
                      e.currentTarget.style.backgroundColor = '#f8faff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.backgroundColor = '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {item.university}
                        </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          {item.exam_title}
                        </strong>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                          {item.question_label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> {formattedDate}
                        </span>
                        <span>·</span>
                        <span>작성 분량: {item.char_count}자</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: isPass ? '#1d4ed8' : '#e11d48' }}>
                            {item.total_score}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>/ 100점</span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isPass ? '#15803d' : '#b45309',
                          }}
                        >
                          {item.status_verdict}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="이력 삭제"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <Trash2 size={16} />
                      </button>

                      <ChevronRight size={18} color="#94a3b8" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 푸터 */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            총 <strong>{submissions.length}건</strong>의 채점 리포트가 보관되어 있습니다.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
