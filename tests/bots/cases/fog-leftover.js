/* 뒤집힌 집(첫 손패 모두 뒷면) 거인을 이긴 뒤 — 캠프의 덱 보기 · 다음 장 야영에서 뒷면 카드가 남는지 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound}=require('../lib.js');
(async()=>{
  const p=await boot({seed:47});await newRun(p,'app');
  await p.evaluate(()=>{S.rd=2;ensureFoes();S.foes[2].rule=actRule('house');startRound();});await p.waitForTimeout(500);await clickSel(p,'.rbGo');
  await until(p,()=>S.hand.length>0&&!S.busy,20000);const fog0=await p.evaluate(()=>S.hand.filter(c=>c.fog).length);
  // 뒷면 1장만 내서 이김 → 나머지 뒷면 7장은 손에 남음
  await p.evaluate(()=>{S.score=S.tgt-1;});await clickSel(p,'#hand .card');await p.waitForTimeout(300);await clickSel(p,'#bPlay');
  const w=await until(p,()=>!!document.querySelector('#cashBtn:not([disabled])'),90000);await p.waitForTimeout(500);
  for(let k=0;k<8&&!(await p.evaluate(()=>S.inShop));k++){await clickSel(p,'#cashBtn');await p.waitForTimeout(450);}await p.waitForTimeout(500);
  const fog1=await p.evaluate(()=>S.deck.filter(c=>c.fog).length);
  await clickSel(p,'.dChip');await p.waitForTimeout(700);const dv=await p.evaluate(()=>({open:!!document.querySelector('.dkV'),fogFaces:document.querySelectorAll('.dkV [data-fog]').length,cards:document.querySelectorAll('.dkV .card').length}));await shot(p,'t7_deck.png');
  rec('뒤집힌 집 승리 뒤 캠프 › 덱 보기에 뒷면(?) 카드가 없음',w&&dv.open&&dv.fogFaces===0,`첫 손패 뒷면 ${fog0}장 · 이긴 뒤 덱에 뒷면 표시 ${fog1}장 · 덱 보기 ${dv.cards}장 중 ?로 보이는 카드 ${dv.fogFaces}장`);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);await clickSel(p,'.sBtns .next');await p.waitForTimeout(900);
  // 다음 장 야영 → 떠나보내기 목록
  await tap(p,/야영하기/);await p.waitForTimeout(700);await tap(p,/떠나보내기/);await p.waitForTimeout(400);await clickSel(p,'.cpGo');await p.waitForTimeout(600);
  const nm=await p.evaluate(()=>{const c=S.deck.find(c=>c.fog);return c?TYPES[c.id].ko:null;});
  if(nm){await tap(p,new RegExp('^'+nm));await p.waitForTimeout(600);const q=await p.evaluate(()=>({fog:document.querySelectorAll('#panel .packRow [data-fog]').length,n:document.querySelectorAll('#panel .packRow .card').length}));await shot(p,'t7_camp.png');
    rec('다음 장 야영 › 떠나보내기 목록에 뒷면(?) 카드가 없음',q.fog===0,`${nm} ${q.n}장 중 ?로 보이는 카드 ${q.fog}장`);}
  else rec('다음 장 야영에 뒷면 표시가 남지 않음',true,'남은 뒷면 표시 없음');
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
