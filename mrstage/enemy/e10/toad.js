"use strict";
/* ============================================================================
   눈알 두꺼비 (many-eyed toad) — mesh-deform rig, same family as the other enemies
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
  class ToadRig {
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
  const BALL0 = [785, 635], MOUTH = [520, 565];
  class ToadAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.hd = 0; this.hdV = 0; this.bOff = 0; this.lastStep = -1; this.lastDust = -1 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.lastStep = -1; this.lastDust = -1 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    jolt(v) { this.hdV += v * DEG * 30 }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: a squishy breath (wide on the out-breath), the ball floats and turns beside it
      const br = Math.sin(T * 2.3);
      const L = { tex: "stance", sx: 1 + .018 * br, sy: 1 - .022 * br };
      const B = { x: BALL0[0], y: BALL0[1] - 10 - 8 * Math.sin(T * 1.7), rot: T * .6 + this.bOff, s: 1, a: 1, glow: .5 + .3 * Math.sin(T * 2.6) };
      const out = { layers: [L], ball: B, shake: 0, flash: 0, dizzy: 0, rollShadow: 0, rise: 1, pop: -1, suck: -1, spit: -1, shot: null, hitspark: -1, clip: 0 };
      let head = 0;
      if (this.state === "enter") {
        // A it rolls in curled up like a football, 3 full turns with little bounces (eyes shut = hit drawing) 0–1.3
        // B one last hop and a squishy landing upright 1.3–1.6 · C the eyes pop open 1.55 · D dizzy wobble, stars 1.6–2.15
        // E the ball rolls in just ahead of it and stops first (spin = distance / radius) · idle at 2.25
        const X0 = -1500, TURNS = 3;
        if (s < 1.3) { const p = s / 1.3, e = 1 - Math.pow(1 - p, 2); L.tex = "hit"; L.tx = lerp(X0, 0, e); L.spin = TURNS * 2 * Math.PI * e;
          const bp = (e * 6) % 1; L.ty = -38 * Math.sin(Math.PI * bp) * (1 - .5 * p); out.rollShadow = 1;
          const n = Math.floor(e * 6); if (n !== this.lastStep) { if (this.lastStep >= 0) this.events.push("bounce"); this.lastStep = n } }
        else if (s < 1.6) { const p = seg(s, 1.3, 1.6); L.tex = s < 1.55 ? "hit" : "stance"; L.ty = -50 * Math.sin(Math.PI * seg(s, 1.3, 1.45));
          if (s > 1.45) { const k = 1 - seg(s, 1.45, 1.6); L.sx = 1 + .1 * k; L.sy = 1 - .12 * k; if (this.once("land")) { this.events.push("land"); out.shake = .35; this.jolt(-1.5) } } }
        else { const p = seg(s, 1.6, 2.15); L.rot = 5 * DEG * Math.sin(p * Math.PI * 4) * (1 - p); L.sx = 1 + .04 * Math.sin(p * 18) * (1 - p); L.sy = 1 - .04 * Math.sin(p * 18) * (1 - p); out.dizzy = 1 - p }
        if (s > 1.55 && this.once("pop")) { this.events.push("pop"); this.jolt(1.5) } out.pop = s > 1.55 ? seg(s, 1.55, 1.95) : -1;
        const q = seg(s, 0, 1.2), qe = 1 - Math.pow(1 - q, 2.2); B.x = lerp(BALL0[0] + X0, BALL0[0], qe);   // the ball leads the way and stops first, so it never passes over the toad B.y = BALL0[1] - Math.abs(Math.sin(qe * Math.PI * 4)) * 50 * (1 - qe) - 10 * seg(s, 1.9, 2.1);
        B.rot = (B.x - BALL0[0]) / 105; B.a = 1; this.bOff = B.rot - T * .6;
        if (s > 2.25) this.play("idle");
      }
      if (this.state === "attack") {
        // A gape + suck 0–0.45: the ball spins into the mouth, shrinking · B gulp 0.45: swap to the puffed drawing
        // C chew / swell 0.45–0.95, trembling bigger and bigger · D SPIT 0.95: mouth open again, recoil, the ball shoots at the player
        // E the ball flies 0.95–1.35 ("hit" 1.15) · F a new ball rolls back in 1.4–1.9 · idle at 2.0
        if (s < .45) { const p = ease.io(seg(s, 0, .45)); L.sx = 1 - .03 * p; L.sy = 1 + .04 * p; L.rot = 3 * DEG * p; head = -3 * DEG * p;
          B.x = lerp(BALL0[0], MOUTH[0], ease.io(p)); B.y = lerp(BALL0[1], MOUTH[1], ease.io(p)) - 40 * Math.sin(Math.PI * p); B.rot = T * .6 - p * 12; B.s = lerp(1, .35, ease.io(seg(s, .2, .45))); out.suck = seg(s, 0, .45) }
        else if (s < .95) { L.tex = "puff"; B.a = 0; const k = 1 - seg(s, .45, .6), sw = seg(s, .55, .95);
          L.sx = 1 + .05 * k + .03 * sw + Math.sin(s * 60) * .006 * sw; L.sy = 1 - .06 * k + .02 * sw; L.rot = -2 * DEG * sw; L.tx = Math.sin(s * 95) * 2.2 * sw; head = 2 * DEG * Math.sin(s * 22) * sw;
          if (this.once("gulp")) { this.events.push("gulp"); this.jolt(-.8) } }
        else { const k = ease.o3(seg(s, .95, 1.02)), r = ease.back(seg(s, 1.05, 1.6)); L.tex = "stance"; L.rot = lerp(-2, 6, k) * DEG * (1 - r); L.tx = -24 * k * (1 - r); L.sx = 1 + .04 * k * (1 - r); L.sy = 1 - .05 * k * (1 - r);
          if (this.once("spit")) { this.events.push("spit"); out.shake = .45; this.jolt(2) } out.spit = seg(s, .95, 1.2);
          out.shot = s < 1.35 ? seg(s, .95, 1.35) : null; if (s > 1.15 && this.once("hit")) this.events.push("hit");
          B.a = s < 1.4 ? 0 : 1; const q = seg(s, 1.4, 1.95); B.x = lerp(BALL0[0] + 650, BALL0[0], ease.o3(q)); B.y = BALL0[1] - Math.abs(Math.sin(q * Math.PI * 2)) * 70 * (1 - q) - 10 * seg(s, 1.85, 2.0); B.rot = -(B.x - BALL0[0]) / 105; this.bOff = B.rot - T * .6 }
        if (s >= 2.0) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .5) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .08)), r = ease.io(seg(s, .2, .5)); L.rot = -4 * DEG * k * (1 - r); L.tx = -34 * k * (1 - r * .75);
          L.sx = 1 - .05 * k * (1 - r) + .03 * Math.sin(s * 40) * (1 - r); L.sy = 1 + .06 * k * (1 - r) - .03 * Math.sin(s * 40) * (1 - r);
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45; this.jolt(-2.2) } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .5, .72); L.tx = -8.5 * (1 - ease.o3(p)); if (this.once("pop2")) this.events.push("pop") ; out.pop = seg(s, .5, .9) }
        if (s >= .78) this.play("idle");
      }
      // head dome on a spring: jiggles after every jolt, plus the breath
      this.hdV += (-140 * this.hd - 7 * this.hdV) * dt; this.hd += this.hdV * dt; this.hd = clamp(this.hd, -6 * DEG, 6 * DEG);
      L.deform = { head: head + this.hd + .8 * DEG * Math.sin(T * 2.3 - .6), pig: 0, t: T };
      return out;
    }
  }
  global.ToadRig = ToadRig; global.ToadAnim = ToadAnim;
})(window);
