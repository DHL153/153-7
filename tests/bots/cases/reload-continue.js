/* T4 저장 · 이어하기: 화면마다 새로고침한 뒤 계속하기 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound,cont,reload,core}=require('../lib.js');
const J=JSON.stringify;
(async()=>{
  let p=await boot({seed:41});await newRun(p,'knight');
  // a 라운드 고르기
  let a=await core(p);await reload(p);let g=await cont(p);let b=await core(p),s=await st(p);
  rec('T4-a 라운드 고르기에서 새로고침 → 계속하기',b&&/rsB/.test(s.scr)&&a.gold===b.gold&&a.deck===b.deck&&a.rd===b.rd&&!p.errs.length,`${g} ${s.scr} ${J(a)==J(b)?'같음':J(b)} ${p.errs}`);
  // b 전투 중 (런 1번 뒤)
  await clickSel(p,'.rbGo');await until(p,()=>S.hand.length>0&&!S.busy,20000);await p.evaluate(()=>{S.sel=[S.hand[0].uid];render();});await clickSel(p,'#bPlay');await until(p,()=>!S.busy&&!S.anim,30000);await p.waitForTimeout(6000);
  a=await core(p);await reload(p);g=await cont(p);b=await core(p);s=await st(p);
  rec('T4-b 전투 중 새로고침 → 그 라운드 고르기부터',b&&/rsB/.test(s.scr)&&b.rd===a.rd&&b.deck===a.deck&&b.seal===0&&!p.errs.length,`${g} ${s.scr} 봉인 ${a.seal}→${b&&b.seal} ${p.errs}`);
  // c 보상 창
  await clickSel(p,'.rbGo');const won=await killRound(p);a=await core(p);await reload(p);g=await cont(p);b=await core(p);s=await st(p);
  rec('T4-c 보상 창에서 새로고침 → 그 라운드 고르기부터 (골드 그대로)',won&&b&&/rsB/.test(s.scr)&&b.gold===a.gold&&b.rd===a.rd,`${g} ${s.scr} 골드 ${a.gold}→${b&&b.gold}`);
  // d 원정 캠프: 사고 리롤한 뒤
  await clickSel(p,'.rbGo');await killRound(p);for(let k=0;k<8&&!(await p.evaluate(()=>S.inShop));k++){await clickSel(p,'#cashBtn');await p.waitForTimeout(450);}await p.waitForTimeout(400);await p.evaluate(()=>{S.gold=40;render();openShop();});
  await clickSel(p,'.tile[data-key="top0"]');await p.waitForTimeout(300);for(let k=0;k<3&&(await p.evaluate(()=>!S.top[0].sold));k++){await clickSel(p,'.shop .act:not([tabindex="-1"])');await p.waitForTimeout(350);}
  a=await core(p);await reload(p);g=await cont(p);b=await core(p);s=await st(p);
  rec('T4-d 원정 캠프에서 산 뒤 새로고침 → 캠프 그대로 (진열 · 골드 · 구슬)',b&&b.inShop&&a.gold===b.gold&&a.orbs===b.orbs&&a.top===b.top&&!p.errs.length,`${g} ${s.scr} 골드 ${a.gold}→${b&&b.gold} 진열 ${a.top} → ${b&&b.top}`);await shot(p,'t4d.png');
  // g 팩을 열어 둔 채 새로고침
  await clickSel(p,'.tile[data-key="pack"]');await p.waitForTimeout(300);for(let k=0;k<3&&!(await p.evaluate(()=>!!S.packView));k++){await clickSel(p,'.shop .act:not([tabindex="-1"])');await p.waitForTimeout(350);}a=await core(p);
  await reload(p);g=await cont(p);b=await core(p);s=await st(p);
  rec('T4-g 팩 3장 고르는 중 새로고침 → 팩 고르기 그대로 (돈만 나가고 카드 못 받는 일 없음)',a.pv&&b&&b.pv&&b.gold===a.gold&&/packRow|ov/.test(s.scr),`팩 ${a.pv}→${b&&b.pv} 골드 ${a.gold}→${b&&b.gold} ${s.scr} `+(await btns(p)).slice(0,6).join('/'));await shot(p,'t4g.png');
  await p.ctx.close();
  // h 게임 오버 뒤 새로고침 → 계속하기 없음
  p=await boot({seed:42});await newRun(p,'app');await clickSel(p,'.rbGo');await until(p,()=>S.hand.length>0&&!S.busy,20000);
  await p.evaluate(()=>{S.runs=1;S.sel=[S.hand[0].uid];render();});await clickSel(p,'#bPlay');const over=await until(p,()=>!!document.querySelector('#panel .goB'),60000);
  await reload(p);const lbl=await p.evaluate(()=>document.querySelector('.lt-play').textContent.trim());
  rec('T4-h 게임 오버 뒤 새로고침 → 계속하기 없음',over&&!/계속/.test(lbl),lbl);
  await p.ctx.close();await done();
})().catch(e=>{console.error(e);process.exit(1);});
