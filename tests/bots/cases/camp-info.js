/* 야영 중 안내 창 · 런 정보 · 배우기 · 덱 보기 열기 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel}=require('../lib.js');
(async()=>{
  const p=await boot({seed:71});await newRun(p,'knight');await tap(p,/야영하기/);await p.waitForTimeout(800);let s=await st(p);console.log('야영',s.scr,(await btns(p)).join(' / '));
  for(const [name,sel] of [['런 정보','#bInfo'],['배우기','#bLearn'],['옵션','#sOpt']]){
    const c=await clickSel(p,sel);await p.waitForTimeout(600);s=await st(p);const n=(await btns(p));
    const wrapped=await p.evaluate(()=>!!document.querySelector('#panel .rest .ib'));
    await shot(p,'t6_'+sel.slice(1)+'.png');
    rec(`야영 중 '${name}' 누르기`,c&&c.hit?!wrapped:true,`${c?(c.hit?'눌림':'가려짐 ← '+c.cover):'버튼 없음'} → ${s.scr} 야영 틀 안에 안내 창=${wrapped} 누를 것 ${n.length}개`);
    for(let i=0;i<3;i++){await p.keyboard.press('Escape');await p.waitForTimeout(300);}
    s=await st(p);console.log('  Esc 뒤',s.scr);
    if(!/rest/.test(s.scr)){await p.evaluate(()=>{try{ltPop();}catch(e){}});await p.waitForTimeout(200);s=await st(p);console.log('  정리 뒤',s.scr);}
  }
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
