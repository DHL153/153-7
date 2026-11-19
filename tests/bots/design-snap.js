/* 디자인 점검용 화면 수집 — 처음 보는 화면(창 종류 + 버튼 구성)마다 사진 + 모양 목록(__MK.design)을 폴더에 저장
   monkey.js · full.js 가 DESIGN=1 일 때 부름. 모은 것은 design.js 가 비교 */
const fs=require('fs'),path=require('path');
const seen=new Map();let n=0;
async function snap(p,dir,tag){try{
  const k=await p.evaluate(()=>{if(!window.__MK||!__MK.design)return null;const s=__MK.screen();let busy=false;try{busy=!!(S&&(S.busy||S.anim));}catch(e){}
    const c=__MK.cands().map(c=>c.d+(c.dis?'x':'')).sort();let h=0;const j=[...new Set(c)].join('|');for(let i=0;i<j.length;i++)h=(h*31+j.charCodeAt(i))|0;
    return {s,busy,h,vw:innerWidth,vh:innerHeight,story:!!document.getElementById('mr-story')};});
  if(!k||k.busy||/^intro:startup|fxplay/.test(k.s))return false;
  if(k.vw!==1366||k.vh!==768)return false;   // PC 기준 한 가지 크기만
  const base=k.s.replace(/:busy/,''),key=base+'|'+k.h,cnt=seen.get(base)||0;if(seen.has(key)||cnt>=(+(process.env.DESIGN_PER||10)))return false;
  await p.waitForTimeout(650);   // 창이 뜨는 움직임이 끝난 뒤
  const d=await p.evaluate(()=>{try{if(S&&(S.busy||S.anim))return null;}catch(e){}return __MK.design();});if(!d||d.scr.replace(/:busy/,'')!==base)return false;
  seen.set(key,1);seen.set(base,cnt+1);fs.mkdirSync(dir,{recursive:true});const id=(tag||'s')+String(++n).padStart(3,'0');
  await p.screenshot({path:path.join(dir,id+'.png')});d.id=id;d.h=k.h;fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(d));return true;}catch(e){return false;}}
module.exports={snap,count:()=>n};
