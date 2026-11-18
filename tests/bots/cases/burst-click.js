/* T5 연타: 같은 자리를 빠르게 여러 번 눌러도 한 번만 처리되는지 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound}=require('../lib.js');
(async()=>{
 for(const diff of ['app','knight']){
  const p=await boot({seed:31});await newRun(p,diff);const L=diff==='app'?'견습':'기사';
  // a 선택 연타
  await clickSel(p,'.rbGo',5);await until(p,()=>S.hand.length>0&&!S.busy,20000);await p.waitForTimeout(1500);let s=await st(p);
  rec(`T5-a ${L} 라운드 '선택' 5연타`,s.s.hand===8&&s.s.draw===s.s.deck-8&&!s.viol.length&&!p.errs.length,JSON.stringify([s.s.hand,s.s.draw,s.s.deck,s.viol,p.errs]));
  // c 버리기 연타
  let u=await p.evaluate(()=>S.hand.slice(0,2).map(c=>c.uid));for(const x of u)await clickSel(p,'#hand .card[data-uid="'+x+'"]');
  let b=await st(p);await clickSel(p,'#bDis',5);await p.waitForTimeout(1500);s=await st(p);
  rec(`T5-c ${L} 버리기 5연타 → 한 번만`,s.s.dis===b.s.dis-1&&s.s.hand===8&&!s.viol.length,`버리기 ${b.s.dis}→${s.s.dis} 손패 ${s.s.hand} ${s.viol}`);
  // b 런 연타 (서로 다른 카드 1장 — 머지 없이)
  u=await p.evaluate(()=>[S.hand[0].uid]);await clickSel(p,'#hand .card[data-uid="'+u[0]+'"]');b=await st(p);
  await clickSel(p,'#bPlay',6);await until(p,()=>!S.busy&&!S.anim,30000);await p.waitForTimeout(800);s=await st(p);
  rec(`T5-b ${L} 런 6연타 → 한 번만`,s.s.runs===b.s.runs-1&&!s.viol.length&&!p.errs.length,`런 ${b.s.runs}→${s.s.runs} 손패 ${s.s.hand} ${s.viol} ${p.errs}`);
  // 연출 중 연타: 런 직후 카드 · 버리기 · 정렬 · 해제를 마구 누름
  u=await p.evaluate(()=>[S.hand.find(c=>!c.seal).uid]);await clickSel(p,'#hand .card[data-uid="'+u[0]+'"]');b=await st(p);await clickSel(p,'#bPlay');
  for(let i=0;i<12;i++){await clickSel(p,'#hand .card');await clickSel(p,'#bDis');await clickSel(p,'#bSort');await clickSel(p,'#bClear');await clickSel(p,'#bPlay');}
  await until(p,()=>!S.busy&&!S.anim,30000);await p.waitForTimeout(800);s=await st(p);
  rec(`T5-b2 ${L} 런 연출 중 마구 누르기`,!s.viol.length&&!p.errs.length&&s.s.runs>=0,`런 ${b.s.runs}→${s.s.runs} 버리기 ${b.s.dis}→${s.s.dis} ${s.viol} ${p.errs.slice(0,2)}`);
  // d 보상 받기 연타
  await p.evaluate(()=>{S.runs=Math.max(S.runs,1);});const won=await killRound(p);b=await st(p);const cash=await p.evaluate(()=>S.cash);
  await clickSel(p,'#cashBtn',6,90);await until(p,()=>S.inShop,15000);await p.waitForTimeout(600);s=await st(p);
  rec(`T5-d ${L} 보상 받기 6연타 → 골드 한 번만`,won&&s.s.gold===b.s.gold+cash,`골드 ${b.s.gold}+${cash}→${s.s.gold} ${s.scr}`);
  // f 물건 사기 연타
  await p.evaluate(()=>{S.gold=60;render();openShop();});await p.waitForTimeout(300);b=await st(p);
  await clickSel(p,'.tile[data-key="top0"]');await p.waitForTimeout(250);const act=await clickSel(p,'.sDesc~.ordRow .act:not([tabindex]), .shop .act:not([tabindex="-1"]), .buyBtn, .sAct',5);
  await p.waitForTimeout(700);s=await st(p);const cost=await p.evaluate(()=>S.top[0].cost);
  rec(`T5-f ${L} 구슬 사기 5연타 → 한 개만`,s.s.orbs<=b.s.orbs+1&&s.s.gold>=b.s.gold-cost-0&&!s.viol.length,`구슬 ${b.s.orbs}→${s.s.orbs} 골드 ${b.s.gold}→${s.s.gold} (값 ${cost}) 버튼 ${JSON.stringify(act)}`);
  // 팩: 열고(구매 확인 포함) 카드 5연타 — 첫 카드 자리에는 캠프의 '다음 라운드'가 있어서 캠프에 남는지도 봄
  b=await st(p);await clickSel(p,'.tile[data-key="pack"]');await p.waitForTimeout(300);for(let k=0;k<4&&!(await p.evaluate(()=>!!S.packView));k++){await clickSel(p,'.shop .act:not([tabindex="-1"])');await p.waitForTimeout(350);}
  if(await p.evaluate(()=>!!S.packView)){await p.waitForTimeout(350);await clickSel(p,'#panel .packRow>.card',5);await p.waitForTimeout(700);s=await st(p);rec(`T5-h ${L} 팩 카드 5연타 → 한 장만 · 캠프에 남음`,s.s.deck===b.s.deck+1&&s.s.inShop&&!s.viol.length,`덱 ${b.s.deck}→${s.s.deck} ${s.scr}`);}else rec(`T5-h ${L} 팩 열기`,false,'팩이 안 열림');
  // e 다음 라운드 연타
  b=await st(p);await clickSel(p,'.sBtns .next',5);await p.waitForTimeout(1200);s=await st(p);
  rec(`T5-e ${L} 다음 라운드 5연타 → 한 라운드만`,s.s.rd===b.s.rd+1&&(s.s.selecting||s.s.hand>0)&&!s.viol.length&&!p.errs.length,`라운드 ${b.s.rd}→${s.s.rd} ${s.scr} hand ${s.s.hand} ${p.errs.slice(0,2)}`);
  await shot(p,'t5_'+diff+'.png');await p.ctx.close();
 }
 await done();
})().catch(e=>{console.error(e);process.exit(1);});
