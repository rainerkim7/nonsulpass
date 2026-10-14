const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('d:/aaPass/nonsulpasslab/app/api/grade/route.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. body 구조분해할당에 customSystemPrompt, customUserPrompt 추가
const targetBody = `      studentAnswer = '',
      studentName = '수험생',
    } = body`;

const replacementBody = `      studentAnswer = '',
      studentName = '수험생',
      customSystemPrompt = '',
      customUserPrompt = '',
    } = body`;

if (content.includes(targetBody)) {
  content = content.replace(targetBody, replacementBody);
} else {
  console.log('TARGET BODY NOT FOUND');
}

// 2. finalSystemPrompt, finalUserPrompt 적용
const targetCall = `    for (const model of modelsToTry) {`;
const promptOverride = `    const finalSystemPrompt = customSystemPrompt && customSystemPrompt.trim()
      ? customSystemPrompt.trim()
      : systemPrompt

    const finalUserPrompt = customUserPrompt && customUserPrompt.trim()
      ? customUserPrompt.trim()
      : userPrompt

    for (const model of modelsToTry) {`;

if (content.includes(targetCall)) {
  content = content.replace(targetCall, promptOverride);
} else {
  console.log('TARGET CALL NOT FOUND');
}

// 3. fetch body에서 finalSystemPrompt와 finalUserPrompt 사용
const targetFetchBody = `text: \`\${systemPrompt}\\n\\n\${userPrompt}\``;
const replacementFetchBody = `text: \`\${finalSystemPrompt}\\n\\n\${finalUserPrompt}\``;

if (content.includes(targetFetchBody)) {
  content = content.replace(targetFetchBody, replacementFetchBody);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: app/api/grade/route.ts updated.');
} else {
  console.log('TARGET FETCH BODY NOT FOUND');
}
