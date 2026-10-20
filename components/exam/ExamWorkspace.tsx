'use client'

/**
 * @file components/exam/ExamWorkspace.tsx
 * @description 논술 기출 및 모의고사 문제 응시, 제시문 독해 및 원고지 답안 작성 화면 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Clock3,
  Menu,
  FileText,
  Check,
  RotateCcw,
  Lightbulb,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Loader2,
  X,
  Copy,
  Sparkles,
  BookOpen,
  Edit3,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  FileUp,
  RefreshCw,
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Brand from '@/components/common/Brand'
import { useAuth } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase'
import { getQuestionsData, fetchExamQuestionsFromDb, QuestionsMap } from '@/lib/exam-helper'
import type { GradingReportData } from '@/types/grading'
import ManuscriptModal from './ManuscriptModal'
import HandwritingOcrModal from './HandwritingOcrModal'
import ExamInlineEditor from './admin/ExamInlineEditor'
import PromptInspectorModal from './PromptInspectorModal'
import PassPurchaseModal from '@/components/payment/PassPurchaseModal'
import { useUserPass } from '@/lib/use-user-pass'
import { Terminal, Camera } from 'lucide-react'

/**
 * 제시문 및 모범답안 단락 포맷팅 렌더러
 * - 마크다운 이미지 `![alt](url)` 감지 시 고해상도 반응형 이미지 카드로 렌더링
 * - 수학 수식/조건식 블록 전용 스타일 적용
 */
