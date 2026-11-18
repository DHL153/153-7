const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound}=require('../lib.js');
(async()=>{
  const p=await boot({seed:33});await newRun(p,'knight');await clickSel(p,'.rbGo');const won=await killRound(p);console.log('이김',won);
  let b=await st(p);const cash=await p.evaluate(()=>S.cash);await clickSel(p,'#cashBtn',6);await until(p,()=>S.inShop,15000);await p.waitForTimeout(600);let s=await st(p);
  rec('T5-d 기사 보상 받기 6연타 → 골드 한 번만',won&&s.s.gold===b.s.gold+cash,`골드 ${b.s.gold}+${cash}→${s.s.gold} ${s.scr}`);
  await p.evaluate(()=>{S.gold=60;render();openShop();});await p.waitForTimeout(300);b=await st(p);
  await clickSel(p,'.tile[data-key="pack"]');await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>__MK.cands().map(c=>c.d+'|'+c.t).filter(x=>/act|tile|sDesc|열기|구매/.test(x))));
  const a=await clickSel(p,'.shop .act:not([tabindex="-1"])',5);await p.waitForTimeout(500);const pv=await p.evaluate(()=>!!S.packView);s=await st(p);
  rec('T5-g 기사 팩 열기 5연타 → 한 번만 계산',pv&&s.s.gold===b.s.gold-(await p.evaluate(()=>S.pack.cost)),`팩 열림 ${pv} 골드 ${b.s.gold}→${s.s.gold} ${s.scr} ${JSON.stringify(a)}`);
  b=await st(p);await clickSel(p,'#panel .packRow>.card',5);await p.waitForTimeout(700);s=await st(p);rec('T5-h 기사 팩 카드 5연타 → 한 장만',s.s.deck===b.s.deck+1&&!s.viol.length,`덱 ${b.s.deck}→${s.s.deck} ${s.scr}`);
  // 구슬 칸이 가득일 때 구슬 사기
  await p.evaluate(()=>{const ks=Object.keys(ORBS).filter(k=>!S.top.some(t=>t.k===k)).slice(0,S.maxOrb);S.orbs=ks;S.gold=80;S.top.forEach(t=>t.sold=false);render();openShop();});await p.waitForTimeout(300);b=await st(p);
  const ti=await p.evaluate(()=>S.top.findIndex(t=>t.kind==='orb'&&!S.orbs.includes(t.k)));
  await clickSel(p,`.tile[data-key="top${ti}"]`);await p.waitForTimeout(300);const desc=await p.evaluate(()=>(document.querySelector('.sDesc')||{}).innerText);
  const a2=await clickSel(p,'.shop .act:not([tabindex="-1"])',3);await p.waitForTimeout(500);s=await st(p);
  rec('T5-i 구슬 칸이 가득일 때 구슬 사기 → 안 사지고 이유가 보임',s.s.orbs===b.s.orbs&&s.s.gold===b.s.gold,`구슬 ${b.s.orbs}→${s.s.orbs}/${s.s.maxOrb} 골드 ${b.s.gold}→${s.s.gold} 설명: ${(desc||'').replace(/\s+/g,' ').slice(0,70)} 버튼: ${JSON.stringify(a2)}`);await shot(p,'t5i.png');
  // 돈이 0일 때 물건 · 리롤 · 팩
  await p.evaluate(()=>{S.orbs=[];S.gold=0;S.top.forEach(t=>t.sold=false);S.pack.sold=false;render();openShop();});await p.waitForTimeout(300);b=await st(p);
  for(const k of ['top0','pack','v']){const t=await clickSel(p,`.tile[data-key="${k}"]`);if(!t)continue;await p.waitForTimeout(250);const d=await p.evaluate(()=>(document.querySelector('.sDesc')||{}).innerText);const ab=await p.evaluate(()=>{const b=document.querySelector('.shop .act:not([tabindex="-1"])');return b?{t:b.innerText.replace(/\s+/g,' '),dis:b.disabled}:null;});
    await clickSel(p,'.shop .act:not([tabindex="-1"])',2);await p.waitForTimeout(300);console.log('  돈 0 ·',k,'→ 버튼',JSON.stringify(ab),'| 설명:',(d||'').replace(/\s+/g,' ').slice(0,60));}
  const rr=await p.evaluate(()=>{const b=document.querySelector('.sBtns .rr:not(.flagB)');return {dis:b.disabled,t:b.innerText.replace(/\s+/g,' ')};});await clickSel(p,'.sBtns .rr:not(.flagB)',3);await p.waitForTimeout(300);s=await st(p);
  rec('T5-j 돈 0에서 사기 · 팩 · 증서 · 리롤 → 아무것도 안 사짐',s.s.gold===0&&s.s.orbs===0&&!s.viol.length&&!p.errs.length,`골드 ${s.s.gold} 구슬 ${s.s.orbs} 리롤 버튼 ${JSON.stringify(rr)} ${p.errs.slice(0,2)}`);await shot(p,'t5j.png');
  b=await st(p);await clickSel(p,'.sBtns .next',5);await p.waitForTimeout(1200);s=await st(p);
  rec('T5-e 기사 다음 라운드 5연타 → 한 라운드만',s.s.rd===b.s.rd+1&&!s.viol.length&&!p.errs.length,`라운드 ${b.s.rd}→${s.s.rd} ${s.scr} hand ${s.s.hand}`);
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
