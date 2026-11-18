const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,cont,killRound}=require('../lib.js');
(async()=>{
  // K1: 전투에서 카드 고른 채 메인 메뉴 → 타이틀에서 Enter
  let p=await boot({seed:91});await newRun(p,'app');await clickSel(p,'.rbGo');await until(p,()=>S.hand.length===8&&!S.busy,20000);await p.waitForTimeout(1200);
  await clickSel(p,'#hand .card');await p.waitForTimeout(200);let b=await st(p);
  await clickSel(p,'#sOpt');await p.waitForTimeout(400);
  await p.keyboard.press('Enter');await p.waitForTimeout(800);let s=await st(p);
  rec('K1 게임 중 옵션 창에서 Enter → 뒤의 전투에서 런이 안 나감',s.s.runs===b.s.runs,`런 ${b.s.runs}→${s.s.runs} ${s.scr}`);
  await p.evaluate(()=>gameOpt());await p.waitForTimeout(300);await tap(p,/메인 메뉴로/);await p.waitForTimeout(500);await p.keyboard.press('Enter');await p.waitForTimeout(900);await p.keyboard.press('m');await p.waitForTimeout(500);s=await st(p);
  rec('K1 타이틀에서 Enter · m → 보관된 판에서 런 · 머지가 안 나감',s.s.runs===b.s.runs&&s.s.hand===8&&!p.errs.length,`런 ${b.s.runs}→${s.s.runs} 손패 ${s.s.hand} ${s.scr} ${p.errs.slice(0,2)}`);
  await p.ctx.close();
  // K1b: 판이 없을 때 타이틀에서 Enter / m
  p=await boot({seed:92});await p.keyboard.press('Enter');await p.waitForTimeout(400);await p.keyboard.press('Escape');await p.keyboard.press('m');await p.waitForTimeout(400);
  rec('K1 판이 없을 때 타이틀에서 Enter · m → 오류 없음',!p.errs.length,p.errs.slice(0,2).join('|'));
  // 전투에서는 Enter가 그대로 런
  await newRun(p,'app');await clickSel(p,'.rbGo');await until(p,()=>S.hand.length===8&&!S.busy,20000);await p.waitForTimeout(1200);await clickSel(p,'#hand .card');await p.waitForTimeout(200);b=await st(p);
  await p.keyboard.press('Enter');await p.waitForTimeout(600);s=await st(p);rec('K1 전투 화면에서는 Enter = 런 그대로',s.s.runs===b.s.runs-1,`런 ${b.s.runs}→${s.s.runs}`);
  await p.ctx.close();
  // C1: 야영에서 안내 창을 닫으면 야영 화면으로
  p=await boot({seed:93});await newRun(p,'knight');await tap(p,/야영하기/);await p.waitForTimeout(700);await tap(p,/떠나보내기/);await p.waitForTimeout(300);
  await clickSel(p,'#bInfo');await p.waitForTimeout(600);s=await st(p);const inInfo=/ov:div\.ib/.test(s.scr);await shot(p,'t8_campinfo.png');
  await clickSel(p,'.ibBack');await p.waitForTimeout(600);s=await st(p);const camp=await p.evaluate(()=>!!document.querySelector('#panel .rest .cpSt')&&S.inRest);
  rec('C1 야영 중 런 정보 → 뒤로 → 야영 화면 그대로',inInfo&&camp,`${s.scr} 야영 카드 보임 ${camp} `+(await btns(p)).slice(3,8).join('/'));
  // 야영 밤 산책: 길 고른 직후(카드 뒤집히는 0.9초) 메인 메뉴 → 계속하기
  await p.evaluate(()=>{S.gold=30;campOpen();});await p.waitForTimeout(400);await tap(p,/밤 산책/);await p.waitForTimeout(300);await clickSel(p,'.cpGo');await p.waitForTimeout(700);s=await st(p);console.log('  산책',s.scr,(await btns(p)).slice(3,8).join('/'));
  await clickSel(p,'#panel .wCard');await p.waitForTimeout(120);await p.evaluate(()=>gameOpt());await p.waitForTimeout(150);await p.evaluate(()=>ltExit());await p.waitForTimeout(2500);s=await st(p);const away=s.scr;
  await cont(p);await p.waitForTimeout(1200);s=await st(p);const cl=(await btns(p)).filter(x=>!/옵션|런 정보|배우기/.test(x));await shot(p,'t8_walk.png');
  rec('밤 산책 길을 고른 직후 메인 메뉴 → 계속하기 → 사건 화면이 떠서 진행 가능',away==='title:main'&&cl.length>0&&!/갈림길/.test(await p.evaluate(()=>document.getElementById('panel').innerText.slice(0,40))),`나가 있을 때 ${away} → ${s.scr} 누를 것: ${cl.slice(0,4).join(' / ')}`);
  for(let k=0;k<4;k++){const c=(await p.evaluate(()=>__MK.cands())).filter(c=>!c.dis&&/campBtn|card|lmK/.test(c.d));if(!c.length)break;await p.mouse.click(c[0].x,c[0].y);await p.waitForTimeout(700);}
  s=await st(p);rec('그 뒤 야영이 이어짐',/rest|rsB/.test(s.scr)&&!p.errs.length,s.scr+' '+p.errs.slice(0,2));
  await p.ctx.close();
  // R2: 진행 중인 판이 있을 때 기록 초기화
  p=await boot({seed:94});await newRun(p,'app');await p.waitForTimeout(1800);
  await p.evaluate(()=>gameOpt());await p.waitForTimeout(300);await tap(p,/^설정$/);await p.waitForTimeout(400);await clickSel(p,'.ltv-slotBtn.reset');await p.waitForTimeout(500);
  const rb=await p.evaluate(()=>{const b=[...document.querySelectorAll('#lm-title button')].find(x=>/lmResetRecord/.test(x.getAttribute('onclick')||''));if(!b)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
  if(rb){await p.mouse.click(rb.x,rb.y);await p.waitForTimeout(400);await p.mouse.click(rb.x,rb.y);await p.waitForTimeout(2500);await require('../lib.js').title(p);await p.waitForTimeout(600);
    const lbl=await p.evaluate(()=>document.querySelector('.lt-play').textContent.replace(/\s+/g,' ').trim());const has=await p.evaluate(()=>!!localStorage.getItem('lm_run_v1'));
    rec('R2 판 도중 기록 초기화 → 진행 중인 판도 지워짐',!/계속/.test(lbl)&&!has,`타이틀 버튼: ${lbl} / 저장된 판 남음 ${has}`);}
  else rec('R2 기록 초기화 버튼 찾기',false,'지우기 버튼을 못 찾음');
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
