/**
 * @file app/api/admin/upload-exam-pdf/route.ts
 * @description 관리자 페이지 올인원 추출기 및 시험 관리용 문제지 원본 PDF 업로드 API
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

    // 저장 디렉터리: public/exams/pdf/[univId]/
    const uploadDir = path.join(process.cwd(), 'public', 'exams', 'pdf', univId)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // 파일명 안전화: 타임스탬프 + 한글/영문/숫자 기반 고유 이름
    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3]/g, '_')
    const finalFileName = `exam_${Date.now()}_${sanitizedBase}${ext}`
    const filePath = path.join(uploadDir, finalFileName)

    // 파일 버퍼 저장
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    // 웹에서 브라우저가 직접 접근 가능한 공개 정적 상대 URL
    const publicUrl = `/exams/pdf/${univId}/${finalFileName}`

    return NextResponse.json({
      success: true,
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

    // 경로 검증: /exams/pdf/ 로 시작해야 안전
    if (!fileUrl.startsWith('/exams/pdf/')) {
      return NextResponse.json({ error: '유효하지 않은 시험 PDF 경로입니다.' }, { status: 400 })
    }

    // Path traversal 방지: 절대 경로 계산 및 안전한 디렉터리 내에 있는지 검증
    const safePath = path.normalize(path.join(process.cwd(), 'public', fileUrl))
    const allowedPrefix = path.normalize(path.join(process.cwd(), 'public', 'exams', 'pdf'))

    if (!safePath.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: '접근이 허용되지 않은 경로입니다.' }, { status: 403 })
    }

    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath)
    }

    return NextResponse.json({ success: true, message: '디스크에서 PDF 파일이 성공적으로 정리되었습니다.' })
  } catch (error: any) {
    console.error('[upload-exam-pdf] PDF 파일 삭제 중 오류:', error)
    return NextResponse.json({ error: error.message || 'PDF 파일 삭제 실패' }, { status: 500 })
  }
}

