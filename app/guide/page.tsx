'use client'

/**
 * @file app/guide/page.tsx
 * @description 대입 논술 글쓰기 핵심 이론 및 유형별 작성 방법 가이드 페이지
 *              (4대 출제 유형 공식, 단락 구성 원리, 모범 vs 감점 문장 비교 및 연습장 연동)
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ArrowLeft,
  PenTool,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Compass,
  FileCheck,
  Lightbulb,
} from 'lucide-react'
import Brand from '@/components/common/Brand'

// 4대 핵심 논술 유형 데이터 정의
interface EssayTypeGuide {
  id: 'summary' | 'compare' | 'apply' | 'critique'
  badge: string
  title: string
  subtitle: string
  formula: string[]
  keyPoints: string[]
  examplePrompt: string
  structureTip: string
}

const ESSAY_TYPE_GUIDES: EssayTypeGuide[] = [
  {
    id: 'summary',
    badge: '유형 01 · 요약형',
    title: '제시문 요약과 핵심 논지 추출',
    subtitle: '제시문의 중심 주장과 핵심 논거를 자신의 언어로 압축·재구성하는 모든 논술의 출발점입니다.',
    formula: [
      '1문장: 제시문의 핵심 주장(결론)을 두괄식으로 천명',
      '2~3문장: 주장을 뒷받침하는 핵심 이유·근거·메커니즘 서술',
      '마무리: 구체적 사례나 비유는 상위 개념으로 일반화·추상화하여 정리',
    ],
    keyPoints: [
      '제시문 속 문장을 그대로 옮겨 적지 말고 핵심 개념어를 활용해 문장을 새로 조합할 것',
      '예시·통계·에피소드 자체를 나열하지 말고 그 사례가 증명하려는 일반 원리를 서술할 것',
      '단락 내 문장 간 인과관계(왜냐하면, 이에 따라, 결과적으로)를 명확히 드러낼 것',
    ],
    examplePrompt: '제시문 (가)의 논지를 250자 내외로 요약하시오.',
    structureTip: '[중심 주장] + [핵심 논거 1] + [핵심 논거 2 / 의의 및 결론]',
  },
  {
    id: 'compare',
    badge: '유형 02 · 비교·분석형',
    title: '공통 쟁점 도출과 관점의 대조',
    subtitle: '두 개 이상의 제시문이 공유하는 공통 주제를 밝히고, 세부 기준에 따라 입장의 차이를 선명하게 대비합니다.',
    formula: [
      '도입(공통점): 제시문들이 공통으로 다루는 핵심 쟁점(문제의식)을 한 문장으로 정의',
      '전개(비교 기준 1): 첫 번째 기준(예: 원인·성격·주체)에서 각 제시문의 입장 대조',
      '심화(비교 기준 2): 두 번째 기준(예: 해결 방식·지향점·한계)에서 각 제시문의 차이점 심층 분석',
    ],
    keyPoints: [
      '(가) 요약 후 (나)를 따로 요약하는 단순 나열식 구성을 피하고, 반드시 비교 기준(항목)을 중심으로 교차 서술할 것',
      '비교 기준어를 명시적으로 제시하여 채점자가 대조의 축을 한눈에 파악할 수 있게 할 것',
      '단순히 "다르다"가 아니라 "무엇을 중시하는가 vs 무엇을 경계하는가"처럼 구체적 속성으로 대비할 것',
    ],
    examplePrompt: '제시문 (가), (나), (다)의 관점을 비교·분석하시오.',
    structureTip: '[공통 쟁점 정의] → [기준 A에 따른 (가)·(나)·(다) 대비] → [기준 B에 따른 (가)·(나)·(다) 대비]',
  },
  {
    id: 'apply',
    badge: '유형 03 · 설명·적용형',
    title: '이론·관점을 통한 현상 및 자료 해석',
    subtitle: '특정 제시문의 원리(준거 틀)를 바탕으로 다른 제시문의 사례, 문학 작품, 도표·통계 자료의 의미를 분석합니다.',
    formula: [
      '1단계(준거 제시): 기준이 되는 제시문(이론·관점)의 핵심 원리를 간결하게 정의',
      '2단계(대상 분석): 적용 대상(사례·도표·문학)의 핵심 특징이나 수치 변화를 정리',
      '3단계(연결·해석): 기준 원리의 개념어를 대상의 세부 요소에 일대일(1:1)로 대응시켜 의미 도출',
    ],
    keyPoints: [
      '이론 제시문과 대상 제시문이 따로 놀지 않도록, 반드시 이론의 개념어로 현상을 설명할 것',
      '도표·통계 자료가 주어질 경우 단순 수치 나열을 넘어 추세·격차·역전 현상이 함의하는 바를 짚어낼 것',
      '문학 작품이나 우화가 주어질 경우 상징적 소재가 현실의 어떤 개념에 대응하는지 번역하여 서술할 것',
    ],
    examplePrompt: '제시문 (가)의 관점을 바탕으로 제시문 (나)의 현상(또는 도표)을 설명하시오.',
    structureTip: '[준거 제시문 (가)의 핵심 논리] + [대상 (나)의 특징 요약] + [(가)의 원리로 본 (나)의 의미·원인 규명]',
  },
  {
    id: 'critique',
    badge: '유형 04 · 비판·견해 논증형',
    title: '다각적 비판과 논리적 대안 제시',
    subtitle: '특정 입장의 타당성과 한계를 균형 있게 평가하거나, 쟁점에 대한 자신의 입장을 설정하고 설득력 있게 논증합니다.',
    formula: [
      '주장 천명: 논제가 요구하는 평가 결과(타당/부당, 찬성/반대, 절충안)를 첫 문장에 명확히 선언',
      '논거 제시: 제시문들의 논리나 객관적 근거를 활용하여 자신의 주장을 뒷받침 (최소 2가지 측면)',
      '예상 반론 고려 및 보완: 상대 관점의 한계를 지적하거나 실현 가능한 보완책·통합적 시각 제시',
    ],
    keyPoints: [
      '개인의 막연한 감정이나 상투적 도덕론이 아니라 제시문 내부의 논리적 근거를 토대로 비판할 것',
      '양비론이나 모호한 중립에 머무르지 말고, 어떤 조건에서 무엇이 우선되어야 하는지 명확한 기준을 세울 것',
      '비판할 때는 상대 입장의 전제 오류, 예상되는 부작용, 현실 적용의 한계 등을 구체적으로 타격할 것',
    ],
    examplePrompt: '제시문 (가)의 입장에서 (나)를 비판하고, 본인의 견해를 논술하시오.',
    structureTip: '[명확한 입장/판단 선언] → [근거 1: 원리적 측면] → [근거 2: 파급 효과/한계 측면] → [종합 결론]',
  },
]

export default function EssayGuidePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<EssayTypeGuide['id']>('summary')

  const currentGuide = ESSAY_TYPE_GUIDES.find((g) => g.id === activeTab) || ESSAY_TYPE_GUIDES[0]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 상단 글로벌 헤더 */}
      <header className="home-topbar">
        <Brand onHome={() => router.push('/')} />
        <nav className="home-nav" aria-label="주요 메뉴">
          <button
            type="button"
            onClick={() => router.push('/guide')}
            className="text-blue-600 font-bold text-sm cursor-pointer"
          >
            논술 글쓰기
          </button>
          <button
            type="button"
            onClick={() => router.push('/writing')}
            className="text-slate-600 hover:text-blue-700 font-semibold text-sm transition cursor-pointer"
          >
            논술 연습장
          </button>
        </nav>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/writing')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            논술 연습장 가기
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            메인으로
          </button>
        </div>
      </header>

      {/* 히어로 배너 섹션 */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-12 px-6 border-b border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3.5">
            <BookOpen className="w-3.5 h-3.5" />
            ESSAY THEORY & METHODOLOGY
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            대입 논술 글쓰기 핵심 이론 & 작성법
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
            대입 논술은 문학적 감수성이 아니라 <strong className="text-white">정확한 독해력, 논리적 구조화, 명확한 개념화</strong>를
            평가하는 시험입니다. 출제위원이 채점표에서 찾는 핵심 요소와 유형별 답안 작성 공식을 익혀보세요.
          </p>
        </div>
      </section>

      {/* 메인 콘텐츠 컨테이너 */}
      <div className="max-w-5xl w-full mx-auto py-10 px-4 md:px-6 space-y-12">
        {/* 1. 논술 답안 작성의 3단계 프로세스 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                1. 합격 답안을 만드는 3단계 사고 과정
              </h2>
              <p className="text-xs text-slate-500">
                원고지에 첫 문장을 쓰기 전 반드시 거쳐야 하는 논리적 설계 단계입니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="inline-block text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mb-3">
                STEP 01 · 논제 분석
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">
                요구사항 쪼개기 (단락 설계)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                논제 문장 속에 숨어 있는 질문의 개수와 조건(비교, 설명, 비판, 분량)을 분리합니다. 질문의 구조가 곧 내 답안의 단락(문단) 구성 비율이 됩니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="inline-block text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-3">
                STEP 02 · 제시문 독해 및 연결
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">
                핵심어 추출 및 관계망 도식화
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                각 제시문의 중심 문장에 밑줄을 긋고, 제시문 간 공통 쟁점과 대립항(A vs B) 또는 인과 고리(원리 → 현상)를 여백에 간단한 표나 화살표로 정리합니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <span className="inline-block text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md mb-3">
                STEP 03 · 두괄식 문단 집필
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">
                주제문 선행 + 논거 뒷받침
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                모든 문단의 첫 문장은 논제의 질문에 직접 답하는 핵심 결론(주제문)이어야 합니다. 이후 구체적인 이유와 제시문 근거를 연결해 설득력을 높입니다.
              </p>
            </div>
          </div>
        </section>

        {/* 2. 4대 핵심 출제 유형별 작성 공식 (탭 전환) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                2. 4대 핵심 출제 유형별 작성 공식
              </h2>
              <p className="text-xs text-slate-500">
                모든 대학의 인문·사회 논술은 아래 4가지 기본 유형의 결합으로 출제됩니다.
              </p>
            </div>
          </div>

          {/* 유형 선택 탭 버튼 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {ESSAY_TYPE_GUIDES.map((item) => {
              const isSelected = item.id === activeTab
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`block text-[11px] font-bold mb-0.5 ${
                      isSelected ? 'text-blue-100' : 'text-blue-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-xs md:text-sm font-extrabold">{item.title.split(' ')[0]} 집중 공략</span>
                </button>
              )
            })}
          </div>

          {/* 선택된 유형 상세 카드 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                {currentGuide.badge}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">{currentGuide.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{currentGuide.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 좌측: 단락 작성 공식 */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  단락 전개 표준 공식
                </h4>
                <ul className="space-y-2.5 text-xs md:text-sm text-slate-700 font-medium">
                  {currentGuide.formula.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-3 border-t border-slate-200/80">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1">대표 발문 예시</span>
                  <p className="text-xs font-bold text-blue-900 bg-blue-100/60 px-3 py-2 rounded-lg">
                    “{currentGuide.examplePrompt}”
                  </p>
                  <span className="block text-[11px] font-bold text-slate-500 mt-2.5 mb-1">추천 문단 뼈대</span>
                  <p className="text-xs font-semibold text-slate-800">{currentGuide.structureTip}</p>
                </div>
              </div>

              {/* 우측: 고득점 핵심 체크포인트 */}
              <div className="flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    채점위원이 보는 고득점 핵심 포인트
                  </h4>
                  <ul className="space-y-3">
                    {currentGuide.keyPoints.map((pt, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/40 border border-blue-100 text-xs text-slate-700 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <strong className="block font-bold text-blue-300">이 유형을 직접 연습해 볼까요?</strong>
                    <span className="text-slate-300">논술 연습장에서 목표 글자 수를 맞추며 작성해 보세요.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/writing')}
                    className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    연습장 이동 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 실전 문장 교정 비교 (감점 답안 vs 합격 답안) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                3. 한눈에 보는 감점 문장 vs 합격 문장
              </h2>
              <p className="text-xs text-slate-500">
                같은 내용을 알고 있어도 표현과 구조화 방식에 따라 점수가 크게 달라집니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 감점 사례 */}
            <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm mb-3">
                <AlertTriangle className="w-4 h-4" />
                감점되는 답안 습관 (Bad)
              </div>
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                  <strong className="block text-rose-900 mb-1">❌ 제시문 단순 나열 (비교 기준 부재)</strong>
                  “제시문 (가)는 개인의 자유가 중요하다고 말한다. 반면 제시문 (나)는 공동체의 질서와 연대를 강조하고 있다. 두 제시문은 서로 입장이 다르다.”
                </div>
                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                  <strong className="block text-rose-900 mb-1">❌ 비유·사례 그대로 복사</strong>
                  “제시문 (다)에서 양치기들이 목초지에 양을 계속 늘렸기 때문에 결국 풀밭이 황폐해졌다.”
                </div>
              </div>
            </div>

            {/* 합격 사례 */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-3">
                <CheckCircle2 className="w-4 h-4" />
                채점위원이 선호하는 답안 (Good)
              </div>
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <strong className="block text-emerald-950 mb-1">✅ 공통 쟁점 + 비교 기준 명시</strong>
                  “제시문 (가)와 (나)는 모두 <strong>개인과 사회의 바람직한 관계</strong>를 논한다. 그러나 <strong>가치의 우선순위</strong> 측면에서 (가)는 개인의 자율적 권리를 최우선으로 보는 반면, (나)는 공동체적 연대와 책임을 선결 조건으로 본다.”
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <strong className="block text-emerald-950 mb-1">✅ 사례의 개념화·일반화</strong>
                  “제시문 (다)는 <strong>공유 자원에 대한 개인의 합리적 이익 추구가 집단 전체의 비합리적 자원 고갈(공유지의 비극)로 귀결되는 구조적 모순</strong>을 보여준다.”
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 하단 CTA 배너 */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold">
              이론을 익혔다면 이제 직접 한 단락씩 써볼 차례입니다
            </h2>
            <p className="text-xs md:text-sm text-blue-100 mt-1">
              논술 연습장에서 자유롭게 글을 작성하거나, 메인 페이지에서 대학별 기출문제를 선택해 실전 AI 첨삭을 받아보세요.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/writing')}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <PenTool className="w-3.5 h-3.5" />
              논술 연습장으로 이동
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2.5 bg-blue-800/60 hover:bg-blue-800 text-white border border-blue-400/30 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              대학별 실전 문제 풀기
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

