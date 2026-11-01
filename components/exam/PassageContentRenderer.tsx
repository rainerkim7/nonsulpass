'use client'

/**
 * @file components/exam/PassageContentRenderer.tsx
 * @description 제시문 및 모범답안 단락 포맷팅 렌더러
 *              - 마크다운 이미지 `![alt](url)` 감지 시 고해상도 반응형 이미지 카드로 렌더링
 *              - 수학 수식/조건식 블록 전용 스타일 적용
 */

import React from 'react'

export function renderFormattedParagraph(para: string, key: React.Key) {
  if (!para) return null
  const trimmed = para.trim()
  if (!trimmed) return null

  // 1. 단락 내에 마크다운 이미지(![alt](url))가 포함되어 있는 경우 (단독 또는 복합 텍스트 혼합)
  if (trimmed.includes('![') && /!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
    const parts = trimmed.split(/(!\[.*?\]\(.*?\))/g).filter(Boolean)
    return (
      <React.Fragment key={key}>
        {parts.map((part, pIdx) => {
          const imgMatch = part.trim().match(/^!\[(.*?)\]\((.*?)\)$/)
          if (imgMatch) {
            const altText = imgMatch[1].trim()
            const imgUrl = imgMatch[2].trim()
            return (
              <div
                key={`${String(key)}-img-${pIdx}`}
                style={{
                  margin: '16px 0',
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <img
                  src={imgUrl}
                  alt={altText || '문항 도표/그래프'}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '420px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                  }}
                />
                {altText && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    ▲ {altText}
                  </span>
                )}
              </div>
            )
          }

          const partTrimmed = part.trim()
          if (!partTrimmed) return null

          // 소문항 번호((1), (2), (3) 등)나 발문 기호로 시작하는 문장은 일반 본문으로 통일
          const isSubQuestion = /^\(\d+\)|^\([a-zA-Z]\)|^※|^【/.test(partTrimmed)
          const isMath =
            !isSubQuestion &&
            (partTrimmed.includes('y =') ||
              partTrimmed.includes('∫') ||
              (partTrimmed.startsWith('① ') && partTrimmed.includes('=')) ||
              (partTrimmed.startsWith('② ') && partTrimmed.includes('=')))

          if (isMath) {
            return (
              <div
                key={`${String(key)}-txt-${pIdx}`}
                style={{
                  margin: '10px 0',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontFamily: "'Pretendard', -apple-system, sans-serif",
                  fontSize: '13.5px',
                  lineHeight: 1.65,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {partTrimmed}
              </div>
            )
          }

          return (
            <p
              key={`${String(key)}-txt-${pIdx}`}
              style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, marginBottom: '12px' }}
            >
              {partTrimmed}
            </p>
          )
        })}
      </React.Fragment>
    )
  }

  // 2. 수식 및 함수 다중행 블록 감지 (소문항 번호로 시작하는 문장은 제외하여 (1), (2), (3) 위계 통일)
  const isSubQuestion = /^\(\d+\)|^\([a-zA-Z]\)|^※|^【/.test(trimmed)
  const isMathBlock =
    !isSubQuestion &&
    (trimmed.includes('y =') ||
      trimmed.includes('∫') ||
      (trimmed.startsWith('① ') && trimmed.includes('=')) ||
      (trimmed.startsWith('② ') && trimmed.includes('=')))

  if (isMathBlock) {
    return (
      <div
        key={key}
        style={{
          margin: '10px 0',
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontFamily: "'Pretendard', -apple-system, sans-serif",
          fontSize: '13.5px',
          lineHeight: 1.65,
          color: '#1e293b',
          whiteSpace: 'pre-wrap',
        }}
      >
        {trimmed}
      </div>
    )
  }

  // 3. 일반 본문 단락
  return (
    <p key={key} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, marginBottom: '12px' }}>
      {trimmed}
    </p>
  )
}

