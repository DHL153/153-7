/* ===== 라만차 v3 헤드리스 봇 시뮬레이터 (장난감 v1793191747 규칙을 그대로 옮김, UI 없음) =====
   사용: node sim.js <diff:app|knight|errant> <bot:smart|normal> <games> [endless:0|1]
   환경값: SEED(없음), JMAX(무한 원정 최대 장, 기본 16) */
const ARGV=process.argv.slice(2);
const BAN=(process.env.BAN||'').split(',').filter(Boolean);BAN.forEach(k=>{delete ORBS[k];});
if(process.env.APPXG)DIFF.app.xg=+process.env.APPXG;if(process.env.APPX)DIFF.app.x=+process.env.APPX;if(process.env.KNX)DIFF.knight.x=+process.env.KNX;if(process.env.KNXG)DIFF.knight.xg=+process.env.KNXG;if(process.env.ERX)DIFF.errant.x=+process.env.ERX;if(process.env.ERXG)DIFF.errant.xg=+process.env.ERXG;
const DK=ARGV[0]||'knight', BOT=ARGV[1]||'smart', NG=+(ARGV[2]||100), ENDLESS=+(ARGV[3]||0), JMAX=+(process.env.JMAX||16);

/* ---- 실험 스위치 (2026-10-29) ----
   AFF: base(약점×2·내성×½·고향×1.5) | nohome(고향 없음) | noweak(약점 보너스 없음, 내성×½·고향×1.5 유지) | none(상성·고향 모두 없음) | debuff(약점 없음 · 내성×½ · 고향 아닌 세계×0.75)
   ENEMY: cur | off(의도 없음) | x2(의도 대상 수 2배) | heal(죽이지 못한 런마다 적이 목표의 20% 회복)
   TMUL: 모든 목표 배수 */
const AFF=process.env.AFF||'base', ENEMY=process.env.ENEMY||'cur', TMUL=+(process.env.TMUL||1);
if(process.env.STARW3)STAR_W[3]=+process.env.STARW3;if(process.env.STARX){const [a,b]=process.env.STARX.split(',').map(Number);STAR_X[2]=a;STAR_X[3]=b;MIX_X[2]=a*0.8;MIX_X[3]=b*0.75;}
if(ENEMY==='x2')FOE_ATK.splice(0,3,2,3,4);

/* ---- 열쇠 3개 실험 (2026-10-29): 라운드의 세계 · 빌런 약점 속성 · 주인공 이름 ----
   KEYS: off | mul(열쇠 하나마다 ×2) | cap3(세 열쇠를 다 맞춘 런만 갑옷 관통 — 아니면 런 점수 상한 CAPF×목표)
         | cap2(열쇠 2개 이상이면 관통) | capk(열쇠 수만큼 상한이 올라감 0:20% 1:35% 2:60% 3:없음) */
const KEYS='live';
/* ---- 관문(GATE) 실험 (2026-10-29 강인도 검토) ----
   none: 상한 없음 | cap: 지금(한 번 55%, 3개 = 관통)
   tough: 강인도 — TGH='3,4,5'(졸개·기사·거인) · 런마다 맞춤 수만큼 깎음 · PRE(브레이크 전 피해 배율, 'cap'이면 55% 상한)
          BRK=now(깨는 런부터 전부)|next(다음 런부터) · GROG(그로기 배율) · GN(그로기 런 수) · REG(재브레이크마다 강인도 +) · KV(봇이 맞춤 1개에 주는 가치, 목표 대비) */
const GATE=process.env.GATE||'cap', TGH=(process.env.TGH||'3,4,5').split(',').map(Number), PRE=process.env.PRE||'0.5', BRK=process.env.BRK||'next', GROG=+(process.env.GROG||1.5), GN=+(process.env.GN||1), REG=+(process.env.REG||1), KV=+(process.env.KV||0.08), HITF=+(process.env.HITF||0.55);
const nKeys=r=>r&&r.keys?r.keys.n:0;
/* ---- 2단 게이지(방패 바 + HP 바) 실험 (2026-10-29 '전투 시스템 밸런스 및 UI 개편 기획') ----
   GATE=bar · BF(방패 = 적 체력 × BF) · PIER(맞춤 0~3개 관통률) · BMODE=ratio(관통률만큼 HP로 바로) | prob(관통률 = 확률, 실패하면 방패만)
   방패가 깨지면: 피해 증가(1 + 관통률) · BV(봇이 방패 피해 1에 주는 가치) */
const BF=+(process.env.BF||0.1), PIER=(process.env.PIER||'0,0.25,0.5,0.75').split(',').map(Number), BMODE=process.env.BMODE||'ratio', BV=+(process.env.BV||0.6);
/* ---- 방패 에너지 (2026-10-30 B안, 지금 게임): GATE=energy · SF(방패 = 목표 × SF, 기본 0.55) · 공격은 방패부터 깎고 남은 만큼 몸체로 · 다시 차지 않음 · 3개 = 관통(방패 즉시 0, 전부 몸체로) */
const SF=+(process.env.SF||2),EV=+(process.env.EV||0.6);
const CAPB=+(process.env.CAPB||0.6);   // 방패가 남아 있는 동안 한 번에 몸체로 들어가는 최대 (목표 대비, 0 = 제한 없음)
const EMODE=process.env.EMODE||'hold';   // first: 방패부터 깎고 남은 게 몸체 | over: 몸체는 한 번 CAPB까지, 넘친 만큼 방패가 막으며 깎임 (방패가 0이면 그다음부터 전부)
function energyHit(raw,n,sh){if(sh<=0)return {d:raw,ab:0,sh:0};if(n>=3)return {d:raw,ab:0,sh:0,brk:true};
  if(EMODE==='hold'){const cap=Math.max(10,Math.floor(S.tgt*CAPB/10)*10),d0=Math.min(raw,cap),ab=Math.min(sh,raw-d0);return {d:d0,ab,sh:sh-ab};}   // hold: 깨지는 그 공격까지는 막아 줌
  if(EMODE==='over'){const cap=Math.max(10,Math.floor(S.tgt*CAPB/10)*10),d0=Math.min(raw,cap),over=raw-d0,ab=Math.min(sh,over);return {d:d0+(over-ab),ab,sh:sh-ab};}
  if(EMODE==='ratio'){const RA=+(process.env.RA||0.5),ab=Math.min(sh,Math.floor(raw*RA));let d=raw-ab;if(CAPB>0)d=Math.min(d,Math.max(10,Math.floor(S.tgt*CAPB/10)*10));return {d,ab,sh:sh-ab};}   // ratio: 매 공격 RA만큼 방패가 먼저 받음(방패부터 줄어 보임) · 나머지는 몸체(방패 있는 동안 한 번 CAPB까지)
  const ab=Math.min(sh,raw);let d=raw-ab;if(CAPB>0)d=Math.min(d,Math.max(10,Math.floor(S.tgt*CAPB/10)*10));return {d,ab,sh:sh-ab};}
