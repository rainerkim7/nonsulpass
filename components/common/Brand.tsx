'use client'

/**
 * @file components/common/Brand.tsx
 * @description 논술패스 Lab 공통 헤더/푸터 브랜드 로고 컴포넌트
 */

import React from 'react'
import { GraduationCap } from 'lucide-react'

interface BrandProps {
  onHome?: () => void
}

export default function Brand({ onHome }: BrandProps) {
  return (
    <div
      className={`brand-block ${onHome ? 'cursor-pointer select-none transition-all hover:opacity-80 active:scale-[0.98]' : ''}`}
      onClick={onHome}
      role={onHome ? 'button' : undefined}
      tabIndex={onHome ? 0 : undefined}
      title={onHome ? '메인 홈으로 이동' : undefined}
    >
      <div className="brand-mark">
        <GraduationCap />
      </div>
      <div>
        <p className="brand-name">
          논술패스 <span>Lab</span>
        </p>
        <p className="brand-subtitle">대입 논술의 새로운 기준</p>
      </div>
    </div>
  )
}
