'use client'

/**
 * @file app/admin/components/AttachedImageCard.tsx
 * @description 올인원 추출기 및 수동 시험 관리 공통 도표 이미지 미리보기 및 관리 카드 컴포넌트
 */

import React from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { formatImageFileName } from '@/lib/exam-image-utils'

interface AttachedImageCardProps {
  alt: string
  url: string
  onRemove: () => void
  compact?: boolean
}

export default function AttachedImageCard({
  alt,
  url,
  onRemove,
  compact = false
}: AttachedImageCardProps) {
  const displayName = alt || '도표 및 그래프'
  const shortName = formatImageFileName(displayName, 26)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: compact ? '6px 10px' : '8px 12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        transition: 'all 0.15s ease'
      }}
      className="hover:border-slate-300"
    >
      {/* 썸네일 (클릭 시 원본 이미지 새 탭 보기) */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="클릭하여 원본 크기로 보기"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? '44px' : '52px',
          height: compact ? '32px' : '38px',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <img
          src={url}
          alt={displayName}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </a>

      {/* 정보 영역 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            title={displayName}
            style={{
              fontSize: compact ? '11.5px' : '12px',
              fontWeight: 700,
              color: '#334155',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {shortName}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="새 탭에서 원본 확인"
            style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center' }}
            className="hover:text-blue-600"
          >
            <ExternalLink size={11} />
          </a>
        </div>
        <span
          title={url}
          style={{
            fontSize: '10.5px',
            color: '#64748b',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {url}
        </span>
      </div>

      {/* 연결 해제 버튼 */}
      <button
        type="button"
        onClick={onRemove}
        title="이 문항/제시문에서 도표 연결 해제"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '11px',
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '6px',
          cursor: 'pointer',
          padding: '4px 8px',
          fontWeight: 600,
          flexShrink: 0,
          transition: 'all 0.15s ease'
        }}
        className="hover:bg-red-100 hover:text-red-700"
      >
        <Trash2 size={11} />
        연결 해제
      </button>
    </div>
  )
}
