'use client'

/**
 * @file app/admin/components/TrendsManager.tsx
 * @description 관리자 페이지 - 탭 2 출제 경향 및 유형 분석(university_trends) 조회/수정/삭제/신규등록 컴포넌트
 */

import React, { useState } from 'react'
import {
  Layers,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Save,
  X,
  BookOpen,
  Sparkles,
  Tag,
  ListPlus
} from 'lucide-react'

export interface TrendRow {
  id?: string
  univ_id?: string
  question_number: string
  question_type: string
  exam_time: string
  score_weight: string
  question_template: string
  passage_structure: {
    base: string
    targets: string
  }
  description: string
  writing_formula: {
    step: string
    title: string
    desc: string
    charGuide: string
  }[]
  frequent_themes: string[]
}

interface TrendsManagerProps {
  univId: string
  univName: string
  trends: TrendRow[]
  isLoading: boolean
  onRefresh: () => void
  showNotice: (type: 'success' | 'error', msg: string) => void
}

export default function TrendsManager({
  univId,
  univName,
  trends,
  isLoading,
  onRefresh,
  showNotice
}: TrendsManagerProps) {
  // 모달 상태
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 폼 입력 상태
  const [currentId, setCurrentId] = useState<string | undefined>(undefined)
  const [questionNumber, setQuestionNumber] = useState<string>('문항 1')
  const [questionType, setQuestionType] = useState<string>('')
  const [examTime, setExamTime] = useState<string>('권장 40분')
  const [scoreWeight, setScoreWeight] = useState<string>('30점 / 총 100점')
  const [questionTemplate, setQuestionTemplate] = useState<string>('')
  const [passageBase, setPassageBase] = useState<string>('')
  const [passageTargets, setPassageTargets] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [writingFormula, setWritingFormula] = useState<
    Array<{ step: string; title: string; desc: string; charGuide: string }>
  >([
    { step: '1단계', title: '핵심 쟁점 제시 및 기준 설정', desc: '제시문 (가)의 핵심 논지를 도출하여 분석의 평가 잣대로 세웁니다.', charGuide: '100~150자' },
    { step: '2단계', title: '대상 제시문별 다각도 비교·대조', desc: '제시문 (나), (다)의 관점을 기준에 맞추어 상호 대조하고 비판적으로 검토합니다.', charGuide: '200~250자' },
    { step: '3단계', title: '종합 귀결 및 결론 도출', desc: '비교 결과를 바탕으로 최종 결론 및 시사점을 압축 제시합니다.', charGuide: '100~150자' }
  ])
  const [themesInput, setThemesInput] = useState<string>('')

  // 신규 등록 모달 열기
  const handleOpenAdd = () => {
    setIsEditing(false)
    setCurrentId(undefined)
    setQuestionNumber(`문항 ${trends.length + 1}`)
    setQuestionType('')
    setExamTime('권장 40분')
    setScoreWeight('30점 / 총 100점')
    setQuestionTemplate('[제시문 가]의 관점을 바탕으로 [제시문 나]와 [제시문 다]의 핵심 쟁점을 비교·분석하시오.')
    setPassageBase('제시문 (가): 이론적 평가 기준 및 핵심 원리 제시문')
    setPassageTargets('제시문 (나), (다): 현실 사례 및 대립 관점 적용 제시문')
    setDescription('')
    setWritingFormula([
      { step: '1단계', title: '핵심 쟁점 제시 및 기준 설정', desc: '제시문 (가)의 핵심 논지를 도출하여 분석의 평가 잣대로 세웁니다.', charGuide: '100~150자' },
      { step: '2단계', title: '대상 제시문별 다각도 비교·대조', desc: '제시문 (나), (다)의 관점을 기준에 맞추어 상호 대조하고 비판적으로 검토합니다.', charGuide: '200~250자' },
      { step: '3단계', title: '종합 귀결 및 결론 도출', desc: '비교 결과를 바탕으로 최종 결론 및 시사점을 압축 제시합니다.', charGuide: '100~150자' }
    ])
    setThemesInput('')
    setModalOpen(true)
  }

  // 기존 항목 수정 모달 열기
  const handleOpenEdit = (trend: TrendRow) => {
    setIsEditing(true)
    setCurrentId(trend.id)
    setQuestionNumber(trend.question_number || '')
    setQuestionType(trend.question_type || '')
    setExamTime(trend.exam_time || '')
    setScoreWeight(trend.score_weight || '')
    setQuestionTemplate(trend.question_template || '')
    setPassageBase(trend.passage_structure?.base || '')
    setPassageTargets(trend.passage_structure?.targets || '')
    setDescription(trend.description || '')
    setWritingFormula(
      trend.writing_formula && trend.writing_formula.length > 0
        ? [...trend.writing_formula]
        : [
            { step: '1단계', title: '도입 및 기준 제시', desc: '', charGuide: '100~150자' },
            { step: '2단계', title: '본문 비교 분석', desc: '', charGuide: '200~250자' },
            { step: '3단계', title: '결론 및 시사점', desc: '', charGuide: '100~150자' }
          ]
    )
    setThemesInput((trend.frequent_themes || []).join(', '))
    setModalOpen(true)
  }

  // 저장 (신규 등록 or 수정)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionNumber.trim() || !questionType.trim()) {
      showNotice('error', '문항 번호와 출제 유형명은 필수 입력 항목입니다.')
      return
    }

    setIsSubmitting(true)
    try {
      const frequent_themes = themesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        id: currentId,
        univ_id: univId,
        question_number: questionNumber.trim(),
        question_type: questionType.trim(),
        exam_time: examTime.trim(),
        score_weight: scoreWeight.trim(),
        question_template: questionTemplate.trim(),
        passage_structure: {
          base: passageBase.trim(),
          targets: passageTargets.trim()
        },
        description: description.trim(),
        writing_formula: writingFormula,
        frequent_themes
      }

      const res = await fetch('/api/admin/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showNotice('success', isEditing ? '출제 경향이 수정되었습니다.' : '새 출제 경향이 등록되었습니다.')
        setModalOpen(false)
        onRefresh()
      } else {
        showNotice('error', `저장 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `네트워크 오류: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 단건 삭제
  const handleDelete = async (id?: string, qNum?: string) => {
    if (!id) return
    if (!confirm(`'${qNum || '해당 문항'}' 출제 경향 항목을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return

    try {
      const res = await fetch(`/api/admin/trends?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        showNotice('success', '출제 경향 항목이 삭제되었습니다.')
        onRefresh()
      } else {
        showNotice('error', `삭제 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `삭제 오류: ${err.message}`)
    }
  }

  // 작성 공식 단계 추가
  const handleAddFormulaStep = () => {
    const nextIdx = writingFormula.length + 1
    setWritingFormula([
      ...writingFormula,
      { step: `${nextIdx}단계`, title: '', desc: '', charGuide: '100~200자' }
    ])
  }

  // 작성 공식 단계 삭제
  const handleRemoveFormulaStep = (index: number) => {
    setWritingFormula(writingFormula.filter((_, i) => i !== index))
  }

  // 작성 공식 단계 수정
  const handleUpdateFormulaStep = (index: number, field: string, val: string) => {
    const updated = [...writingFormula]
    updated[index] = { ...updated[index], [field]: val }
    setWritingFormula(updated)
  }

  return (
    <section className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 상단 헤더 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers className="text-blue-600" size={20} />
            {univName} 등록 출제 경향 및 유형 분석 목록 ({trends.length}건)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            학생들이 [탭 2: 출제 경향 및 유형 분석]에서 확인하는 공식 문항별 출제 공식, 제시문 구조, 3단계 작성 공식입니다.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="admin-btn-secondary"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="admin-btn-primary"
          >
            <Plus size={16} />
            새 출제 경향 등록
          </button>
        </div>
      </div>

      {/* 로딩 / 빈 상태 / 카드 목록 */}
      {isLoading ? (
        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            Supabase DB에서 출제 경향 데이터를 불러오는 중입니다...
          </div>
        </div>
      ) : trends.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '56px 20px' }}>
          <BookOpen size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: 0 }}>
            {univName}에 등록된 출제 경향 분석 데이터가 없습니다.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 16px' }}>
            우측 상단의 '+ 새 출제 경향 등록'을 눌러 직접 추가하거나, 올인원 추출기에서 영향평가서를 첨부해 자동 생성하세요.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="admin-btn-primary"
            style={{ margin: '0 auto' }}
          >
            <Plus size={15} />
            첫 번째 문항 출제 경향 추가
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {trends.map((trend, idx) => (
            <div
              key={trend.id || idx}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* 카드 상단: 문항 태그, 시간, 배점 & 관리 액션 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #dbeafe'
                    }}
                  >
                    {trend.question_number}
                  </span>
                  {trend.exam_time && (
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                      ⏱️ {trend.exam_time}
                    </span>
                  )}
                  {trend.score_weight && (
                    <span style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 700 }}>
                      ⚖️ {trend.score_weight}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(trend)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={13} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(trend.id, trend.question_number)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#dc2626',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    삭제
                  </button>
                </div>
              </div>

              {/* 출제 유형명 */}
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {trend.question_type}
              </h4>

              {/* 1. 발문 출제 공식 */}
              {trend.question_template && (
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                    📋 전형적 문제 출제 공식 (발문 형식):
                  </span>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#1e293b', lineHeight: 1.55 }}>
                    {trend.question_template}
                  </p>
                </div>
              )}

              {/* 2. 제시문 구성 체계 */}
              {(trend.passage_structure?.base || trend.passage_structure?.targets) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {trend.passage_structure?.base && (
                    <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '3px' }}>
                        기준 제시문
                      </span>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#14532d', lineHeight: 1.45 }}>
                        {trend.passage_structure.base}
                      </p>
                    </div>
                  )}
                  {trend.passage_structure?.targets && (
                    <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309', display: 'block', marginBottom: '3px' }}>
                        적용 대상 제시문
                      </span>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#78350f', lineHeight: 1.45 }}>
                        {trend.passage_structure.targets}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. 일반 설명 */}
              {trend.description && (
                <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
                  {trend.description}
                </p>
              )}

              {/* 4. 3단계 작성 공식 */}
              {trend.writing_formula && trend.writing_formula.length > 0 && (
                <div>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    ✍️ 고득점 {trend.writing_formula.length}단계 작성 공식:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: '8px' }}>
                    {trend.writing_formula.map((step, sIdx) => (
                      <div key={sIdx} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#2563eb' }}>{step.step}: {step.title}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>{step.charGuide}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. 빈출 키워드 태그 */}
              {trend.frequent_themes && trend.frequent_themes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px dashed #f1f5f9' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>💡 빈출 개념:</span>
                  {trend.frequent_themes.map((theme, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        fontSize: '11.5px',
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 등록 및 수정 모달 (Modal) */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
          className="animate-fadeIn"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {isEditing ? `출제 경향 수정 (${questionNumber})` : `새 출제 경향 등록 (${univName})`}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  학생들이 해당 대학 논술 유형을 체계적으로 대비할 수 있는 분석 데이터를 입력합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 문항 번호 / 출제 유형명 */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    문항 번호 *
                  </label>
                  <input
                    type="text"
                    value={questionNumber}
                    onChange={(e) => setQuestionNumber(e.target.value)}
                    placeholder="예: 문항 1"
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    출제 유형명 *
                  </label>
                  <input
                    type="text"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    placeholder="예: 인문계열 문항 1 - 다각도 비교·분석형"
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              {/* 권장 시험시간 / 배점 가중 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    권장 시험 시간
                  </label>
                  <input
                    type="text"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    placeholder="예: 권장 40분 또는 600~800자"
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    배점 가중치
                  </label>
                  <input
                    type="text"
                    value={scoreWeight}
                    onChange={(e) => setScoreWeight(e.target.value)}
                    placeholder="예: 30점 / 총 100점 또는 배점 40%"
                    className="admin-input"
                  />
                </div>
              </div>

              {/* 전형적 발문 출제 공식 (템플릿) */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  📋 전형적 문제 출제 공식 (발문 형식)
                </label>
                <textarea
                  value={questionTemplate}
                  onChange={(e) => setQuestionTemplate(e.target.value)}
                  placeholder="예: [제시문 가]의 핵심 논지를 바탕으로 [제시문 나]의 인물 행위를 비판하고..."
                  className="admin-input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* 제시문 구성 체계 (기준 / 대상) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    🧩 기준 제시문 구성
                  </label>
                  <input
                    type="text"
                    value={passageBase}
                    onChange={(e) => setPassageBase(e.target.value)}
                    placeholder="예: 제시문 (가): 이론적 평가 기준"
                    className="admin-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    🧩 적용 대상 제시문 구성
                  </label>
                  <input
                    type="text"
                    value={passageTargets}
                    onChange={(e) => setPassageTargets(e.target.value)}
                    placeholder="예: 제시문 (나), (다): 현실 쟁점 및 사례"
                    className="admin-input"
                  />
                </div>
              </div>

              {/* 일반적 출제 경향 설명 */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  출제 경향 상세 설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="해당 문항의 출제 의도, 최근 빈출 패턴, 수험생 유의사항 등을 서술하세요."
                  className="admin-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* 고득점 3단계 작성 공식 */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} /> 단계별 작성 공식 & 분량 가이드
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFormulaStep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                  >
                    <ListPlus size={13} />
                    단계 추가
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {writingFormula.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 140px 100px 1fr 32px',
                        gap: '8px',
                        alignItems: 'center',
                        background: '#ffffff',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <input
                        type="text"
                        value={step.step}
                        onChange={(e) => handleUpdateFormulaStep(idx, 'step', e.target.value)}
                        placeholder="1단계"
                        className="admin-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => handleUpdateFormulaStep(idx, 'title', e.target.value)}
                        placeholder="단계 제목"
                        className="admin-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        value={step.charGuide}
                        onChange={(e) => handleUpdateFormulaStep(idx, 'charGuide', e.target.value)}
                        placeholder="150자"
                        className="admin-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        value={step.desc}
                        onChange={(e) => handleUpdateFormulaStep(idx, 'desc', e.target.value)}
                        placeholder="단계별 상세 작성 전략 설명"
                        className="admin-input"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFormulaStep(idx)}
                        disabled={writingFormula.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: writingFormula.length <= 1 ? '#cbd5e1' : '#dc2626',
                          cursor: writingFormula.length <= 1 ? 'not-allowed' : 'pointer',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 대표 빈출 핵심 개념 (태그) */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  <Tag size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  대표 빈출 핵심 개념 (쉼표로 구분하여 입력)
                </label>
                <input
                  type="text"
                  value={themesInput}
                  onChange={(e) => setThemesInput(e.target.value)}
                  placeholder="예: 공리주의, 롤스 정의론, 다수결 원리와 민주주의, 과학기술 윤리"
                  className="admin-input"
                />
              </div>

              {/* 하단 모달 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="admin-btn-secondary"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmitting}
                >
                  <Save size={15} />
                  {isSubmitting ? '저장 중...' : isEditing ? '수정사항 저장' : '출제 경향 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
