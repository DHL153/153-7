// 적 리그의 크기 · 연출 길이를 재서 mrstage/enemy/enemies.json 을 만듭니다.
// 사용: (저장소 폴더에서) python3 -m http.server 8784 를 띄워 두고  node tools/enemy/measure.js [키 ...]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),DIR=path.join(ROOT,'mrstage/enemy');
const META=JSON.parse(fs.readFileSync(path.join(__dirname,'enemies.meta.json'),'utf8'));
const only=process.argv.slice(2);
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 const outF=path.join(DIR,'enemies.json');const out=fs.existsSync(outF)?JSON.parse(fs.readFileSync(outF,'utf8')):{};
 for(const key of Object.keys(META)){if(only.length&&!only.includes(key))continue;
  const p=await b.newPage({viewport:{width:1600,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
  await p.goto('http://localhost:'+(process.env.PORT||8784)+'/mrstage/enemy/'+key+'/index.html');
  await p.waitForFunction(()=>window.EN&&EN.ready(),null,{timeout:30000});
  const bbox=()=>p.evaluate(()=>{const c=document.querySelector('canvas'),g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1;
    for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){if(d[(y*c.width+x)*4+3]>120){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}return x1<0?null:[x0,y0,x1,y1];});
  const run=async(s,max)=>{const t0=Date.now();await p.evaluate(s=>{window.__evs=[];const T=performance.now();EN.on((e,st)=>window.__evs.push([e,st,Math.round(performance.now()-T)]));EN.fx(true);EN.play(s);},s);await p.waitForTimeout(250);const seen=new Set();
    while(Date.now()-t0<max){const st=await p.evaluate(()=>EN.state());seen.add(st);if(st==='idle')break;await p.waitForTimeout(60);}return {ms:Date.now()-t0,states:[...seen],evs:await p.evaluate(()=>window.__evs)};};
  const blank=await bbox();
  const enter=await run('enter',15000);await p.evaluate(()=>EN.fx(false));await p.waitForTimeout(900);const body=await bbox();
  const atks=META[key].attacks||['attack'];let attack=null;const atkEv={};for(const a of atks){const r=await run(a,15000);attack=attack||r;atkEv[a]=r.evs.filter(e=>e[1]===a).map(e=>e[0]+'@'+e[2]);}const hurt=await run('hurt',6000);
  const src=fs.readFileSync(path.join(DIR,key,'index.html'),'utf8');const num=n=>{const m=src.match(new RegExp('[ ,]'+n+'=([0-9.]+)'));return m?+m[1]:null;};
  const GY=num('GY'),CX=num('CX');
  out[key]=Object.assign({},META[key],{cx:CX,gy:GY,body,bodyH:body?GY-body[1]:null,bodyW:body?body[2]-body[0]:null,enterMs:enter.ms,attackMs:attack.ms,hurtMs:hurt.ms});
  console.log(key,META[key].ko,JSON.stringify({atkEv,enterEv:enter.evs.map(e=>e[0]+'@'+e[2]),errs}));await p.close();}
 fs.writeFileSync(outF,JSON.stringify(out,null,1));await b.close();})();
