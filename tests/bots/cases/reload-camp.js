const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,cont,reload,core}=require('../lib.js');
(async()=>{
  let p=await boot({seed:43});await newRun(p,'knight');await p.evaluate(()=>{S.gold=20;});
  await tap(p,/야영하기/);await p.waitForTimeout(700);
  // 떠나보내기 1번
  await tap(p,/떠나보내기/);await p.waitForTimeout(400);await clickSel(p,'.cpGo');await p.waitForTimeout(600);await tap(p,/^알론소/);await p.waitForTimeout(500);await clickSel(p,'#panel .packRow .card');await p.waitForTimeout(350);await clickSel(p,'#panel .campOk');await p.waitForTimeout(800);
  let a=await core(p),s=await st(p);console.log('정비 1개 뒤',s.scr,'남은',a.campLeft,'덱',a.deck);
  await reload(p);await cont(p);let b=await core(p);s=await st(p);console.log('새로고침 → 계속하기',s.scr,'남은',b.campLeft,'덱',b.deck);
  await tap(p,/야영하기/);await p.waitForTimeout(700);let c=await core(p);s=await st(p);
  rec('T4-e 야영 정비 1개 뒤 새로고침 → 남은 정비 수 · 덱 그대로',c.campLeft===a.campLeft&&c.deck===a.deck,`남은 정비 ${a.campLeft}→${c.campLeft} 덱 ${a.deck}→${c.deck} ${s.scr}`);
  // 모닥불 머지: 굴리는 중 새로고침
  await tap(p,/모닥불 머지/);await p.waitForTimeout(400);await clickSel(p,'.cpGo');await p.waitForTimeout(600);await tap(p,/^둘시네/);await p.waitForTimeout(500);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#panel .packRow .card')].slice(0,2).map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}));
  for(const [x,y] of cards){await p.mouse.click(x,y);await p.waitForTimeout(300);}
  a=await core(p);await clickSel(p,'#panel .campOk');await p.waitForTimeout(600);let m=await core(p);s=await st(p);console.log('머지 굴리는 중',s.scr,'골드',a.gold,'→',m.gold,'머지',m.merges,'남은',m.campLeft,'덱',m.deck);
  await reload(p);await cont(p);b=await core(p);s=await st(p);await tap(p,/야영하기/);await p.waitForTimeout(700);c=await core(p);s=await st(p);
  const resumed=/rest\.sub/.test(s.scr)&&await p.evaluate(()=>!!document.getElementById('campRC'));
  const okb=await until(p,()=>{const b=document.getElementById('campRO');return !!b&&!b.disabled;},15000);await clickSel(p,'#campRO');await p.waitForTimeout(800);const d=await core(p);s=await st(p);
  rec('T4-f 모닥불 머지 굴리는 중 새로고침 → 야영을 열면 굴리던 화면부터 · 확인하면 정비 수가 줄어듦',resumed&&okb&&d.campLeft===m.campLeft-1&&d.merges===m.merges&&d.gold===m.gold,`이어짐 ${resumed} 확인 버튼 ${okb} 남은 정비 ${m.campLeft}→${d.campLeft} 머지 ${m.merges}→${d.merges} 골드 ${m.gold}→${d.gold} ${s.scr}`);
  await shot(p,'t4f.png');
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
