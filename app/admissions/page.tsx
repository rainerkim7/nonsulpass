'use client'

/**
 * @file app/admissions/page.tsx
 * @description 2027 대입 논술 입시요강 안내 페이지
 *              (주요 18개 대학 논술전형 핵심 체크포인트 및 대학별 입시요강 안내)
 */

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  FileText,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react'
import SiteHeader from '@/components/common/SiteHeader'
import { SEOUL_UNIVERSITIES } from '@/lib/constants/universities'

// 대입 논술전형 공통 핵심 체크포인트
const ADMISSION_CHECKPOINTS = [
  {
    title: '수능 최저학력기준 확인',
    desc: '대학·모집단위(인문/자연/의약학)별로 수능 최저학력기준 적용 여부와 등급 합 기준이 다르므로 지원 전 반드시 확인해야 합니다.',
    icon: CheckCircle2,
  },
  {
    title: '논술고사 반영 비율 및 학생부 비중',
    desc: '최근 주요 대학은 논술 70~100% 반영 비율이 높으며, 학생부 내신 실질 반영률은 낮거나 교과 등급 간 점수 차가 작은 편입니다.',
    icon: FileText,
  },
  {
    title: '고사 일정 및 수능 전/후 구분',
    desc: '수능 전 실시 대학과 수능 후 주말에 집중 실시되는 대학 일정을 미리 정리하여 고사 시간 중복 여부를 점검하세요.',
    icon: Calendar,
  },
]

export default function AdmissionsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <SiteHeader />

      {/* 히어로 배너 */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-12 px-6 border-b border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3.5">
            <GraduationCap className="w-3.5 h-3.5" />
            2027 ADMISSIONS GUIDE
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            2027 대입 논술 입시요강 안내
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
            서울 주요 18개 대학 논술전형의 핵심 체크포인트와 대학별 출제 경향·고사 준비 방향을 한눈에 확인하세요.
          </p>
        </div>
      </section>

      {/* 본문 영역 */}
      <main className="max-w-5xl w-full mx-auto py-10 px-4 md:px-6 space-y-10 flex-1">
        {/* 입시요강 안내 배너 */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            각 대학의 2027학년도 수시 모집요강 확정 발표에 맞춰 세부 전형 일정, 수능 최저학력기준, 모집 인원 및 기출 경향 요약이 순차적으로 업데이트됩니다.
          </p>
        </div>

        {/* 논술전형 3대 핵심 체크포인트 */}
        <section>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            논술전형 지원 전 3대 핵심 체크포인트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADMISSION_CHECKPOINTS.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* 서울 주요 18개 대학별 바로가기 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              서울 주요 18개 대학 논술전형
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              대학을 클릭하면 해당 대학 논술 연습 화면으로 이동합니다
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {SEOUL_UNIVERSITIES.map((univ) => (
              <button
                key={univ.id}
                type="button"
                onClick={() => router.push(`/?univ=${encodeURIComponent(univ.id)}`)}
                className="flex items-center justify-between px-3.5 py-3 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-500 rounded-xl text-left transition cursor-pointer group"
              >
                <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">
                  {univ.name}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
