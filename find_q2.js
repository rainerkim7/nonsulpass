const fs = require('fs');
const readline = require('readline');

async function search() {
  const dir = 'C:/Users/Heisenbug/.gemini/antigravity-ide/brain';
  const convs = ['2960af0b-e7d1-47f5-ac27-1f7994c93f04', '28b392fe-c22d-41dd-aac8-f661c8612e58'];

  for (const c of convs) {
    const p = `${dir}/${c}/.system_generated/logs/transcript_full.jsonl`;
    if (!fs.existsSync(p)) continue;
    const fileStream = fs.createReadStream(p);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (line.includes('노갈레스') || line.includes('애쓰모글루') || line.includes('권력과 진보')) {
        const parsed = JSON.parse(line);
        const text = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed);
        const idx = text.indexOf('애쓰모글루') !== -1 ? text.indexOf('애쓰모글루') : text.indexOf('노갈레스');
        console.log(`Found in ${c}:`);
        console.log(text.substring(Math.max(0, idx - 400), idx + 2000));
        console.log('---------------------------------------------');
      }
    }
  }
}
search();
