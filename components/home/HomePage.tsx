'use client'

/**
 * @file components/home/HomePage.tsx
 * @description 논술패스 Lab 메인 랜딩 페이지 (히어로, 서울 주요 18개 대학 그리드, 서비스 소개)
 */

import React from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Sliders,
  ArrowRight,
  Check,
  TrendingUp,
  GraduationCap,
  FileText,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Brand from '@/components/common/Brand'
import { SEOUL_UNIVERSITIES } from '@/lib/constants/universities'

interface HomePageProps {
  onExam: (univ?: string) => void
  onReport: () => void
  onSelectUniv?: (univId: string, univName: string) => void
}

export default function HomePage({
  onExam,
  onReport,
  onSelectUniv,
}: HomePageProps) {
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
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            관리자 콘솔
          </Link>
          <button className="home-login">로그인</button>
          <Button size="sm" onClick={() => onExam()}>
            무료로 시작하기 <ArrowRight data-icon="inline-end" />
          </Button>
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
          <div className="hero-actions">
            <Button size="lg" onClick={() => onExam()}>
              논술 문제 풀어보기 <ArrowRight data-icon="inline-end" />
            </Button>
            <button className="hero-text-button" onClick={onReport}>
              평가 리포트 미리보기 <ArrowRight />
            </button>
          </div>
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
            return (
              <button
                key={univ.id}
                type="button"
                className={`univ-btn ${
                  isReady
                    ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20 bg-blue-50/20'
                    : 'opacity-60 cursor-default hover:bg-white hover:border-slate-200 hover:shadow-none'
                }`}
                onClick={() => {
                  if (isReady && onSelectUniv) {
                    onSelectUniv(univ.id, univ.name)
                  }
                }}
                disabled={!isReady}
                title={isReady ? `${univ.name} 논술 분석 및 기출 풀기` : `${univ.name} 논술 데이터 준비 중`}
              >
                <div className="univ-btn-left">
                  <span className={`univ-icon ${isReady ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                    <GraduationCap />
                  </span>
                  <span className={`univ-name ${isReady ? 'font-bold text-blue-950' : 'text-slate-500'}`}>
                    {univ.name}
                  </span>
                </div>
                {isReady ? (
                  <span className="univ-action text-blue-600">
                    <ArrowRight />
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
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
    </main>
  )
}
