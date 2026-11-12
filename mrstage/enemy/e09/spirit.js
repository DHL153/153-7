"use strict";
/* ============================================================================
   타락 천사 사제 (fallen angel priest, boss) — mesh-deform rig, same family as the other enemies
   - One continuous mesh per drawing. Long hair ripples on a travelling wave; the tail wags as a rigid
     piece around its root. Face, horns, hands, bow and arrow sit on zero weight in every drawing.
   - Three drawings: stance (arrow drawn), release (hand open, no arrow), hit. release and hit were
     registered onto the stance body (affine fit on the goat body and legs), so a swap never jumps.
   - Whole-body moves (leap, lean, recoil, knock-back) pivot on the hooves.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec3 aW;
uniform vec2 uPivH, uPivT, uPivC, uAnchor; uniform float uAH, uAT, uAC, uT;   // H = left wing, T = right wing, C = chain
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivH,uAH*aW.x);                                           // left wing: one rigid flap angle
    p=rot(p,uPivT,uAT*aW.y);                                           // right wing: one rigid flap angle
    p=rot(p,uPivC,uAC*aW.z);                                           // chain: pendulum
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class SpiritRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1536; cv.height = 1280; this.cv = cv;
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uPivH","uPivT","uPivC","uAnchor","uAH","uAT","uAC","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {}; this.pv = {};
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wL[j][i], P.wR[j][i], P.wC[j][i]);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b; this.pv[k] = [P.pivL, W.pivR, W.pivC] }
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
        if (D) { gl.uniform1f(u.uAH, D.wl || 0); gl.uniform1f(u.uAT, D.wr || 0); gl.uniform1f(u.uAC, D.chain || 0); gl.uniform1f(u.uT, D.t || 0) }
        gl.uniform2fv(u.uPivH, this.pv[L.tex][0]); gl.uniform2fv(u.uPivT, this.pv[L.tex][1]); gl.uniform2fv(u.uPivC, this.pv[L.tex][2]);
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
  class SpiritAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.ch = 0; this.chV = 0; this.prevTx = 0 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: hovers a little off the ground, slow wing beats, halo breathes
      const hov = Math.sin(T * 1.6), beat = Math.sin(T * 2.4);
      const L = { tex: "stance", ty: -14 - 9 * hov, rot: .6 * DEG * Math.sin(T * .8) };
      const out = { layers: [L], shake: 0, flash: 0, halo: .55 + .2 * Math.sin(T * 3), beam: -1, descend: 0, ding: -1, charge: -1, mark: -1, pillar: -1, shield: -1, swirl: -1, hitspark: -1, flicker: 0, lift: 0 };
      let wl = 4 * DEG * beat, wr = 0;
      const spreadFlap = (amp, f) => { wl = amp * DEG * Math.sin(T * f); wr = -amp * DEG * Math.sin(T * f) };
      if (this.state === "enter") {
        // A a shaft of light strikes the ground 0–0.45 · B it descends inside the light, wings spread, 0.3–1.35
        // C settles: wings fold (swap to the stance drawing, feather puff) 1.35 · D the halo ignites 1.65 · idle at 2.4
        out.beam = s < 2.0 ? seg(s, 0, 2.0) : -1;
        if (s < 1.35) { const p = ease.o3(seg(s, .3, 1.35)); L.tex = "spread"; L.ty = lerp(-950, -24, p); L.rot = 0; spreadFlap(9, 7); out.descend = 1 - seg(s, 1.1, 1.35); L.alpha = this.fxOn ? 1 : seg(s, .3, .6) }
        else { const p = seg(s, 1.35, 1.75); L.ty = lerp(-24, -14 - 9 * hov, ease.io(p)); L.sx = lerp(1.04, 1, ease.back(p)); L.sy = lerp(.96, 1, ease.back(p)); wl = lerp(-10, 0, ease.back(p)) * DEG + 4 * DEG * beat * p;
          if (this.once("fold")) this.events.push("fold") }
        out.halo = s < 1.65 ? 0 : Math.min(1.6, .6 + 1.4 * (1 - seg(s, 1.65, 2.2))); if (s > 1.65 && this.once("ding")) this.events.push("ding"); out.ding = s > 1.65 ? seg(s, 1.65, 2.3) : -1;
        if (s > 2.4) this.play("idle");
      }
      if (this.state === "attack") {
        // A rise 0–0.35, wings spread (swap at 0.15) · B judgment charge 0.35–0.95: halo blazes, a sigil opens over the player
        // C the pillar of light crashes 0.95 ("hit" 1.0) · D hold 0.95–1.45 · E sink back, fold wings 1.5 · idle at 1.95
        if (s < .15) { const p = ease.io(s / .15); L.ty = lerp(-14 - 9 * hov, -30, p); L.sy = 1 - .03 * p; L.sx = 1 + .02 * p }
        else if (s < 1.5) { L.tex = "spread"; const p = ease.o3(seg(s, .15, .4)); L.ty = lerp(-30, -80, p) - 6 * Math.sin(s * 5); L.rot = -2 * DEG * p; spreadFlap(s < .95 ? 7 : 11, s < .95 ? 5 : 9);
          if (this.once("spread")) { this.events.push("spread"); out.shake = .2 }
          out.charge = seg(s, .35, .95); out.mark = s < 1.45 ? seg(s, .35, 1.45) : -1; out.halo = s < .95 ? lerp(.8, 2, out.charge) : lerp(2, .8, seg(s, .95, 1.45));
          if (s > .3 && s < .95) { L.tx = Math.sin(s * 90) * 1.5 * seg(s, .5, .95) }
          if (s >= .95) { const k = 1 - seg(s, .95, 1.1); L.rot = lerp(-2, 3, ease.o3(seg(s, .95, 1.05))) * DEG; L.ty += 10 * k; out.pillar = seg(s, .95, 1.6);
            if (this.once("crash")) { this.events.push("crash"); out.shake = .8; out.flash = 1 } }
          if (s > 1.0 && this.once("hit")) this.events.push("hit") }
        else { const p = seg(s, 1.5, 1.9); L.ty = lerp(-80, -14 - 9 * hov, ease.io(p)); L.rot = lerp(3, 0, ease.io(p)) * DEG; L.sx = lerp(1.03, 1, ease.back(p)); L.sy = lerp(.97, 1, ease.back(p));
          if (this.once("fold")) this.events.push("fold"); out.pillar = seg(s, .95, 1.6) }
        if (s >= 1.95) this.play("idle");
      }
      if (this.state === "pray") {
        // boss skill: bows the head a touch, black feathers swirl in, a barrier of light closes around it · idle at 2.0
        const up = ease.io(seg(s, 0, .35)) * (1 - ease.io(seg(s, 1.6, 2.0)));
        L.ty = -14 - 9 * hov - 24 * up; L.rot = 1.5 * DEG * up; wl = (-8 * up + 3 * beat) * DEG;
        out.swirl = s < 1.6 ? seg(s, .1, 1.6) : -1; out.shield = s > .55 ? seg(s, .55, 2.0) : -1; out.halo = .7 + 1.1 * up;
        if (s > .55 && this.once("shield")) { this.events.push("shield"); out.shake = .2 }
        if (s >= 2.0) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .5) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .08)), r = ease.io(seg(s, .2, .5)); L.rot = -4 * DEG * k * (1 - r); L.tx = -36 * k * (1 - r * .75); L.ty = -14 - 18 * k * (1 - r);
          L.sx = 1 + .02 * k * (1 - r); L.sy = 1 - .03 * k * (1 - r); wl = -12 * DEG * k * (1 - r);
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash]; out.flicker = 1 - seg(s, 0, .5); out.halo = 0;
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45 } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .5, .74); L.tx = -9 * (1 - ease.o3(p)); L.ty = -14 - 9 * hov * p; out.halo = .55 * p }
        if (s >= .78) this.play("idle");
      }
      // chain pendulum: reacts to sideways and vertical motion
      const tx = L.tx || 0, v = dt > 0 ? (tx - this.prevTx) / dt : 0; this.prevTx = tx;
      this.chV += (-90 * this.ch - 3 * this.chV + v * .02) * dt + .4 * Math.sin(T * 1.9) * dt; this.ch += this.chV * dt; this.ch = clamp(this.ch, -.4, .4);
      L.deform = { wl, wr, chain: this.ch - (L.rot || 0), t: T };
      return out;
    }
  }
  global.SpiritRig = SpiritRig; global.SpiritAnim = SpiritAnim;
})(window);
