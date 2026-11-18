/* 첫 실행 안내(니콜)를 처음부터 끝까지 순서대로 따라감 — 견습 1~3장(졸업까지) · 기사 첫 판(머지 & 런) · 안내 도중 끄기
   빛나는 카드 · 버튼만 진짜 마우스로 누르고, 단계마다 말풍선 글 · 빛 위치 · 잠금 · 음영을 확인.
   배울 것을 다 한 라운드는 점수를 목표 바로 아래로 두고 한 번에 끝냄(시간 줄이기).
   cases/tutorial-app.js · tutorial-knight.js · tutorial-quit.js 가 이 파일을 불러 씀.  V=1 이면 대사마다 한 줄씩 찍음 */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel,cont,reload}=require('./lib.js');
const LOG=process.env.V==='1';
const sleep=(p,ms)=>p.waitForTimeout(ms);

/* 화면에서 안내 상태 읽기 */
const snap=p=>p.evaluate(()=>{const $=id=>document.getElementById(id),T=S&&S.tut,box=$('lmNic'),bub=box&&box.querySelector('.bub'),W=innerWidth,H=innerHeight;
  const vis=e=>{if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&c.pointerEvents!=='none'&&+c.opacity>.05&&r.width>2&&r.height>2;};   // 보이고 누를 수 있음 (음영 처리된 버튼은 false)
  const bubOn=!!(box&&box.classList.contains('on')&&bub&&!bub.classList.contains('wait')&&!bub.classList.contains('out'));
  let b=null;if(bubOn){const r=bub.getBoundingClientRect();b={t:bub.textContent.trim(),k:bub.dataset.k||'',inView:r.left>=-1&&r.top>=-1&&r.right<=W+1&&r.bottom<=H+1,x:r.left+r.width/2,y:r.top+r.height/2,w:r.width|0,h:r.height|0};}
  const rings=[...document.querySelectorAll('.lmTutRg')].filter(d=>d.style.display==='block').map(d=>{const r=d.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,e=document.elementFromPoint(x,y);
    const card=e&&e.closest('#hand .card'),tile=e&&e.closest('#ov .tile'),btn=e&&e.closest('button');
    return {x,y,red:d.classList.contains('red'),label:d.firstChild?d.firstChild.textContent:'',inView:r.left>=-8&&r.top>=-8&&r.right<=W+8&&r.bottom<=H+8,
      kind:card?'card':tile?'tile':btn?'btn':'other',id:card?card.dataset.uid:btn?(btn.id||btn.className):(e&&(e.id||e.className))||'',sel:!!(card&&card.classList.contains('sel')),keep:!!(card&&card.classList.contains('lmTutKeep')),dis:!!(btn&&btn.disabled)};});
  const cl=document.body.classList;
  return {tut:T?{seen:Object.keys(T.seen),fin:!!T.fin,learn:T.learn.length,mode:T.mode||'app'}:null,bub:b,nicOn:!!(box&&box.classList.contains('on')),rings,gate:cl.contains('lmTutGate'),titleOn:cl.contains('lm-titleOn'),
    jang:S.jang,rd:S.rd,selecting:!!S.selecting,inShop:!!S.inShop,inRest:!!S.inRest,busy:!!(S.busy||S.anim),ov:!$('ov').hidden,scr:__MK.screen(),runs:S.runs,score:S.score,tgt:S.tgt,hand:S.hand.length,sel:(S.sel||[]).length,
    played:(S.rs&&S.rs.play)||0,dis:(S.rs&&S.rs.dis)||0,gold:S.gold,orbs:S.orbs.length,
    see:{bDis:vis($('bDis')),bMerge:vis($('bMerge')),keyBar:vis($('keyBar')),bPlay:vis($('bPlay'))},story:!!$('mr-story'),over:!!document.querySelector('#panel .goB'),cmp:(()=>{const c=$('lmCmp');if(!c||c.hidden)return null;return [...c.querySelectorAll('b')].map(x=>x.textContent);})()};});
