/* 무작위 조작 봇 — 보이는 것을 진짜 마우스로 누르며 오류 · 막힘 · 상태 이상을 찾음
   env: SEED STEPS SECS OUT TUT STORY SPEED ASSIST BOOST RM VW VH THIN LABEL */
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=process.env.ROOT||path.join(__dirname,'..','..');
const OUT_DIR=process.env.OUT_DIR||path.join(require('os').tmpdir(),'lm-bots');fs.mkdirSync(OUT_DIR,{recursive:true});process.chdir(OUT_DIR);
const E=(k,d)=>process.env[k]!=null?+process.env[k]:d;
const SEED=E('SEED',1),STEPS=E('STEPS',2500),SECS=E('SECS',540),TUT=E('TUT',0),STORY=E('STORY',0),SPEED=E('SPEED',4),ASSIST=E('ASSIST',.3),BOOST=E('BOOST',0),RM=E('RM',0),VW=E('VW',1366),VH=E('VH',768),THIN=E('THIN',0);
const MODE=process.env.MODE||'menu';
const OUT=process.env.OUT||('out_'+SEED);fs.mkdirSync(OUT,{recursive:true});
const DESIGN=process.env.DESIGN?path.resolve(process.env.DESIGN==='1'?'design':process.env.DESIGN):'',DS=require(path.join(__dirname,'design-snap.js'));   // DESIGN=1(또는 폴더): 디자인 점검용 화면 수집
const MIME={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.css':'text/css','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2','.svg':'image/svg+xml','.wav':'audio/wav'};
let rs=SEED*2654435761>>>0;const rnd=()=>{rs|=0;rs=rs+0x6D2B79F5|0;let t=Math.imul(rs^rs>>>15,1|rs);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
(async()=>{
  const srv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});r.end(d);});});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const URL='http://127.0.0.1:'+srv.address().port+'/index.html';
  const b=await chromium.launch({args:(process.env.GL?['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:['--disable-gpu']).concat(['--autoplay-policy=no-user-gesture-required','--mute-audio'])});
  const ctx=await b.newContext({viewport:{width:VW,height:VH}});const p=await ctx.newPage();
  const findings=[],seenF=new Map(),acts=[];const T0=Date.now(),T=()=>+((Date.now()-T0)/1000).toFixed(1);
  let step=0,lastScr='';
  async function flag(type,key,info){const k=type+'|'+key;const n=(seenF.get(k)||0)+1;seenF.set(k,n);if(n>1)return;
    const f={type,key,t:T(),step,scr:lastScr,info,last:acts.slice(-25)};findings.push(f);
    try{await p.screenshot({path:path.join(OUT,'f'+findings.length+'_'+type.replace(/[^a-z0-9가-힣]+/gi,'_')+'.png')});}catch(e){}
    fs.writeFileSync(path.join(OUT,'findings.json'),JSON.stringify(findings,null,1));
    console.log(`[${T()}s #${step}] ★ ${type} :: ${key}`);}
  p.on('pageerror',e=>flag('오류',e.message.slice(0,160),{stack:(e.stack||'').split('\n').slice(0,6)}));
  p.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(/Failed to load resource|favicon|AudioContext|autoplay|play\(\) (failed|request)/.test(t))return;flag('콘솔오류',t.slice(0,160),{loc:m.location()});});
  p.on('response',r=>{if(r.status()>=400&&!/favicon/.test(r.url()))flag('없는파일',r.url().replace(/^http:\/\/[^/]+\//,'').split('?')[0],{status:r.status()});});
  p.on('dialog',d=>{flag('브라우저대화창',d.type()+':'+d.message().slice(0,80),{});d.dismiss().catch(()=>{});});
  await p.addInitScript(o=>{
    if(window.top===window){try{if(!localStorage.getItem('__mk')){localStorage.setItem('__mk','1');localStorage.setItem('lm_tester','1');
      if(!o.STORY)localStorage.setItem('mergeRoll.storySeen.v1','1');if(!o.TUT){localStorage.setItem('lm_tut_done','1');localStorage.setItem('lm_tut_knight_done','1');}
      localStorage.setItem('lm_settings',JSON.stringify(Object.assign({speed:o.SPEED,rm:!!o.RM,master:0},o.LITE?{motion:false,shadow:false}:{})));}}catch(e){}}
    let a=o.SEED>>>0;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  },{SEED,STORY,TUT,SPEED,RM,LITE:E('LITE',1)});
  if(process.env.FPS!=='0')await p.addInitScript(ms=>{if(window.__rafSlow)return;window.__rafSlow=1;const st=window.setTimeout.bind(window),ct=window.clearTimeout.bind(window);window.requestAnimationFrame=cb=>st(()=>cb(performance.now()),ms);window.cancelAnimationFrame=id=>ct(id);},Math.round(1000/(+(process.env.FPS||15))));
  await p.addInitScript({path:path.join(__dirname,'inpage.js')});
  await p.goto(URL);
  const cnt=new Map();const scrSeen=new Map();const noReact=new Map();
  let stay=0,stayCls='';const lockSince={};let lastSig='',sigSame=0,noCandSince=0,busySince=0,lastProgress=Date.now(),lastProgSig='';
  const sleep=ms=>p.waitForTimeout(ms);
  const probe=async()=>{try{return await p.evaluate(()=>window.__MK?__MK.probe():null);}catch(e){return null;}};
  const tEnd=Date.now()+SECS*1000;
  while(step<STEPS&&Date.now()<tEnd){step++;
    let pr=await probe();if(!pr){await sleep(300);continue;}
    lastScr=pr.scr;scrSeen.set(pr.scr,(scrSeen.get(pr.scr)||0)+1);
    if(DESIGN){if(await DS.snap(p,DESIGN,'m'+SEED+'_'))pr=await probe()||pr;}   // 디자인 점검: 처음 보는 화면을 저장
    for(const v of pr.viol)await flag('상태이상',v,{st:pr.st});
    // 막힘
    const now=Date.now();
    if(pr.lock){const lk=pr.lock.split(' ')[0];lockSince[lk]=lockSince[lk]||now;const lim=lk==='won-no-window'?45000:lk==='no-runs-no-lose'?45000:4000;if(now-lockSince[lk]>lim)await flag('막힘',pr.lock,{st:pr.st});}else for(const k in lockSince)delete lockSince[k];
    if(pr.st&&(pr.st.busy||pr.st.anim)){busySince=busySince||now;if(now-busySince>90000)await flag('막힘','busy 90초 넘게 안 풀림',{st:pr.st});}else busySince=0;
    const live=pr.cands.filter(c=>!c.dis);
    if(!pr.cands.length){noCandSince=noCandSince||now;if(now-noCandSince>45000)await flag('막힘','누를 수 있는 것이 30초 넘게 없음 @'+pr.scr,{st:pr.st});}else noCandSince=0;
    if(pr.sig===lastSig){sigSame++;if(sigSame===120)await flag('막힘','120번 눌러도 화면 · 상태가 안 바뀜 @'+pr.scr,{st:pr.st});}else{sigSame=0;lastSig=pr.sig;}
    if(step%15===0){const bt=await p.evaluate(()=>__MK.badText()).catch(()=>[]);for(const s of bt)await flag('이상한글자',s.replace(/[0-9]+/g,'#').slice(0,60)+' @'+pr.scr,{txt:s});}
    // 얇은 덱 감독: 라운드 고르기에서 덱을 줄여 카드 소진 길을 만듦 (떠나보내기를 많이 한 것과 같은 상태)
    if(THIN&&pr.st&&pr.st.selecting&&!pr.st.practice&&pr.st.deck>THIN+4&&rnd()<.5){await p.evaluate(n=>{try{const keep=shuffle(S.deck.slice()).slice(0,n);S.deck=keep;S.draw=[];}catch(e){}},THIN+Math.floor(rnd()*4));acts.push({s:step,a:'thin'});}
    // 한 화면에 너무 오래 머물면 앞으로 가는 버튼을 먼저
    const cls=pr.scr.split(/[:+\[]/)[0]+(pr.scr.includes('ov:')?'+ov':'');if(cls===stayCls)stay++;else{stay=0;stayCls=cls;}
    // 행동 고르기
    const r=rnd();let act=null;
    const menu=/^(title|gopt)/.test(pr.scr)||/ov:div\.ib/.test(pr.scr);
    // 게임 봇: 메뉴 · 안내 창 · 해보기에 오래 머물지 않고 판으로 돌아감
    if(MODE==='game'&&(menu||/^(practice|sandbox)/.test(pr.scr)||/pRes/.test(pr.scr))&&rnd()<.85){
      const C=pr.cands.filter(c=>!c.dis);let c=null;const f=(re,by)=>C.find(c=>re.test(by==='d'?c.d:c.t));
      if(/^title:main$/.test(pr.scr))c=f(/lt-play/,'d');
      else if(/^title:pop/.test(pr.scr))c=f(/pl-go/,'d')||null;
      else if(/^gopt/.test(pr.scr))c=f(/^계속하기$/)||f(/^뒤로$/);
      else if(/ov:div\.ib/.test(pr.scr))c=f(/ibBack/,'d');
      else c=f(/그만하기|나가기|배우기로|연습장 끝|메인 메뉴/);
      if(c){act={a:'back',d:c.d,t:c.t};await p.mouse.click(c.x,c.y);await sleep(180);}
      else if(/^title:pop|pRes|practice|sandbox/.test(pr.scr)){act={a:'esc'};await p.keyboard.press('Escape');await sleep(150);}
    }
    if(!act&&(stay>(menu?14:35)&&!/^battle/.test(pr.scr)&&rnd()<(menu?.7:.5))||(/^title:main$/.test(pr.scr)&&rnd()<.3)){const go=pr.cands.filter(c=>!c.dis&&(/^플레이$|^계속하기|새로운 런|^선택$|닫기|^뒤로$|✕|^다음|받기|떠나|건너뛰기|원정|출발|확인/.test(c.t)||/pl-go|ibBack|rbGo/.test(c.d)));if(go.length){const c=pick(go);act={a:'go',d:c.d,t:c.t};await p.mouse.click(c.x,c.y);await sleep(200);}}
    const inBattle=/^battle$/.test(pr.scr)&&pr.st&&!pr.st.busy;
    if(!act&&inBattle&&rnd()<ASSIST){ // 좋은 패로 런
      const uids=await p.evaluate(()=>__MK.best()).catch(()=>null);
      if(uids&&uids.length){act={a:'smart',n:uids.length};
        if(BOOST&&rnd()<BOOST)await p.evaluate(()=>{try{if(S&&S.foe&&S.score<S.tgt)S.score=Math.max(S.score,Math.floor(S.tgt*.97));}catch(e){}});
        await p.evaluate(()=>{try{const c=document.getElementById('bClear');c&&c.click();}catch(e){}});await sleep(60);
        for(const u of uids){const pt=await p.evaluate(u=>{const e=document.querySelector('#hand .card[data-uid="'+u+'"]');if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height*.4];},u);if(pt){await p.mouse.click(pt[0],pt[1]);await sleep(50);}}
        const bp=await p.evaluate(()=>{const e=document.getElementById('bPlay');if(!e)return null;const r=e.getBoundingClientRect();const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {x:r.left+r.width/2,y:r.top+r.height/2,hit:!!(h&&(h===e||e.contains(h))),cover:h?__MK.desc(h):''};});
        if(bp){if(!bp.hit&&pr.st.score<pr.st.tgt&&!/ov|lt-|panel/.test(bp.cover))await flag('가림','런 버튼이 가려짐 ← '+bp.cover,{st:pr.st});await p.mouse.click(bp.x,bp.y);}
        await sleep(250);}
    }
    if(!act){
      if(r<.04){act={a:'esc'};await p.keyboard.press('Escape');}
      else if(r<.07){const k=pick(['Enter',' ','1','2','3','4','5','6','7','8','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','r','d','m','s','q','w','e','Backspace']);act={a:'key',k};await p.keyboard.press(k==' '?'Space':k);}
      else if(r<.11){const x=20+rnd()*(VW-40),y=20+rnd()*(VH-40);act={a:'xy',x:x|0,y:y|0};await p.mouse.click(x,y);}
      else if(r<.16){const ms=300+Math.floor(rnd()*2200);act={a:'wait',ms};await sleep(ms);}
      else if(r<.164&&step>40){act={a:'reload'};await p.reload().catch(()=>{});await sleep(1500);}
      else if(r<.168&&!DESIGN){const s=pick([[1366,768],[1920,1080],[1280,720],[1024,768],[1366,768],[1600,900]]);act={a:'resize',w:s[0],h:s[1]};await p.setViewportSize({width:s[0],height:s[1]});await sleep(400);}
      else if(pr.cands.length){
        // 덜 눌러 본 것 먼저
        const ws=pr.cands.map(c=>{const key=pr.scr+'|'+c.d+'|'+c.t.replace(/[0-9]+/g,'#');const n=cnt.get(key)||0;let w=1/(1+n*1.5);if(c.dis)w*=.25;if(/테스터|초기화|지우기|삭제/.test(c.t))w*=.05;if(MODE==='game'&&(/bInfo|bLearn|sOpt|rbInfo|rbOpt|shOpt/.test(c.d)||/안내|배우기|옵션/.test(c.t)))w*=.06;if(c.uid!=null)w=Math.max(w,.35);return {c,key,w};});
        let tot=ws.reduce((s,x)=>s+x.w,0),z=rnd()*tot,ch=ws[0];for(const x of ws){z-=x.w;if(z<=0){ch=x;break;}}
        cnt.set(ch.key,(cnt.get(ch.key)||0)+1);const c=ch.c;
        const mode=r<.20?'burst':r<.24?'dbl':r<.27?'rclick':r<.30?'drag':'click';
        act={a:mode,d:c.d,t:c.t,dis:c.dis||undefined,x:c.x,y:c.y};
        const m0=pr.mut,sig0=pr.sig;
        if(mode==='click'){if(c.type==='range'){await p.mouse.click(c.x-20+rnd()*40,c.y);}else await p.mouse.click(c.x,c.y);}
        else if(mode==='dbl'){await p.mouse.click(c.x,c.y,{clickCount:2,delay:20});}
        else if(mode==='rclick'){await p.mouse.click(c.x,c.y,{button:'right'});}
        else if(mode==='burst'){for(let i=0;i<5;i++){await p.mouse.click(c.x,c.y);}}
        else if(mode==='drag'){await p.mouse.move(c.x,c.y);await p.mouse.down();await p.mouse.move(c.x+(rnd()-.5)*400,c.y+(rnd()-.5)*200,{steps:6});await sleep(60);await p.mouse.up();}
        if(mode==='click'&&!c.dis&&!/^(title|gopt|intro|fxplay)/.test(pr.scr)&&rnd()<.4){await sleep(320);const q=await p.evaluate(()=>window.__MK?{m:__MK.mut,s:__MK.sig()}:null).catch(()=>null);
          if(q&&q.m===m0&&q.s===sig0){const k=ch.key;noReact.set(k,(noReact.get(k)||0)+1);}}
      }else{act={a:'idle'};await sleep(500);}
    }
    act.s=step;act.scr=pr.scr;acts.push(act);if(acts.length>400)acts.splice(0,100);
    await sleep(40+Math.floor(rnd()*90));
    if(step%200===0){const st=pr.st||{};console.log(`[${T()}s #${step}] ${pr.scr} 장${st.jang}-${st.rd} ${st.diff||''}/${st.deckK||''} 발견 ${findings.length}`);}
  }
  const sum={seed:SEED,steps:step,secs:T(),screens:[...scrSeen.entries()].sort((a,b)=>b[1]-a[1]),findings:findings.map(f=>({type:f.type,key:f.key,step:f.step,scr:f.scr,n:seenF.get(f.type+'|'+f.key)})),noReact:[...noReact.entries()].sort((a,b)=>b[1]-a[1]).slice(0,60),clicked:cnt.size};
  fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify(sum,null,1));fs.writeFileSync(path.join(OUT,'findings.json'),JSON.stringify(findings,null,1));
  console.log('끝',JSON.stringify({steps:step,secs:T(),screens:scrSeen.size,findings:findings.length,clicked:cnt.size}));
  findings.forEach(f=>console.log('  ★',f.type,'::',f.key,'@',f.scr));console.log('기록 폴더:',path.join(OUT_DIR,OUT));if(findings.length)process.exitCode=1;
  await ctx.close();await b.close();srv.close();
})().catch(e=>{console.error('봇 오류',e);process.exit(1);});
