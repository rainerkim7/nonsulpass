'use client'

/**
 * @file components/report/ReportModal.tsx
 * @description 시험 응시 화면(ExamWorkspace) 내에서 화면 이동 없이 팝업으로
 *              수험생 작성 답안과 AI 정밀 채점 리포트를 열람할 수 있는 팝업 모달
 */

import React, { useState } from 'react'
import {
  X,
  Award,
  Check,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  ArrowRight,
  Download,
  FileText,
  Copy,
  RotateCcw,
  Calendar
} from 'lucide-react'
import type { GradingReportData } from '@/types/grading'

export interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportData: GradingReportData | null
  studentAnswer?: string
  examTitle?: string
  questionLabel?: string
  createdAt?: string
  onLoadAnswer?: (answer: string) => void
}

export default function ReportModal({
  isOpen,
  onClose,
  reportData,
  studentAnswer,
  examTitle,
  questionLabel,
  createdAt,
  onLoadAnswer,
}: ReportModalProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'answer'>('report')
  const [activeCriterion, setActiveCriterion] = useState(0)
  const [copied, setCopied] = useState(false)

  if (!isOpen || !reportData) return null

  const title = examTitle || reportData.examTitle || '논술패스 AI 정밀 채점 리포트'
  const qLabel = questionLabel || reportData.questionLabel || '문항 정밀 채점 리포트'
  const studentMeta = `${reportData.studentName || '수험생'} 학생 · AI 정밀 첨삭 결과`

  const totalScore = reportData.totalScore ?? 0
  const maxScore = reportData.maxPossibleScore ?? 100
  const cutline = reportData.cutlineScore ?? 82
  const scoreDiff = totalScore - cutline
  const isPass = totalScore >= cutline
  const statusVerdict = reportData.statusVerdict || (isPass ? '합격 안정권' : '도전 권장')

  const charCount = reportData.charCount ?? (studentAnswer ? studentAnswer.length : 0)
  const charStatus = reportData.charStatus || '규격 적합'
  const conceptHits = reportData.conceptHits || { matchedCount: 0, targetTotal: 0, keywords: [] }
  const structureGrade = reportData.structureGrade || 'A'

  const criteriaList = reportData.criteria || []
  const activeItem = criteriaList[activeCriterion] || criteriaList[0]

  const examinerVerdict = reportData.examinerVerdict || {
    oneLiner: '“논리적 흐름이 탄탄하며, 핵심 요구조건을 충실히 반영했습니다.”',
    coreAdvice: '출제 의도에 맞게 제시문의 대립 구도를 더 선명하게 대비시키면 최고점을 기대할 수 있습니다.',
  }

  const deductions = reportData.deductions || []
  const rewrite = reportData.rewrite

  // 답안 복사 핸들러
  const handleCopyAnswer = () => {
    if (!studentAnswer) return
    navigator.clipboard.writeText(studentAnswer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 답안 작성 영역으로 불러오기
  const handleLoadAnswer = () => {
    if (!studentAnswer || !onLoadAnswer) return
    if (confirm('이 답안을 작성 영역으로 불러오시겠습니까? 기존에 작성 중이던 내용은 대체됩니다.')) {
      onLoadAnswer(studentAnswer)
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '920px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div
          style={{
            padding: '18px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isPass ? '#2563eb' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#334155',
                    color: '#cbd5e1',
                  }}
                >
                  {qLabel}
                </span>
                {createdAt && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(createdAt).toLocaleString('ko-KR')}
                  </span>
                )}
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 800 }}>
                {title}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="리포트 인쇄 또는 PDF 저장"
            >
              <Download size={14} /> PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
              }}
              title="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션: [채점 리포트] vs [수험생 작성 답안] */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 24px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: activeTab === 'report' ? 800 : 600,
              color: activeTab === 'report' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'report' ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={16} /> AI 정밀 채점 리포트
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('answer')}
            style={{
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: activeTab === 'answer' ? 800 : 600,
              color: activeTab === 'answer' ? '#1d4ed8' : '#64748b',
              borderBottom: activeTab === 'answer' ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} /> 수험생 작성 답안 원문 ({charCount}자)
          </button>
        </div>

        {/* 모달 본문 영역 (스크롤 가능) */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          {activeTab === 'report' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. 총점 및 핵심 지표 헤어로 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: isPass
                        ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                        : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: `3px solid ${isPass ? '#3b82f6' : '#f59e0b'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '26px', fontWeight: 900, color: isPass ? '#1e40af' : '#b45309' }}>
                      {totalScore}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>/ {maxScore}점</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '8px',
                          backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
                          color: isPass ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {statusVerdict}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        합격선(<strong>{cutline}점</strong>) 대비{' '}
                        <strong style={{ color: scoreDiff >= 0 ? '#16a34a' : '#dc2626' }}>
                          {scoreDiff >= 0 ? `+${scoreDiff}점` : `${scoreDiff}점`}
                        </strong>
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569' }}>
                      {studentMeta}
                    </p>
                  </div>
                </div>

                {/* 지표 그리드 */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>글자수</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{charCount}자</strong>
                    <span style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginTop: '2px' }}>
                      {charStatus}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>개념어 적중</span>
                    <strong style={{ fontSize: '15px', color: '#2563eb' }}>
                      {conceptHits.matchedCount} / {conceptHits.targetTotal}개
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {Math.round((conceptHits.matchedCount / (conceptHits.targetTotal || 1)) * 100)}%
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>구조 완결도</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{structureGrade}</strong>
                    <span style={{ fontSize: '11px', color: '#16a34a', display: 'block', marginTop: '2px' }}>
                      구조 검증
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 출제위원 한 줄 총평 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={18} color="#4f46e5" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                    출제위원의 종합 평가
                  </h4>
                </div>
                <blockquote
                  style={{
                    margin: '0 0 14px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    borderLeft: '4px solid #4f46e5',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1e293b',
                    lineHeight: 1.6,
                  }}
                >
                  {examinerVerdict.oneLiner}
                </blockquote>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                  }}
                >
                  <Lightbulb size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>핵심 과제 및 개선 제안:</strong>
                    {examinerVerdict.coreAdvice}
                  </div>
                </div>
              </div>

              {/* 3. 대학 공식 채점 기준표(루브릭) 항목별 분석 */}
              {criteriaList.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                    평가 기준별 상세 분석
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px' }}>
                    {criteriaList.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveCriterion(idx)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: activeCriterion === idx ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: activeCriterion === idx ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          fontWeight: activeCriterion === idx ? 800 : 600,
                          color: activeCriterion === idx ? '#1e40af' : '#475569',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {idx + 1}. {c.category.slice(0, 16)}... ({c.score}/{c.maxScore}점)
                      </button>
                    ))}
                  </div>

                  {activeItem && (
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>{activeItem.category}</strong>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                          }}
                        >
                          {activeItem.score} / {activeItem.maxScore}점
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.6 }}>
                        {activeItem.feedback}
                      </p>
                      {activeItem.warning && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <AlertTriangle size={14} /> {activeItem.warning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. 감점 문장 및 첨삭 지도 */}
              {deductions.length > 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                    감점 요인 및 집중 교정 ({deductions.length}건)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {deductions.map((d, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fee2e2',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', backgroundColor: '#fecaca', padding: '2px 6px', borderRadius: '4px' }}>
                            {d.location}
                          </span>
                          <p style={{ margin: '6px 0 4px', fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                            “{d.originalSentence}”
                          </p>
                          <small style={{ fontSize: '12.5px', color: '#7f1d1d' }}>{d.critique}</small>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>
                          {d.penaltyScore > 0 ? `-${d.penaltyScore}점` : `${d.penaltyScore}점`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. 1:1 문단 리라이팅 비교 */}
              {rewrite && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                    감점 문단 비포 · 애프터 비교
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: '#fff1f2',
                        border: '1px solid #ffe4e6',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48' }}>학생 원문 발췌</span>
                      <p style={{ margin: '8px 0', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                        {rewrite.beforeText}
                      </p>
                      <small style={{ color: '#be123c', fontSize: '12px' }}>사유: {rewrite.flawReason}</small>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #dcfce7',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>AI 개선 재작성 문장</span>
                      <p style={{ margin: '8px 0', fontSize: '13px', color: '#14532d', lineHeight: 1.6, fontWeight: 500 }}>
                        {rewrite.afterText}
                      </p>
                      <small style={{ color: '#15803d', fontSize: '12px' }}>✓ 출제 의도에 부합하도록 쟁점 대립 명료화</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* [탭 2: 수험생 작성 답안 원문] */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                    수험생 제출 답안
                  </strong>
                  <span style={{ marginLeft: '10px', fontSize: '13px', color: '#64748b' }}>
                    총 <strong>{charCount}</strong>자
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopyAnswer}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} /> {copied ? '복사 완료!' : '답안 복사'}
                  </button>

                  {onLoadAnswer && (
                    <button
                      type="button"
                      onClick={handleLoadAnswer}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={13} /> 작성 창으로 불러와 수정하기
                    </button>
                  )}
                </div>
              </div>

              {/* 답안 텍스트 뷰어 */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  padding: '24px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  fontSize: '15px',
                  lineHeight: '1.9',
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  minHeight: '260px',
                }}
              >
                {studentAnswer || '(저장된 답안 내용이 없습니다.)'}
              </div>
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
          {onLoadAnswer && studentAnswer ? (
            <button
              type="button"
              onClick={handleLoadAnswer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> 이 답안을 작성 영역에 불러와 다시 쓰기
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
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
