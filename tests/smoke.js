/* 라만차 자동 점검 (smoke test)
   - 게임을 실제 화면처럼 클릭해 진행하면서 오류(스크립트 오류 · 콘솔 오류 · 없는 파일 404)를 잡아냅니다.
   - 난수를 고정(SEED)해서 비슷한 판이 나오지만, 연출 타이밍에 따라 조금씩 달라질 수 있음
     (규칙 계산이 같은지는 tests/rules-check.js 가 정확히 비교)
   사용:
     node tests/smoke.js                  점검 (오류 0건 + 런 3번 이상이면 통과)
     node tests/smoke.js --save log.json  진행 기록 저장 (문제 찾을 때)
   환경값: SEED(기본 7) · PLAYS(런 몇 번까지, 기본 20) · SECS(최대 시간 초, 기본 240) · SHOT=폴더 (마지막 화면 저장) · HEADED=1
   필요: npm install (playwright는 devDependencies) — 이 저장소 클라우드 환경엔 이미 있음 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SEED = +(process.env.SEED || 7), PLAYS = +(process.env.PLAYS || 20), SECS = +(process.env.SECS || 240);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve() {   // 저장소 폴더를 그대로 보여 주는 작은 웹 서버
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const f = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { rsp.writeHead(404); return rsp.end(); }
        rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); rsp.end(d);
      });
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('스크립트 오류: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '') && !/Failed to load resource/.test(m.text())) errors.push('콘솔 오류: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`파일 없음 ${r.status()}: ${r.url().replace(/^http:\/\/[^/]+\//, '')}`); });

  // 난수 고정 + 첫 실행 스토리 · 첫 판 안내는 건너뜀 (모든 프레임에 적용)
  await page.addInitScript(seed => {
    let a = seed >>> 0;
    Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    try { localStorage.setItem('mergeRoll.storySeen.v1', '1'); localStorage.setItem('lm_tut_done', '1'); } catch (e) {}
  }, SEED);

  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.locator('.lt-play').click({ timeout: 30000 });
  await page.locator('.pl-go').click({ timeout: 10000 });

  const trace = [];
  const GO = /계속|다음|떠나|닫기|확인|시작|넘어|건너|출발|받기|좋아|돌아|새로운 런/;
  const tEnd = Date.now() + SECS * 1000;
  let plays = 0;
  while (plays < PLAYS && Date.now() < tEnd) {
    const act = await page.evaluate(GO_SRC => {
      const GO = new RegExp(GO_SRC);
      const shown = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.disabled; };
      for (const sel of ['.pl-go', '.lt-play']) {   // 타이틀 · 난이도 화면 (게임 오버 후 새 판)
        const t = [...document.querySelectorAll(sel)].find(shown);
        if (t && document.getElementById('lm-title') && shown(document.getElementById('lm-title'))) { t.click(); return 'title:' + sel; }
      }
      if (typeof S === 'undefined' || !S) return 'wait';
      const go = [...document.querySelectorAll('.rbGo')].find(shown);
      if (shown(go)) { go.click(); return 'round'; }
      const ov = document.getElementById('ov');
      if (ov && !ov.hidden) {   // 결과 · 상점 · 보상 창 → 진행 버튼
        const bs = [...ov.querySelectorAll('button')].filter(shown);
        const b = bs.find(b => b.classList.contains('goB')) || bs.find(b => GO.test(b.textContent));
        if (b) { b.click(); return 'ov:' + b.textContent.trim().slice(0, 12); }
        return 'ov?' + bs.map(b => b.id + '/' + b.className + '/' + b.textContent.trim().slice(0, 8)).join(',');
      }
      if (S.busy) return 'wait';
      if (S.hand && S.hand.length) {   // 손패: 게임 자체 추천(bestHint)대로 고르고 런!
        let bh = null; try { bh = bestHint(); } catch (e) {}
        const want = bh && bh.cards.length ? bh.cards.map(c => c.uid) : [S.hand[0].uid];
        for (const u of want) if (!S.sel.includes(u)) { const el = document.querySelector(`#hand .card[data-uid="${u}"]`); if (el) el.click(); }
        const p = document.getElementById('bPlay'); if (shown(p) && S.sel.length) { p.click(); return 'play'; }
      }
      return 'wait';
    }, GO.source);
    const st = await page.evaluate(() => typeof S !== 'undefined' && S ? { j: S.jang, r: S.rd, sc: S.score, g: S.gold, h: S.hand.length } : null);
    if (act === 'play') plays++;
    if (act !== 'wait' && st) trace.push(`${act} | 장${st.j} 라${st.r} 점${st.sc} 금${st.g} 손${st.h}`);
    await page.waitForTimeout(act === 'wait' ? 400 : 250);
  }
  if (process.env.SHOT) await page.screenshot({ path: path.join(process.env.SHOT, 'smoke_last.png') });
  await browser.close(); srv.close();

  console.log(`진행: 런 ${plays}번 · 행동 ${trace.length}개 · 마지막 = ${trace[trace.length - 1] || '없음'}`);
  let fail = false;
  const uniq = [...new Set(errors)];
  if (uniq.length) { fail = true; console.log(`\n❌ 오류 ${uniq.length}건:\n- ` + uniq.slice(0, 30).join('\n- ')); }
  if (plays < 3) { fail = true; console.log('❌ 런을 3번도 못 함 — 게임 진행이 막혔을 수 있음'); }
  if (arg('--save')) fs.writeFileSync(arg('--save'), JSON.stringify(trace, null, 1));
  console.log(fail ? '\n결과: 실패' : '\n결과: 통과 ✅');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('점검 스크립트 자체 오류:', e); process.exit(2); });
