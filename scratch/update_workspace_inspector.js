const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/components/exam/ExamWorkspace.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. PromptInspectorModal import 추가
const targetImport = `import ExamInlineEditor from './admin/ExamInlineEditor'`;
const replacementImport = `import ExamInlineEditor from './admin/ExamInlineEditor'
import PromptInspectorModal from './PromptInspectorModal'
import { Terminal } from 'lucide-react'`;

if (content.includes(targetImport)) {
  content = content.replace(targetImport, replacementImport);
} else {
  console.log('TARGET IMPORT NOT FOUND');
}

// 2. state 추가 (showPromptInspector)
const targetState = `  const [showManuscriptModal, setShowManuscriptModal] = useState<boolean>(false)`;
const replacementState = `  const [showManuscriptModal, setShowManuscriptModal] = useState<boolean>(false)
  // 🔍 관리자 전용 채점 프롬프트 실시간 검사 및 튜닝 모달 상태
  const [showPromptInspector, setShowPromptInspector] = useState<boolean>(false)`;

if (content.includes(targetState)) {
  content = content.replace(targetState, replacementState);
} else {
  console.log('TARGET STATE NOT FOUND');
}

// 3. handleRunCustomGrade 추가 (handleSubmitAndGrade 위에 추가)
const targetSubmitFunc = `  // Gemini API를 호출하여 공식 채점 기준표에 따라 실시간 채점을 수행하는 핸들러
  const handleSubmitAndGrade = async () => {`;

const customGradeFunc = `  // 🔍 관리자 전용 커스텀 프롬프트 기반 즉시 채점 핸들러
  const handleRunCustomGrade = async (customSysPrompt: string, customUserPrompt: string) => {
    const trimmed = currentAnswer.trim()
    if (!trimmed || trimmed.length < 30) {
      alert('답안을 최소 30자 이상 작성하신 후 채점을 진행해 주세요.')
      return
    }

    setIsGrading(true)
    setGradingStep(1)
    setIsGradingDelayed(false)
    setShowPromptInspector(false)

    const t1 = setTimeout(() => setGradingStep(2), 2200)
    const t2 = setTimeout(() => setGradingStep(3), 4800)

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university: currentUniv,
          examTitle: currentQ.tag || \`\${currentUniv} 수시 논술\`,
          questionLabel: currentQ.label,
          questionTitle: currentQ.title,
          charLimit: currentQ.limit || '800±100자',
          passages: currentQ.passages,
          rubric: currentQ.rubric,
          modelAnswer: currentQ.modelAnswer,
          studentAnswer: currentAnswer,
          studentName: '관리자(시뮬레이션)',
          customSystemPrompt: customSysPrompt,
          customUserPrompt: customUserPrompt,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.error || '채점 분석 서버 응답 오류가 발생했습니다.')
      }

      const reportData: GradingReportData = await res.json()
      onReport(reportData)
    } catch (err: any) {
      console.warn('커스텀 프롬프트 채점 오류:', err)
      alert(\`커스텀 프롬프트 채점 오류: \${err.message}\`)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      setIsGrading(false)
    }
  }

  // Gemini API를 호출하여 공식 채점 기준표에 따라 실시간 채점을 수행하는 핸들러
  const handleSubmitAndGrade = async () => {`;

if (content.includes(targetSubmitFunc)) {
  content = content.replace(targetSubmitFunc, customGradeFunc);
} else {
  console.log('TARGET SUBMIT FUNC NOT FOUND');
}

// 4. 하단 바에 버튼 추가 (Button 바로 앞)
const targetBottomActions = `          <Button className="bottom-submit-btn" onClick={handleSubmitAndGrade} disabled={isGrading}>`;

const replacementBottomActions = `          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowPromptInspector(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                color: '#ffffff',
                border: '1px solid #4f46e5',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
                marginRight: '6px',
                transition: 'all 0.15s ease'
              }}
              title="현재 문항 채점 시 Gemini API로 전송되는 프롬프트를 확인하고 즉석 튜닝합니다"
            >
              <Terminal size={14} />
              <span>🔍 채점 프롬프트 검사 & 튜닝</span>
            </button>
          )}
          <Button className="bottom-submit-btn" onClick={handleSubmitAndGrade} disabled={isGrading}>`;

if (content.includes(targetBottomActions)) {
  content = content.replace(targetBottomActions, replacementBottomActions);
} else {
  console.log('TARGET BOTTOM ACTIONS NOT FOUND');
}

// 5. 모달 렌더링 추가
const targetModalEnd = `      {/* ▦ 실전 200자 정통 원고지 한 칸 정밀 입력 팝업 모달 */}`;

const promptModalSnippet = `      {/* 🔍 관리자 전용 채점 프롬프트 검사 및 실시간 튜닝 모달 */}
      <PromptInspectorModal
        isOpen={showPromptInspector}
        onClose={() => setShowPromptInspector(false)}
        university={currentUniv}
        examTitle={currentQ.tag || \`\${currentUniv} 수시 논술\`}
        questionLabel={currentQ.label}
        questionTitle={currentQ.title}
        charLimit={currentQ.limit || '800±100자'}
        passages={currentQ.passages}
        rubric={currentQ.rubric}
        modelAnswer={currentQ.modelAnswer}
        studentAnswer={currentAnswer}
        onRunCustomGrade={handleRunCustomGrade}
        isGrading={isGrading}
      />

      {/* ▦ 실전 200자 정통 원고지 한 칸 정밀 입력 팝업 모달 */}`;

if (content.includes(targetModalEnd)) {
  content = content.replace(targetModalEnd, promptModalSnippet);
} else {
  console.log('TARGET MODAL END NOT FOUND');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('SUCCESS: ExamWorkspace.tsx updated with PromptInspector.');
