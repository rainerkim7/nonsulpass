const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/components/exam/ExamWorkspace.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const targetBlock = `              <div className="rubric-table-wrap">
                <table className="rubric-table">
                  <thead>
                    <tr>
                      <th style={{ width: '24%' }}>평가 영역</th>
                      <th style={{ width: '20%' }}>평가 대상</th>
                      <th style={{ width: '44%' }}>세부 채점 기준 및 핵심 도출 내용</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>배점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQ.rubric.items.map((sec, sIdx) =>
                      sec.subItems.map((sub, subIdx) => (
                        <tr key={\`\${sIdx}-\${subIdx}\`}>
                          {subIdx === 0 && (
                            <td rowSpan={sec.subItems.length} className="rubric-sec-title">
                              {sec.category}
                            </td>
                          )}
                          <td className="rubric-item-name">{sub.name}</td>
                          <td className="rubric-item-desc">{sub.desc}</td>
                          <td className="rubric-item-points">{sub.points}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>`;

const replacementBlock = `              <div className="rubric-table-wrap">
                {(!currentQ.rubric.items || currentQ.rubric.items.length === 0) ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#475569', margin: '8px 0' }}>
                    <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#1e293b' }}>
                      📋 문항별 세부 루브릭 준비 중
                    </p>
                    <p style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.6 }}>
                      본 문항은 대학 공식 <strong>모범답안, 제시문 핵심 논점 및 규정 분량(±10%)</strong>을 기준으로 AI 채점관의 블라인드 정밀 채점과 1:1 맞춤 첨삭이 정상 진행됩니다.
                    </p>
                  </div>
                ) : (
                  <table className="rubric-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>평가 영역</th>
                        <th style={{ width: '20%' }}>평가 대상</th>
                        <th style={{ width: '44%' }}>세부 채점 기준 및 핵심 도출 내용</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>배점</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentQ.rubric.items.map((sec, sIdx) =>
                        sec.subItems.map((sub, subIdx) => (
                          <tr key={\`\${sIdx}-\${subIdx}\`}>
                            {subIdx === 0 && (
                              <td rowSpan={sec.subItems.length} className="rubric-sec-title">
                                {sec.category}
                              </td>
                            )}
                            <td className="rubric-item-name">{sub.name}</td>
                            <td className="rubric-item-desc">{sub.desc}</td>
                            <td className="rubric-item-points">{sub.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: ExamWorkspace.tsx updated.');
} else {
  console.log('TARGET BLOCK NOT FOUND in ExamWorkspace.tsx');
}
