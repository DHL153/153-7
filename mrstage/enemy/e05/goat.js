"use strict";
/* ============================================================================
   산양 궁수 (goat archer) — mesh-deform rig, same family as the other enemies
   - One continuous mesh per drawing. Long hair ripples on a travelling wave; the tail wags as a rigid
     piece around its root. Face, horns, hands, bow and arrow sit on zero weight in every drawing.
   - Three drawings: stance (arrow drawn), release (hand open, no arrow), hit. release and hit were
     registered onto the stance body (affine fit on the goat body and legs), so a swap never jumps.
   - Whole-body moves (leap, lean, recoil, knock-back) pivot on the hooves.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec2 aW;
uniform vec2 uPivH, uPivT, uAnchor; uniform float uAH, uAT, uT;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivH,uAH*aW.x*sin(uT*2.7-distance(aPos,uPivH)*0.022));   // hair: wave rolling out to the tips
    p=rot(p,uPivT,uAT*aW.y);                                           // tail: one rigid angle from the animator
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class GoatRig {
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
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wH[j][i], P.wT[j][i]);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b; this.pv[k] = [P.pivH, P.pivT] }
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
        if (D) { gl.uniform1f(u.uAH, D.hair || 0); gl.uniform1f(u.uAT, D.tail || 0); gl.uniform1f(u.uT, D.t || 0) }
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
  class GoatAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.tailK = 0; this.tailV = 0 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    flick(v) { this.tailV += v }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: breath anchored at the hooves + a tiny aim sway
      const br = Math.sin(T * 2.4);
      const L = { tex: "stance", rot: .4 * DEG * Math.sin(T * .8), sx: 1 - .005 * br, sy: 1 + .012 * br };
      const out = { layers: [L], shake: 0, flash: 0, air: 0, speed: -1, charge: -1, snap: -1, arrow: -1, hitspark: -1, skid: -1 };
      let hair = 3 * DEG;
      if (this.state === "enter") {
        // A one big goat leap from off-screen (0–0.62): nose up on the way up, nose down on the way down
        // B land 0.62: squash + dust · C skid forward 0.62–0.9 · D settle and raise the bow 0.9–1.3
        const X0 = -1350, XL = -80;
        if (s < .62) { const p = s / .62; L.tx = lerp(X0, XL, p); L.ty = -260 * 4 * p * (1 - p); L.rot = lerp(-10, 9, ease.io(p)) * DEG;
          L.sx = .97; L.sy = 1.04; out.air = 1 - Math.abs(2 * p - 1) * .2; out.speed = 1 - p * .5; hair = 6 * DEG }
        else if (s < .9) { const p = seg(s, .62, .9), q = ease.o3(p); L.tx = lerp(XL, 0, q); L.ty = 0; L.rot = lerp(-4, 0, q) * DEG;
          const sq = 1 - ease.o3(seg(s, .62, .78)); L.sx = 1 + .06 * sq; L.sy = 1 - .09 * sq; out.skid = p; hair = lerp(7, 3, p) * DEG;
          if (this.once("land")) { this.events.push("land"); out.shake = .45; this.flick(-9) } }
        else { const p = seg(s, .9, 1.3); L.rot = lerp(0, .4 * DEG * Math.sin(T * .8), p); L.sx = lerp(.99, 1, ease.back(p)); L.sy = lerp(1.015, 1, ease.back(p)) }
        if (s > 1.3) this.play("idle");
      }
      if (this.state === "attack") {
        // A draw 0–0.42: lean back on the hind legs, hold the breath, tremble, a glint runs to the arrowhead
        // B release 0.42: swap to the open-hand drawing, recoil, bow snap, the arrow flies ("hit" at 0.52)
        // C recover 0.42–0.85 · D re-nock 0.86 (swap back with a small dip) · idle at 1.12
        if (s < .42) { const p = ease.io(seg(s, 0, .3)); L.rot = lerp(.4 * DEG * Math.sin(T * .8), -2.6 * DEG, p); L.tx = -12 * p; L.sx = 1 + .01 * p; L.sy = 1 - .015 * p;
          if (s > .24) { L.tx += Math.sin(s * 115) * 1.3; L.ty = Math.cos(s * 93) * .7 } out.charge = seg(s, .05, .42); hair = 2 * DEG }
        else if (s < .86) { const k = ease.o3(seg(s, .42, .47)), r = ease.back(seg(s, .5, .86)); L.tex = "release";
          L.rot = lerp(-2.6, -5, k) * DEG * (1 - r); L.tx = lerp(-12, -30, k) * (1 - r); L.sx = 1 - .02 * k * (1 - r); L.sy = 1 + .025 * k * (1 - r); hair = lerp(7, 3, seg(s, .42, .86)) * DEG;
          if (this.once("shoot")) { this.events.push("shoot"); out.shake = .35; this.flick(-7) }
          if (s > .52 && this.once("hit")) this.events.push("hit");
          out.snap = seg(s, .42, .62); out.arrow = seg(s, .42, .6) }
        else { const p = seg(s, .86, 1.08); L.ty = 5 * Math.sin(Math.PI * p); L.rot = .4 * DEG * Math.sin(T * .8) * p }
        if (s >= 1.12) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .45) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .1)), r = ease.io(seg(s, .18, .45));
          L.rot = -5 * DEG * k * (1 - r); L.tx = -36 * k * (1 - r * .75); L.sx = 1 + .02 * k * (1 - r); L.sy = 1 - .03 * k * (1 - r); hair = 7 * DEG;
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45; this.flick(-10) } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .45, .68); L.tx = -9 * (1 - ease.o3(p)); L.sx = lerp(.99, 1, ease.back(p)); L.sy = lerp(1.015, 1, ease.back(p)) }
        if (s >= .72) this.play("idle");
      }
      // tail: a lazy wag plus a spring that takes flicks (landing, shot, hit)
      this.tailV += (-160 * this.tailK - 10 * this.tailV) * dt; this.tailK += this.tailV * dt;
      const tail = (7 * Math.sin(T * 4.2) * Math.max(0, Math.sin(T * .9)) + 4 * Math.sin(T * 1.7)) * DEG + this.tailK * DEG * 3;
      L.deform = { hair, tail: clamp(tail, -22 * DEG, 22 * DEG), t: T };
      return out;
    }
  }
  global.GoatRig = GoatRig; global.GoatAnim = GoatAnim;
})(window);
