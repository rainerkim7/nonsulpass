'use client'

import React from 'react'
import {
  Edit3,
  UploadCloud,
  Trash2,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Plus
} from 'lucide-react'

export interface ExamPassage {
  badge: string
  paragraphs: string[]
}

export interface ExamQuestionItem {
  id?: string
  label?: string
  title?: string
  note?: string
  passages: ExamPassage[]
  [key: string]: any
}

interface ExamInlineEditorProps {
  currentQ: ExamQuestionItem
  isUploadingImage: boolean
  onTriggerPromptUpload: (position: 'top' | 'bottom') => void
  onUpdateTitle: (title: string) => void
  onUpdateNote: (note: string) => void
  onRemovePromptImage: (targetMarkdown: string) => void
  onUpdatePassageBadge: (pIdx: number, badge: string) => void
  onDeletePassage: (pIdx: number) => void
  onUpdateParagraph: (pIdx: number, paraIdx: number, text: string) => void
  onMoveParagraphUp: (pIdx: number, paraIdx: number) => void
  onMoveParagraphDown: (pIdx: number, paraIdx: number) => void
  onDeleteParagraph: (pIdx: number, paraIdx: number) => void
  onTriggerPassageUpload: (pIdx: number, position: 'top' | 'bottom') => void
  onAddParagraph: (pIdx: number) => void
  onAddPassage: () => void
}

/**
 * @name ExamInlineEditor
 * @description 관리자 전용 문항 인라인 편집기 컴포넌트
 * 발문(제목 및 본문), 도표 첨부/순서 배치, 제시문 뱃지 및 단락 편집 기능을 독립적으로 제공합니다.
 */
