const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/lib/exam-helper.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const targetBlock = `        rubric: q.rubric || {
          facultyWeight: examMeta?.targetFaculty || examMeta?.target_faculty || '인문계열',
          totalScore: \`\${q.points || q.score || 50}점 만점 (정밀채점 100점 환산)\`,
          items: q.scoringCriteria
            ? [
                {
                  category: '채점 기준 등급별 평가 요소',
                  subItems: (q.scoringCriteria || []).map((sc: any) => ({
                    name: \`[\${sc.grade}등급 (\${sc.range})]\`,
                    desc: sc.description,
                    points: sc.range
                  }))
                }
              ]
            : [],
          deductions: [
            '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
            '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
          ]
        },`;

const replacementBlock = `        // rubric 지능형 매핑: q.rubric -> q.scoringCriteria -> 로컬 프리셋 fallback
        rubric: (() => {
          if (q.rubric && Array.isArray(q.rubric.items) && q.rubric.items.length > 0) {
            return q.rubric
          }
          if (Array.isArray(q.scoringCriteria) && q.scoringCriteria.length > 0) {
            return {
              facultyWeight: examMeta?.targetFaculty || examMeta?.target_faculty || '인문·사회계열',
              totalScore: \`\${q.points || q.score || 50}점 만점 (정밀채점 100점 환산)\`,
              items: [
                {
                  category: '채점 기준 등급별 평가 요소',
                  subItems: q.scoringCriteria.map((sc: any) => ({
                    name: \`[\${sc.grade}등급 (\${sc.range})]\`,
                    desc: sc.description,
                    points: sc.range
                  }))
                }
              ],
              deductions: [
                '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
                '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
              ]
            }
          }
          // 로컬 프리셋에 정의된 공식 채점표가 있다면 연결 (경희대 2026 사회계열 등)
          try {
            const fallbackMap = getQuestionsData(examMeta?.id)
            const fallbackQ = fallbackMap?.[qKey]
            if (fallbackQ?.rubric?.items && fallbackQ.rubric.items.length > 0) {
              return fallbackQ.rubric
            }
          } catch (e) {
            // fallback 무시
          }
          return {
            facultyWeight: examMeta?.targetFaculty || examMeta?.target_faculty || '인문·사회계열',
            totalScore: \`\${q.points || q.score || 50}점 만점 (정밀채점 100점 환산)\`,
            items: [],
            deductions: [
              '지정 글자 수(±10% 범위) 미달 또는 초과 시 감점',
              '제시문 문장을 그대로 복사하거나 핵심 논점을 오독한 경우 감점'
            ]
          }
        })(),`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: exam-helper.ts updated.');
} else {
  console.log('TARGET BLOCK NOT FOUND');
}
