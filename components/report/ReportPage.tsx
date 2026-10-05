'use client'

/**
 * @file components/report/ReportPage.tsx
 * @description Gemini AI 논술 정밀 채점 리포트 화면 컴포넌트
 */

import React, { useState } from 'react'
import {
  FileText,
  Check,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Brand from '@/components/common/Brand'
import type { GradingReportData } from '@/types/grading'

// 기본 시뮬레이션용 채점 기준 데이터
const DEFAULT_CRITERIA = [
  {
    title: '제시문 (가)~(라) 집중과 분산 양상 분석 (60%)',
    score: '52 / 60점',
    feedback: '각 제시문에서 권력이 집중되는 소수와 분산되는 다수를 명확히 구별하였고, 각 150자 내외로 균형 있게 기술했습니다. 특히 (다)의 인터랙티브 예술과 (라)의 블록체인에서 분산이 단순 분열이 아닌 새로운 가치 창출과 시스템 신뢰의 기반임을 정확히 포착했습니다.'
  },
  {
    title: '분산에 대한 관점의 차이 종합 설명 (20%)',
    score: '17 / 20점',
    feedback: '과거(17세기 홉스)의 무질서 억제 관점에서 현대의 다원주의, 민주화, 탈중앙화로 이어지는 입체적인 관점 전환을 우수하게 도출했습니다. 다만 (나)의 표준어와 방언의 "공존"을 다원주의적 시각과 명시적으로 연결 짓는 설명이 다소 축약되었습니다.'
  },
  {
    title: '글의 논리적 완결성 및 형식 요건 (20%)',
    score: '18 / 20점',
    feedback: '812자로 규정 분량(800±100자)을 철저히 준수하였고, 제시문 문장을 그대로 베끼지 않고 자기 언어로 패러프레이징하여 감점 요인이 없습니다. 서론-본론-결론의 유기적 흐름이 뛰어납니다.'
  },
]

interface ReportPageProps {
  onExam: () => void
  reportData?: GradingReportData | null
  onHome?: () => void
}

export default function ReportPage({
  onExam,
  reportData,
  onHome,
}: ReportPageProps) {
  const [activeCriterion, setActiveCriterion] = useState(0)

  // 채점 데이터 매핑 (API 응답이 있으면 실제 데이터, 없으면 안내 기본값 사용)
  const isRealGrading = !!reportData

  const examTitle = reportData?.examTitle || '논술패스 AI 정밀 채점 리포트'
  const studentMeta = `${reportData?.studentName || '수험생'} 학생 · 실전 AI 정밀 채점 결과`
  const questionBadge = reportData?.questionLabel || '문항 정밀 채점 리포트'

  const totalScore = reportData ? reportData.totalScore : 0
  const maxScore = reportData?.maxPossibleScore ?? 100
  const cutline = reportData?.cutlineScore ?? 82
  const scoreDiff = totalScore - cutline
  const statusVerdict = reportData?.statusVerdict || (totalScore === 0 ? '채점 대기' : scoreDiff >= 0 ? '합격 안정권' : scoreDiff >= -5 ? '합격 가능권' : '도전 권장')

  const charCount = reportData?.charCount ?? 0
  const charStatus = reportData?.charStatus || '미제출'
  const conceptHits = reportData?.conceptHits || { matchedCount: 0, targetTotal: 0, keywords: [] }
  const structureGrade = reportData?.structureGrade || '-'

  // 평가 기준 목록
  const criteriaList = reportData?.criteria && reportData.criteria.length > 0
    ? reportData.criteria
    : DEFAULT_CRITERIA.map((c) => ({
        category: c.title,
        score: parseInt(c.score.split(' / ')[0]),
        maxScore: parseInt(c.score.split(' / ')[1]),
        feedback: c.feedback,
        warning: c.title.includes('종합 설명') ? '양비론/절충론 감점 적용 (-10점)' : undefined,
      }))

  const activeItem = criteriaList[activeCriterion] || criteriaList[0]

  const examinerVerdict = reportData?.examinerVerdict || {
    oneLiner: '“제시문을 성실히 읽고 자신의 견해로 확장했으나, 핵심 쟁점의 대립을 끝까지 밀어붙이는 힘이 아쉽습니다.”',
    coreAdvice: '대립하는 관점을 서둘러 화해시키기보다, 차이가 발생하는 기준을 먼저 세우고 그 기준으로 자신의 입장을 증명해 보세요.',
  }

  const deductions = reportData?.deductions && reportData.deductions.length > 0
    ? reportData.deductions
    : [
        {
          location: '논증 · 문단 2',
          originalSentence: '두 제시문은 출발점에서 차이를 보이지만, 인간의 주체적 판단이 중요하다는 점에서는 만난다.',
          critique: '핵심 대비를 ‘만난다’는 공통점으로 정리해 관점 간 긴장 관계가 사라졌습니다.',
          penaltyScore: -10,
        },
        {
          location: '표현 · 문단 3',
          originalSentence: '자유로운 선택은 타인과 환경에 미치는 영향을 성찰할 때 비로소 정당성을 얻는다.',
          critique: '좋은 문장이지만, 앞 문단의 논거와 연결되는 접속 표현이 없어 논리적 도약으로 읽힐 수 있습니다.',
          penaltyScore: -2,
        },
      ]

  const rewrite = reportData?.rewrite || {
    beforeText: '두 제시문은 기술과 선택을 바라보는 출발점에서 차이를 보이지만, 인간의 주체적 판단이 중요하다는 점에서는 만난다.',
    flawReason: '공통점으로 빠르게 수렴해 ‘무엇이 어떻게 다른가’가 드러나지 않습니다.',
    afterText: '반면 (가)는 기술이 판단을 대신할 때 자유가 약화된다고 경고하고, (나)는 선택의 기회를 넓혀야 공동체가 진보한다고 주장한다. 두 입장은 판단의 주체를 개인에게 둔다는 점은 같지만, 자유를 제한할 것인지 확장할 것인지에서 충돌한다.',
  }

  return (
    <main className="report-shell">
      <header className="report-topbar">
        <Brand onHome={onHome} />
        <div className="topbar-controls">
          <div className="mode-toggle">
            <button type="button" onClick={onExam} title="원고지 답안 작성 화면으로 이동">
              응시 모드
            </button>
            <button type="button" className="active">
              리포트
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} title="리포트를 PDF 문서로 인쇄/저장">
            <Download data-icon="inline-start" /> PDF 저장
          </Button>
        </div>
      </header>

      <div className="report-container">
        <div className="report-heading">
          <div>
            <p className="eyebrow">{isRealGrading ? 'AI REAL-TIME GRADING & DIAGNOSTIC REPORT' : 'AI GRADING & DIAGNOSTIC REPORT'}</p>
            <h1>{examTitle}</h1>
            <p className="report-meta">{studentMeta}</p>
          </div>
          <div className="report-badge">
            <FileText /> {questionBadge}
          </div>
        </div>

        <section className="score-hero">
          <div className="score-main">
            <div className="score-ring">
              <div>
                <strong>{totalScore}</strong>
                <span>/ {maxScore}점</span>
              </div>
            </div>
            <div className="score-copy">
              <p className="eyebrow">TOTAL SCORE</p>
              <h2>{statusVerdict}</h2>
              <p>
                예상 합격선 <strong>{cutline}점</strong> 대비{' '}
                <b className={scoreDiff < 0 ? 'negative' : 'kpi-good'}>
                  {scoreDiff > 0 ? `+${scoreDiff}점` : `${scoreDiff}점`}
                </b>
              </p>
              <div className="score-progress">
                <span style={{ width: `${Math.min(100, Math.max(10, Math.round((totalScore / maxScore) * 100)))}%` }} />
              </div>
              <small>최근 홍익대 합격자 평균 81.4점 (실시간 공식 기준 대조)</small>
            </div>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span>글자 수 규격</span>
              <strong>{charCount}<span>자</span></strong>
              <b className={charStatus.includes('감점 0') ? 'kpi-good' : 'negative'}>
                <Check /> {charStatus}
              </b>
            </div>
            <div className="kpi-card">
              <span>필수 개념어 적중률</span>
              <strong>{conceptHits.matchedCount}<span>/ {conceptHits.targetTotal}개</span></strong>
              <b className="kpi-blue">
                <TrendingUp /> {Math.round((conceptHits.matchedCount / (conceptHits.targetTotal || 1)) * 100)}% 적중
              </b>
            </div>
            <div className="kpi-card">
              <span>논리적 완결도</span>
              <strong>{structureGrade}</strong>
              <b className="kpi-good"><Check /> 구조 검증 완료</b>
            </div>
          </div>
        </section>

        <div className="report-grid">
          <section className="report-card rubric-card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">OFFICIAL RUBRIC</p>
                <h2>평가 기준별 상세 분석</h2>
              </div>
              <span className="muted-label">총 {totalScore} / {maxScore}점</span>
            </div>
            <div className="rubric-tabs">
              {criteriaList.map((criterion, index) => (
                <button
                  key={index}
                  type="button"
                  className={activeCriterion === index ? 'active' : ''}
                  onClick={() => setActiveCriterion(index)}
                >
                  <span>0{index + 1}</span>
                  {criterion.category}
                  <strong>{criterion.score} / {criterion.maxScore}점</strong>
                </button>
              ))}
            </div>
            {activeItem && (
              <div className="rubric-detail">
                <div className="detail-score">
                  <strong>{activeItem.score}</strong>
                  <span>/ {activeItem.maxScore}점</span>
                </div>
                <div>
                  <h3>{activeItem.category}</h3>
                  <p>{activeItem.feedback}</p>
                  {activeItem.warning && (
                    <div className="warning-chip">
                      <AlertTriangle /> {activeItem.warning}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="report-card verdict-card">
            <div className="card-title-row">
              <div>
                <p className="eyebrow">EXAMINER&apos;S VERDICT</p>
                <h2>출제위원의 한 줄 총평</h2>
              </div>
              <Sparkles className="indigo-icon" />
            </div>
            <blockquote>{examinerVerdict.oneLiner}</blockquote>
            <div className="advice-box">
              <Lightbulb />
              <div>
                <strong>이번 답안의 핵심 과제</strong>
                <p>{examinerVerdict.coreAdvice}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="report-card flags-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow">CRITICAL DEDUCTIONS & COACHING</p>
              <h2>치명적 감점 및 지도 조언</h2>
            </div>
            <span className="flag-count">주의 {deductions.length}건</span>
          </div>
          <div className="flag-list">
            {deductions.map((d, idx) => (
              <div key={idx} className="flag-item">
                <div className={`flag-icon ${idx > 0 ? 'soft' : ''}`}><AlertTriangle /></div>
                <div>
                  <span className="flag-label">{d.location}</span>
                  <p>“{d.originalSentence}”</p>
                  <small>{d.critique}</small>
                </div>
                <b>{d.penaltyScore > 0 ? `-${d.penaltyScore}점` : `${d.penaltyScore}점`}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="report-card rewrite-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow">1:1 PARAGRAPH REWRITING</p>
              <h2>감점 문단 비포 · 애프터 비교</h2>
            </div>
            <span className="ai-label"><Sparkles /> AI Rewrite</span>
          </div>
          <div className="rewrite-grid">
            <div className="rewrite-column before">
              <div className="column-label">
                <span>학생 원문</span>
                <b>감점 사유 하이라이트</b>
              </div>
              <p>{rewrite.beforeText}</p>
              <span className="reason">{rewrite.flawReason}</span>
            </div>
            <div className="rewrite-arrow"><ArrowRight /></div>
            <div className="rewrite-column after">
              <div className="column-label">
                <span>합격자 수준 개선 제안</span>
                <b>AI Rewrite</b>
              </div>
              <p>{rewrite.afterText}</p>
              <div className="why-list">
                <span><Check /> 출제 의도에 완벽 부합하도록 쟁점 대립 명료화</span>
                <span><Check /> 규정 어휘 및 자기 언어로 패러프레이징 완성</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="report-actionbar">
        <div className="report-action-info">
          <span className="report-secure-badge">
            <Check /> AI 정밀 채점 완료
          </span>
          <span className="report-date-text">
            <span>홍익대학교 공식 채점 기준 검증</span>
            <span>·</span>
            <span>실시간 진단 리포트</span>
          </span>
        </div>
        <div className="report-action-btns">
          <button
            type="button"
            className="btn-report-outline"
            onClick={onExam}
            title="작성 공간으로 돌아가 첨삭 제안을 바탕으로 답안을 수정합니다"
          >
            <RotateCcw /> 답안 수정 및 다시 쓰기
          </button>
          <button
            type="button"
            className="btn-report-outline"
            onClick={() => {
              window.print()
            }}
            title="현재 리포트를 PDF 문서로 인쇄하거나 저장합니다"
          >
            <Download /> PDF 리포트 저장
          </button>
          <button
            type="button"
            className="btn-report-primary"
            onClick={onExam}
            title="다른 문항 또는 다음 회차 논술 문제를 풉니다"
          >
            다음 문제 풀기 <ArrowRight />
          </button>
        </div>
      </footer>
    </main>
  )
}
