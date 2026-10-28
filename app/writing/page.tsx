'use client'

/**
 * @file app/writing/page.tsx
 * @description 논술 글쓰기 기본 연습 페이지
 *              (자유 주제 또는 논제 기반 글쓰기, 실시간 글자 수 카운트, 임시 저장 기능 제공)
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PenTool,
  ArrowLeft,
  RotateCcw,
  Save,
  CheckCircle2,
  BookOpen,
  FileText,
  Sparkles,
} from 'lucide-react'
import Brand from '@/components/common/Brand'

// 로컬 스토리지 임시 저장 키
const DRAFT_STORAGE_KEY = 'nonsulpass_writing_basic_draft'

export default function WritingBasicPage() {
  const router = useRouter()

  // 논제(제목) 및 본문 상태 관리
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState('')
  const [targetLength, setTargetLength] = useState<number>(800)
  const [savedToast, setSavedToast] = useState(false)

  // 초기 마운트 시 로컬 스토리지에 저장된 임시 글 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.topic) setTopic(parsed.topic)
        if (parsed.content) setContent(parsed.content)
        if (parsed.targetLength) setTargetLength(Number(parsed.targetLength))
      }
    } catch (err) {
      console.warn('[WritingBasicPage] 임시 저장 데이터 로드 실패:', err)
    }
  }, [])

  // 글자 수 계산 (공백 포함 / 공백 제외)
  const charCountWithSpaces = content.length
  const charCountWithoutSpaces = content.replace(/\s+/g, '').length
  const progressPercent = Math.min(100, Math.round((charCountWithSpaces / (targetLength || 800)) * 100))

  // 임시 저장 핸들러
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          topic,
          content,
          targetLength,
          updatedAt: new Date().toISOString(),
        })
      )
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2500)
    } catch (err) {
      console.warn('[WritingBasicPage] 임시 저장 실패:', err)
    }
  }

  // 작성 내용 초기화 핸들러
  const handleReset = () => {
    if (!content && !topic) return
    if (window.confirm('작성 중인 논제와 본문을 모두 초기화하시겠습니까?')) {
      setTopic('')
      setContent('')
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 상단 글로벌 헤더 */}
      <header className="home-topbar">
        <Brand onHome={() => router.push('/')} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            메인 화면으로 돌아가기
          </button>
        </div>
      </header>

      {/* 상단 타이틀 배너 섹션 */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-10 px-6 border-b border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
            <PenTool className="w-3.5 h-3.5" />
            BASIC ESSAY WRITING WORKSPACE
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            논술 글쓰기 연습장
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
            제시문 요약, 비교 분석, 견해 논증 등 대입 논술의 기초 체력을 기르는 기본 글쓰기 공간입니다.
            목표 글자 수를 설정하고 분량 감각과 문단 구성을 자유롭게 연습해 보세요.
          </p>
        </div>
      </section>

      {/* 본문 워크스페이스 섹션 */}
      <section className="flex-1 max-w-5xl w-full mx-auto py-8 px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측(또는 상단): 글쓰기 에디터 영역 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col gap-5">
            {/* 논제 / 제목 입력란 */}
            <div>
              <label
                htmlFor="essay-topic"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
              >
                연습 논제 / 제목
              </label>
              <input
                id="essay-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: [제시문 (가), (나)] 관점 비교 및 (다)의 사례 분석 (800자 내외)"
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
            </div>

            {/* 목표 분량 선택 및 실시간 글자 수 표시 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">목표 글자 수</span>
                <div className="flex items-center gap-1 ml-1">
                  {[500, 800, 1000, 1200].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setTargetLength(len)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                        targetLength === len
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {len}자
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-600 font-medium">
                  공백 포함{' '}
                  <strong className="text-blue-700 font-extrabold text-sm">
                    {charCountWithSpaces.toLocaleString()}
                  </strong>
                  /{targetLength}자
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">
                  공백 제외 <strong className="text-slate-700">{charCountWithoutSpaces.toLocaleString()}</strong>자
                </span>
              </div>
            </div>

            {/* 분량 진행률 게이지 */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  progressPercent >= 90 && progressPercent <= 110
                    ? 'bg-emerald-500'
                    : progressPercent > 110
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 답안 본문 작성 텍스트 영역 */}
            <div>
              <label
                htmlFor="essay-content"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
              >
                논술 답안 작성
              </label>
              <textarea
                id="essay-content"
                rows={16}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="서론(도입) - 본론(비교·분석·논증) - 결론(종합)의 흐름을 의식하며 답안을 작성해 보세요."
                className="w-full p-4 text-[15px] leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-y font-sans"
              />
            </div>

            {/* 하단 액션 버튼 영역 */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </button>

              <div className="flex items-center gap-2.5">
                {savedToast && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    임시 저장되었습니다
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  임시 저장
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측(또는 하단): 논술 글쓰기 핵심 가이드 사이드바 */}
        <aside className="flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BookOpen className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-extrabold text-slate-900">논술 글쓰기 기본 원칙</h2>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <li className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-900 font-bold mb-0.5">1. 두괄식 핵심 문장 배치</strong>
                각 문단의 첫 문장에 논제의 요구사항에 답하는 핵심 주장을 명확하게 제시하세요.
              </li>
              <li className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-900 font-bold mb-0.5">2. 제시문 문장 그대로 옮겨 쓰기 지양</strong>
                제시문의 핵심 어휘는 활용하되, 문장 구조는 자신의 언어로 일반화·추상화하여 재구성하세요.
              </li>
              <li className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="block text-slate-900 font-bold mb-0.5">3. 적정 분량(90%~100%) 준수</strong>
                목표 글자 수의 ±10% 이내를 유지하며 문단 간 균형 잡힌 비중을 배분하세요.
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              실전 기출 & AI 채점 안내
            </div>
            <h3 className="text-sm font-extrabold mb-2">
              대학별 실전 원고지 환경에서 연습하고 싶으신가요?
            </h3>
            <p className="text-xs text-blue-100 leading-relaxed mb-4">
              메인 화면에서 목표 대학을 선택하면 실제 고사장 원고지 UI와 대학별 루브릭 기반 AI 정밀 첨삭을 이용할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold rounded-lg transition cursor-pointer"
            >
              대학별 실전 논술 보러 가기
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}

