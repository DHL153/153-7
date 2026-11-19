/* 디자인 일관성 점검 — 봇이 모은 화면(DESIGN=폴더 로 monkey.js · full.js 를 돌린 것)을 서로 비교해 '혼자 다른 것'을 찾음
   사용: 1) DESIGN=/tmp/lm-design MODE=game SECS=300 node tests/bots/monkey.js   (메뉴 봇 · 완주 봇도 같은 폴더로)
         2) node tests/bots/design.js /tmp/lm-design          → 요약 출력 + /tmp/lm-design/findings.json
   보는 것: 글꼴 · 작은 글자 · 같은 이름인데 모양이 다른 버튼 · 키트 그림이 아닌 버튼 · 뒤로/닫기 모양과 크기 · 나란한 버튼의 높이 차이
           · 잘린 글자 · 흐린 글자(대비) · 이모지 아이콘 · 늘어난/깨진 그림 · 작은 누름 칸 · 화면 밖으로 나간 버튼
   사람 눈으로 확인할 후보를 뽑아 주는 도구예요 — 뽑힌 것이 모두 문제는 아님(의도된 차이도 섞임). */
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||'design');
const files=fs.readdirSync(dir).filter(f=>/^[a-z0-9_]+\.json$/i.test(f)&&f!=='findings.json').sort();
const seen=new Set(),S=[];for(const f of files){let d;try{d=JSON.parse(fs.readFileSync(path.join(dir,f)));}catch(e){continue;}if(!d.ctl)continue;const k=d.scr+'|'+d.h;if(seen.has(k))continue;seen.add(k);S.push(d);}
const F=[];const add=(rule,title,why,items,extra)=>{if(items.length)F.push(Object.assign({rule,title,why,n:items.length,items:items.slice(0,40)},extra||{}));};
const it=(s,x,note)=>({id:s.id,scr:s.scr,r:x.r,d:x.d,t:x.t||'',note:note||''});
const uniqBy=(a,f)=>{const m=new Map();for(const x of a){const k=f(x);if(!m.has(k))m.set(k,x);}return [...m.values()];};
const noZero=x=>x.fs>0;
const top=m=>[...m.entries()].sort((a,b)=>b[1]-a[1]);
const label=t=>(t||'').replace(/[0-9.,+\-×%/:·\s]+/g,' ').trim().slice(0,14);
const all=(k)=>S.flatMap(s=>s[k].map(x=>[s,x]));

/* A 글꼴 */
{const m=new Map();for(const [s,x] of all('txt'))m.set(x.ff,(m.get(x.ff)||0)+1);const fam=top(m),main=fam[0]?fam[0][0]:'';
 const odd=all('txt').filter(([s,x])=>x.ff!==main);add('A','글꼴 지정이 섞여 있음',`글자마다 첫 번째로 지정된 글꼴: ${fam.map(f=>f[0]+' '+f[1]+'곳').join(' · ')}`,uniqBy(odd,([s,x])=>x.ff+'|'+x.d).map(([s,x])=>it(s,x,x.ff)),{fam});}
/* B 작은 글자 */
{const small=all('txt').filter(([s,x])=>x.fs>0&&x.fs<11&&x.t.length>0);add('B','11px보다 작은 글자','11-15 QA에서 정한 가장 작은 글자 크기는 11px',uniqBy(small,([s,x])=>x.d+'|'+x.p).sort((a,b)=>a[1].fs-b[1].fs).map(([s,x])=>it(s,x,x.fs+'px')));}
/* C 같은 이름인데 모양이 다른 버튼 */
const skin=x=>x.bi?'그림 '+x.bi.split('/').pop().replace(/\.(webp|png)$/,''):x.bgi?'배경 그림 '+x.bgi.split('/').pop().replace(/\.(webp|png)$/,''):'색 '+x.bg;
{const m=new Map();for(const [s,x] of all('ctl')){if(x.dis||!x.t||x.where==='nic')continue;const l=label(x.t);if(l.length<2)continue;(m.get(l)||m.set(l,[]).get(l)).push([s,x]);}
 const out=[];for(const [l,a] of m){const g=new Map();for(const e of a){const k=skin(e[1]);(g.get(k)||g.set(k,[]).get(k)).push(e);}if(g.size<2)continue;
   out.push({label:l,kinds:[...g.entries()].sort((p,q)=>q[1].length-p[1].length).map(([k,v])=>({skin:k,n:v.length,ex:it(v[0][0],v[0][1],k),fs:[...new Set(v.map(e=>e[1].fs))].sort((a,b)=>a-b),h:[...new Set(v.map(e=>e[1].r[3]))].sort((a,b)=>a-b)}))});}
 out.sort((a,b)=>b.kinds.reduce((s,k)=>s+k.n,0)-a.kinds.reduce((s,k)=>s+k.n,0));
 if(out.length)F.push({rule:'C',title:'같은 이름인데 모양이 다른 버튼',why:'같은 글자의 버튼이 화면마다 다른 그림 · 색을 씀',n:out.length,groups:out.slice(0,40),items:[]});}
