"use strict";
/* ============================================================================
   유령 석궁 사수 (ghost crossbow gunner) — mesh-deform rig, same family as the claw ghost and the lancer
   - One continuous mesh per drawing, so nothing is cut and nothing can crack.
   - The three drawings share one body pixel-for-pixel (the fire and hit drawings were composited onto the
     stance body: only the face, and in "hit" the head + hat, come from the new drawing). A pose change is
     therefore a clean swap at any moment.
   - Moving parts: the hat rotates on a spring around the brim centre (it lags behind recoil and hits),
     the skirt hem flutters a little. Face, crossbow, hands and boots sit on zero weight in every pose.
   - Big motions (recoil kick, knock-back, rising out of the shadow) rotate / move the whole drawing
     around the feet, so the crossbow always stays perfectly straight.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec3 aW;
uniform vec2 uPivH, uPivM, uAnchor; uniform float uAH, uAM, uT;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivH,uAH*aW.x);                                              // hat: one rigid angle from the spring
    p=rot(p,uPivM,uAM*aW.y*sin(uT*4.2-distance(aPos,uPivM)*0.035));       // hem: a travelling ripple
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class BowRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1536; cv.height = 1280; this.cv = cv;   // margins so kicks never clip
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uPivH","uPivM","uAnchor","uAH","uAM","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {}; this.piv = {};
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wH[j][i], P.wM[j][i], 0);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b; this.piv[k] = P.pivH }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); this.tex = {};
      for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uPivM, W.pivM); gl.uniform2fv(this.u.uAnchor, W.anchor); gl.uniform1i(this.u.uTex, 0);
    }
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1536, 1280); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uAH, D.hat || 0); gl.uniform1f(u.uAM, D.hem || 0); gl.uniform1f(u.uT, D.t || 0) }
        gl.uniform2fv(u.uPivH, this.piv[L.tex]);
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
  class BowAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.hat = 0; this.hatV = 0; this.prevRot = 0 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    kick(v) { this.hatV += v * DEG * 10 }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: slow breath (feet stay planted: the scale is anchored at the feet) + a tiny aim drift
      const br = Math.sin(T * 2.6);
      const L = { tex: "stance", rot: .35 * DEG * Math.sin(T * .9), sx: 1 - .006 * br, sy: 1 + .014 * br };
      const out = { layers: [L], shake: 0, flash: 0, pool: -1, rise: 1, glint: -1, charge: -1, muzzle: -1, bolt: -1, hitspark: -1, smoke: -1 };
      let hem = 1.2 * DEG;
      if (this.state === "enter") {
        // A the shadow pool spreads 0–0.45 · B a dark silhouette rises out of it 0.3–1.15
        // C colour comes back 1.0–1.45 · D the hat's red eye flashes 1.45 · E pool fades, idle at 1.85
        out.pool = s; const r = ease.o3(seg(s, .3, 1.15));
        L.ty = lerp(760, 0, r); L.sx = lerp(.9, 1, r) * (1 - .006 * br); L.sy = lerp(1.12, 1, r) * (1 + .014 * br);
        out.rise = r; hem = lerp(5, 1.2, r) * DEG;
        if (s > 1.12 && this.once("settle")) this.kick(-2.6);
        if (this.fxOn) { const c = 1 - ease.io(seg(s, 1.0, 1.45)); L.tint = [.06, .03, .1, c] }
        else { L.alpha = ease.io(seg(s, .3, .9)) }
        if (s > 1.45 && this.once("glint")) this.events.push("glint");
        out.glint = seg(s, 1.45, 1.85);
        if (s > 1.85) this.play("idle");
      }
      if (this.state === "attack") {
        // A aim 0–0.30: sink a little, lean into the shot, tremble while holding the breath
        // B FIRE 0.30: swap to the fire face, the crossbow kicks up (whole body rotates back around the feet)
        // C recover 0.36–0.95 with a small overshoot · face back to the wink at 0.78 · idle at 1.05
        if (s < .30) { const p = ease.io(seg(s, 0, .2)); L.rot = (.35 * Math.sin(T * .9) + 1.6 * p) * DEG; L.sx = 1 + .012 * p; L.sy = 1 - .03 * p;
          if (s > .14) { L.tx = Math.sin(s * 110) * 1.4; L.ty = Math.cos(s * 90) * .8 } out.charge = seg(s, 0, .3) }
        else { const k = ease.o3(seg(s, .30, .345)), r = ease.back(seg(s, .40, .95));
          L.tex = s < .78 ? "fire" : "stance";
          L.rot = lerp(1.6, -7, k) * DEG * (1 - r) + .35 * DEG * Math.sin(T * .9) * r;
          L.tx = -26 * k * (1 - r); L.sx = lerp(1.012, .985, k) + (1 - lerp(1.012, .985, k)) * r; L.sy = lerp(.97, 1.03, k) + (1 - lerp(.97, 1.03, k)) * r;
          if (this.once("shoot")) { this.events.push("shoot"); this.kick(-5.5); out.shake = .6 }
          if (s > .40 && this.once("hit")) this.events.push("hit");
          out.muzzle = seg(s, .30, .5); out.bolt = seg(s, .30, .46); out.smoke = seg(s, .30, 1.1); out.flash = 1 - seg(s, .30, .38) }
        if (s >= 1.05) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .45) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .1)), r = ease.io(seg(s, .18, .45));
          L.rot = -5 * DEG * k * (1 - r); L.tx = -34 * k * (1 - r * .75); L.sx = 1 + .02 * k * (1 - r); L.sy = 1 - .03 * k * (1 - r);
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); this.kick(-4.2); out.shake = .45 } out.hitspark = seg(s, 0, .3); hem = 3 * DEG }
        else { const p = seg(s, .45, .68); L.tx = -8.5 * (1 - ease.o3(p)); L.sx = lerp(.99, 1, ease.back(p)); L.sy = lerp(1.015, 1, ease.back(p)) }
        if (s >= .72) this.play("idle");
      }
      // hat spring: follows the body's rotation with lag, plus a slow idle nod; kicks add velocity
      const dr = (L.rot || 0) - this.prevRot; this.prevRot = L.rot || 0;
      const target = .9 * DEG * Math.sin(T * 2.6 - .8);
      const acc = 140 * (target - this.hat) - 9 * this.hatV - (dt > 0 ? dr / dt * 2.2 : 0);
      this.hatV += acc * dt; this.hat += this.hatV * dt; this.hat = clamp(this.hat, -9 * DEG, 9 * DEG);
      L.deform = { hat: this.hat, hem, t: T };
      return out;
    }
  }
  global.BowRig = BowRig; global.BowAnim = BowAnim;
})(window);
