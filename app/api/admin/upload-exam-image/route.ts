/**
 * @file app/api/admin/upload-exam-image/route.ts
 * @description 관리자 페이지 올인원 추출기 및 시험 관리용 도표·그래프 이미지 업로드 API
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const univId = (formData.get('univId') as string) || 'common'

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

    // 저장 디렉터리: public/images/exams/[univId]/
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'exams', univId)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // 파일명 안전화: 타임스탬프 + 영문/숫자 기반 고유 이름
    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3]/g, '_')
    const finalFileName = `graph_${Date.now()}_${sanitizedBase}${ext}`
    const filePath = path.join(uploadDir, finalFileName)

    // 파일 버퍼 저장
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    // 웹에서 접근 가능한 공개 상대 URL
    const publicUrl = `/images/exams/${univId}/${finalFileName}`

    return NextResponse.json({
      success: true,
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
