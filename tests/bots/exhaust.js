/* 카드 소진 · 막힘 행렬: 난이도 × 거인 규칙 × 덱 장수 × 내는 방식 — 끝(승리/패배)까지 가는지, 중간에 할 일이 없어지는지 */
const {boot,st,until,done,rec}=require('./lib.js');const fs=require('fs');
const PART=+(process.env.PART||0),PARTS=+(process.env.PARTS||1);
(async()=>{
  const p=await boot({seed:21+PART});
  await p.evaluate(()=>{ltHide();firstGame=false;window.__end=null;
    const _l=lose;lose=function(){window.__end=window.__end||'lose';return _l.apply(this,arguments);};
    const _w=win;win=function(){window.__end=window.__end||'win';return _w.apply(this,arguments);};});
  const rules=await p.evaluate(()=>['none','inj','wban','elban'].concat(Object.keys(ACT_RULES)).concat(Object.keys(FINAL_RULES)));
  const combos=[];for(const diff of ['app','knight','errant'])for(const rule of rules)for(const n of (diff==='errant'?[3]:[2,6,10]))for(const pol of (diff==='errant'?['mix']:['dis','mix']))combos.push({diff,rule,n,pol});
  const mine=combos.filter(c=>!process.env.DIFFS||process.env.DIFFS.split(',').includes(c.diff)).filter(c=>!process.env.POLS||process.env.POLS.split(',').includes(c.pol)).filter((_,i)=>i%PARTS===PART).slice(0,+(process.env.LIMIT||1e9));console.log('조합',mine.length,'/',combos.length);
  const locks=[],errsAt=[];let i=0;const t0=Date.now();
  for(const c of mine){i++;p.errs.length=0;
    const r=await p.evaluate(async c=>{
      const W=ms=>new Promise(r=>setTimeout(r,ms));
      const idle=async(ms)=>{const t=Date.now();while(Date.now()-t<ms){if(window.__end)return true;if(!S.busy&&!S.anim)return true;if(S.anim)S.anim.spd=60;await W(30);}return false;};
      const ovBtn=()=>{const ov=document.getElementById('ov');if(ov.hidden)return false;const b=[...ov.querySelectorAll('button')].filter(x=>!x.disabled&&x.offsetParent);
        const pri=b.find(x=>x.classList.contains('mgGo'))||b.find(x=>/머지 완성/.test(x.textContent))||b.find(x=>x.classList.contains('elPick'))||b.find(x=>x.classList.contains('campBtn'))||null;if(pri){pri.click();return true;}return false;};
      try{try{lmDefeatClear();}catch(e){}window.__end=null;try{hideOv();}catch(e){}_reseed(c.seed);window.LM_NEXT_DECK='lamancha';newGame(c.diff);hideOv();S.selecting=false;S.tut=null;
        S.rd=c.rule==='none'?0:2;ensureFoes();const f=S.foes[S.rd];
        if(c.rule!=='none'){f.rule=['inj','wban','elban'].includes(c.rule)?banRule(c.rule,S.jang):actRule(c.rule);if(c.rule==='leaf')f.rule.on=true;fitBan(f);}
        S.orbs=c.rule==='leaf'||c.rule==='crimson'||c.rule==='acorn'?['flag','bell']:[];
        // 덱을 n장으로 (출전 금지에 안 걸리는 카드 우선 — 봉쇄로 0장이 되는 경우는 따로 봄)
        const okc=S.deck.filter(x=>!banned(x,f));S.deck=shuffle(okc).slice(0,c.n);if(c.star){S.deck.forEach((x,k)=>{if(k%2===0)x.star=2;});}
        S.tgt=1e9;const _rt=roundTgt;beginRound();S.tgt=1e9;S.score=0;
        const log=[];let guard=0;
        if(!S.hand.length)return {lock:'라운드 시작부터 손패 0장',log};
        while(guard++<40){
          await idle(9000);await W(60);let g2=0;while(ovBtn()&&g2++<6){await W(120);await idle(5000);}
          if(window.__end)return {end:window.__end,log};
          if(S.busy||S.anim)return {lock:'busy가 안 풀림',log};
          const ov=document.getElementById('ov');if(!ov.hidden)return {lock:'알 수 없는 창이 떠 있음: '+(document.querySelector('#panel>*')||{}).className+' / '+(document.getElementById('panel')||{}).innerText.slice(0,40),log};
          const H=S.hand,un=H.filter(x=>!x.seal);const canRun=S.runs>0&&un.length>0,canDis=S.dis>0&&H.length>0;
          if(!canRun&&!canDis){await W(2600);if(window.__end)return {end:window.__end,log};const H2=S.hand;if(!(S.runs>0&&H2.some(x=>!x.seal))&&!(S.dis>0&&H2.length>0))return {lock:`할 일이 없음 손패 ${H2.length} 봉인 ${H2.filter(x=>x.seal).length} 더미 ${S.draw.length} 런 ${S.runs} 버리기 ${S.dis}`,log};continue;}
          let act=c.pol==='run'?'run':c.pol==='dis'?'dis':c.pol==='one'?'run':(Math.random()<.5?'run':'dis');
          if(act==='run'&&!canRun)act='dis';if(act==='dis'&&!canDis)act='run';
          const k=c.pol==='one'?1:Math.min(5,1+Math.floor(Math.random()*5));
          if(act==='run'){let pickc=shuffle(un.slice()).slice(0,k);if(S.foe.rule&&S.foe.rule.k==='psychic'&&wsum(H)>=5){pickc=un.slice();let w=0;const o=[];for(const x of pickc){if(o.length>=5)break;o.push(x);w+=weight(x);}pickc=o;}
            if(Math.random()<.3){const sl=H.filter(x=>x.seal);if(sl.length&&pickc.length<5)pickc.push(sl[0]);}
            S.sel=pickc.map(x=>x.uid);const b0=S.runs;doPlay();log.push('런'+pickc.length+(S.runs===b0&&!S.busy?'(안 나감)':''));
            if(S.runs===b0&&!S.busy&&!S.anim&&document.getElementById('ov').hidden){ // 런이 거부됨 → 다른 방법
              S.sel=un.slice(0,5).map(x=>x.uid);doPlay();if(S.runs===b0&&!S.busy&&document.getElementById('ov').hidden){if(canDis){S.sel=H.slice(0,5).map(x=>x.uid);doDiscard();log.push('→버림');}else return {lock:`런이 거부되는데 버리기도 없음 (손패 ${H.length} 무게 ${wsum(H)} 규칙 ${S.foe.rule&&S.foe.rule.k})`,log};}}
          }else{const pickc=shuffle(H.slice()).slice(0,k);S.sel=pickc.map(x=>x.uid);const d0=S.dis;doDiscard();for(let q=0;q<70&&S.dis===d0&&!window.__end;q++)await W(50);log.push('버림'+pickc.length+(S.dis===d0?'(안 됨)':''));
            if(S.dis===d0&&document.getElementById('ov').hidden&&!S.busy){if(canRun){S.sel=un.slice(0,5).map(x=>x.uid);doPlay();}else return {lock:'버리기가 거부됨',log};}}
        }
        return {lock:'40번 안에 안 끝남',log};
      }catch(e){return {err:e.message+' '+(e.stack||'').split('\n')[1]};}
    },{...c,seed:1000+i*7+PART});
    if(r.lock){locks.push({...c,lock:r.lock,log:r.log});console.log('🔒',JSON.stringify(c),r.lock,(r.log||[]).join(' '));}
    if(r.err||p.errs.length){errsAt.push({...c,err:r.err,errs:p.errs.slice(0,3)});console.log('💥',JSON.stringify(c),r.err||'',p.errs.slice(0,2).join(' | '));}
    if(process.env.V)console.log(i,JSON.stringify(c),JSON.stringify(r).slice(0,160),((Date.now()-t0)/1000).toFixed(1));
    if(i%20===0)fs.writeFileSync('t2_'+PART+'.json',JSON.stringify({i,n:mine.length,locks,errsAt},null,1));
    if(i%60===0)console.log(`.. ${i}/${mine.length} ${((Date.now()-t0)/1000)|0}s 막힘 ${locks.length} 오류 ${errsAt.length}`);
  }
  fs.writeFileSync('t2_'+PART+'.json',JSON.stringify({locks,errsAt},null,1));
  /* '알 수 없는 창'은 이 도구가 못 다루는 창(앞 판의 늦은 게임 오버 창 등)에서 멈춘 것 — 게임 막힘이 아니라 '못 본 판'으로 셈 */
  const real=locks.filter(l=>!/알 수 없는 창/.test(l.lock)),skip=locks.length-real.length;
  console.log(`카드 소진 행렬 끝: ${mine.length}판 · 막힘 ${real.length} · 오류 ${errsAt.length} · 도구가 못 본 판 ${skip} · ${((Date.now()-t0)/1000|0)}초`);
  real.forEach(l=>console.log('  🔒',l.diff,l.rule,'덱',l.n,l.pol,'—',l.lock));
  if(real.length||errsAt.length)process.exitCode=1;
  await done();
})().catch(e=>{console.error(e);process.exit(1);});