function renderFormattedParagraph(para: string, key: React.Key) {
  if (!para) return null
  const trimmed = para.trim()
  if (!trimmed) return null

  // 1. 단락 내에 마크다운 이미지(![alt](url))가 포함되어 있는 경우 (단독 또는 복합 텍스트 혼합)
  if (trimmed.includes('![') && /!\[(.*?)\]\((.*?)\)/.test(trimmed)) {
    const parts = trimmed.split(/(!\[.*?\]\(.*?\))/g).filter(Boolean)
    return (
      <React.Fragment key={key}>
        {parts.map((part, pIdx) => {
          const imgMatch = part.trim().match(/^!\[(.*?)\]\((.*?)\)$/)
          if (imgMatch) {
            const altText = imgMatch[1].trim()
            const imgUrl = imgMatch[2].trim()
            return (
              <div
                key={`${String(key)}-img-${pIdx}`}
                style={{
                  margin: '16px 0',
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <img
                  src={imgUrl}
                  alt={altText || '문항 도표/그래프'}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '420px',
                    borderRadius: '8px',
                    objectFit: 'contain'
                  }}
                />
                {altText && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    ▲ {altText}
                  </span>
                )}
              </div>
            )
          }

          const partTrimmed = part.trim()
          if (!partTrimmed) return null

          // 소문항 번호((1), (2), (3) 등)나 발문 기호로 시작하는 문장은 일반 본문으로 통일
          const isSubQuestion = /^\(\d+\)|^\([a-zA-Z]\)|^※|^【/.test(partTrimmed)
          const isMath = !isSubQuestion && (
            partTrimmed.includes('y =') ||
            partTrimmed.includes('∫') ||
            (partTrimmed.startsWith('① ') && partTrimmed.includes('=')) ||
            (partTrimmed.startsWith('② ') && partTrimmed.includes('='))
          )

          if (isMath) {
            return (
              <div
                key={`${String(key)}-txt-${pIdx}`}
                style={{
                  margin: '10px 0',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontFamily: "'Pretendard', -apple-system, sans-serif",
                  fontSize: '13.5px',
                  lineHeight: 1.65,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {partTrimmed}
              </div>
            )
          }

          return (
            <p key={`${String(key)}-txt-${pIdx}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, marginBottom: '12px' }}>
              {partTrimmed}
            </p>
          )
        })}
      </React.Fragment>
    )
  }

  // 2. 수식 및 함수 다중행 블록 감지 (소문항 번호로 시작하는 문장은 제외하여 (1), (2), (3) 위계 통일)
  const isSubQuestion = /^\(\d+\)|^\([a-zA-Z]\)|^※|^【/.test(trimmed)
  const isMathBlock = !isSubQuestion && (
    trimmed.includes('y =') ||
    trimmed.includes('∫') ||
    (trimmed.startsWith('① ') && trimmed.includes('=')) ||
    (trimmed.startsWith('② ') && trimmed.includes('='))
  )

  if (isMathBlock) {
    return (
      <div
        key={key}
        style={{
          margin: '10px 0',
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontFamily: "'Pretendard', -apple-system, sans-serif",
          fontSize: '13.5px',
          lineHeight: 1.65,
          color: '#1e293b',
          whiteSpace: 'pre-wrap'
        }}
      >
        {trimmed}
      </div>
    )
  }

  // 3. 일반 본문 단락
  return (
    <p key={key} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, marginBottom: '12px' }}>
      {trimmed}
    </p>
  )
}

interface ExamWorkspaceProps {
  selectedUniv?: string
  selectedExamId?: string
  initialQuestion?: string
  onReport: (report?: GradingReportData, questionId?: 'q1' | 'q2') => void
  onBack?: () => void
  onHome?: () => void
}

export default function ExamWorkspace({
  selectedUniv = '홍익대학교',
  selectedExamId = 'hongik-2026-humanities-real',
  initialQuestion = 'q1',
  onReport,
  onBack,
  onHome,
}: ExamWorkspaceProps) {
  // 로그인 사용자 및 관리자 권한 확인
  const { isAdmin, user, userDisplayName, openAuthModal } = useAuth()

  // 현재 응시 중인 대학명 (props와 동기화)
  const currentUniv = selectedUniv || (selectedExamId?.startsWith('khu') ? '경희대학교' : selectedExamId?.startsWith('dongguk') ? '동국대학교' : '홍익대학교')

  // 대학 패스 및 잔여 채점 크레딧 상태 관리
  const {
    userPass,
    remainingCredits,
    hasActivePass,
    consumeCredit,
    grantPass,
    isPurchaseModalOpen,
    openPurchaseModal,
    closePurchaseModal,
  } = useUserPass(currentUniv)

  // 관리자 전용 인라인 문제 편집 모드 활성화 상태
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  // 문항 데이터 DB 저장 진행 상태
  const [isSavingExam, setIsSavingExam] = useState<boolean>(false)
  // 특정 제시문 도표 이미지 업로드 진행 상태 (제시문 인덱스)
  const [uploadingPassageIdx, setUploadingPassageIdx] = useState<number | null>(null)
  // 관리자 전용 상단 알림 배너
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  // 파일 선택 창 참조
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  // 문제지 원본 PDF 상태 및 전용 업로더 참조
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [pdfName, setPdfName] = useState<string>('')
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)

  // 문제 탭 전환 상태 (q1, q2, q3 등 동적 지원)
  const [activeQuestion, setActiveQuestion] = useState<string>(initialQuestion || 'q1')

  // 문제별 작성 답안 및 활성 리포트 localStorage 실시간 자동 보존 및 복원 키 헬퍼
  const getDraftStorageKey = (examId: string, qKey: string) => `nonsul_draft_${examId || 'common'}_${qKey}`
  const getActiveSubKey = (examId: string, qKey: string) => `nonsul_active_sub_${examId || 'common'}_${qKey}`
  const getActiveReportKey = (examId: string, qKey: string) => `nonsul_active_report_${examId || 'common'}_${qKey}`

  // 문제별 작성 답안 상태 (컴포넌트 마운트 시 localStorage에 저장된 임시 답안 자동 복원)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const targetExam = selectedExamId || 'common'
      const key = `nonsul_draft_${targetExam}_${initialQuestion || 'q1'}`
      const saved = localStorage.getItem(key)
      return saved ? { [initialQuestion || 'q1']: saved } : {}
    } catch {
      return {}
    }
  })
  const [showModelModal, setShowModelModal] = useState(false)
  const [showRubricModal, setShowRubricModal] = useState(false)
  // ▦ 200자 정통 원고지 팝업 모달 상태
  const [showManuscriptModal, setShowManuscriptModal] = useState<boolean>(false)
  // 📷 손글씨/원고지 사진 다중 업로드 및 Gemini AI 텍스트 변환(OCR) 모달 상태
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false)
  // 🔍 관리자 전용 채점 프롬프트 실시간 검사 및 튜닝 모달 상태
  const [showPromptInspector, setShowPromptInspector] = useState<boolean>(false)

  // 📝 수험생 이전 제출 및 첨삭 이력 상태
  interface SubmissionHistoryItem {
    id: string
    exam_id: string
    exam_title: string
    question_label: string
    student_answer: string
    char_count: number
    total_score: number
    status_verdict: string
    grading_report: GradingReportData
    created_at: string
  }
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  // 현재 선택되어 에디터에 로드된 첨삭 이력 ID (localStorage 하이브리드 연동으로 언마운트 시에도 영구 기억)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const targetExam = selectedExamId || 'common'
      const key = `nonsul_active_sub_${targetExam}_${initialQuestion || 'q1'}`
      return localStorage.getItem(key)
    } catch {
      return null
    }
  })

  // 답안 불러오기 안내 토스트 배너 상태
  const [loadNotice, setLoadNotice] = useState<string | null>(null)

  // 이전 작성 답안 에디터로 불러오기 핸들러 (선택된 이력 ID 갱신, 에디터 로드, 로컬 스토리지에 1:1 영구 저장)
  const handleLoadSubmissionAnswer = (item: SubmissionHistoryItem) => {
    setSelectedSubmissionId(item.id)
    handleAnswerChange(item.student_answer)
    if (typeof window !== 'undefined') {
      try {
        const subKey = getActiveSubKey(selectedExamId, activeQuestion)
        const reportKey = getActiveReportKey(selectedExamId, activeQuestion)
        localStorage.setItem(subKey, item.id)
        if (item.grading_report) {
          const repObj = typeof item.grading_report === 'string'
            ? JSON.parse(item.grading_report)
            : item.grading_report
          const reportJson = JSON.stringify(repObj)
          localStorage.setItem(reportKey, reportJson)
          localStorage.setItem('nonsul_active_grading_report', reportJson)
        }
      } catch (e) {
        console.warn('[ExamWorkspace] active submission 로컬 저장 오류:', e)
      }
    }
    setLoadNotice('선택하신 답안을 작성창에 불러왔습니다. 상단의 [리포트] 버튼을 클릭하면 이 답안의 채점 리포트를 언제든 확인할 수 있습니다.')
    setTimeout(() => {
      setLoadNotice(null)
    }, 4500)
  }

  // 첨삭 이력 카드 클릭 토글 핸들러 (선택 시 답안 로드, 이미 선택된 카드 재클릭 시 선택 해제 및 답안 지우기)
  const handleToggleSubmissionCard = (item: SubmissionHistoryItem) => {
    if (selectedSubmissionId === item.id) {
      // 이미 선택된 카드를 다시 클릭하면: 선택 해제 및 작성창 답안 비우기
      setSelectedSubmissionId(null)
      handleAnswerChange('')
      if (typeof window !== 'undefined') {
        try {
          const subKey = getActiveSubKey(selectedExamId, activeQuestion)
          const reportKey = getActiveReportKey(selectedExamId, activeQuestion)
          localStorage.removeItem(subKey)
          localStorage.removeItem(reportKey)
        } catch (e) {
          console.warn('[ExamWorkspace] active submission 로컬 삭제 오류:', e)
        }
      }
      setLoadNotice('선택을 해제하고 답안 작성창을 초기화했습니다.')
      setTimeout(() => {
        setLoadNotice(null)
      }, 3000)
    } else {
      // 새로운 카드를 클릭하면 답안 로드
      handleLoadSubmissionAnswer(item)
    }
  }

  // 이전 제출 이력 삭제 핸들러
  const handleDeleteSubmission = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('정말로 이 첨삭 기록을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('student_submissions').delete().eq('id', id)
      if (error) throw error
      setSubmissionHistory(prev => prev.filter(item => item.id !== id))
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`)
    }
  }

  // 관리자 토스트 알림 표시
  const triggerAdminNotice = (type: 'success' | 'error', message: string) => {
    setAdminNotice({ type, message })
    setTimeout(() => {
      setAdminNotice(null)
    }, 4000)
  }

  // 발문 제목 변경 핸들러
  const handleUpdateTitle = (val: string) => {
    setQuestionsData(prev => ({
      ...prev,
      [activeQuestion]: {
        ...prev[activeQuestion],
        title: val
      }
    }))
  }

  // 발문 유의사항/지시문 변경 핸들러
  const handleUpdateNote = (val: string) => {
    setQuestionsData(prev => ({
      ...prev,
      [activeQuestion]: {
        ...prev[activeQuestion],
        note: val
      }
    }))
  }

  // 제시문 뱃지명 변경 핸들러 (예: [제시문 가])
  const handleUpdatePassageBadge = (pIdx: number, val: string) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        newPassages[pIdx] = { ...newPassages[pIdx], badge: val }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 제시문 단락(paragraph) 텍스트 변경 핸들러
  const handleUpdateParagraph = (pIdx: number, paraIdx: number, val: string) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        const newParas = [...newPassages[pIdx].paragraphs]
        newParas[paraIdx] = val
        newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 제시문에 새 본문 단락 추가 핸들러
  const handleAddParagraph = (pIdx: number) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        const newParas = [...newPassages[pIdx].paragraphs, '']
        newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 제시문 단락 삭제 핸들러
  const handleDeleteParagraph = (pIdx: number, paraIdx: number) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        const newParas = newPassages[pIdx].paragraphs.filter((_, idx) => idx !== paraIdx)
        newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 새 제시문([라], [마] 등) 추가 핸들러
  const handleAddPassage = () => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const hangulLabels = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차']
      const nextBadge = `[제시문 ${hangulLabels[q.passages.length] || q.passages.length + 1}]`
      const newPassages = [...q.passages, { badge: nextBadge, paragraphs: ['새 제시문 내용을 입력하세요.'] }]
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 제시문 전체 삭제 핸들러
  const handleDeletePassage = (pIdx: number) => {
    if (!confirm('해당 제시문을 삭제하시겠습니까?')) return
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = q.passages.filter((_, idx) => idx !== pIdx)
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 도표/그래프 이미지 업로드 대상 위치 (발문 상단/하단 또는 제시문 상단/하단)
  type UploadTarget =
    | { type: 'prompt'; position: 'top' | 'bottom' }
    | { type: 'passage'; pIdx: number; position: 'top' | 'bottom' }

  const uploadTargetRef = useRef<UploadTarget | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)

  // 도표/그래프 이미지 파일 선택 창 호출 (발문용)
  const handleTriggerPromptUpload = (position: 'top' | 'bottom') => {
    uploadTargetRef.current = { type: 'prompt', position }
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
      imageInputRef.current.click()
    }
  }

  // 도표/그래프 이미지 파일 선택 창 호출 (제시문용)
  const handleTriggerPassageUpload = (pIdx: number, position: 'top' | 'bottom') => {
    uploadTargetRef.current = { type: 'passage', pIdx, position }
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
      imageInputRef.current.click()
    }
  }

  // 단락 한 칸 위로 이동 핸들러
  const handleMoveParagraphUp = (pIdx: number, paraIdx: number) => {
    if (paraIdx <= 0) return
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        const newParas = [...newPassages[pIdx].paragraphs]
        const temp = newParas[paraIdx - 1]
        newParas[paraIdx - 1] = newParas[paraIdx]
        newParas[paraIdx] = temp
        newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 단락 한 칸 아래로 이동 핸들러
  const handleMoveParagraphDown = (pIdx: number, paraIdx: number) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const newPassages = [...q.passages]
      if (newPassages[pIdx]) {
        const newParas = [...newPassages[pIdx].paragraphs]
        if (paraIdx >= newParas.length - 1) return prev
        const temp = newParas[paraIdx + 1]
        newParas[paraIdx + 1] = newParas[paraIdx]
        newParas[paraIdx] = temp
        newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
      }
      return {
        ...prev,
        [activeQuestion]: { ...q, passages: newPassages }
      }
    })
  }

  // 발문에 첨부된 도표 이미지 삭제 핸들러
  const handleRemovePromptImage = (targetMarkdown: string) => {
    setQuestionsData(prev => {
      const q = prev[activeQuestion]
      if (!q) return prev
      const currentNote = q.note || ''
      const updatedNote = currentNote.replace(targetMarkdown, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim()
      return {
        ...prev,
        [activeQuestion]: { ...q, note: updatedNote }
      }
    })
    triggerAdminNotice('success', '문제 발문에서 도표 이미지가 제거되었습니다.')
  }

  // 도표/그래프 파일 업로드 및 선택된 위치(문제 위/아래, 제시문 상단/하단)에 자동 삽입
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const target = uploadTargetRef.current
    if (!file || !target) return

    setIsUploadingImage(true)
    if (target.type === 'passage') {
      setUploadingPassageIdx(target.pIdx)
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('univId', selectedUniv || 'common')

      const res = await fetch('/api/admin/upload-exam-image', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '이미지 업로드에 실패했습니다.')
      }

      // 업로드된 이미지 URL을 마크다운 문법(![alt](url))으로 변환
      const cleanAlt = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3]/g, ' ').trim() || '도표 및 그래프'
      const markdownImage = `![${cleanAlt}](${result.url})`

      if (target.type === 'prompt') {
        // 1. 발문(문제)에 도표 첨부 (문제 위 또는 문제 아래)
        setQuestionsData(prev => {
          const q = prev[activeQuestion]
          if (!q) return prev
          const currentNote = q.note || ''
          const updatedNote = target.position === 'top'
            ? (currentNote ? `${markdownImage}\n\n${currentNote}` : markdownImage)
            : (currentNote ? `${currentNote}\n\n${markdownImage}` : markdownImage)
          return {
            ...prev,
            [activeQuestion]: { ...q, note: updatedNote }
          }
        })
        triggerAdminNotice('success', `도표("${file.name}")가 문제 ${target.position === 'top' ? '위(상단)' : '아래(하단)'}에 성공적으로 첨부되었습니다.`)
      } else if (target.type === 'passage') {
        // 2. 제시문에 도표 첨부 (제시문 맨 위 또는 맨 아래)
        const pIdx = target.pIdx
        setQuestionsData(prev => {
          const q = prev[activeQuestion]
          if (!q) return prev
          const newPassages = [...q.passages]
          if (newPassages[pIdx]) {
            const newParas = target.position === 'top'
              ? [markdownImage, ...newPassages[pIdx].paragraphs]
              : [...newPassages[pIdx].paragraphs, markdownImage]
            newPassages[pIdx] = { ...newPassages[pIdx], paragraphs: newParas }
          }
          return {
            ...prev,
            [activeQuestion]: { ...q, passages: newPassages }
          }
        })
        triggerAdminNotice('success', `도표("${file.name}")가 제시문 ${target.position === 'top' ? '상단(맨 위)' : '하단(맨 아래)'}에 성공적으로 첨부되었습니다.`)
      }
    } catch (err: any) {
      console.error('도표 이미지 업로드 오류:', err)
      triggerAdminNotice('error', err.message || '도표 이미지 업로드 실패')
    } finally {
      setIsUploadingImage(false)
      setUploadingPassageIdx(null)
      uploadTargetRef.current = null
    }
  }

  // 수정한 문항 및 제시문 전체 데이터를 Supabase DB에 저장
  const handleSaveExamQuestions = async () => {
    if (!selectedExamId) {
      alert('선택된 시험 식별자(ID)가 없습니다.')
      return
    }

    setIsSavingExam(true)
    try {
      const payload: any = {
        id: selectedExamId,
        questions: questionsData
      }
      if (pdfUrl !== undefined) {
        payload.pdf_url = pdfUrl
        payload.pdf_name = pdfName
      }

      const res = await fetch('/api/admin/exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '문항 데이터 저장에 실패했습니다.')
      }

      triggerAdminNotice('success', '문제, 제시문 및 원본 PDF 설정이 Supabase DB에 성공적으로 저장되었습니다!')
    } catch (err: any) {
      console.error('문항 데이터 저장 오류:', err)
      triggerAdminNotice('error', err.message || '문항 데이터 저장 실패')
    } finally {
      setIsSavingExam(false)
    }
  }

  // 문제지 원본 PDF 업로드/교체용 파일 선택 창 열기
  const handleTriggerPdfUpload = () => {
    if (pdfInputRef.current) {
      pdfInputRef.current.value = ''
      pdfInputRef.current.click()
    }
  }

  // 문제지 원본 PDF 파일 업로드 및 로컬 상태 설정 ([DB에 저장] 시 최종 반영)
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPdf(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('univId', selectedUniv || 'common')

      const res = await fetch('/api/admin/upload-exam-pdf', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'PDF 파일 업로드에 실패했습니다.')
      }

      // 이전 등록된 PDF 파일 경로 보관 (새 파일 등록 후 이전 파일 정리용)
      const oldPdfUrl = pdfUrl || (activeQuestion && questionsData[activeQuestion]?.pdfUrl) || ''

      // 로컬 PDF 상태 갱신 (저장 대기)
      setPdfUrl(result.url)
      setPdfName(file.name)

      // questionsData 내의 모든 문항에도 pdfUrl/pdfName 실시간 동기화
      setQuestionsData(prev => {
        const next: any = { ...prev }
        Object.keys(next).forEach(k => {
          if (next[k]) {
            next[k] = { ...next[k], pdfUrl: result.url, pdfName: file.name }
          }
        })
        return next
      })

      // 이전 파일이 로컬 디스크 파일인 경우 정리
      if (oldPdfUrl && oldPdfUrl !== result.url && oldPdfUrl.startsWith('/exams/pdf/')) {
        try {
          await fetch('/api/admin/upload-exam-pdf', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: oldPdfUrl })
          })
        } catch (cleanupErr) {
          console.warn('이전 PDF 디스크 정리 실패 (무시):', cleanupErr)
        }
      }

      triggerAdminNotice('success', `새 원본 PDF("${file.name}")가 설정되었습니다. [DB에 저장] 버튼을 클릭해 최종 반영하세요!`)
    } catch (err: any) {
      console.error('PDF 업로드 오류:', err)
      triggerAdminNotice('error', err.message || 'PDF 업로드 실패')
    } finally {
      setIsUploadingPdf(false)
    }
  }

  // 등록된 문제지 원본 PDF 삭제
  const handleRemovePdf = async () => {
    if (!confirm('등록된 문제지 원본 PDF를 삭제하시겠습니까?')) return

    const prevPdfUrl = pdfUrl || (activeQuestion && questionsData[activeQuestion]?.pdfUrl) || ''

    setPdfUrl('')
    setPdfName('')

    setQuestionsData(prev => {
      const next: any = { ...prev }
      Object.keys(next).forEach(k => {
        if (next[k]) {
          next[k] = { ...next[k], pdfUrl: '', pdfName: '' }
        }
      })
      return next
    })

    if (selectedExamId) {
      await fetch('/api/admin/exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedExamId,
          pdf_url: '',
          pdf_name: ''
        })
      })
    }

    // 서버 디스크에서 실제 PDF 파일 삭제 및 정리
    if (prevPdfUrl && prevPdfUrl.startsWith('/exams/pdf/')) {
      try {
        await fetch('/api/admin/upload-exam-pdf', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: prevPdfUrl })
        })
      } catch (cleanupErr) {
        console.warn('디스크 PDF 파일 삭제 실패 (무시):', cleanupErr)
      }
    }

    triggerAdminNotice('success', '문제지 원본 PDF가 성공적으로 삭제되었습니다.')
  }

  // Gemini AI 정밀 채점 로딩 및 20초 지연 감지 상태
  const [isGrading, setIsGrading] = useState(false)
  const [gradingStep, setGradingStep] = useState(1)
  const [isGradingDelayed, setIsGradingDelayed] = useState(false)
  const [gradingNotice, setGradingNotice] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. 초기 렌더링: 로컬 프리셋으로 즉시 렌더링 (블랭크 화면 방지)
  const [questionsData, setQuestionsData] = useState<QuestionsMap>(() => getQuestionsData(selectedExamId))

  // 2. 비동기 DB 조회: Supabase DB에 등록된 questions(문항/제시문)가 있으면 실시간 동적 주입
  useEffect(() => {
    let isMounted = true
    if (selectedExamId) {
      fetchExamQuestionsFromDb(selectedExamId).then((dbData) => {
        if (isMounted && dbData) {
          setQuestionsData(dbData)
          // DB에서 등록된 PDF 정보 탐색 후 동기화
          const foundPdf = Object.values(dbData).find(q => q?.pdfUrl)?.pdfUrl
          const foundName = Object.values(dbData).find(q => q?.pdfName)?.pdfName
          if (foundPdf) setPdfUrl(foundPdf)
          if (foundName) setPdfName(foundName || '')
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [selectedExamId])

  const currentQ = questionsData[activeQuestion] || questionsData.q1
  // 현재 문항 또는 전체 시험 데이터에서 첨부된 원본 PDF 경로 탐색 (로컬 pdfUrl 우선)
  const currentPdfUrl = pdfUrl || currentQ?.pdfUrl || Object.values(questionsData).find(q => q?.pdfUrl)?.pdfUrl || ''
  const currentPdfName = pdfName || currentQ?.pdfName || Object.values(questionsData).find(q => q?.pdfName)?.pdfName || ''
  const currentAnswer = answers[activeQuestion] || ''

  // 현재 문항의 이전 제출 및 첨삭 이력 조회 핸들러
  const fetchSubmissionHistory = async () => {
    if (!user) {
      setSubmissionHistory([])
      return
    }
    setIsLoadingHistory(true)
    try {
      const currentLabel = questionsData[activeQuestion]?.label || '문항 1'
      const { data, error } = await supabase
        .from('student_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('exam_id', selectedExamId)
        .eq('question_label', currentLabel)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[ExamWorkspace] 제출 이력 조회 오류:', error.message)
      } else {
        setSubmissionHistory(data || [])
      }
    } catch (err: any) {
      console.warn('[ExamWorkspace] 제출 이력 조회 예외:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const currentQuestionLabel = questionsData[activeQuestion]?.label || '문항 1'

  // 문항/시험/사용자 변경 시 이력 자동 조회 (불필요한 전체 객체 재조회 방지)
  useEffect(() => {
    fetchSubmissionHistory()
  }, [user, selectedExamId, activeQuestion, currentQuestionLabel])

  // 문제지 원본 PDF를 화면 왼쪽에 100% 높이의 독립 창으로 열람 (사용자가 크기 및 위치 자유 조절 가능)
  const handleOpenPdfWindow = () => {
    if (!currentPdfUrl) {
      alert('등록된 문제지 원본 PDF가 없습니다.\n관리자 모드의 [올인원 추출기] 또는 [새 기출·모의 등록]에서 문제지 PDF를 첨부해 주세요.')
      return
    }

    // 1. 현재 사용자 모니터의 사용 가능한 해상도 기반으로 좌측 분할(너비 50%) 및 높이 100% 계산
    const screenWidth = typeof window !== 'undefined' ? (window.screen?.availWidth || 1600) : 1600
    const screenHeight = typeof window !== 'undefined' ? (window.screen?.availHeight || 900) : 900
    const popupWidth = Math.floor(screenWidth * 0.5)
    const popupHeight = screenHeight
    const popupLeft = 0
    const popupTop = 0

    // 2. 크기 및 위치 조정이 가능한(resizable=yes) 독립 브라우저 팝업 창 옵션 구성
    const windowFeatures = [
      `width=${popupWidth}`,
      `height=${popupHeight}`,
      `left=${popupLeft}`,
      `top=${popupTop}`,
      'resizable=yes',
      'scrollbars=yes',
      'status=no',
      'toolbar=no',
      'menubar=no'
    ].join(',')

    // PDF 표준 파라미터:
    // #navpanes=0 : 좌측 썸네일/목차 탐색 패널 닫기 (문제 본문만 스크롤)
    // #pagemode=none : 썸네일 모드 해제
    // #view=FitH : 문서 가로폭 맞춤
    const pdfUrlWithParams = `${currentPdfUrl}#navpanes=0&pagemode=none&view=FitH`

    const pdfWindow = window.open(pdfUrlWithParams, 'ExamPdfViewerPopup', windowFeatures)
    if (pdfWindow) {
      pdfWindow.focus()
    }
  }

  // 문항(activeQuestion) 또는 시험(selectedExamId) 전환 시 localStorage 임시 답안 및 활성 회차 복원
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draftKey = getDraftStorageKey(selectedExamId, activeQuestion)
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft && !answers[activeQuestion]) {
      setAnswers(prev => ({ ...prev, [activeQuestion]: savedDraft }))
    }

    const subKey = getActiveSubKey(selectedExamId, activeQuestion)
    const savedSubId = localStorage.getItem(subKey)
    setSelectedSubmissionId(savedSubId || null)
  }, [selectedExamId, activeQuestion])

  // 답안 작성 및 변경 시 React State + localStorage 실시간 자동 저장
  const handleAnswerChange = (val: string) => {
    setAnswers((prev) => ({ ...prev, [activeQuestion]: val }))
    if (typeof window !== 'undefined') {
      try {
        const key = getDraftStorageKey(selectedExamId, activeQuestion)
        if (val && val.trim().length > 0) {
          localStorage.setItem(key, val)
        } else {
          localStorage.removeItem(key)
        }
      } catch (e) {
        console.warn('[ExamWorkspace] 임시 답안 로컬 저장 오류:', e)
      }
    }
  }

  // 상단 헤더의 [리포트] 모드 전환 버튼 클릭 핸들러 (현재 선택된 답안의 채점 리포트 화면으로 1:1 강제 동기화)
  const handleGoToReportMode = () => {
    let targetReport: GradingReportData | null = null
    const draftText = (answers[activeQuestion] || '').trim()

    // 1. 하단 이력에서 특정 카드를 선택하여 보고 있는 경우 (selectedSubmissionId 또는 localStorage activeId)
    let activeId = selectedSubmissionId
    if (!activeId && typeof window !== 'undefined') {
      try {
        activeId = localStorage.getItem(getActiveSubKey(selectedExamId, activeQuestion))
      } catch {}
    }

    if (activeId && submissionHistory && submissionHistory.length > 0) {
      const found = submissionHistory.find((s) => s.id === activeId)
      if (found && found.grading_report) {
        targetReport = typeof found.grading_report === 'string'
          ? JSON.parse(found.grading_report)
          : found.grading_report
      }
    }

    // 특정 카드가 선택되어 리포트가 있으면 1:1 즉시 이동
    if (targetReport) {
      if (typeof window !== 'undefined') {
        try {
          const reportJson = JSON.stringify(targetReport)
          localStorage.setItem(getActiveReportKey(selectedExamId, activeQuestion), reportJson)
          localStorage.setItem('nonsul_active_grading_report', reportJson)
        } catch {}
      }
      onReport(targetReport, activeQuestion as 'q1' | 'q2')
      return
    }

    // 2. 글 내용이 공백이거나 비어있는 경우: 리포트 페이지로 넘어가지 않고 안내 메시지 표시 후 작성창 포커스
    if (!draftText) {
      setLoadNotice('작성된 답안이 없거나 선택된 첨삭 이력이 없습니다. 답안을 작성하시거나 하단 첨삭 이력에서 회차를 먼저 선택해 주세요.')
      setTimeout(() => {
        setLoadNotice(null)
      }, 5000)

      if (typeof window !== 'undefined') {
        const textarea = document.querySelector('textarea')
        if (textarea) {
          textarea.focus()
        }
      }
      return
    }

    // 3. 글 내용이 있는 상태에서 아직 채점되지 않은 새 답안인 경우 (이전 채점 이력 존재 시 확인 창 표시)
    if (submissionHistory && submissionHistory.length > 0) {
      const latestSub = submissionHistory[0]

      const shouldViewLatest = confirm(
        `현재 작성 중인 답안은 아직 채점되지 않았습니다.\n이전에 채점받았던 가장 최근(#${submissionHistory.length}회차) 리포트를 확인하시겠습니까?\n\n(작성 중인 답안은 안전하게 자동 보존됩니다.)`
      )
      if (!shouldViewLatest) return

      const rep = latestSub.grading_report
      targetReport = typeof rep === 'string' ? JSON.parse(rep) : rep

      if (targetReport) {
        if (typeof window !== 'undefined') {
          try {
            const reportJson = JSON.stringify(targetReport)
            localStorage.setItem(getActiveReportKey(selectedExamId, activeQuestion), reportJson)
            localStorage.setItem('nonsul_active_grading_report', reportJson)
          } catch {}
        }
        onReport(targetReport, activeQuestion as 'q1' | 'q2')
        return
      }
    }

    // 4. 이 문항에 대한 채점 이력이 아예 없는 경우: 친절한 토스트 안내 및 작성창 포커스
    setLoadNotice('아직 이 문항에 대해 채점받은 리포트가 없습니다. 답안을 작성하신 후 하단의 [실전 AI 채점 제출]을 먼저 진행해 주세요!')
    setTimeout(() => {
      setLoadNotice(null)
    }, 5000)

    if (typeof window !== 'undefined') {
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.focus()
      }
    }
  }

  // 사용자가 채점을 취소하고 답안으로 돌아가기를 눌렀을 때의 핸들러
  const handleCancelGrading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current)
      delayTimerRef.current = null
    }
    setIsGrading(false)
    setIsGradingDelayed(false)
  }

  // 사용자가 계속 기다리기를 눌렀을 때 안내 박스를 숨기고 대기 유지
  const handleKeepWaiting = () => {
    setIsGradingDelayed(false)
  }

  // 🔍 관리자 전용 커스텀 프롬프트 기반 즉시 채점 핸들러
  const handleRunCustomGrade = async (customSysPrompt: string, customUserPrompt: string) => {
    const trimmed = currentAnswer.trim()
    if (!trimmed || trimmed.length < 30) {
      alert('답안을 최소 30자 이상 작성하신 후 채점을 진행해 주세요.')
      return
    }

    setIsGrading(true)
    setGradingStep(1)
    setIsGradingDelayed(false)
    setShowPromptInspector(false)

    const t1 = setTimeout(() => setGradingStep(2), 2200)
    const t2 = setTimeout(() => setGradingStep(3), 4800)

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university: currentUniv,
          examTitle: currentQ.tag || `${currentUniv} 수시 논술`,
          questionLabel: currentQ.label,
          questionTitle: currentQ.title,
          charLimit: currentQ.limit || '800±100자',
          passages: currentQ.passages,
          rubric: currentQ.rubric,
          modelAnswer: currentQ.modelAnswer,
          studentAnswer: currentAnswer,
          studentName: '관리자(시뮬레이션)',
          customSystemPrompt: customSysPrompt,
          customUserPrompt: customUserPrompt,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error || '채점 분석 서버 응답 오류가 발생했습니다.')
      }

      const reportData: GradingReportData = await res.json()

      // 로그인된 수험생/관리자의 경우 DB에 답안 및 채점 리포트 영구 저장
      if (user) {
        try {
          const { data: insertData, error: saveErr } = await supabase
            .from('student_submissions')
            .insert({
              user_id: user.id,
              exam_id: selectedExamId,
              exam_title: currentQ.tag || `${currentUniv} 수시 논술`,
              university: currentUniv,
              question_label: currentQ.label || '문항 1',
              student_answer: currentAnswer,
              char_count: currentAnswer.length,
              total_score: reportData.totalScore || 0,
              status_verdict: reportData.statusVerdict || '채점 완료',
              grading_report: reportData,
            })
            .select('id')
            .single()

          if (saveErr) console.warn('[ExamWorkspace] 커스텀 채점 영구 저장 오류:', saveErr.message)
          else {
            console.log('[ExamWorkspace] 커스텀 채점 리포트 DB 저장 성공!')
            if (insertData?.id) {
              setSelectedSubmissionId(insertData.id)
              if (typeof window !== 'undefined') {
                try {
                  const subKey = getActiveSubKey(selectedExamId, activeQuestion)
                  const reportKey = getActiveReportKey(selectedExamId, activeQuestion)
                  const reportJson = JSON.stringify(reportData)
                  localStorage.setItem(subKey, insertData.id)
                  localStorage.setItem(reportKey, reportJson)
                  localStorage.setItem('nonsul_active_grading_report', reportJson)
                } catch {}
              }
            }
            fetchSubmissionHistory()
          }
        } catch (dbErr) {
          console.warn('[ExamWorkspace] 커스텀 채점 DB 저장 예외:', dbErr)
        }
      }

      onReport(reportData, activeQuestion as 'q1' | 'q2')
    } catch (err: any) {
      console.warn('커스텀 프롬프트 채점 오류:', err)
      alert(`커스텀 프롬프트 채점 오류: ${err.message}`)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      setIsGrading(false)
    }
  }

  // Gemini API를 호출하여 공식 채점 기준표에 따라 실시간 채점을 수행하는 핸들러
  const handleSubmitAndGrade = async () => {
    // 1. 비로그인 게스트인 경우: 로그인 모달 호출
    if (!user) {
      openAuthModal('login')
      alert('AI 정밀 첨삭 및 채점 리포트를 발급받으시려면 먼저 로그인해 주세요.')
      return
    }

    // 2. 답안 최소 글자 수 확인
    const trimmed = currentAnswer.trim()
    if (!trimmed || trimmed.length < 30) {
      alert('답안을 최소 30자 이상 작성하신 후 정밀 채점을 요청해 주세요.\n(원활한 채점을 위해 모범답안을 불러오거나 직접 서술해 보세요.)')
      return
    }

    // 3. 관리자(admin)가 아닌 일반 학생의 경우 크레딧 및 어뷰징(쿨다운/5회 상한) 검증
    if (!isAdmin) {
      // 잔여 크레딧이 0이거나 패스가 없는 경우 결제 모달 오픈
      if (remainingCredits <= 0) {
        openPurchaseModal()
        return
      }

      // DB 원자적 크레딧 차감 RPC 호출
      const creditResult = await consumeCredit(selectedExamId || 'common', activeQuestion)
      if (!creditResult.success) {
        if (creditResult.code === 'COOLDOWN_ACTIVE') {
          const mins = Math.ceil((creditResult.cooldown_remaining_seconds || 60) / 60)
          alert(`[제출 쿨다운 안내]\n이전 첨삭 리포트를 충분히 복습하고 개선할 수 있도록 대기 시간(약 ${mins}분 남음)이 적용 중입니다. 피드백을 반영하여 답안을 퇴고해 보세요!`)
          return
        }
        if (creditResult.code === 'MAX_ATTEMPTS_EXCEEDED') {
          alert(`[문항 한도 초과]\n해당 문항은 이미 최대 5회 채점을 완료하여 마스터하셨습니다.\n다른 기출/모의 문항에 도전해 보세요!`)
          return
        }
        if (creditResult.code === 'NO_CREDITS') {
          openPurchaseModal()
          return
        }
        alert(creditResult.message || '채점 크레딧 확인 중 오류가 발생했습니다.')
        return
      }
    }

    setIsGrading(true)
    setGradingStep(1)
    setIsGradingDelayed(false)

    // 20초 이상 응답 지연 시 계속 기다리기/취소 선택 옵션 활성화
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current)
    delayTimerRef.current = setTimeout(() => {
      setIsGradingDelayed(true)
    }, 20000)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // 학생이 기다리는 동안 실시간 채점 진행 상태를 애니메이션으로 안내
    const t1 = setTimeout(() => setGradingStep(2), 2200)
    const t2 = setTimeout(() => setGradingStep(3), 4800)

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          university: currentUniv,
          examTitle: currentQ.tag || `${currentUniv} 수시 논술`,
          questionLabel: currentQ.label,
          questionTitle: currentQ.title,
          charLimit: currentQ.limit || '800±100자',
          passages: currentQ.passages,
          rubric: currentQ.rubric,
          modelAnswer: currentQ.modelAnswer,
          studentAnswer: currentAnswer,
          studentName: '수험생',
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error || '채점 분석 서버 응답 오류가 발생했습니다.')
      }

      const reportData: GradingReportData = await res.json()

      // 로그인된 수험생/관리자의 경우 DB에 답안 및 채점 리포트 영구 저장
      if (user) {
        try {
          const { data: insertData, error: saveErr } = await supabase
            .from('student_submissions')
            .insert({
              user_id: user.id,
              exam_id: selectedExamId,
              exam_title: currentQ.tag || `${currentUniv} 수시 논술`,
              university: currentUniv,
              question_label: currentQ.label || '문항 1',
              student_answer: currentAnswer,
              char_count: currentAnswer.length,
              total_score: reportData.totalScore || 0,
              status_verdict: reportData.statusVerdict || '채점 완료',
              grading_report: reportData,
            })
            .select('id')
            .single()

          if (saveErr) console.warn('[ExamWorkspace] 답안 영구 저장 오류:', saveErr.message)
          else {
            console.log('[ExamWorkspace] 답안 및 채점 리포트 DB 저장 성공!')
            if (insertData?.id) {
              setSelectedSubmissionId(insertData.id)
              if (typeof window !== 'undefined') {
                try {
                  const subKey = getActiveSubKey(selectedExamId, activeQuestion)
                  const reportKey = getActiveReportKey(selectedExamId, activeQuestion)
                  const reportJson = JSON.stringify(reportData)
                  localStorage.setItem(subKey, insertData.id)
                  localStorage.setItem(reportKey, reportJson)
                  localStorage.setItem('nonsul_active_grading_report', reportJson)
                } catch {}
              }
            }
            fetchSubmissionHistory()
          }
        } catch (dbErr) {
          console.warn('[ExamWorkspace] 답안 DB 저장 예외:', dbErr)
        }
      }

      onReport(reportData, activeQuestion as 'q1' | 'q2')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('채점 요청이 사용자에 의해 안전하게 취소되었습니다.')
        return
      }
      console.warn('AI 채점 일시 지연 발생 (팝업창 자동 종료):', err)
      setGradingNotice('현재 AI 채점 서버 이용량이 많아 일시 지연되었습니다. 작성하신 답안은 안전하게 보존되어 있으니 잠시 후 다시 제출해 주세요.')
      setTimeout(() => {
        setGradingNotice(null)
      }, 6000)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
        delayTimerRef.current = null
      }
      abortControllerRef.current = null
      setIsGrading(false)
      setIsGradingDelayed(false)
    }
  }

  return (
    <main className="exam-shell">
      <header className="topbar">
        <Brand onHome={onHome} />
        <div className="topbar-controls">
          {/* 대학 패스 크레딧 상태 표시 */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-semibold">
              <Sparkles size={14} className="text-amber-400" />
              <span>관리자 (무제한)</span>
            </div>
          ) : user ? (
            <button
              type="button"
              onClick={openPurchaseModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                remainingCredits > 0
                  ? 'bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 animate-pulse'
              }`}
              title="클릭하여 이용권 확인 및 채점권 추가 충전"
            >
              <Coins size={14} className={remainingCredits > 0 ? 'text-blue-400' : 'text-amber-400'} />
              <span>{currentUniv} 크레딧: <strong>{remainingCredits}회</strong></span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              <span>로그인 후 응시</span>
            </button>
          )}

          <div className="mode-toggle">
            <button type="button" className="active" title="현재 원고지 답안 작성 화면입니다">
              응시 모드
            </button>
            <button
              type="button"
              onClick={handleGoToReportMode}
              title="이 문항의 최신 AI 정밀 채점 리포트 화면으로 이동"
            >
              리포트
            </button>
          </div>
          <div className="timer">
            <Clock3 />
            <div>
              <span className="timer-label">남은 시간</span>
              <strong>00:54:12</strong>
            </div>
          </div>
          <button className="mobile-menu" aria-label="메뉴">
            <Menu />
          </button>
        </div>
      </header>

      <div className="context-bar">
        <div className="breadcrumb">
          논술패스 <span className="slash">/</span>{' '}
          {onBack ? (
            <button type="button" className="breadcrumb-link-btn" onClick={onBack} title={`${currentUniv} 분석 페이지로 이동`}>
              {currentUniv} 분석
            </button>
          ) : (
            <strong>{currentUniv}</strong>
          )}{' '}
          <span className="slash">/</span> <strong>{currentQ.tag || `2026학년도 ${currentUniv} 수시`}</strong>{' '}
          <span className="slash">/</span> {currentQ.label}
        </div>
        <div className="exam-status">
          <span className="status-dot" /> 자동 저장됨 <span className="divider" />{' '}
          {(() => {
            const keys = Object.keys(questionsData).filter(k => questionsData[k] && questionsData[k].passages)
            const currentIdx = keys.indexOf(activeQuestion) + 1
            return `문제 ${currentIdx > 0 ? currentIdx : 1} / ${keys.length}`
          })()}{' '}
          (소요 시간 120분)
        </div>
      </div>

      <div className="workspace">
        <section className="reading-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {currentUniv.includes('경희')
                  ? 'KYUNG HEE UNIVERSITY · ESSAY EXAM'
                  : currentUniv.includes('동국')
                  ? 'DONGGUK UNIVERSITY · ESSAY EXAM'
                  : currentUniv.includes('홍익')
                  ? 'HONGIK UNIVERSITY · ESSAY EXAM'
                  : `${currentUniv.toUpperCase()} · ESSAY EXAM`}
              </p>
              <h1>{currentQ.tag || `${currentUniv} 논술고사`}</h1>
            </div>
          </div>
          <div className="question-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '28px' }}>
              {Object.keys(questionsData)
                .filter(k => questionsData[k] && questionsData[k].passages)
                .map((qKey, idx) => {
                  const isAnswered = (answers[qKey] || '').trim().length > 0
                  return (
                    <button
                      key={qKey}
                      className={activeQuestion === qKey ? 'active' : ''}
                      onClick={() => setActiveQuestion(qKey)}
                    >
                      문제 {idx + 1} {isAnswered && <span className="tab-check"><Check /></span>}
                    </button>
                  )
                })}
            </div>
            {/* 상단 우측 액션: 원본 PDF 버튼 및 관리자 전용 인라인 편집 툴바 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {/* 원본 PDF 버튼:
                  - 편집모드 OFF: 기존처럼 새 창으로 PDF 열람
                  - 편집모드 ON: 클릭 시 바로 파일 탐색기가 열려 PDF 추가/교체 설정 ([DB에 저장] 시 최종 반영) */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={isEditMode ? handleTriggerPdfUpload : handleOpenPdfWindow}
                  className="pdf-view-tab-btn"
                  title={
                    isEditMode
                      ? (currentPdfName
                          ? `등록 파일: ${currentPdfName}\n클릭하여 새 PDF 파일로 교체할 수 있습니다. ([DB에 저장] 시 최종 반영)`
                          : '클릭하여 문제지 원본 PDF 파일을 선택/등록합니다. ([DB에 저장] 시 최종 반영)')
                      : currentPdfUrl
                      ? '문제지 원본 PDF 새 창으로 열람'
                      : '등록된 문제지 원본 PDF가 없습니다.'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    backgroundColor: isEditMode
                      ? (currentPdfUrl ? '#eff6ff' : '#fff7ed')
                      : (currentPdfUrl ? '#fff1f2' : '#f8fafc'),
                    color: isEditMode
                      ? (currentPdfUrl ? '#2563eb' : '#ea580c')
                      : (currentPdfUrl ? '#e11d48' : '#64748b'),
                    border: `1.5px solid ${
                      isEditMode
                        ? (currentPdfUrl ? '#93c5fd' : '#fdba74')
                        : (currentPdfUrl ? '#fecdd3' : '#e2e8f0')
                    }`,
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isEditMode ? (
                    isUploadingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />
                  ) : (
                    <FileText size={13} />
                  )}
                  <span>
                    {isEditMode
                      ? (currentPdfUrl ? '원본PDF' : '+ 원본 PDF 선택')
                      : (currentPdfUrl ? '원본 PDF' : '원본 PDF (미등록)')}
                  </span>
                </button>

                {/* 편집 모드에서 등록된 PDF가 있을 때 간편 삭제 미니 버튼 */}
                {isEditMode && currentPdfUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    title="설정된 원본 PDF 삭제"
                    style={{
                      padding: '4px 6px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* 관리자(admin) 전용 문제 인라인 편집 모드 토글 및 DB 저장 버튼 */}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(prev => !prev)}
                    className="admin-edit-toggle-btn"
                    title="화면에서 문제와 제시문, 도표 이미지를 직접 수정하는 편집 모드 토글"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 11px',
                      backgroundColor: isEditMode ? '#4338ca' : '#eef2ff',
                      color: isEditMode ? '#ffffff' : '#4338ca',
                      border: `1px solid ${isEditMode ? '#3730a3' : '#c7d2fe'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>{isEditMode ? '편집 모드 ON' : '문제 편집 모드'}</span>
                  </button>

                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleSaveExamQuestions}
                      disabled={isSavingExam}
                      title="수정한 문제, 제시문, 도표 이미지 및 원본 PDF 설정을 Supabase DB에 일괄 저장"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 12px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: '1px solid #15803d',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isSavingExam ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSavingExam ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>{isSavingExam ? '저장 중...' : 'DB에 저장'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 도표/그래프 이미지 업로드용 숨김 파일 인풋 */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFileChange}
          />

          {/* 문제지 원본 PDF 업로드/교체용 숨김 파일 인풋 */}
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handlePdfFileChange}
          />

          <div className="reading-scroll">
            {/* 관리자 알림 토스트 배너 */}
            {adminNotice && (
              <div
                style={{
                  margin: '0 0 14px 0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: adminNotice.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${adminNotice.type === 'success' ? '#86efac' : '#fecaca'}`,
                  color: adminNotice.type === 'success' ? '#15803d' : '#b91c1c',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {adminNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{adminNotice.message}</span>
              </div>
            )}

            {/* A. 관리자 인라인 편집 모드 뷰 (모듈화 컴포넌트) */}
            {isEditMode ? (
              <ExamInlineEditor
                currentQ={currentQ}
                isUploadingImage={isUploadingImage}
                onTriggerPromptUpload={handleTriggerPromptUpload}
                onUpdateTitle={handleUpdateTitle}
                onUpdateNote={handleUpdateNote}
                onRemovePromptImage={handleRemovePromptImage}
                onUpdatePassageBadge={handleUpdatePassageBadge}
                onDeletePassage={handleDeletePassage}
                onUpdateParagraph={handleUpdateParagraph}
                onMoveParagraphUp={handleMoveParagraphUp}
                onMoveParagraphDown={handleMoveParagraphDown}
                onDeleteParagraph={handleDeleteParagraph}
                onTriggerPassageUpload={handleTriggerPassageUpload}
                onAddParagraph={handleAddParagraph}
                onAddPassage={handleAddPassage}
              />
            ) : (
              /* B. 일반 학생 응시 및 기본 열람 뷰 */
              <>
                <article className="prompt-card">
                  {(() => {
                    const rawTitle = currentQ.title || ''
                    const match = rawTitle.match(/^(【.*?】)(.*)/)
                    const header = match ? match[1].trim() : (rawTitle.startsWith('【') ? rawTitle : `【${currentQ.label || '문제 1'}】`)
                    const titleSubtitle = (match && match[2].trim()) ? match[2].trim() : ''
                    const noteText = currentQ.note || ''

                    // 소제목과 문제 전문을 누락 없이 스마트하게 통합
                    let body = ''
                    if (titleSubtitle && noteText) {
                      body = noteText.includes(titleSubtitle) ? noteText : `${titleSubtitle}\n\n${noteText}`
                    } else {
                      body = titleSubtitle || noteText
                    }
                    return (
                      <>
                        <div className="prompt-title-row">
                          <h2>{header}</h2>
                        </div>
                        {body && (
                          <div className="prompt-body-text">
                            {body
                              .split(/\r?\n\r?\n/)
                              .map((b) => b.trim())
                              .filter(Boolean)
                              .map((bPara, bIdx) => renderFormattedParagraph(bPara, `prompt-body-${bIdx}`))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </article>

                {/* 실제 기출 제시문 목록 */}
                <div className="passage-block">
                  {currentQ.passages.map((p, idx) => (
                    <section key={idx} className="passage-card">
                      <div className="passage-header">
                        <span className="passage-badge">{p.badge}</span>
                      </div>
                      <div className="passage-body">
                        {p.paragraphs.map((para, pIdx) => renderFormattedParagraph(para, `p-${idx}-${pIdx}`))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="splitter">
          <span />
        </div>

        <section className="writing-panel">
          <div className="editor-heading">
            <div>
              <p className="eyebrow">ANSWER SHEET · 실전 답안 에디터</p>
              <h2 className="editor-main-title">나의 답안 작성</h2>
            </div>
            <div className="editor-top-actions">
              <div className="editor-counts">
                <span className="count-badge active">
                  공백 제외 <strong>{currentAnswer.replace(/\s/g, '').length}</strong>자
                </span>
                <span className="count-badge sub">
                  공백 포함 {currentAnswer.length}자
                </span>
                <span className="count-rule">
                  규정: {currentQ.limit || '700~900자 (800±100자)'}
                </span>
                <span
                  className="save-state-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    color: '#16a34a',
                    fontWeight: 600,
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                  title="답안이 실시간으로 자동 보존되고 있습니다"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>실시간 자동 저장 중</span>
                </span>
              </div>
            </div>
          </div>
          <div className="progress-track">
            <span style={{ width: `${Math.min(currentAnswer.replace(/\s/g, '').length / 9, 100)}%` }} />
          </div>

          {loadNotice && (
            <div
              style={{
                marginTop: '10px',
                marginBottom: '4px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2563eb" />
                <span>{loadNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setLoadNotice(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="editor-wrap">
            <textarea
              aria-label="나의 답안 작성"
              placeholder={currentQ.placeholder}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="editor-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            {/* 최좌측 그룹: 원고지 작성 & 사진 입력 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* ▦ 원고지 작성 버튼 */}
              <button
                type="button"
                onClick={() => setShowManuscriptModal(true)}
                className="editor-btn-secondary"
                title="대학 논술 실전 원고지(400자·800자·1,000자) 팝업 에디터 열기"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#166534',
                  borderColor: '#86efac',
                  backgroundColor: '#f0fdf4',
                  fontWeight: 600
                }}
              >
                <span style={{ fontSize: '13px' }}>▦</span>
                <span>원고지 작성</span>
              </button>

              {/* 📷 사진 입력 버튼 */}
              <button
                type="button"
                onClick={() => setShowOcrModal(true)}
                className="editor-btn-secondary"
                title="실제 원고지나 노트에 손글씨로 작성한 글을 폰 카메라로 찍어 올리면 Gemini AI가 텍스트로 자동 변환합니다"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#4338ca',
                  borderColor: '#c7d2fe',
                  backgroundColor: '#eef2ff',
                  fontWeight: 600
                }}
              >
                <Camera size={14} />
                <span>사진 입력</span>
              </button>
            </div>

            {/* 최우측 그룹: 모범 답안 & 답안 복사 & 지우기 */}
            <div className="editor-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => setShowModelModal(true)}
                title={`${currentQ.label} 공식 모범 답안 보기`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <BookOpen size={14} />
                <span>모범 답안</span>
              </button>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(currentAnswer)
                  alert('답안이 클립보드에 복사되었습니다.')
                }}
                title="답안 클립보드 복사"
              >
                답안 복사
              </button>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => {
                  if (confirm(`${currentQ.label} 답안을 모두 지우고 새로 작성하시겠습니까?`)) {
                    handleAnswerChange('')
                    setSelectedSubmissionId(null)
                    if (typeof window !== 'undefined') {
                      try {
                        const subKey = getActiveSubKey(selectedExamId, activeQuestion)
                        const reportKey = getActiveReportKey(selectedExamId, activeQuestion)
                        localStorage.removeItem(subKey)
                        localStorage.removeItem(reportKey)
                      } catch {}
                    }
                  }
                }}
                title="답안 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 지우기
              </button>
            </div>
          </div>
          <div className="writing-tip">
            <Lightbulb />
            <p>
              <strong>{currentQ.tipTitle}</strong>
              <br />
              {currentQ.tipDesc}
            </p>
          </div>

          <div className="rubric-btn-wrap">
            <button
              type="button"
              className="rubric-open-btn"
              onClick={() => setShowRubricModal(true)}
              title={`${currentQ.label} 공식 채점 기준표 및 배점표 확인`}
            >
              <ClipboardList size={14} /> {currentQ.label} 공식 채점 기준표 보기
            </button>
          </div>

          {/* 📝 수험생 이전 제출 및 첨삭 이력 (날짜순 정렬 카드 리스트) */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock3 size={16} className="text-blue-600" />
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                  {currentQ.label} 제출 및 첨삭 이력 ({submissionHistory.length}회)
                </h4>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                작성 날짜순 (최신순)
              </span>
            </div>

            {isLoadingHistory ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Loader2 size={18} className="animate-spin text-blue-600 mx-auto mb-1.5" />
                <span>제출 이력을 확인하는 중입니다...</span>
              </div>
            ) : !user ? (
              <div style={{ padding: '18px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b' }}>
                  로그인하시면 작성한 답안과 채점 결과가 자동 보관되어 언제든 다시 불러와 첨삭을 이어갈 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  로그인 / 무료 회원가입
                </button>
              </div>
            ) : submissionHistory.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <FileText size={24} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
                  아직 {currentQ.label}에 제출된 답안이 없습니다.
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  답안을 작성하신 후 하단의 <strong>[실전 AI 채점 제출]</strong>을 클릭하시면, 작성 답안과 채점 리포트가 이곳에 차례로 보관됩니다.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {submissionHistory.map((item, index) => {
                  const formattedDate = new Date(item.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const isPass = item.total_score >= 82
                  // 현재 선택된 첨삭 이력인지 엄격하게 판별 (미선택 시 null이므로 모든 카드 해제됨)
                  const isSelected = selectedSubmissionId === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSubmissionCard(item)}
                      title={isSelected ? '클릭하여 선택 해제 (답안 작성창 초기화)' : '클릭하여 이 답안을 작성창에 불러오기'}
                      style={{
                        backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                        borderRadius: '12px',
                        padding: '13px 18px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        boxShadow: isSelected
                          ? '0 4px 14px rgba(37, 99, 235, 0.14)'
                          : '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#93c5fd'
                          e.currentTarget.style.backgroundColor = '#f8fafc'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e2e8f0'
                          e.currentTarget.style.backgroundColor = '#ffffff'
                        }
                      }}
                    >
                      {/* 좌측 메타 정보 (회차 뱃지, 선택 상태 뱃지, 날짜, 글자 수) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2.5px 8px',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#475569',
                          }}
                        >
                          #{submissionHistory.length - index}회차
                        </span>
                        {isSelected && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2.5px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Check size={12} strokeWidth={2.5} /> 선택됨
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {formattedDate}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>·</span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          {item.char_count}자
                        </span>
                      </div>

                      {/* 우측 점수, 합격 판정 & 삭제 액션 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2.5px 8px',
                            borderRadius: '6px',
                            backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
                            color: isPass ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {item.status_verdict || (isPass ? '합격권' : '도전 권장')}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <strong style={{ fontSize: '16px', fontWeight: 900, color: isPass ? '#1d4ed8' : '#e11d48' }}>
                            {item.total_score}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ 100점</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubmission(item.id, e)}
                          title="기록 삭제"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '4px',
                            marginLeft: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="bottom-bar">
        <div className="bottom-bar-info">
          <span className="bottom-status-dot" />
          <strong>{currentQ.tag || `${currentUniv} 수시 논술`}</strong>
          <span className="slash">/</span>
          <span>{currentQ.label} 실전 답안 작성 중</span>
        </div>
        <div className="bottom-bar-actions">
          {gradingNotice && (
            <div className="grading-notice-banner">
              <AlertTriangle className="grading-notice-icon" />
              <span>{gradingNotice}</span>
            </div>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPromptInspector(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                color: '#ffffff',
                border: '1px solid #4f46e5',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
                marginRight: '6px',
                transition: 'all 0.15s ease'
              }}
              title="현재 문항 채점 시 Gemini API로 전송되는 프롬프트를 확인하고 즉석 튜닝합니다"
            >
              <Terminal size={14} />
              <span>🔍 채점 프롬프트 검사 & 튜닝</span>
            </button>
          )}
          <Button className="bottom-submit-btn" onClick={handleSubmitAndGrade} disabled={isGrading}>
            {isGrading ? <Loader2 className="animate-spin" size={16} /> : null}
            {isGrading ? 'AI 채점관 정밀 분석 진행 중...' : '답안 제출 후 정밀 채점 리포트 보기'} <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </footer>

      {/* 공식 모범답안 모달 */}
      {showModelModal && (
        <div className="model-modal-overlay" onClick={() => setShowModelModal(false)}>
          <div className="model-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="model-modal-header">
              <div className="model-modal-title">
                <span className="model-modal-pill">{currentQ.modalPill}</span>
                <h3>{currentQ.modalTitle}</h3>
                <p>{currentQ.modalLength}</p>
              </div>
              <button
                type="button"
                className="model-modal-close"
                onClick={() => setShowModelModal(false)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="model-modal-body">
              <div className="model-modal-callout">{currentQ.modalCallout}</div>
              <div className="model-modal-text">
                {currentQ.modelAnswer.split('\n\n').map((para, idx) =>
                  renderFormattedParagraph(para, `model-${idx}`)
                )}
              </div>
            </div>
            <div className="model-modal-footer">
              <button
                type="button"
                className="model-footer-btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(currentQ.modelAnswer)
                  alert('모범답안이 클립보드에 복사되었습니다.')
                }}
              >
                <Copy size={13} /> 모범답안 복사
              </button>
              <button
                type="button"
                className="model-footer-btn-apply"
                onClick={() => {
                  if (currentAnswer.trim() && !confirm('작성 중인 답안이 모범답안으로 대체됩니다. 계속하시겠습니까?')) {
                    return
                  }
                  handleAnswerChange(currentQ.modelAnswer)
                  setShowModelModal(false)
                }}
              >
                답안지에 불러오기
              </button>
              <button
                type="button"
                className="model-footer-btn-close"
                onClick={() => setShowModelModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공식 채점 기준표 팝업 모달 */}
      {showRubricModal && (
        <div className="model-modal-overlay" onClick={() => setShowRubricModal(false)}>
          <div className="rubric-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="model-modal-header">
              <div className="model-modal-title">
                <span className="model-modal-pill">{currentQ.modalPill || currentQ.label} 공식 채점표</span>
                <h3>{currentQ.tag || `${currentUniv} 논술`} {currentQ.label} 채점 기준표</h3>
                <p>{currentUniv} 입학처 공식 출제 문항카드 평가 기준 원문 반영</p>
              </div>
              <button
                type="button"
                className="model-modal-close"
                onClick={() => setShowRubricModal(false)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rubric-modal-body">
              <div className="rubric-faculty-badge">
                ⚖️ <strong>단과대학별 가중 배점 안내:</strong> {currentQ.rubric.facultyWeight}
              </div>

              <div className="rubric-table-wrap">
                {(!currentQ.rubric.items || currentQ.rubric.items.length === 0) ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#475569', margin: '8px 0' }}>
                    <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#1e293b' }}>
                      📋 문항별 세부 루브릭 준비 중
                    </p>
                    <p style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.6 }}>
                      본 문항은 대학 공식 <strong>모범답안, 제시문 핵심 논점 및 규정 분량(±10%)</strong>을 기준으로 AI 채점관의 블라인드 정밀 채점과 1:1 맞춤 첨삭이 정상 진행됩니다.
                    </p>
                  </div>
                ) : (
                  <table className="rubric-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>평가 영역</th>
                        <th style={{ width: '20%' }}>평가 대상</th>
                        <th style={{ width: '44%' }}>세부 채점 기준 및 핵심 도출 내용</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>배점</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQ.rubric.items.map((sec, sIdx) =>
                        sec.subItems.map((sub, subIdx) => (
                          <tr key={`${sIdx}-${subIdx}`}>
                            {subIdx === 0 && (
                              <td rowSpan={sec.subItems.length} className="rubric-sec-title">
                                {sec.category}
                              </td>
                            )}
                            <td className="rubric-item-name">{sub.name}</td>
                            <td className="rubric-item-desc">{sub.desc}</td>
                            <td className="rubric-item-points">{sub.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="rubric-deduction-card">
                <h4>⚠️ 출제위원 감점 유의사항 (공통)</h4>
                <ul>
                  {currentQ.rubric.deductions.map((d, dIdx) => (
                    <li key={dIdx}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="model-modal-footer">
              <button
                type="button"
                className="model-footer-btn-close"
                onClick={() => setShowRubricModal(false)}
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 관리자 전용 채점 프롬프트 검사 및 실시간 튜닝 모달 */}
      <PromptInspectorModal
        isOpen={showPromptInspector}
        onClose={() => setShowPromptInspector(false)}
        university={currentUniv}
        examTitle={currentQ.tag || `${currentUniv} 수시 논술`}
        questionLabel={currentQ.label}
        questionTitle={currentQ.title}
        charLimit={currentQ.limit || '800±100자'}
        passages={currentQ.passages}
        rubric={currentQ.rubric}
        modelAnswer={currentQ.modelAnswer}
        studentAnswer={currentAnswer}
        onRunCustomGrade={handleRunCustomGrade}
        isGrading={isGrading}
      />

      {/* ▦ 실전 200자 정통 원고지 한 칸 정밀 입력 팝업 모달 */}
      <ManuscriptModal
        isOpen={showManuscriptModal}
        onClose={() => setShowManuscriptModal(false)}
        value={currentAnswer}
        onChange={handleAnswerChange}
        questionLabel={currentQ.label || '문항 1'}
        targetLimit={currentQ.limit || '800±100자'}
      />

      {/* 📷 손글씨/원고지 사진 다중 업로드 및 Gemini AI 텍스트 변환(OCR) 팝업 모달 */}
      <HandwritingOcrModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onApplyText={(text, mode) => {
          if (mode === 'append') {
            const separator = currentAnswer.trim() ? '\n\n' : ''
            handleAnswerChange(currentAnswer + separator + text)
          } else {
            handleAnswerChange(text)
          }
        }}
        currentAnswer={currentAnswer}
        questionLabel={currentQ.label || '문항 1'}
        charLimit={currentQ.limit || '800±100자'}
      />

      {/* AI 채점 진행 오버레이 모달 */}
      {isGrading && (
        <div className="grading-loading-overlay">
          <div className="grading-loading-card">
            <div className="grading-spinner-wrap">
              <div className="grading-spinner-ring" />
              <Sparkles className="grading-spinner-icon" />
            </div>
            <h3 className="grading-loading-title">출제위원 AI가 정밀 채점 중입니다</h3>
            <p className="grading-loading-desc">
              공식 문항 채점 기준표 및 감점 방지 원칙에 입각하여 학생 답안을 꼼꼼하게 대조·평가하고 있습니다.
            </p>
            <div className="grading-steps-list">
              <div className={`grading-step-row ${gradingStep >= 1 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>1단계: 발문 요구조건 부합도 및 제시문 독해 분석</span>
              </div>
              <div className={`grading-step-row ${gradingStep >= 2 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>2단계: 대학 공식 채점 기준표 항목별 배점 산출</span>
              </div>
              <div className={`grading-step-row ${gradingStep >= 3 ? 'active' : ''}`}>
                <span className="grading-step-dot" />
                <span>3단계: 감점 요인 적발 및 1:1 합격자 수준 첨삭(Rewrite) 생성</span>
              </div>
            </div>

            {/* 20초 이상 응답 지연 시 계속 기다리기 / 취소 선택 옵션 */}
            {isGradingDelayed && (
              <div className="grading-delay-box">
                <div className="grading-delay-header">
                  <Clock3 className="grading-delay-icon" />
                  <span>분석량이 많아 심층 채점이 진행 중입니다</span>
                </div>
                <p className="grading-delay-desc">
                  공식 채점 기준 대조 및 1:1 맞춤 첨삭문 생성에 시간이 조금 더 소요되고 있습니다. 계속 기다리시거나 취소 후 답안으로 돌아가실 수 있습니다.
                </p>
                <div className="grading-delay-actions">
                  <button
                    type="button"
                    className="grading-btn-wait"
                    onClick={handleKeepWaiting}
                  >
                    계속 기다리기
                  </button>
                  <button
                    type="button"
                    className="grading-btn-cancel"
                    onClick={handleCancelGrading}
                  >
                    취소하고 답안으로 돌아가기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 💳 대학별 30일 마스터 패스 및 채점권 결제 모달 */}
      <PassPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={closePurchaseModal}
        university={currentUniv}
        onGrantPass={grantPass}
      />
    </main>
  )
}
