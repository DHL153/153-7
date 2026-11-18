/* 이기는 · 지는 연출 중에 그 판을 버리고 새 판을 시작하면, 옛 판의 결과 창이 새 판에 뜨는지 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel}=require('../lib.js');
(async()=>{
  for(const mode of ['win','lose']){
    const p=await boot({seed:101,speed:1});await newRun(p,'knight');await clickSel(p,'.rbGo');await until(p,()=>S.hand.length>0&&!S.busy,25000);await p.waitForTimeout(1500);
    if(mode==='lose')await p.evaluate(()=>{S.runs=1;});else await p.evaluate(()=>{S.score=S.tgt-1;});
    const u=await p.evaluate(()=>S.hand[0].uid);await p.evaluate(()=>{S.sel=[];render();});await clickSel(p,'#hand .card[data-uid="'+u+'"]');await p.waitForTimeout(150);await clickSel(p,'#bPlay');
    await p.waitForTimeout(mode==='lose'?2600:3000);
    await p.keyboard.press('Escape');await p.waitForTimeout(350);await tap(p,/메인 메뉴로/);await p.waitForTimeout(350);
    await newRun(p,'app','lamancha');let s=await st(p);const g0=s.s.gold;console.log(mode,'새 판 시작 직후',s.scr,'골드',g0);
    let bad=null;for(let i=0;i<40;i++){await p.waitForTimeout(1000);s=await st(p);if(!/rsB/.test(s.scr)||s.s.ended||s.s.busy){bad=`${i+1}초 뒤 ${s.scr} ended=${s.s.ended} busy=${s.s.busy}`;break;}}
    await shot(p,`t9_${mode}.png`);const df=await p.evaluate(()=>!!document.getElementById('lmDefeat'));
    rec(`T9 ${mode==='win'?'이기는':'지는'} 연출 중에 판을 버리고 새 판 → 새 판에 옛 판의 창이 안 뜸`,!bad&&!df,(bad||'40초 동안 라운드 고르기 그대로')+(df?' · 패배 연출이 새 판에 나옴':'')+' '+p.errs.slice(0,2).join('|'));
    if(!bad){await clickSel(p,'.rbGo');const ok=await until(p,()=>S.hand.length===8&&!S.busy,20000);s=await st(p);rec(`T9 ${mode} 그 새 판이 정상 시작`,ok&&!s.s.ended,s.scr+' 손패 '+s.s.hand);}
    await p.ctx.close();
  }
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
