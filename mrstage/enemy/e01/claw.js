"use strict";
/* ============================================================================
   클로 망령 (claw enemy) — mesh-deform rig
   Why this design:
   - The 3/4-view art has big overlapping shapes (hair over head, claws over legs). Cutting it into
     rotating pieces would expose hidden areas at every joint. Instead the WHOLE drawing is one
     continuous mesh that bends smoothly (Live2D-style deformers): arms rotate around the shoulders,
     hair sways around the head, the chest rises on breath. One mesh = no seams, no cracks.
   - Big pose changes (wind-up, strike, hit) are the drawn key poses themselves. They are swapped on the
     fastest frame and the motion between them is sold with timing: anticipation squash, a short smear,
     slash arcs, hit-stop, settle. Small motion inside a pose = deformers; big motion = key art.
   - Every deformer amplitude is capped so the stretch band between parts never reads as a bend in the art.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec4 aW;
uniform vec2 uPivL, uPivR, uPivH, uAnchor; uniform float uAngL, uAngR, uHairA, uT, uBreath;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV; varying float vY;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivL,uAngL*aW.x);
    p=rot(p,uPivR,uAngR*aW.y);
    float d=distance(aPos,uPivH);
    p=rot(p,uPivH,uHairA*aW.z*sin(uT*1.7-d*0.012));
    p.y-=uBreath*aW.w;
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  vY=p.y;
  gl_Position=vec4(p.x/512.0-1.0, 1.0-p.y/512.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha, uGround, uGroundSoft;
varying vec2 vUV; varying float vY;
void main(){
  vec4 c=texture2D(uTex,vUV);
  c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a);
  float g=1.0-smoothstep(uGround-uGroundSoft, uGround, vY);
  gl_FragColor=c*uAlpha*g;
}`;
  class ClawRig {
    constructor(W, imgs) {
      this.W = W; const cv = document.createElement("canvas"); cv.width = cv.height = 1024; this.cv = cv;
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr); this.pr = pr;
      this.u = {}; for (const n of ["uPivL","uPivR","uPivH","uAnchor","uAngL","uAngR","uHairA","uT","uBreath","uM","uT2","uDeform","uTex","uTint","uAlpha","uGround","uGroundSoft"]) this.u[n] = gl.getUniformLocation(pr, n);
      // mesh: one continuous grid (65 x 57 vertices) carrying the four deformer weights
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], wt = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY); wt.push(W.wL[j][i], W.wR[j][i], W.wH[j][i], W.wB[j][i]) }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, loc); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0) };
      buf(pos, "aPos", 2); buf(wt, "aW", 4);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.tex = {}; for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uPivL, W.pivL); gl.uniform2fv(this.u.uPivR, W.pivR); gl.uniform2fv(this.u.uPivH, W.pivH); gl.uniform2fv(this.u.uAnchor, W.anchor); gl.uniform1i(this.u.uTex, 0);
    }
    /* layers: [{tex, deform:{angL,angR,hair,breath,t}, sx,sy,rot,tx,ty, tint:[r,g,b,a], alpha, ground}] */
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1024, 1024); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uAngL, D.angL || 0); gl.uniform1f(u.uAngR, D.angR || 0); gl.uniform1f(u.uHairA, D.hair || 0); gl.uniform1f(u.uT, D.t || 0); gl.uniform1f(u.uBreath, D.breath || 0) }
        const c = Math.cos(L.rot || 0), s = Math.sin(L.rot || 0), sx = L.sx ?? 1, sy = L.sy ?? 1;
        gl.uniform4f(u.uM, c * sx, -s * sy, s * sx, c * sy); gl.uniform2f(u.uT2, L.tx || 0, L.ty || 0);
        const t = L.tint || [1, 1, 1, 0]; gl.uniform4f(u.uTint, t[0], t[1], t[2], t[3]); gl.uniform1f(u.uAlpha, L.alpha ?? 1);
        gl.uniform1f(u.uGround, L.ground ?? 5000); gl.uniform1f(u.uGroundSoft, L.groundSoft ?? 6);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[L.tex]); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
      }
      return this.cv;
    }
  }

  /* ---------- the animator: one state machine, all timings in seconds ---------- */
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  class ClawAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.blinkAt = 2; this.events = []; this.fx = [] }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st; this.events.length = 0;
      // breathing + sway run under every state (amplitudes go to zero inside big poses)
      const br = Math.sin(this.t * Math.PI * 2 / 2.6);
      const idleD = { angL: br * 1.2 * DEG, angR: -br * 1.2 * DEG, hair: 1.3 * DEG, t: this.t, breath: 3 + br * 3 };
      const L = { tex: "stance", deform: idleD }, out = { layers: [L], shake: 0, flash: 0, circle: 0, pillar: 0, slash: -1, flare: -1, hitspark: -1 };
      // blink: only inside the idle stance, short (0.11 s), random 2.5–4.5 s
      if (this.state === "idle") { if (this.t > this.blinkAt) { if (this.t > this.blinkAt + .11) this.blinkAt = this.t + 2.5 + Math.random() * 2 } if (this.t > this.blinkAt && this.t < this.blinkAt + .11) L.tex = "blink" }
      if (this.state === "enter") {
        // 0–0.5 circle opens · 0.45–1.35 she rises out of it (clipped at the ground) · 1.5 claws spread (swap to stance) · circle closes by 2.3
        out.circle = s < .5 ? ease.o3(s / .5) : s < 1.7 ? 1 : 1 - ease.io(seg(s, 1.7, 2.3)); out.pillar = s < .4 ? 0 : s < 1.4 ? Math.sin(seg(s, .4, 1.4) * Math.PI) : 0;
        if (s < 1.5) { const r = ease.o3(seg(s, .45, 1.35)); L.tex = "base"; L.deform = null; L.ty = lerp(720, 0, r); L.ground = 851; L.groundSoft = 4;
          L.alpha = s < .45 ? 0 : 1; if (this.fxOn) L.tint = [1, .45, .35, lerp(.6, 0, seg(s, .9, 1.45))] }
        else { const p = seg(s, 1.5, 1.85); L.sx = lerp(1.05, 1, ease.back(p)); L.sy = lerp(.95, 1, ease.back(p)); if (this.once("flare")) { this.events.push("flare"); out.shake = .5 } out.flare = seg(s, 1.5, 1.95) }
        if (s > 2.4) this.play("idle");
      }
      if (this.state === "attack") {
        // A anticipation 0–0.10 (stance squashes, claws lift on the deformer) · B wind-up 0.10–0.36 (held, trembling)
        // C strike 0.36 (swap + smear + slash + hit-stop + lunge) · D hold 0.36–0.78 · E recover 0.78–1.0
        if (s < .1) { const p = ease.io(s / .1); L.sx = 1 + .02 * p; L.sy = 1 - .035 * p; idleD.angL += 4 * DEG * p; idleD.angR -= 4 * DEG * p }
        else if (s < .36) { const p = seg(s, .1, .2); L.tex = "windup"; L.deform = null; L.sx = lerp(.97, 1, ease.back(p)); L.sy = lerp(1.05, 1, ease.back(p)); L.tx = s > .2 ? Math.sin(s * 90) * 1.4 : 0 }
        else if (s < .78) { const p = seg(s, .36, .5); L.tex = "strike"; L.deform = null; L.tx = 46 * (1 - ease.io(seg(s, .5, .78))) * (s < .5 ? ease.o3(p * 3 > 1 ? 1 : p * 3) : 1);
          L.sx = lerp(1.04, 1, ease.o3(p)); L.sy = lerp(.97, 1, ease.o3(p));
          if (this.fxOn && s < .43) { const g = 1 - seg(s, .36, .43); out.layers.unshift({ tex: "windup", deform: null, alpha: .28 * g, tint: [1, .35, .25, .6] }, { tex: "strike", deform: null, ty: -38 * g, tx: -20 * g, alpha: .35 * g, tint: [1, .4, .3, .5] }) }
          if (this.once("hit")) { this.events.push("hit"); out.shake = .6 } out.slash = seg(s, .36, .62) }
        else { const p = seg(s, .78, 1); L.sx = lerp(.985, 1, ease.back(p)); L.sy = lerp(1.025, 1, ease.back(p)) }
        if (s >= 1) this.play("idle");
      }
      if (this.state === "hurt") {
        // swap to the hit pose at once, white flash, knocked back, held, then back to the stance with a settle
        if (s < .42) { L.tex = "hit"; L.deform = null; const k = ease.o3(seg(s, 0, .12)), r = ease.io(seg(s, .2, .42)); L.tx = -34 * k * (1 - r * .7); L.rot = -2.5 * DEG * k * (1 - r);
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .75 * out.flash];
           if (this.once("hurt")) { this.events.push("hurt"); out.shake = .5 } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .42, .62); L.tx = -10 * (1 - ease.o3(p)); L.sx = lerp(.985, 1, ease.back(p)); L.sy = lerp(1.02, 1, ease.back(p)) }
        if (s >= .65) this.play("idle");
      }
      return out;
    }
  }
  global.ClawRig = ClawRig; global.ClawAnim = ClawAnim;
})(window);
