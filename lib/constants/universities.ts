/**
 * @file lib/constants/universities.ts
 * @description 대학 및 실제 논술 출제 시험지(문제 트랙) 메타데이터 중앙 관리 모듈
 *              (기본 주요 대학 프리셋 + Supabase DB 동적 추가 대학 무제한 확장 지원)
 */

export interface UniversityMeta {
  id: string
  name: string
  active?: boolean
  desc?: string
  tracks?: string[]
}

// 1. 기본 제공 주요 대학 프리셋 목록 (DB에 추가되는 신규 대학과 자동 병합됨)
export const SEOUL_UNIVERSITIES: UniversityMeta[] = [
  { id: 'yonsei', name: '연세대학교', active: false, desc: '인문·사회계열 (수리논술 포함)' },
  { id: 'korea', name: '고려대학교', active: false, desc: '인문계열 (공통)' },
  { id: 'sogang', name: '서강대학교', active: false, desc: '인문/영미문화 · 사회과학/경영' },
  { id: 'skku', name: '성균관대학교', active: false, desc: '인문계열 · 사회과학계열 (3문항, 100분)' },
  { id: 'hanyang', name: '한양대학교', active: false, desc: '인문계열 · 상경계열 (수리논술)' },
  { id: 'cau', name: '중앙대학교', active: false, desc: '인문콘텐츠·사범 · 경영경제 (수리논술)' },
  { id: 'khu', name: '경희대학교', active: true, desc: '인문·체육/사회계열 (2~3문항, 120분, 2,000자)' },
  { id: 'hufs', name: '한국외국어대', active: false, desc: '인문계열 · 사회계열' },
  { id: 'uos', name: '서울시립대', active: false, desc: '인문계열 (공통)' },
  { id: 'ewha', name: '이화여자대', active: false, desc: '인문계열 I · 인문계열 II (수리논술)' },
  { id: 'konkuk', name: '건국대학교', active: false, desc: '인문사회 I · 인문사회 II (수리논술)' },
  { id: 'dongguk', name: '동국대학교', active: true, desc: '인문계열 (3문항, 100분, 1,500자)' },
  { id: 'hongik', name: '홍익대학교', active: true, desc: '인문·사회계열 (2문항, 120분, 1,600자)' },
  { id: 'sookmyung', name: '숙명여자대', active: false, desc: '인문계열 (공통)' },
  { id: 'soongsil', name: '숭실대학교', active: false, desc: '인문계열 · 경상계열 (수리논술)' },
  { id: 'kookmin', name: '국민대학교', active: false, desc: '인문계열 (공통)' },
  { id: 'sejong', name: '세종대학교', active: false, desc: '인문계열 (공통)' },
  { id: 'seoultech', name: '서울과기대', active: false, desc: '인문계열 (공통)' },
]

// 2. 관리자 및 서비스 지원 대학 목록 (전체 기본 대학 + 동적 확장 호환)
export const SUPPORTED_UNIVERSITIES: UniversityMeta[] = SEOUL_UNIVERSITIES

// 3. 🎯 대학별 실제 출제 시험지(문제 트랙) 기준 계열 프리셋 목록
export const UNIVERSITY_EXAM_TRACKS: Record<string, string[]> = {
  // 1) 인문계열 단일 통합 출제 대학 (공통 시험지 1개 트랙)
  hongik: ['인문계열 (공통)'],
  korea: ['인문계열 (공통)'],
  uos: ['인문계열 (공통)'],
  dongguk: ['인문계열 (공통)'],
  sookmyung: ['인문계열 (공통)'],
  kookmin: ['인문계열 (공통)'],
  sejong: ['인문계열 (공통)'],
  seoultech: ['인문계열 (공통)'],

  // 2) 출제 시험지 분리 대학 (수리논술 포함 또는 계열별 별도 시험지 트랙)
  khu: ['인문·체육계열', '사회계열'],
  yonsei: ['인문계열', '사회계열'],
  skku: ['인문과학계열 (1교시)', '사회과학계열 (2교시)'],
  sogang: ['인문/영미문화', '사회과학/경영'],
  hanyang: ['인문계열', '상경계열 (수리논술)'],
  cau: ['인문콘텐츠·사범', '경영경제 (수리논술)'],
  ewha: ['인문계열 I', '인문계열 II (수리논술)'],
  konkuk: ['인문사회 I', '인문사회 II (수리논술)'],
  soongsil: ['인문계열', '경상계열 (수리논술)'],
  hufs: ['인문계열', '사회계열'],
}

// 런타임 동적 대학 캐시 (DB에서 로드된 신규 대학 정보 실시간 반영용)
const dynamicUnivCache = new Map<string, UniversityMeta>()

