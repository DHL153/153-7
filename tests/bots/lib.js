/* 봇 공통 도구 — 작은 웹 서버 + 브라우저 + 진짜 마우스로 누르기 + 상태 읽기 (tests/README.md 참고) */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=process.env.ROOT||path.join(__dirname,'..','..');   // 저장소 폴더 (다른 폴더를 보려면 ROOT=경로)
/* 화면 사진 · 기록은 저장소 밖 임시 폴더에 (OUT_DIR=경로 로 바꿈) */
const OUT_DIR=process.env.OUT_DIR||path.join(require('os').tmpdir(),'lm-bots');fs.mkdirSync(OUT_DIR,{recursive:true});process.chdir(OUT_DIR);
const MIME={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.css':'text/css','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.wav':'audio/wav'};
let srv,browser;
async function serve(){if(srv)return srv;srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});r.end(d);});});await new Promise(r=>srv.listen(0,'127.0.0.1',r));return srv;}
async function boot(o={}){await serve();if(!browser)browser=await chromium.launch({args:(process.env.GL?['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:['--disable-gpu']).concat(['--autoplay-policy=no-user-gesture-required','--mute-audio'])});
  const ctx=await browser.newContext({viewport:{width:o.w||1366,height:o.h||768}});const p=await ctx.newPage();p.errs=[];
  p.on('pageerror',e=>p.errs.push('오류: '+e.message+' @'+((e.stack||'').split('\n')[1]||'').trim().replace(/http:\/\/[^/]+\//,'')));
  p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon|AudioContext|autoplay/.test(m.text()))p.errs.push('콘솔: '+m.text().slice(0,200));});
  await p.addInitScript(o=>{if(window.top===window){try{if(!localStorage.getItem('__mk')){localStorage.setItem('__mk','1');localStorage.setItem('lm_tester','1');localStorage.setItem('mergeRoll.storySeen.v1','1');
      if(!o.tut){localStorage.setItem('lm_tut_done','1');localStorage.setItem('lm_tut_knight_done','1');}localStorage.setItem('lm_settings',JSON.stringify({speed:o.speed||4,rm:!!o.rm,master:0}));}}catch(e){}}
    let a=(o.seed||5)>>>0;window._reseed=v=>{a=v>>>0;};Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},o);
  if(process.env.FPS!=='0'&&!o.fullfps)await p.addInitScript(ms=>{if(window.__rafSlow)return;window.__rafSlow=1;const st=window.setTimeout.bind(window),ct=window.clearTimeout.bind(window);window.requestAnimationFrame=cb=>st(()=>cb(performance.now()),ms);window.cancelAnimationFrame=id=>ct(id);},Math.round(1000/(+(process.env.FPS||15))));
  await p.addInitScript({path:path.join(__dirname,'inpage.js')});
  p.URL='http://127.0.0.1:'+srv.address().port+'/index.html';
  await p.goto(p.URL);await title(p);
  p.ctx=ctx;return p;}
async function title(p){for(let i=0;i<40;i++){const ok=await p.evaluate(()=>{const e=document.querySelector('.lt-play');return !!(e&&e.offsetParent)&&!document.getElementById('game-startup-screen')&&!document.getElementById('mr-story');}).catch(()=>false);if(ok)return;const s=p.locator('text=건너뛰기 >> visible=true');if(await s.count())await s.first().click({force:true}).catch(()=>{});await p.waitForTimeout(500);}throw new Error('타이틀이 안 뜸');}
/* 보이는 버튼을 글자로 찾아 진짜 마우스로 누름. 못 찾으면 false */
async function tap(p,re,opt={}){const src=re instanceof RegExp?re.source:re;const pt=await p.evaluate(({src,root,nth})=>{const R=new RegExp(src);const c=__MK.cands().filter(c=>R.test(c.t)||R.test(c.d));if(root){}const x=c[nth||0];return x?{x:x.x,y:x.y,t:x.t,d:x.d,dis:x.dis}:null;},{src,nth:opt.nth||0});
  if(!pt)return false;if(opt.n){for(let i=0;i<opt.n;i++)await p.mouse.click(pt.x,pt.y);}else await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(opt.wait==null?350:opt.wait);return pt;}
const st=p=>p.evaluate(()=>({scr:__MK.screen(),s:__MK.state(),lock:__MK.lock(),viol:__MK.viol()}));
const btns=p=>p.evaluate(()=>__MK.cands().map(c=>(c.dis?'(x)':'')+(c.t||c.d)).slice(0,40));
/* 조건이 될 때까지 기다림 */
async function until(p,fn,ms=30000,arg){const t=Date.now();while(Date.now()-t<ms){try{if(await p.evaluate(fn,arg))return true;}catch(e){}await p.waitForTimeout(200);}return false;}
/* 새 판을 진짜 버튼 흐름으로: 플레이 창에서 난이도 · 덱을 정해 '새로운 런' */
async function newRun(p,diff='knight',deck='lamancha'){await p.evaluate(({diff,deck})=>{ltPlayTab='new';ltDiff=diff;ltDeck=deck;ltShow();ltPop('play');},{diff,deck});await p.waitForTimeout(300);const ok=await tap(p,/^플레이$|pl-go/);if(!ok)await p.evaluate(()=>ltNewRun());await p.waitForTimeout(900);}
async function shot(p,name){await p.screenshot({path:name});}
async function done(){try{await browser.close();}catch(e){}try{srv.close();}catch(e){}if(results.some(r=>!r.ok))process.exitCode=1;}
const results=[];function rec(id,ok,note){results.push({id,ok,note});console.log((ok?'✅':'❌')+' '+id+(note?' — '+note:''));}
module.exports={boot,title,tap,st,btns,until,newRun,shot,done,rec,results};
/* 선택자로 찾아 진짜 마우스로 n번 누름 (가려져 있으면 false) */
async function clickSel(p,sel,n=1,gap=0){const pt=await p.evaluate(sel=>{const e=typeof sel==='string'?[...document.querySelectorAll(sel)].find(x=>x.offsetParent!==null&&x.getBoundingClientRect().width>2):null;if(!e)return null;e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const h=document.elementFromPoint(x,y);return {x,y,hit:!!(h&&(h===e||e.contains(h))),cover:h?__MK.desc(h):'',dis:!!e.disabled};},sel);
  if(!pt)return null;for(let i=0;i<n;i++){await p.mouse.click(pt.x,pt.y);if(gap)await p.waitForTimeout(gap);}return pt;}
/* 전투를 바로 이기게: 점수를 목표 바로 아래로 두고 가장 좋은 패를 진짜 클릭으로 냄 */
async function killRound(p,ms=90000){await until(p,()=>S.hand.length>0&&!S.busy&&!S.anim,25000);
  await p.evaluate(()=>{S.score=Math.max(S.score,S.tgt-1);});const u=await p.evaluate(()=>{const h=S.hand.filter(c=>!c.seal&&!c.fog);return h.length?[h[0].uid]:[S.hand[0].uid];});
  for(let k=0;k<12;k++){await p.evaluate(()=>{if(S.sel.length){S.sel=[];render();}});for(const x of u)await clickSel(p,'#hand .card[data-uid="'+x+'"]');await p.waitForTimeout(150);if(await p.evaluate(()=>S.sel.length>0))break;await p.waitForTimeout(400);}   // 카드가 들어오는 연출 중에는 눌러도 안 골라짐 → 다시
  await clickSel(p,'#bPlay');
  const r=await until(p,()=>!!document.querySelector('#cashBtn:not([disabled])')||!!document.querySelector('#panel .goB')||!!document.getElementById('mr-story'),ms);await p.waitForTimeout(400);return r;}
module.exports.clickSel=clickSel;module.exports.killRound=killRound;
/* 타이틀에서 '계속하기'로 판에 돌아가기 (진짜 클릭) */
async function cont(p){await clickSel(p,'.lt-play');await p.waitForTimeout(450);const tab=await p.evaluate(()=>{const b=[...document.querySelectorAll('.ls-tab')].find(x=>/계속하기/.test(x.textContent));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,dis:b.disabled||b.classList.contains('off')};});
  if(tab){await p.mouse.click(tab.x,tab.y);await p.waitForTimeout(300);}const g=await p.evaluate(()=>{const b=document.querySelector('.pl-go');return b?b.textContent.trim():null;});await clickSel(p,'.pl-go');await p.waitForTimeout(900);return g;}
async function reload(p){await p.waitForTimeout(1800);await p.reload();await module.exports.title(p);await p.waitForTimeout(500);}
const core=p=>p.evaluate(()=>typeof S==='undefined'||!S?null:({jang:S.jang,rd:S.rd,gold:S.gold,deck:S.deck.length,orbs:S.orbs.join(','),diff:S.diff,deckK:S.deckK,campLeft:S.campLeft,merges:S.merges,vouch:S.vouch.join(','),stars:S.deck.filter(c=>c.star>1).length,top:(S.top||[]).map(t=>(t.k||t.id)+(t.sold?'x':'')).join(','),pack:S.pack?S.pack.sold:null,pv:!!S.packView,selecting:!!S.selecting,inShop:!!S.inShop,score:S.score,runs:S.runs,seal:S.deck.filter(c=>c.seal).length}));
module.exports.cont=cont;module.exports.reload=reload;module.exports.core=core;