const unbon=(raw,n)=>Math.round(raw/(1+ARMOR_BON[n]));
function barHit(raw,n,bar,rnd){const D=unbon(raw,n),p=PIER[n];
  if(bar<=0)return {hp:Math.floor(D*(1+p)),bar:0,brk:false,post:true,ehp:Math.floor(D*(1+p)),ebar:0};
  if(BMODE==='prob'){const b=Math.min(D,bar),hpOk=D-b;const ok=rnd!=null&&rnd<p;return {hp:ok?hpOk:0,bar:b,brk:bar-b<=0,ehp:p*hpOk,ebar:b,ok};}
  const h=Math.floor(D*p),b=Math.min(D-h,bar);return {hp:h,bar:b,brk:bar-b<=0,ehp:h,ebar:b};}

const capOf=()=>Math.max(10,Math.floor(S.tgt*HITF/10)*10);
function effDmg(raw,n,st){ // 상태 st={tgh,grog}에서 이 런 피해
  if(GATE==='none')return {d:raw,brk:false};
  if(GATE==='cap')return {d:n>=3?raw:Math.min(raw,capOf()),brk:n>=3};
  if(st.grog>0)return {d:Math.floor(raw*GROG),brk:false,g:true};
  const willBreak=st.tgh-n<=0;
  const pre=PRE==='cap'?Math.min(raw,capOf()):Math.floor(raw*+PRE);
  if(willBreak&&BRK==='now')return {d:raw,brk:true};
  return {d:pre,brk:willBreak};}
const isKey=c=>{const f=S.foe;if(!f)return 0;const x=keyHit(c,f);return (x.w?1:0)+(x.e?1:0)+(x.h?1:0);};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const sellPrice=k=>Math.max(1,ORBS[k].cost-1)*((S.ost&&S.ost[k])||1);
const orbKind=k=>ORB_MUL.includes(k)?'mul':ORB_ADD.includes(k)?'add':'card';
const bestOrder=()=>{const r={card:0,add:1,mul:2};return S.orbs.slice().sort((a,b)=>r[orbKind(a)]-r[orbKind(b)]);};
const price=c=>Math.max(1,Math.round(c*(1-(S.disc||0))));
const wsum=cs=>cs.reduce((s,c)=>s+weight(c),0);
const hurtCount=()=>({w:S.deck.filter(c=>c.out).length,s:S.deck.filter(c=>c.st&&c.st.hit).length});
let S;
/* ---------- 통계 ---------- */
const ST={tier:{},games:0,clear:0,deathJ:{},rounds:0,runsUsed:0,disUsed:0,firstRunWin:0,camp:0,sleep:0,merges:0,
  overRatio:[],      // 라운드 최고 한 방 / 목표
  winRunRatio:{},    // 장별: 이긴 라운드의 마지막 한 방 / 목표 (중간값)
  bestHandJ:{},      // 장별 최고 한 방
  tgtJ:{},
  htWin:{},          // 이긴 런의 주 족보
  orbOwned:{},
  endlessJ:[],
  closeLoss:0,lossRatio:[], // 진 라운드 점수/목표
  runsLeftAtWin:[],
  bigHit:0,keyFinish:0,closeWin:0,wins:0,intentRuns:0,intentChanged:0,wounds:0,scars:0,healLost:0,          // 한 방이 목표 이상 (한 방에 끝)
};
const push=(o,k,v)=>{(o[k]=o[k]||[]).push(v);};
/* ---------- 새 판 ---------- */
function pickVoucher(){const pool=Object.keys(VOUCH).filter(k=>!S.vouch.includes(k)&&(!VOUCH[k].base||S.vouch.includes(VOUCH[k].base))&&!VOUCH[k].unlock);return pool.length?pool[Math.random()*pool.length|0]:null;}
function newGame(diff){
  const deck=makeDeck();
  S={jang:1,rd:0,deck,draw:[],hand:[],sel:[],gold:4,orbs:[],merges:0,lv:{},vouch:[],grow:0,ost:{},runsMax:+(process.env.RUNS||4),disMax:+(process.env.DIS||4),handN:8,maxOrb:5,rerollBase:2,interestMax:5,uid:deck.length,diff,score:0,usedHT:[],recent:[]};
  S.voucherOffer=pickVoucher();
}
function ensureFoes(){if(!S.foes||S.foesJang!==S.jang){S.foes=S.foesNext||makeFoes(JANG_WORLD(S.jang),S.jang,S.diff);S.foesNext=null;S.foesJang=S.jang;}S.foes.forEach(f=>{if(!f.hero)f.hero=NAMES[Math.random()*NAMES.length|0][0];});S.foe=S.foes[S.rd];}
const roundTgt=r=>Math.round(TMUL*tgtFor(Math.max(1,S.jang-(S.tgtShift||0)),r,S.diff)*ruleTx(S.foes&&S.foes[r])*(S.foes&&S.foes[r]&&S.foes[r].bandit?1.3:1)/10)*10;
function fill(first){const R=S.foe&&S.foe.rule,fog=R&&R.k==='fog',lim=!first&&R&&R.k==='serpent'?3:99;let n=0;
  while(S.hand.length<(S.handNow||S.handN)&&S.draw.length&&n<lim){const c=S.draw.pop();n++;if(fog&&Math.random()<0.3)c.fog=true;S.hand.push(c);}}
