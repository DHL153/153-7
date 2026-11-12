"use strict";
/* ============================================================================
   졸음 북치기 새 (sleepy drummer bird on a pig) — mesh-deform rig, same family as the other enemies
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
  class DrumRig {
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
  /* the three beats of the drum combo: [raise start, slam time, which drum, power] */
  const BEATS = [[.0, .2, 0, 1], [.32, .5, 1, 1], [.62, .86, 2, 2]];
  class DrumAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = [] }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {} }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: the pig breathes; the bird slowly nods off (3.4 s cycle: droop 0–2.6 s, jerk awake 2.6–2.75, settle)
      const br = Math.sin(T * 2.2), cyc = (T % 3.4) / 3.4;
      const droop = cyc < .76 ? ease.io(cyc / .76) : 1 - ease.o3(seg(cyc, .76, .82)) + .25 * Math.sin(Math.PI * seg(cyc, .76, .95)) * (cyc > .82 ? 1 : 0);
      const sniff = Math.max(0, Math.sin(T * 1.3)) ** 6 * Math.sin(T * 22);
      const L = { tex: "stance", sx: 1 - .006 * br, sy: 1 + .014 * br };
      const out = { layers: [L], shake: 0, flash: 0, ring: null, wave: -1, hitspark: -1, zzz: 0, trot: 0, skid: -1, wake: -1 };
      let head = 5 * DEG * droop, pig = 1.6 * DEG * sniff; out.zzz = droop > .5 ? 1 : 0;
      if (this.state === "enter") {
        // A trot in from off-screen (0–1.1): quick little bounces, rocking, the bird fast asleep (head down)
        // B skid stop 1.1–1.4 · C the jolt wakes the bird: startled drawing 1.42–1.72 · D back to sleepy, idle at 2.0
        if (s < 1.1) { const p = s / 1.1, b = Math.abs(Math.sin(s * Math.PI / .17)); L.tx = lerp(-1300, -40, 1 - Math.pow(1 - p, 1.6)); L.ty = -14 * b; L.rot = 2.2 * DEG * Math.sin(s * Math.PI / .17); head = 7 * DEG; pig = 2 * DEG * Math.sin(s * 30); out.trot = 1; out.zzz = 1 }
        else if (s < 1.42) { const p = seg(s, 1.1, 1.4); L.tx = lerp(-40, 0, ease.o3(p)); L.rot = lerp(4.5, 0, ease.o3(p)) * DEG; L.sx = 1 + .03 * (1 - p); L.sy = 1 - .04 * (1 - p); head = lerp(7, 9, p) * DEG; out.skid = p; out.zzz = 1;
          if (this.once("skid")) this.events.push("skid") }
        else if (s < 1.72) { L.tex = "hit"; const k = ease.o3(seg(s, 1.42, 1.5)); L.ty = -18 * Math.sin(Math.PI * seg(s, 1.42, 1.62)); L.sy = 1 + .04 * k * (1 - seg(s, 1.5, 1.72)); head = 0; pig = 0;
          if (this.once("wake")) { this.events.push("wake"); out.shake = .25 } out.wake = seg(s, 1.42, 1.8) }
        else { const p = seg(s, 1.72, 2.0); L.sx = lerp(.98, 1, ease.back(p)); L.sy = lerp(1.03, 1, ease.back(p)); head = 0 }
        if (s > 2.0) { this.play("idle"); this.t = 0 }
      }
      if (this.state === "attack") {
        // three beats: raise (wings up drawing) → slam (stance drawing, squash, ring on that drum).  The third is the big one:
        // a sound wave rolls toward the player ("hit" at 0.92) · settle · idle at 1.35
        head = 0; pig = 0; L.tex = "stance";
        for (const [r0, hit, drum, pow] of BEATS) {
          if (s >= r0 && s < hit) { L.tex = "raise"; const p = seg(s, r0, hit); L.ty = -10 * pow * ease.o3(p); L.sy = 1 + .02 * pow * p; L.sx = 1 - .01 * pow * p }
          if (s >= hit && s < hit + .14) { const k = 1 - seg(s, hit, hit + .14); L.sy = 1 - .05 * pow * k; L.sx = 1 + .035 * pow * k; pig = -1.2 * DEG * k * pow;
            if (this.once("beat" + drum)) { this.events.push("beat" + (drum === 2 ? "B" : drum)); out.shake = pow > 1 ? .55 : .2 } }
        }
        out.wave = seg(s, .86, 1.3); if (s > .92 && this.once("hit")) this.events.push("hit");
        if (s >= 1.35) { this.play("idle"); this.t = 0 }
      }
      if (this.state === "hurt") {
        if (s < .5) { L.tex = "hit"; const k = ease.o3(seg(s, 0, .08)), r = ease.io(seg(s, .2, .5)); L.rot = -4 * DEG * k * (1 - r); L.tx = -32 * k * (1 - r * .75); L.ty = -10 * Math.sin(Math.PI * seg(s, 0, .3));
          L.sx = 1 + .02 * k * (1 - r); L.sy = 1 - .03 * k * (1 - r); head = 0; pig = 0;
          out.flash = 1 - seg(s, 0, .1); if (this.fxOn) L.tint = [1, 1, 1, .55 * out.flash];
          if (this.once("hurt")) { this.events.push("hurt"); out.shake = .45 } out.hitspark = seg(s, 0, .3) }
        else { const p = seg(s, .5, .72); L.tx = -8 * (1 - ease.o3(p)); head = 0 }
        if (s >= .78) { this.play("idle"); this.t = 0 }
      }
      L.deform = { head, pig, t: T };
      return out;
    }
  }
  global.DrumRig = DrumRig; global.DrumAnim = DrumAnim;
})(window);