/* 그 대사 키의 글(게임이 만드는 그대로, 굵은 글씨 표시만 뺌) */
const lineOf=(p,k)=>p.evaluate(k=>{const d=document.createElement('div');d.innerHTML=tutLine(k);return d.textContent.trim();},k);
/* 빛난 카드를 다 고를 때까지 누름 (카드가 들어오는 연출 중에는 한 번에 안 골라질 수 있어 다시 봄) */
async function pickLit(p){let g=await snap(p);for(let i=0;i<8;i++){const c=g.rings.find(r=>r.kind==='card'&&!r.sel&&!r.keep);if(!c)break;await p.mouse.click(c.x,c.y);await sleep(p,450);g=await snap(p);}await sleep(p,500);return snap(p);}
/* 카드가 들어오는 중에는 빛이 아직 안 붙음 → 빛난 카드가 n장이 될 때까지 잠깐 기다림 */
async function waitLit(p,n,b){for(let i=0;i<16&&b.rings.filter(r=>r.kind==='card'&&!r.keep).length<n;i++){await sleep(p,300);b=await snap(p);}return b;}
const badText=t=>!t||/\{|\}|undefined|NaN|\[object/.test(t);

/* 안내를 따라가는 운전수. 새 대사가 나올 때마다 hooks[k] 를 부름. stop(s) 가 참이면 끝 */
async function drive(p,o){const seen=[],said={},t0=Date.now(),hooks=o.hooks||{};let lastAct=Date.now(),idleSince=0,shopBuy=0,roundKey='',guardT=0,restDone={},lastScr='',scrT=0;
  const need=o.need||(()=>null);   // 그 라운드에서 점수 건너뛰기 전에 꼭 봐야 하는 대사
  while(Date.now()-t0<(o.ms||420000)){await sleep(p,330);let s=await snap(p);
    if(!s.tut){return {seen,said,why:'안내 없음',s};}
    /* 새 대사: 말풍선이 뜰 때까지 기다렸다가 글 확인 */
    for(const k of s.tut.seen)if(!seen.includes(k)){seen.push(k);const base=k.split('@')[0];
      let b=null;for(let i=0;i<24;i++){const x=await snap(p);if(x.bub){b=x;break;}if(x.titleOn)break;await sleep(p,250);}
      const want=await lineOf(p,k),alt=base==='tut.1_1.pair'?await lineOf(p,'tut.1_1.go'):base==='tut.k.pair'?await lineOf(p,'tut.k.go'):null;
      const got=b&&b.bub?b.bub.t:'';said[k]={got,want,ok:!!got&&!badText(got)&&(got===want||got===alt),inView:!!(b&&b.bub&&b.bub.inView),rings:b?b.rings:[],gate:b?b.gate:false,at:(b||s).jang+'-'+(b||s).rd,scr:(b||s).scr,see:(b||s).see};
      if(LOG)console.log('  💬',k,'@'+said[k].at,JSON.stringify(got),said[k].ok?'':'≠ '+want,'빛',said[k].rings.map(r=>r.kind+(r.label?'('+r.label+')':'')).join(','),said[k].gate?'잠금':'');
      if(hooks[base]){await hooks[base](b||s,k);}s=await snap(p);}
    if(o.stop&&o.stop(s,seen))return {seen,said,why:'끝',s};
    if(s.over)return {seen,said,why:'게임 오버',s};
    if(s.titleOn)return {seen,said,why:'타이틀로 나와 있음',s};
    if(s.story){await p.keyboard.press('ArrowRight');continue;}
    const rk=s.jang+'-'+s.rd;if(rk!==roundKey){roundKey=rk;guardT=Date.now();}
    const sk=s.scr.replace(':busy','');if(sk!==lastScr){lastScr=sk;scrT=Date.now();}if(s.ov&&Date.now()-scrT<1300)continue;   // 창이 바뀐 직후: 니콜이 말할 틈을 줌 (+ 창 바뀐 직후 0.26초 클릭 무시)
    /* 1) 빛나는 것부터 */
    const cards=s.rings.filter(r=>r.kind==='card'&&!r.sel&&!r.keep),bt=s.rings.find(r=>r.kind==='btn'&&!r.dis),tile=s.rings.find(r=>r.kind==='tile');
    if(!s.busy&&cards.length){await p.mouse.click(cards[0].x,cards[0].y);await sleep(p,160);continue;}
    if(!s.busy&&bt&&!(s.selecting&&Date.now()-guardT<700)){await p.mouse.click(bt.x,bt.y);await sleep(p,500);continue;}
    if(tile&&s.inShop&&shopBuy<1){shopBuy++;const g0=s.gold,o0=s.orbs;await p.mouse.click(tile.x,tile.y);await sleep(p,450);await clickSel(p,'.shop .act:not([tabindex="-1"])');await sleep(p,500);await clickSel(p,'.shop .act:not([tabindex="-1"])');await sleep(p,800);const a=await snap(p);
      rec('첫 원정 캠프: 빛나는 풍차 구슬을 누르고 구매 → 확인 → 사짐',a.orbs===o0+1&&a.gold<g0,`구슬 ${o0}→${a.orbs} 골드 ${g0}→${a.gold}`);continue;}
    /* 2) 창 */
    if(s.ov){const scr=s.scr;
      if(/rsB/.test(scr)){if(Date.now()-guardT<900)continue;const r=await p.evaluate(()=>{const C=document.querySelector('#ov .rb3.cur');if(!C)return null;const b=[...C.querySelectorAll('button')].find(x=>!x.disabled&&x.offsetParent);if(!b)return null;const q=b.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2,t:b.textContent.trim()};});
        if(r){await p.mouse.click(r.x,r.y);await sleep(p,700);}continue;}
      if(/cash/.test(scr)){if(await p.evaluate(()=>{const b=document.getElementById('cashBtn');return !!b&&!b.disabled;})){if(o.beforeCash&&await o.beforeCash(s)===false)continue;await sleep(p,350);await clickSel(p,'#cashBtn');await sleep(p,600);}continue;}
      if(/shop/.test(scr)){if(o.inShop&&await o.inShop(s)==='wait')continue;await sleep(p,400);await clickSel(p,'.sBtns .next');await sleep(p,700);continue;}
      if(/rest/.test(scr)){if(o.inRest&&!restDone[rk]){restDone[rk]=1;await o.inRest(s);}
        if(!await tap(p,/출발|떠나기|돌아가기|다음 라운드|야영 끝|^선택$/)){if(LOG)console.log('  야영에서 누를 것',(await btns(p)).join(' / '));await p.keyboard.press('Escape');}await sleep(p,700);continue;}
      if(/mgPk/.test(scr)){if(o.inMerge)await o.inMerge(s);await sleep(p,400);await clickSel(p,'#ov .mgGo');await sleep(p,700);continue;}
      if(Date.now()-lastAct>6000){if(LOG)console.log('  모르는 창',scr,(await btns(p)).join(' / '));await p.keyboard.press('Escape');lastAct=Date.now();}continue;}
    lastAct=Date.now();
    /* 3) 전투: 잠금 중이면 빛만 따라감. 아니면 그 라운드에서 배울 것을 다 본 뒤 한 번에 끝냄 */
    if(s.busy||!s.hand){idleSince=0;continue;}
    if(s.gate){idleSince=0;continue;}
    if(!idleSince){idleSince=Date.now();continue;}
    const nd=need(s,seen);if(nd&&Date.now()-idleSince<25000)continue;
    if(nd){return {seen,said,why:`${rk} 라운드에서 '${nd}' 대사가 25초 동안 안 나옴`,s};}
    if(Date.now()-idleSince<1300)continue;
    {const x=await snap(p);if(!x.tut||x.tut.seen.some(k=>!seen.includes(k))||(x.nicOn&&!x.bub&&Date.now()-idleSince<6000)||x.busy||x.gate)continue;}   // 방금 새 대사가 나왔거나 말풍선이 뜨는 중이면 먼저 확인
    if(o.beforeKill&&await o.beforeKill(s)===false){idleSince=0;continue;}
    await p.evaluate(()=>{S.score=Math.max(S.score,S.tgt-1);if(S.sel.length){S.sel=[];render();}});
    const u=await p.evaluate(()=>{const h=S.hand.filter(c=>!c.seal&&!c.fog);return (h[0]||S.hand[0]).uid;});await clickSel(p,'#hand .card[data-uid="'+u+'"]');await sleep(p,200);await clickSel(p,'#bPlay');await sleep(p,600);idleSince=0;}
  return {seen,said,why:'시간 초과',s:await snap(p)};}
