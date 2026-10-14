'use client'

/**
 * @file app/admin/components/ExamsManager.tsx
 * @description 관리자 페이지 - 탭 1 기출·모의고사(exams) 목록 조회/삭제/신규등록 컴포넌트
 */

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Save,
  Pencil,
  FileText,
  ImageIcon,
  UploadCloud,
  Loader2
} from 'lucide-react'
import {
  uploadExamImage,
  cleanImageAlt,
  extractImagesFromText,
  removeImageFromText
} from '@/lib/exam-image-utils'
import AttachedImageCard from './AttachedImageCard'
import ExamPdfUploader from './ExamPdfUploader'

export interface PassageItem {
  id: string
  content: string
  source?: string
}

export interface QuestionEditItem {
  id: string | number
  title: string
  questionText: string
  targetLength: string
  points: number | string
  modelAnswer: string
  passages: PassageItem[]
}

export interface ExamItem {
  id: string
  univ_id: string
  year: string
  title: string
  type: string
  target_faculty?: string
  total_time?: number
  total_length?: string
  level?: string
  summary?: string
  questions?: any
  pdf_url?: string
  pdf_name?: string
}

interface ExamsManagerProps {
  selectedUniv: string
  univName: string
  exams: ExamItem[]
  isLoadingExams: boolean
  onRefresh: () => void
  showNotice: (type: 'success' | 'error', message: string) => void
}

