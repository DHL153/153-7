"use strict";
/* ============================================================================
   까마귀 주술사 (crow shaman, boss) — mesh-deform rig, same family as the other enemies
   - Two sprites: the crow (stance / cast / hit drawings) and the totem, which was cut off the same
     drawing along an ~8 px gap so it can be summoned, rise and glow on its own.
   - cast and hit were composited onto the stance body: only the head under the hood comes from the
     new drawing, so a swap never moves the body, staff, lantern or feet.
   - Crow mesh: tail feathers wave from the root; the lantern swings as one rigid piece on a spring
     around its hook. Staff, skull mask, hood, antlers and hands sit on zero weight.
   ========================================================================== */
(function (global) {
  const VS = `
attribute vec2 aPos; attribute vec2 aW;
uniform vec2 uPivT, uPivL, uAnchor; uniform float uAT, uAL, uT;
uniform vec4 uM; uniform vec2 uT2; uniform float uDeform;
varying vec2 vUV;
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), co=cos(a); return c+vec2(d.x*co-d.y*s, d.x*s+d.y*co); }
void main(){
  vec2 p=aPos; vUV=aPos/1024.0;
  if(uDeform>0.5){
    p=rot(p,uPivT,uAT*aW.x*sin(uT*2.4-distance(aPos,uPivT)*0.02));   // tail feathers: wave out to the tips
    p=rot(p,uPivL,uAL*aW.y);                                           // lantern: one rigid pendulum angle
  }
  vec2 q=p-uAnchor; p=uAnchor+vec2(uM.x*q.x+uM.y*q.y, uM.z*q.x+uM.w*q.y)+uT2;
  p+=vec2(256.0,128.0); gl_Position=vec4(p.x/768.0-1.0, 1.0-p.y/640.0, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uAlpha;
varying vec2 vUV;
void main(){ vec4 c=texture2D(uTex,vUV); c.rgb=mix(c.rgb, uTint.rgb*c.a, uTint.a); gl_FragColor=c*uAlpha; }`;
  class CrowRig {
    constructor(W, imgs) {
      const cv = document.createElement("canvas"); cv.width = 1536; cv.height = 1280; this.cv = cv;
      const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true }); this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.u = {}; for (const n of ["uPivT","uPivL","uAnchor","uAT","uAL","uT","uM","uT2","uDeform","uTex","uTint","uAlpha"]) this.u[n] = gl.getUniformLocation(pr, n);
      const [x0, y0, x1, y1, NX, NY] = W.grid, pos = [], idx = [];
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) pos.push(x0 + (x1 - x0) * i / NX, y0 + (y1 - y0) * j / NY);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.n = idx.length;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
      const lp = gl.getAttribLocation(pr, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
      this.aW = gl.getAttribLocation(pr, "aW"); gl.enableVertexAttribArray(this.aW); this.wb = {};
      for (const k in W.poses) { const P = W.poses[k], a = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) a.push(P.wT[j][i], P.wL[j][i]);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); this.wb[k] = b }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); this.tex = {};
      for (const k in imgs) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[k]); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);   // drawn at 1:1, no mipmaps: stretched cells in empty space can never pick up blurred colour from a coarse mip gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); this.tex[k] = t }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2fv(this.u.uPivT, W.pivT); gl.uniform2fv(this.u.uPivL, W.pivL); gl.uniform1i(this.u.uTex, 0);
      this.anchor = W.anchor;
    }
    render(layers) {
      const gl = this.gl, u = this.u; gl.viewport(0, 0, 1536, 1280); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const L of layers) {
        if ((L.alpha ?? 1) <= .001) continue;
        gl.uniform2fv(u.uAnchor, L.anchor || this.anchor);
        const D = L.deform; gl.uniform1f(u.uDeform, D ? 1 : 0);
        if (D) { gl.uniform1f(u.uAT, D.tail || 0); gl.uniform1f(u.uAL, D.lantern || 0); gl.uniform1f(u.uT, D.t || 0) }
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
  class CrowAnim {
    constructor(W) { this.W = W; this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.lan = 0; this.lanV = 0; this.prevRot = 0; this.prevTx = 0 }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    jolt(v) { this.lanV += v * DEG * 20 }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: slow, heavy breath anchored at the feet (a boss breathes slower than the small enemies)
      const br = Math.sin(T * 1.8);
      const B = { tex: "stance", rot: .3 * DEG * Math.sin(T * .7), sx: 1 - .006 * br, sy: 1 + .014 * br };
      const TT = { tex: "totem", anchor: this.W.totemAnchor };
      const out = { bird: B, totem: TT, shake: 0, flash: 0, eye: .5 + .5 * Math.sin(T * 3.1), rise: 1, totemRise: 1, swirl: -1, roar: -1, charge: -1, bolt: -1, heal: -1, hitspark: -1, crack: -1 };
      let tail = 3 * DEG;
      if (this.state === "enter") {
        // A ground cracks 0–0.25 · B the totem bursts up out of the floor 0.25–0.7 (overshoot, settle)
        // C a vortex of black feathers 0.6–1.5; the crow forms inside it (dark → colour) · D ROAR 1.55–2.1 (cast head)
        // E settle, idle at 2.5
        out.crack = seg(s, 0, .6);
        const r = seg(s, .25, .62); out.totemRise = r < 1 ? ease.o3(r) : 1;
        TT.ty = lerp(420, 0, ease.back(seg(s, .25, .7))); TT.sx = lerp(.94, 1, ease.back(seg(s, .55, .8))); TT.sy = lerp(1.06, 1, ease.back(seg(s, .55, .8)));
        if (s > .45 && this.once("totem")) { this.events.push("totem"); out.shake = .55 }
        const f = seg(s, .6, 1.5); out.swirl = s >= .6 && s < 1.7 ? seg(s, .6, 1.7) : -1; out.rise = ease.io(f);
        B.sx = lerp(.86, 1, ease.o3(f)) * (1 - .006 * br); B.sy = lerp(.86, 1, ease.o3(f)) * (1 + .014 * br);
        if (this.fxOn) { B.alpha = f > 0 ? Math.min(1, f * 2.2) : 0; B.tint = [.08, .04, .1, 1 - ease.io(seg(s, 1.0, 1.5))] } else B.alpha = ease.io(f);
        if (s > 1.55 && s < 2.1) { B.tex = "cast"; const k = ease.o3(seg(s, 1.55, 1.65)), r2 = ease.io(seg(s, 1.8, 2.1)); B.rot = 3.5 * DEG * k * (1 - r2); B.sx = 1 + .03 * k * (1 - r2); B.sy = 1 - .02 * k * (1 - r2); out.roar = seg(s, 1.55, 2.1); tail = 7 * DEG;
          if (this.once("roar")) { this.events.push("roar"); out.shake = .8; this.jolt(-2.5) } }
        if (s > 2.5) this.play("idle");
      }
      if (this.state === "attack") {
        // A gather 0–0.45: rear back, the skull eye on the staff charges · B CURSE 0.45: cast head, lunge forward,
        // a curse orb leaves the skull eye · C "hit" 0.7 · D recover 0.6–1.15 (head back at 1.0) · idle at 1.2
        if (s < .45) { const p = ease.io(seg(s, 0, .35)); B.rot = lerp(.3 * DEG * Math.sin(T * .7), -3.2 * DEG, p); B.tx = -10 * p; B.sx = 1 - .01 * p; B.sy = 1 + .02 * p;
          if (s > .28) { B.tx += Math.sin(s * 105) * 1.4 } out.charge = seg(s, 0, .45); out.eye = 1; tail = 2 * DEG }
        else { const k = ease.o3(seg(s, .45, .52)), r = ease.back(seg(s, .6, 1.15)); B.tex = s < 1.0 ? "cast" : "stance";
          B.rot = lerp(-3.2, 4.5, k) * DEG * (1 - r) + .3 * DEG * Math.sin(T * .7) * r; B.tx = lerp(-10, 26, k) * (1 - r); B.sx = 1 + .02 * k * (1 - r); B.sy = 1 - .02 * k * (1 - r); tail = 6 * DEG;
          if (this.once("cast")) { this.events.push("cast"); out.shake = .4; this.jolt(3) }
          if (s > .7 && this.once("hit")) this.events.push("hit");
          out.bolt = seg(s, .45, .78); out.flash = 1 - seg(s, .45, .53); out.eye = 1 - seg(s, .5, 1.0) * .5 }
        if (s >= 1.2) this.play("idle");
      }
      if (this.state === "heal") {
        // boss skill: the crow lifts the staff toward the totem (cast head), the totem lifts, glows and pulses,
        // plus-shaped motes float up · idle at 1.7
        const up = ease.io(seg(s, 0, .3)) * (1 - ease.io(seg(s, 1.2, 1.6)));
        B.tex = s > .1 && s < 1.25 ? "cast" : "stance"; B.rot = -2.2 * DEG * up; B.sy = 1 + .015 * up;
        TT.ty = -26 * up + Math.sin(s * 9) * 3 * up; TT.sx = 1 + .03 * up * (.5 + .5 * Math.sin(s * 12)); TT.sy = TT.sx;
        if (this.fxOn) TT.tint = [1, .9, .55, .2 * up * (.6 + .4 * Math.sin(s * 12))];
        out.heal = seg(s, .2, 1.6); out.eye = 1;
        if (s > .35 && this.once("heal")) { this.events.push("heal"); this.jolt(-1.5) }
        if (s >= 1.7) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .5) { B.tex = "hit"; const k = ease.o3(seg(s, 0, .1)), r = ease.io(seg(s, .2, .5));
          B.rot = -4 * DEG * k * (1 - r); B.tx = -30 * k * (1 - r * .75); B.sx = 1 + .02 * k * (1 - r); B.sy = 1 - .03 * k * (1 - r); tail = 8 * DEG;
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) B.tint = [1, 1, 1, .55 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45; this.jolt(-4) } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .5, .72); B.tx = -7.5 * (1 - ease.o3(p)); B.sx = lerp(.99, 1, ease.back(p)); B.sy = lerp(1.015, 1, ease.back(p)) }
        if (s >= .76) this.play("idle");
      }
      // lantern pendulum: a slow idle swing + reacts to the body's rotation and sideways motion
      const rot = B.rot || 0, tx = B.tx || 0, drot = dt > 0 ? (rot - this.prevRot) / dt : 0, dtx = dt > 0 ? (tx - this.prevTx) / dt : 0; this.prevRot = rot; this.prevTx = tx;
      const target = 4 * DEG * Math.sin(T * 1.6);
      this.lanV += (60 * (target - this.lan) - 3.2 * this.lanV - drot * 1.2 + dtx * .0015) * dt; this.lan += this.lanV * dt; this.lan = clamp(this.lan, -26 * DEG, 26 * DEG);
      B.deform = { tail, lantern: this.lan - rot, t: T };   // the lantern keeps hanging down even when the body tilts
      return out;
    }
  }
  global.CrowRig = CrowRig; global.CrowAnim = CrowAnim;
})(window);