function bossTick(){const K=S.foe&&S.foe.rule&&S.foe.rule.k;
  if(K==='crimson'&&S.orbs.length)S.offOrb=S.orbs[Math.random()*S.orbs.length|0];
  if(K==='bell'){if(!S.hand.some(c=>c.uid===S.forced)&&S.hand.length)S.forced=S.hand[Math.random()*S.hand.length|0].uid;}}
function rollIntent(){const f=S.foe;if(!f)return;if(ENEMY==='off'){f.atype=null;S.marks=[];return;}const ks=f.ints||[f.atype];f.atype=ks[Math.random()*ks.length|0];
  S.marks=f.atype==='mark'?shuffle(S.hand.filter(c=>!c.fog)).slice(0,f.atk+1).map(c=>c.uid):[];}
const NOMC=+(process.env.NOMC||0);
const ctxFor=(held,mcombo)=>({mcombo:NOMC?0:(S.runMerges||0)+(mcombo||0),bonusMult:S.nextMult||0,orbs:S.offOrb?S.orbs.filter(k=>k!==S.offOrb):S.orbs,merges:S.merges+(mcombo||0),discards:S.dis,lv:S.lv,runsLeft:S.runs,grow:S.grow,deck:S.deck.length,foe:S.foe,usedHT:S.usedHT,lockHT:S.lockHT,scoringOnly:true,ost:S.ost,runsMax:S.runsMax,discCount:S.discCount||0,held,ostate:S.ostate||{},gold:S.gold,rng:()=>S.rv==null?(S.rv=Math.random()):S.rv});
function woundC(cs){cs.forEach(c=>{c.out=true;});S.hand=S.hand.filter(c=>!c.out);}
function scarC(c,p){c.st=c.st||{};c.st.hit=(c.st.hit||0)+Math.max(1,Math.round(power(c)*p));}
function foeStrike(played){
  const f=S.foe;if(!f||!f.atype)return;const k=f.atype,n=f.atk,bp=(a,b)=>battlePower(b,f)-battlePower(a,f)||b.uid-a.uid;let hit=[];
  if(k==='counter'){if(wsum(played)>=5){hit=played.filter(c=>S.deck.includes(c)).sort((a,b)=>power(b)-power(a)).slice(0,n);woundC(hit);ST.wounds+=hit.length;}}
  if(k==='mark'){hit=(S.marks||[]).map(u=>S.deck.find(c=>c.uid===u)).filter(c=>c&&!played.includes(c));woundC(hit);ST.wounds+=hit.length;}
  if(k==='slash'){hit=S.hand.slice().sort(bp).slice(0,n);hit.forEach(c=>scarC(c,SCAR.slash));ST.scars+=hit.length;}
  if(k==='fog'){hit=played.filter(c=>S.deck.includes(c));hit.forEach(c=>scarC(c,SCAR.fog));ST.scars+=hit.length;}
  S.marks=[];}
/* ---------- 머지 ---------- */
function chooseKeep(a,b){ // 남길 속성: 빌런 약점이면 그쪽, 아니면 내성 피하기 / 세계: 고향이면 그쪽
  const f=S.foe;const es=[a.el,b.el],ws=[cardW(a),cardW(b)];
  const e=es.sort((x,y)=>matchX(y,f)-matchX(x,f))[0];
  const w=ws.includes(f&&f.home)?f.home:ws[0];return [e,w];}
function doMergePair(a,b){const [e,w]=chooseKeep(a,b);const sick=c=>c.st&&(c.st.hit||c.st.psn);
  applyMerge(a,b,e,w);S.deck.splice(S.deck.indexOf(b),1);const hi=S.hand.indexOf(b);if(hi>=0)S.hand.splice(hi,1);
  S.merges++;S.roundMerges++;S.runMerges=(S.runMerges||0)+1;ST.merges++;
  if(a.star===3&&!a.aw)a.aw=pickAw(a);
  if(S.orbs.includes('trader'))S.gold+=(S.ost.trader||1);}
const pickAw=c=>{const n=TYPES[c.id].n;return ({alonso:'A',dulcine:'A',sancho:'A',rosi:'A',lucia:'A',bruno:'B',nicole:'A',carden:'B',palome:'A',gris:'A'})[n]||'A';};
/* 미리보기: 고른 카드를 복사본으로 머지 & 런 처리 */
function previewMerge(cs){
  if(!mergeRun()||(S.foe&&S.foe.rule&&S.foe.rule.k==='nomerge'))return {cards:cs,m:0};
  let a=cs.map(c=>({...c,_o:c})),did=true,m=0;
  while(did){did=false;for(const want of ['up','mix']){for(let i=0;i<a.length&&!did;i++)for(let j=0;j<a.length;j++){if(i!==j&&!a[i].fog&&!a[j].fog&&mergeKind(a[i],a[j])===want){const [e,w]=chooseKeep(a[i],a[j]);applyMerge(a[i],a[j],e,w);if(a[i].star===3&&!a[i].aw)a[i].aw=pickAw(a[i]);a.splice(j,1);did=true;m++;break;}}if(did)break;}}
  return {cards:a,m};}
const mergeRun=()=>DIFF[S.diff].mergeRun;
/* ---------- 손패 평가 ---------- */
function combos(n,k){const out=[];const rec=(s,acc)=>{if(acc.length)out.push(acc.slice());if(acc.length===k)return;for(let i=s;i<n;i++){acc.push(i);rec(i+1,acc);acc.pop();}};rec(0,[]);return out;}
const COMB={};const combosOf=n=>COMB[n]||(COMB[n]=combos(n,5));
function harm(sel,rest){ // 의도 피해 추정 (힘 합) — 똑똑한 봇만 피함
  const f=S.foe;if(!f||!f.atype)return 0;const n=f.atk,k=f.atype;
  const pv=c=>Math.max(1,power(c));
  if(k==='counter')return wsum(sel)>=5?sel.slice().sort((a,b)=>power(b)-power(a)).slice(0,n).reduce((s,c)=>s+pv(c)*1.0,0):0;
  if(k==='mark')return (S.marks||[]).map(u=>rest.find(c=>c.uid===u)).filter(Boolean).reduce((s,c)=>s+pv(c),0);
  if(k==='slash')return rest.slice().sort((a,b)=>battlePower(b,f)-battlePower(a,f)).slice(0,n).reduce((s,c)=>s+pv(c)*0.3,0);
  if(k==='fog')return sel.reduce((s,c)=>s+pv(c)*0.2,0);
  return 0;}
