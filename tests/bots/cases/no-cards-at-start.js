/* T2b: 라운드를 시작했는데 낼 수 있는 카드가 0장인 경우 (출전 금지 규칙 + 얇은 덱) — 진짜 클릭 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel}=require('../lib.js');
(async()=>{
  const cases=[
    ['기억의 기둥 — 이번 장에서 낸 카드뿐인 덱',()=>{S.rd=2;ensureFoes();S.foes[2].rule=actRule('pillar');S.deck=S.deck.slice(0,6);S.playedJang=S.deck.map(c=>c.uid);}],
    ['세계 봉쇄 — 그 세계 카드뿐인 덱',()=>{S.rd=2;ensureFoes();const f=S.foes[2];f.rule=banRule('wban',1);fitBan(f);S.deck=S.deck.filter(c=>cardW(c)===f.rule.ban.w).slice(0,10);}],
    ['별 시들기 — ★3뿐인 덱',()=>{S.rd=2;ensureFoes();S.foes[2].rule=actRule('plant');S.deck=S.deck.slice(0,4);S.deck.forEach(c=>c.star=3);}],
    ['부상 — 다친 동료뿐인 덱',()=>{S.rd=2;ensureFoes();const f=S.foes[2];f.rule=banRule('inj',3);S.deck=S.deck.filter(c=>f.rule.ban.n.includes(TYPES[c.id].n));}],
    ['카드 1장만 남은 기둥 (낸 적 없는 1장)',()=>{S.rd=2;ensureFoes();S.foes[2].rule=actRule('pillar');S.deck=S.deck.slice(0,5);S.playedJang=S.deck.slice(1).map(c=>c.uid);}],
  ];
  for(const diff of (process.env.ONE?['app']:['app','knight'])){for(const [name,setup] of (process.env.ONE?cases.slice(0,1):cases)){
    const p=await boot({seed:81});await newRun(p,diff);await p.evaluate(setup);await p.evaluate(()=>startRound());await p.waitForTimeout(500);
    const info=await p.evaluate(()=>{const e=document.querySelector('.rb3.cur .rbOk');return e?e.textContent:'';});
    await clickSel(p,'.rbGo');await p.waitForTimeout(2500);let s=await st(p);
    const ended=await until(p,()=>!!document.querySelector('#panel .goB'),s.s.hand===0?25000:1000);
    s=await st(p);const cl=(await btns(p)).length;
    if(s.s.hand===0||ended)rec(`T2b ${diff} ${name}`,ended,`라운드 고르기 표시 "${info}" → 시작 뒤 손패 ${s.s.hand} 더미 ${s.s.draw} / ${ended?'패배 화면':'아무 일도 없음 — 막힘 ('+s.scr+', 누를 것 '+cl+'개)'}`);
    else{ // 카드가 있으면 끝까지 내 봄
      for(let i=0;i<12;i++){const q=await st(p);if(/goB/.test(q.scr)||q.s.hand===0)break;const u=await p.evaluate(()=>S.hand.filter(c=>!c.seal).slice(0,5).map(c=>c.uid));await p.evaluate(()=>{S.sel=[];render();});for(const x of u)await clickSel(p,'#hand .card[data-uid="'+x+'"]');await clickSel(p,'#bPlay');await until(p,()=>!S.busy&&!S.anim,20000);await p.waitForTimeout(700);}
      const e2=await until(p,()=>!!document.querySelector('#panel .goB')||!!document.querySelector('#cashBtn'),30000);s=await st(p);
      rec(`T2b ${diff} ${name}`,e2,`표시 "${info}" → 카드를 다 낸 뒤 ${e2?'끝남 ('+s.scr+')':'막힘 '+s.scr+' 손패 '+s.s.hand+' 런 '+s.s.runs}`);}
    if(p.errs.length)console.log('   오류',p.errs.slice(0,2));
    await shot(p,`t2b_${diff}_${cases.findIndex(c=>c[0]===name)}.png`);await p.ctx.close();}}
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
