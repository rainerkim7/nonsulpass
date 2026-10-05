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
  CheckSquare
} from 'lucide-react'
import { UNIVERSITY_FACULTIES, UNIVERSITIES } from '@/lib/constants/universities'

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
  }>({ tab1: true, tab2: true, tab3: true })

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
  const [isParsingAllInOne, setIsParsingAllInOne] = useState<boolean>(false)
  const [isSavingAllInOne, setIsSavingAllInOne] = useState<boolean>(false)
  const [allInOneResult, setAllInOneResult] = useState<{
    tab1_exam?: any
    tab2_trends?: any[]
    tab3_scoring?: any
  } | null>(null)
  const [allInOnePreviewTab, setAllInOnePreviewTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1')

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

  // 다중 파일 업로드 핸들러
  const handleAllInOneFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploadingFiles(true)
    try {
      const formData = new FormData()
      Array.from(selectedFiles).forEach((f) => formData.append('files', f))

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
      e.target.value = ''
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
        setAllInOneResult(data.data)
        if (data.data?.tab1_exam) {
          setAllInOnePreviewTab('tab1')
        } else if (data.data?.tab2_trends && data.data.tab2_trends.length > 0) {
          setAllInOnePreviewTab('tab2')
        } else if (data.data?.tab3_scoring) {
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
            <span style={{ fontSize: '11.5px', color: '#3b82f6', fontWeight: 600 }}>
              (원하는 탭만 체크하여 선별 생성하거나 기존 데이터를 안전하게 부분 갱신할 수 있습니다)
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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px 20px',
                  background: isUploadingFiles ? '#eff6ff' : '#ffffff',
                  border: '2px dashed #93c5fd',
                  borderRadius: '10px',
                  cursor: isUploadingFiles ? 'wait' : 'pointer',
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
                ) : (
                  <>
                    <UploadCloud size={32} color="#3b82f6" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a' }}>
                      선행학습 영향평가서 PDF 또는 텍스트 파일을 이곳에 업로드하세요
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      여러 권의 문서를 동시에 선택하여 한 번에 종합 분석할 수도 있습니다.
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
              {allInOneResult.tab1_exam.questions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allInOneResult.tab1_exam.questions.map((q: any, qIdx: number) => (
                    <div key={qIdx} style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ fontSize: '13px', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>
                        {q.label || `문항 ${qIdx + 1}`} ({q.score || '배점 미정'} · {q.charLimit || ''})
                      </strong>
                      <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>{q.questionText}</p>
                    </div>
                  ))}
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
