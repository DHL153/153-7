"use strict";
/* ============================================================================
   막대말 랜스 기사 (hobby-horse lancer) — mesh-deform rig, same approach as the claw ghost
   - One continuous mesh per drawing: nothing is cut, so nothing can crack or show a seam.
   - The four drawings are identical except the lance and the face, so a pose change is a clean swap.
   - Idle = the whole rider bobs on the hobby horse (rigid, no bending) + hair, mane and tail flames sway
     on smooth weight fields. The lance is never bent: it crosses the skirt and the horse head, so any
     local bend would drag them along — it only moves rigidly with the body.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec3 aW;
uniform vec2 uPivH, uPivM, uPivT, uAnchor; uniform float uAH, uAM, uAT, uT;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV; varying float vY;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivH,uAH*aW.x*sin(uT*2.1-distance(aPos,uPivH)*0.014));
    p=rot(p,uPivM,uAM*aW.y*sin(uT*5.3-distance(aPos,uPivM)*0.03));
    p=rot(p,uPivT,uAT*aW.z*sin(uT*4.6-distance(aPos,uPivT)*0.035));
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  vY=p.y; p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV; varying float vY;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class LanceRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1536; cv.height = 1280; this.cv = cv;   // 256 px margin left/right, 128 top/bottom: hops and lunges never clip
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uPivH","uPivM","uPivT","uAnchor","uAH","uAM","uAT","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [], wts = {};
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wH[j][i], P.wM[j][i], P.wT[j][i]); wts[k] = a }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, loc); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0) };
      buf(pos, "aPos", 2);
      // one weight buffer per drawing: each pose's lance sits on zero weight, so the sway never bends it
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {};
      for (const k in wts) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wts[k]), gl.STATIC_DRAW); this.wb[k] = b }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); this.tex = {};
      for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uPivH, W.pivH); gl.uniform2fv(this.u.uPivM, W.pivM); gl.uniform2fv(this.u.uPivT, W.pivT); gl.uniform2fv(this.u.uAnchor, W.anchor); gl.uniform1i(this.u.uTex, 0);
    }
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1536, 1280); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uAH, D.hair || 0); gl.uniform1f(u.uAM, D.mane || 0); gl.uniform1f(u.uAT, D.tail || 0); gl.uniform1f(u.uT, D.t || 0) }
        const c = Math.cos(L.rot || 0), s = Math.sin(L.rot || 0), sx = L.sx ?? 1, sy = L.sy ?? 1;
        gl.uniform4f(u.uM, c * sx, -s * sy, s * sx, c * sy); gl.uniform2f(u.uT2, L.tx || 0, L.ty || 0);
        const t = L.tint || [1, 1, 1, 0]; gl.uniform4f(u.uTint, t[0], t[1], t[2], t[3]); gl.uniform1f(u.uAlpha, L.alpha ?? 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wb[L.tex]); gl.vertexAttribPointer(this.aW, 3, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[L.tex]); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
      }
      return this.cv;
    }
  }
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  /* one hobby-horse hop: 0..1 -> height (0 at both ends) and a landing squash */
  const hop = (p, h) => ({ y: -h * Math.sin(Math.PI * p), sq: p > .85 ? (p - .85) / .15 : 0 });
  class LanceAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = [] }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      const D = { hair: 1.6 * DEG, mane: 2.2 * DEG, tail: 3 * DEG, t: T };
      // idle: little hobby-horse bounce, 0.9 s per bounce, squash on each landing
      const ph = (T % .9) / .9, b = Math.abs(Math.sin(Math.PI * ph)), land = Math.max(0, 1 - Math.min(ph, 1 - ph) / .12);
      const L = { tex: "stance", deform: D, ty: -6 * b, sx: 1 + .012 * land, sy: 1 - .02 * land };
      const out = { layers: [L], shake: 0, flash: 0, speed: -1, spark: -1, burst: -1, hitspark: -1, tipX: 0 };
      if (this.state === "enter") {
        // 4 hops in from behind (0–1.2 s) · rear up = wind-up drawing (1.2–1.55) · settle into the stance (1.55–1.9)
        if (s < 1.2) { const i = Math.min(3, Math.floor(s / .3)), p = (s - i * .3) / .3, h = hop(p, 46); L.tx = lerp(-1500, 0, 1 - Math.pow(1 - seg(s, 0, 1.2), 2)); L.ty = h.y; L.sx = 1 + .03 * h.sq; L.sy = 1 - .05 * h.sq;
          if (p > .9 && this.once("land" + i)) this.events.push("land") }
        else if (s < 1.55) { const p = seg(s, 1.2, 1.32); L.tex = "windup"; L.tx = 0; L.ty = -10 * Math.sin(Math.PI * seg(s, 1.2, 1.55)); L.sx = lerp(.97, 1, ease.back(p)); L.sy = lerp(1.05, 1, ease.back(p));
          if (this.once("rear")) { this.events.push("rear"); out.shake = .35 } out.burst = seg(s, 1.2, 1.6) }
        else { const p = seg(s, 1.55, 1.85); L.ty = 0; L.sx = lerp(1.03, 1, ease.back(p)); L.sy = lerp(.95, 1, ease.back(p)); if (this.once("land4")) this.events.push("land") }
        if (s > 2) this.play("idle");
      }
      if (this.state === "attack") {
        // A crouch 0–0.12 · B rear up with the lance raised 0.12–0.42 (trembling) · C charge + thrust 0.42–0.52
        // D hold the hit 0.52–0.78 · E hop back home 0.78–1.15
        if (s < .12) { const p = ease.io(s / .12); L.ty = 0; L.tx = -14 * p; L.sx = 1 + .03 * p; L.sy = 1 - .05 * p }
        else if (s < .42) { const p = seg(s, .12, .22); L.tex = "windup"; L.ty = -8 * ease.o3(p); L.tx = -14 + (s > .22 ? Math.sin(s * 95) * 1.6 : 0); L.sx = lerp(.97, 1, ease.back(p)); L.sy = lerp(1.05, 1, ease.back(p)) }
        else if (s < .78) { const p = seg(s, .42, .52); L.tex = "thrust"; L.ty = 0; L.tx = lerp(-14, 170, ease.o3(p)); L.sx = lerp(1.06, 1, ease.o3(seg(s, .42, .6))); L.sy = lerp(.95, 1, ease.o3(seg(s, .42, .6)));
          out.tipX = L.tx; out.speed = seg(s, .42, .7);
          if (this.fxOn && s < .52) { for (let k = 1; k <= 3; k++) out.layers.unshift({ tex: "thrust", tx: L.tx - k * 46 * (1 - p * .5), alpha: .22 * (1 - p) * (1 - k * .22), tint: [.7, .45, 1, .75] }) }
          if (s > .52 && this.once("hit")) { this.events.push("hit"); out.shake = .7 } out.spark = seg(s, .5, .74) }
        else { const p = seg(s, .78, 1.15), i = p < .5 ? 0 : 1, q = (p - i * .5) / .5, h = hop(q, 26); L.tx = lerp(170, 0, ease.io(p)); L.ty = h.y; L.sx = 1 + .02 * h.sq; L.sy = 1 - .035 * h.sq }
        if (s >= 1.18) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .42) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .12)), r = ease.io(seg(s, .2, .42)); L.ty = 0; L.tx = -38 * k * (1 - r * .7); L.rot = -3 * DEG * k * (1 - r);
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .6 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .5 } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .42, .62); L.ty = 0; L.tx = -11 * (1 - ease.o3(p)); L.sx = lerp(.985, 1, ease.back(p)); L.sy = lerp(1.02, 1, ease.back(p)) }
        if (s >= .65) this.play("idle");
      }
      // the four drawings share the same body, hair and flames (checked by onion skin), so the sway runs on every pose
      return out;
    }
  }
  global.LanceRig = LanceRig; global.LanceAnim = LanceAnim;
})(window);
