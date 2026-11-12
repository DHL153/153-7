"use strict";
/* ============================================================================
   불꽃 창 망령 (flame spear wraith) — mesh-deform rig, same family as the other enemies
   - One continuous mesh per drawing. Flames ripple on two travelling waves; armor, helmet, hands
     and the spear sit on zero weight in every drawing, so the spear never bends.
   - It floats, so the whole drawing can rotate and fly freely around the body centre (anchor).
   - Three drawings: stance, strike (diving stab), hit. stance↔strike share the body position;
     hit was drawn knocked back on the same spear line, so the swap itself reads as the recoil.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute float aW;
uniform vec2 uAnchor; uniform float uA1, uA2, uT;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    float d=distance(aPos,uAnchor);
    p=rot(p,uAnchor,uA1*aW*sin(uT*5.4-d*0.026));                         // main flicker, rolling outwards
    p=rot(p,uAnchor+vec2(180.0,260.0),uA2*aW*sin(uT*3.3-d*0.018+1.7));   // slower second wave, other centre
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(384.0,256.0); gl_Position=vec4(p.x/896.0-1.0, 1.0-p.y/768.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class SpearRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1792; cv.height = 1536; this.cv = cv;   // wide margins: big rotations never clip
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uAnchor","uA1","uA2","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {};
      for (const k in W.poses) { const a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(W.poses[k].w[j][i]);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); this.tex = {};
      for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uAnchor, W.anchor); gl.uniform1i(this.u.uTex, 0);
    }
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1792, 1536); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        if ((L.alpha ?? 1) <= 0.001) continue;
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uA1, D.a1 || 0); gl.uniform1f(u.uA2, D.a2 || 0); gl.uniform1f(u.uT, D.t || 0) }
        const c = Math.cos(L.rot || 0), s = Math.sin(L.rot || 0), sx = L.sx ?? 1, sy = L.sy ?? 1;
        gl.uniform4f(u.uM, c * sx, -s * sy, s * sx, c * sy); gl.uniform2f(u.uT2, L.tx || 0, L.ty || 0);
        const t = L.tint || [1, 1, 1, 0]; gl.uniform4f(u.uTint, t[0], t[1], t[2], t[3]); gl.uniform1f(u.uAlpha, L.alpha ?? 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.wb[L.tex]); gl.vertexAttribPointer(this.aW, 1, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[L.tex]); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
      }
      return this.cv;
    }
  }
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), i2: t => t * t, io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  const bez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  class SpearAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = [] }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: hover — bob up and down, the body tilts a beat behind the bob
      const hov = Math.sin(T * 2.0), tilt = Math.sin(T * 2.0 - .7);
      const L = { tex: "stance", ty: -14 * hov, rot: 1.8 * DEG * tilt };
      const out = { layers: [L], shake: 0, flash: 0, trail: null, impact: -1, burst: -1, gather: -1, speed: -1, speedDir: 0 };
      let a1 = 2.0 * DEG, a2 = 1.2 * DEG;   // flame flicker; peaks stay ≤ 4° so flame outlines never smear
      const ghosts = (tex, pts, col) => { if (!this.fxOn) return; pts.forEach((p, k) => out.layers.unshift({ tex, tx: p[0], ty: p[1], rot: p[2], alpha: p[3], tint: col })) };
      if (this.state === "enter") {
        // A swoop in from the lower right along the drawing's own direction (0–0.55), overshoot past home
        // B brake: lean back, flames flare (0.55–0.95) · C settle into the hover (0.95–1.6)
        const SX = 1750, SY = 980, CXc = 520, CYc = 260, OX = -95, OY = -70;
        if (s < .55) { const p = ease.o3(seg(s, 0, .55)); L.tx = bez(SX, CXc, OX, p); L.ty = bez(SY, CYc, OY, p); L.rot = -7 * DEG * (1 - p); a1 = 3.5 * DEG; a2 = 2.2 * DEG;
          out.speed = 1 - p; out.speedDir = -2.4;
          const pts = []; for (let k = 1; k <= 4; k++) { const q = ease.o3(seg(s - k * .035, 0, .55)); pts.push([bez(SX, CXc, OX, q), bez(SY, CYc, OY, q), -7 * DEG * (1 - q), .26 * (1 - k * .2) * (1 - p * .6)]) }
          ghosts("stance", pts, [1, .45, .15, .8]); out.trail = [L.tx, L.ty] }
        else if (s < .95) { const p = seg(s, .55, .95), b = ease.back(p); L.tx = lerp(OX, 0, b); L.ty = lerp(OY, 0, b) - 14 * Math.sin(T * 2.0) * p; L.rot = lerp(14, 0, ease.io(p)) * DEG + 1.8 * DEG * tilt * p;
          L.sx = lerp(.94, 1, ease.o3(p)); L.sy = lerp(1.06, 1, ease.o3(p)); a1 = lerp(3.5, 2.0, p) * DEG; a2 = lerp(2.2, 1.2, p) * DEG;
          if (this.once("brake")) { this.events.push("brake"); out.shake = .35 } out.burst = seg(s, .55, 1.0) }
        else { const p = seg(s, .95, 1.6); L.ty = -14 * hov * p; L.rot = 1.8 * DEG * tilt * p }
        if (s > 1.6) this.play("idle");
      }
      if (this.state === "attack") {
        // A wind-up 0–0.38: rise and pull back, the spear cocks up, flames swell, tremble
        // B dive 0.38–0.46: swap to the strike drawing, shoot down-left · C impact 0.46, hold 0.46–0.58
        // D fly home 0.58–1.08 (stance drawing again from 0.62) · idle at 1.3
        const UPX = 70, UPY = -95, HX = -330, HY = 170;
        if (s < .38) { const p = ease.io(seg(s, 0, .3)); L.tx = UPX * p; L.ty = lerp(-14 * hov, UPY, p); L.rot = lerp(1.8 * DEG * tilt, 16 * DEG, p);
          L.sx = 1 - .03 * p; L.sy = 1 + .04 * p; a1 = lerp(2.0, 3.6, p) * DEG; a2 = lerp(1.2, 2.3, p) * DEG;
          if (s > .2) { L.tx += Math.sin(s * 120) * 2.2; L.ty += Math.cos(s * 97) * 1.6 } out.gather = seg(s, .05, .38) }
        else if (s < .58) { const p = ease.o3(seg(s, .38, .46)); L.tex = "strike"; L.tx = lerp(UPX, HX, p); L.ty = lerp(UPY, HY, p); L.rot = lerp(10, -4, p) * DEG;
          L.sx = lerp(1.08, 1, ease.o3(seg(s, .44, .56))); L.sy = lerp(.93, 1, ease.o3(seg(s, .44, .56))); a1 = 3.6 * DEG; a2 = 2.3 * DEG;
          if (s < .48) { out.speed = 1 - seg(s, .38, .5); out.speedDir = 2.6; const pts = []; for (let k = 1; k <= 3; k++) { const q = ease.o3(seg(s - k * .02, .38, .46)); pts.push([lerp(UPX, HX, q), lerp(UPY, HY, q), lerp(10, -4, q) * DEG, .3 * (1 - k * .25)]) } ghosts("strike", pts, [1, .45, .15, .8]) }
          if (s >= .46 && this.once("hit")) { this.events.push("hit"); out.shake = .9 }
          if (s >= .46) { L.tx += Math.sin(s * 140) * 3 * (1 - seg(s, .46, .58)); out.impact = seg(s, .46, .8) } out.flash = 1 - seg(s, .46, .52) }
        else { const p = seg(s, .58, 1.08), e = ease.io(p); L.tx = lerp(HX, 0, e); L.ty = lerp(HY, 0, e) - 90 * Math.sin(Math.PI * e) - 14 * hov * seg(s, .9, 1.3); L.rot = lerp(-4, 0, ease.back(p)) * DEG + 1.8 * DEG * tilt * seg(s, .9, 1.3);
          L.tex = s < .62 ? "strike" : "stance";                       // hard swap mid-flight (a cross-fade would show two helmets)
          if (s >= .62 && this.once("swap")) { this.events.push("puff"); L.sx = .96; L.sy = 1.05 }
          a1 = lerp(3.6, 2.0, p) * DEG; a2 = lerp(2.3, 1.2, p) * DEG; out.impact = seg(s, .46, .8) }
        if (s >= 1.3) this.play("idle");
      }
      if (this.state === "hurt") {
        // the hit drawing is already knocked back on the same spear line: swap + a shove, flash, flames blow out
        // swap back to the stance at 0.40 with a small flame puff while drifting home · idle at 0.8
        const k = ease.o3(seg(s, 0, .1)), r = ease.io(seg(s, .2, .6));
        L.tex = "hit"; L.tx = 46 * k * (1 - r); L.ty = -30 * k * (1 - r) - 14 * hov * r; L.rot = (7 * k * (1 - r)) * DEG + 1.8 * DEG * tilt * r;
        out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .6 * out.flash];
        a1 = lerp(4, 2.0, seg(s, 0, .6)) * DEG; a2 = lerp(2.5, 1.2, seg(s, 0, .6)) * DEG;
        if (this.once("hurt")) { this.events.push("hurt"); out.shake = .5 }
        if (s > .40) { L.tex = "stance"; L.tint = null; L.sx = lerp(.95, 1, ease.back(seg(s, .40, .55))); L.sy = lerp(1.05, 1, ease.back(seg(s, .40, .55)));
          if (this.once("swap")) this.events.push("puff") }                 // hard swap with a flame puff, no double image
        if (s >= .8) this.play("idle");
      }
      const D = { a1, a2, t: T };
      for (const Q of out.layers) if (Q.deform === undefined) Q.deform = D;
      return out;
    }
  }
  global.SpearRig = SpearRig; global.SpearAnim = SpearAnim;
})(window);
