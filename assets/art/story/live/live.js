/* 라만차 스토리 Live 컷 (DHL 10-30 "한 컷에서 진짜 2D 라이브처럼 — 어느 부분만 살짝, 이펙트")
   원본 컷 한 장을 WebGL로 살짝 휘게(숨쉬기 · 머리카락 · 망토 흔들림) + 위에 빛 이펙트 · 입자.
   LMLive.mount(host, name, base) → {stop()}   — host 안에 1448×1086 무대를 꽉 채움 */
(function(){
const W=1448,H=1086;
const VS='attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0,1);}';
const FS=`precision mediump float;varying vec2 uv;uniform sampler2D tx;uniform float t;uniform int n;
uniform vec4 D[12];uniform vec4 P[12];uniform float A[12];
void main(){vec2 px=uv*vec2(${W}.,${H}.);vec2 d=vec2(0.);
for(int i=0;i<12;i++){if(i>=n)break;vec4 c=D[i];vec4 q=P[i];
 vec2 r=(px-c.xy)/c.zw;float w=1.-smoothstep(.55,1.,length(r));if(w<=0.)continue;
 float s=sin(t*q.z*6.2832+q.w);float ty=q.x;
 if(ty<.5) d.y+=(px.y-A[i])*q.y*s*w;                                     /* 0 숨쉬기: 기준선에서 위아래로 */
 else if(ty<1.5) d.x+=q.y*s*w*clamp((px.y-A[i])/(c.w*1.6),0.,1.);        /* 1 매달린 천: 기준선 아래로 갈수록 */
 else if(ty<2.5) d.x+=q.y*s*w*clamp((A[i]-px.y)/(c.w*1.6),0.,1.);        /* 2 머리카락: 기준선 위로 갈수록 */
 else if(ty<3.5) d.y+=q.y*s*w;                                           /* 3 위아래 둥실 */
 else d.y+=q.y*s*w*clamp(abs(px.x-A[i])/(c.z*1.6),0.,1.);                /* 4 옆으로 뻗은 천: 기준점에서 멀수록 위아래 */
}
gl_FragColor=texture2D(tx,(px-d)/vec2(${W}.,${H}.));}`;
const TY={breathe:0,cloth:1,hair:2,bob:3,flag:4};
const CSS=`.lmL{position:absolute;inset:0;overflow:hidden;background:transparent;z-index:2;pointer-events:none}
.lmL .st{position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;transform-origin:50% 50%}
.lmL .cam{position:absolute;inset:0;transform-origin:var(--ox,50%) var(--oy,50%);animation:lmCam var(--cd,9s) ease-out both}
@keyframes lmCam{from{scale:1}to{scale:var(--cz,1.04)}}
.lmL canvas{position:absolute;inset:0;width:100%;height:100%}
.lmL .fx{position:absolute;pointer-events:none;mix-blend-mode:screen}
.lmL .fx.n{mix-blend-mode:normal}
.lmL .k-pulse{animation:lmPulse var(--d,2.4s) ease-in-out var(--dl,0s) infinite both}
@keyframes lmPulse{0%,100%{opacity:var(--lo,.35)}50%{opacity:var(--hi,1)}}
.lmL .k-flick{animation:lmFlick var(--d,1.6s) steps(1) var(--dl,0s) infinite both}
@keyframes lmFlick{0%{opacity:var(--hi,1)}23%{opacity:var(--lo,.3)}31%{opacity:var(--hi,1)}64%{opacity:.6}72%{opacity:var(--hi,1)}}
.lmL .k-blink{transform-origin:50% 50%;animation:lmBlink var(--d,3.6s) ease-in-out var(--dl,0s) infinite both}
@keyframes lmBlink{0%,100%{opacity:.85;scale:1 1}40%{opacity:1;scale:1 1}44%{scale:1 .08;opacity:.6}48%{scale:1 1;opacity:1}52%{scale:1 .08}56%{scale:1 1;opacity:1}75%{opacity:.75}}
.lmL .k-spin{animation:lmSpin var(--d,20s) linear infinite}
@keyframes lmSpin{to{rotate:var(--a,360deg)}}
.lmL .k-rise{opacity:0;animation:lmRise var(--d,3s) ease-in-out var(--dl,0s) infinite}
@keyframes lmRise{0%{opacity:0;translate:0 0;scale:.9}25%{opacity:var(--hi,.9)}75%{opacity:calc(var(--hi,.9)*.7)}100%{opacity:0;translate:var(--dx,0px) var(--dy,-80px);scale:1.05}}
.lmL .k-fall{opacity:0;animation:lmFall var(--d,3s) linear var(--dl,0s) infinite}
@keyframes lmFall{0%{opacity:0;translate:0 0;rotate:0deg}8%{opacity:1}100%{opacity:1;translate:var(--dx,0px) var(--dy,1200px);rotate:var(--rot,180deg)}}
.lmL .k-twinkle{animation:lmTw var(--d,1.8s) ease-in-out var(--dl,0s) infinite both}
@keyframes lmTw{0%,100%{opacity:0;scale:.5}50%{opacity:var(--hi,1);scale:1}}
.lmL .shake{animation:lmShake .12s linear infinite}
@keyframes lmShake{0%,100%{translate:0 0}25%{translate:var(--sa,2px) calc(var(--sa,2px)*-.5)}75%{translate:calc(var(--sa,2px)*-1) calc(var(--sa,2px)*.5)}}
@media (prefers-reduced-motion:reduce){.lmL *{animation:none!important}}`;
function style(){if(document.getElementById('lmLiveCss'))return;const s=document.createElement('style');s.id='lmLiveCss';s.textContent=CSS;document.head.appendChild(s);}
const R=(a,b)=>a+Math.random()*(b-a);
function mount(host,name,base,opts){opts=opts||{};const RS=opts.res||window.LM_LIVE_RES||Math.min(1,Math.max(.5,(host.clientWidth||W)*(devicePixelRatio||1)/W));   // 화면에 보이는 크기만큼만 그림 (가벼움)
  style();const S=(window.LM_LIVE||{})[name];if(!S)return null;base=base||'';
  const root=document.createElement('div');root.className='lmL';
  const st=document.createElement('div');st.className='st';root.appendChild(st);
  const cam=document.createElement('div');cam.className='cam';st.appendChild(cam);
  const sh=document.createElement('div');sh.style.cssText='position:absolute;inset:0';if(S.shake){sh.className='shake';sh.style.setProperty('--sa',S.shake+'px');}cam.appendChild(sh);
  const C=S.cam||{};cam.style.setProperty('--cz',C.z||1.04);cam.style.setProperty('--ox',(C.x??50)+'%');cam.style.setProperty('--oy',(C.y??50)+'%');cam.style.setProperty('--cd',(C.d||9)+'s');
  const cv=document.createElement('canvas');cv.width=Math.round(W*RS);cv.height=Math.round(H*RS);sh.appendChild(cv);
  const fit=()=>{const k=(opts.fit==='contain'?Math.min:Math.max)(root.clientWidth/W,root.clientHeight/H)||1;st.style.transform=`translate(-50%,-50%) scale(${k})`;};
  host.appendChild(root);fit();const ro=new ResizeObserver(fit);ro.observe(root);
  // 이펙트 · 입자
  const add=(src,x,y,w,k,v,blend)=>{const im=new Image();im.src=base+src;im.className='fx '+(k?'k-'+k:'')+(blend==='n'?' n':'');im.style.left=x+'px';im.style.top=y+'px';im.style.width=w+'px';
    for(const q in (v||{}))im.style.setProperty('--'+q,v[q]);sh.appendChild(im);return im;};
  (S.fx||[]).forEach(f=>{const el=add(f.i,f.x,f.y,f.w,f.k,f.v,f.b);if(f.sy){const wr=document.createElement('div');wr.className='fx';wr.style.cssText=`left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.w}px;scale:1 ${f.sy};transform-origin:50% 50%;opacity:${f.op??1}`;el.style.left=el.style.top='0';el.style.mixBlendMode='normal';sh.insertBefore(wr,el);wr.appendChild(el);}else if(f.op!=null)el.style.opacity=f.op;if(f.o)el.style.transformOrigin=f.o;if(f.r)el.style.rotate=f.r+'deg';if(f.clip)el.style.clipPath=f.clip;});
  (S.emit||[]).forEach(e=>{for(let i=0;i<e.n;i++){const src=e.i[i%e.i.length],w=R(e.w[0],e.w[1]);
    const el=add(src,R(e.a[0],e.a[2]),R(e.a[1],e.a[3]),w,e.k,{d:R(e.d[0],e.d[1]).toFixed(2)+'s',dl:(-R(0,e.d[1])).toFixed(2)+'s',dx:R(-(e.dx||30),e.dx||30).toFixed(0)+'px',dy:(e.dy||-120)*R(.7,1.2)+'px',rot:R(-240,240).toFixed(0)+'deg',hi:e.hi||1},e.b);
    if(e.r)el.style.rotate=R(-e.r,e.r).toFixed(0)+'deg';}});
  // WebGL 휘게 하기
  const gl=cv.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:!!opts.manual});let raf=0,alive=true,drawAt=null;
  const img=new Image();img.src=base+S.img;
  img.onload=()=>{if(!alive)return;if(!gl){const c2=cv.getContext('2d');c2.drawImage(img,0,0,W,H);return;}
    const sh2=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;};
    const pr=gl.createProgram();gl.attachShader(pr,sh2(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh2(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const lp=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const M=(S.move||[]).slice(0,12),Dv=[],Pv=[],Av=[];
    M.forEach(m=>{Dv.push(m.x,m.y,m.rx,m.ry);Pv.push(TY[m.t],m.a,m.f||.3,m.ph||0);Av.push(m.an??m.y);});
    for(let i=M.length;i<12;i++){Dv.push(0,0,1,1);Pv.push(0,0,0,0);Av.push(0);}
    gl.uniform4fv(gl.getUniformLocation(pr,'D'),Dv);gl.uniform4fv(gl.getUniformLocation(pr,'P'),Pv);gl.uniform1fv(gl.getUniformLocation(pr,'A'),Av);gl.uniform1i(gl.getUniformLocation(pr,'n'),M.length);
    const ut=gl.getUniformLocation(pr,'t'),t0=performance.now(),still=matchMedia('(prefers-reduced-motion: reduce)').matches;
    gl.viewport(0,0,cv.width,cv.height);drawAt=t=>{gl.uniform1f(ut,t);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);};
    if(opts.manual){drawAt(0);return;}
    const fr=()=>{if(!alive)return;drawAt(still?0:(performance.now()-t0)/1000);raf=requestAnimationFrame(fr);};fr();};
  return {el:root,seek(t){drawAt&&drawAt(t);root.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=t*1000;});},ready:()=>!!drawAt,stop(){alive=false;cancelAnimationFrame(raf);ro.disconnect();root.remove();}};
}
window.LMLive={mount};
})();
