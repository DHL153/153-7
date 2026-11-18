/* 무한 원정 이어하기 (DHL 11-18): 무한 원정 중 메인 메뉴 · 새로고침 뒤에도 '계속하기'로 이어지고, 지면 지워지는지 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,killRound,cont,reload,core}=require('../lib.js');
const label=p=>p.evaluate(()=>document.querySelector('.lt-play').textContent.replace(/\s+/g,' ').trim());
const collect=async p=>{for(let k=0;k<10&&!(await p.evaluate(()=>S.inShop));k++){await clickSel(p,'#cashBtn');await p.waitForTimeout(450);}await p.waitForTimeout(500);};
(async()=>{
  for(const diff of ['app','errant']){
    const L=diff==='app'?'견습':'편력';
    let p=await boot({seed:121});await newRun(p,diff);
    const st0=await p.evaluate(()=>({runs:LM_ST.runs,wins:LM_ST.wins}));
    // 8장 거인전부터: 이겨서 결과 화면 → 원정 계속하기
    await p.evaluate(()=>{S.jang=8;S.rd=2;S.foes=null;S.foesNext=null;ensureFoes();S.gold=20;startRound();});await p.waitForTimeout(600);
    for(let i=0;i<60;i++){const q=await p.evaluate(()=>({story:!!document.getElementById('mr-story'),go:!!document.querySelector('#panel .goB:not(.goWait)'),rs:!!document.querySelector('#panel .rsB')&&!document.getElementById('ov').hidden,battle:document.getElementById('ov').hidden&&S.hand.length>0&&!S.busy&&!S.anim&&S.score<S.tgt,mg:!!document.querySelector('#panel .mgGo')}));
      if(q.go)break;if(q.story){await p.keyboard.press('ArrowRight');await p.waitForTimeout(450);continue;}if(q.mg){await clickSel(p,'#panel .mgGo');await p.waitForTimeout(500);continue;}
      if(q.rs){await clickSel(p,'.rbGo');await p.waitForTimeout(700);continue;}if(q.battle){await killRound(p,3000);continue;}await p.waitForTimeout(500);}
    const hasBtn=await p.evaluate(()=>!!document.querySelector('.goEndless'));rec(`${L} 8장 클리어 결과 화면에 '원정 계속하기'`,hasBtn);
    await p.waitForTimeout(500);await clickSel(p,'.goEndless');await p.waitForTimeout(900);await collect(p);
    let a=await core(p),s=await st(p);rec(`${L} 무한 원정 시작 → 원정 캠프`,s.s.endless&&s.s.inShop,s.scr);
    // 캠프에서 메인 메뉴로 → 계속하기
    await p.evaluate(()=>gameOpt());await p.waitForTimeout(300);await tap(p,/메인 메뉴로/);await p.waitForTimeout(600);let lb=await label(p);
    await cont(p);let b=await core(p);s=await st(p);
    rec(`${L} 무한 원정 중 메인 메뉴로 → 타이틀에 '계속하기' → 캠프 그대로`,/계속하기/.test(lb)&&/∞/.test(lb)&&s.s.inShop&&s.s.endless&&b.gold===a.gold&&b.top===a.top,`버튼: ${lb} → ${s.scr} 골드 ${a.gold}→${b.gold}`);
    // 캠프에서 새로고침 → 계속하기
    await reload(p);lb=await label(p);await cont(p);b=await core(p);s=await st(p);
    rec(`${L} 무한 원정 캠프에서 게임을 껐다 켬 → 계속하기 → 캠프 그대로`,/계속하기/.test(lb)&&s.s.inShop&&s.s.endless&&b.gold===a.gold&&b.top===a.top&&b.orbs===a.orbs&&b.deck===a.deck&&!p.errs.length,`버튼: ${lb} → ${s.scr} 골드 ${a.gold}→${b.gold} 덱 ${a.deck}→${b.deck} ${p.errs.slice(0,2)}`);
    // 다음 라운드(9장) 고르기에서 새로고침
    await p.waitForTimeout(400);await clickSel(p,'.sBtns .next');await p.waitForTimeout(900);a=await core(p);await reload(p);await cont(p);b=await core(p);s=await st(p);
    rec(`${L} 무한 원정 9장 라운드 고르기에서 껐다 켬 → 그대로`,/rsB/.test(s.scr)&&s.s.endless&&b.jang===9&&b.rd===0&&b.gold===a.gold,`${s.scr} ${b.jang}장-${b.rd} 골드 ${a.gold}→${b.gold}`);
    // 전투 한 판 이겨 보고(다시 켠 판에서도 정상 진행) → 기록이 두 번 세어지지 않음
    await p.waitForTimeout(400);await clickSel(p,'.rbGo');const won=await killRound(p);await collect(p);s=await st(p);const st1=await p.evaluate(()=>({runs:LM_ST.runs,wins:LM_ST.wins,e:(LM_ST.endless||{})[S.diff]}));
    rec(`${L} 다시 켠 무한 원정에서 9장 망령전 승리 → 캠프`,won&&s.s.inShop&&s.s.rd===0&&s.s.jang===9&&!p.errs.length,`${s.scr} ${p.errs.slice(0,2)}`);
    rec(`${L} 판 수 · 승리 수는 8장 클리어 때 한 번만`,st1.runs===st0.runs+1&&st1.wins===st0.wins+1,`판 ${st0.runs}→${st1.runs} 승리 ${st0.wins}→${st1.wins} 무한 최고 ${st1.e}장`);
    // 지면: 게임 오버 → 저장 지워짐 · 계속하기 없음
    await clickSel(p,'.sBtns .next');await p.waitForTimeout(900);await clickSel(p,'.rbGo');await until(p,()=>S.hand.length>0&&!S.busy&&!S.anim,25000);await p.waitForTimeout(800);
    await p.evaluate(()=>{S.runs=1;S.tgt=1e12;});const u=await p.evaluate(()=>S.hand.find(c=>!c.seal).uid);for(let k=0;k<8&&!(await p.evaluate(()=>S.sel.length));k++){await clickSel(p,'#hand .card[data-uid="'+u+'"]');await p.waitForTimeout(300);}await clickSel(p,'#bPlay');
    for(let k=0;k<6;k++){if(await clickSel(p,'#panel .mgGo'))await p.waitForTimeout(500);else break;}
    const over=await until(p,()=>!!document.querySelector('#panel .goB'),60000);await p.waitForTimeout(2000);const saved=await p.evaluate(()=>!!localStorage.getItem('lm_run_v1'));
    await reload(p);lb=await label(p);
    rec(`${L} 무한 원정에서 지면 → 게임 오버 · 저장 지워짐 · 다시 켜면 계속하기 없음`,over&&!saved&&!/계속/.test(lb),`게임 오버 ${over} 저장 남음 ${saved} 버튼: ${lb}`);
    await p.ctx.close();
  }
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