function bestPlay(){
  const H=S.hand,forced=S.forced,R=S.foe&&S.foe.rule,psy=R&&R.k==='psychic'&&wsum(H)>=5;let best=null;
  for(const idx of combosOf(H.length)){
    const sel=idx.map(i=>H[i]);if(forced!=null&&!sel.some(c=>c.uid===forced)&&H.some(c=>c.uid===forced))continue;
    if(psy&&wsum(sel)<5)continue;
    const rest=H.filter(c=>!sel.includes(c));const pm=previewMerge(sel);
    const r=score(pm.cards,ctxFor(rest,pm.m));r.raw2=r.total;const n=nKeys(r);if(GATE==='energy'){const h=energyHit(r.total,n,S.gs.sh);r.total=h.d;r.util=h.d+(BOT==='smart'?EV:1)*h.ab;}else if(GATE==='bar'){const h=barHit(r.total,n,S.gs.bar,null);r.total=Math.floor(h.ehp);r.util=h.ehp+(BOT==='smart'?BV:1)*h.ebar;}else{const e=effDmg(r.total,n,S.gs);r.total=e.d;r.util=e.d+(GATE==='tough'&&S.gs.grog<=0&&BOT==='smart'?Math.min(n,S.gs.tgh)*KV*S.tgt:0)+(GATE==='cap'&&BOT==='smart'?0:0);}
    const h=BOT==='smart'?harm(sel,rest):0;
    const v={sel,total:r.total,r,h,m:pm.m};
    if(!best||(v.r.util)>(best.r.util))best=v;
    v.next=null;(bestPlay._all=bestPlay._all||[]).push(v);
  }
  const all=bestPlay._all;bestPlay._all=null;return {best,all};}
/* 견습: 손패에서 언제든 머지 (런 1번 아님) — 순수 먼저, 높은 번호 먼저 */
function appMerges(){
  if(mergeRun()||(S.foe&&S.foe.rule&&S.foe.rule.k==='nomerge'))return;
  let did=true;while(did){did=false;
    for(const want of ['up','mix']){const H=S.hand.filter(c=>!c.fog).sort((a,b)=>BASE_POW[TYPES[b.id].n]-BASE_POW[TYPES[a.id].n]);
      for(const a of H){for(const b of H){if(a!==b&&mergeKind(a,b)===want){doMergePair(a,b);did=true;break;}}if(did)break;}if(did)break;}}}
