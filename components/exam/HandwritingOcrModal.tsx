'use client'

/**
 * @file components/exam/HandwritingOcrModal.tsx
 * @description 스마트폰 카메라로 촬영한 손글씨 논술 원고지 및 노트 사진을 순서대로 업로드하고,
 *              Gemini Vision AI를 통해 텍스트로 자동 변환하여 답안 에디터에 반영하는 모달 컴포넌트
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Camera,
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  Eye,
  Plus,
  RefreshCw,
  Check
} from 'lucide-react'

interface UploadedImageItem {
  id: string
  file: File
  previewUrl: string
  base64: string
  name: string
  rotation: number // 0, 90, 180, 270
}

interface HandwritingOcrModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyText: (text: string, mode: 'replace' | 'append') => void
  currentAnswer: string
  questionLabel?: string
  charLimit?: string
}

/**
 * 브라우저 캔버스를 이용해 고용량 사진을 약 1600px 해상도 및 JPEG 0.85 품질로 리사이징/압축하는 유틸리티
 */
async function compressAndRotateImage(file: File, rotationDeg = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context를 생성할 수 없습니다.'))
          return
        }

        // 최대 가로/세로 1600px로 비율 유지 축소
        const MAX_DIM = 1600
        let { width, height } = img

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }

        const rad = (rotationDeg * Math.PI) / 180
        const isRotated90or270 = rotationDeg % 180 !== 0

        canvas.width = isRotated90or270 ? height : width
        canvas.height = isRotated90or270 ? width : height

        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(rad)
        ctx.drawImage(img, -width / 2, -height / 2, width, height)
        ctx.restore()

        // JPEG 85% 품질로 압축
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(compressedDataUrl)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function HandwritingOcrModal({
  isOpen,
  onClose,
  onApplyText,
  currentAnswer,
  questionLabel = '문제 1',
  charLimit = '800±100자'
}: HandwritingOcrModalProps) {
  // 업로드된 이미지 리스트
  const [images, setImages] = useState<UploadedImageItem[]>([])
  // 변환 상태 및 진행 단계
  const [step, setStep] = useState<'upload' | 'result'>('upload')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // AI 변환된 텍스트 결과 (검토 및 직접 수정 가능)
  const [extractedText, setExtractedText] = useState<string>('')
  // 반영 방식 ('replace': 덮어쓰기 | 'append': 이어붙이기)
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace')

  // 사진 확대 모달용 상태
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 모달 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      // 이미지 URL 객체 해제
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      setImages([])
      setStep('upload')
      setIsProcessing(false)
      setErrorMsg(null)
      setExtractedText('')
      setPreviewImage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  /**
   * 파일 추가 처리 (카메라 촬영 또는 갤러리/파일 선택)
   */
  const handleFilesAdded = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setErrorMsg(null)

    const newItems: UploadedImageItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      try {
        const base64 = await compressAndRotateImage(file, 0)
        const previewUrl = URL.createObjectURL(file)
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          previewUrl,
          base64,
          name: file.name,
          rotation: 0
        })
      } catch (err) {
        console.error('이미지 압축 처리 실패:', err)
      }
    }

    setImages((prev) => [...prev, ...newItems])
  }

  /** 순서 위로 이동 (앞 페이지로) */
  const moveUp = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index - 1]
      copy[index - 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  /** 순서 아래로 이동 (뒷 페이지로) */
  const moveDown = (index: number) => {
    if (index === images.length - 1) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index + 1]
      copy[index + 1] = copy[index]
      copy[index] = temp
      return copy
    })
  }

  /** 이미지 90도 회전 */
  const rotateImage = async (index: number) => {
    const item = images[index]
    if (!item) return
    const nextRotation = (item.rotation + 90) % 360
    try {
      const newBase64 = await compressAndRotateImage(item.file, nextRotation)
      setImages((prev) => {
        const copy = [...prev]
        copy[index] = {
          ...copy[index],
          rotation: nextRotation,
          base64: newBase64
        }
        return copy
      })
    } catch (err) {
      console.error('이미지 회전 실패:', err)
    }
  }

  /** 이미지 삭제 */
  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((img) => img.id !== id)
    })
  }

  /**
   * Gemini Vision API를 통한 손글씨 원고지 텍스트 변환 실행
   */
  const handleStartOcr = async () => {
    if (images.length === 0) {
      setErrorMsg('변환할 사진을 최소 1장 이상 업로드해 주세요.')
      return
    }

    setIsProcessing(true)
    setErrorMsg(null)
    setProcessingStatus(`Gemini Vision AI가 ${images.length}장의 원고지 사진을 순서대로 분석 중입니다...`)

    try {
      const payloadImages = images.map((img, idx) => ({
        data: img.base64,
        mimeType: 'image/jpeg',
        name: `Page ${idx + 1}`
      }))

      const res = await fetch('/api/ocr-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: payloadImages,
          questionLabel,
          charLimit
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || '사진 판독 중 오류가 발생했습니다.')
      }

      setExtractedText(data.text || '')
      setStep('result')
    } catch (err: any) {
      console.error('OCR 처리 에러:', err)
      setErrorMsg(err.message || '사진 판독 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  /**
   * 최종 텍스트를 나의 답안 에디터에 적용
   */
  const handleFinalApply = () => {
    if (!extractedText.trim()) {
      alert('적용할 텍스트 내용이 없습니다.')
      return
    }

    onApplyText(extractedText, applyMode)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s ease-out'
        }}
      >
        {/* 모달 상단 헤더 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  손글씨 답안 사진 업로드 · AI 자동 텍스트화
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#ede9fe',
                    color: '#6d28d9',
                    padding: '2px 8px',
                    borderRadius: '9999px'
                  }}
                >
                  Gemini Vision OCR
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                {questionLabel} · 원고지나 노트에 쓴 답안을 폰 카메라로 찍어 순서대로 올리면 AI가 즉시 전사합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 숨김 파일 입력기 */}
        {/* 1. 카메라 즉석 촬영 전용 (모바일) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFilesAdded(e.target.files)}
        />
        {/* 2. 다중 파일/갤러리 선택 전용 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFilesAdded(e.target.files)}
        />

        {/* 메인 본문 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* 오류 알림 */}
          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'upload' ? (
            <div>
              {/* 상단 액션 버튼 바 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '18px'
                }}
              >
                {/* 1. 카메라로 바로 촬영 */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#4338ca',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Camera size={18} />
                  <span>스마트폰 카메라로 촬영</span>
                </button>

                {/* 2. 갤러리/파일에서 여러 장 추가 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '13px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Upload size={18} />
                  <span>앨범/파일에서 여러 장 선택</span>
                </button>
              </div>

              {/* 안내 문구 카드 */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  fontSize: '12.5px',
                  color: '#166534',
                  lineHeight: '1.55'
                }}
              >
                <strong>💡 촬영 꿀팁:</strong> 원고지가 잘리지 않게 수평으로 평평하게 펴고, 그림자가 지지 않도록 밝은 곳에서 촬영해 주세요. 여러 장일 경우 <strong>[1페이지 → 2페이지...] 순서</strong>로 정렬해 주시면 하나의 완성된 답안으로 매끄럽게 연결됩니다.
              </div>

              {/* 업로드된 사진 목록 (순서 변경 가능) */}
              {images.length === 0 ? (
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '48px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px'
                    }}
                  >
                    <Upload size={24} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1e293b' }}>
                    아직 업로드된 사진이 없습니다
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    위 버튼을 누르거나 여기를 클릭하여 손글씨 답안지 사진을 추가해 주세요.
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}
                  >
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
                      업로드된 답안지 ({images.length}장) · 작성 순서대로 배치하세요
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4338ca',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> 사진 추가
                    </button>
                  </div>

                  {/* 사진 리스트 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* 페이지 번호 배지 */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {idx + 1}
                        </div>

                        {/* 썸네일 */}
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#f1f5f9',
                            flexShrink: 0,
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => setPreviewImage(img.base64)}
                          title="클릭하여 크게 보기"
                        >
                          <img
                            src={img.base64}
                            alt={`답안 ${idx + 1}페이지`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(0,0,0,0.2)',
                              opacity: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                          >
                            <Eye size={16} />
                          </div>
                        </div>

                        {/* 파일 정보 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: '0 0 4px',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {img.name || `${idx + 1}번째 페이지`}
                          </p>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {idx === 0 ? '시작 단락 (1페이지)' : `${idx + 1}페이지 이어지는 본문`}
                          </span>
                        </div>

                        {/* 순서 및 회전 / 삭제 제어 툴바 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0 || isProcessing}
                            title="위로 이동 (앞 페이지로)"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: idx === 0 ? '#f1f5f9' : '#ffffff',
                              color: idx === 0 ? '#cbd5e1' : '#334155',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(idx)}
                            disabled={idx === images.length - 1 || isProcessing}
                            title="아래로 이동 (뒷 페이지로)"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: idx === images.length - 1 ? '#f1f5f9' : '#ffffff',
                              color: idx === images.length - 1 ? '#cbd5e1' : '#334155',
                              cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => rotateImage(idx)}
                            disabled={isProcessing}
                            title="시계 방향 90도 회전"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <RotateCw size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            disabled={isProcessing}
                            title="사진 삭제"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff5f5',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 2단계: AI 변환 결과 검토 및 수정 화면 */
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    <CheckCircle2 size={14} /> 텍스트 변환 성공
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    공백 제외 <strong>{extractedText.replace(/\s/g, '').length}</strong>자 / 공백 포함 {extractedText.length}자
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={13} /> 사진 다시 확인 / 재변환
                </button>
              </div>

              {/* 추출된 텍스트 에디터 (수정 가능) */}
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  style={{
                    width: '100%',
                    height: '280px',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: '#1e293b',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  placeholder="추출된 텍스트가 여기에 표시됩니다. 오탈자가 있다면 직접 수정해 주세요."
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  * 원고지 교정 부호와 단락 흐름이 자동 반영되어 있습니다. 잘못 인식된 글자가 있다면 위 텍스트 창에서 바로 수정하실 수 있습니다.
                </p>
              </div>

              {/* 기존 답안 반영 방식 선택 */}
              {currentAnswer.trim().length > 0 && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px'
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    기존 작성 중이던 답안 처리 방식:
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: applyMode === 'replace' ? '#4338ca' : '#475569',
                        fontWeight: applyMode === 'replace' ? 700 : 500
                      }}
                    >
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'replace'}
                        onChange={() => setApplyMode('replace')}
                      />
                      기존 내용 지우고 새로 덮어쓰기 (권장)
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: applyMode === 'append' ? '#4338ca' : '#475569',
                        fontWeight: applyMode === 'append' ? 700 : 500
                      }}
                    >
                      <input
                        type="radio"
                        name="applyMode"
                        checked={applyMode === 'append'}
                        onChange={() => setApplyMode('append')}
                      />
                      기존 답안의 맨 뒤에 이어붙이기
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 하단 푸터 액션 */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            취소
          </button>

          {step === 'upload' ? (
            <button
              type="button"
              onClick={handleStartOcr}
              disabled={images.length === 0 || isProcessing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                backgroundColor: images.length === 0 || isProcessing ? '#94a3b8' : '#4338ca',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: images.length === 0 || isProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(67, 56, 202, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{processingStatus || 'AI 텍스트 변환 중...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Gemini AI로 텍스트 변환 ({images.length}장)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalApply}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Check size={16} />
              <span>나의 답안 작성에 적용하기</span>
            </button>
          )}
        </div>
      </div>

      {/* 사진 크게 보기 라이트박스 모달 */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="확대 보기"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <X size={26} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
