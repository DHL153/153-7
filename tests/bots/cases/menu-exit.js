const {boot,tap,st,btns,until,newRun,shot,done,rec}=require('../lib.js');
(async()=>{
  let p=await boot();await newRun(p,'knight');
  await p.keyboard.press('Escape');await p.waitForTimeout(400);await tap(p,/메인 메뉴로/);await p.waitForTimeout(500);
  await newRun(p,'app');let s=await st(p);
  rec('B1 메인 메뉴로 나간 뒤 새로운 런 → 라운드 고르기 보임',await p.evaluate(()=>!document.getElementById('ov').hidden&&!!document.querySelector('#panel .rsB'))&&!p.errs.length,s.scr+' '+p.errs.join('|'));
  await tap(p,/^선택$/);const ok=await until(p,()=>S.hand.length===8&&!S.busy,20000);rec('B1 그 판에서 전투 시작',ok);
  // 연습장 → 런 정보 → 옵션 → 메인 메뉴 → 새 런
  await p.ctx.close();p=await boot();
  await p.evaluate(()=>sandboxStart('app'));await p.waitForTimeout(1500);await tap(p,/런 정보/);await p.waitForTimeout(400);
  await p.evaluate(()=>gameOpt());await p.waitForTimeout(300);await tap(p,/메인 메뉴로/);await p.waitForTimeout(400);
  await newRun(p,'app');s=await st(p);rec('B1 연습장 런 정보 → 메인 메뉴 → 새로운 런',await p.evaluate(()=>!document.getElementById('ov').hidden&&!!document.querySelector('#panel .rsB'))&&!p.errs.length,s.scr+' '+p.errs.join('|'));
  // 보관된 판이 있을 때 컬렉션 도감 열고 닫은 뒤 계속하기
  await p.keyboard.press('Escape');await p.waitForTimeout(300);await tap(p,/메인 메뉴로/);await p.waitForTimeout(400);
  await tap(p,/^컬렉션$/);await p.waitForTimeout(400);console.log('컬렉션',await btns(p));
  const b=await tap(p,/동료|도감/);await p.waitForTimeout(600);s=await st(p);console.log('도감',s.scr,p.errs);await shot(p,'t1b_col.png');
  for(let i=0;i<4;i++){await p.keyboard.press('Escape');await p.waitForTimeout(300);}
  s=await st(p);console.log('닫은 뒤',s.scr);
  await require('../lib.js').cont(p);s=await st(p);
  rec('B1 보관된 판 + 컬렉션 열었다 닫고 계속하기 → 라운드 고르기 그대로',/rsB/.test(s.scr)&&!p.errs.length,s.scr+' '+p.errs.join('|'));await shot(p,'t1b_cont.png');
  // 연출 보기: 안 보이는 버튼이 눌리는지
  await p.ctx.close();p=await boot();
  await p.evaluate(()=>lmFxDemo.mates());await p.waitForTimeout(2500);
  const hits=await p.evaluate(()=>[[27,26],[54,634],[563,706],[985,706],[205,384]].map(([x,y])=>{const e=document.elementFromPoint(x,y);return __MK.desc(e);}));
  rec('F-A 연출 보기 중 안 보이는 버튼이 안 눌림',!hits.some(h=>/#b(Play|Dis|Info)|sOpt|lt-pop/.test(h)),hits.join(' , '));
  const c=await p.evaluate(()=>__MK.cands().map(c=>c.d+':'+c.t));console.log('연출 보기에서 누를 수 있는 것',c);
  await tap(p,/fpHole/);await p.waitForTimeout(300);await tap(p,/½×/);await tap(p,/fpNext|다음 연출/);await p.waitForTimeout(1200);await tap(p,/fpBack|목록으로/);await p.waitForTimeout(900);s=await st(p);
  rec('F-A 연출 보기 조작 · 목록으로 정상',!p.errs.length&&/title/.test(s.scr),s.scr+' '+p.errs.join('|'));
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