/* ---------- 한 라운드 ---------- */
function playRound(){
  ensureFoes();S.score=0;S.tgt=roundTgt(S.rd);if(S.rd===0)S.playedJang=[];
  const f=S.foe,R=f.rule,K=R&&R.k;if(K==='pillar')R.uids=(S.playedJang||[]).slice();
  S.draw=shuffle(S.deck.filter(c=>!banned(c,f)&&!c.out));
  S.hand=[];S.runs=K==='needle'?1:S.runsMax;S.dis=K==='water'?0:S.disMax;S.handNow=S.handN-(K==='manacle'?1:0);S.roundMerges=0;S.discCount=0;S.offOrb=null;S.forced=null;S.ostate=S.ostate||{};S.runMerges=0;S.nextMult=0;
  {const di=S.orbs.indexOf('dagger');if(di>=0&&di<S.orbs.length-1){const v=S.orbs[di+1],gain=2*sellPrice(v);S.ostate.dagger=(S.ostate.dagger||0)+gain;delete S.ost[v];S.orbs.splice(di+1,1);}}
  if(K==='acorn')S.orbs=shuffle(S.orbs);
  if(K==='leaf'){R.on=S.orbs.length>0;if(R.on&&BOT==='smart'){const i=S.orbs.map((k,i)=>[sellPrice(k),i]).sort((a,b)=>a[0]-b[0])[0][1];S.gold+=sellPrice(S.orbs[i]);delete S.ost[S.orbs[i]];S.orbs.splice(i,1);R.on=false;}}
  S.deck.forEach(c=>{delete c.fog;if(c.st){delete c.st.psn;delete c.st.pd;}});S.usedHT=[];S.lockHT=null;S.marks=[];
  fill(true);if(K==='house')S.hand.forEach(c=>c.fog=true);rollIntent();bossTick();
  let roundBest=0,runs0=S.runs,dis0=S.dis,nRun=0;S.gs={tgh:TGH[S.rd],grog:0,brks:0,bar:Math.round(BF*S.tgt),sh:Math.max(10,Math.floor(S.tgt*SF/10)*10)};S.rawBest=0;S.firstRaw=null;S.brkDmg=0;S.allDmg=0;
  for(let guard=0;guard<60;guard++){
    appMerges();
    if(!S.hand.length){break;}
    const {best,all}=bestPlay();if(!best)break;
    const need=S.tgt-S.score;
    let pick=best;
    // 이길 수 있는 조합 중 피해가 가장 적은 것
    const wins=all.filter(v=>v.total>=need);
    if(wins.length&&BOT==='smart'){pick=wins.sort((a,b)=>a.h-b.h||b.total-a.total)[0];}
    else if(!wins.length){
      // 못 이기면: 버리기 여유가 있고, 지금 최선이 남은 런 몫에 크게 못 미치면 버림
      const pace=need/Math.max(1,S.runs);
      if(S.dis>0&&best.total<pace*(BOT==='smart'?+(process.env.DISC||1.4):0.6)){
        if(discard(best.sel))continue;}
      if(BOT==='smart'){ // 피해 고려 (점수 1당 힘 피해 환산 — 남은 런이 많을 때만)
        const cand=all.filter(v=>v.total>=best.total*0.85);pick=cand.sort((a,b)=>(b.total-b.h*need*0.002)-(a.total-a.h*need*0.002))[0]||best;}
    }
    if(S.foe.atype){ST.intentRuns++;if(pick.sel.map(c=>c.uid).sort().join()!==best.sel.map(c=>c.uid).sort().join())ST.intentChanged++;}
    nRun++;doRun(pick);roundBest=Math.max(roundBest,pick.r.total);
    if(S.score>=S.tgt)break;
    {const GK=S.foe.rule&&S.foe.rule.k,skip=S.gs.skipRule;S.gs.skipRule=false;
     if(!skip){if(GK==='riposte'&&S.lastN<=1&&S.runs>0)S.runs--;if(GK==='regen'&&S.score>0)S.score-=Math.min(S.score,Math.round(S.tgt*0.1));
      if(GK==='rekey'){const f=S.foe;if(Math.random()<0.5){const o=WORLDS.filter(w=>w!==f.home);f.home=o[Math.random()*o.length|0];}else{const o=ELS.filter(e=>e!==f.el);f.el=o[Math.random()*o.length|0];}}}}
    if(ENEMY==='heal'){const h=Math.min(S.score,Math.round(S.tgt*0.2));S.score-=h;ST.healLost+=h/S.tgt;}
    if(S.runs<=0)break;
    if(K==='hook'&&S.hand.length){const out=shuffle(S.hand.slice()).slice(0,2);S.hand=S.hand.filter(c=>!out.includes(c));}
    fill();rollIntent();bossTick();
  }
  const won=S.score>=S.tgt;
  ST.rounds++;ST.runsUsed+=runs0-S.runs;ST.disUsed+=dis0-S.dis;if(won&&nRun===1)ST.firstRunWin++;
  ST.overRatio.push(roundBest/S.tgt);push(ST.bestHandJ,S.jang,roundBest);push(ST.tgtJ,S.jang,S.tgt);
  {const T=GATE==='tough';push(ST.tier,'x',{b:S.firstRaw/S.tgt,peak:S.rawBest/S.tgt,runs:won?nRun:9,won,brks:S.gs.brks,bshare:S.allDmg?S.brkDmg/S.allDmg:0,rd:S.rd,j:S.jang});}
  if(won){ST.wins++;if(S.score/S.tgt<1.25)ST.closeWin++;ST.runsLeftAtWin.push(S.runs);if(roundBest>=S.tgt)ST.bigHit++;}
  else ST.lossRatio.push(S.score/S.tgt);
  return won;
}
function discard(keepSel){
  // 버리기: 최선 조합 밖의 카드 중 가치 낮은 것 (같은 이름 · 속성 · 세계가 겹칠수록 가치 ↑)
  const H=S.hand;const cnt=(f,v)=>H.filter(c=>f(c)===v).length;
  const val=c=>(KEYS!=='off'?25*isKey(c):0)+battlePower(c,S.foe)+18*(cnt(x=>TYPES[x.id].n,TYPES[c.id].n)-1)+4*(cnt(x=>x.el,c.el)-1)+4*(cnt(cardW,cardW(c))-1)+(c.star-1)*40+((S.marks||[]).includes(c.uid)?-5:0);
  let pool=H.filter(c=>!keepSel.includes(c)&&c.uid!==S.forced);
  if(BOT==='normal')pool=H.filter(c=>c.uid!==S.forced);
  pool.sort((a,b)=>val(a)-val(b));const out=pool.slice(0,Math.min(5,pool.length,Math.max(1,H.length-3)));
  if(!out.length)return false;
  const br=out.filter(c=>S3(c,'bruno')).length,brB=out.filter(c=>S3B(c,'bruno')).length;if(brB)S.nextMult=(S.nextMult||0)+6*brB;
  if(S.orbs.includes('diary')){S.ostate.diary=(S.ostate.diary||0)+3*out.length;}if(br)S.gold+=3*br;
  S.hand=S.hand.filter(c=>!out.includes(c));S.discCount=(S.discCount||0)+out.length;S.dis--;fill();bossTick();return true;}
