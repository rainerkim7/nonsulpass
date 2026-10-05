import { NextRequest, NextResponse } from 'next/server'
// pdf-parse 1.1.4는 번들러 환경에서 Buffer를 입력받아 worker 없이 순수 파싱합니다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export const dynamic = 'force-dynamic'

// 단일 또는 다중 파일에서 텍스트를 고속 추출하는 API
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '첨부된 파일이 없습니다.' }, { status: 400 })
    }

    const results: Array<{
      name: string
      size: number
      text: string
      charCount: number
      error?: string
    }> = []

    for (const file of files) {
      const fileName = file.name
      const fileSize = file.size
      const lowerName = fileName.toLowerCase()

      try {
        const arrayBuffer = await file.arrayBuffer()

        if (lowerName.endsWith('.pdf')) {
          // PDF 파일 텍스트 추출 (Buffer 전달)
          const buffer = Buffer.from(arrayBuffer)
          const parsed = await pdfParse(buffer)
          const text = (parsed?.text || '').trim()

          results.push({
            name: fileName,
            size: fileSize,
            text,
            charCount: text.length,
          })
        } else {
          // 텍스트 파일 (.txt, .md, .json, .csv 등)
          const decoder = new TextDecoder('utf-8')
          const text = decoder.decode(arrayBuffer).trim()

          results.push({
            name: fileName,
            size: fileSize,
            text,
            charCount: text.length,
          })
        }
      } catch (err: any) {
        console.error(`[extract-pdf-text] 파일 파싱 오류 (${fileName}):`, err)
        results.push({
          name: fileName,
          size: fileSize,
          text: '',
          charCount: 0,
          error: err.message || '파일 텍스트 추출 실패',
        })
      }
    }

    return NextResponse.json({
      success: true,
      files: results,
      totalCharCount: results.reduce((sum, f) => sum + f.charCount, 0),
    })
  } catch (error: any) {
    console.error('[extract-pdf-text] 처리 중 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 파일 파싱 실패' },
      { status: 500 }
    )
  }
}
