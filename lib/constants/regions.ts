/**
 * @file lib/constants/regions.ts
 * @description 대한민국 17개 광역시·도 목록 (회원가입 및 개인정보 수정용)
 */

export const HIGH_SCHOOL_REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const

export type HighSchoolRegion = (typeof HIGH_SCHOOL_REGIONS)[number]