const sayRec=(R,k,name)=>{const key=R.seen.find(x=>x.split('@')[0]===k),v=key&&R.said[key];rec(`${name} — 말풍선`,!!(v&&v.ok&&v.inView),v?`${JSON.stringify(v.got)}${v.ok?'':' ≠ '+JSON.stringify(v.want)}${v.inView?'':' (화면 밖)'} @${v.at}`:'대사가 안 나옴');return v;};

/* ── 견습: 1-1 → 3-3 졸업 ── */
async function partApp(){const p=await boot({seed:311,tut:true});await newRun(p,'app');let s=await snap(p);
  rec('처음 하는 사람이 견습 새 판 → 안내 켜짐',!!(s.tut&&s.tut.mode==='app'&&!s.tut.fin),s.scr);if(!s.tut){await p.ctx.close();return;}
  const N={};   // 단계별로 모은 것
  const hooks={
    'tut.rs.first':async b=>{const d=await p.evaluate(()=>({other:[...document.querySelectorAll('#ov .rb3:not(.cur) button')].every(x=>x.disabled),go:(()=>{const g=document.querySelector('#ov .rb3.cur .rbGo');return !!g&&!g.disabled;})()}));
      rec('1-1 라운드 고르기: 지금 라운드 \'선택\'만 눌림 · 다른 칸은 잠김',d.other&&d.go&&b.rings.some(r=>r.kind==='btn'),`다른 칸 잠김 ${d.other} 선택 ${d.go} 빛 ${b.rings.length}개`);},
    'tut.1_1.pair':async b=>{b=await waitLit(p,2,b);rec('1-1: 버리기 · 머지 버튼은 음영(안 눌림) · 열쇠 줄은 아직 안 보임',!b.see.bDis&&!b.see.bMerge&&!b.see.keyBar&&b.see.bPlay,JSON.stringify(b.see));
      const lit=b.rings.filter(r=>r.kind==='card');rec('1-1: 같은 번호 두 장에 빛 + 족보 이름 꼬리표',lit.length===2&&lit.every(r=>r.inView)&&!!b.rings[0].label,`빛 ${lit.length}장 꼬리표 ${JSON.stringify(b.rings[0]&&b.rings[0].label)}`);
      const same=await p.evaluate(u=>{const c=u.map(x=>S.hand.find(h=>h.uid==x));return c.every(Boolean)&&cardNo(c[0])===cardNo(c[1]);},lit.map(r=>r.id));rec('1-1: 빛난 두 장이 정말 같은 번호',same);
      /* 잠금: 빛 안 난 카드 · 런 정보는 안 눌림 */
      const other=await p.evaluate(u=>{const e=[...document.querySelectorAll('#hand .card')].find(c=>!u.includes(c.dataset.uid));const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.4};},lit.map(r=>r.id));
      await p.mouse.click(other.x,other.y);await sleep(p,250);const a=await snap(p);await clickSel(p,'#bInfo');await sleep(p,350);const a2=await snap(p);
      rec('1-1 잠금: 빛 안 난 카드 · 런 정보는 눌러도 반응 없음',b.gate&&a.sel===0&&!a2.ov,`잠금 ${b.gate} 고른 카드 ${a.sel} 창 ${a2.ov}`);if(a2.ov){await p.keyboard.press('Escape');await sleep(p,300);}
      /* 고른 카드는 다시 눌러 뺄 수 있음 */
      await p.mouse.click(lit[0].x,lit[0].y);await sleep(p,250);const c1=await snap(p);await p.mouse.click(lit[0].x,lit[0].y);await sleep(p,250);const c2=await snap(p);
      rec('1-1 잠금 중에도 고른 카드는 다시 눌러 뺄 수 있음',c1.sel===1&&c2.sel===0,`${c1.sel} → ${c2.sel}`);
      const g=await pickLit(p),goT=await lineOf(p,'tut.1_1.go');
      rec('1-1: 두 장을 다 고르면 말이 \'이제 런!\'으로 바뀌고 런 버튼에 빛',!!g.bub&&g.bub.t===goT&&g.rings.length===1&&g.rings[0].id==='bPlay',`${JSON.stringify(g.bub&&g.bub.t)} 빛 ${g.rings.map(r=>r.id).join(',')}`);},
    'tut.1_1.three':async b=>{for(let i=0;i<12&&b.rings.filter(r=>r.kind==='card').length<3;i++){await sleep(p,300);b=await snap(p);}const lit=b.rings.filter(r=>r.kind==='card');rec('1-1 두 번째 런: 같은 번호 세 장에 빛',lit.length===3&&b.gate,`빛 ${lit.length}장 잠금 ${b.gate}`);},
    'tut.1_1.cmp':async b=>{const c=b.cmp||(await snap(p)).cmp;N.cmp=c;},
    'tut.1_2.discard':async b=>{b=await waitLit(p,1,b);const red=b.rings.filter(r=>r.red),keep=b.rings.filter(r=>r.kind==='card'&&r.keep);
      rec('1-2: 버리기 버튼이 켜짐(머지는 아직 음영) · 버릴 카드에 빨간 빛 · 남길 짝은 그대로',b.see.bDis&&!b.see.bMerge&&red.length>=1&&keep.length===2,`버리기 ${b.see.bDis} 머지 ${b.see.bMerge} 빨강 ${red.length} 남길 짝 ${keep.length}`);
      if(keep[0]){await p.mouse.click(keep[0].x,keep[0].y);await sleep(p,250);const a=await snap(p);rec('1-2 잠금: 남길 짝은 눌러도 안 골라짐',a.sel===0,`고른 카드 ${a.sel}`);}
      /* 메인 메뉴로 나갔다 오기: 타이틀에서는 니콜 · 빛이 안 보이고, 돌아오면 같은 말을 다시 */
      await p.keyboard.press('Escape');await sleep(p,450);await tap(p,/메인 메뉴로/);await sleep(p,900);const t=await snap(p);
      rec('1-2 안내 중 메인 메뉴로 → 타이틀에 니콜 · 빛이 남지 않음',t.titleOn&&!t.nicOn&&!t.rings.length,`타이틀 ${t.titleOn} 니콜 ${t.nicOn} 빛 ${t.rings.length}`);
      const lab=await cont(p);await sleep(p,400);const ok=await until(p,()=>{const b=document.querySelector('#lmNic.on .bub');return !!b&&!b.classList.contains('wait')&&!!document.querySelector('.lmTutRg[style*="block"]');},9000);const r=await snap(p);
      rec('1-2 \'계속하기\'로 돌아오면 같은 안내가 다시 나옴',ok&&!!r.bub&&r.bub.t===await lineOf(p,'tut.1_2.discard')&&r.rings.some(x=>x.red),`버튼 "${lab}" ${JSON.stringify(r.bub&&r.bub.t)} 빨간 빛 ${r.rings.filter(x=>x.red).length}`);N.d0=r.dis;},
    'tut.1_2.done':async b=>{for(let i=0;i<12&&b.rings.filter(r=>r.kind==='card').length<4;i++){await sleep(p,300);b=await snap(p);}const two=await p.evaluate(()=>{const m={};S.hand.forEach(c=>{const n=cardNo(c);m[n]=(m[n]||0)+1;});return Object.values(m).filter(v=>v>=2).length;});
      rec('1-2: 버린 뒤 손패에 짝이 두 개(두 쌍) · 네 장에 빛',two>=2&&b.rings.filter(r=>r.kind==='card').length===4,`짝 ${two}개 빛 ${b.rings.filter(r=>r.kind==='card').length}장`);},
    'tut.1_3.start':async b=>{b=await waitLit(p,2,b);const lit=b.rings.filter(r=>r.kind==='card');rec('1-3: 머지 버튼이 켜짐 · 같은 동료 두 장에 빛',b.see.bMerge&&lit.length===2,`머지 ${b.see.bMerge} 빛 ${lit.length}장`);N.star0=await p.evaluate(()=>S.hand.concat(S.draw,S.deck||[]).filter(c=>c.star>=2).length);},
    'tut.2_1.start':async b=>{b=await waitLit(p,2,b);rec('2-1: 열쇠 줄이 나타남 · 열쇠 짝 두 장에 빛',b.see.keyBar&&b.rings.filter(r=>r.kind==='card').length===2,`열쇠 줄 ${b.see.keyBar} 빛 ${b.rings.map(r=>r.kind).join(',')}`);},
    'tut.2_2.camp':async b=>{const d=await p.evaluate(()=>{const C=document.querySelector('#ov .rb3.cur'),g=C&&C.querySelector('.rbGo'),k=C&&C.querySelector('.rbSkip:not(.boss) button');return {go:!!g&&g.disabled,camp:!!k&&!k.disabled};});
      rec('2-2 라운드 고르기: \'선택\'은 잠기고 야영하기만 눌림',d.go&&d.camp&&b.rings.some(r=>r.kind==='btn'),`선택 잠김 ${d.go} 야영 ${d.camp}`);},
    'tut.3_2.awaken':async b=>{b=await waitLit(p,2,b);rec('3장: 별 2개 같은 동료 두 장에 빛 (각성)',b.rings.filter(r=>r.kind==='card').length===2&&b.gate,`빛 ${b.rings.map(r=>r.kind).join(',')} 잠금 ${b.gate}`);},
  };
  const need=(s,seen)=>{const has=k=>seen.some(x=>x.split('@')[0]===k);
    if(s.jang===1&&s.rd===0)return !has('tut.1_1.pair')?'tut.1_1.pair':!has('tut.1_1.three')?'tut.1_1.three':null;
    if(s.jang===1&&s.rd===1)return !has('tut.1_2.discard')?'tut.1_2.discard':!has('tut.1_2.done')?'tut.1_2.done':null;
    if(s.jang===1&&s.rd===2)return !has('tut.1_3.start')?'tut.1_3.start':null;
    if(s.jang===2&&s.rd===0)return !has('tut.2_1.start')?'tut.2_1.start':null;
    if(s.jang===3&&s.rd===0)return !has('tut.3_2.awaken')?'tut.3_2.awaken':null;return null;};
  let saveDone=0;
  const R=await drive(p,{hooks,need,ms:560000,
    /* 1-3에서 한 번: 런 1번 남기고 약한 패를 내서 '1장에서는 지지 않음' 확인 */
    beforeKill:async s=>{if(s.jang===1&&s.rd===2&&!saveDone){saveDone=1;N.merged=await p.evaluate(()=>S.hand.concat(S.draw).filter(c=>c.star>=2).length);
        await p.evaluate(()=>{S.runs=1;S.score=0;if(S.sel.length){S.sel=[];}render();});const u=await p.evaluate(()=>S.hand.slice().sort((a,b)=>cardNo(a)-cardNo(b))[0].uid);
        await clickSel(p,'#hand .card[data-uid="'+u+'"]');await sleep(p,200);await clickSel(p,'#bPlay');
        const ok=await until(p,()=>!!S.tut.seen['tut.save'],25000);await sleep(p,1500);const a=await snap(p),want=await lineOf(p,'tut.save');
        rec('1-3 런이 다 떨어져도 지지 않음 — 니콜이 런 1번을 돌려줌',ok&&!a.over&&a.runs===1&&a.hand>0,`대사 ${ok} 런 ${a.runs} 손패 ${a.hand} 게임 오버 ${a.over}`);
        rec('\'한 번 일으켜 드릴게요\' — 말풍선',!!a.bub&&a.bub.t===want&&a.bub.inView,JSON.stringify(a.bub&&a.bub.t));
        const gone=await until(p,()=>!document.querySelector('#lmNic.on .bub:not(.out):not(.wait)'),9000);rec('일으켜 준 뒤 말풍선이 스스로 닫힘 (안 닫히면 뒤 안내가 전부 막힘)',gone);return false;}
      return true;},
    inShop:async s=>{if(!N.shop1){N.shop1=1;return;}
      if(s.orbs>=1&&!N.order){N.order=1;await p.evaluate(()=>{S.gold+=60;render();try{renderShop&&renderShop();}catch(e){}});const t=await p.evaluate(()=>{const e=[...document.querySelectorAll('#ov .tile')].find(x=>/^top/.test(x.dataset.key||'')&&!x.classList.contains('sold')&&!x.disabled);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,k:e.dataset.key};});
        if(t){await p.mouse.click(t.x,t.y);await sleep(p,450);await clickSel(p,'.shop .act:not([tabindex="-1"])');await sleep(p,500);await clickSel(p,'.shop .act:not([tabindex="-1"])');await sleep(p,500);N.orbs=(await snap(p)).orbs;return 'wait';}}},
    inRest:async s=>{await sleep(p,1500);const a=await snap(p);N.rest=a;await shot(p,'tut_rest.png');},
    beforeCash:async s=>{if(s.jang===3&&s.rd===2&&!N.gradWait){N.gradWait=1;const ok=await until(p,()=>!!S.tut.seen['tut.3_3.grad'],20000);N.gradSeen=ok;await sleep(p,1800);N.grad=await snap(p);await shot(p,'tut_grad.png');}return true;},
    stop:(s,seen)=>s.tut.fin||s.jang>=4});
  const s2=R.s;if(LOG)console.log('끝:',R.why,'장',s2.jang+'-'+s2.rd,'대사',R.seen.join(' '));
  const order=['tut.rs.first','tut.1_1.pair','tut.1_1.three','tut.1_1.cmp','tut.2_2.shop','tut.1_2.discard','tut.1_2.done','tut.1_3.start','tut.2_1.start','tut.2_1.key','tut.2_2.camp','tut.3_1.rest','tut.2_3.rule','tut.3_2.awaken','tut.3_3.bridge','tut.3_3.grad'];
  const names={'tut.rs.first':'1-1 라운드 고르기 \'체력이 다 없어지면 이겨요\'','tut.1_1.pair':'1-1 짝','tut.1_1.three':'1-1 세 장','tut.1_1.cmp':'1-1 피해 비교','tut.2_2.shop':'첫 원정 캠프 구슬','tut.1_2.discard':'1-2 버리기','tut.1_2.done':'1-2 두 쌍','tut.1_3.start':'1-3 머지',
    'tut.2_1.start':'2-1 방패','tut.2_1.key':'2-1 열쇠','tut.2_2.camp':'2-2 야영 권유','tut.3_1.rest':'야영 모닥불 머지','tut.2_3.rule':'2-3 거인 규칙','tut.3_2.awaken':'3장 각성','tut.3_3.bridge':'3-3 기사 예고','tut.3_3.grad':'3-3 졸업 인사'};
  for(const k of order)sayRec(R,k,names[k]);
  const pos=order.map(k=>R.seen.findIndex(x=>x.split('@')[0]===k)),inOrder=pos.every((v,i)=>v>=0&&(i===0||v>pos[i-1]));
  rec('대사 16개가 정해진 순서대로 나옴',inOrder,inOrder?'':'나온 순서: '+R.seen.join(' '));
  const cheers=R.seen.filter(k=>/cheer|rs\.(go|boss)/.test(k));rec('배울 것이 없는 라운드: 응원 한마디 · 라운드 고르기 한마디',cheers.length>=6&&cheers.every(k=>R.said[k].ok&&R.said[k].inView),cheers.map(k=>k.replace('tut.','')+(R.said[k].ok?'':'✗')).join(' '));
  rec('1-1 피해 비교 숫자(짝 ➜ 세 장)가 뜨고 뒤 숫자가 더 큼',!!(N.cmp&&N.cmp.length===2),N.cmp?N.cmp.join(' ➜ '):'비교가 안 보임');
  rec('1-3: 빛난 두 장을 고르고 머지 → 별 2개 동료가 생김',(N.merged||0)>=1,`별 2개 이상 ${N.merged}장`);
  sayRec(R,'tut.orb.order','구슬이 2개가 되면 \'+ 구슬은 앞에, × 구슬은 뒤에\'');
  rec('야영: 니콜 말이 설명 칸 안에 뜸',!!(N.rest&&N.rest.bub&&N.rest.bub.inView&&/rest/.test(N.rest.scr)),N.rest?`${N.rest.scr} ${JSON.stringify(N.rest.bub&&N.rest.bub.t)}`:'야영에 안 들어감');
  rec('3-3 보상 창에서 졸업 인사',!!(N.gradSeen&&N.grad&&N.grad.bub&&N.grad.bub.inView),N.grad?JSON.stringify(N.grad.bub&&N.grad.bub.t):'');
  /* 졸업 뒤: 안내 끝 · 저장값 · 배우기 전부 열림 · 4장은 보통 게임 */
  await until(p,()=>!!S.tut.fin,15000);await sleep(p,6000);
  const e=await p.evaluate(()=>({fin:!!S.tut.fin,done:localStorage.getItem('lm_tut_done'),learn:S.tut.learn.length,all:LEARN_ORDER.length,lock:LEARN_ORDER.filter(k=>lmTutLock(k)).length,jang:S.jang,rd:S.rd}));const s3=await snap(p);
  rec('졸업: 안내 끝 · 다시 안 나오게 저장 · 배우기 전부 열림',e.fin&&e.done==='1'&&e.lock===0,`끝 ${e.fin} 저장 ${e.done} 잠긴 배우기 ${e.lock}/${e.all} @${e.jang}-${e.rd} (${R.why})`);
  rec('졸업 뒤 니콜 · 빛 · 잠금이 남지 않음',!s3.nicOn&&!s3.rings.length&&!s3.gate,`니콜 ${s3.nicOn} 빛 ${s3.rings.length} 잠금 ${s3.gate} ${s3.scr}`);
  /* 4-1 전투 시작: 버튼 전부 보임 */
  for(let i=0;i<30;i++){const x=await snap(p);if(!x.ov&&x.hand&&!x.busy)break;if(/cash/.test(x.scr))await clickSel(p,'#cashBtn');else if(/shop/.test(x.scr))await clickSel(p,'.sBtns .next');else if(/rsB/.test(x.scr))await clickSel(p,'#ov .rb3.cur .rbGo');await sleep(p,700);}
  const s4=await snap(p);rec('4-1 전투: 버리기 · 머지 · 열쇠 줄이 다 보이고 안내 없음',s4.jang===4&&s4.see.bDis&&s4.see.bMerge&&s4.see.keyBar&&!s4.nicOn&&!s4.gate,`${s4.jang}-${s4.rd} ${JSON.stringify(s4.see)} 니콜 ${s4.nicOn}`);
  rec('견습 안내 내내 스크립트 오류 없음',!p.errs.length,p.errs.slice(0,3).join(' | '));
  await p.ctx.close();}