export default function ExamInlineEditor({
  currentQ,
  isUploadingImage,
  onTriggerPromptUpload,
  onUpdateTitle,
  onUpdateNote,
  onRemovePromptImage,
  onUpdatePassageBadge,
  onDeletePassage,
  onUpdateParagraph,
  onMoveParagraphUp,
  onMoveParagraphDown,
  onDeleteParagraph,
  onTriggerPassageUpload,
  onAddParagraph,
  onAddPassage
}: ExamInlineEditorProps) {
  return (
    <div className="admin-inline-editor">
      {/* 1. 발문 편집 카드 (문제 제목 및 유의사항, 문제 위/아래 도표 배치) */}
      <article
        className="prompt-card"
        style={{
          border: '2px dashed #818cf8',
          backgroundColor: '#f8faff',
          padding: '18px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit3 size={14} className="text-indigo-600" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#4338ca' }}>
              발문 및 문제 지시사항 편집
            </span>
          </div>

          {/* 문제(발문) 위/아래 도표 첨부 버튼 그룹 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onTriggerPromptUpload('top')}
              disabled={isUploadingImage}
              title="문제(발문) 텍스트보다 위에 도표·그래프 이미지를 배치합니다."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#4338ca',
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '6px',
                cursor: isUploadingImage ? 'not-allowed' : 'pointer'
              }}
            >
              <UploadCloud size={13} />
              <span>+ 문제 위에 도표 첨부</span>
            </button>

            <button
              type="button"
              onClick={() => onTriggerPromptUpload('bottom')}
              disabled={isUploadingImage}
              title="문제(발문) 텍스트 바로 아래에 도표·그래프 이미지를 배치합니다."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#4338ca',
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '6px',
                cursor: isUploadingImage ? 'not-allowed' : 'pointer'
              }}
            >
              <UploadCloud size={13} />
              <span>+ 문제 아래에 도표 첨부</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            문제 머리말 / 제목
          </label>
          <input
            type="text"
            value={currentQ.title || ''}
            onChange={(e) => onUpdateTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: 700,
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
            placeholder="예: 【문제 1】 다음 제시문을 읽고 질문에 답하시오."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            발문 상세 본문 / 유의사항 (단락 간 빈 줄 구분, 도표 마크다운 포함 가능)
          </label>
          <textarea
            rows={5}
            value={currentQ.note || ''}
            onChange={(e) => onUpdateNote(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              lineHeight: 1.6,
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="문제의 세부 지시사항이나 요구 조건을 입력하세요."
          />
        </div>

        {/* 발문에 삽입된 도표 이미지 감지 및 관리 리스트 */}
        {(() => {
          const note = currentQ.note || ''
          const matches = Array.from(note.matchAll(/!\[(.*?)\]\((.*?)\)/g))
          if (matches.length === 0) return null
          return (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                📌 문제 발문에 첨부된 도표 이미지 ({matches.length}개):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {matches.map((m, mIdx) => {
                  const fullMarkdown = m[0]
                  const altText = m[1]
                  const imgUrl = m[2]
                  return (
                    <div
                      key={`prompt-img-${mIdx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <img
                          src={imgUrl}
                          alt={altText}
                          style={{ width: '48px', height: '36px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {altText || '도표 및 그래프'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemovePromptImage(fullMarkdown)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="발문에서 이 도표 이미지 제거"
                      >
                        <Trash2 size={12} />
                        <span>삭제</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </article>

      {/* 2. 제시문 편집 카드 목록 */}
      <div className="passage-block">
        {currentQ.passages.map((p, pIdx) => (
          <section
            key={`edit-passage-${pIdx}`}
            className="passage-card"
            style={{
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            {/* 제시문 헤더: 뱃지명 편집 및 삭제 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>제시문 뱃지:</span>
                <input
                  type="text"
                  value={p.badge}
                  onChange={(e) => onUpdatePassageBadge(pIdx, e.target.value)}
                  style={{
                    width: '140px',
                    padding: '4px 8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: '1px solid #94a3b8',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b'
                  }}
                  placeholder="예: [제시문 가]"
                />
              </div>
              <button
                type="button"
                onClick={() => onDeletePassage(pIdx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#ef4444',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="이 제시문 전체 삭제"
              >
                <Trash2 size={13} />
                <span>제시문 삭제</span>
              </button>
            </div>

            {/* 제시문 단락 편집 (텍스트 또는 첨부 도표 이미지) 및 순서 이동(위/아래) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {p.paragraphs.map((para, paraIdx) => {
                const trimmed = para.trim()
                // 마크다운 이미지(![alt](url)) 단락인지 감지
                const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)

                if (imgMatch) {
                  const altText = imgMatch[1]
                  const imgUrl = imgMatch[2]
                  return (
                    <div
                      key={`edit-p-${pIdx}-${paraIdx}`}
                      style={{
                        padding: '12px',
                        border: '1.5px solid #e0e7ff',
                        backgroundColor: '#f5f7ff',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ImageIcon size={14} className="text-indigo-600" />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#3730a3' }}>
                            첨부 도표·그래프 이미지 (단락 {paraIdx + 1})
                          </span>
                        </div>

                        {/* 순서 이동(위/아래) 및 삭제 컨트롤 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={paraIdx === 0}
                            onClick={() => onMoveParagraphUp(pIdx, paraIdx)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 5px',
                              fontSize: '11px',
                              color: paraIdx === 0 ? '#cbd5e1' : '#475569',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              cursor: paraIdx === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="도표를 위로 이동"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={paraIdx === p.paragraphs.length - 1}
                            onClick={() => onMoveParagraphDown(pIdx, paraIdx)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 5px',
                              fontSize: '11px',
                              color: paraIdx === p.paragraphs.length - 1 ? '#cbd5e1' : '#475569',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              cursor: paraIdx === p.paragraphs.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="도표를 아래로 이동"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteParagraph(pIdx, paraIdx)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#dc2626',
                              backgroundColor: '#ffffff',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title="이 도표 이미지 삭제"
                          >
                            <Trash2 size={12} />
                            <span>삭제</span>
                          </button>
                        </div>
                      </div>

                      {/* 이미지 썸네일 미리보기 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                        <img
                          src={imgUrl}
                          alt={altText}
                          style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                        />
                      </div>

                      {/* 도표 캡션(alt) 수정 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>도표 캡션:</span>
                        <input
                          type="text"
                          value={altText}
                          onChange={(e) => {
                            const newAlt = e.target.value
                            onUpdateParagraph(pIdx, paraIdx, `![${newAlt}](${imgUrl})`)
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff'
                          }}
                          placeholder="도표 캡션(예: <그림 1> 국가별 지니계수 추이)"
                        />
                      </div>
                    </div>
                  )
                }

                // 일반 텍스트 단락 편집 (우측 상단에 순서 이동 및 삭제 버튼 제공)
                return (
                  <div key={`edit-p-${pIdx}-${paraIdx}`} style={{ position: 'relative' }}>
                    <textarea
                      rows={4}
                      value={para}
                      onChange={(e) => onUpdateParagraph(pIdx, paraIdx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        paddingRight: '80px',
                        fontSize: '13px',
                        lineHeight: 1.65,
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        resize: 'vertical'
                      }}
                      placeholder={`단락 ${paraIdx + 1} 내용을 입력하세요.`}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <button
                        type="button"
                        disabled={paraIdx === 0}
                        onClick={() => onMoveParagraphUp(pIdx, paraIdx)}
                        style={{
                          padding: '2px 4px',
                          fontSize: '11px',
                          color: paraIdx === 0 ? '#cbd5e1' : '#64748b',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          cursor: paraIdx === 0 ? 'not-allowed' : 'pointer'
                        }}
                        title="단락 위로 이동"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={paraIdx === p.paragraphs.length - 1}
                        onClick={() => onMoveParagraphDown(pIdx, paraIdx)}
                        style={{
                          padding: '2px 4px',
                          fontSize: '11px',
                          color: paraIdx === p.paragraphs.length - 1 ? '#cbd5e1' : '#64748b',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          cursor: paraIdx === p.paragraphs.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                        title="단락 아래로 이동"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteParagraph(pIdx, paraIdx)}
                        style={{
                          padding: '2px 5px',
                          fontSize: '11px',
                          color: '#ef4444',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="이 단락 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 제시문 하단 단락 추가 및 도표 이미지 첨부(상단/하단 선택) 액션 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px dashed #e2e8f0'
              }}
            >
              <button
                type="button"
                onClick={() => onAddParagraph(pIdx)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>본문 단락 추가</span>
              </button>

              <button
                type="button"
                onClick={() => onTriggerPassageUpload(pIdx, 'top')}
                disabled={isUploadingImage}
                title="이 제시문 본문의 가장 윗부분(상단)에 도표 이미지를 첨부합니다."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4338ca',
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer'
                }}
              >
                <UploadCloud size={13} />
                <span>+ 제시문 상단에 도표 첨부</span>
              </button>

              <button
                type="button"
                onClick={() => onTriggerPassageUpload(pIdx, 'bottom')}
                disabled={isUploadingImage}
                title="이 제시문 본문의 가장 아랫부분(하단)에 도표 이미지를 첨부합니다."
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#4338ca',
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  cursor: isUploadingImage ? 'not-allowed' : 'pointer'
                }}
              >
                <UploadCloud size={13} />
                <span>+ 제시문 하단에 도표 첨부</span>
              </button>
            </div>
          </section>
        ))}

        {/* 새 제시문 추가 버튼 */}
        <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={onAddPassage}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#3b82f6',
              backgroundColor: '#eff6ff',
              border: '1.5px dashed #93c5fd',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Plus size={15} />
            <span>새 제시문([라], [마] 등) 추가</span>
          </button>
        </div>
      </div>
    </div>
  )
}
