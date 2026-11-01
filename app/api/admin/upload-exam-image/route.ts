/**
 * @file app/api/admin/upload-exam-image/route.ts
 * @description 관리자 페이지 올인원 추출기 및 시험 관리용 도표·그래프 이미지 업로드 API
 *              (1순위: Supabase Storage 'exam-assets' 버킷 영구 저장 / 2순위: 로컬 디스크 스마트 폴백)
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'exam-assets'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawUnivId = (formData.get('univId') as string) || 'common'
    const safeUnivFolder = rawUnivId.replace(/[^a-zA-Z0-9_-]/g, '') || 'common'

    if (!file) {
      return NextResponse.json({ error: '업로드할 이미지 파일이 없습니다.' }, { status: 400 })
    }

    const fileName = file.name
    const ext = path.extname(fileName).toLowerCase()
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']

    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `지원하지 않는 이미지 형식입니다. (${allowedExts.join(', ')} 지원)` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Supabase Storage ('exam-assets' 버킷) 우선 업로드 시도
    const asciiBase = path
      .basename(fileName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32)
    const storageFileName = `graph_${Date.now()}_${asciiBase || Math.random().toString(36).slice(2, 8)}${ext}`
    const storagePath = `images/${safeUnivFolder}/${storageFileName}`

    const { error: storageErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type || MIME_BY_EXT[ext] || 'image/png',
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
        `[upload-exam-image] Supabase Storage 업로드 폴백 (${storageErr.message}) -> 로컬 디스크 저장 시도`
      )
    }

    // 2. 로컬 개발 환경 스마트 폴백 (버킷 미생성 시 public/images/exams/[univId]/ 에 저장)
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'exams', safeUnivFolder)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3]/g, '_')
    const finalFileName = `graph_${Date.now()}_${sanitizedBase}${ext}`
    const filePath = path.join(uploadDir, finalFileName)

    fs.writeFileSync(filePath, buffer)
    const publicUrl = `/images/exams/${safeUnivFolder}/${finalFileName}`

    return NextResponse.json({
      success: true,
      storage: 'local',
      url: publicUrl,
      fileName: finalFileName,
      originalName: fileName,
      size: file.size,
    })
  } catch (error: any) {
    console.error('[upload-exam-image] 업로드 처리 중 오류:', error)
    return NextResponse.json(
      { error: error.message || '이미지 파일 저장 실패' },
      { status: 500 }
    )
  }
}
