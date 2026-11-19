/* 완주 봇: 진짜 클릭으로 1장 → 8장 → 엔딩 → 무한 원정까지. 점수만 올려 줘서(이기게) 모든 화면을 지나가며 오류 · 막힘 · 상태 이상을 봄
   env: DIFF DECK SEED MAXR(라운드 수 한도) ENDR(무한 원정 라운드 수) CAMP(야영 확률) SHOPBUY(구매 확률) JUMP(시작 장) */
const {boot,tap,st,btns,until,newRun,shot,done,rec,clickSel}=require('./lib.js');const fs=require('fs');const DESIGN=process.env.DESIGN?require('path').resolve(process.env.DESIGN==='1'?'design':process.env.DESIGN):'',DS=require('./design-snap.js');
const DIFF=process.env.DIFF||'app',DECK=process.env.DECK||'lamancha',SEED=+(process.env.SEED||51),MAXR=+(process.env.MAXR||40),ENDR=+(process.env.ENDR||4),CAMP=+(process.env.CAMP||.25),BUY=+(process.env.SHOPBUY||.6),JUMP=+(process.env.JUMP||0),SPEED=+(process.env.SPEED||4);
let rs=SEED;const rnd=()=>{rs=(rs*1664525+1013904223)>>>0;return rs/4294967296;};
(async()=>{
  const p=await boot({seed:SEED,speed:SPEED});await newRun(p,DIFF,DECK);
  if(JUMP)await p.evaluate(j=>{S.jang=j;S.rd=0;S.foes=null;S.foesNext=null;ensureFoes();S.gold=30;startRound();},JUMP);
  const tag=`${DIFF}/${DECK}`;const trail=[];const probs=[];let lastR='',rounds=0,endRounds=0,lastKey='',lastChange=Date.now(),sawEnd=false,sawFinale=false,sawMill2=false,overs=0;
  const note=(t,x)=>{probs.push(t+(x?' — '+x:''));console.log('❗',tag,t,x||'');};
  const t0=Date.now();
  while(Date.now()-t0<(+(process.env.SECS||600))*1000){if(DESIGN)await DS.snap(p,DESIGN,'f'+DIFF[0]+'_');
    const q=await p.evaluate(()=>{const o=document.getElementById('ov'),P=document.querySelector('#panel>*');return {scr:__MK.screen(),st:__MK.state(),viol:__MK.viol(),lock:__MK.lock(),story:!!document.getElementById('mr-story'),cash:!!document.querySelector('#cashBtn:not([disabled])'),cashWait:!!document.querySelector('#cashBtn[disabled]'),
      go:!!document.querySelector('#panel .goB'),goWait:!!document.querySelector('#panel .goB.goWait'),endless:!!document.querySelector('.goEndless'),rs:!!document.querySelector('#panel .rsB')&&!o.hidden,shop:!!document.querySelector('#panel .shop')&&!o.hidden,pack:!!(S&&S.packView)&&!o.hidden,rest:!!(S&&S.inRest),
      ovTxt:o.hidden?'':(document.getElementById('panel').innerText||'').slice(0,50).replace(/\s+/g,' '),mill2:!!(S&&S.foe&&S.foe.wm2),bad:__MK.badText()};}).catch(()=>null);
    if(!q){await p.waitForTimeout(300);continue;}
    for(const v of q.viol)if(!probs.includes('상태이상 — '+v))note('상태이상',v+' @'+q.scr);
    for(const b of q.bad)if(!probs.some(x=>x.includes(b.slice(0,20))))note('이상한 글자',b+' @'+q.scr);
    if(p.errs.length){for(const e of p.errs.splice(0))if(!probs.includes('오류 — '+e))note('오류',e);}
    const key=q.scr+'|'+(q.st?[q.st.jang,q.st.rd,q.st.score,q.st.runs,q.st.gold,q.st.hand,q.st.busy,q.st.orbs,q.st.deck].join(','):'')+'|'+q.ovTxt;
    if(key!==lastKey){lastKey=key;lastChange=Date.now();}else if(Date.now()-lastChange>75000){note('막힘 75초',q.scr+' '+JSON.stringify(q.st)+' / '+q.ovTxt);await shot(p,`full_${DIFF}_${DECK}_stuck${probs.length}.png`);break;}
    if(q.lock&&Date.now()-lastChange>50000){note('막힘',q.lock+' @'+q.scr);await shot(p,`full_${DIFF}_${DECK}_lock${probs.length}.png`);break;}
    if(q.mill2)sawMill2=true;if(q.st&&q.st.finale)sawFinale=true;
    const T=s=>{if(trail[trail.length-1]!==s)trail.push(s);};
    if(q.story){T('이야기');lastChange=Date.now();await p.keyboard.press('ArrowRight');await p.waitForTimeout(450);continue;}   // 반전 · 엔딩 장면은 처음엔 건너뛰기가 없음 → 한 컷씩 넘김
    if(/ov:div\.ib/.test(q.scr)){await clickSel(p,'.ibBack');await p.waitForTimeout(400);continue;}
    if(q.st&&(q.st.practice||q.st.sandbox)){T('해보기');await p.keyboard.press('Escape');await tap(p,/그만하기|배우기로|나가기/);await p.waitForTimeout(400);continue;}
    if(q.go){if(q.goWait){await p.waitForTimeout(400);continue;}overs++;T(q.st&&q.st.ended&&q.endless?'완주 결과':'결과');sawEnd=true;await shot(p,`full_${DIFF}_${DECK}_end${overs}.png`);
      if(q.endless&&ENDR>0){await clickSel(p,'.goEndless');await p.waitForTimeout(800);continue;}
      break;}
    if(q.cash){T('보상');await clickSel(p,'#cashBtn');await p.waitForTimeout(500);continue;}
    if(q.cashWait){await p.waitForTimeout(300);continue;}
    if(q.pack){T('팩');if(rnd()<.8)await clickSel(p,'#panel .packRow>.card');else await tap(p,/건너뛰기/);await p.waitForTimeout(400);continue;}
    if(q.shop){T('캠프');
      if(rnd()<BUY){const keys=await p.evaluate(()=>[...document.querySelectorAll('.tile[data-key]')].map(t=>t.dataset.key));if(keys.length){const k=keys[Math.floor(rnd()*keys.length)];await clickSel(p,`.tile[data-key="${k}"]`);await p.waitForTimeout(200);await tap(p,/^(구매|사용|열기)/);await p.waitForTimeout(350);
        if(rnd()<.3){await clickSel(p,'.sorb.on');await p.waitForTimeout(200);if(rnd()<.5)await tap(p,/^판매/);else await tap(p,/^(왼쪽|오른쪽)/);await p.waitForTimeout(300);}
        if(rnd()<.3){await tap(p,/^리롤/);await p.waitForTimeout(300);}continue;}}
      await clickSel(p,'.sBtns .next');await p.waitForTimeout(700);continue;}
    if(q.rest||/rest|cp|camp/.test(q.scr)&&!q.rs){T('야영');const c=(await p.evaluate(()=>__MK.cands())).filter(c=>!c.dis&&!/옵션|메뉴|안내|배우기|런 정보/.test(c.t)&&!/bInfo|bLearn|sOpt/.test(c.d));if(c.length){const x=c[Math.floor(rnd()*c.length)];await p.mouse.click(x.x,x.y);}await p.waitForTimeout(500);continue;}
    if(/mgPk/.test(q.scr)){T('머지 고르기');if(rnd()<.8)await clickSel(p,'#panel .mgGo');else await tap(p,/머지 하지 않음/);await p.waitForTimeout(500);continue;}
    if(q.rs){const rk=q.st.jang+'-'+q.st.rd+(q.st.endless?'∞':'');T('고르기 '+rk);if(rk!==lastR){lastR=rk;rounds++;if(q.st.endless)endRounds++;}if(rounds>MAXR||(q.st.endless&&endRounds>ENDR))break;
      if(q.st.rd<2&&rnd()<CAMP&&(await tap(p,/야영하기/))){await p.waitForTimeout(600);continue;}
      await clickSel(p,'.rbGo');await p.waitForTimeout(600);continue;}
    if(/^battle$/.test(q.scr)&&q.st&&q.st.hand>0&&q.st.score<q.st.tgt){T('전투');
      // 풍차 거인은 절반에서 한 번 멈춰 2페이지를 봄
      const half=q.st.finale&&!q.mill2&&q.st.score<q.st.tgt*.5;
      await p.evaluate(h=>{const t=h?Math.floor(S.tgt*.55):S.tgt-1;S.score=Math.max(S.score,t-1);if(S.runs<1)S.runs=1;},half);
      const u=await p.evaluate(()=>{S._bestKey=null;const b=bestHint();const cs=b&&b.cards?b.cards:S.hand.filter(c=>!c.seal).slice(0,1);return cs.map(c=>c.uid);});
      await p.evaluate(()=>{S.sel=[];render();});for(const x of u)await clickSel(p,'#hand .card[data-uid="'+x+'"]');await p.waitForTimeout(120);await clickSel(p,'#bPlay');await p.waitForTimeout(700);
      // 머지 창이 뜨면 처리
      for(let k=0;k<6;k++){const m=await tap(p,/머지 완성/)||await clickSel(p,'#panel .elPick')||await clickSel(p,'#panel .campBtn');if(!m)break;await p.waitForTimeout(500);}
      continue;}
    if(/^title/.test(q.scr)){T('타이틀');break;}
    await p.waitForTimeout(350);
  }
  const s=await st(p);const out={tag,secs:((Date.now()-t0)/1000)|0,rounds,endRounds,jang:s.s&&s.s.jang,sawEnd,sawFinale,sawMill2,probs,trail:trail.join('>').slice(-700)};
  console.log('완주 봇',JSON.stringify(out));fs.appendFileSync('full_results.jsonl',JSON.stringify(out)+'\n');if(probs.length)process.exitCode=1;
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