function doRun(pick){
  let cards=pick.sel.slice();
  // 머지 & 런: 실제로 합침
  if(mergeRun()&&!(S.foe.rule&&S.foe.rule.k==='nomerge')){let did=true;while(did){did=false;for(const want of ['up','mix']){for(const a of cards){for(const b of cards){if(a!==b&&!a.fog&&!b.fog&&mergeKind(a,b)===want){doMergePair(a,b);cards=cards.filter(c=>c!==b);did=true;break;}}if(did)break;}if(did)break;}}}
  const RK=S.foe.rule&&S.foe.rule.k;
  if(RK==='arm'){const h=handInfo(cards).ht;if((S.lv[h]||1)>1)S.lv[h]--;}
  const rest=S.hand.filter(c=>!cards.includes(c));
  const r=score(cards,ctxFor(rest,0));const raw=r.total,n=nKeys(r);S.lastN=n;if(S.firstRaw==null)S.firstRaw=raw;S.rawBest=Math.max(S.rawBest,raw);
  const g=S.gs;let e;if(GATE==='energy'){const h=energyHit(raw,n,g.sh);if(g.sh>0&&h.sh<=0)g.brks++;g.sh=h.sh;e={d:h.d};if(h.brk||h.ab===0)S.brkDmg+=h.d;}else if(GATE==='bar'){const h=barHit(raw,n,g.bar,Math.random());e={d:h.hp};if(h.post)S.brkDmg+=h.hp;g.bar-=h.bar;if(h.brk&&g.bar<=0){g.brks++;}ST.barRuns=(ST.barRuns||0)+(h.post?0:1);ST.barBlockedRuns=(ST.barBlockedRuns||0)+(!h.post&&h.hp===0&&unbon(raw,n)>0?1:0);if(BMODE==='prob'&&!h.post&&PIER[n]>0){ST.rolls=(ST.rolls||0)+1;ST.rollFail=(ST.rollFail||0)+(h.ok?0:1);}}else e=effDmg(raw,n,g);r.total=e.d;S.allDmg+=e.d;
  if(GATE==='tough'){if(g.grog>0){S.brkDmg+=e.d;g.grog--;if(g.grog<=0){g.tgh=TGH[S.rd]+REG*g.brks;}}
    else{g.tgh-=n;if(g.tgh<=0){g.brks++;g.grog=GN;g.skipRule=true;if(BRK==='now')S.brkDmg+=e.d;}}}
  if(GATE==='cap'&&n>=3)S.brkDmg+=e.d;
  if(process.env.DECOMP&&r.total>0){const C=()=>ctxFor(rest,0),cp=()=>cards.map(c=>({...c}));
    const f=(o)=>Math.max(1,score(cp(),{...C(),...o}).total);
    const noOrb=f({orbs:[]}),noFoe=f({foe:null}),noMc=f({mcombo:0}),flat=f({orbs:[],foe:null,mcombo:0,lv:{}});
    const star1=score(cards.map(c=>({...c,star:1,mixed:false,aw:null})),{...C(),orbs:[],foe:null,mcombo:0,lv:{}}).total||1;
    (ST.dec=ST.dec||{});const D=ST.dec[S.jang]=ST.dec[S.jang]||{orb:[],foe:[],mc:[],lv:[],star:[]};
    D.orb.push(r.total/noOrb);D.foe.push(r.total/noFoe);D.mc.push(r.total/noMc);D.star.push(flat/Math.max(1,star1));D.lv.push(f({orbs:[],foe:null,mcombo:0})/flat);}
  S.runMerges=0;S.nextMult=0;
  S.playedJang=(S.playedJang||[]).concat(cards.map(c=>c.uid));S.htCount=S.htCount||{};S.htCount[r.ht]=(S.htCount[r.ht]||0)+1;
  cards.forEach(c=>delete c.fog);if(!r.block){S.usedHT.push(r.ht);if(!S.lockHT)S.lockHT=r.ht;}
  if(S.orbs.includes('grow'))S.grow+=8;S.runs--;S.hand=S.hand.filter(c=>!cards.includes(c));
  S.score+=r.total;S.rv=null;
  S.recent.push(cards.map(c=>({...c})));if(S.recent.length>14)S.recent.shift();
  if(r.osUp&&!r.block){for(const k in r.osUp){S.ostate[k]=Math.round(((S.ostate[k]||0)+r.osUp[k])*100)/100;}}
  if(r.disUp)S.dis+=r.disUp;
  for(let q=0;q<(r.promote||0);q++){const pool=S.deck.filter(c=>c.star===1);if(pool.length){pool[Math.random()*pool.length|0].star=2;}}
  for(let q=0;q<(r.orbUp||0);q++){if(Math.random()<0.25){const o=S.orbs.filter(k=>(S.ost[k]||1)<3&&k!=='advice');if(o.length){const k=o[Math.random()*o.length|0];S.ost[k]=(S.ost[k]||1)+1;}}}
  if(r.gold3)S.gold+=r.gold3;
  if(r.lvUp&&!r.block)S.lv[r.lvUp]=(S.lv[r.lvUp]||1)+1;
  if(S.score>=S.tgt)(ST.htWinRun=ST.htWinRun||{})[r.ht]=((ST.htWinRun||{})[r.ht]||0)+1;
  foeStrike(cards);
}
/* ---------- 보상 · 원정 캠프 ---------- */
function cashOut(){const base=REWARD[S.rd],left=S.runs,intr=Math.min(S.interestMax,Math.floor(S.gold/5));let sum=base+left+intr;
  if(S.foe&&S.foe.bandit)sum+=S.foe.bandit;if(S.orbs.includes('horse'))sum+=4*(S.ost.horse||1);S.gold+=sum;}
function rollTop(){
  const taken=[];const pick=()=>{const roll=Math.random(),O0=rarityOdds(S.jang),H=S.hone||1,O={r:Math.min(0.5,O0.r*H),u:Math.min(0.6,O0.u*Math.sqrt(H))},r=roll<O.r?'r':roll<O.r+O.u?'u':'c';const pool=Object.keys(ORBS).filter(k=>(!S.orbs.includes(k)||((S.ost[k]||1)<3&&k!=='advice'))&&ORBS[k].r===r&&!taken.includes(k)&&(k!=='advice'||DIFF[S.diff].shopAdvice));const k=pool.length?pool[Math.random()*pool.length|0]:Object.keys(ORBS).find(k=>!S.orbs.includes(k)&&!taken.includes(k)&&k!=='advice');taken.push(k);return k;};
  const pool=Array.from({length:S.shopN||2},pick);
  const fav=Object.entries(S.htCount||{}).sort((a,b)=>b[1]-a[1])[0];
  const book=S.vouch.includes('scope')&&fav?fav[0]:HT_ORDER[Math.random()*HT_ORDER.length|0];
  S.top=pool.map(k=>{const pre=k!=='advice'&&Math.random()<0.05*(S.hone||1);return {kind:'orb',k,pre,cost:price(Math.ceil(ORBS[k].cost*(pre?1.6:1)))};}).concat([{kind:'book',k:book,cost:price(3)}]);
  if(S.vouch.includes('market')){const id=TYPE_IDS[Math.random()*TYPE_IDS.length|0];S.top.push({kind:'card',id,el:TYPES[id].els[Math.random()*TYPES[id].els.length|0],star:S.vouch.includes('market2')&&Math.random()<0.3?2:1,cost:price(3)});}
}
function applyVoucher(k){
  if(k==='run')S.runsMax++;if(k==='dis')S.disMax++;if(k==='hand')S.handN++;if(k==='slot')S.maxOrb++;
  if(k==='reroll'){S.rerollBase=Math.max(0,S.rerollBase-1);}
  if(k==='vault')S.interestMax=10;if(k==='run2')S.runsMax++;if(k==='dis2')S.disMax++;if(k==='hand2')S.handN++;if(k==='slot2')S.maxOrb++;
  if(k==='vault2')S.interestMax=20;if(k==='stock')S.shopN=3;if(k==='stock2')S.shopN=4;if(k==='sale')S.disc=0.25;if(k==='sale2')S.disc=0.5;
  if(k==='hone')S.hone=2;if(k==='hone2')S.hone=4;
  if(k==='sand'){S.tgtShift=(S.tgtShift||0)+1;S.runsMax=Math.max(1,S.runsMax-1);}if(k==='sand2'){S.tgtShift=(S.tgtShift||0)+1;S.disMax=Math.max(0,S.disMax-1);}
  if(k==='campv')S.campMax=3;}