/* D 키트 그림이 아닌 버튼 */
{const flat=all('ctl').filter(([s,x])=>x.tag==='BUTTON'&&!x.bi&&!x.bgi&&x.t&&x.where!=='nic'&&!x.dis);const m=new Map();for(const e of flat){const k=e[1].d;(m.get(k)||m.set(k,[]).get(k)).push(e);}
 add('D','키트 그림 없이 색만으로 그린 버튼','버튼은 키트 그림(btn_*)으로 통일하기로 함 (ui-kit 3단계)',[...m.values()].sort((a,b)=>b.length-a.length).map(v=>it(v[0][0],v[0][1],`${v.length}곳 · ${v[0][1].bg} · ${v[0][1].fs}px`)));}
/* E 뒤로 · 닫기 */
{const back=all('ctl').filter(([s,x])=>/^(뒤로|돌아가기|닫기|나가기|취소|↩|✕|×|X)$/.test(x.t.trim())||/Back|back|close|Close|ibBack/.test(x.d));const m=new Map();
 for(const e of back){const x=e[1],k=(x.t.trim()||'(그림)')+' | '+skin(x)+' | '+x.r[2]+'×'+x.r[3]+' | '+x.fs+'px';(m.get(k)||m.set(k,[]).get(k)).push(e);}
 add('E','뒤로 · 닫기 버튼의 종류','규칙: 뒤로 = 항상 주황(btn_orange). 이름 · 그림 · 크기가 몇 가지인지',[...m.entries()].sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>it(v[0][0],v[0][1],`${k} — ${v.length}곳 (${[...new Set(v.map(e=>e[0].scr.split('+')[0]))].slice(0,4).join(', ')})`)));}
/* F 나란한 버튼의 높이 · 글자 크기 차이 */
{const out=[];for(const s of S){const g=new Map();for(const x of s.ctl){if(x.tag!=='BUTTON'||!x.t||x.dis)continue;const k=x.p+'|'+x.r[1];(g.get(k)||g.set(k,[]).get(k)).push(x);}
   for(const a of g.values()){if(a.length<2)continue;const hs=a.map(x=>x.r[3]),fz=a.map(x=>x.fs);if(Math.max(...hs)-Math.min(...hs)>3||Math.max(...fz)-Math.min(...fz)>1.6)out.push([s,a[0],a.map(x=>`${x.t.slice(0,8)} ${x.r[3]}px/${x.fs}px`).join(' · ')]);}}
 add('F','한 줄에 나란한 버튼인데 높이 · 글자 크기가 다름','같은 줄 버튼은 같은 높이 · 같은 글자 크기',uniqBy(out,o=>o[1].p+'|'+o[2]).map(([s,x,n])=>it(s,{r:x.r,d:x.p,t:''},n)));}
/* G 잘린 글자 */
{const cut=all('txt').filter(([s,x])=>(x.ell||x.par||x.clip)&&x.fs>0&&!/\.rl\b|roll|spin|odo/.test((x.par||'')+x.p+x.d));/* 굴러가는 숫자 칸은 뺌 */add('G','잘리거나 …로 줄어든 글자','칸 밖으로 넘친 글자',uniqBy(cut,([s,x])=>x.d+'|'+x.t).map(([s,x])=>it(s,x,x.ell?'… 줄임':x.par?'부모 칸('+x.par+') 밖으로':'칸보다 큼')));}
/* H 흐린 글자 */
{const low=all('txt').filter(([s,x])=>x.cr!=null&&x.cr<3&&!/^[\s·|—\-–]+$/.test(x.t));add('H','바탕과 대비가 낮은 글자 (3:1 미만)','단색 바탕 위 글자만 잼 (그림 바탕은 못 잼)',uniqBy(low,([s,x])=>x.d+'|'+x.col).sort((a,b)=>a[1].cr-b[1].cr).map(([s,x])=>it(s,x,`대비 ${x.cr}:1 · ${x.col} · ${x.fs}px`)));}
/* I 이모지 */
{const m=new Map();for(const e of all('txt')){if(!e[1].emo)continue;(m.get(e[1].emo)||m.set(e[1].emo,[]).get(e[1].emo)).push(e);}
 add('I','이모지를 아이콘으로 쓴 곳','기기마다 모양이 달라 보임 — 키트 아이콘(assets/ui/icon)으로 바꿀 후보',[...m.entries()].sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>it(v[0][0],v[0][1],`${k} ${v.length}곳 (${[...new Set(v.map(e=>e[1].d))].slice(0,4).join(', ')})`)));}
