'use client'

/**
 * @file components/exam/ExamWorkspace.tsx
 * @description 논술 기출 및 모의고사 문제 응시, 제시문 독해 및 원고지 답안 작성 화면 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Clock3,
  Menu,
  FileText,
  Check,
  RotateCcw,
  Lightbulb,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Loader2,
  X,
  Copy,
  Sparkles,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Brand from '@/components/common/Brand'
import { getQuestionsData, fetchExamQuestionsFromDb, QuestionsMap } from '@/lib/exam-helper'
import type { GradingReportData } from '@/types/grading'

interface ExamWorkspaceProps {
  selectedUniv?: string
  selectedExamId?: string
  initialQuestion?: 'q1' | 'q2'
  onReport: (report?: GradingReportData) => void
  onBack?: () => void
  onHome?: () => void
}

export default function ExamWorkspace({
  selectedUniv = '홍익대학교',
  selectedExamId = 'hongik-2026-humanities-real',
  initialQuestion = 'q1',
  onReport,
  onBack,
  onHome,
}: ExamWorkspaceProps) {
  // 현재 응시 중인 대학명 (props와 동기화)
  const currentUniv = selectedUniv || (selectedExamId?.startsWith('khu') ? '경희대학교' : '홍익대학교')
  // 문제 1과 문제 2 탭 전환 상태 ('q1' | 'q2')
  const [activeQuestion, setActiveQuestion] = useState<'q1' | 'q2'>(initialQuestion)
  // 문제별 작성 답안 독립 관리 (공백 초기화)
  const [answers, setAnswers] = useState<{ q1: string; q2: string }>({ q1: '', q2: '' })
  const [showModelModal, setShowModelModal] = useState(false)
  const [showRubricModal, setShowRubricModal] = useState(false)

  // Gemini AI 정밀 채점 로딩 및 20초 지연 감지 상태
  const [isGrading, setIsGrading] = useState(false)
  const [gradingStep, setGradingStep] = useState(1)
  const [isGradingDelayed, setIsGradingDelayed] = useState(false)
  const [gradingNotice, setGradingNotice] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. 초기 렌더링: 로컬 프리셋으로 즉시 렌더링 (블랭크 화면 방지)
  const [questionsData, setQuestionsData] = useState<QuestionsMap>(() => getQuestionsData(selectedExamId))

  // 2. 비동기 DB 조회: Supabase DB에 등록된 questions(문항/제시문)가 있으면 실시간 동적 주입
  useEffect(() => {
    let isMounted = true
    if (selectedExamId) {
      fetchExamQuestionsFromDb(selectedExamId).then((dbData) => {
        if (isMounted && dbData) {
          setQuestionsData(dbData)
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [selectedExamId])

  const currentQ = questionsData[activeQuestion] || questionsData.q1
  const currentAnswer = answers[activeQuestion] || ''

  const handleAnswerChange = (val: string) => {
    setAnswers((prev) => ({ ...prev, [activeQuestion]: val }))
  }

  // 사용자가 채점을 취소하고 답안으로 돌아가기를 눌렀을 때의 핸들러
  const handleCancelGrading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current)
      delayTimerRef.current = null
    }
    setIsGrading(false)
    setIsGradingDelayed(false)
  }

  // 사용자가 계속 기다리기를 눌렀을 때 안내 박스를 숨기고 대기 유지
  const handleKeepWaiting = () => {
    setIsGradingDelayed(false)
  }

  // Gemini API를 호출하여 공식 채점 기준표에 따라 실시간 채점을 수행하는 핸들러
  const handleSubmitAndGrade = async () => {
    const trimmed = currentAnswer.trim()
    if (!trimmed || trimmed.length < 30) {
      alert('답안을 최소 30자 이상 작성하신 후 정밀 채점을 요청해 주세요.\n(원활한 채점을 위해 모범답안을 불러오거나 직접 서술해 보세요.)')
      return
    }

    setIsGrading(true)
    setGradingStep(1)
    setIsGradingDelayed(false)

    // 20초 이상 응답 지연 시 계속 기다리기/취소 선택 옵션 활성화
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
    delayTimerRef.current = setTimeout(() => {
      setIsGradingDelayed(true)
    }, 20000)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // 학생이 기다리는 동안 실시간 채점 진행 상태를 애니메이션으로 안내
    const t1 = setTimeout(() => setGradingStep(2), 2200)
    const t2 = setTimeout(() => setGradingStep(3), 4800)

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          university: currentUniv,
          examTitle: currentQ.tag || `${currentUniv} 수시 논술`,
          questionLabel: currentQ.label,
          questionTitle: currentQ.title,
          charLimit: currentQ.limit || '800±100자',
          passages: currentQ.passages,
          rubric: currentQ.rubric,
          modelAnswer: currentQ.modelAnswer,
          studentAnswer: currentAnswer,
          studentName: '수험생',
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error || '채점 분석 서버 응답 오류가 발생했습니다.')
      }

      const reportData: GradingReportData = await res.json()
      onReport(reportData)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('채점 요청이 사용자에 의해 안전하게 취소되었습니다.')
        return
      }
      console.warn('AI 채점 일시 지연 발생 (팝업창 자동 종료):', err)
      setGradingNotice('현재 AI 채점 서버 이용량이 많아 일시 지연되었습니다. 작성하신 답안은 안전하게 보존되어 있으니 잠시 후 다시 제출해 주세요.')
      setTimeout(() => {
        setGradingNotice(null)
      }, 6000)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }
      abortControllerRef.current = null
      setIsGrading(false)
      setIsGradingDelayed(false)
    }
  }

  return (
    <main className="exam-shell">
      <header className="topbar">
        <Brand onHome={onHome} />
        <div className="topbar-controls">
          <div className="mode-toggle">
            <button className="active">응시 모드</button>
            <button onClick={() => onReport()}>리포트</button>
          </div>
          <div className="timer">
            <Clock3 />
            <div>
              <span className="timer-label">남은 시간</span>
              <strong>00:54:12</strong>
            </div>
          </div>
          <button className="mobile-menu" aria-label="메뉴">
            <Menu />
          </button>
        </div>
      </header>

      <div className="context-bar">
        <div className="breadcrumb">
          논술패스 <span className="slash">/</span>{' '}
          {onBack ? (
            <button type="button" className="breadcrumb-link-btn" onClick={onBack} title={`${currentUniv} 분석 페이지로 이동`}>
              {currentUniv} 분석
            </button>
          ) : (
            <strong>{currentUniv}</strong>
          )}{' '}
          <span className="slash">/</span> <strong>{currentQ.tag || `2026학년도 ${currentUniv} 수시`}</strong>{' '}
          <span className="slash">/</span> {currentQ.label}
        </div>
        <div className="exam-status">
          <span className="status-dot" /> 자동 저장됨 <span className="divider" />{' '}
          {questionsData.q2 && questionsData.q2.passages && questionsData.q2.passages.length > 0
            ? activeQuestion === 'q1'
              ? '문제 1 / 2'
              : '문제 2 / 2'
            : '문제 1 / 1'}{' '}
          (소요 시간 60분)
        </div>
      </div>

      <div className="workspace">
        <section className="reading-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {currentUniv.includes('경희')
                  ? 'KYUNG HEE UNIVERSITY · ESSAY EXAM'
                  : currentUniv.includes('동국')
                  ? 'DONGGUK UNIVERSITY · ESSAY EXAM'
                  : currentUniv.includes('홍익')
                  ? 'HONGIK UNIVERSITY · ESSAY EXAM'
                  : `${currentUniv.toUpperCase()} · ESSAY EXAM`}
              </p>
              <h1>{currentQ.tag || `${currentUniv} 논술고사`}</h1>
            </div>
            <button className="icon-button" aria-label="읽기 도구">
              <FileText />
            </button>
          </div>
          <div className="question-tabs">
            <button
              className={activeQuestion === 'q1' ? 'active' : ''}
              onClick={() => setActiveQuestion('q1')}
            >
              {questionsData.q1.label} {answers.q1.trim().length > 0 && <span className="tab-check"><Check /></span>}
            </button>
            {questionsData.q2 && questionsData.q2.passages && questionsData.q2.passages.length > 0 && (
              <button
                className={activeQuestion === 'q2' ? 'active' : ''}
                onClick={() => setActiveQuestion('q2')}
              >
                {questionsData.q2.label} {answers.q2.trim().length > 0 && <span className="tab-check"><Check /></span>}
              </button>
            )}
          </div>
          <div className="reading-scroll">
            <article className="prompt-card">
              {(() => {
                const rawTitle = currentQ.title || ''
                const match = rawTitle.match(/^(【.*?】)(.*)/)
                const header = match ? match[1].trim() : (rawTitle.startsWith('【') ? rawTitle : `【${currentQ.label || '문제 1'}】`)
                const body = (match && match[2].trim()) ? match[2].trim() : (currentQ.note || '')
                return (
                  <>
                    <div className="prompt-title-row">
                      <h2>{header}</h2>
                    </div>
                    {body && <p className="prompt-body-text">{body}</p>}
                  </>
                )
              })()}
            </article>

            {/* 실제 기출 제시문 목록 */}
            <div className="passage-block">
              {currentQ.passages.map((p, idx) => (
                <section key={idx} className="passage-card">
                  <div className="passage-header">
                    <span className="passage-badge">{p.badge}</span>
                  </div>
                  <div className="passage-body">
                    {p.paragraphs.map((para, pIdx) => (
                      <p key={pIdx}>{para}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <div className="splitter">
          <span />
        </div>

        <section className="writing-panel">
          <div className="editor-heading">
            <div>
              <p className="eyebrow">ANSWER SHEET · 실전 답안 에디터</p>
              <h2 className="editor-main-title">나의 답안 작성</h2>
            </div>
            <div className="editor-top-actions">
              <button
                type="button"
                className="model-answer-btn"
                onClick={() => setShowModelModal(true)}
                title={`${currentQ.label} 공식 모범답안 보기`}
              >
                <BookOpen size={14} /> 모범답안 보기
              </button>
              <div className="editor-counts">
                <span className="count-badge active">
                  공백 제외 <strong>{currentAnswer.replace(/\s/g, '').length}</strong>자
                </span>
                <span className="count-badge sub">
                  공백 포함 {currentAnswer.length}자
                </span>
                <span className="count-rule">
                  규정: 700~900자 (800±100자)
                </span>
              </div>
            </div>
          </div>
          <div className="progress-track">
            <span style={{ width: `${Math.min(currentAnswer.replace(/\s/g, '').length / 9, 100)}%` }} />
          </div>

          <div className="editor-wrap">
            <textarea
              aria-label="나의 답안 작성"
              placeholder={currentQ.placeholder}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="editor-footer">
            <div className="save-state">
              <Check />
              <span>실시간 자동 저장 중</span>
              <small>방금 전</small>
            </div>
            <div className="editor-actions">
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(currentAnswer)
                  alert('답안이 클립보드에 복사되었습니다.')
                }}
                title="답안 클립보드 복사"
              >
                답안 복사
              </button>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => {
                  if (confirm(`${currentQ.label} 답안을 모두 지우고 새로 작성하시겠습니까?`)) {
                    handleAnswerChange('')
                  }
                }}
                title="답안 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 지우기
              </button>
            </div>
          </div>
          <div className="writing-tip">
            <Lightbulb />
            <p>
              <strong>{currentQ.tipTitle}</strong>
              <br />
              {currentQ.tipDesc}
            </p>
          </div>

          <div className="rubric-btn-wrap">
            <button
              type="button"
              className="rubric-open-btn"
              onClick={() => setShowRubricModal(true)}
              title={`${currentQ.label} 공식 채점 기준표 및 배점표 확인`}
            >
              <ClipboardList size={14} /> {currentQ.label} 공식 채점 기준표 보기
            </button>
          </div>
        </section>
      </div>

      <footer className="bottom-bar">
        <div className="bottom-bar-info">
          <span className="bottom-status-dot" />
          <strong>{currentQ.tag || `${currentUniv} 수시 논술`}</strong>
          <span className="slash">/</span>
          <span>{currentQ.label} 실전 답안 작성 중</span>
        </div>
        <div className="bottom-bar-actions">
          {gradingNotice && (
            <div className="grading-notice-banner">
              <AlertTriangle className="grading-notice-icon" />
              <span>{gradingNotice}</span>
            </div>
          )}
          <Button className="bottom-submit-btn" onClick={handleSubmitAndGrade} disabled={isGrading}>
            {isGrading ? <Loader2 className="animate-spin" size={16} /> : null}
            {isGrading ? 'AI 채점관 정밀 분석 진행 중...' : '답안 제출 후 정밀 채점 리포트 보기'} <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </footer>

      {/* 공식 모범답안 모달 */}
      {showModelModal && (
        <div className="model-modal-overlay" onClick={() => setShowModelModal(false)}>
          <div className="model-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="model-modal-header">
              <div className="model-modal-title">
                <span className="model-modal-pill">{currentQ.modalPill}</span>
                <h3>{currentQ.modalTitle}</h3>
                <p>{currentQ.modalLength}</p>
              </div>
              <button
                type="button"
                className="model-modal-close"
                onClick={() => setShowModelModal(false)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="model-modal-body">
              <div className="model-modal-callout">{currentQ.modalCallout}</div>
              <div className="model-modal-text">
                {currentQ.modelAnswer.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
            <div className="model-modal-footer">
              <button
                type="button"
                className="model-footer-btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(currentQ.modelAnswer)
                  alert('모범답안이 클립보드에 복사되었습니다.')
                }}
              >
                <Copy size={13} /> 모범답안 복사
              </button>
              <button
                type="button"
                className="model-footer-btn-apply"
                onClick={() => {
                  if (currentAnswer.trim() && !confirm('작성 중인 답안이 모범답안으로 대체됩니다. 계속하시겠습니까?')) {
                    return
                  }
                  handleAnswerChange(currentQ.modelAnswer)
                  setShowModelModal(false)
                }}
              >
                답안지에 불러오기
              </button>
              <button
                type="button"
                className="model-footer-btn-close"
                onClick={() => setShowModelModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공식 채점 기준표 팝업 모달 */}
      {showRubricModal && (
        <div className="model-modal-overlay" onClick={() => setShowRubricModal(false)}>
          <div className="rubric-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="model-modal-header">
              <div className="model-modal-title">
                <span className="model-modal-pill">{currentQ.modalPill || currentQ.label} 공식 채점표</span>
                <h3>{currentQ.tag || `${currentUniv} 논술`} {currentQ.label} 채점 기준표</h3>
                <p>{currentUniv} 입학처 공식 출제 문항카드 평가 기준 원문 반영</p>
              </div>
              <button
                type="button"
                className="model-modal-close"
                onClick={() => setShowRubricModal(false)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rubric-modal-body">
              <div className="rubric-faculty-badge">
                ⚖️ <strong>단과대학별 가중 배점 안내:</strong> {currentQ.rubric.facultyWeight}
              </div>

              <div className="rubric-table-wrap">
                <table className="rubric-table">
                  <thead>
                    <tr>
                      <th style={{ width: '24%' }}>평가 영역</th>
                      <th style={{ width: '20%' }}>평가 대상</th>
                      <th style={{ width: '44%' }}>세부 채점 기준 및 핵심 도출 내용</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>배점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQ.rubric.items.map((sec, sIdx) =>
                      sec.subItems.map((sub, subIdx) => (
                        <tr key={`${sIdx}-${subIdx}`}>
                          {subIdx === 0 && (
                            <td rowSpan={sec.subItems.length} className="rubric-sec-title">
                              {sec.category}
                            </td>
                          )}
                          <td className="rubric-item-name">{sub.name}</td>
                          <td className="rubric-item-desc">{sub.desc}</td>
                          <td className="rubric-item-points">{sub.points}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rubric-deduction-card">
                <h4>⚠️ 출제위원 감점 유의사항 (공통)</h4>
                <ul>
                  {currentQ.rubric.deductions.map((d, dIdx) => (
                    <li key={dIdx}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="model-modal-footer">
              <button
                type="button"
                className="model-footer-btn-close"
                onClick={() => setShowRubricModal(false)}
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 채점 진행 오버레이 모달 */}
      {isGrading && (
        <div className="grading-loading-overlay">
          <div className="grading-loading-card">
            <div className="grading-spinner-wrap">
              <div className="grading-spinner-ring" />
              <Sparkles className="grading-spinner-icon" />
            </div>
            <h3 className="grading-loading-title">출제위원 AI가 정밀 채점 중입니다</h3>
            <p className="grading-loading-desc">
              공식 문항 채점 기준표 및 감점 방지 원칙에 입각하여 학생 답안을 꼼꼼하게 대조·평가하고 있습니다.
            </p>
            <div className="grading-steps-list">
              <div className={`grading-step-row ${gradingStep >= 1 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>1단계: 발문 요구조건 부합도 및 제시문 독해 분석</span>
              </div>
              <div className={`grading-step-row ${gradingStep >= 2 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>2단계: 대학 공식 채점 기준표 항목별 배점 산출</span>
              </div>
              <div className={`grading-step-row ${gradingStep >= 3 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>3단계: 감점 요인 적발 및 1:1 합격자 수준 첨삭(Rewrite) 생성</span>
              </div>
            </div>

            {/* 20초 이상 응답 지연 시 계속 기다리기 / 취소 선택 옵션 */}
            {isGradingDelayed && (
              <div className="grading-delay-box">
                <div className="grading-delay-header">
                  <Clock3 className="grading-delay-icon" />
                  <span>분석량이 많아 심층 채점이 진행 중입니다</span>
                </div>
                <p className="grading-delay-desc">
                  공식 채점 기준 대조 및 1:1 맞춤 첨삭문 생성에 시간이 조금 더 소요되고 있습니다. 계속 기다리시거나 취소 후 답안으로 돌아가실 수 있습니다.
                </p>
                <div className="grading-delay-actions">
                  <button
                    type="button"
                    className="grading-btn-wait"
                    onClick={handleKeepWaiting}
                  >
                    계속 기다리기
                  </button>
                  <button
                    type="button"
                    className="grading-btn-cancel"
                    onClick={handleCancelGrading}
                  >
                    취소하고 답안으로 돌아가기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
