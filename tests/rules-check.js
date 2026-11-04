/* 라만차 규칙 검사 — 게임 코어(점수 · 목표 · 족보 · 구슬 · 상점 규칙)가 리팩토링 전후로 똑같이 계산하는지 확인
   index.html 의 코어 스크립트를 뽑아 밸런스 봇(docs/balance/bot/sim_body.js)으로 고정 난수 판을 여러 번 돌리고,
   결과 전체를 지문(sha256)으로 비교합니다. 화면은 쓰지 않아 빠르고 결과가 매번 같습니다.
   사용:
     node tests/rules-check.js --save tests/rules-base.json   기준 저장 (리팩토링 전에)
     node tests/rules-check.js --cmp  tests/rules-base.json   비교 (리팩토링 후에) — 다르면 실패
   ※ 규칙을 일부러 바꾼 개발 커밋 뒤에는 기준을 다시 저장하세요. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..'), BOT = path.join(ROOT, 'docs/balance/bot');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

// 1) 코어 스크립트 뽑기 (docs/balance/bot/build.py 와 같은 방식)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const core = blocks.filter(b => b.includes('function score(') && b.includes('function handType'));
if (core.length !== 1) { console.error(`❌ 코어 스크립트를 하나로 찾지 못함 (찾은 수 ${core.length})`); process.exit(2); }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lm-rules-'));
const SEEDJS = path.join(dir, 'seed.js'), SIM = path.join(dir, 'sim.js');
fs.writeFileSync(SEEDJS, `let a=+(process.env.RSEED||1)>>>0;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};`);
fs.writeFileSync(SIM, 'var window=globalThis;\n' + core[0] + '\n' + fs.readFileSync(path.join(BOT, 'sim_body.js'), 'utf8'));

// 2) 고정 난수로 여러 조건 돌리기
const CASES = [
  ['app', 'smart', 15, 0, 1], ['app', 'normal', 15, 0, 2],
  ['knight', 'smart', 15, 0, 3], ['knight', 'normal', 15, 0, 4],
  ['errant', 'smart', 10, 0, 5], ['knight', 'smart', 4, 1, 6],   // 마지막 = 무한 원정
];
const out = {};
for (const [d, b, n, e, seed] of CASES) {
  const key = `${d}/${b}/${n}${e ? '/무한' : ''}`;
  try {
    const r = execFileSync(process.execPath, ['-r', SEEDJS, SIM, d, b, String(n), String(e)],
      { env: { ...process.env, RSEED: String(seed), ARMOR: '1', JMAX: '10' }, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000 });
    out[key] = crypto.createHash('sha256').update(r).digest('hex').slice(0, 16);
    const j = (() => { try { return JSON.parse(r.trim().split('\n').pop()); } catch { return null; } })();
    console.log(`${key.padEnd(18)} ${out[key]}${j ? `  클리어율 ${(j.clear * 100).toFixed(0)}%` : ''}`);
  } catch (err) { console.error(`❌ ${key} 실행 실패: ${(err.stderr || err.message).toString().slice(0, 400)}`); process.exit(2); }
}
fs.rmSync(dir, { recursive: true, force: true });

// 3) 저장 · 비교
if (arg('--save')) { fs.writeFileSync(arg('--save'), JSON.stringify(out, null, 1) + '\n'); console.log('\n기준 저장:', arg('--save')); }
if (arg('--cmp')) {
  const base = JSON.parse(fs.readFileSync(arg('--cmp'), 'utf8'));
  const diff = Object.keys(base).filter(k => base[k] !== out[k]);
  if (diff.length) { console.log(`\n❌ 규칙 계산이 달라짐: ${diff.join(', ')}\n결과: 실패`); process.exit(1); }
  console.log('\n규칙 계산 동일 ✅  결과: 통과');
}