/* J 그림 */
{const im=all('img');add('J1','깨진 그림','',uniqBy(im.filter(([s,x])=>x.broken),([s,x])=>x.src).map(([s,x])=>it(s,x,x.src)));
 add('J2','원본보다 1.6배 넘게 늘린 그림 (흐려 보임)','',uniqBy(im.filter(([s,x])=>x.up>1.6&&x.r[2]>=40),([s,x])=>x.src+'|'+x.d).sort((a,b)=>b[1].up-a[1].up).map(([s,x])=>it(s,x,`${x.src} ×${x.up}`)));
 add('J3','비율이 찌그러진 그림 (7% 넘게)','',uniqBy(im.filter(([s,x])=>(x.ar<.93||x.ar>1.07)&&x.r[2]>=24),([s,x])=>x.src+'|'+x.d).map(([s,x])=>it(s,x,`${x.src} 가로/세로 ${x.ar}`)));}
/* K 작은 누름 칸 · 화면 밖 */
{const c=all('ctl').filter(([s,x])=>!x.dis&&x.where!=='nic');add('K1','누르는 칸이 작음 (세로나 가로 26px 미만)','',uniqBy(c.filter(([s,x])=>Math.min(x.r[2],x.r[3])<26),([s,x])=>x.d).sort((a,b)=>Math.min(a[1].r[2],a[1].r[3])-Math.min(b[1].r[2],b[1].r[3])).map(([s,x])=>it(s,x,`${x.r[2]}×${x.r[3]}`)));
 add('K2','화면 밖으로 나간 버튼','',uniqBy(c.filter(([s,x])=>x.cut),([s,x])=>x.d+'|'+s.scr).map(([s,x])=>it(s,x,`${x.r.join(',')}`)));}
/* L 버튼 글자 굵기 · 크기 종류 */
{const b=all('ctl').filter(([s,x])=>x.tag==='BUTTON'&&x.t&&x.where!=='nic');const w=new Map(),z=new Map();for(const [s,x] of b){if(!x.fs)continue;w.set(x.fw,(w.get(x.fw)||0)+1);const k=Math.round(x.fs);z.set(k,(z.get(k)||0)+1);}
 const mainW=top(w)[0]?top(w)[0][0]:'';add('L','버튼 글자 굵기가 대부분과 다름',`버튼 글자 굵기: ${top(w).map(e=>e[0]+' '+e[1]+'곳').join(' · ')} / 크기(px): ${top(z).map(e=>e[0]+'px '+e[1]).join(' · ')}`,uniqBy(b.filter(([s,x])=>x.fw!==mainW&&+x.fw<+mainW-100),([s,x])=>x.d).map(([s,x])=>it(s,x,`굵기 ${x.fw} · ${x.fs}px`)));}
/* M 창 틀 */
{const m=new Map();for(const [s,x] of all('box')){if(x.where!=='ov'&&x.where!=='title')continue;const k=(x.bi?'그림 '+x.bi.split('/').pop():x.bgi?'배경 '+x.bgi.split('/').pop():'색 '+x.bg)+' | 모서리 '+x.rad+' | 테 '+x.bw;(m.get(k)||m.set(k,[]).get(k)).push([s,x]);}
 add('M','창 · 판 틀의 종류',`창 안 큰 칸(120×60 이상)의 배경 · 모서리 · 테 조합 ${m.size}가지 — 드문 것부터`,[...m.entries()].filter(e=>new Set(e[1].map(v=>v[1].d)).size<=2).sort((a,b)=>a[1].length-b[1].length).slice(0,40).map(([k,v])=>it(v[0][0],v[0][1],`${k} — ${v.length}곳`)),{kinds:m.size});}

const scr=new Map();for(const s of S)scr.set(s.scr.split('+')[0],(scr.get(s.scr.split('+')[0])||0)+1);
fs.writeFileSync(path.join(dir,'findings.json'),JSON.stringify({shots:S.length,screens:[...scr.entries()],findings:F},null,1));
console.log(`화면 ${S.length}장 (종류 ${scr.size}가지)`);for(const f of F)console.log(`\n[${f.rule}] ${f.title} — ${f.n}건${f.why?'\n    '+f.why:''}`+(f.groups?f.groups.slice(0,12).map(g=>`\n    "${g.label}": `+g.kinds.map(k=>`${k.skin} ${k.n}곳`).join(' / ')).join(''):f.items.slice(0,10).map(i=>`\n    ${i.d} ${i.t?'"'+i.t.slice(0,18)+'" ':''}${i.note}  @${i.scr} (${i.id})`).join('')));
console.log('\n기록: '+path.join(dir,'findings.json'));