/* ── 기사 첫 판: 머지 & 런 ── */
async function partKnight(){const p=await boot({seed:321,tut:true});await p.evaluate(()=>localStorage.setItem('lm_tut_done','1'));await newRun(p,'knight');let s=await snap(p);
  rec('기사 첫 판 → 머지 & 런 안내 켜짐',!!(s.tut&&s.tut.mode==='knight'),s.scr);if(!s.tut){await p.ctx.close();return;}
  const N={};
  const hooks={
    'tut.k.pair':async b=>{for(let i=0;i<14&&b.rings.filter(r=>r.kind==='card').length<2;i++){await sleep(p,300);b=await snap(p);}await sleep(p,900);b=await snap(p);const lit=b.rings.filter(r=>r.kind==='card');rec('기사 1-1: 같은 동료 두 장에 빛 · 잠금',lit.length===2&&b.gate,`빛 ${lit.length}장 잠금 ${b.gate}`);if(lit.length<2)return;
      const g=await pickLit(p),goT=await lineOf(p,'tut.k.go');
      rec('기사 1-1: 두 장을 다 고르면 \'같이 런하면 머지돼요\' + 런 버튼에 빛',!!g.bub&&g.bub.t===goT&&g.rings.length===1&&g.rings[0].id==='bPlay',`${JSON.stringify(g.bub&&g.bub.t)} 빛 ${g.rings.map(r=>r.id).join(',')}`);},
    'tut.k.fuse':async b=>{const ids=b.rings.map(r=>r.id).join(' ');rec('머지 고르기 창: \'합치기\'와 \'머지 하지 않음\' 두 버튼에 빛',b.rings.length===2&&/mgGo/.test(ids)&&/mgSkip/.test(ids),ids);},
  };
  const need=(s,seen)=>s.jang===1&&s.rd===0&&!seen.includes('tut.k.pair')?'tut.k.pair':null;
  const R=await drive(p,{hooks,need,ms:240000,stop:s=>s.tut.fin||s.jang>1});
  if(LOG)console.log('끝:',R.why,R.seen.join(' '));
  const names={'tut.k.pair':'기사 1-1 같이 고르기','tut.k.fuse':'머지 고르기 창','tut.k.done':'기사 1-1 머지 & 런 뒤','tut.k.star':'기사 1-2 별 수','tut.k.grad':'기사 1-3 마무리'},order=Object.keys(names);
  for(const k of order)sayRec(R,k,names[k]);
  const pos=order.map(k=>R.seen.indexOf(k));rec('기사 대사 5개가 순서대로 나옴',pos.every((v,i)=>v>=0&&(i===0||v>pos[i-1])),R.seen.join(' '));
  await until(p,()=>!!S.tut.fin,20000);const t0=Date.now();const off=await until(p,()=>!document.getElementById('lmNic').classList.contains('on'),30000);console.log('  니콜이 사라지기까지',((Date.now()-t0)/1000).toFixed(1)+'초',off);await shot(p,'tut_k_end.png');const e=await p.evaluate(()=>({fin:!!S.tut.fin,done:localStorage.getItem('lm_tut_knight_done')}));const s3=await snap(p);
  rec('기사 안내 끝: 다시 안 나오게 저장 · 니콜 · 빛이 남지 않음',e.fin&&e.done==='1'&&!s3.nicOn&&!s3.rings.length&&!s3.gate,`끝 ${e.fin} 저장 ${e.done} 니콜 ${s3.nicOn} 빛 ${s3.rings.length} (${R.why} @${R.s.jang}-${R.s.rd})`);
  rec('기사 안내 내내 스크립트 오류 없음',!p.errs.length,p.errs.slice(0,3).join(' | '));
  await p.ctx.close();}

