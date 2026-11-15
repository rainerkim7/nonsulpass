'use client'

/**
 * @file components/home/HomePage.tsx
 * @description 논술패스 Lab 메인 랜딩 페이지 (히어로, 서울 주요 18개 대학 그리드, 서비스 소개)
 */

import React, { useState, useEffect } from 'react'
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
  Camera,
  Coins,
  Target,
  PlusCircle
} from 'lucide-react'
import Brand from '@/components/common/Brand'
import SiteHeader from '@/components/common/SiteHeader'
import { SEOUL_UNIVERSITIES, getUniversityId, type UniversityMeta } from '@/lib/constants/universities'
import { getAllMergedUniversities } from '@/lib/api/university'
import { useAuth } from '@/components/AuthGate'
import MySubmissionsModal from '@/components/mypage/MySubmissionsModal'
import PassPurchaseModal from '@/components/payment/PassPurchaseModal'
import MultiPassPurchaseModal from '@/components/payment/MultiPassPurchaseModal'
import { useAllUserPasses } from '@/lib/use-user-pass'

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
  // 인증 정보 및 권한 확인 (목표 대학 최대 6개 목록 포함)
  const {
    isAuthenticated,
    isAdmin,
    userDisplayName,
    targetUniversities,
    updateTargetUniversities,
    logout,
    openAuthModal,
  } = useAuth()
  const [isMySubmissionsOpen, setIsMySubmissionsOpen] = useState(false)
  const [isPassModalOpen, setIsPassModalOpen] = useState(false)
  const [isMultiPassModalOpen, setIsMultiPassModalOpen] = useState(false)
  const [universitiesList, setUniversitiesList] = useState<UniversityMeta[]>(SEOUL_UNIVERSITIES)

  // 마운트 시 DB에 등록된 신규 대학 및 활성 상태 실시간 병합 로드
  useEffect(() => {
    let isMounted = true
    getAllMergedUniversities().then((merged) => {
      if (isMounted && merged && merged.length > 0) {
        setUniversitiesList(merged)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // 사용자가 보유한 전 대학 패스 크래딧 조회 훅
  const {
    globalRemainingCredits,
    refetchAllPasses,
    purchaseGlobalCredits,
  } = useAllUserPasses()


  return (
    <main className="home-shell">
      <SiteHeader />

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
              <Check /> 대입 논술 출제 경향
            </span>
            <span>
              <Check /> 논리전개 및 구조 분석
            </span>
            <span>
              <Check /> 나의 답안 리스트업
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
            <span className="status-dot" /> 합격가능권 점수입니다.
          </div>
        </div>
      </section>

      {/* 🎯 나의 목표 대학(최대 6개) & 패스 크래딧 대시보드 섹션 */}
      {isAuthenticated ? (
        <section
          style={{ maxWidth: '1110px', margin: '0 auto 36px' }}
          className="p-6 md:p-8 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50/70 border border-blue-500 rounded-2xl shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5 pb-4 border-b border-blue-200/70">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="univ-badge bg-blue-600 text-white shadow-xs">
                  <Target /> 2027 수시 목표 대학
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200">
                  {targetUniversities.length} / 6개 선택됨
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                  패스 크래딧 {globalRemainingCredits}회
                </span>
              </div>
              <h2 className="univ-title">나의 목표 대학 & 패스 크래딧</h2>
              <p className="univ-subtitle">
                크래딧은 전 대학에서 자유롭게 사용할 수 있으며, 목표 대학은 최대 6개까지 등록가능.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* 내 첨삭 보관함 버튼 */}
              <button
                type="button"
                onClick={() => setIsMySubmissionsOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg shadow-2xs transition cursor-pointer"
                title="내가 제출한 답안과 AI 정밀 채점 리포트 이력 조회"
              >
                <Award className="w-3.5 h-3.5" />
                <span>내 첨삭 보관함</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMultiPassModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>목표 대학 설정 ({targetUniversities.length}/6)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPassModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>크래딧 충전하기</span>
              </button>
            </div>
          </div>

          {/* 목표 대학 카드 그리드 (최대 6개, 가로 6열 컴팩트 배치) */}
          {targetUniversities.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {targetUniversities.map((univName) => {
                const univId = getUniversityId(univName)

                return (
                  <div
                    key={univName}
                    onClick={() => {
                      if (onSelectUniv) {
                        onSelectUniv(univId, univName)
                      }
                    }}
                    className="p-3.5 rounded-xl bg-white hover:bg-blue-50/60 border-2 border-blue-300 hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between shadow-2xs select-none min-h-[96px]"
                    title={`${univName} 실전 시험장으로 바로 이동`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <span className="text-[14.5px] font-extrabold text-slate-900 group-hover:text-blue-700 truncate tracking-tight">
                        {univName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500">
                        패스 크래딧 사용
                      </span>
                      <span className="text-[11px] font-bold text-blue-600">응시 →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-white/80 border border-dashed border-blue-300 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-600 font-medium">
                아직 설정된 목표 대학이 없습니다. 수시 지원 예정인 목표 대학을 최대 6개까지 선택해 보세요.
              </p>
              <button
                type="button"
                onClick={() => setIsMultiPassModalOpen(true)}
                className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>목표 대학 6곳 선택하기</span>
              </button>
            </div>
          )}
        </section>
      ) : (
        <section
          style={{ maxWidth: '1110px', margin: '0 auto 36px' }}
          className="p-5 md:p-6 bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-slate-50/60 border border-blue-400 rounded-2xl shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <span className="univ-icon text-blue-600 bg-white border border-blue-200/60 shrink-0 shadow-2xs">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  수시 6개 목표 대학을 설정하고 패스 크래딧으로 전 대학 실전 논술을 완성하세요
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  18개 주요 대학 기출문제 풀이 및 1:1 AI 다차원 정밀 첨삭 (10회 3,300원부터 전 대학 자유 이용)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>로그인 및 크래딧 안내</span>
            </button>
          </div>
        </section>
      )}

      {/* 대학별 논술 바로가기 링크 버튼 섹션 (DB 연동 동적 확장 지원) */}
      <section className="home-univ-section" id="universities">
        <div className="univ-section-header">
          <div className="univ-title-wrap">
            <span className="univ-badge">
              <GraduationCap /> 2027 수시 대비 실전 논술
            </span>
            <h2 className="univ-title">대학별 논술 기출 · 모의논술</h2>
          </div>
          <p className="univ-subtitle">
            원하는 대학을 클릭하면 해당 대학의 출제 경향 및 실전 논술 시험장으로 즉시 이동합니다.
          </p>
        </div>
        <div className="univ-grid">
          {universitiesList.map((univ) => {
            const isReady = Boolean(univ.active)
            const isTarget = targetUniversities.includes(univ.name)
            const canEnter = isReady || isTarget || isAdmin

            return (
              <button
                key={univ.id}
                type="button"
                className={`univ-btn relative ${
                  isTarget
                    ? 'border-amber-500/70 shadow-md ring-2 ring-amber-500/30 bg-amber-500/10'
                    : isReady
                    ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20 bg-blue-50/20'
                    : isAdmin
                    ? 'border-slate-300 hover:border-indigo-500'
                    : 'cursor-default hover:bg-white hover:border-slate-200 hover:shadow-none'
                }`}
                onClick={() => {
                  if (onSelectUniv && canEnter) {
                    onSelectUniv(univ.id, univ.name)
                  }
                }}
                disabled={!canEnter}
                title={
                  isTarget
                    ? `${univ.name} (목표 대학) - 바로 이동`
                    : isReady
                    ? `${univ.name} 논술 분석 및 기출 풀기`
                    : isAdmin
                    ? `[관리자] ${univ.name} 페이지 미리보기`
                    : `${univ.name} 논술 데이터 준비 중`
                }
              >
                <div className="univ-btn-left">
                  <span
                    className={`univ-icon ${
                      isTarget
                        ? '!text-emerald-600 !bg-emerald-100'
                        : isReady
                        ? '!text-blue-600 !bg-blue-100'
                        : '!text-orange-600 !bg-orange-100'
                    }`}
                  >
                    <GraduationCap />
                  </span>
                  <div className="flex flex-col text-left">
                    <span
                      className={`univ-name ${
                        isTarget
                          ? 'font-bold text-slate-900'
                          : isReady
                          ? 'font-bold text-blue-950'
                          : 'text-slate-700 font-semibold'
                      }`}
                    >
                      {univ.name}
                    </span>
                  </div>
                </div>
                {(isTarget || isReady) && (
                  <span className="univ-action text-blue-600">
                    <ArrowRight />
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
          <div className="service-card" onClick={() => onExam()} style={{ cursor: 'pointer' }}>
            <div className="service-head">
              <div className="service-icon">
                <FileText />
              </div>
              <h3>각 대학 출제 경향 분석</h3>
            </div>
            <p>
              대학별 &quot;기출 문제&quot;를 풀어보고 출제 경향을 파악하고, &quot;모의 논술&quot; 문제로 실력을 검증해 보며, &quot;예상 문제&quot;를 통해 각 대학의 출제 경향에 맞는 논술 글쓰기 연습을 체계적으로 진행할 수 있습니다.
            </p>
          </div>
          <div className="service-card" onClick={onReport} style={{ cursor: 'pointer' }}>
            <div className="service-head">
              <div className="service-icon">
                <TrendingUp />
              </div>
              <h3>AI 정밀 채점 리포트</h3>
            </div>
            <p>
              각 문항별로 답안을 작성하고 AI 정밀 채점 리포트를 확인하여 자신의 글을 분석해 보고 수정·보완할 수 있습니다. 자신이 작성한 모든 답안을 문항 하단에 리스트업하여 지난 글과 비교해 볼 수 있습니다.
            </p>
          </div>
          <div className="service-card" id="process">
            <div className="service-head">
              <div className="service-icon">
                <Camera />
              </div>
              <h3>원고지 및 자필 논술도 채점</h3>
            </div>
            <p>
              답안 작성 페이지에서 텍스트 입력, 원고지 양식 작성뿐만 아니라 노트 및 원고지에 자필로 쓴 글도 폰 카메라로 찍어 업로드하면 텍스트로 변환하여 채점 리포트를 확인해 볼 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 명언/슬로건 섹션 */}
      {/* 푸터 */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-top">
            <div className="home-footer-brand">
              <Brand />
              <p className="home-footer-slogan">
                좋은 답안은 타고나는 것이 아니라, 정확한 피드백을 통해 만들어집니다.
              </p>
            </div>
            <span>© 2027 Nonsul Pass Lab. 모든 학습 데이터는 안전하게 보호됩니다.</span>
          </div>

          {/* PG사 심사 필수 사업자 정보 */}
          <div className="home-footer-biz">
            <p>
              상호명: 아이엘 <span aria-hidden="true">|</span> 대표자명: 김성고{' '}
              <span aria-hidden="true">|</span> 사업자등록번호: 705-21-01832{' '}
              <span aria-hidden="true">|</span> 통신판매업 신고번호: 123-4567
            </p>
            <p>
              사업장 주소: 부산 영도구 절영로71 멀티미디어센터 501호{' '}
              <span aria-hidden="true">|</span> 고객센터: 010-1234-4567 · ildesk@naver.com
            </p>
          </div>
        </div>
      </footer>

      {/* 🏆 마이페이지: 내 첨삭 리포트 보관함 모달 */}
      <MySubmissionsModal
        isOpen={isMySubmissionsOpen}
        onClose={() => setIsMySubmissionsOpen(false)}
        onSelectReport={(report) => onReport(report)}
      />

      {/* 💳 전 대학 패스 크래딧 4종 패키지 결제 모달 */}
      <PassPurchaseModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        onGrantPass={purchaseGlobalCredits}
        onPaymentSuccess={() => {
          refetchAllPasses()
        }}
      />

      {/* 🎯 수시 목표 대학 설정 모달 (최대 6개 제한) */}
      <MultiPassPurchaseModal
        isOpen={isMultiPassModalOpen}
        onClose={() => setIsMultiPassModalOpen(false)}
        currentTargets={targetUniversities}
        universities={universitiesList}
        onSaveTargets={updateTargetUniversities}
      />
    </main>
  )
}
