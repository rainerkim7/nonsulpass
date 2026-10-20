'use client'

/**
 * @file components/home/HomePage.tsx
 * @description 논술패스 Lab 메인 랜딩 페이지 (히어로, 서울 주요 18개 대학 그리드, 서비스 소개)
 */

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Sliders,
  Award,
  ArrowRight,
  Check,
  TrendingUp,
  GraduationCap,
  FileText,
  Lightbulb,
  Coins,
  Target,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react'
import Brand from '@/components/common/Brand'
import { SEOUL_UNIVERSITIES, getUniversityId } from '@/lib/constants/universities'
import { useAuth } from '@/components/AuthGate'
import MySubmissionsModal from '@/components/mypage/MySubmissionsModal'
import PassPurchaseModal from '@/components/payment/PassPurchaseModal'
import MultiPassPurchaseModal from '@/components/payment/MultiPassPurchaseModal'
import { useUserPass, useAllUserPasses } from '@/lib/use-user-pass'

interface HomePageProps {
  onExam: (univ?: string) => void
  onReport: (reportData?: any) => void
  onSelectUniv?: (univId: string, univName: string) => void
}

export default function HomePage({
  onExam,
  onReport,
  onSelectUniv,
}: HomePageProps) {
  // 인증 정보 및 권한 확인
  const { isAuthenticated, isAdmin, userDisplayName, logout, openAuthModal } = useAuth()
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false)
  const [isPassModalOpen, setIsPassModalOpen] = useState(false)
  const [isMultiPassModalOpen, setIsMultiPassModalOpen] = useState(false)
  const [selectedPassUniv, setSelectedPassUniv] = useState('홍익대학교')
  const { grantPass } = useUserPass(selectedPassUniv)

  // 사용자가 보유한 모든 활성 대학 패스 조회 훅
  const { allPasses, refetchAllPasses, grantMultiplePasses, purchasePassesAndAddons } = useAllUserPasses()

  // 대학별 패스 및 크레딧 집계 (중복 구매 시 합산 및 최장 만료일 계산)
  const myPassesByUniv = useMemo(() => {
    const map = new Map<
      string,
      { totalCredits: number; remainingCredits: number; expiresAt: string; daysRemaining: number }
    >()
    const now = new Date().getTime()

    allPasses.forEach((pass) => {
      const exp = new Date(pass.expires_at).getTime()
      const days = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)))
      const existing = map.get(pass.university)
      if (existing) {
        existing.totalCredits += pass.total_credits
        existing.remainingCredits += pass.remaining_credits
        if (exp > new Date(existing.expiresAt).getTime()) {
          existing.expiresAt = pass.expires_at
          existing.daysRemaining = days
        }
      } else {
        map.set(pass.university, {
          totalCredits: pass.total_credits,
          remainingCredits: pass.remaining_credits,
          expiresAt: pass.expires_at,
          daysRemaining: days,
        })
      }
    })
    return map
  }, [allPasses])

  const ownedUniversityNames = useMemo(() => Array.from(myPassesByUniv.keys()), [myPassesByUniv])


  return (
    <main className="home-shell">
      <header className="home-topbar">
        <Brand />
        <nav className="home-nav" aria-label="주요 메뉴">
          <a href="#universities">서울 주요 18개 대학</a>
          <a href="#service">서비스 안내</a>
          <a href="#process">이용 방법</a>
        </nav>
        <div className="home-top-actions">
          {isAuthenticated ? (
            <>
              {/* 내 첨삭 보관함 버튼 */}
              <button
                type="button"
                onClick={() => setIsMySubmissionsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition cursor-pointer"
                title="내가 제출한 답안과 AI 정밀 채점 리포트 이력 조회"
              >
                <Award className="w-3.5 h-3.5" />
                내 첨삭 보관함
              </button>

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

              {/* 사용자 이름 및 로그아웃 버튼 */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition cursor-pointer"
                title="로그아웃"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className="font-semibold text-slate-200">
                  {isAdmin ? `관리자 (${userDisplayName})` : `${userDisplayName} 학생`}
                </span>
                <span className="text-slate-400 text-[11px]">로그아웃</span>
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

      {/* 히어로 섹션 */}
      <section className="home-hero">
        <div className="hero-copy">
          <p className="hero-kicker">
            <Sparkles /> ADMISSIONS ESSAY LAB
          </p>
          <h1>
            합격하는 글은
            <br />
            <em>연습의 방식</em>이 다릅니다.
          </h1>
          <p className="hero-description">
            대입 논술의 출제부터 작성, AI 정밀 채점과
            <br />
            개인별 평가 지도까지 한 곳에서 경험하세요.
          </p>
          <div className="hero-proof">
            <span>
              <Check /> 18개 대학 출제 경향
            </span>
            <span>
              <Check /> 현직 강사진 평가 기준
            </span>
            <span>
              <Check /> 나만의 성장 리포트
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="논술패스 리포트 미리보기">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="hero-card card-back">
            <span>WRITING SCORE</span>
            <strong>78</strong>
            <small>합격 가능권</small>
          </div>
          <div className="hero-card card-front">
            <div className="mini-card-head">
              <span>AI DIAGNOSTIC</span>
              <TrendingUp />
            </div>
            <div className="mini-score">
              <strong>+12.4</strong>
              <span>지난 달 대비</span>
            </div>
            <div className="mini-bars">
              <i style={{ width: '82%' }} />
              <i style={{ width: '64%' }} />
              <i style={{ width: '91%' }} />
            </div>
            <p>나의 논리적 완결도</p>
          </div>
          <div className="hero-chip">
            <span className="status-dot" /> 오늘의 학습이 기록되었어요
          </div>
        </div>
      </section>

      {/* 🎯 나의 목표 대학 패스 전용 섹션 (은은한 소프트 인디고/블루 틴트 배경 & 화이트 플로팅 카드, 가로 6열) */}
      {isAuthenticated && ownedUniversityNames.length > 0 ? (
        <section
          style={{ maxWidth: '1110px', margin: '0 auto 36px' }}
          className="p-6 md:p-8 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/70 border border-blue-200/90 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 pb-4 border-b border-blue-200/70">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="univ-badge bg-blue-600 text-white shadow-xs">
                  <Target /> 2027 수시 목표 대학
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200">
                  {ownedUniversityNames.length}개 대학 이용 중
                </span>
              </div>
              <h2 className="univ-title">나의 목표 대학 패스</h2>
              <p className="univ-subtitle">
                구매하신 대학의 전 시험 세트 풀이 및 AI 정밀 채점 리포트를 언제든지 자유롭게 이용하세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMultiPassModalOpen(true)}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>추가 대학 패스 구매</span>
            </button>
          </div>

          {/* 보유 대학 카드 그리드 (순백색 플로팅 카드, 가로 6열 컴팩트 배치) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {ownedUniversityNames.map((univName) => {
              const passInfo = myPassesByUniv.get(univName)!
              const univId = getUniversityId(univName)

              return (
                <div
                  key={univName}
                  onClick={() => {
                    if (onSelectUniv) {
                      onSelectUniv(univId, univName)
                    }
                  }}
                  className="p-3.5 rounded-xl bg-white hover:bg-blue-50/50 border border-blue-200/80 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-2xs select-none"
                  title={`${univName} 실전 시험장으로 바로 이동`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-2.5">
                    <span className="text-[14.5px] font-extrabold text-slate-900 group-hover:text-blue-700 truncate tracking-tight">
                      {univName}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 shrink-0">
                      D-{passInfo.daysRemaining}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 font-semibold">잔여 크레딧</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-base font-extrabold text-blue-700">
                          {passInfo.remainingCredits}회
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          /{passInfo.totalCredits}회
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(5, (passInfo.remainingCredits / (passInfo.totalCredits || 30)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section
          style={{ maxWidth: '1110px', margin: '0 auto 36px' }}
          className="p-5 md:p-6 bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-slate-50/60 border border-blue-200/80 rounded-2xl shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <span className="univ-icon text-blue-600 bg-white border border-blue-200/60 shrink-0 shadow-2xs">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  목표 대학을 선택하고 30일 마스터 패스로 실전 논술을 완성하세요
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  18개 주요 대학 기출문제 풀이 및 1:1 AI 다차원 정밀 첨삭권 (대학당 19,800원 / 30회)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) openAuthModal('login')
                else setIsMultiPassModalOpen(true)
              }}
              className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>목표 대학 패스 선택하기</span>
            </button>
          </div>
        </section>
      )}

      {/* 서울 주요 18개 대학 논술 바로가기 링크 버튼 섹션 */}
      <section className="home-univ-section" id="universities">
        <div className="univ-section-header">
          <div className="univ-title-wrap">
            <span className="univ-badge">
              <GraduationCap /> 2027 수시 대비 실전 논술
            </span>
            <h2 className="univ-title">서울 주요 18개 대학 기출 · 모의논술</h2>
          </div>
          <p className="univ-subtitle">
            원하는 대학을 클릭하면 해당 대학의 출제 경향 및 실전 논술 시험장으로 즉시 이동합니다.
          </p>
        </div>
        <div className="univ-grid">
          {SEOUL_UNIVERSITIES.map((univ) => {
            const isReady = ['hongik', 'khu', 'dongguk'].includes(univ.id)
            const isOwned = ownedUniversityNames.includes(univ.name)
            const passInfo = myPassesByUniv.get(univ.name)

            return (
              <button
                key={univ.id}
                type="button"
                className={`univ-btn relative ${
                  isOwned
                    ? 'border-amber-500/70 shadow-md ring-2 ring-amber-500/30 bg-amber-500/10'
                    : isReady
                    ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20 bg-blue-50/20'
                    : 'opacity-60 cursor-default hover:bg-white hover:border-slate-200 hover:shadow-none'
                }`}
                onClick={() => {
                  if (onSelectUniv) {
                    onSelectUniv(univ.id, univ.name)
                  }
                }}
                disabled={!isReady && !isOwned}
                title={
                  isOwned
                    ? `${univ.name} 패스 보유 (${passInfo?.remainingCredits}회 남음) - 바로 이동`
                    : isReady
                    ? `${univ.name} 논술 분석 및 기출 풀기`
                    : `${univ.name} 논술 데이터 준비 중`
                }
              >
                <div className="univ-btn-left">
                  <span
                    className={`univ-icon ${
                      isOwned
                        ? 'text-amber-400 bg-amber-500/20'
                        : isReady
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-slate-400'
                    }`}
                  >
                    <GraduationCap />
                  </span>
                  <div className="flex flex-col text-left">
                    <span
                      className={`univ-name ${
                        isOwned
                          ? 'font-bold text-amber-200'
                          : isReady
                          ? 'font-bold text-blue-950'
                          : 'text-slate-700 font-semibold'
                      }`}
                    >
                      {univ.name}
                    </span>
                    {isOwned && passInfo && (
                      <span className="text-[10px] font-semibold text-amber-400">
                        잔여 {passInfo.remainingCredits}회 (D-{passInfo.daysRemaining})
                      </span>
                    )}
                  </div>
                </div>
                {isOwned ? (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 shadow-xs">
                    이용중
                  </span>
                ) : isReady ? (
                  <span className="univ-action text-blue-600">
                    <ArrowRight />
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                    준비중
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* 서비스 안내 섹션 */}
      <section className="home-services" id="service">
        <div className="section-intro">
          <p className="eyebrow">ONE PLATFORM, COMPLETE PREPARATION</p>
          <h2>
            논술 준비의 모든 순간을
            <br />
            정확하게 연결합니다.
          </h2>
          <p>
            문제를 풀고 끝나는 것이 아니라, 다음 답안이 달라지도록
            <br />
            구체적인 근거와 방향을 제시합니다.
          </p>
        </div>
        <div className="service-grid">
          <button className="service-card service-primary" onClick={() => onExam()}>
            <span className="service-number">01</span>
            <div className="service-icon">
              <FileText />
            </div>
            <h3>대학별 예상문제</h3>
            <p>
              홍익대, 성균관대 등 18개 대학의
              <br />
              출제 스타일을 반영한 실전 문제
            </p>
            <span className="service-link">
              문제 풀러 가기 <ArrowRight />
            </span>
          </button>
          <button className="service-card" onClick={onReport}>
            <span className="service-number">02</span>
            <div className="service-icon">
              <TrendingUp />
            </div>
            <h3>AI 정밀 채점 리포트</h3>
            <p>
              대학별 평가 기준으로 분석하는
              <br />
              나만을 위한 답안 진단과 피드백
            </p>
            <span className="service-link">
              리포트 살펴보기 <ArrowRight />
            </span>
          </button>
          <div className="service-card" id="process">
            <span className="service-number">03</span>
            <div className="service-icon">
              <Lightbulb />
            </div>
            <h3>평가지도 & 성장 관리</h3>
            <p>
              약점을 다음 학습으로 연결하는
              <br />
              실천 가능한 개선 가이드
            </p>
            <span className="service-link">
              학습 방식 알아보기 <ArrowRight />
            </span>
          </div>
        </div>
      </section>

      {/* 명언/슬로건 섹션 */}
      <section className="home-quote">
        <div className="quote-mark">“</div>
        <p>
          좋은 답안은 타고나는 것이 아니라,
          <br />
          <strong>정확한 피드백을 통해 만들어집니다.</strong>
        </p>
        <span>논술패스 Lab · 대입 논술의 새로운 기준</span>
      </section>

      {/* 푸터 */}
      <footer className="home-footer">
        <Brand />
        <span>© 2027 Nonsul Pass Lab. 모든 학습 데이터는 안전하게 보호됩니다.</span>
      </footer>

      {/* 🏆 마이페이지: 내 첨삭 리포트 보관함 모달 */}
      <MySubmissionsModal
        isOpen={isMySubmissionsOpen}
        onClose={() => setIsMySubmissionsOpen(false)}
        onSelectReport={(report) => onReport(report)}
      />

      {/* 💳 대학별 30일 마스터 패스 단일 결제 모달 (하위 호환) */}
      <PassPurchaseModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        university={selectedPassUniv}
        onGrantPass={grantPass}
      />

      {/* 🎓 목표 대학 다중 선택 및 보유 대학 크레딧 추가 결제 모달 */}
      <MultiPassPurchaseModal
        isOpen={isMultiPassModalOpen}
        onClose={() => setIsMultiPassModalOpen(false)}
        ownedUniversities={ownedUniversityNames}
        onPurchase={purchasePassesAndAddons}
        onSuccess={() => {
          refetchAllPasses()
        }}
      />
    </main>
  )
}
