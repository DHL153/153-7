/* 두 번 누르기(더블클릭) 때 두 번째 클릭이 바뀐 화면의 다른 버튼을 누르는지 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound}=require('../lib.js');
(async()=>{
  const p=await boot({seed:35});await newRun(p,'app');await clickSel(p,'.rbGo');await killRound(p);for(let k=0;k<8&&!(await p.evaluate(()=>S.inShop));k++){await clickSel(p,'#cashBtn');await p.waitForTimeout(450);}await until(p,()=>S.inShop&&!!document.querySelector('#panel .shop'),20000);await p.waitForTimeout(500);console.log('캠프',(await st(p)).scr);
  for(let i=0;i<3;i++){
    await p.evaluate(()=>{S.gold=50;S.pack.sold=false;S.packView=null;S.pick=null;render();openShop();});await p.waitForTimeout(300);
    await clickSel(p,'.tile[data-key="pack"]');await p.waitForTimeout(300);for(let k=0;k<4&&!(await p.evaluate(()=>!!S.packView));k++){await clickSel(p,'.shop .act:not([tabindex="-1"])');await p.waitForTimeout(350);}
    if(!(await p.evaluate(()=>!!document.querySelector('#panel .packRow>.card')))){console.log('팩 안 열림',(await st(p)).scr,(await btns(p)).slice(0,14).join(' / '));break;}
    const pt=await p.evaluate(i=>{const e=document.querySelectorAll('#panel .packRow>.card')[i];const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},i);
    const b=await st(p);await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(90);const under=await p.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);const c=e&&e.closest('button,[onclick],.tile,.sorb');return (c?__MK.desc(c)+' "'+(c.innerText||'').replace(/\s+/g,' ').slice(0,14)+'"':__MK.desc(e));},pt);
    await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(700);const s=await st(p);
    rec(`더블클릭: 팩 ${i+1}번째 카드`,s.s.inShop&&s.s.deck===b.s.deck+1&&s.s.gold===b.s.gold,`두 번째 클릭 자리에 있는 것: ${under} → 캠프에 남음 ${s.s.inShop} 덱 ${b.s.deck}→${s.s.deck} 골드 ${b.s.gold}→${s.s.gold} ${s.scr}`);
    if(!s.s.inShop){await shot(p,'t5q_'+i+'.png');await p.evaluate(()=>{S.rd=0;S.selecting=false;S.inShop=true;render();openShop();});}
  }
  // 보상 받기 더블클릭 → 캠프의 어느 것이 눌리나
  await p.evaluate(()=>{S.inShop=false;hideOv();S.rd=0;beginRound();});await killRound(p);
  const pt=await p.evaluate(()=>{const r=document.getElementById('cashBtn').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});const b=await st(p);
  await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(350);await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(120);await p.mouse.click(pt.x,pt.y);
  await until(p,()=>S.inShop,15000);await p.waitForTimeout(400);
  for(let k=0;k<3;k++){await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(150);}
  await p.waitForTimeout(600);const s=await st(p);const pick=await p.evaluate(()=>S.pick);
  rec('보상 받기를 여러 번 누름 → 캠프에서 아무것도 안 사짐',s.s.inShop&&s.s.orbs===b.s.orbs&&s.s.deck===b.s.deck,`${s.scr} 골드 ${s.s.gold} 구슬 ${s.s.orbs} 고른 물건 ${pick}`);
  // 라운드 '선택' 더블클릭 → 전투의 무엇이 눌리나 / 다음 라운드 더블클릭 → 라운드 고르기의 무엇이 눌리나
  await clickSel(p,'.sBtns .next');await p.waitForTimeout(900);
  const g=await p.evaluate(()=>{const r=document.querySelector('.rbGo').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
  await p.mouse.click(g.x,g.y);await p.waitForTimeout(120);const u2=await p.evaluate(({x,y})=>__MK.desc(document.elementFromPoint(x,y)),g);await p.mouse.click(g.x,g.y);await p.waitForTimeout(1500);const s2=await st(p);
  rec("라운드 '선택' 더블클릭",!s2.viol.length&&!p.errs.length,`두 번째 클릭 자리: ${u2} → ${s2.scr} 손패 ${s2.s.hand}`);
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
