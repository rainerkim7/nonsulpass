'use client'

import React, { useState, useEffect } from 'react'
import { X, Sparkles, RefreshCw, Copy, Check, Terminal, Play, Sliders } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PromptInspectorModalProps {
  isOpen: boolean
  onClose: () => void
  university: string
  examTitle: string
  questionLabel: string
  questionTitle: string
  charLimit: string
  passages: any[]
  rubric: any
  modelAnswer: string
  studentAnswer: string
  onRunCustomGrade: (customSysPrompt: string, customUserPrompt: string) => void
  isGrading: boolean
}

export default function PromptInspectorModal({
  isOpen,
  onClose,
  university,
  examTitle,
  questionLabel,
  questionTitle,
  charLimit,
  passages,
  rubric,
  modelAnswer,
  studentAnswer,
  onRunCustomGrade,
  isGrading,
}: PromptInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'system'>('user')
  const [copied, setCopied] = useState(false)

  // 기본 시스템 프롬프트 생성 헬퍼
  const generateDefaultSystemPrompt = () => {
    return `당신은 대한민국 명문 대학 인문/사회계열 논술 출제위원장이자 수석 채점위원입니다.
제출된 답안을 아래의 [문제 발문], [제시문], [공식 채점 기준표]만을 엄격한 평가 잣대로 삼아 독립적이고 객관적인 블라인드 채점(Blind Grading)을 수행하십시오.

【블라인드 정밀 채점 원칙】
1. **절대적 채점 기준표 기반 평가 (후광 효과 배제)**:
   - 제출된 답안이 모범답안이든 누구의 글이든 상관없이, 오직 [공식 채점 기준표]의 각 영역별 배점과 세부 필수 요구조건을 실제로 충족했는지만으로 점수를 평가하십시오.
   - 답안이 유려하더라도 채점 기준표에 명시된 필수 논점이나 상반된 두 입장의 구체적 논거를 구체적으로 서술하지 않고 추상적으로 얼버무렸다면, 반드시 해당 영역에서 감점(부분 점수)을 엄격히 적용하십시오.
   - 채점 기준표의 세부 논거를 100% 온전히 전개하지 못한 답안에 무비판적으로 100점 만점을 부여하는 것은 중대한 채점 오류입니다. (미흡한 영역이 있다면 80점대 등의 실질 점수를 부여할 것)
2. **배점 합산 일치**: "criteria" 배열의 각 평가 항목별 획득 점수("score")의 합계가 "totalScore"와 반드시 정확히 일치해야 합니다. (총점 100점 만점 기준)
3. **실질적 감점 요인 명시**: "deductions" 항목에는 채점 기준표 대비 실제 누락되거나 축약된 논점, 논리적 비약 등 구체적인 감점 사유와 감점 점수(음수)를 사실대로 기재하십시오.
4. **개념어 적중 및 분량**: 규정 분량(${charLimit || '800±100자'}) 준수 여부 및 채점 기준의 핵심 개념어 도출 여부를 엄밀히 평가하십시오.

반드시 다음 JSON 규격에 맞추어 한국어로만 응답하십시오. (Markdown 코드블록 없이 순수 JSON만 출력)

{
  "examTitle": "${university} ${examTitle} ${questionLabel} 정밀 채점 리포트",
  "questionLabel": "${questionLabel}",
  "studentName": "수험생",
  "totalScore": 0,
  "maxPossibleScore": 100,
  "cutlineScore": 82,
  "statusVerdict": "합격 가능권",
  "charCount": ${studentAnswer ? studentAnswer.replace(/\\r\\n/g, '\\n').length : 0},
  "charStatus": "통과 · 감점 0점",
  "conceptHits": {
    "matchedCount": 0,
    "targetTotal": 5,
    "keywords": ["적중키워드1", "적중키워드2"]
  },
  "structureGrade": "A",
  "criteria": [
    {
      "category": "평가 영역 명칭 및 배점",
      "score": 0,
      "maxScore": 20,
      "feedback": "답안에서 해당 영역에 대한 구체적 평가 및 감점/점수 부여 이유",
      "warning": "필요시 감점 요인 명시 또는 생략"
    }
  ],
  "examinerVerdict": {
    "oneLiner": "출제위원의 날카롭고 직관적인 한 줄 총평 (따옴표 포함)",
    "coreAdvice": "이번 답안의 가장 핵심적인 개선 과제 및 다음 글쓰기를 위한 구체적 처방"
  },
  "deductions": [
    {
      "location": "논증 · 문단 위치",
      "originalSentence": "답안 중 실제 감점 원인이 된 문장 인용",
      "critique": "채점 기준 대비 왜 이 서술이 감점 요인인지 구체적 비판",
      "penaltyScore": -6
    }
  ],
  "rewrite": {
    "beforeText": "답안에서 가장 보완이 필요한 원문 문단 발췌",
    "flawReason": "어떤 논리적 결함이나 채점 기준 미충족(논거 누락)이 있었는지 명시",
    "afterText": "채점 기준표의 모든 요구조건을 완벽히 충족하도록 보완한 최고 수준의 모범 문장/문단"
  }
}`
  }

  // 기본 사용자 프롬프트 생성 헬퍼
  const generateDefaultUserPrompt = () => {
    const passagesText = Array.isArray(passages)
      ? passages
          .map((p: any) => `${p.badge || '[제시문]'}\n${Array.isArray(p.paragraphs) ? p.paragraphs.join('\n') : p.text || p.content || ''}`)
          .join('\n\n')
      : ''

    const rubricText = rubric ? JSON.stringify(rubric, null, 2) : '대학별 공식 채점 지침에 따름'

    return `[문제 발문]:
${questionTitle || `${university} ${questionLabel}`}

[규정 분량]:
${charLimit || '800±100자'}

[제시문]:
${passagesText}

[공식 채점 기준표 및 배점 가이드]:
${rubricText}

[학생이 실제 작성한 답안 (평가 대상)]:
${studentAnswer || '(작성된 답안이 없습니다)'}

[답안 첨삭용 참고자료 (※ 주의: 이 참고자료는 rewrite 작성 시 참고용이며, 학생 답안 채점은 오직 위의 [공식 채점 기준표]의 기준과 배점에 따라 독립적이고 엄격하게 수행해야 함)]:
${modelAnswer || '제시문과 발문의 논리적 일치 여부로 판단'}`
  }

  const [systemPrompt, setSystemPrompt] = useState(generateDefaultSystemPrompt())
  const [userPrompt, setUserPrompt] = useState(generateDefaultUserPrompt())

  // 모달이 열리거나 문제/답안이 바뀔 때 초기 프롬프트 동기화
  useEffect(() => {
    if (isOpen) {
      setSystemPrompt(generateDefaultSystemPrompt())
      setUserPrompt(generateDefaultUserPrompt())
    }
  }, [isOpen, university, examTitle, questionLabel, questionTitle, charLimit, passages, rubric, modelAnswer, studentAnswer])

  if (!isOpen) return null

  const handleResetToDefault = () => {
    if (confirm('현재 수정한 프롬프트 내용을 버리고, 기본 자동 조립 프롬프트로 초기화하시겠습니까?')) {
      setSystemPrompt(generateDefaultSystemPrompt())
      setUserPrompt(generateDefaultUserPrompt())
    }
  }

  const handleCopyCurrent = () => {
    const fullText = activeTab === 'user' ? userPrompt : systemPrompt
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunTest = () => {
    onRunCustomGrade(systemPrompt, userPrompt)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Terminal size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                AI 채점 프롬프트 실시간 검사기 & 튜닝 샌드박스
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {university} · {questionLabel} 채점 시 Google Gemini 3.5 Flash로 전송되는 원문 프롬프트를 확인하고 즉석 튜닝합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 탭 네비게이션 & 제어 바 */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('user')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'user' ? '#1e3a8a' : '#e2e8f0',
                color: activeTab === 'user' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📄 사용자 프롬프트 (User Prompt)</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'user' ? '#3b82f6' : '#cbd5e1',
                  color: activeTab === 'user' ? '#ffffff' : '#334155',
                }}
              >
                발문·제시문·루브릭·답안
              </span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'system' ? '#1e3a8a' : '#e2e8f0',
                color: activeTab === 'system' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>⚙️ 시스템 프롬프트 (System Prompt)</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'system' ? '#3b82f6' : '#cbd5e1',
                  color: activeTab === 'system' ? '#ffffff' : '#334155',
                }}
              >
                출제위원 원칙 & JSON 규격
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyCurrent}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
              <span>{copied ? '복사 완료!' : '원문 복사'}</span>
            </button>
            <button
              onClick={handleResetToDefault}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#b91c1c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RefreshCw size={13} />
              <span>기본값 복원</span>
            </button>
          </div>
        </div>

        {/* 본문 에디터 영역 */}
        <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
          {activeTab === 'user' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  ✏️ 사용자 프롬프트 본문 (문제 발문, 제시문, 루브릭 채점표, 학생 답안이 실시간 동적 주입됨)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  글자 수: {userPrompt.length.toLocaleString()}자
                </span>
              </div>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '380px',
                  padding: '14px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  resize: 'vertical',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  ⚙️ 시스템 프롬프트 본문 (출제위원 페르소나, 블라인드 평가 원칙, 점수 산출 및 JSON 출력 스키마)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  글자 수: {systemPrompt.length.toLocaleString()}자
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '380px',
                  padding: '14px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  resize: 'vertical',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
            </div>
          )}
        </div>

        {/* 하단 푸터 액션 바 */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} className="text-blue-600" />
            <span>프롬프트를 수정한 후 <strong>[수정된 프롬프트로 즉시 채점 실행]</strong>을 누르면 튜닝 결과가 실시간 반영됩니다.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGrading}
              style={{ fontSize: '13px', fontWeight: 600, padding: '8px 16px' }}
            >
              창 닫기
            </Button>
            <Button
              onClick={handleRunTest}
              disabled={isGrading}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={14} fill="#ffffff" />
              <span>{isGrading ? '커스텀 채점 분석 진행 중...' : '🚀 수정된 프롬프트로 즉시 채점 실행'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
