/* 페이지 안 검사기 — 맨 위 창에만 설치 */
(function(){
if(window.top!==window||window.__MK)return;
const MK=window.__MK={mut:0,t0:Date.now()};
const boot=()=>{try{new MutationObserver(m=>{for(const x of m){const t=x.target;if(t===document.head||(t.nodeType===1&&(t.classList.contains('mr-logo-blades')||t.closest&&t.closest('head'))))continue;if(x.type==='attributes'&&(x.attributeName==='aria-description'||(x.attributeName==='class'&&t.classList&&t.classList.contains('lmTermOn'))))continue;MK.mut++;}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});}catch(e){}};
if(document.documentElement)boot();else addEventListener('DOMContentLoaded',boot);
const vis=e=>{if(!e||!e.isConnected)return false;const r=e.getBoundingClientRect();if(r.width<4||r.height<4)return false;if(r.bottom<=0||r.right<=0||r.top>=innerHeight||r.left>=innerWidth)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05;};
const hitPt=e=>{const r=e.getBoundingClientRect();const pts=[[.5,.5],[.3,.5],[.7,.5],[.5,.3],[.5,.7],[.15,.5],[.85,.5]];
  for(const [fx,fy] of pts){const x=r.left+r.width*fx,y=r.top+r.height*fy;if(x<1||y<1||x>innerWidth-1||y>innerHeight-1)continue;const h=document.elementFromPoint(x,y);if(h&&(h===e||e.contains(h)))return [Math.round(x),Math.round(y)];}return null;};
const desc=e=>{if(!e)return '';const c=(typeof e.className==='string'?e.className:'').trim().split(/\s+/).filter(x=>x&&!/^(on|sel|cur|hl|bump|in|flash|new|pop)$/.test(x)).slice(0,2).join('.');return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(c?'.'+c:'');};
MK.desc=desc;
const txt=e=>((e.innerText||e.getAttribute('aria-label')||e.title||e.alt||'')+'').replace(/\s+/g,' ').trim();
MK.screen=function(){
  if(document.getElementById('game-startup-screen'))return 'intro:startup';
  if(document.getElementById('mr-story'))return 'intro:story';
  if(document.body.classList.contains('lmFxPlay'))return 'fxplay';
  const t=document.getElementById('lm-title'),ov=document.getElementById('ov');
  const extra=document.querySelector('.dkV')?'+deck':document.querySelector('.vPop')?'+vpop':'';
  if(t&&!t.hidden){const pop=t.querySelector('.lt-pop');let k='main';if(pop&&!pop.hidden){const h=pop.querySelector('h2,h3,.lt-h,.lt-tabs .on,.lt-mb');k='pop['+((h&&h.innerText)||'').replace(/\s+/g,'').slice(0,6)+']';}
    const ovp=ov&&!ov.hidden?'+ov:'+(ov.querySelector('#panel>*')?desc(ov.querySelector('#panel>*')):''):'';
    return (t.classList.contains('ingame')?'gopt:':'title:')+k+ovp;}
  if(ov&&!ov.hidden){const p=document.querySelector('#panel>*');return 'ov:'+(p?desc(p):'empty')+extra;}
  let s='battle';try{if(S){if(S.practice)s='practice';else if(S.sandbox)s='sandbox';if(S.busy||S.anim)s+=':busy';}}catch(e){}
  return s+extra;};
MK.state=function(){try{if(typeof S==='undefined'||!S)return null;
  return {diff:S.diff,deckK:S.deckK,jang:S.jang,rd:S.rd,score:S.score,tgt:S.tgt,runs:S.runs,dis:S.dis,gold:S.gold,hand:(S.hand||[]).length,draw:(S.draw||[]).length,deck:(S.deck||[]).length,sel:(S.sel||[]).length,
    orbs:(S.orbs||[]).length,maxOrb:S.maxOrb,busy:!!S.busy,anim:!!S.anim,selecting:!!S.selecting,inShop:!!S.inShop,inRest:!!S.inRest,practice:!!S.practice,sandbox:!!S.sandbox,endless:!!S.endless,finale:!!S.finale,
    ended:!!S._statEnded,rule:S.foe&&S.foe.rule?S.foe.rule.k:null,foe:!!S.foe,tut:S.tut?(S.tut.fin?'fin':(S.tut.mode||'on')):null,sealed:(S.hand||[]).filter(c=>c.seal).length,merges:S.merges,hold:!!S._holdEnd,sealPend:!!S._sealPend};}catch(e){return {err:String(e)};}};
MK.viol=function(){const v=[];try{if(typeof S==='undefined'||!S)return v;
  const fin=(k)=>{const x=S[k];if(typeof x!=='number'||!isFinite(x))v.push('숫자 아님 S.'+k+'='+x);};
  ['jang','rd','score','tgt','runs','dis','gold'].forEach(fin);
  if(S.runs<0)v.push('런 음수 '+S.runs);if(S.dis<0)v.push('버리기 음수 '+S.dis);
  if(S.gold<0&&S.deckK!=='debt')v.push('골드 음수 '+S.gold);
  if(S.rd<0||S.rd>2)v.push('라운드 범위 밖 '+S.rd);
  if(S.orbs&&S.maxOrb!=null&&S.orbs.length>S.maxOrb)v.push('구슬 칸 초과 '+S.orbs.length+'/'+S.maxOrb);
  if(S.orbs){const u=new Set(S.orbs);if(u.size!==S.orbs.length)v.push('같은 구슬 중복 '+S.orbs.join(','));S.orbs.forEach(k=>{if(!ORBS[k])v.push('없는 구슬 '+k);});}
  const D=S.deck||[],ids=D.map(c=>c.uid);if(new Set(ids).size!==ids.length)v.push('덱 카드 번호(uid) 중복');
  if(!D.length)v.push('덱 0장');
  const dset=new Set(D);const H=S.hand||[],W=S.draw||[];
  const inB=!S.selecting&&!S.inShop&&!S.inRest;   /* 라운드 밖에서는 지난 라운드의 손패 · 더미가 그대로 남아 있음(다음 라운드에서 새로 만듦) → 전투 중에만 봄 */
  if(!S.practice&&!S.sandbox&&inB){if(H.some(c=>!dset.has(c)))v.push('손패에 덱에 없는 카드');if(W.some(c=>!dset.has(c)))v.push('뽑을 더미에 덱에 없는 카드');}
  if(new Set(H).size!==H.length)v.push('손패 같은 카드 두 번');if(H.some(c=>W.includes(c)))v.push('손패와 더미에 같은 카드');
  if(new Set(W).size!==W.length)v.push('더미 같은 카드 두 번');
  const hu=new Set(H.map(c=>c.uid));if(inB&&!S._chain&&(S.sel||[]).some(u=>!hu.has(u)))v.push('고른 카드가 손패에 없음');
  if(inB&&S.handNow&&H.length>S.handNow&&!S.practice)v.push('손패 초과 '+H.length+'/'+S.handNow);
  D.forEach(c=>{if(!TYPES[c.id])v.push('없는 동료 '+c.id);if(!(c.star>=1&&c.star<=3))v.push('별 범위 밖 '+c.star);});
  if((S.selecting||S.inShop)&&!S.busy){if(D.some(c=>c.seal))v.push('라운드 밖인데 봉인 남음');if(D.some(c=>c.fog))v.push('라운드 밖인데 안개 남음');}
  if(S.lv)for(const k in S.lv)if(!isFinite(S.lv[k]))v.push('족보 레벨 숫자 아님 '+k);
  if(S.ost)for(const k in S.ost)if(!(S.ost[k]>=1&&S.ost[k]<=3))v.push('구슬 단계 범위 밖 '+k+'='+S.ost[k]);
 }catch(e){v.push('검사 중 오류 '+e.message);}return v;};
/* 전투에서 할 수 있는 일이 남았는지 */
MK.lock=function(){try{if(typeof S==='undefined'||!S||S.practice||S.sandbox)return null;const t=document.getElementById('lm-title'),ov=document.getElementById('ov');
  if((t&&!t.hidden)||(ov&&!ov.hidden)||S.selecting||S.inShop||S.inRest||S.busy||S.anim||!S.foe)return null;
  if(document.getElementById('mr-story')||document.body.classList.contains('lmFxPlay'))return null;
  if(S.score>=S.tgt)return 'won-no-window';
  if(S.runs<=0)return 'no-runs-no-lose';
  const H=S.hand||[];const canRun=H.some(c=>!c.seal),canDis=S.dis>0&&H.length>0;
  if(!canRun&&!canDis)return 'no-legal-action hand='+H.length+' draw='+(S.draw||[]).length+' sealed='+H.filter(c=>c.seal).length+' runs='+S.runs+' dis='+S.dis;
  return null;}catch(e){return null;}};
MK.cands=function(){const out=[],seen=new Set();const all=document.body.querySelectorAll('*');
  const isPtr=e=>getComputedStyle(e).cursor==='pointer';
  for(const e of all){
    const tag=e.tagName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='IFRAME')continue;
    const strong=tag==='BUTTON'||tag==='A'||tag==='INPUT'||tag==='SELECT'||tag==='SUMMARY'||e.hasAttribute('onclick')||e.getAttribute('role')==='button'||typeof e.onclick==='function';
    if(!strong){if(!isPtr(e))continue;const p=e.parentElement;if(p&&p!==document.body&&isPtr(p))continue;}
    if(!vis(e))continue;const pt=hitPt(e);if(!pt)continue;if(seen.has(e))continue;seen.add(e);
    const cs=getComputedStyle(e);const dis=!!(e.disabled||e.getAttribute('aria-disabled')==='true'||/(^| )(off|dis|disabled|lock|locked)( |$)/.test(typeof e.className==='string'?e.className:'')||+cs.opacity<0.6);
    const tx=txt(e).slice(0,22);
    out.push({d:desc(e),t:tx,x:pt[0],y:pt[1],dis,uid:e.dataset&&e.dataset.uid!=null?+e.dataset.uid:null,type:tag==='INPUT'?(e.type||'text'):null});
  }
  return out;};
MK.badText=function(){try{const t=document.body.innerText||'';const m=t.match(/.{0,24}(undefined|NaN|\[object |Infinity|\bnull\b).{0,24}/g);return m?m.slice(0,4).map(s=>s.replace(/\s+/g,' ')):[];}catch(e){return [];}};
MK.sig=function(){let h=0;try{const s=(document.getElementById('panel')||{}).innerText||'';for(let i=0;i<s.length;i+=3)h=(h*31+s.charCodeAt(i))|0;}catch(e){}
  let ht=0;try{const p=document.querySelector('#lm-title .lt-pop');const s=p&&!p.hidden?p.innerText:'';for(let i=0;i<s.length;i+=3)ht=(ht*31+s.charCodeAt(i))|0;}catch(e){}
  const st=MK.state();return MK.screen()+'|'+h+'|'+ht+'|'+(st?[st.jang,st.rd,st.score,st.runs,st.dis,st.gold,st.hand,st.sel,st.orbs,st.deck,st.busy,st.merges].join(','):'-');};
MK.probe=function(){return {scr:MK.screen(),st:MK.state(),viol:MK.viol(),lock:MK.lock(),cands:MK.cands(),mut:MK.mut,sig:MK.sig()};};
/* 좋은 패 고르기 (누를 카드 번호만 알려 줌 — 누르는 건 진짜 마우스) */
MK.best=function(){try{if(typeof S==='undefined'||!S||!S.hand||!S.hand.length)return null;S._bestKey=null;const b=bestHint();if(!b||!b.cards)return null;return b.cards.map(c=>c.uid);}catch(e){return null;}};
})();