export default function ExamsManager({
  selectedUniv,
  univName,
  exams,
  isLoadingExams,
  onRefresh,
  showNotice
}: ExamsManagerProps) {
  const [isMounted, setIsMounted] = useState<boolean>(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [examFilter, setExamFilter] = useState<'기출문제' | '모의논술' | '예상문제'>('기출문제')

  // 통합 기출·모의고사 모달 상태 (신규 등록: 'create' / 기존 수정: 'edit')
  const [showExamModal, setShowExamModal] = useState<boolean>(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editActiveTab, setEditActiveTab] = useState<string>('basic')
  const [isSubmittingExam, setIsSubmittingExam] = useState<boolean>(false)
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null)
  const [examModalForm, setExamModalForm] = useState<{
    id?: string
    year: string
    title: string
    type: string
    target_faculty: string
    total_time: number
    total_length: string
    level: string
    summary: string
    questions: QuestionEditItem[]
    pdf_url?: string
    pdf_name?: string
  }>({
    year: '2026',
    title: '',
    type: '모의논술',
    target_faculty: '인문·사회계열 공통',
    total_time: 120,
    total_length: '총 1,600자 (800자×2문항)',
    level: '실전 난이도',
    summary: '',
    questions: [],
    pdf_url: '',
    pdf_name: ''
  })

  // 신규 기출·모의 등록 모달 열기 핸들러 (기본 2문항 템플릿 제공)
  const handleOpenAddModal = () => {
    setModalMode('create')
    setExamModalForm({
      year: '2026',
      title: '',
      type: '모의논술',
      target_faculty: '인문·사회계열 공통',
      total_time: 120,
      total_length: '총 1,600자 (800자×2문항)',
      level: '실전 난이도',
      summary: '',
      pdf_url: '',
      pdf_name: '',
      questions: [
        {
          id: 1,
          title: '【문제 1】',
          questionText: '',
          targetLength: '800±100자',
          points: 50,
          modelAnswer: '',
          passages: [
            { id: '[가]', content: '', source: '' },
            { id: '[나]', content: '', source: '' }
          ]
        },
        {
          id: 2,
          title: '【문제 2】',
          questionText: '',
          targetLength: '800±100자',
          points: 50,
          modelAnswer: '',
          passages: [
            { id: '[다]', content: '', source: '' },
            { id: '[라]', content: '', source: '' }
          ]
        }
      ]
    })
    setEditActiveTab('basic')
    setShowExamModal(true)
  }

  // 기출문제 수정 모달 열기 핸들러
  const handleOpenEditModal = (exam: ExamItem) => {
    setModalMode('edit')
    // 1. 기존 questions 데이터 정규화 (올인원 추출기 규격 및 수동 등록 규격 완벽 호환)
    let parsedQuestions: QuestionEditItem[] = []
    if (Array.isArray(exam.questions) && exam.questions.length > 0) {
      parsedQuestions = exam.questions.map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        title: q.title || `【문제 ${idx + 1}】`,
        questionText: q.questionText || q.note || '',
        targetLength: q.targetLength || q.limit || '800±100자',
        points: Number(q.points ?? q.score) || 50,
        modelAnswer: q.modelAnswer || '',
        passages: (q.passages || []).map((p: any, pIdx: number) => ({
          id: p.id || p.badge || `[${String.fromCharCode(65 + pIdx)}]`,
          content: Array.isArray(p.paragraphs) ? p.paragraphs.join('\n\n') : (p.content || p.text || ''),
          source: p.source || ''
        }))
      }))
    } else if (exam.questions && typeof exam.questions === 'object') {
      parsedQuestions = Object.keys(exam.questions).map((key, idx) => {
        const q = exam.questions[key]
        return {
          id: idx + 1,
          title: q.title || `【문제 ${idx + 1}】`,
          questionText: q.questionText || q.note || '',
          targetLength: q.targetLength || q.limit || '800±100자',
          points: Number(q.points ?? q.score) || 50,
          modelAnswer: q.modelAnswer || '',
          passages: (q.passages || []).map((p: any, pIdx: number) => ({
            id: p.id || p.badge || `[${String.fromCharCode(65 + pIdx)}]`,
            content: Array.isArray(p.paragraphs) ? p.paragraphs.join('\n\n') : (p.content || p.text || ''),
            source: p.source || ''
          }))
        }
      })
    }

    // 기본값이 없을 때 2개 기본 문항 템플릿 생성
    if (parsedQuestions.length === 0) {
      parsedQuestions = [
        {
          id: 1,
          title: '【문제 1】',
          questionText: '',
          targetLength: '800±100자',
          points: 50,
          modelAnswer: '',
          passages: [
            { id: '[가]', content: '', source: '' },
            { id: '[나]', content: '', source: '' }
          ]
        },
        {
          id: 2,
          title: '【문제 2】',
          questionText: '',
          targetLength: '800±100자',
          points: 50,
          modelAnswer: '',
          passages: [
            { id: '[다]', content: '', source: '' },
            { id: '[라]', content: '', source: '' }
          ]
        }
      ]
    }

    setExamModalForm({
      id: exam.id,
      year: exam.year || '2026',
      title: exam.title || '',
      type: exam.type || '기출문제',
      target_faculty: exam.target_faculty || '인문·사회계열 공통',
      total_time: Number(exam.total_time) || 120,
      total_length: exam.total_length || '총 1,600자 (800자×2문항)',
      level: exam.level || '실전 난이도',
      summary: exam.summary || '',
      pdf_url: exam.pdf_url || '',
      pdf_name: exam.pdf_name || '',
      questions: parsedQuestions
    })
    setEditActiveTab('basic')
    setShowExamModal(true)
  }

  // 문항 추가 핸들러
  const handleAddQuestion = () => {
    const nextIdx = examModalForm.questions.length + 1
    const newQ: QuestionEditItem = {
      id: nextIdx,
      title: `【문제 ${nextIdx}】`,
      questionText: '',
      targetLength: '800±100자',
      points: 50,
      modelAnswer: '',
      passages: [
        { id: `[${nextIdx * 2 - 1}]`, content: '', source: '' }
      ]
    }
    setExamModalForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }))
    setEditActiveTab(`q_${nextIdx - 1}`)
  }

  // 문항 삭제 핸들러
  const handleDeleteQuestion = (qIndex: number) => {
    if (examModalForm.questions.length <= 1) {
      alert('최소 1개 이상의 문항이 존재해야 합니다.')
      return
    }
    if (!confirm(`【문제 ${qIndex + 1}】을 정말 삭제하시겠습니까?`)) return
    const updated = examModalForm.questions.filter((_, idx) => idx !== qIndex)
    setExamModalForm(prev => ({ ...prev, questions: updated }))
    setEditActiveTab('basic')
  }

  // 문항 필드 변경 헬퍼
  const handleQuestionChange = (qIndex: number, field: keyof QuestionEditItem, val: any) => {
    setExamModalForm(prev => {
      const copy = [...prev.questions]
      copy[qIndex] = { ...copy[qIndex], [field]: val }
      return { ...prev, questions: copy }
    })
  }

  // 제시문 추가 헬퍼
  const handleAddPassage = (qIndex: number) => {
    setExamModalForm(prev => {
      const copy = [...prev.questions]
      const currentP = copy[qIndex].passages || []
      const hangulLabels = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차']
      const newLabel = hangulLabels[currentP.length] || `${currentP.length + 1}`
      copy[qIndex] = {
        ...copy[qIndex],
        passages: [
          ...currentP,
          { id: `[${newLabel}]`, content: '', source: '' }
        ]
      }
      return { ...prev, questions: copy }
    })
  }

  // 제시문 삭제 헬퍼
  const handleDeletePassage = (qIndex: number, pIndex: number) => {
    setExamModalForm(prev => {
      const copy = [...prev.questions]
      copy[qIndex] = {
        ...copy[qIndex],
        passages: copy[qIndex].passages.filter((_, idx) => idx !== pIndex)
      }
      return { ...prev, questions: copy }
    })
  }

  // 제시문 필드 변경 헬퍼
  const handlePassageChange = (qIndex: number, pIndex: number, field: keyof PassageItem, val: string) => {
    setExamModalForm(prev => {
      const copy = [...prev.questions]
      const pList = [...copy[qIndex].passages]
      pList[pIndex] = { ...pList[pIndex], [field]: val }
      copy[qIndex] = { ...copy[qIndex], passages: pList }
      return { ...prev, questions: copy }
    })
  }

  // 도표/캡처 이미지 파일 업로드 & 본문 자동 삽입 핸들러 (공통 유틸 활용)
  const handleUploadExamImage = async (
    file: File,
    targetType: 'question' | 'passage',
    qIndex: number,
    pIndex?: number
  ) => {
    const targetKey = targetType === 'question' ? `q_${qIndex}` : `p_${qIndex}_${pIndex}`
    setUploadingTarget(targetKey)

    try {
      const uploadResult = await uploadExamImage(file, selectedUniv || 'common')
      const cleanDesc = cleanImageAlt(uploadResult.originalName)
      const imgTag = `\n\n![${cleanDesc}](${uploadResult.url})\n`

      setExamModalForm(prev => {
        const copy = [...prev.questions]
        if (targetType === 'question') {
          copy[qIndex] = {
            ...copy[qIndex],
            questionText: (copy[qIndex].questionText || '') + imgTag
          }
        } else if (targetType === 'passage' && typeof pIndex === 'number') {
          const pList = [...copy[qIndex].passages]
          pList[pIndex] = {
            ...pList[pIndex],
            content: (pList[pIndex].content || '') + imgTag
          }
          copy[qIndex] = { ...copy[qIndex], passages: pList }
        }
        return { ...prev, questions: copy }
      })

      showNotice('success', `도표 이미지(${uploadResult.originalName})가 본문에 성공적으로 삽입되었습니다.`)
    } catch (err: any) {
      console.error('[ExamsManager] 이미지 업로드 오류:', err)
      showNotice('error', err.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingTarget(null)
    }
  }

  // 본문에서 특정 도표 이미지 마크다운 제거(연결 해제) 핸들러 (공통 유틸 활용)
  const handleRemoveExamImage = (
    url: string,
    targetType: 'question' | 'passage',
    qIndex: number,
    pIndex?: number
  ) => {
    setExamModalForm(prev => {
      const copy = [...prev.questions]
      if (targetType === 'question') {
        copy[qIndex] = {
          ...copy[qIndex],
          questionText: removeImageFromText(copy[qIndex].questionText || '', url)
        }
      } else if (targetType === 'passage' && typeof pIndex === 'number') {
        const pList = [...copy[qIndex].passages]
        pList[pIndex] = {
          ...pList[pIndex],
          content: removeImageFromText(pList[pIndex].content || '', url)
        }
        copy[qIndex] = { ...copy[qIndex], passages: pList }
      }
      return { ...prev, questions: copy }
    })

    showNotice('success', '도표 이미지 연결이 해제되었습니다.')
  }

  // 클립보드 붙여넣기(Ctrl+V) 시 캡처 이미지 자동 감지 및 즉시 업로드 핸들러
  const handlePasteImage = (
    e: React.ClipboardEvent,
    targetType: 'question' | 'passage',
    qIndex: number,
    pIndex?: number
  ) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const customName = `capture_${Date.now()}.${file.type.split('/')[1] || 'png'}`
          const renamedFile = new File([file], customName, { type: file.type })
          handleUploadExamImage(renamedFile, targetType, qIndex, pIndex)
          break
        }
      }
    }
  }

  // 기출문제 등록 및 수정 저장 핸들러 (통합)
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examModalForm.title.trim()) {
      showNotice('error', '시험명을 입력해 주세요.')
      return
    }

    setIsSubmittingExam(true)
    try {
      const isEdit = modalMode === 'edit'
      const endpoint = '/api/admin/exams'
      const method = isEdit ? 'PUT' : 'POST'

      // 올인원 추출기 규격 및 수동 등록 규격 양방향 100% 매칭 정규화
      const normalizedQuestions = (examModalForm.questions || []).map((q, idx) => ({
        id: q.id || idx + 1,
        title: q.title || `【문제 ${idx + 1}】`,
        label: `문제 ${idx + 1}`,
        questionText: q.questionText,
        // 양방향 호환 속성 동시 저장 (점수, 글자수 요건)
        points: Number(q.points) || 50,
        score: Number(q.points) || 50,
        targetLength: q.targetLength || '800±100자',
        limit: q.targetLength || '800±100자',
        modelAnswer: q.modelAnswer || '',
        passages: (q.passages || []).map((p, pIdx) => ({
          id: p.id || `[${String.fromCharCode(65 + pIdx)}]`,
          badge: p.id || `[${String.fromCharCode(65 + pIdx)}]`,
          content: p.content || '',
          text: p.content || '',
          source: p.source || ''
        }))
      }))

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          univ_id: selectedUniv,
          ...examModalForm,
          questions: normalizedQuestions
        })
      })

      const data = await res.json()
      if (data.success) {
        showNotice(
          'success',
          isEdit
            ? `'${examModalForm.title}' 시험 및 문제/제시문 정보가 성공적으로 수정되었습니다.`
            : `'${examModalForm.title}' 시험이 문제/제시문과 함께 등록되었습니다.`
        )
        setShowExamModal(false)
        onRefresh()
      } else {
        showNotice('error', `${isEdit ? '수정' : '등록'} 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `오류 발생: ${err.message}`)
    } finally {
      setIsSubmittingExam(false)
    }
  }

  // 기출문제 삭제 핸들러
  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`'${title}' 시험을 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/admin/exams?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        showNotice('success', '시험이 삭제되었습니다.')
        onRefresh()
      } else {
        showNotice('error', `삭제 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `삭제 오류: ${err.message}`)
    }
  }

  // 1차 기준: 최신 학년도 내림차순 (2027 -> 2026 -> 2025...), 2차 기준: 같은 년도는 시험명 가나다순 오름차순
  const filteredExams = exams
    .filter(e => e.type === examFilter)
    .sort((a, b) => {
      const yearA = parseInt((a.year || '').replace(/[^0-9]/g, ''), 10) || 0
      const yearB = parseInt((b.year || '').replace(/[^0-9]/g, ''), 10) || 0
      if (yearB !== yearA) {
        return yearB - yearA
      }
      return (a.title || '').localeCompare(b.title || '', 'ko')
    })

  return (
    <section className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="text-blue-600" size={20} />
            {univName} 등록 기출·모의고사 목록 ({exams.length}건)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            학생들이 [탭 1: 기출·모의고사 응시]에서 직접 시험을 치르는 공식 시험 목록입니다.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingExams}
            className="admin-btn-secondary"
          >
            <RefreshCw size={13} className={isLoadingExams ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="admin-btn-primary"
          >
            <Plus size={16} />
            새 기출·모의 등록
          </button>
        </div>
      </div>

      {/* 기출 / 모의 / 예상 필터 탭 (전체 보기 제외) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
        {(['기출문제', '모의논술', '예상문제'] as const).map(type => {
          const count = exams.filter(e => e.type === type).length
          const isSelected = examFilter === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setExamFilter(type)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: isSelected ? 800 : 600,
                border: `1px solid ${isSelected ? '#1e3a8a' : '#cbd5e1'}`,
                backgroundColor: isSelected ? '#1e3a8a' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {type} ({count})
            </button>
          )
        })}
      </div>

      {/* 기출문제 행 리스트 */}
      {isLoadingExams ? (
        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '14px' }}>
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            Supabase DB에서 기출문제를 불러오는 중입니다...
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <BookOpen size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14.5px', fontWeight: 700, color: '#334155', margin: 0 }}>
            {univName}에 등록된 해당 조건의 기출·모의고사가 없습니다.
          </p>
          <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0' }}>
            우측 상단의 '+ 새 기출·모의 등록' 버튼을 누르거나 올인원 추출기에서 영향평가서를 등록하세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#93c5fd'
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(30, 58, 138, 0.07)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              {/* 좌측: 시험명 & 한 줄 요약문 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '15.5px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.35,
                      letterSpacing: '-0.3px'
                    }}>
                      {exam.title}
                    </span>
                    {exam.pdf_url && (
                      <a
                        href={exam.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          backgroundColor: '#ffe4e6',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          textDecoration: 'none'
                        }}
                        title="문제지 원본 PDF 열기"
                      >
                        📄 원본 PDF
                      </a>
                    )}
                  </div>
                  {exam.summary && (
                    <span style={{
                      fontSize: '13px',
                      color: '#64748b',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      📌 {exam.summary}
                    </span>
                  )}
                </div>
              </div>

              {/* 우측: 수정 및 삭제 액션 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>

                {/* 수정 버튼 */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(exam)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '6px 11px',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb'
                    e.currentTarget.style.background = '#eff6ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.background = '#ffffff'
                  }}
                  title="시험 정보 수정"
                >
                  <Pencil size={13} />
                  <span>수정</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteExam(exam.id, exam.title)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '6px 10px',
                    color: '#64748b',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626'
                    e.currentTarget.style.borderColor = '#fca5a5'
                    e.currentTarget.style.background = '#fef2f2'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#ffffff'
                  }}
                  title="시험 삭제"
                >
                  <Trash2 size={13} />
                  <span>삭제</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 통합 기출·모의고사 등록/수정 팝업 모달 (React Portal로 document.body에 마운트하여 뷰포트 격리) */}
      {isMounted && showExamModal && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          padding: '36px 20px 20px',
          overflowY: 'auto'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '920px',
            maxHeight: 'calc(100vh - 72px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 1. 모달 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#fafbfc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {modalMode === 'create' ? (
                    <Plus size={18} className="text-blue-600" />
                  ) : (
                    <Pencil size={18} className="text-blue-600" />
                  )}
                  {modalMode === 'create' ? `새 기출·모의고사 등록 (${univName})` : '기출·모의고사 상세 편집'}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'inline-block' }}>
                  {modalMode === 'create' ? (
                    '* 기본 정보와 문항 발문, 제시문 목록, 모범답안을 탭별로 직접 작성하여 등록할 수 있습니다.'
                  ) : (
                    <>고유 ID: <strong style={{ color: '#334155' }}>{examModalForm.id}</strong> (대학: {selectedUniv})</>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                title="닫기"
              >
                <X size={20} />
              </button>
            </div>

            {/* 2. 서브 탭 네비게이션 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setEditActiveTab('basic')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: editActiveTab === 'basic' ? 700 : 500,
                  color: editActiveTab === 'basic' ? '#1d4ed8' : '#475569',
                  backgroundColor: editActiveTab === 'basic' ? '#ffffff' : 'transparent',
                  border: editActiveTab === 'basic' ? '1px solid #bfdbfe' : '1px solid transparent',
                  boxShadow: editActiveTab === 'basic' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={14} />
                기본 메타정보
              </button>

              {examModalForm.questions.map((q, idx) => {
                const tabKey = `q_${idx}`
                const isActive = editActiveTab === tabKey
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditActiveTab(tabKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#1d4ed8' : '#475569',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>📝</span>
                    {q.title || `【문제 ${idx + 1}】`}
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '2px' }}>
                      ({q.passages?.length || 0}제시문)
                    </span>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleAddQuestion}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#047857',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={13} />
                문항 추가
              </button>
            </div>

            {/* 3. 모달 바디 (스크롤 영역) */}
            <form onSubmit={handleSaveExam} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* 3-A. 기본 메타정보 탭 */}
                {editActiveTab === 'basic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          학년도
                        </label>
                        <input
                          type="text"
                          value={examModalForm.year}
                          onChange={e => setExamModalForm({ ...examModalForm, year: e.target.value })}
                          placeholder="예: 2026"
                          className="admin-input"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          시험 유형
                        </label>
                        <select
                          value={examModalForm.type}
                          onChange={e => setExamModalForm({ ...examModalForm, type: e.target.value })}
                          className="admin-input"
                        >
                          <option value="모의논술">모의논술</option>
                          <option value="기출문제">기출문제</option>
                          <option value="예상문제">예상문제</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        시험 명칭
                      </label>
                      <input
                        type="text"
                        value={examModalForm.title}
                        onChange={e => setExamModalForm({ ...examModalForm, title: e.target.value })}
                        placeholder="예: 2026학년도 홍익대학교 모의논술 (인문계열)"
                        className="admin-input"
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          대상 계열
                        </label>
                        <input
                          type="text"
                          value={examModalForm.target_faculty}
                          onChange={e => setExamModalForm({ ...examModalForm, target_faculty: e.target.value })}
                          placeholder="인문·사회계열 공통"
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          난이도
                        </label>
                        <input
                          type="text"
                          value={examModalForm.level}
                          onChange={e => setExamModalForm({ ...examModalForm, level: e.target.value })}
                          placeholder="실전 난이도"
                          className="admin-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          시험 시간 (분)
                        </label>
                        <input
                          type="number"
                          value={examModalForm.total_time}
                          onChange={e => setExamModalForm({ ...examModalForm, total_time: Number(e.target.value) })}
                          placeholder="120"
                          className="admin-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                          권장 분량 요약
                        </label>
                        <input
                          type="text"
                          value={examModalForm.total_length}
                          onChange={e => setExamModalForm({ ...examModalForm, total_length: e.target.value })}
                          placeholder="총 1,600자 (800자×2문항)"
                          className="admin-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        한 줄 핵심 요약 (학생 리스트 노출)
                      </label>
                      <input
                        type="text"
                        value={examModalForm.summary}
                        onChange={e => setExamModalForm({ ...examModalForm, summary: e.target.value })}
                        placeholder="예: 권력의 집중과 분산 비판적 평가 및 AI 기술 번영 정책 대안 도출"
                        className="admin-input"
                      />
                    </div>

                    {/* 문제지 원본 PDF 첨부/관리 */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        문제지 원본 PDF 파일 (선택)
                      </label>
                      <ExamPdfUploader
                        univId={selectedUniv}
                        pdfUrl={examModalForm.pdf_url || ''}
                        pdfName={examModalForm.pdf_name || ''}
                        onChange={(url, name) => setExamModalForm(prev => ({ ...prev, pdf_url: url, pdf_name: name }))}
                        showNotice={showNotice}
                      />
                    </div>
                  </div>
                )}

                {/* 3-B. 개별 문항 편집 탭 */}
                {editActiveTab.startsWith('q_') && (() => {
                  const qIdx = parseInt(editActiveTab.replace('q_', ''), 10)
                  const currentQ = examModalForm.questions[qIdx]
                  if (!currentQ) return <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>문항을 찾을 수 없습니다.</div>

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* 문항 헤더 설정 */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '12px',
                        alignItems: 'flex-end',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            문항 제목
                          </label>
                          <input
                            type="text"
                            value={currentQ.title}
                            onChange={e => handleQuestionChange(qIdx, 'title', e.target.value)}
                            placeholder="예: 【문제 1】"
                            className="admin-input"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            배점 (점)
                          </label>
                          <input
                            type="number"
                            value={currentQ.points}
                            onChange={e => handleQuestionChange(qIdx, 'points', Number(e.target.value))}
                            placeholder="50"
                            className="admin-input"
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            권장 글자수
                          </label>
                          <input
                            type="text"
                            value={currentQ.targetLength}
                            onChange={e => handleQuestionChange(qIdx, 'targetLength', e.target.value)}
                            placeholder="800±100자"
                            className="admin-input"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            disabled={examModalForm.questions.length <= 1}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: examModalForm.questions.length <= 1 ? '#94a3b8' : '#ef4444',
                              backgroundColor: '#ffffff',
                              border: '1px solid #fecaca',
                              cursor: examModalForm.questions.length <= 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="문항 삭제"
                          >
                            <Trash2 size={13} />
                            문항 삭제
                          </button>
                        </div>
                      </div>

                      {/* 문제 발문 */}
                      {(() => {
                        const questionImages = extractImagesFromText(currentQ.questionText)
                        const isQuestionUploading = uploadingTarget === `q_${qIdx}`

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                문제 발문 (논제 및 평가 조건 요구사항)
                              </label>

                              {/* 발문에 이미지 직접 첨부 버튼 */}
                              <label style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                background: '#f8fafc',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: isQuestionUploading ? 'not-allowed' : 'pointer',
                                opacity: isQuestionUploading ? 0.6 : 1
                              }}>
                                <input
                                  type="file"
                                  accept="image/*,.svg"
                                  style={{ display: 'none' }}
                                  disabled={isQuestionUploading}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUploadExamImage(e.target.files[0], 'question', qIdx)
                                      e.target.value = ''
                                    }
                                  }}
                                />
                                {isQuestionUploading ? (
                                  <>
                                    <Loader2 size={11} className="animate-spin" />
                                    업로드 중...
                                  </>
                                ) : (
                                  <>
                                    <UploadCloud size={11} />
                                    + 발문에 도표/이미지 직접 첨부
                                  </>
                                )}
                              </label>
                            </div>

                            <textarea
                              rows={4}
                              value={currentQ.questionText}
                              onChange={e => handleQuestionChange(qIdx, 'questionText', e.target.value)}
                              onPaste={e => handlePasteImage(e, 'question', qIdx)}
                              placeholder="문제의 발문과 요구사항을 작성하세요. (Ctrl+V로 캡처 이미지 즉시 붙여넣기 가능)"
                              className="admin-input"
                              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
                            />

                            {/* 발문에 연결된 도표 이미지 카드 목록 (공통 컴포넌트 활용) */}
                            {questionImages.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {questionImages.map((img, imgIdx) => (
                                  <AttachedImageCard
                                    key={imgIdx}
                                    alt={img.alt}
                                    url={img.url}
                                    compact
                                    onRemove={() => handleRemoveExamImage(img.url, 'question', qIdx)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* 제시문 목록 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            제시문 목록 ({currentQ.passages?.length || 0}개)
                            <span style={{ fontSize: '11.5px', fontWeight: 400, color: '#64748b' }}>
                              * 시험 원문 기준 기호([가], [나] 등)와 본문으로 구성됩니다.
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddPassage(qIdx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563eb',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={12} />
                            제시문 추가
                          </button>
                        </div>

                        {(!currentQ.passages || currentQ.passages.length === 0) && (
                          <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px dashed #cbd5e1',
                            color: '#64748b',
                            fontSize: '13px'
                          }}>
                            등록된 제시문이 없습니다. &apos;+ 제시문 추가&apos; 버튼을 눌러 등록하세요.
                          </div>
                        )}

                        {currentQ.passages?.map((p, pIdx) => {
                          const passageImages = extractImagesFromText(p.content)
                          const isPassageUploading = uploadingTarget === `p_${qIdx}_${pIdx}`

                          return (
                            <div
                              key={pIdx}
                              style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="text"
                                  value={p.id}
                                  onChange={e => handlePassageChange(qIdx, pIdx, 'id', e.target.value)}
                                  placeholder="예: [제시문 가]"
                                  style={{ width: '140px', minWidth: '140px', fontWeight: 700, textAlign: 'center' }}
                                  className="admin-input"
                                />
                                <input
                                  type="text"
                                  value={p.source || ''}
                                  onChange={e => handlePassageChange(qIdx, pIdx, 'source', e.target.value)}
                                  placeholder="출전 (예: 고등학교 <사회문화>, <독서>)"
                                  style={{ flex: 1 }}
                                  className="admin-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeletePassage(qIdx, pIdx)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="제시문 삭제"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <textarea
                                rows={6}
                                value={p.content}
                                onChange={e => handlePassageChange(qIdx, pIdx, 'content', e.target.value)}
                                onPaste={e => handlePasteImage(e, 'passage', qIdx, pIdx)}
                                placeholder="제시문 원문 내용을 입력하세요. 단락 구분은 빈 줄로 구분합니다. (Ctrl+V로 캡처 이미지 즉시 붙여넣기 또는 우측 하단 버튼으로 첨부 가능)"
                                className="admin-input"
                                style={{ width: '100%', resize: 'vertical', lineHeight: 1.6, fontSize: '13px', backgroundColor: '#ffffff' }}
                              />

                              {/* 제시문에 삽입된 도표 이미지 카드 목록 (공통 컴포넌트 활용) */}
                              {passageImages.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {passageImages.map((img, imgIdx) => (
                                    <AttachedImageCard
                                      key={imgIdx}
                                      alt={img.alt}
                                      url={img.url}
                                      compact
                                      onRemove={() => handleRemoveExamImage(img.url, 'passage', qIdx, pIdx)}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* 제시문 푸터 도구 바 */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {/* 제시문 직접 도표 이미지 첨부 버튼 */}
                                  <label style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: isPassageUploading ? 'not-allowed' : 'pointer',
                                    opacity: isPassageUploading ? 0.6 : 1
                                  }}>
                                    <input
                                      type="file"
                                      accept="image/*,.svg"
                                      style={{ display: 'none' }}
                                      disabled={isPassageUploading}
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleUploadExamImage(e.target.files[0], 'passage', qIdx, pIdx)
                                          e.target.value = ''
                                        }
                                      }}
                                    />
                                    {isPassageUploading ? (
                                      <>
                                        <Loader2 size={11} className="animate-spin" />
                                        도표 업로드 중...
                                      </>
                                    ) : (
                                      <>
                                        <ImageIcon size={11} />
                                        + 이 제시문에 도표/그래프 이미지 바로 첨부
                                      </>
                                    )}
                                  </label>

                                  <span>(버튼 클릭으로 캡처 이미지를 즉시 첨부하거나 <code>![설명](URL)</code>로 입력)</span>
                                </div>

                                <span>글자 수: {p.content ? p.content.length.toLocaleString() : 0}자</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* 대학 공식 모범답안 */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                          대학 발표 공식 모범답안 (예시답안)
                        </label>
                        <textarea
                          rows={4}
                          value={currentQ.modelAnswer || ''}
                          onChange={e => handleQuestionChange(qIdx, 'modelAnswer', e.target.value)}
                          placeholder="대학 공식 모범답안 혹은 예시답안 내용을 입력하세요."
                          className="admin-input"
                          style={{ width: '100%', resize: 'vertical', lineHeight: 1.6, fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 4. 모달 푸터 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#fafbfc'
              }}>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  현재 구성: <strong>총 {examModalForm.questions.length}개 문항</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowExamModal(false)}
                    className="admin-btn-secondary"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExam}
                    className="admin-btn-primary"
                  >
                    <Save size={15} />
                    {isSubmittingExam
                      ? (modalMode === 'create' ? '등록 중...' : '저장 중...')
                      : (modalMode === 'create' ? '새 시험 등록' : '수정 완료 (저장)')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
