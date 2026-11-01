'use client'

/**
 * @file components/exam/SubmissionHistorySection.tsx
 * @description 수험생의 문항별 이전 제출 및 AI 첨삭 이력 카드 리스트 컴포넌트
 */

import React from 'react'
import { Clock3, Loader2, FileText, Check, Trash2 } from 'lucide-react'
import type { GradingReportData } from '@/types/grading'

export interface SubmissionHistoryItem {
  id: string
  exam_id: string
  exam_title: string
  question_label: string
  student_answer: string
  char_count: number
  total_score: number
  status_verdict: string
  grading_report: GradingReportData
  created_at: string
}

interface SubmissionHistorySectionProps {
  questionLabel: string
  submissionHistory: SubmissionHistoryItem[]
  isLoadingHistory: boolean
  isLoggedIn: boolean
  selectedSubmissionId: string | null
  onOpenLogin: () => void
  onToggleCard: (item: SubmissionHistoryItem) => void
  onDeleteSubmission: (id: string, e: React.MouseEvent) => void
}

export default function SubmissionHistorySection({
  questionLabel,
  submissionHistory,
  isLoadingHistory,
  isLoggedIn,
  selectedSubmissionId,
  onOpenLogin,
  onToggleCard,
  onDeleteSubmission,
}: SubmissionHistorySectionProps) {
  return (
    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock3 size={16} className="text-blue-600" />
          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
            {questionLabel} 제출 및 첨삭 이력 ({submissionHistory.length}회)
          </h4>
        </div>
        <span style={{ fontSize: '11.5px', color: '#64748b' }}>작성 날짜순 (최신순)</span>
      </div>

      {isLoadingHistory ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '13px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Loader2 size={18} className="animate-spin text-blue-600 mx-auto mb-1.5" />
          <span>제출 이력을 확인하는 중입니다...</span>
        </div>
      ) : !isLoggedIn ? (
        <div
          style={{
            padding: '18px 20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>
            로그인하시면 작성한 답안과 채점 결과가 자동 보관되어 언제든 다시 불러와 첨삭을 이어갈 수 있습니다.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            로그인 / 무료 회원가입
          </button>
        </div>
      ) : submissionHistory.length === 0 ? (
        <div
          style={{
            padding: '24px 20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <FileText size={24} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
            아직 {questionLabel}에 제출된 답안이 없습니다.
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            답안을 작성하신 후 하단의 <strong>[실전 AI 채점 제출]</strong>을 클릭하시면, 작성 답안과 채점 리포트가 이곳에 차례로 보관됩니다.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {submissionHistory.map((item, index) => {
            const formattedDate = new Date(item.created_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
            const isPass = item.total_score >= 82
            const isSelected = selectedSubmissionId === item.id

            return (
              <div
                key={item.id}
                onClick={() => onToggleCard(item)}
                title={
                  isSelected
                    ? '클릭하여 선택 해제 (답안 작성창 초기화)'
                    : '클릭하여 이 답안을 작성창에 불러오기'
                }
                style={{
                  backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '13px 18px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: isSelected
                    ? '0 4px 14px rgba(37, 99, 235, 0.14)'
                    : '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#93c5fd'
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.backgroundColor = '#ffffff'
                  }
                }}
              >
                {/* 좌측 메타 정보 (회차 뱃지, 선택 상태 뱃지, 날짜, 글자 수) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2.5px 8px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                    }}
                  >
                    #{submissionHistory.length - index}회차
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2.5px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} strokeWidth={2.5} /> 선택됨
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{formattedDate}</span>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    {item.char_count}자
                  </span>
                </div>

                {/* 우측 점수, 합격 판정 & 삭제 액션 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2.5px 8px',
                      borderRadius: '6px',
                      backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
                      color: isPass ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {item.status_verdict || (isPass ? '합격권' : '도전 권장')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <strong
                      style={{
                        fontSize: '16px',
                        fontWeight: 900,
                        color: isPass ? '#1d4ed8' : '#e11d48',
                      }}
                    >
                      {item.total_score}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ 100점</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onDeleteSubmission(item.id, e)}
                    title="기록 삭제"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      padding: '4px',
                      marginLeft: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

