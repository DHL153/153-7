const {chromium}=require('playwright');
const fr=(sel,v)=>['rust','neon','sky'].map(w=>`html.lmB body ${sel} .dzi[data-w${w==='rust'?'':'='+w}] .dzb{background:url(mk/f_${w}_${v}.png) 0 0/100% 100% no-repeat,url(assets/ui/card/bg_${w}.webp?v=g) 50.4% 36.8%/77% 57.6% no-repeat!important}`).join('\n');
const V={
 now:'',
 A:`#hand .dzpw,#hand .dzpo{display:none!important}\n`+fr('#hand .card.dz','nohex'),
 B:`#hand .card.s1 .dzpw,#hand .card.s1 .dzpo{display:none!important}\n`+fr('#hand .card.dz.s1','nohex'),
 C:`#hand .dzpw,#hand .dzpo{display:none!important}#hand .card.s1 .dzst{display:none!important}\n`+fr('#hand .card.dz','nohexst'),
};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
await p.addInitScript(()=>{localStorage.setItem('mergeRoll.storySeen.v1','1');localStorage.setItem('lm_tut_done','1');localStorage.setItem('lm_tester','1');});
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(4500);
await p.evaluate(()=>{ltDiff='knight';ltNewRun();});await p.waitForTimeout(1200);await p.click('.rbGo');await p.waitForTimeout(2500);
await p.evaluate(()=>{S.hand[0].star=2;S.hand[1].star=3;render();});await p.waitForTimeout(800);
for(const k in V){await p.evaluate(([k,c])=>{let s=document.getElementById('mkcv');if(!s){s=document.createElement('style');s.id='mkcv';document.head.appendChild(s);}s.textContent=c;},[k,V[k]]);await p.waitForTimeout(700);
 await p.locator('#hand').screenshot({path:'cv_'+k+'.png'});}
await b.close();})();