/* 구슬 가치: 최근 낸 손패(최대 14개)를 지금 구슬로 다시 계산한 평균 점수 */
function evalOrbs(orbs,ost){const save=[S.orbs,S.ost];S.orbs=orbs;S.ost=ost||S.ost;let tot=0;const H=S.recent.length?S.recent:[makeDeck().slice(0,5)];
  for(const cs of H){const r=score(cs.map(c=>({...c})),{...ctxFor([],0),foe:null,orbs,ost:S.ost,runsLeft:2});tot+=Math.log(1+r.total);} S.orbs=save[0];S.ost=save[1];return tot/H.length;}
const ordered=o=>{const r={card:0,add:1,mul:2};return o.slice().sort((a,b)=>r[orbKind(a)]-r[orbKind(b)]);};
function shop(){
  S.rerollCost=S.rerollBase;rollTop();let packSold=false;
  const smart=(process.env.SHOPBOT||BOT)==='smart';
  for(let step=0;step<12;step++){
    let acted=false;
    // 증서: 런 · 버리기 · 손패 · 구슬칸 · 이자 우선
    if(S.voucherOffer&&S.gold>=price(VOUCH_COST)+(smart?2:0)){const good=['run','dis','hand','slot','vault','hand2','slot2','run2','dis2','stock','hone','sale','campv','reroll','scope','market','flagv'];
      if(!smart||good.includes(S.voucherOffer)){S.gold-=price(VOUCH_COST);S.vouch.push(S.voucherOffer);applyVoucher(S.voucherOffer);S.voucherOffer=null;acted=true;}}
    // 구슬
    for(const it of S.top){if(it.sold||it.kind!=='orb'||it.k==='advice'&&smart)continue;if(S.gold<it.cost)continue;
      const has=S.orbs.includes(it.k);
      if(smart){const cur=evalOrbs(ordered(S.orbs));
        if(has){const ost={...S.ost,[it.k]:Math.min(3,(S.ost[it.k]||1)+(it.pre?2:1))};const g=evalOrbs(ordered(S.orbs),ost)-cur;if(g>0.08){S.gold-=it.cost;S.ost=ost;it.sold=true;acted=true;}continue;}
        if(S.orbs.length<S.maxOrb){const no=ordered(S.orbs.concat([it.k]));const g=evalOrbs(no)-cur;if(g>0.05){S.gold-=it.cost;S.orbs=no;if(it.pre)S.ost[it.k]=2;it.sold=true;acted=true;}}
        else{ // 가장 약한 구슬과 바꾸기
          let worst=null;for(const o of S.orbs){const w=S.orbs.filter(x=>x!==o);const v=evalOrbs(ordered(w.concat([it.k])));if(!worst||v>worst.v)worst={o,v};}
          if(worst&&worst.v-cur>0.12){S.gold+=sellPrice(worst.o);delete S.ost[worst.o];S.orbs=ordered(S.orbs.filter(x=>x!==worst.o).concat([it.k]));S.gold-=it.cost;if(it.pre)S.ost[it.k]=2;it.sold=true;acted=true;}}
      }else{ if(has){S.gold-=it.cost;S.ost[it.k]=Math.min(3,(S.ost[it.k]||1)+1);it.sold=true;acted=true;}
        else if(S.orbs.length<S.maxOrb&&Math.random()<0.7){S.gold-=it.cost;S.orbs.push(it.k);it.sold=true;acted=true;}}
    }
    // 족보서: 자주 낸 족보면
    const book=S.top.find(it=>it.kind==='book'&&!it.sold);
    if(book&&S.gold>=book.cost){const fav=Object.entries(S.htCount||{}).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
      if(!smart?Math.random()<0.5:(fav.includes(book.k)&&book.k!=='solo')){S.gold-=book.cost;S.lv[book.k]=(S.lv[book.k]||1)+(S.vouch.includes('scope2')?2:1);book.sold=true;acted=true;}}
    // 동료 팩: 돈이 남으면 (똑똑: 덱에 같은 이름 ★1이 있는 카드)
    if(!packSold&&S.gold>=price(PACK_COST)+(smart?6:0)){packSold=true;S.gold-=price(PACK_COST);
      const view=shuffle(TYPE_IDS.slice()).slice(0,3).map(id=>({id,el:TYPES[id].els[Math.random()*TYPES[id].els.length|0],star:Math.random()<0.05*(S.hone||1)?2:1}));
      let ch=view[0];if(smart){const sc=v=>S.deck.filter(c=>c.id===v.id&&c.star===v.star).length*10+BASE_POW[TYPES[v.id].n]+(v.star-1)*20;ch=view.sort((a,b)=>sc(b)-sc(a))[0];}
      S.deck.push({uid:S.uid++,id:ch.id,star:ch.star,el:ch.el});acted=true;}
    // 리롤 (똑똑: 이자 손해 안 보는 범위)
    if(!acted&&smart&&S.gold-S.rerollCost>=12&&S.orbs.length<S.maxOrb){S.gold-=S.rerollCost;S.rerollCost++;rollTop();acted=true;}
    if(!acted)break;
  }
  if(smart||process.env.ORDER)S.orbs=ordered(S.orbs);
  for(const o of S.orbs)ST.orbOwned[o]=(ST.orbOwned[o]||0)+1;
}
/* 야영: 부상 3 · 상처 6 이상이면 잠자기 + 모닥불 머지 */
function maybeCamp(){
  if(S.rd>=2)return false;const h=hurtCount();
  if(!(h.w>=3||h.s>=6))return false;
  ST.camp++;let left=S.campMax||2;
  if(h.w||h.s){S.deck.forEach(c=>{delete c.out;delete c.st;});left--;ST.sleep++;}
  while(left-->0){const by={};S.deck.filter(c=>c.star===1).forEach(c=>{(by[c.id]=by[c.id]||[]).push(c);});
    const pr=Object.values(by).filter(a=>a.length>=2).sort((a,b)=>BASE_POW[TYPES[b[0].id].n]-BASE_POW[TYPES[a[0].id].n])[0];
    if(pr){applyMerge(pr[0],pr[1]);S.deck.splice(S.deck.indexOf(pr[1]),1);S.merges++;}}
  S.foes[S.rd].camped=true;return true;}
