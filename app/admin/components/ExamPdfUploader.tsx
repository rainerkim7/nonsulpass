'use client'

/**
 * @file app/admin/components/ExamPdfUploader.tsx
 * @description 올인원 추출기 및 수동 시험 등록 관리자용 문제지 원본 PDF 첨부/관리 공통 컴포넌트
 */

import React, { useState, useRef } from 'react'
import { FileText, UploadCloud, ExternalLink, Trash2, Loader2, CheckCircle2 } from 'lucide-react'

interface ExamPdfUploaderProps {
  univId: string
  pdfUrl?: string
  pdfName?: string
  onChange: (pdfUrl: string, pdfName: string) => void
  showNotice?: (type: 'success' | 'error', message: string) => void
  className?: string
}

export default function ExamPdfUploader({
  univId,
  pdfUrl = '',
  pdfName = '',
  onChange,
  showNotice,
  className = ''
}: ExamPdfUploaderProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF 파일 업로드 실행 핸들러
  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      if (showNotice) {
        showNotice('error', 'PDF 형식(.pdf) 파일만 업로드할 수 있습니다.')
      } else {
        alert('PDF 형식(.pdf) 파일만 업로드할 수 있습니다.')
      }
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('univId', univId || 'common')

      const res = await fetch('/api/admin/upload-exam-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.success && data.url) {
        onChange(data.url, data.originalName || file.name)
        if (showNotice) {
          showNotice('success', `'${file.name}' 문제지 PDF가 성공적으로 첨부되었습니다.`)
        }
      } else {
        throw new Error(data.error || 'PDF 업로드에 실패했습니다.')
      }
    } catch (err: any) {
      if (showNotice) {
        showNotice('error', err.message || 'PDF 업로드 중 오류가 발생했습니다.')
      } else {
        alert(err.message || 'PDF 업로드 중 오류가 발생했습니다.')
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 파일 선택 변경 이벤트
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  // 드래그 앤 드롭 이벤트
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  // 첨부된 PDF 삭제 핸들러
  const handleRemove = () => {
    onChange('', '')
    if (showNotice) {
      showNotice('success', '첨부된 문제지 PDF가 제거되었습니다.')
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {pdfUrl ? (
        // 1. 이미 첨부된 PDF가 있는 경우: 상태 카드
        <div className="flex items-center justify-between p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl transition-all shadow-sm">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded">
                  문제지 PDF
                </span>
                <span className="text-xs text-slate-500 truncate font-mono">
                  {pdfUrl}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                {pdfName || pdfUrl.split('/').pop() || '첨부된 문제지.pdf'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 새 창으로 미리보기 */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
              title="새 창에서 원본 PDF 보기"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>미리보기</span>
            </a>

            {/* 다른 파일로 교체 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
              title="다른 PDF 파일로 교체"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" /> : '교체'}
            </button>

            {/* 삭제 */}
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
              title="PDF 첨부 해제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // 2. 아직 첨부되지 않은 경우: 드래그 앤 드롭 업로드 박스
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`flex items-center justify-between p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-rose-500 bg-rose-50/50 scale-[1.005]'
              : 'border-slate-200 hover:border-rose-400 hover:bg-slate-50/60 bg-white'
          } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 text-rose-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isUploading ? 'PDF 업로드 중...' : '직접 편집한 문제지 원본 PDF 첨부'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                클릭하거나 PDF 파일을 이곳으로 끌어다 놓으세요 (학생 시험 화면에서 바로 열람됩니다)
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-lg shrink-0">
            PDF 선택
          </span>
        </div>
      )}
    </div>
  )
}