/**
 * DB에서 불러온 대학 목록을 런타임 캐시에 등록하여
 * getUniversityName, getUniversityId, getUniversityTracks가 신규 추가 대학도 즉시 인식하도록 동기화
 */
export function registerDynamicUniversities(univs: UniversityMeta[]) {
  univs.forEach((u) => {
    if (!u.id || !u.name) return
    dynamicUnivCache.set(u.id, u)
    if (u.tracks && u.tracks.length > 0 && !UNIVERSITY_EXAM_TRACKS[u.id]) {
      UNIVERSITY_EXAM_TRACKS[u.id] = u.tracks
    }
  })
}

/**
 * 기본 프리셋 대학 목록과 DB에서 조회된 대학 목록을 중복 없이 병합하여 반환
 */
export function mergeUniversitiesWithDb(
  dbUnivs: Array<{ id: string; name: string; is_active?: boolean; faculty?: string }> = [],
  examUnivIds: string[] = []
): UniversityMeta[] {
  const activeExamSet = new Set(examUnivIds)
  const dbMap = new Map(dbUnivs.map((d) => [d.id, d]))
  const result: UniversityMeta[] = []
  const seenIds = new Set<string>()

  // 1. 기본 대학 목록 먼저 반영 (DB 활성 상태 또는 시험 존재 여부 반영)
  SEOUL_UNIVERSITIES.forEach((preset) => {
    const dbRow = dbMap.get(preset.id)
    const isReady =
      Boolean(preset.active) ||
      Boolean(dbRow?.is_active) ||
      activeExamSet.has(preset.id)

    const merged: UniversityMeta = {
      ...preset,
      name: dbRow?.name || preset.name,
      active: isReady,
      desc: dbRow?.faculty || preset.desc,
    }
    seenIds.add(preset.id)
    result.push(merged)
  })

  // 2. 관리자가 새로 추가한 DB 전용 대학들을 목록 뒤에 자동 추가
  dbUnivs.forEach((dbRow) => {
    if (!dbRow.id || seenIds.has(dbRow.id)) return
    const tracks = dbRow.faculty
      ? dbRow.faculty.split(/[,/·]/).map((s) => s.trim()).filter(Boolean)
      : ['인문계열 (공통)']

    const newMeta: UniversityMeta = {
      id: dbRow.id,
      name: dbRow.name,
      active: Boolean(dbRow.is_active) || activeExamSet.has(dbRow.id),
      desc: dbRow.faculty || '인문·사회계열',
      tracks: tracks.length > 0 ? tracks : ['인문계열 (공통)'],
    }
    seenIds.add(dbRow.id)
    result.push(newMeta)
  })

  registerDynamicUniversities(result)
  return result
}

// 하위 호환 별칭
export const UNIVERSITY_FACULTIES = UNIVERSITY_EXAM_TRACKS
export const UNIVERSITIES = SUPPORTED_UNIVERSITIES

/**
 * 대학 ID로 한글 대학명 조회 (신규 추가 대학 포함)
 */
export function getUniversityName(univId: string): string {
  if (!univId) return '홍익대학교'
  const cached = dynamicUnivCache.get(univId)
  if (cached?.name) return cached.name

  const found =
    SUPPORTED_UNIVERSITIES.find((u) => u.id === univId) ||
    SEOUL_UNIVERSITIES.find((u) => u.id === univId)
  return found ? found.name : univId
}

/**
 * 대학 ID로 출제 트랙(계열) 목록 조회
 */
export function getUniversityTracks(univId: string): string[] {
  const cached = dynamicUnivCache.get(univId)
  if (cached?.tracks && cached.tracks.length > 0) return cached.tracks
  return UNIVERSITY_EXAM_TRACKS[univId] || ['인문계열 (공통)']
}

/**
 * 한글 대학명으로 대학 ID 조회 (신규 추가 대학 포함)
 */
export function getUniversityId(name: string): string {
  if (!name) return 'hongik'
  const cleanInput = name.replace(/대학교|여자대|외국어대|과기대|대학/, '').trim()

  // 1. 동적 캐시에서 우선 탐색
  for (const [id, meta] of dynamicUnivCache.entries()) {
    if (meta.name === name || meta.id === name) return id
    const cleanMeta = meta.name.replace(/대학교|여자대|외국어대|과기대|대학/, '').trim()
    if (cleanInput && cleanMeta && (meta.name.includes(cleanInput) || cleanInput.includes(cleanMeta))) {
      return id
    }
  }

  // 2. 기본 프리셋에서 탐색
  const found = SEOUL_UNIVERSITIES.find(
    (u) =>
      u.id === name ||
      u.name === name ||
      (cleanInput && u.name.includes(cleanInput)) ||
      name.includes(u.name.slice(0, 2))
  )
  return found ? found.id : name
}
