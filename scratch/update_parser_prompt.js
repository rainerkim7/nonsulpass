const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/app/api/admin/parse-integrated-doc/route.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const targetStr = "     - modelAnswer: 문서에 수록된 공식 예시답안 전문`)";
const replaceStr = `     - modelAnswer: 문서에 수록된 공식 예시답안 전문
     - scoringCriteria: 해당 문항의 공식 채점 기준표 배열 (문서 내 [채점 기준/평가 기준/루브릭] 내용 기반)
       - grade: 등급 또는 평가 단계 (예: "A", "B", "C", "D" 또는 "우수", "보통", "미흡")
       - range: 획득 점수 구간 (예: "90~100점", "20~25점")
       - description: 해당 등급/점수 부여를 위한 세부 채점 요건 및 필수 논점 서술
     - rubric: (선택 사항) 해당 문항의 정밀 루브릭 객체
       - facultyWeight: 계열 및 배점 요약 (예: "사회계열 논제 Ⅰ (25점 배점)")
       - totalScore: 만점 및 기본점수 (예: "100점 만점 (기본 60점)")
       - items: 평가 영역별 세부 항목 배열 [{ category: "평가영역", subItems: [{ name: "항목명", desc: "세부내용", points: "배점" }] }]
       - deductions: 글자 수 및 원고지 작성 관련 감점 기준 문자열 배열\`)`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: parse-integrated-doc prompt updated.');
} else {
  console.log('TARGET NOT FOUND');
}
