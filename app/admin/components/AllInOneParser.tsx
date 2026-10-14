'use client'

/**
 * @file app/admin/components/AllInOneParser.tsx
 * @description 관리자 페이지 - 탭 1 ⚡ 입학처 통합 보고서 올인원 추출기 (All-in-One Parser) 컴포넌트
 */

import React, { useState } from 'react'
import {
  Sparkles,
  RefreshCw,
  Save,
  Sliders,
  FileText,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Layers,
  Award,
  BookOpen,
  CheckSquare,
  Image as ImageIcon
} from 'lucide-react'
import { UNIVERSITY_FACULTIES, UNIVERSITIES } from '@/lib/constants/universities'
import {
  uploadExamImage,
  cleanImageAlt,
  extractImagesFromText,
  removeImageFromText,
  formatImageFileName
} from '@/lib/exam-image-utils'
import AttachedImageCard from './AttachedImageCard'
import ExamPdfUploader from './ExamPdfUploader'

interface AllInOneParserProps {
  selectedUniv: string
  univName: string
  selectedFaculty: string
  setSelectedFaculty: (faculty: string) => void
  customFaculty: string
  setCustomFaculty: (faculty: string) => void
  isCustomFaculty: boolean
  setIsCustomFaculty: (custom: boolean) => void
  onDataSaved: () => void
  showNotice: (type: 'success' | 'error', message: string) => void
}