/* ---------- 한 판 ---------- */
function game(){
  newGame(DK);let jmax=ENDLESS?JMAX:8;
  while(true){
    ensureFoes();
    if(maybeCamp()){S.rd++;continue;}
    const won=playRound();
    if(!won){ST.deathJ[S.jang]=(ST.deathJ[S.jang]||0)+1;if(S.jang>8)ST.endlessJ.push(S.jang);else ST.endlessJ.push(S.jang);return false;}
    if(S.jang===8&&S.rd===2)ST.clear++;
    if(S.jang>=jmax&&S.rd===2){ST.endlessJ.push(jmax+1);return true;}
    cashOut();shop();
    if(S.rd<2)S.rd++;else{S.rd=0;S.jang++;S.voucherOffer=pickVoucher();}
  }
}
const med=a=>{if(!a||!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
const q=(a,p)=>{if(!a||!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(b.length*p))];};
for(let i=0;i<NG;i++){ST.games++;game();}
const T=ST.tier.x||[];const pct=(a,p)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(b.length*p))];};
const bs=T.map(t=>t.b),p25=pct(bs,0.25),p40=pct(bs,0.4),p60=pct(bs,0.6),p90=pct(bs,0.9);
const tierStat=f=>{const a=T.filter(f);const rs=a.map(t=>t.runs).sort((x,y)=>x-y);return {n:a.length,kill:+(a.filter(t=>t.won).length/Math.max(1,a.length)).toFixed(3),medRuns:rs[rs.length>>1],avgRuns:+(a.filter(t=>t.won).reduce((s,t)=>s+t.runs,0)/Math.max(1,a.filter(t=>t.won).length)).toFixed(2),otk:+(a.filter(t=>t.won&&t.runs===1).length/Math.max(1,a.length)).toFixed(3),brkShare:+(a.reduce((s,t)=>s+t.bshare,0)/Math.max(1,a.length)).toFixed(2),zeroBrkWin:+(a.filter(t=>t.won&&t.brks===0).length/Math.max(1,a.filter(t=>t.won).length)).toFixed(2),brks:+(a.reduce((s,t)=>s+t.brks,0)/Math.max(1,a.length)).toFixed(2)};};
const tiers={top10:tierStat(t=>t.b>=p90),mid:tierStat(t=>t.b>=p40&&t.b<=p60),bot25:tierStat(t=>t.b<=p25),all:tierStat(()=>true),cut:[p25,p40,p60,p90].map(x=>+x.toFixed(2))};
tiers.byRd=[0,1,2].map(rd=>{const a=T.filter(t=>t.rd===rd),b=a.map(t=>t.b).sort((x,y)=>x-y),q=p=>b[Math.min(b.length-1,Math.floor(b.length*p))];const P90=q(0.9),P40=q(0.4),P60=q(0.6),P25=q(0.25);const ts=f=>tierStat(t=>t.rd===rd&&f(t));return {top10:ts(t=>t.b>=P90),mid:ts(t=>t.b>=P40&&t.b<=P60),bot25:ts(t=>t.b<=P25),all:ts(()=>true)};});
const out={bar:GATE==='bar'?{BF,PIER,BMODE,blockedRunShare:+((ST.barBlockedRuns||0)/Math.max(1,ST.barRuns||0)).toFixed(3),rollFail:ST.rolls?+(ST.rollFail/ST.rolls).toFixed(3):null}:null,gate:GATE,tiers,keys:KEYS,closeWinShare:ST.closeWin/Math.max(1,ST.wins),keyFinishShare:ST.keyFinish/Math.max(1,ST.wins),dec:ST.dec?Object.fromEntries(Object.entries(ST.dec).map(([j,D])=>[j,Object.fromEntries(Object.entries(D).map(([k,a])=>[k,+med(a).toFixed(2)]))])):null,aff:AFF,enemy:ENEMY,tmul:TMUL,intentChanged:ST.intentChanged/Math.max(1,ST.intentRuns),woundsPerGame:ST.wounds/ST.games,scarsPerGame:ST.scars/ST.games,sleepPerGame:ST.sleep/ST.games,diff:DK,bot:BOT,games:ST.games,clear:ST.clear/ST.games,deathJ:ST.deathJ,
  runsPerRound:ST.runsUsed/ST.rounds,disPerRound:ST.disUsed/ST.rounds,firstRunWinShare:ST.firstRunWin/ST.rounds,bigHitShare:ST.bigHit/ST.rounds,
  medOver:med(ST.overRatio),q90Over:q(ST.overRatio,0.9),runsLeftAtWin:med(ST.runsLeftAtWin),
  medLoss:med(ST.lossRatio),campPerGame:ST.camp/ST.games,mergesPerGame:ST.merges/ST.games,
  bestByJang:Object.fromEntries(Object.keys(ST.bestHandJ).map(j=>[j,[med(ST.tgtJ[j]),med(ST.bestHandJ[j]),+(med(ST.bestHandJ[j])/med(ST.tgtJ[j])).toFixed(2)]])),
  htWinRun:ST.htWinRun,endlessMed:ENDLESS?med(ST.endlessJ):null,endlessQ:ENDLESS?[q(ST.endlessJ,0.25),q(ST.endlessJ,0.75),q(ST.endlessJ,0.9)]:null,
  topOrbs:Object.entries(ST.orbOwned).sort((a,b)=>b[1]-a[1]).slice(0,12)};
console.log(JSON.stringify(out));
