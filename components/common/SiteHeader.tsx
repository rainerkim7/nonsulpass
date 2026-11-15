'use client'

/**
 * @file components/common/SiteHeader.tsx
 * @description 메인 페이지 및 주요 메뉴 페이지(/guide, /writing, /admissions, /qna)가 공유하는
 *              통일된 상단 글로벌 네비게이션 헤더
 */

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Sliders, UserCog, LogOut } from 'lucide-react'
import Brand from '@/components/common/Brand'
import { useAuth } from '@/components/AuthGate'

const NAV_ITEMS = [
  { href: '/guide', label: '논술 글쓰기' },
  { href: '/writing', label: '논술 연습장' },
  { href: '/admissions', label: '논술 입시요강' },
  { href: '/qna', label: 'QnA' },
] as const

export default function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isAdmin, userDisplayName, logout, openAuthModal, openProfileModal } = useAuth()

  return (
    <header className="home-topbar">
      <Brand hideSubtitle onHome={() => router.push('/')} />

      <nav className="home-nav" aria-label="주요 메뉴">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'active' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="home-top-actions">
        {isAuthenticated ? (
          <>
            {/* 관리자 콘솔 바로가기 (admin 전용) */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                관리자 콘솔
              </Link>
            )}

            {/* 사용자 이름(클릭 시 내 정보 수정) 및 로그아웃 버튼 */}
            <button
              type="button"
              onClick={openProfileModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition cursor-pointer"
              title="내 정보 수정"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="font-semibold text-slate-200">
                {isAdmin ? `관리자 (${userDisplayName})` : `${userDisplayName} 학생`}
              </span>
              <UserCog className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition cursor-pointer"
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              무료 회원가입
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
