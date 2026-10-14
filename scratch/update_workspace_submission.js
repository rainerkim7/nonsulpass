const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/components/exam/ExamWorkspace.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. supabase import 추가
const targetImport = `import { useAuth } from '@/components/AuthGate'`;
const replacementImport = `import { useAuth } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase'`;

content = content.replace(targetImport, replacementImport);

// 2. const { isAdmin } = useAuth() -> const { isAdmin, user, userDisplayName } = useAuth()
const targetAuth = `  // 관리자 권한 확인 (admin 계정으로 로그인 시 true)
  const { isAdmin } = useAuth()`;

const replacementAuth = `  // 로그인 사용자 및 관리자 권한 확인
  const { isAdmin, user, userDisplayName } = useAuth()`;

content = content.replace(targetAuth, replacementAuth);

// 3. handleRunCustomGrade 내 DB 저장 로직 추가
const targetCustomReport = `      const reportData: GradingReportData = await res.json()
      onReport(reportData)`;

const replacementCustomReport = `      const reportData: GradingReportData = await res.json()

      // 로그인된 수험생/관리자의 경우 DB에 답안 및 채점 리포트 영구 저장
      if (user) {
        supabase
          .from('student_submissions')
          .insert({
            user_id: user.id,
            exam_id: selectedExamId,
            exam_title: currentQ.tag || \`\${currentUniv} 수시 논술\`,
            university: currentUniv,
            question_label: currentQ.label || '문항 1',
            student_answer: currentAnswer,
            char_count: currentAnswer.length,
            total_score: reportData.totalScore || 0,
            status_verdict: reportData.statusVerdict || '채점 완료',
            grading_report: reportData,
          })
          .then(({ error: saveErr }) => {
            if (saveErr) console.warn('[ExamWorkspace] 커스텀 채점 영구 저장 오류:', saveErr.message)
            else console.log('[ExamWorkspace] 커스텀 채점 리포트 DB 저장 성공!')
          })
          .catch(() => {})
      }

      onReport(reportData)`;

// handleRunCustomGrade와 handleSubmitAndGrade 둘 다 치환 (replace는 첫 번째만 치환되므로 두 번 호출)
content = content.replace(targetCustomReport, replacementCustomReport);
content = content.replace(targetCustomReport, replacementCustomReport);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: ExamWorkspace.tsx updated with submission saving.');
