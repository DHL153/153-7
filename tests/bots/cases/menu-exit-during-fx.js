/* 이기는/지는 연출 중에 메인 메뉴로 나가기 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,cont}=require('../lib.js');
(async()=>{
  for(const mode of ['win','lose','winShop']){
    const p=await boot({seed:61,speed:1});await newRun(p,'app');await clickSel(p,'.rbGo');await until(p,()=>S.hand.length>0&&!S.busy,25000);
    await p.waitForTimeout(1500);
    if(mode==='lose')await p.evaluate(()=>{S.runs=1;});else await p.evaluate(()=>{S.score=S.tgt-1;});
    const u=await p.evaluate(()=>S.hand[0].uid);await p.evaluate(()=>{S.sel=[];render();});await clickSel(p,'#hand .card[data-uid="'+u+'"]');await p.waitForTimeout(150);await clickSel(p,'#bPlay');
    if(mode==='winShop'){const w=await until(p,()=>!!document.querySelector('#cashBtn:not([disabled])'),90000);console.log(' 보상 창',w);await p.waitForTimeout(450);await clickSel(p,'#cashBtn',2,150);await p.waitForTimeout(200);}   // 금화가 날아가는 중
    else await p.waitForTimeout(3500);   // 연출 한가운데
    let s=await st(p);console.log(mode,'나가기 직전',s.scr,'busy',s.s.busy,'anim',s.s.anim);
    await p.keyboard.press('Escape');await p.waitForTimeout(500);const ex=await tap(p,/메인 메뉴로/);await p.waitForTimeout(600);s=await st(p);console.log(' 나간 직후',s.scr,!!ex);
    await p.waitForTimeout(mode==='winShop'?4000:30000);s=await st(p);await shot(p,`t1h_${mode}_away.png`);
    const lbl=await p.evaluate(()=>document.querySelector('.lt-play')?document.querySelector('.lt-play').textContent.replace(/\s+/g,' ').trim():'');
    rec(`T1-h ${mode} 연출 중 메인 메뉴로 → 기다리는 동안 타이틀 위에 판의 창이 안 뜸`,s.scr==='title:main',s.scr+' / 플레이 버튼: '+lbl+' '+p.errs.slice(0,2).join('|'));
    p.errs.length=0;
    if(/계속/.test(lbl)){const g=await cont(p);await p.waitForTimeout(2500);s=await st(p);await shot(p,`t1h_${mode}_back.png`);
      const okk=mode==='lose'?/goB/.test(s.scr):mode==='win'?(/cash/.test(s.scr)||await until(p,()=>!!document.querySelector('#cashBtn:not([disabled])'),40000)):(s.s.inShop&&/shop/.test(s.scr));
      rec(`T1-h ${mode} 계속하기 → 이어짐`,!!okk&&!p.errs.length,s.scr+' lock='+s.lock+' '+p.errs.slice(0,2).join('|'));
      if(mode!=='lose'){ // 끝까지 진행되는지
        if(mode==='win'){await until(p,()=>!!document.querySelector('#cashBtn:not([disabled])'),40000);await clickSel(p,'#cashBtn');}
        const sh=await until(p,()=>S.inShop&&!!document.querySelector('#panel .shop'),20000);const g1=await p.evaluate(()=>S.gold);await clickSel(p,'.sBtns .next');await p.waitForTimeout(900);s=await st(p);
        rec(`T1-h ${mode} 그 뒤 캠프 → 다음 라운드까지`,sh&&/rsB/.test(s.scr)&&s.s.rd===1,`${s.scr} rd=${s.s.rd} 골드 ${g1}`);}
    }else rec(`T1-h ${mode} 계속하기 버튼`,mode==='lose',`플레이 버튼: ${lbl} (진 판이면 없어도 됨)`);
    await p.ctx.close();
  }
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
