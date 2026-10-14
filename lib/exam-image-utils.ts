/**
 * @file lib/exam-image-utils.ts
 * @description 논술 시험 도표·그래프 이미지 업로드 및 마크다운 처리 공통 유틸리티
 */

export interface AttachedImageItem {
  alt: string
  url: string
}

/**
 * 긴 이미지 파일명을 식별 번호(_1, _2 등)가 손실되지 않도록 스마트하게 축약
 */
export function formatImageFileName(name: string, maxLength: number = 22): string {
  if (!name) return '도표 이미지'
  if (name.length <= maxLength) return name
  const keepEnd = Math.floor((maxLength - 3) * 0.45)
  const keepStart = maxLength - 3 - keepEnd
  return `${name.slice(0, keepStart)}...${name.slice(-keepEnd)}`
}

/**
 * 파일 확장자 및 특수문자를 정제하여 마크다운 alt 텍스트로 가공
 */
export function cleanImageAlt(rawName: string): string {
  if (!rawName) return '도표 및 그래프'
  return (
    rawName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-\uAC00-\uD7A3\s]/g, '')
      .trim() || '도표 및 그래프'
  )
}

/**
 * 텍스트 본문(문항 발문, 제시문 등)에 포함된 모든 마크다운 이미지(![alt](url)) 목록 추출
 */
export function extractImagesFromText(text: string): AttachedImageItem[] {
  if (!text) return []
  const regex = /!\[(.*?)\]\((.*?)\)/g
  const list: AttachedImageItem[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (!list.some(item => item.url === m![2])) {
      list.push({ alt: m[1], url: m[2] })
    }
  }
  return list
}

/**
 * 텍스트 본문에서 특정 이미지 URL의 마크다운 태그를 제거
 */
export function removeImageFromText(text: string, urlToRemove: string): string {
  if (!text || !urlToRemove) return text || ''
  const escapedUrl = urlToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`!\\[[^\\]]*\\]\\(${escapedUrl}\\)\\n*`, 'g')
  return text.replace(regex, '')
}

/**
 * 서버에 시험 도표 이미지 파일 업로드 (/api/admin/upload-exam-image)
 */
export async function uploadExamImage(file: File, univId: string = 'common'): Promise<{
  url: string
  fileName: string
  originalName: string
  size: number
}> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('univId', univId)

  const res = await fetch('/api/admin/upload-exam-image', {
    method: 'POST',
    body: formData
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || '이미지 파일 업로드에 실패했습니다.')
  }

  return {
    url: data.url,
    fileName: data.fileName,
    originalName: data.originalName || file.name,
    size: data.size || file.size
  }
}
