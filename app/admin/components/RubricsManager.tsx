'use client'

/**
 * @file app/admin/components/RubricsManager.tsx
 * @description 관리자 페이지 - 탭 3 배점 체계(scoring_rules) 및 공식 루브릭(university_rubrics) 조회/수정/삭제/신규등록 컴포넌트
 */

import React, { useState } from 'react'
import {
  Award,
  GraduationCap,
  Sparkles,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Save,
  X,
  ListPlus,
  Layers
} from 'lucide-react'

export interface ScoringRuleRow {
  id?: string
  univ_id?: string
  faculty: string
  chip?: string
  score: string
  sub_desc?: string
  display_order?: number
}

export interface RubricRow {
  id?: string
  univ_id?: string
  ratio: string
  category: string
  description?: string
  details: string[]
  display_order?: number
}

interface RubricsManagerProps {
  univId: string
  univName: string
  scoringRules: ScoringRuleRow[]
  rubrics: RubricRow[]
  isLoading: boolean
  onRefresh: () => void
  showNotice: (type: 'success' | 'error', msg: string) => void
}

export default function RubricsManager({
  univId,
  univName,
  scoringRules,
  rubrics,
  isLoading,
  onRefresh,
  showNotice
}: RubricsManagerProps) {
  // =========================================================================
  // 1. 배점 체계(Scoring Rule) 모달 상태 및 폼
  // =========================================================================
  const [scoringModalOpen, setScoringModalOpen] = useState<boolean>(false)
  const [isEditingScoring, setIsEditingScoring] = useState<boolean>(false)
  const [isSubmittingScoring, setIsSubmittingScoring] = useState<boolean>(false)

  const [scoringId, setScoringId] = useState<string | undefined>(undefined)
  const [scoringFaculty, setScoringFaculty] = useState<string>('')
  const [scoringChip, setScoringChip] = useState<string>('공통 평가')
  const [scoringScore, setScoringScore] = useState<string>('')
  const [scoringSubDesc, setScoringSubDesc] = useState<string>('')
  const [scoringOrder, setScoringOrder] = useState<number>(1)

  const handleOpenAddScoring = () => {
    setIsEditingScoring(false)
    setScoringId(undefined)
    setScoringFaculty('인문계열 (공통)')
    setScoringChip('공통 평가')
    setScoringScore('총점 100점 (문제 1: 30점 / 문제 2: 35점 / 문제 3: 35점)')
    setScoringSubDesc('입시요강에 명시된 문항별 배점 가중치를 고르게 평가합니다.')
    setScoringOrder(scoringRules.length + 1)
    setScoringModalOpen(true)
  }

  const handleOpenEditScoring = (rule: ScoringRuleRow) => {
    setIsEditingScoring(true)
    setScoringId(rule.id)
    setScoringFaculty(rule.faculty || '')
    setScoringChip(rule.chip || '')
    setScoringScore(rule.score || '')
    setScoringSubDesc(rule.sub_desc || '')
    setScoringOrder(rule.display_order || 1)
    setScoringModalOpen(true)
  }

  const handleSaveScoring = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoringFaculty.trim() || !scoringScore.trim()) {
      showNotice('error', '모집 계열과 배점 체계는 필수 항목입니다.')
      return
    }

    setIsSubmittingScoring(true)
    try {
      const payload = {
        targetType: 'scoring',
        univ_id: univId,
        item: {
          id: scoringId,
          faculty: scoringFaculty.trim(),
          chip: scoringChip.trim(),
          score: scoringScore.trim(),
          sub_desc: scoringSubDesc.trim(),
          display_order: scoringOrder
        }
      }

      const res = await fetch('/api/admin/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showNotice('success', isEditingScoring ? '배점 체계가 수정되었습니다.' : '새 배점 체계가 추가되었습니다.')
        setScoringModalOpen(false)
        onRefresh()
      } else {
        showNotice('error', `저장 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `네트워크 오류: ${err.message}`)
    } finally {
      setIsSubmittingScoring(false)
    }
  }

  const handleDeleteScoring = async (id?: string, faculty?: string) => {
    if (!id) return
    if (!confirm(`'${faculty || '해당 계열'}' 배점 체계 항목을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/admin/rubrics?id=${id}&type=scoring`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        showNotice('success', '배점 체계가 삭제되었습니다.')
        onRefresh()
      } else {
        showNotice('error', `삭제 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `삭제 오류: ${err.message}`)
    }
  }

  // =========================================================================
  // 2. 공식 루브릭(University Rubric) 모달 상태 및 폼
  // =========================================================================
  const [rubricModalOpen, setRubricModalOpen] = useState<boolean>(false)
  const [isEditingRubric, setIsEditingRubric] = useState<boolean>(false)
  const [isSubmittingRubric, setIsSubmittingRubric] = useState<boolean>(false)

  const [rubricId, setRubricId] = useState<string | undefined>(undefined)
  const [rubricRatio, setRubricRatio] = useState<string>('30%')
  const [rubricCategory, setRubricCategory] = useState<string>('')
  const [rubricDesc, setRubricDesc] = useState<string>('')
  const [rubricDetails, setRubricDetails] = useState<string[]>([
    '제시문의 핵심 쟁점과 논지를 왜곡 없이 정확하게 독해하였는가?',
    '문제의 요구 조건(비교, 비판, 대안 제시 등)을 빠짐없이 충족하였는가?'
  ])
  const [rubricOrder, setRubricOrder] = useState<number>(1)

  const handleOpenAddRubric = () => {
    setIsEditingRubric(false)
    setRubricId(undefined)
    setRubricRatio('30%')
    setRubricCategory('논리적 정합성 및 논증의 완성도')
    setRubricDesc('출제 의도에 부합하는 주장 전개와 논리적 비약 없는 정합성을 평가합니다.')
    setRubricDetails([
      '제시문의 핵심 논지를 왜곡 없이 정확히 파악하였는가?',
      '주장과 근거 간의 인과적 논리 구조가 명확한가?',
      '상반된 관점의 차이점을 다각적으로 대조 분석하였는가?'
    ])
    setRubricOrder(rubrics.length + 1)
    setRubricModalOpen(true)
  }

  const handleOpenEditRubric = (rubric: RubricRow) => {
    setIsEditingRubric(true)
    setRubricId(rubric.id)
    setRubricRatio(rubric.ratio || '')
    setRubricCategory(rubric.category || '')
    setRubricDesc(rubric.description || '')
    setRubricDetails(
      rubric.details && rubric.details.length > 0
        ? [...rubric.details]
        : ['평가 세부 지침을 입력하세요.']
    )
    setRubricOrder(rubric.display_order || 1)
    setRubricModalOpen(true)
  }

  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rubricRatio.trim() || !rubricCategory.trim()) {
      showNotice('error', '반영 비율과 평가 영역명은 필수 항목입니다.')
      return
    }

    setIsSubmittingRubric(true)
    try {
      const payload = {
        targetType: 'rubric',
        univ_id: univId,
        item: {
          id: rubricId,
          ratio: rubricRatio.trim(),
          category: rubricCategory.trim(),
          description: rubricDesc.trim(),
          details: rubricDetails.map((d) => d.trim()).filter(Boolean),
          display_order: rubricOrder
        }
      }

      const res = await fetch('/api/admin/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        showNotice('success', isEditingRubric ? '채점 기준 항목이 수정되었습니다.' : '새 채점 기준 항목이 추가되었습니다.')
        setRubricModalOpen(false)
        onRefresh()
      } else {
        showNotice('error', `저장 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `네트워크 오류: ${err.message}`)
    } finally {
      setIsSubmittingRubric(false)
    }
  }

  const handleDeleteRubric = async (id?: string, category?: string) => {
    if (!id) return
    if (!confirm(`'${category || '해당 채점 기준'}' 항목을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/admin/rubrics?id=${id}&type=rubric`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        showNotice('success', '채점 기준 항목이 삭제되었습니다.')
        onRefresh()
      } else {
        showNotice('error', `삭제 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `삭제 오류: ${err.message}`)
    }
  }

  // 루브릭 세부 불릿 추가/삭제/수정
  const handleAddDetailBullet = () => {
    setRubricDetails([...rubricDetails, ''])
  }
  const handleRemoveDetailBullet = (idx: number) => {
    setRubricDetails(rubricDetails.filter((_, i) => i !== idx))
  }
  const handleUpdateDetailBullet = (idx: number, val: string) => {
    const updated = [...rubricDetails]
    updated[idx] = val
    setRubricDetails(updated)
  }

  return (
    <section className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 최상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="text-blue-600" size={20} />
            {univName} 등록 채점 기준 및 배점 체계 편집 ({scoringRules.length + rubrics.length}건)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            학생들이 [탭 3: 채점 기준 및 배점 체계]에서 확인하는 모집단위별 문항 배점 및 출제위원회 공식 루브릭 보드입니다.
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
        </div>
      </div>

      {isLoading ? (
        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            Supabase DB에서 채점 기준 데이터를 불러오는 중입니다...
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 섹션 1: 모집단위별 문항 배점 체계 (scoring_rules) */}
          {/* ========================================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap className="text-blue-600" size={18} />
                  1. 모집단위별 문항 배점 체계 ({scoringRules.length}건)
                </h4>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  단과대별 배점 가중치 및 문항별 점수 배분 공식입니다.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenAddScoring}
                className="admin-btn-primary"
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                <Plus size={14} />
                새 배점 체계 추가
              </button>
            </div>

            {scoringRules.length === 0 ? (
              <div style={{ padding: '28px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 600 }}>
                  등록된 모집단위별 배점 체계가 없습니다.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddScoring}
                  className="admin-btn-secondary"
                  style={{ marginTop: '10px', fontSize: '12px' }}
                >
                  <Plus size={13} /> 배점 체계 항목 추가
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {scoringRules.map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                          {rule.faculty}
                        </span>
                        {rule.chip && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#1d4ed8',
                              background: '#eff6ff',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              border: '1px solid #dbeafe'
                            }}
                          >
                            {rule.chip}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#2563eb', marginBottom: '6px' }}>
                        ⚖️ {rule.score}
                      </div>
                      {rule.sub_desc && (
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                          {rule.sub_desc}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditScoring(rule)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={12} />
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScoring(rule.id, rule.faculty)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#dc2626',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 섹션 2: 출제위원회 공식 채점 기준표 루브릭 보드 (university_rubrics) */}
          {/* ========================================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles className="text-blue-600" size={18} />
                  2. 출제위원회 공식 채점 기준표 (루브릭 보드) ({rubrics.length}건)
                </h4>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  평가 영역별 반영 비율, 평가 개요 및 세부 감점 방지 원칙입니다.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenAddRubric}
                className="admin-btn-primary"
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                <Plus size={14} />
                새 루브릭 추가
              </button>
            </div>

            {rubrics.length === 0 ? (
              <div style={{ padding: '32px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 600 }}>
                  등록된 공식 채점 기준표(루브릭)가 없습니다.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddRubric}
                  className="admin-btn-secondary"
                  style={{ marginTop: '10px', fontSize: '12px' }}
                >
                  <Plus size={13} /> 첫 번째 루브릭 평가 항목 추가
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {rubrics.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      {/* 비율 & 액션 버튼 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            border: '1px solid #bfdbfe'
                          }}
                        >
                          {item.ratio}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRubric(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} />
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRubric(item.id, item.category)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                            삭제
                          </button>
                        </div>
                      </div>

                      {/* 평가 영역명 */}
                      <h4 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                        {item.category}
                      </h4>

                      {/* 설명 */}
                      {item.description && (
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                          {item.description}
                        </p>
                      )}

                      {/* 세부 불릿 리스트 */}
                      {item.details && item.details.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {item.details.map((detail, dIdx) => (
                            <li key={dIdx} style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45 }}>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 1. 배점 체계 모달 (Scoring Rule Modal) */}
      {/* ========================================================================= */}
      {scoringModalOpen && (
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
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '26px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {isEditingScoring ? `배점 체계 수정 (${scoringFaculty})` : `새 배점 체계 등록 (${univName})`}
              </h3>
              <button
                type="button"
                onClick={() => setScoringModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveScoring} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    모집 계열 (단과대) *
                  </label>
                  <input
                    type="text"
                    value={scoringFaculty}
                    onChange={(e) => setScoringFaculty(e.target.value)}
                    placeholder="예: 인문I (문과대학/사범대학)"
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    특성 칩 태그
                  </label>
                  <input
                    type="text"
                    value={scoringChip}
                    onChange={(e) => setScoringChip(e.target.value)}
                    placeholder="예: 공통 평가, 인문학 집중"
                    className="admin-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  배점 체계 (총점 및 문항별 배점) *
                </label>
                <input
                  type="text"
                  value={scoringScore}
                  onChange={(e) => setScoringScore(e.target.value)}
                  placeholder="예: 총점 100점 (문제 1: 30점 / 문제 2: 35점 / 문제 3: 35점)"
                  className="admin-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  세부 평가 안내 (설명)
                </label>
                <textarea
                  value={scoringSubDesc}
                  onChange={(e) => setScoringSubDesc(e.target.value)}
                  placeholder="예: 문학, 철학, 역사 제재 중심의 텍스트 독해 및 인문학적 추론 능력을 중점 평가합니다."
                  className="admin-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setScoringModalOpen(false)}
                  className="admin-btn-secondary"
                  disabled={isSubmittingScoring}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmittingScoring}
                >
                  <Save size={14} />
                  {isSubmittingScoring ? '저장 중...' : isEditingScoring ? '수정사항 저장' : '배점 체계 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 루브릭 모달 (Rubric Modal) */}
      {/* ========================================================================= */}
      {rubricModalOpen && (
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
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '26px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {isEditingRubric ? `채점 기준표 수정 (${rubricCategory})` : `새 채점 기준표 등록 (${univName})`}
              </h3>
              <button
                type="button"
                onClick={() => setRubricModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRubric} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    반영 비율 *
                  </label>
                  <input
                    type="text"
                    value={rubricRatio}
                    onChange={(e) => setRubricRatio(e.target.value)}
                    placeholder="예: 40% 또는 30점"
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    평가 영역명 *
                  </label>
                  <input
                    type="text"
                    value={rubricCategory}
                    onChange={(e) => setRubricCategory(e.target.value)}
                    placeholder="예: 논리적 정합성 및 논증 완성도"
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  평가 영역 개요 설명
                </label>
                <textarea
                  value={rubricDesc}
                  onChange={(e) => setRubricDesc(e.target.value)}
                  placeholder="해당 평가 영역의 핵심 취지를 요약하세요."
                  className="admin-input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* 세부 평가 지침 불릿 리스트 */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e3a8a' }}>
                    📋 세부 감점 방지 원칙 (불릿 리스트)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddDetailBullet}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                  >
                    <ListPlus size={12} />
                    지침 항목 추가
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rubricDetails.map((detail, dIdx) => (
                    <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
                      <input
                        type="text"
                        value={detail}
                        onChange={(e) => handleUpdateDetailBullet(dIdx, e.target.value)}
                        placeholder="세부 평가 또는 감점 방지 지침 입력"
                        className="admin-input"
                        style={{ padding: '6px 8px', fontSize: '12px', flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDetailBullet(dIdx)}
                        disabled={rubricDetails.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: rubricDetails.length <= 1 ? '#cbd5e1' : '#dc2626',
                          cursor: rubricDetails.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setRubricModalOpen(false)}
                  className="admin-btn-secondary"
                  disabled={isSubmittingRubric}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmittingRubric}
                >
                  <Save size={14} />
                  {isSubmittingRubric ? '저장 중...' : isEditingRubric ? '수정사항 저장' : '루브릭 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
