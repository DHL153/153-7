"use strict";
/* ============================================================================
   좀비 의사 (zombie doctor) — mesh-deform rig, same family as the other enemies
   - One continuous mesh per drawing. Long hair ripples on a travelling wave; the tail wags as a rigid
     piece around its root. Face, horns, hands, bow and arrow sit on zero weight in every drawing.
   - Three drawings: stance (arrow drawn), release (hand open, no arrow), hit. release and hit were
     registered onto the stance body (affine fit on the goat body and legs), so a swap never jumps.
   - Whole-body moves (leap, lean, recoil, knock-back) pivot on the hooves.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec2 aW;
uniform vec2 uPivH, uPivT, uAnchor; uniform float uAH, uAT, uT;   // H = bird head nod, T(here) = pig head sniff
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivH,uAH*aW.x);                                           // bird head: one rigid nod angle
    p=rot(p,uPivT,uAT*aW.y);                                           // pig head: one rigid sniff angle
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class DocRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1536; cv.height = 1280; this.cv = cv;
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uPivH","uPivT","uAnchor","uAH","uAT","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {}; this.pv = {};
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wH[j][i], P.wP[j][i]);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b; this.pv[k] = [W.pivH, W.pivP] }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); this.tex = {};
      for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uAnchor, W.anchor); gl.uniform1i(this.u.uTex, 0);
    }
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1536, 1280); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        if ((L.alpha ?? 1) <= .001) continue;
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uAH, D.head || 0); gl.uniform1f(u.uAT, D.pig || 0); gl.uniform1f(u.uT, D.t || 0) }
        gl.uniform2fv(u.uPivH, this.pv[L.tex][0]); gl.uniform2fv(u.uPivT, this.pv[L.tex][1]);
        const c = Math.cos(L.rot || 0), s = Math.sin(L.rot || 0), sx = L.sx ?? 1, sy = L.sy ?? 1;
        gl.uniform4f(u.uM, c * sx, -s * sy, s * sx, c * sy); gl.uniform2f(u.uT2, L.tx || 0, L.ty || 0);
        const t = L.tint || [1, 1, 1, 0]; gl.uniform4f(u.uTint, t[0], t[1], t[2], t[3]); gl.uniform1f(u.uAlpha, L.alpha ?? 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wb[L.tex]); gl.vertexAttribPointer(this.aW, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[L.tex]); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
      }
      return this.cv;
    }
  }
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  const steps = (p, n) => { const q = p * n, i = Math.floor(q), f = q - i; return Math.min(1, (i + ease.o3(Math.min(1, f * 3))) / n) };   // stop-motion: jerk, then hold
  class DocAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.lastStep = -1 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.lastStep = -1 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: a loose zombie sway from the feet, the scalpel hand twitches every so often
      const br = Math.sin(T * 1.9), tw = Math.max(0, Math.sin(T * .7)) ** 18;
      const L = { tex: "stance", rot: 1.6 * DEG * Math.sin(T * 1.1), sx: 1 - .006 * br, sy: 1 + .012 * br };
      const out = { layers: [L], shake: 0, flash: 0, clip: 0, dirt: -1, glint: -1, slash: 0, hitspark: -1 };
      let arm = (2.5 * Math.sin(T * 1.6) + 9 * tw * Math.sin(T * 40)) * DEG;
      if (this.state === "enter") {
        // A the ground bulges and cracks 0–0.3 · B it claws its way up in jerky stop-motion steps 0.25–1.4 (clipped at the floor)
        // C pops free, shakes off the dirt 1.4–1.7 · D cackles, the head mirror glints 1.6–2.2 · idle at 2.3
        out.dirt = s < 1.6 ? seg(s, 0, 1.6) : -1;
        if (s < 1.4) { const p = steps(seg(s, .25, 1.4), 6), n = Math.floor(seg(s, .25, 1.4) * 6); L.ty = lerp(760, 0, p); L.rot = (n % 2 ? 5 : -5) * DEG * (1 - p); arm = -22 * DEG * p; out.clip = 1;
          if (s > .25 && n !== this.lastStep) { this.lastStep = n; this.events.push("claw") } }
        else if (s < 1.7) { const p = seg(s, 1.4, 1.7); L.sx = 1 + .05 * Math.sin(p * 30) * (1 - p); L.sy = 1 - .05 * Math.sin(p * 30) * (1 - p); L.rot = 3 * DEG * Math.sin(p * 40) * (1 - p); arm = lerp(-22, 0, p) * DEG; if (this.once("free")) { this.events.push("free"); out.shake = .3 } }
        if (s > 1.6 && s < 2.2) { L.tex = "cackle"; L.ty = (L.ty || 0) - 4 * Math.abs(Math.sin(s * 28)); if (this.once("cackle")) this.events.push("cackle") }
        out.glint = s > 1.75 ? seg(s, 1.75, 2.05) : -1;
        if (s > 2.3) this.play("idle");
      }
      if (this.state === "attack") {
        // A cackle + raise the scalpel 0–0.35 (tremble) · B SLASH 1 0.35–0.43 · C re-raise 0.43–0.58 · D SLASH 2 0.58–0.66 ("hit")
        // E hold, then the arm settles 0.66–1.1 · idle at 1.45
        L.tex = s < 1.1 ? "cackle" : "stance";
        const k1 = ease.o3(seg(s, .35, .43)), r = ease.io(seg(s, .43, .58)), k2 = ease.o3(seg(s, .58, .66)), back = ease.back(seg(s, .8, 1.15));
        if (s < .35) { const p = ease.io(seg(s, 0, .28)); arm = -30 * DEG * p + (s > .2 ? Math.sin(s * 110) * 1.5 * DEG : 0); L.rot = -2.5 * DEG * p; L.tx = -10 * p }
        else if (s < .58) { arm = (s < .43 ? lerp(-30, 34, k1) : lerp(34, -22, r)) * DEG; L.tx = lerp(-10, 22, k1) * (1 - .5 * r); L.rot = lerp(-2.5, 2.5, k1) * DEG; out.slash = s < .5 ? 1 : 0;
          if (this.once("s1")) { this.events.push("slash"); out.shake = .25 } }
        else { arm = lerp(lerp(-22, 38, k2), 0, back) * DEG; L.tx = lerp(11, 26, k2) * (1 - back); L.rot = lerp(0, 3, k2) * DEG * (1 - back); out.slash = s < .72 ? 2 : 0;
          if (this.once("s2")) { this.events.push("slash"); out.shake = .45 } if (s > .66 && this.once("hit")) this.events.push("hit") }
        if (s >= 1.45) this.play("idle");
      }
      if (this.state === "hurt") {
        // snapped back by the hit, then creaks back upright in four jerky steps (like a puppet)
        L.tex = s < .9 ? "hit" : "stance"; arm = 0;
        if (s < .45) { const k = ease.o3(seg(s, 0, .08)); L.rot = -6 * DEG * k; L.tx = -40 * k; L.sx = 1 + .02 * k; L.sy = 1 - .03 * k;
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash]; if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45 } out.hitspark = seg(s, 0, .3) }
        else { const q = seg(s, .45, .95), p = steps(q, 4), n = Math.floor(q * 4); L.rot = -6 * DEG * (1 - p); L.tx = -40 * (1 - p); if (n !== this.lastStep && q < 1) { this.lastStep = n; this.events.push("creak") } }
        if (s >= 1.1) this.play("idle");
      }
      L.deform = { head: arm, pig: 0, t: T }; out.arm = arm;
      return out;
    }
  }
  global.DocRig = DocRig; global.DocAnim = DocAnim;
})(window);