export default function AllInOneParser({
  selectedUniv,
  univName,
  selectedFaculty,
  setSelectedFaculty,
  customFaculty,
  setCustomFaculty,
  isCustomFaculty,
  setIsCustomFaculty,
  onDataSaved,
  showNotice
}: AllInOneParserProps) {
  // ⚡ 올인원 통합 문서 자동 분해 엔진 상태
  const [allInOneDocText, setAllInOneDocText] = useState<string>('')
  const [allInOneInputMode, setAllInOneInputMode] = useState<'file' | 'text'>('file')
  const [selectedTabsToGenerate, setSelectedTabsToGenerate] = useState<{
    tab1: boolean
    tab2: boolean
    tab3: boolean
  }>({ tab1: true, tab2: false, tab3: false })

  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string
    name: string
    size: number
    charCount: number
    text: string
    status: 'parsing' | 'done' | 'error'
    errorMsg?: string
  }>>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isParsingAllInOne, setIsParsingAllInOne] = useState<boolean>(false)
  const [isSavingAllInOne, setIsSavingAllInOne] = useState<boolean>(false)
  const [allInOneResult, setAllInOneResult] = useState<{
    tab1_exam?: any
    tab2_trends?: any[]
    tab3_scoring?: any
  } | null>(null)
  const [allInOnePreviewTab, setAllInOnePreviewTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1')

  // 📄 직접 편집한 문제지 원본 PDF 사전 첨부 상태 (상단 상시 노출)
  const [manualPdfUrl, setManualPdfUrl] = useState<string>('')
  const [manualPdfName, setManualPdfName] = useState<string>('')

  // 📊 도표·그래프 캡처 이미지 업로드 및 문항 삽입 관리 상태
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string
    url: string
    fileName: string
    originalName: string
    size: number
  }>>([])
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)

  // 도표/그래프 이미지 업로드 공통 처리 함수
  const processImageFiles = async (files: FileList | File[], targetQuestionIdx?: number) => {
    const validFiles = Array.from(files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext || '')
    })

    if (validFiles.length === 0) {
      showNotice('error', '지원되는 이미지 형식(.png, .jpg, .svg, .webp)을 업로드해 주세요.')
      return
    }

    setIsUploadingImage(true)
    try {
      const uploadedList: typeof uploadedImages = []
      for (const file of validFiles) {
        const uploadResult = await uploadExamImage(file, selectedUniv || 'common')

        uploadedList.push({
          id: `${Date.now()}-${file.name}`,
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
        })
      }

      setUploadedImages((prev) => [...prev, ...uploadedList])
      showNotice('success', `${uploadedList.length}개의 도표·그래프 이미지가 안전하게 업로드되었습니다.`)

      // 특정 문항(targetQuestionIdx)에 바로 삽입하도록 지정된 경우 즉시 삽입
      if (typeof targetQuestionIdx === 'number' && uploadedList[0]) {
        insertImageToQuestion(targetQuestionIdx, uploadedList[0].url, uploadedList[0].originalName)
      }
    } catch (err: any) {
      showNotice('error', `도표 이미지 업로드 오류: ${err.message}`)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // 특정 문항에 도표 이미지 마크다운 삽입 (복수 이미지 지원 & 자료별 순차 매핑)
  const insertImageToQuestion = (qIdx: number, imgUrl: string, imgDesc: string) => {
    if (!allInOneResult?.tab1_exam?.questions) return

    const questionsCopy = [...allInOneResult.tab1_exam.questions]
    const targetQ = questionsCopy[qIdx]
    if (!targetQ) return

    const cleanDesc = cleanImageAlt(imgDesc)
    const markdownImg = `![${cleanDesc}](${imgUrl})\n\n`

    // 이미 삽입된 이미지인지 중복 검사
    const alreadyExists =
      targetQ.questionText?.includes(imgUrl) ||
      targetQ.passages?.some((p: any) =>
        (typeof p.content === 'string' && p.content.includes(imgUrl)) ||
        (Array.isArray(p.paragraphs) && p.paragraphs.some((para: string) => para.includes(imgUrl)))
      )

    if (alreadyExists) {
      showNotice('error', '이미 이 문항에 연결된 도표 이미지입니다.')
      return
    }

    if (targetQ.passages && targetQ.passages.length > 0) {
      // 복수 제시문(<자료 1>, <자료 2> 등)이 있는 경우: 아직 이미지가 없는 제시문 우선 매핑
      let targetPassage = targetQ.passages.find((p: any) => {
        const text = typeof p.content === 'string' ? p.content : Array.isArray(p.paragraphs) ? p.paragraphs.join('\n') : ''
        return !text.includes('![')
      })

      if (!targetPassage) {
        targetPassage = targetQ.passages[0]
      }

      if (typeof targetPassage.content === 'string') {
        targetPassage.content = markdownImg + targetPassage.content
      } else if (Array.isArray(targetPassage.paragraphs)) {
        targetPassage.paragraphs.unshift(`![${cleanDesc}](${imgUrl})`)
      } else {
        targetPassage.content = markdownImg
      }
    } else {
      targetQ.questionText = markdownImg + (targetQ.questionText || '')
    }

    setAllInOneResult({
      ...allInOneResult,
      tab1_exam: {
        ...allInOneResult.tab1_exam,
        questions: questionsCopy,
      },
    })
    showNotice('success', `[문항 ${qIdx + 1}]에 도표 이미지(${cleanDesc})가 성공적으로 연결되었습니다.`)
  }

  // 특정 문항에서 특정 도표 이미지만 선택 연결 해제
  const removeImageFromQuestion = (qIdx: number, imgUrlToRemove: string) => {
    if (!allInOneResult?.tab1_exam?.questions) return

    const questionsCopy = [...allInOneResult.tab1_exam.questions]
    const targetQ = questionsCopy[qIdx]
    if (!targetQ) return

    if (targetQ.passages && Array.isArray(targetQ.passages)) {
      targetQ.passages.forEach((p: any) => {
        if (typeof p.content === 'string') {
          p.content = removeImageFromText(p.content, imgUrlToRemove)
        }
        if (Array.isArray(p.paragraphs)) {
          p.paragraphs = p.paragraphs.filter((para: string) => !para.includes(imgUrlToRemove))
        }
      })
    }

    if (targetQ.questionText) {
      targetQ.questionText = removeImageFromText(targetQ.questionText, imgUrlToRemove)
    }

    setAllInOneResult({
      ...allInOneResult,
      tab1_exam: {
        ...allInOneResult.tab1_exam,
        questions: questionsCopy,
      },
    })
    showNotice('success', `[문항 ${qIdx + 1}]의 도표 이미지 연결이 해제되었습니다.`)
  }

  // 업로드된 이미지 삭제
  const removeUploadedImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id))
  }

  // 파일 목록으로부터 전체 텍스트 합산 동기화
  const syncTextFromFiles = (files: typeof attachedFiles) => {
    const validFiles = files.filter((f) => f.status === 'done' && f.text.trim())
    if (validFiles.length === 0) {
      setAllInOneDocText('')
      return
    }
    const combined = validFiles
      .map((f, i) => `========================================================\n[문서 ${i + 1}: ${f.name} (${f.charCount.toLocaleString()}자)]\n========================================================\n\n${f.text}`)
      .join('\n\n\n')
    setAllInOneDocText(combined)
  }

  // 공통 파일 업로드 및 텍스트 추출 처리 함수 (클릭 선택 & 드래그 앤 드롭 공용)
  const processFiles = async (selectedFiles: FileList | File[]) => {
    const filesArray = Array.from(selectedFiles).filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ext === 'pdf' || ext === 'txt' || ext === 'md' || ext === 'json'
    })

    if (filesArray.length === 0) {
      showNotice('error', '지원되는 파일 형식(.pdf, .txt, .md, .json)을 업로드해 주세요.')
      return
    }

    setIsUploadingFiles(true)
    try {
      const formData = new FormData()
      filesArray.forEach((f) => formData.append('files', f))

      const res = await fetch('/api/admin/extract-pdf-text', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '파일 파싱 실패')

      const newItems = (data.files || []).map((f: any, idx: number) => ({
        id: `${Date.now()}-${idx}-${f.name}`,
        name: f.name,
        size: f.size,
        charCount: f.charCount,
        text: f.text,
        status: f.error ? ('error' as const) : ('done' as const),
        errorMsg: f.error,
      }))

      setAttachedFiles((prev) => {
        const merged = [...prev, ...newItems]
        syncTextFromFiles(merged)
        return merged
      })
      showNotice('success', `${newItems.length}개 파일의 텍스트가 성공적으로 추출되어 통합되었습니다.`)
    } catch (err: any) {
      showNotice('error', `파일 파싱 오류: ${err.message}`)
    } finally {
      setIsUploadingFiles(false)
    }
  }

  // 다중 파일 클릭 선택 핸들러
  const handleAllInOneFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    await processFiles(selectedFiles)
    e.target.value = ''
  }

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isUploadingFiles) return
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      await processFiles(droppedFiles)
    }
  }

  // 개별 첨부 파일 제거
  const handleRemoveAttachedFile = (id: string) => {
    setAttachedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id)
      syncTextFromFiles(filtered)
      return filtered
    })
  }

  // 전체 첨부 파일 및 올인원 생성 결과 초기화
  const handleClearAllAttachedFiles = () => {
    setAttachedFiles([])
    setAllInOneDocText('')
    setAllInOneResult(null)
  }

  // ⚡ 올인원 통합 문서 자동 분해 실행
  const handleParseAllInOne = async () => {
    if (!selectedTabsToGenerate.tab1 && !selectedTabsToGenerate.tab2 && !selectedTabsToGenerate.tab3) {
      showNotice('error', '최소 1개 이상의 추출 대상 탭을 선택해 주세요.')
      return
    }
    if (!allInOneDocText || allInOneDocText.trim().length < 50) {
      showNotice('error', '분석할 입학처 공식 보고서 전문 텍스트를 입력해 주세요 (최소 50자 이상).')
      return
    }

    setIsParsingAllInOne(true)
    try {
      const activeFaculty = isCustomFaculty ? (customFaculty.trim() || '공통계열') : selectedFaculty
      const res = await fetch('/api/admin/parse-integrated-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          univName,
          targetFaculty: activeFaculty,
          documentText: allInOneDocText,
          selectedTabs: selectedTabsToGenerate
        })
      })

      const data = await res.json()
      if (data.success) {
        const parsedData = data.data
        // 상단에서 미리 첨부한 문제지 PDF가 있다면 탭 1 기출 데이터에 자동 주입
        if (parsedData?.tab1_exam && manualPdfUrl) {
          parsedData.tab1_exam.pdf_url = manualPdfUrl
          parsedData.tab1_exam.pdf_name = manualPdfName
        }
        setAllInOneResult(parsedData)
        if (parsedData?.tab1_exam) {
          setAllInOnePreviewTab('tab1')
        } else if (parsedData?.tab2_trends && parsedData.tab2_trends.length > 0) {
          setAllInOnePreviewTab('tab2')
        } else if (parsedData?.tab3_scoring) {
          setAllInOnePreviewTab('tab3')
        }
        showNotice('success', `[${activeFaculty}] 선택된 탭 데이터가 성공적으로 분해·생성되었습니다!`)
      } else {
        showNotice('error', `올인원 분해 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `오류 발생: ${err.message}`)
    } finally {
      setIsParsingAllInOne(false)
    }
  }

  // ⚡ 올인원 선택된 탭 데이터 Supabase DB에 선별 저장
  const handleSaveAllInOne = async () => {
    if (!allInOneResult) {
      showNotice('error', '먼저 올인원 문서 분해를 실행해 주세요.')
      return
    }
    if (!selectedTabsToGenerate.tab1 && !selectedTabsToGenerate.tab2 && !selectedTabsToGenerate.tab3) {
      showNotice('error', '최소 1개 이상의 반영 대상 탭을 선택해 주세요.')
      return
    }

    setIsSavingAllInOne(true)
    try {
      const activeFaculty = isCustomFaculty ? (customFaculty.trim() || '공통계열') : selectedFaculty
      const res = await fetch('/api/admin/save-all-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          univId: selectedUniv,
          univName,
          targetFaculty: activeFaculty,
          tab1_exam: allInOneResult.tab1_exam,
          tab2_trends: allInOneResult.tab2_trends || [],
          tab3_scoring: allInOneResult.tab3_scoring || {},
          selectedTabs: selectedTabsToGenerate
        })
      })

      const data = await res.json()
      if (data.success) {
        showNotice('success', data.message || '선택된 탭 데이터가 Supabase DB에 성공적으로 저장되었습니다!')
        onDataSaved()
      } else {
        showNotice('error', `일괄 저장 실패: ${data.error}`)
      }
    } catch (err: any) {
      showNotice('error', `저장 중 오류: ${err.message}`)
    } finally {
      setIsSavingAllInOne(false)
    }
  }

  return (
    <section className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 상단 컨트롤 배너 */}
      <div className="admin-card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ maxWidth: '820px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={20} color="#2563eb" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {univName} 입학처 통합 보고서 올인원 추출기 (원클릭 3대 탭 완성)
              </h3>
              <span style={{
                background: '#eff6ff',
                color: '#1e40af',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                Gemini 2.5 멀티모달 파서
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.65', color: '#475569' }}>
              대학 입학처에서 발간한 <strong>[선행학습 영향평가 결과보고서 PDF/TXT]</strong> 한 권을 통째로 업로드하세요.
              인공지능이 전문을 정밀 해독하여 <strong>[탭 1: 기출문제]</strong>, <strong>[탭 2: 출제경향 분석]</strong>, <strong>[탭 3: 공식 채점기준표]</strong>를 계열별로 자동 분해 및 추출합니다.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* 버튼 1: 1단계 분해 & 생성 */}
            <button
              type="button"
              onClick={handleParseAllInOne}
              disabled={isParsingAllInOne || (!selectedTabsToGenerate.tab1 && !selectedTabsToGenerate.tab2 && !selectedTabsToGenerate.tab3)}
              className="admin-btn-ai"
              style={{ padding: '12px 22px', fontSize: '13.5px' }}
            >
              {isParsingAllInOne ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  1단계: 보고서 분해 및 생성 중...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {(() => {
                    const count = [selectedTabsToGenerate.tab1, selectedTabsToGenerate.tab2, selectedTabsToGenerate.tab3].filter(Boolean).length
                    const summary = [
                      selectedTabsToGenerate.tab1 ? '탭1' : null,
                      selectedTabsToGenerate.tab2 ? '탭2' : null,
                      selectedTabsToGenerate.tab3 ? '탭3' : null
                    ].filter(Boolean).join('·')
                    const prefix = allInOneResult ? '⚡ 1단계: 다시 ' : '⚡ 1단계: '
                    if (count === 3) return `${prefix}3대 탭 전체 자동 분해 & 생성`
                    if (count === 0) return '⚡ 1단계: 대상 탭을 선택하세요'
                    return `${prefix}${summary} 선별 분해 & 생성`
                  })()}
                </>
              )}
            </button>

            {/* 버튼 2: 2단계 DB 일괄 저장 */}
            <button
              type="button"
              onClick={handleSaveAllInOne}
              disabled={!allInOneResult || isSavingAllInOne || (!selectedTabsToGenerate.tab1 && !selectedTabsToGenerate.tab2 && !selectedTabsToGenerate.tab3)}
              style={{
                padding: '12px 22px',
                fontSize: '13.5px',
                fontWeight: 800,
                borderRadius: '10px',
                border: allInOneResult ? 'none' : '1px solid #cbd5e1',
                background: allInOneResult
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                  : '#f1f5f9',
                color: allInOneResult ? '#ffffff' : '#94a3b8',
                boxShadow: allInOneResult ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
                cursor: allInOneResult && !isSavingAllInOne ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              title={!allInOneResult ? '1단계 분해 및 생성이 완료된 후 클릭하여 DB에 저장할 수 있습니다.' : '선택된 탭 데이터를 Supabase DB에 반영합니다.'}
            >
              {isSavingAllInOne ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  2단계: DB 저장 중...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {(() => {
                    const count = [selectedTabsToGenerate.tab1, selectedTabsToGenerate.tab2, selectedTabsToGenerate.tab3].filter(Boolean).length
                    const summary = [
                      selectedTabsToGenerate.tab1 ? '탭1' : null,
                      selectedTabsToGenerate.tab2 ? '탭2' : null,
                      selectedTabsToGenerate.tab3 ? '탭3' : null
                    ].filter(Boolean).join('·')
                    if (count === 3) return '💾 2단계: 3대 탭 전체 DB 일괄 저장'
                    return `💾 2단계: ${summary}만 DB 선별 반영`
                  })()}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 🎯 대학별 계열(트랙) 동적 선택기 */}
        <div style={{
          marginTop: '18px',
          padding: '14px 16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} /> 목표 계열(트랙) 선택:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(UNIVERSITY_FACULTIES[selectedUniv] || ['인문계열 (공통)']).map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => {
                    setSelectedFaculty(fac)
                    setIsCustomFaculty(false)
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: (!isCustomFaculty && selectedFaculty === fac)
                      ? '1.5px solid #2563eb'
                      : '1px solid #cbd5e1',
                    background: (!isCustomFaculty && selectedFaculty === fac)
                      ? '#eff6ff'
                      : '#ffffff',
                    color: (!isCustomFaculty && selectedFaculty === fac)
                      ? '#1d4ed8'
                      : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {fac}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomFaculty(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isCustomFaculty ? '1.5px solid #2563eb' : '1px dashed #cbd5e1',
                  background: isCustomFaculty ? '#eff6ff' : '#ffffff',
                  color: isCustomFaculty ? '#1d4ed8' : '#64748b'
                }}
              >
                ✏️ 직접 입력
              </button>
            </div>
          </div>

          {isCustomFaculty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={customFaculty}
                onChange={(e) => setCustomFaculty(e.target.value)}
                placeholder="신설 학과/계열명 입력"
                className="admin-input"
                style={{ width: '180px', padding: '6px 10px', fontSize: '12.5px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>(예: 문과대학, 상경계열)</span>
            </div>
          )}
        </div>

        {/* 🎛️ 생성 및 저장 대상 탭 선별 체크박스 바 */}
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={16} className="text-blue-700" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e3a8a' }}>
              생성 및 DB 반영 대상 탭 선택:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedTabsToGenerate.tab1}
                onChange={(e) => setSelectedTabsToGenerate(prev => ({ ...prev, tab1: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              탭 1: 기출문제 등록
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedTabsToGenerate.tab2}
                onChange={(e) => setSelectedTabsToGenerate(prev => ({ ...prev, tab2: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              탭 2: 출제경향 분석
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedTabsToGenerate.tab3}
                onChange={(e) => setSelectedTabsToGenerate(prev => ({ ...prev, tab3: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              탭 3: 채점기준·루브릭
            </label>
          </div>
        </div>

        {/* 📄 [상시 노출] 직접 편집한 문제지 원본 PDF 사전 첨부 박스 */}
        <div style={{
          marginTop: '14px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} className="text-rose-600" />
              <span>직접 편집한 문제지 원본 PDF 첨부 (선택 · 학생 화면 연동)</span>
            </label>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              * 파싱 전 미리 첨부해 두시면 [탭 1: 기출문제]에 자동 연동되어 함께 저장됩니다.
            </span>
          </div>
          <ExamPdfUploader
            univId={selectedUniv}
            pdfUrl={allInOneResult?.tab1_exam?.pdf_url || manualPdfUrl}
            pdfName={allInOneResult?.tab1_exam?.pdf_name || manualPdfName}
            onChange={(url, name) => {
              setManualPdfUrl(url)
              setManualPdfName(name)
              if (allInOneResult?.tab1_exam) {
                setAllInOneResult(prev => {
                  if (!prev || !prev.tab1_exam) return prev
                  return {
                    ...prev,
                    tab1_exam: { ...prev.tab1_exam, pdf_url: url, pdf_name: name }
                  }
                })
              }
            }}
            showNotice={showNotice}
          />
        </div>

        {/* 보고서 전문 입력 패널 */}
        <div style={{
          marginTop: '14px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #cbd5e1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} className="text-blue-600" />
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
                입학처 공식 보고서 전문 입력
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                (총 {allInOneDocText.length.toLocaleString()}자 탑재됨)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAllInOneInputMode('file')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: allInOneInputMode === 'file' ? '#2563eb' : '#ffffff',
                  color: allInOneInputMode === 'file' ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                다중 파일 첨부 (.pdf, .txt)
              </button>
              <button
                type="button"
                onClick={() => setAllInOneInputMode('text')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: allInOneInputMode === 'text' ? '#2563eb' : '#ffffff',
                  color: allInOneInputMode === 'text' ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                텍스트 직접 입력
              </button>
              {allInOneDocText && (
                <button
                  type="button"
                  onClick={handleClearAllAttachedFiles}
                  className="admin-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11.5px', color: '#dc2626' }}
                >
                  <Trash2 size={12} />
                  초기화
                </button>
              )}
            </div>
          </div>

          {allInOneInputMode === 'file' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 드래그 앤 드롭 파일 업로드 박스 */}
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 20px',
                  background: isDragging ? '#e0f2fe' : isUploadingFiles ? '#eff6ff' : '#ffffff',
                  border: isDragging ? '2px dashed #2563eb' : '2px dashed #93c5fd',
                  borderRadius: '10px',
                  cursor: isUploadingFiles ? 'wait' : 'pointer',
                  transform: isDragging ? 'scale(1.01)' : 'none',
                  boxShadow: isDragging ? '0 4px 16px rgba(37, 99, 235, 0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.json"
                  onChange={handleAllInOneFilesUpload}
                  disabled={isUploadingFiles}
                  style={{ display: 'none' }}
                />
                {isUploadingFiles ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontWeight: 700 }}>
                    <RefreshCw size={20} className="animate-spin" />
                    PDF 문서에서 텍스트를 고속 추출하고 있습니다...
                  </div>
                ) : isDragging ? (
                  <>
                    <UploadCloud size={36} color="#2563eb" className="animate-bounce" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1d4ed8' }}>
                      파일을 여기에 놓으면 즉시 첨부됩니다!
                    </span>
                    <span style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                      PDF, 텍스트 문서 자동 텍스트 추출 시작
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} color="#3b82f6" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a' }}>
                      선행학습 영향평가서 PDF 또는 텍스트 파일을 이곳에 업로드하세요
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      마우스로 파일을 끌어다 놓거나(Drag & Drop) 클릭하여 선택할 수 있습니다.
                    </span>
                  </>
                )}
              </label>

              {/* 첨부된 파일 목록 카드 */}
              {attachedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {attachedFiles.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <CheckCircle2 size={14} className="text-green-600" />
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{file.name}</span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          ({(file.size / 1024).toFixed(1)} KB · {file.charCount.toLocaleString()}자)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachedFile(file.id)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 6px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 📊 도표·그래프 캡처 이미지 첨부 (선택) UI 블록 */}
              <div style={{
                marginTop: '8px',
                padding: '12px 14px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={15} className="text-blue-600" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                      도표·그래프 캡처 이미지 첨부 (선택)
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {uploadedImages.length > 0 ? `(${uploadedImages.length}개 업로드됨)` : '(PDF 내에 그래프·도표가 있는 경우 첨부)'}
                    </span>
                  </div>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: isUploadingImage ? 'wait' : 'pointer'
                  }}>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.svg"
                      style={{ display: 'none' }}
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          processImageFiles(e.target.files)
                          e.target.value = ''
                        }
                      }}
                    />
                    {isUploadingImage ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                    {isUploadingImage ? '업로드 중...' : '+ 캡처 이미지 추가'}
                  </label>
                </div>

                {uploadedImages.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.4 }}>
                    💡 문제에 함수 그래프나 좌표평면, 통계 도표가 포함되어 있다면 해당 영역을 캡처하여 이곳에 올려두세요. 생성된 문항에 원클릭으로 쏙 들어갑니다.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {uploadedImages.map((img) => (
                      <div
                        key={img.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.originalName}
                          style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', background: '#ffffff', border: '1px solid #cbd5e1' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {img.originalName}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {(img.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(img.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
                          title="이미지 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <textarea
              value={allInOneDocText}
              onChange={(e) => setAllInOneDocText(e.target.value)}
              placeholder="대학 입학처의 선행학습 영향평가서 본문 전체(문항카드, 출제의도, 제시문, 모범답안, 채점기준표)를 이곳에 붙여넣으세요."
              className="admin-input"
              rows={8}
              style={{ fontSize: '12.5px', lineHeight: '1.55', resize: 'vertical' }}
            />
          )}
        </div>
      </div>

      {/* 3대 탭 자동 분해 결과 미리보기 및 저장 패널 */}
      {allInOneResult ? (
        <div className="admin-card animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="admin-badge-blue">
                  {allInOneResult.tab1_exam?.targetFaculty || selectedFaculty} 올인원 분해 완료
                </span>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                  ● 3대 탭 동기화 준비 완료
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                생성 결과 미리보기 & 선별 검토
              </h3>
            </div>

            {/* 탭 1 / 2 / 3 프리뷰 전환 버튼 */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAllInOnePreviewTab('tab1')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: allInOnePreviewTab === 'tab1' ? 800 : 600,
                  border: `1px solid ${allInOnePreviewTab === 'tab1' ? '#2563eb' : '#cbd5e1'}`,
                  background: allInOnePreviewTab === 'tab1' ? '#2563eb' : '#ffffff',
                  color: allInOnePreviewTab === 'tab1' ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                탭 1: 기출문제 미리보기
              </button>
              <button
                type="button"
                onClick={() => setAllInOnePreviewTab('tab2')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: allInOnePreviewTab === 'tab2' ? 800 : 600,
                  border: `1px solid ${allInOnePreviewTab === 'tab2' ? '#2563eb' : '#cbd5e1'}`,
                  background: allInOnePreviewTab === 'tab2' ? '#2563eb' : '#ffffff',
                  color: allInOnePreviewTab === 'tab2' ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                탭 2: 출제경향 ({allInOneResult.tab2_trends?.length || 0}개)
              </button>
              <button
                type="button"
                onClick={() => setAllInOnePreviewTab('tab3')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: allInOnePreviewTab === 'tab3' ? 800 : 600,
                  border: `1px solid ${allInOnePreviewTab === 'tab3' ? '#2563eb' : '#cbd5e1'}`,
                  background: allInOnePreviewTab === 'tab3' ? '#2563eb' : '#ffffff',
                  color: allInOnePreviewTab === 'tab3' ? '#ffffff' : '#475569',
                  cursor: 'pointer'
                }}
              >
                탭 3: 채점기준·루브릭
              </button>
            </div>
          </div>

          {/* 프리뷰 본문 */}
          {allInOnePreviewTab === 'tab1' && allInOneResult.tab1_exam && (
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="admin-badge-blue">{allInOneResult.tab1_exam.year}학년도 · {allInOneResult.tab1_exam.type}</span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {allInOneResult.tab1_exam.totalTime}분 / {allInOneResult.tab1_exam.totalLength}
                </span>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                {allInOneResult.tab1_exam.title}
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: '#475569' }}>
                📌 {allInOneResult.tab1_exam.summary}
              </p>

              {/* 문제지 원본 PDF 첨부/관리 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  📄 문제지 원본 PDF 파일 (선택 · 학생 시험 화면 연동)
                </label>
                <ExamPdfUploader
                  univId={selectedUniv}
                  pdfUrl={allInOneResult.tab1_exam.pdf_url || ''}
                  pdfName={allInOneResult.tab1_exam.pdf_name || ''}
                  onChange={(url, name) => {
                    setAllInOneResult((prev) => {
                      if (!prev || !prev.tab1_exam) return prev
                      return {
                        ...prev,
                        tab1_exam: {
                          ...prev.tab1_exam,
                          pdf_url: url,
                          pdf_name: name
                        }
                      }
                    })
                  }}
                  showNotice={showNotice}
                />
              </div>
              {allInOneResult.tab1_exam.questions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allInOneResult.tab1_exam.questions.map((q: any, qIdx: number) => {
                    // 문항 본문 및 모든 제시문에서 연결된 이미지 목록 추출 (공통 유틸 활용)
                    const fullPassagesText = (q.passages || []).map((p: any) => (typeof p.content === 'string' ? p.content : '')).join('\n')
                    const combinedText = `${q.questionText || ''}\n${fullPassagesText}`
                    const attachedImages = extractImagesFromText(combinedText)

                    return (
                      <div key={qIdx} style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#1e3a8a' }}>
                            {q.label || `문항 ${qIdx + 1}`} ({q.score || '배점 미정'} · {q.charLimit || ''})
                          </strong>
                          {attachedImages.length > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              📷 도표 이미지 {attachedImages.length}장 연동됨
                            </span>
                          )}
                        </div>

                        <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                          {q.questionText}
                        </p>

                        {/* 도표 이미지가 연결되어 있을 때의 미리보기 카드 목록 (공통 컴포넌트 활용) */}
                        {attachedImages.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {attachedImages.map((attImg, attIdx) => (
                              <AttachedImageCard
                                key={attIdx}
                                alt={attImg.alt}
                                url={attImg.url}
                                onRemove={() => removeImageFromQuestion(qIdx, attImg.url)}
                              />
                            ))}
                          </div>
                        )}

                        {/* 도표 삽입 도구 바 (복수 이미지 삽입 및 식별 파일명 표시 지원) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #f1f5f9', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                            📊 도표 삽입:
                          </span>
                          {uploadedImages.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {uploadedImages.map((img) => {
                                const isAttached = attachedImages.some(att => att.url === img.url)
                                const shortName = formatImageFileName(img.originalName, 22)

                                return (
                                  <button
                                    key={img.id}
                                    type="button"
                                    title={img.originalName}
                                    onClick={() => {
                                      if (isAttached) {
                                        removeImageFromQuestion(qIdx, img.url)
                                      } else {
                                        insertImageToQuestion(qIdx, img.url, img.originalName)
                                      }
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 9px',
                                      background: isAttached ? '#f0fdf4' : '#eff6ff',
                                      color: isAttached ? '#15803d' : '#1d4ed8',
                                      border: isAttached ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <ImageIcon size={11} />
                                    {isAttached ? `✓ ${shortName} (연결됨)` : `+ ${shortName} 삽입`}
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}

                          {/* 직접 이 문항에 캡처 이미지 즉시 업로드 & 삽입 */}
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 9px',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}>
                            <input
                              type="file"
                              accept="image/*,.svg"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  processImageFiles(e.target.files, qIdx)
                                  e.target.value = ''
                                }
                              }}
                            />
                            <UploadCloud size={11} />
                            + 이 문항에 새 이미지 직접 첨부
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {allInOnePreviewTab === 'tab2' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {(allInOneResult.tab2_trends || []).map((t: any, idx: number) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                      {t.questionNumber}
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {t.examTime} · 배점 {t.scoreWeight}
                    </span>
                  </div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                    {t.questionType}
                  </strong>
                  <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {allInOnePreviewTab === 'tab3' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {allInOneResult.tab3_scoring?.scoringRules && (
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '8px' }}>
                    모집단위별 문항 배점 체계:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                    {allInOneResult.tab3_scoring.scoringRules.map((rule: any, idx: number) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{rule.faculty}</strong>
                          <span style={{ fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>{rule.chip}</span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 700 }}>{rule.score}</div>
                        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '4px 0 0' }}>{rule.subDesc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allInOneResult.tab3_scoring?.rubrics && (
                <div style={{ paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a', display: 'block', marginBottom: '8px' }}>
                    공식 채점 기준표 (루브릭):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {allInOneResult.tab3_scoring.rubrics.map((rubric: any, idx: number) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{rubric.category}</strong>
                          <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 700 }}>{rubric.ratio}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>{rubric.description}</p>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#334155' }}>
                          {rubric.details?.map((d: string, dIdx: number) => (
                            <li key={dIdx}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 하단 저장 유도 바 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={handleSaveAllInOne}
              disabled={isSavingAllInOne}
              className="admin-btn-save"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              <Save size={16} />
              {isSavingAllInOne ? '선택된 탭을 Supabase DB에 저장하는 중...' : '💾 선택된 탭을 Supabase DB에 최종 반영'}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-card" style={{ textAlign: 'center', padding: '56px 20px' }}>
          <Sparkles size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: 0 }}>
            아직 분해 및 생성된 3대 탭 결과가 없습니다.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0' }}>
            입학처 공식 보고서 PDF를 파일 영역에 올리고 상단 '3대 탭 전체 자동 분해 & 생성'을 실행하세요.
          </p>
        </div>
      )}
    </section>
  )
}
