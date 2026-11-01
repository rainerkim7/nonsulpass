/**
 * @file app/api/admin/upload-exam-pdf/route.ts
 * @description 관리자 페이지 올인원 추출기 및 시험 관리용 문제지 원본 PDF 업로드/삭제 API
 *              (1순위: Supabase Storage 'exam-assets' 버킷 영구 저장 / 2순위: 로컬 디스크 스마트 폴백)
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'exam-assets'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawUnivId = (formData.get('univId') as string) || 'common'
    // Storage 경로에 안전한 영문/숫자 폴더명 보장
    const safeUnivFolder = rawUnivId.replace(/[^a-zA-Z0-9_-]/g, '') || 'common'

    if (!file) {
      return NextResponse.json({ error: '업로드할 PDF 파일이 없습니다.' }, { status: 400 })
    }

    const fileName = file.name
    const ext = path.extname(fileName).toLowerCase()

    // 오직 PDF 파일만 허용
    if (ext !== '.pdf') {
      return NextResponse.json(
        { error: 'PDF 형식(.pdf)의 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Supabase Storage ('exam-assets' 버킷) 우선 업로드 시도
    // (Storage 객체 키는 한글/특수문자 인코딩 오류 방지를 위해 안전한 ASCII 키 사용, 원본 파일명은 originalName으로 보존)
    const asciiBase = path
      .basename(fileName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32)
    const storageFileName = `exam_${Date.now()}_${asciiBase || Math.random().toString(36).slice(2, 8)}${ext}`
    const storagePath = `pdf/${safeUnivFolder}/${storageFileName}`

    const { error: storageErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!storageErr) {
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      if (publicUrlData?.publicUrl) {
        return NextResponse.json({
          success: true,
          storage: 'supabase',
          url: publicUrlData.publicUrl,
          fileName: storageFileName,
          originalName: fileName,
          size: file.size,
        })
      }
    } else {
      console.warn(
        `[upload-exam-pdf] Supabase Storage 업로드 폴백 (${storageErr.message}) -> 로컬 디스크 저장 시도`
      )
    }

    // 2. 로컬 개발 환경 스마트 폴백 (버킷 미생성 시 public/exams/pdf/[univId]/ 에 저장)
    const uploadDir = path.join(process.cwd(), 'public', 'exams', 'pdf', safeUnivFolder)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3]/g, '_')
    const finalFileName = `exam_${Date.now()}_${sanitizedBase}${ext}`
    const filePath = path.join(uploadDir, finalFileName)

    fs.writeFileSync(filePath, buffer)
    const publicUrl = `/exams/pdf/${safeUnivFolder}/${finalFileName}`

    return NextResponse.json({
      success: true,
      storage: 'local',
      url: publicUrl,
      fileName: finalFileName,
      originalName: fileName,
      size: file.size,
    })
  } catch (error: any) {
    console.error('[upload-exam-pdf] PDF 업로드 처리 중 오류:', error)
    return NextResponse.json(
      { error: error.message || 'PDF 파일 저장 실패' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { fileUrl } = await req.json()
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: '삭제할 파일 URL이 필요합니다.' }, { status: 400 })
    }

    // 1. Supabase Storage URL인 경우 버킷에서 객체 삭제
    const storageMarker = `/storage/v1/object/public/${BUCKET_NAME}/`
    if (fileUrl.includes(storageMarker)) {
      const objectPath = fileUrl.split(storageMarker)[1]?.split('?')[0]
      if (objectPath) {
        const { error: removeErr } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([decodeURIComponent(objectPath)])

        if (removeErr) {
          console.warn('[upload-exam-pdf] Supabase Storage 파일 삭제 경고:', removeErr.message)
        }
        return NextResponse.json({
          success: true,
          message: 'Supabase Storage에서 PDF 파일이 성공적으로 정리되었습니다.',
        })
      }
    }

    // 2. 로컬 디스크 경로(/exams/pdf/...)인 경우 파일 삭제
    if (!fileUrl.startsWith('/exams/pdf/')) {
      return NextResponse.json({ error: '유효하지 않은 시험 PDF 경로입니다.' }, { status: 400 })
    }

    const safePath = path.normalize(path.join(process.cwd(), 'public', fileUrl))
    const allowedPrefix = path.normalize(path.join(process.cwd(), 'public', 'exams', 'pdf'))

    if (!safePath.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: '접근이 허용되지 않은 경로입니다.' }, { status: 403 })
    }

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath)
    }

    return NextResponse.json({
      success: true,
      message: '디스크에서 PDF 파일이 성공적으로 정리되었습니다.',
    })
  } catch (error: any) {
    console.error('[upload-exam-pdf] PDF 파일 삭제 중 오류:', error)
    return NextResponse.json({ error: error.message || 'PDF 파일 삭제 실패' }, { status: 500 })
  }
}
