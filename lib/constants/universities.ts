/**
 * @file lib/constants/universities.ts
 * @description 서울 주요 대학 및 실제 논술 출제 시험지(문제 트랙) 메타데이터 중앙 관리 모듈
 *              (Single Source of Truth: 메인 화면과 관리자 화면 공통 사용)
 */

export interface UniversityMeta {
  id: string
  name: string
  active?: boolean
  desc?: string
}

// 1. 서울 주요 18개 대학 목록 데이터
export const SEOUL_UNIVERSITIES: UniversityMeta[] = [
  { id: 'yonsei', name: '연세대학교' },
  { id: 'korea', name: '고려대학교' },
  { id: 'sogang', name: '서강대학교' },
  { id: 'skku', name: '성균관대학교' },
  { id: 'hanyang', name: '한양대학교' },
  { id: 'cau', name: '중앙대학교' },
  { id: 'khu', name: '경희대학교' },
  { id: 'hufs', name: '한국외국어대' },
  { id: 'uos', name: '서울시립대' },
  { id: 'ewha', name: '이화여자대' },
  { id: 'konkuk', name: '건국대학교' },
  { id: 'dongguk', name: '동국대학교' },
  { id: 'hongik', name: '홍익대학교' },
  { id: 'sookmyung', name: '숙명여자대' },
  { id: 'soongsil', name: '숭실대학교' },
  { id: 'kookmin', name: '국민대학교' },
  { id: 'sejong', name: '세종대학교' },
  { id: 'seoultech', name: '서울과기대' },
]

// 2. 관리자 및 서비스 지원 대학 목록 (상세 정보 포함)
export const SUPPORTED_UNIVERSITIES: UniversityMeta[] = [
  { id: 'hongik', name: '홍익대학교', active: true, desc: '인문·사회계열 (2문항, 120분, 1,600자)' },
  { id: 'khu', name: '경희대학교', active: true, desc: '인문·체육/사회계열 (2~3문항, 120분, 2,000자)' },
  { id: 'dongguk', name: '동국대학교', active: true, desc: '인문계열 (3문항, 100분, 1,500자)' },
  { id: 'yonsei', name: '연세대학교', active: false, desc: '인문·사회계열 (수리논술 포함)' },
  { id: 'skku', name: '성균관대학교', active: false, desc: '인문계열 (3문항, 100분)' },
  { id: 'hanyang', name: '한양대학교', active: false, desc: '인문/상경계열' },
]

// 3. 🎯 대학별 실제 출제 시험지(문제 트랙) 기준 계열 프리셋 목록
// - [단일 통합형]: 모든 인문 학과가 공통 시험지 1장 응시 -> ['인문계열 (공통)'] (계열 전환 바 숨김)
// - [문제 분리형]: 수리논술 유무/시험지 분리 대학 -> 2개 트랙 버튼 노출
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

// 하위 호환 별칭
export const UNIVERSITY_FACULTIES = UNIVERSITY_EXAM_TRACKS
export const UNIVERSITIES = SUPPORTED_UNIVERSITIES

/**
 * 대학 ID로 한글 대학명 조회
 */
export function getUniversityName(univId: string): string {
  const found = SUPPORTED_UNIVERSITIES.find((u) => u.id === univId) || SEOUL_UNIVERSITIES.find((u) => u.id === univId)
  return found ? found.name : '해당 대학'
}

/**
 * 대학 ID로 출제 트랙(계열) 목록 조회
 */
export function getUniversityTracks(univId: string): string[] {
  return UNIVERSITY_EXAM_TRACKS[univId] || ['인문계열 (공통)']
}