/* ── 안내 도중에 게임을 끄면 (지금 동작을 적어 두기만 함) ── */
async function partQuit(){const p=await boot({seed:331,tut:true});await newRun(p,'app');
  const R=await drive(p,{ms:200000,need:(s,seen)=>{const has=k=>seen.some(x=>x.split('@')[0]===k);if(s.jang===1&&s.rd===0)return !has('tut.1_1.three')?'tut.1_1.three':null;if(s.jang===1&&s.rd===1)return !has('tut.1_2.done')?'tut.1_2.done':null;return null;},stop:s=>s.jang===1&&s.rd===2&&s.selecting});
  const a=await snap(p);await reload(p);const t=await p.evaluate(()=>({btn:(document.querySelector('.lt-play')||{}).textContent,save:!!localStorage.getItem('lm_run_v1'),done:localStorage.getItem('lm_tut_done'),runs:LM_ST.runs,best:LM_ST.bestRound}));
  await newRun(p,'app');const b=await snap(p);
  console.log(`ℹ️ 안내 도중(1-3 고르기)에 끄고 다시 켬 → 타이틀 버튼 "${(t.btn||'').trim()}" · 저장된 판 ${t.save} · 안내 끝 저장 ${t.done} · 기록 판수 ${t.runs} 최고 라운드 ${t.best} → 새 판에서 안내 ${b.tut&&!b.tut.fin?'다시 나옴':'안 나옴'}`);
  /* 판정하지 않음(ℹ️만): 안내 중인 판은 저장하지 않는 설계(11-13) — 이어하기를 줄지 · 안내를 다시 줄지는 DHL 판단 대기 */
  await p.ctx.close();}

module.exports={partApp,partKnight,partQuit,drive,snap};
