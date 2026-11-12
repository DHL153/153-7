"use strict";
(function (global) {
  const DEG = Math.PI / 180, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) };
  const angOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a };
  const rot = (p, c, a) => { const s = Math.sin(a), co = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co] };
  function distSeg(p, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], wx = p[0] - a[0], wy = p[1] - a[1]; const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(wx - vx * t, wy - vy * t) }

  class Mesh {        // a grid over a rectangle of art space, with its own texture
    constructor(gl, tex, rect, step) {
      this.gl = gl; this.tex = tex; const [x0, y0, w, h] = rect; this.rect = rect;
      const nx = Math.max(1, Math.ceil(w / step)), ny = Math.max(1, Math.ceil(h / step)); this.nx = nx; this.ny = ny;
      const n = (nx + 1) * (ny + 1); this.rest = new Float32Array(n * 2); this.pos = new Float32Array(n * 2); const uv = new Float32Array(n * 2);
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * (nx + 1) + i, u = i / nx, v = j / ny; this.rest[2 * k] = x0 + u * w; this.rest[2 * k + 1] = y0 + v * h; uv[2 * k] = u; uv[2 * k + 1] = v }
      const idx = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, b, c, b, d, c) }
      this.count = idx.length; this.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      this.ub = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ub); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      this.pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.pb); gl.bufferData(gl.ARRAY_BUFFER, this.pos.byteLength, gl.DYNAMIC_DRAW);
      this.n = n;
    }
  }

  /* ==========================================================================
     니콜 NPC v2 — cut-out rig
     body  : one continuous WebGL mesh of the armless body (breath, head turn, hair and hem sway)
     face  : the master face is always there; expressions only add an EYES patch and a MOUTH patch
             (the pixels that differ from the master, cut from full redraws of the same head), so the hair
             and the face outline never change. Patches switch in one frame: no crossfade, no double eyes.
     arms  : 2D cut-out pieces on top: upper arm, forearm (clean capsules with rounded joints), the hand
             cut from the gesture drawing, and the puff sleeve from the master over the shoulder.
             Forward kinematics: shoulder angle, elbow angle, segment lengths (for foreshortening).
     ========================================================================== */
  const FEET = [300, 992], NECK = [318, 352];
  const POSES = ["idle", "guide", "wave", "happy", "sad"];
  const CLUSTER = { happy: 1, sad: 1 };                 // both hands are one drawing, carried by the near wrist
  // face model: which eyes / mouth patch each expression shows (null = the master's own)
  const EXPR = { smile: [null, null], laugh: ["laugh", "laugh"], surprise: ["surprise", "surprise"], sad: ["sad", "sad"], cry: ["cry", "cry"],
    worried: ["worried", "worried"], think: ["think", "think"], content: ["content", "content"] };
  const BLINK = { smile: ["half", "blink"], think: ["half", "blink"], sad: [null, "sadclosed"], cry: [null, "sadclosed"], worried: [null, "sadclosed"] };   // [half, closed]
  const TALK = { smile: "talk", think: "talk", sad: "sadtalk", cry: "sadtalk", worried: "sadtalk", laugh: null, content: "talk", surprise: null };
  const TALKHEAD = { laugh: "content" };   // laughing talk: swap the whole head (open laugh <-> closed smile), never mix mouths

  class NicoleRig {
    constructor(canvas, assets) {
      const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
      if (!gl) throw new Error("WebGL not available"); this.gl = gl; this.cv = canvas; this.A = assets;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o };
      const VS = `attribute vec2 aP; attribute vec2 aU; uniform vec2 uRes; varying vec2 vU; void main(){ vU=aU; gl_Position=vec4(aP.x/uRes.x*2.0-1.0, 1.0-aP.y/uRes.y*2.0, 0.0, 1.0); }`;
      const FS = `precision mediump float; varying vec2 vU; uniform sampler2D uT; uniform float uA; uniform vec4 uTint;
        void main(){ vec4 c=texture2D(uT,vU); c.rgb=mix(c.rgb,uTint.rgb*c.a,uTint.a); gl_FragColor=c*uA; }`;
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      this.loc = { aP: gl.getAttribLocation(pr, "aP"), aU: gl.getAttribLocation(pr, "aU"), uRes: gl.getUniformLocation(pr, "uRes"), uA: gl.getUniformLocation(pr, "uA"), uTint: gl.getUniformLocation(pr, "uTint") };
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      const tex = img => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); t.w = img.width; t.h = img.height; return t };
      const W = assets.weights; this.W = W;
      this.body = new Mesh(gl, tex(assets.img.base), [0, 0, 680, 1024], W.step);
      this.bw = { head: new Float32Array(this.body.n), hairL: new Float32Array(this.body.n), hairR: new Float32Array(this.body.n), skirt: new Float32Array(this.body.n) };
      for (let j = 0; j <= this.body.ny; j++) for (let i = 0; i <= this.body.nx; i++) { const k = j * (this.body.nx + 1) + i, g = Math.min(W.ny - 1, j) * W.nx + Math.min(W.nx - 1, i);
        for (const c of ["head", "hairL", "hairR", "skirt"]) this.bw[c][k] = W[c][g] / 100 }
      const F = assets.faces; this.patch = {};
      for (const z of ["eyes", "mouth"]) for (const n of F[z]) { const m = new Mesh(gl, tex(assets.img[z + "_" + n]), F.box, 8); this.sampleW(m); this.patch[z + "_" + n] = m }
      this.img = assets.img; this.frames = {};
      for (const n in assets.frames) { const m = new Mesh(gl, tex(assets.img["arms_" + n]), assets.frames[n], 16); m.mob = assets.mob && assets.mob[n]; this.frames[n] = m }   // arms ride the torso only
    }
    sampleW(m) {
      const W = this.W, st = W.step; m.w = { head: new Float32Array(m.n), hairL: new Float32Array(m.n), hairR: new Float32Array(m.n), skirt: new Float32Array(m.n) };
      for (let k = 0; k < m.n; k++) { const x = m.rest[2 * k] / st, y = m.rest[2 * k + 1] / st, i = clamp(Math.floor(x), 0, W.nx - 2), j = clamp(Math.floor(y), 0, W.ny - 2), fx = clamp(x - i, 0, 1), fy = clamp(y - j, 0, 1);
        for (const c of ["head", "hairL", "hairR", "skirt"]) { const g = W[c], a = g[j * W.nx + i], b = g[j * W.nx + i + 1], cc = g[(j + 1) * W.nx + i], d = g[(j + 1) * W.nx + i + 1]; m.w[c][k] = ((a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy) / 100 } }
    }
    deform(x, y, wH, wL, wR, wS, o, out) {
      let px = x, py = y;
      const lift = o.breath * clamp((650 - y) / 300, 0, 1), bell = Math.exp(-Math.pow((y - 470) / 90, 2));
      px += (x - 310) * .006 * o.breath * bell; py -= 1.5 * lift;
      if (wH > 0) { const r = rot([px, py], [NECK[0], NECK[1] - 1.5 * o.breath], o.headA); px += wH * (r[0] - px + o.headX); py += wH * (r[1] - py + o.headY) }
      if (wL > 0) { px += wL * (o.hairAmp * Math.sin(o.t * 2.1 + y * .013) + o.hairPush); py -= wL * o.hairLift }
      if (wR > 0) { px += wR * (o.hairAmp * .8 * Math.sin(o.t * 2.4 + 1.3 + y * .016) + o.hairPush); py -= wR * o.hairLift }
      if (wS > 0) { const side = (x - 300) / 190; px += wS * (o.skirtAmp * Math.sin(o.t * 1.7 + x * .01) + o.skirtPush + side * o.skirtFlare * 4); py -= wS * o.skirtFlare * 3 * (.5 + Math.abs(side)) }
      const dx = px - FEET[0], dy = py - FEET[1], c = Math.cos(o.rot), s = Math.sin(o.rot), qx = dx * o.sx, qy = dy * o.sy;
      out[0] = this.view.x + this.view.k * (c * qx - s * qy + o.tx); out[1] = this.view.y + this.view.k * (s * qx + c * qy + o.ty); return out;
    }
    // rigid moving-least-squares: the drawing bends so its keypoints P land on Q (anchors stay put)
    poseFrame(m, P, Q, o, dy) {
      const n = P ? P.length : 0, tmp = [0, 0], w = new Float32Array(n);
      let same = !P; if (P) for (let i = 0; i < n; i++) if (Math.abs(P[i][0] - Q[i][0]) + Math.abs(P[i][1] - Q[i][1]) > .01) { same = false; break }
      for (let k = 0; k < m.n; k++) { const vx = m.rest[2 * k], vy = m.rest[2 * k + 1]; let ox = vx, oy = vy;
        if (!same) { let sw = 0, px = 0, py = 0, qx = 0, qy = 0;
          for (let i = 0; i < n; i++) { const dx = P[i][0] - vx, dy2 = P[i][1] - vy, d2 = dx * dx + dy2 * dy2 + 1; w[i] = 1 / (d2 * d2 / 400 + d2); sw += w[i]; px += w[i] * P[i][0]; py += w[i] * P[i][1]; qx += w[i] * Q[i][0]; qy += w[i] * Q[i][1] }
          px /= sw; py /= sw; qx /= sw; qy /= sw; const ux = vx - px, uy = vy - py; let fx = 0, fy = 0;
          for (let i = 0; i < n; i++) { const ax = P[i][0] - px, ay = P[i][1] - py, bx = Q[i][0] - qx, by = Q[i][1] - qy;
            const a11 = ax * ux + ay * uy, a12 = ax * uy - ay * ux; fx += w[i] * (bx * a11 - by * a12); fy += w[i] * (bx * a12 + by * a11) }
          const L = Math.hypot(ux, uy), F = Math.hypot(fx, fy) || 1, mb = 1; ox = vx + (qx + fx * L / F - vx) * mb; oy = vy + (qy + fy * L / F - vy) * mb }
        this.deform(ox, oy + dy, 0, 0, 0, 0, o, tmp); m.pos[2 * k] = tmp[0]; m.pos[2 * k + 1] = tmp[1] }
      const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.pos);
    }
    a2s(p, o, out) { return this.deform(p[0], p[1], 0, 0, 0, 0, o, out) }
    poseBody(m, o) { const w = m.w || this.bw, tmp = [0, 0]; for (let k = 0; k < m.n; k++) { this.deform(m.rest[2 * k], m.rest[2 * k + 1], w.head[k], w.hairL[k], w.hairR[k], w.skirt[k], o, tmp); m.pos[2 * k] = tmp[0]; m.pos[2 * k + 1] = tmp[1] }
      const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.pos) }
    drawMesh(m, alpha) {
      if (alpha <= .002) return; const gl = this.gl, L = this.loc;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.enableVertexAttribArray(L.aP); gl.vertexAttribPointer(L.aP, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.ub); gl.enableVertexAttribArray(L.aU); gl.vertexAttribPointer(L.aU, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); gl.bindTexture(gl.TEXTURE_2D, m.tex); gl.uniform1f(L.uA, alpha);
      gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    }
    // body + face into the GL canvas
    renderBody(o, view) {
      const gl = this.gl, L = this.loc; this.view = view;
      gl.viewport(0, 0, this.cv.width, this.cv.height); gl.uniform2f(L.uRes, this.cv.width, this.cv.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const T = o.tint; gl.uniform4f(L.uTint, T[0], T[1], T[2], T[3]);
      this.poseBody(this.body, o); this.drawMesh(this.body, 1);
      for (const n of o.patches) { const m = this.patch[n]; if (!m) continue; this.poseBody(m, o); this.drawMesh(m, 1) }
      for (const f of o.arms) { const m = this.frames[f.n]; if (!m) continue; this.poseFrame(m, null, null, o, f.dy || 0); this.drawMesh(m, f.a) }
    }
  }

  /* ---------------- animator ---------------- */
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const backOut = t => { const c = 1.25; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) };
  class NicoleAnim {
    constructor(frames, KP) {
      this.frames = frames; this.KP = KP; this.t = 0; this.fxOn = true; this.events = [];
      this.g = { from: "idle", to: "idle", t0: -9, dur: .42 };
      this.expr = "smile"; this.exprT = -9;
      this.blinkT = 2.2; this.blinkK = 0; this.talking = false; this.syl = 0; this.mouthOpen = 0;
      this.act = null; this.fidgetT = 6; this.fid = null; this.headA = 0; this.headY = 0;
    }
    frameOK(n) { return !!(this.frames && this.frames[n]) }
    gesture(p, dur = .42) { if (p === this.g.to) return; const from = this.g.to; const seq = path(from, p).filter(x => this.frameOK(x));
      this.g = { from, to: p, t0: this.t, dur: seq.length > 1 ? Math.max(dur, seq.length * .065) : dur, seq: seq.length ? seq : [p] }; this.events.push("gesture:" + p) }
    face(n) { if (n === this.expr) return; this.expr = n; this.exprT = this.t; this.events.push("face:" + n) }
    talk(on) { this.talking = on }
    play(name, opt = {}) { const A = ACTS[name]; if (!A) return; this.act = { name, s: 0, A, hold: opt.hold ?? 0, fired: {} }; this.events.push("act:" + name); A.start && A.start(this) }
    once(k) { if (this.act.fired[k]) return false; this.act.fired[k] = 1; return true }
    update(dt) {
      this.events.length = 0; this.t += dt; const T = this.t;
      const o = { t: T, breath: Math.sin(T * 2 * Math.PI / 3.8), headA: 0, headX: 0, headY: 0, hairAmp: 1.1, hairPush: 0, hairLift: 0, skirtAmp: .5, skirtPush: 0, skirtFlare: 0,
        rot: .45 * DEG * Math.sin(T * .7), sx: 1, sy: 1, tx: 0, ty: 0, alpha: 1, shadow: 1, tint: [1, 1, 1, 0], fx: {} };
      o.headA = 1.5 * DEG * Math.sin(T * .55) + .5 * DEG * Math.sin(T * 1.3); o.headY = .7 * Math.sin(T * 1.1);
      if (this.still) { o.breath = 0; o.headA = 0; o.headY = 0; o.hairAmp = 0; o.skirtAmp = 0; o.rot = 0 }
      if (this.act) { const a = this.act; a.s += dt; if (a.A.run(this, a.s, o)) { this.act = null; a.A.end && a.A.end(this) } }
      else if (!this.still) { this.fidgetT -= dt; if (this.fidgetT <= 0) { this.fid = { k: Math.random() < .5 ? "tilt" : "hum", s: 0 }; this.fidgetT = 6 + Math.random() * 5 }
        if (this.fid) { const f = this.fid; f.s += dt; if (f.k === "tilt") { const e = Math.sin(Math.PI * clamp(f.s / 1.6, 0, 1)); o.headA += -2.2 * DEG * e; o.headX -= 1 * e } else { const e = clamp(f.s / 1.0, 0, 1); o.ty -= 4 * Math.abs(Math.sin(e * Math.PI * 2)) * (1 - e); o.hairAmp += 1.5 * (1 - e) }
          if (f.s > 1.6) this.fid = null } }
      // a new expression lands with a tiny squash of the head (reads as a "pop", hides the switch)
      const pe = T - this.exprT; 
      // talking: syllables
      if (this.talking && !this.still) { this.syl -= dt; if (this.syl <= 0) { this.syl = .09 + Math.random() * .1; this.mouthOpen = this.mouthOpen ? 0 : (Math.random() < .85 ? 1 : 0) } } else this.mouthOpen = 0;
      o.headY += .35 * this.mouthOpen;
      // blink: half -> closed -> half (3 frames), never right after a new expression
      this.blinkT -= dt; if (this.blinkT <= 0) { this.blinkK = .001; this.blinkT = 2.6 + Math.random() * 3; if (Math.random() < .18) this.blinkT = .3 }
      let bl = 0; if (this.still) this.blinkK = 0; if (this.blinkK > 0) { this.blinkK += dt; const q = this.blinkK; bl = q < .04 ? 1 : q < .11 ? 2 : q < .16 ? 1 : 0; if (q >= .16) this.blinkK = 0 }
      const ex = EXPR[this.expr] || EXPR.smile; let eyes = ex[0], mouth = ex[1];
      if (bl && BLINK[this.expr] && pe > .5) { const b = BLINK[this.expr]; eyes = bl === 2 ? b[1] : (b[0] || b[1]) }
      if (this.mouthOpen && TALK[this.expr] !== undefined && TALK[this.expr]) mouth = TALK[this.expr];
      if (!this.mouthOpen && this.talking && TALKHEAD[this.expr]) { eyes = TALKHEAD[this.expr]; mouth = null }
      o.patches = []; if (eyes) o.patches.push("eyes_" + eyes); if (mouth) o.patches.push("mouth_" + mouth);
      // arms: drawn frames. A gesture plays its in-between drawings in order, then holds the target drawing.
      const g = this.g, k = clamp((T - g.t0) / g.dur, 0, 1), seq = g.seq || [g.to], n = seq.length;
      let f = seq[Math.min(n - 1, Math.floor(k * n))];
      if (n === 1 && g.from !== g.to && k < .38) f = g.from;
      if (g.to === "wave" && k >= 1 && !this.still) { const cyc = WAVELOOP.filter(x => this.frameOK(x)); if (cyc.length > 1) f = cyc[Math.floor(T / .14) % cyc.length] }
      o.arms = [{ n: f, a: 1 }];
      if (!this.still && g.to === "guide" && k >= 1) o.arms[0].dy = -1.2 * Math.sin(T * 1.9);
      // body follows the gesture: a little anticipation dip before the snap and a springy settle after it
      if (g.from !== g.to && k < 1) { const sn = n === 1 ? .38 : 0;
        if (k < sn) { const q = Math.sin(Math.PI * k / sn * .5); o.sy *= 1 - .003 * q; o.ty += .5 * q }
        else { const q = (k - sn) / (1 - sn), sp = Math.exp(-5 * q) * Math.sin(q * Math.PI * 2.4); o.sy *= 1 + .004 * sp; o.sx *= 1 - .002 * sp; o.hairLift += .8 * Math.max(0, sp); o.skirtFlare += .06 * sp } }
      o.headA += this.headA; o.headY += this.headY;
      if (this.hidden && !this.act) o.alpha = 0;
      return o;
    }
  }
  // in-between drawings, in order (added as they arrive: 'idle>wave' = ['wave_a','wave_b'] ...)
  const INB = { "idle>wave": ["wave_a", "wave_b"], "idle>guide": ["guide_a"], "idle>happy": ["happy_a"], "idle>sad": ["sad_a"] };
  const WAVELOOP = ["wave", "wave_l", "wave", "wave_r"];
  function path(from, to) {
    const leg = (a, b) => INB[a + ">" + b] ? INB[a + ">" + b] : INB[b + ">" + a] ? INB[b + ">" + a].slice().reverse() : [];
    if (from === "idle" || to === "idle") return [...leg(from, to), to];
    return [...leg(from, "idle"), ...(INB["idle>" + from] || INB["idle>" + to] ? ["idle"] : []), ...leg("idle", to), to];
  }
  function ARMLIFE(an, arm, p, T, k) {
    const on = k >= 1 ? 1 : ss(.7, 1, k);
    if (arm === "far" && p === "wave") { const w = (an.waveK ?? 1) * on; return [2 * DEG * Math.sin(T * 13.8) * w, 13 * DEG * Math.sin(T * 13.8) * w, 9 * DEG * Math.sin(T * 13.8 - .9) * w] }
    if (arm === "far" && p === "guide") return [0, 2.4 * DEG * Math.sin(T * 1.9) * on, 4 * DEG * Math.sin(T * 1.9 - .6) * on];
    if (arm === "near" && p === "happy") return [0, 1.5 * DEG * Math.sin(T * 9) * (an.giggle || 0), 0];
    return [0, 0, 0];
  }
  // acts: timelines that drive gesture, face and body. run(an, s, o) returns true when finished.
  const hop = (o, s, t0, h, an) => { const d = .34, k = (s - t0) / d; if (k > -.25 && k < 0) { const q = Math.sin(Math.PI * (k + .25) / .25); o.sy *= 1 - .008 * q; o.sx *= 1 + .004 * q }
    else if (k >= 0 && k <= 1) { o.ty -= h * Math.sin(Math.PI * k); o.sy *= 1 + .006 * Math.sin(Math.PI * k); o.hairLift += 1.5 * Math.sin(Math.PI * k); o.skirtFlare += .15 * Math.sin(Math.PI * k); if (k > .9 && an.once("land" + t0)) an.events.push("land") }
    else if (k > 1 && k < 1.35) { const q = Math.sin(Math.PI * (k - 1) / .35); o.sy *= 1 - .006 * q; o.sx *= 1 + .003 * q; o.skirtFlare -= .06 * q } };
  const ACTS = {
    appear: { start(an) { an.visible = 0; an.hidden = false; an.gesture("idle", .01); an.face("smile") },
      run(an, s, o) {
        // 0–0.55 light gathers · 0.45–0.8 she fades in, small and rising · 0.8 hops down · 1.25 waves hello with a laugh · 2.6 settles
        o.fx.gather = clamp(s / .7, 0, 1); const v = ss(.45, .8, s); o.alpha = v; const sc = lerp(.97, 1, easeIO(clamp((s - .45) / .45, 0, 1)));
        o.sx *= sc; o.sy *= sc; o.ty -= 10 * (1 - ss(.45, .9, s)); o.tint = [1, .97, .88, .65 * (1 - ss(.5, 1.0, s))]; o.hairAmp += .8 * (1 - ss(.6, 1.4, s));
        if (s > .5 && an.once("pop")) an.events.push("pop");
        hop(o, s, .95, 5, an);
        if (s > 1.25 && an.once("hello")) { an.gesture("wave", .44); an.face("laugh") }
        if (s > 2.3 && an.once("calm")) an.face("smile");
        if (s > 2.55 && an.once("down")) an.gesture("idle", .48);
        return s > 3.1 } },
    hello: { start(an) { an.gesture("wave", .42); an.face("laugh") },
      run(an, s, o) { hop(o, s, .08, 3, an); if (s > 1.3 && an.once("s")) an.face("smile"); if (s > 1.65 && an.once("d")) an.gesture("idle", .46); o.headA += 1.5 * DEG * Math.sin(Math.PI * clamp(s / 1.4, 0, 1)); return s > 2.2 } },
    guide: { start(an) { an.gesture("guide", .46); an.face("smile") }, hold: 0,
      run(an, s, o) { const k = ss(0, .5, s); o.headA += -1.5 * DEG * k; o.rot += .3 * DEG * k; if (s > .5 && an.once("t")) an.talk(true); if (s > 2.6 && an.once("t2")) an.talk(false); if (s > 3.0 && an.once("d")) an.gesture("idle", .46); return s > 3.5 } },
    happy: { start(an) { an.gesture("happy", .4); an.face("laugh"); an.giggle = 0 },
      run(an, s, o) { an.giggle = ss(.3, .5, s) * (1 - ss(1.8, 2.1, s)); hop(o, s, .42, 5, an); hop(o, s, .9, 3, an); o.headA += 1.2 * DEG * Math.sin(s * 7) * an.giggle; o.fx.sparkle = s < 2.2 ? 1 : 0;
        if (s > 2.2 && an.once("s")) an.face("smile"); if (s > 2.5 && an.once("d")) an.gesture("idle", .48); return s > 3.0 } },
    sad: { start(an) { an.gesture("sad", .55); an.face("sad") },
      run(an, s, o) { const k = ss(0, .7, s) * (1 - ss(3.0, 3.6, s)); o.headA += 3 * DEG * k; o.headY += 2.5 * k; o.ty += 1.5 * k; o.sy *= 1 - .004 * k; o.hairAmp *= 1 - .5 * k; o.shadow = 1;
        if (s > 1.0 && an.once("c")) an.face("cry"); o.fx.tears = s > 1.15 && s < 3.0 ? 1 : 0;
        if (s > 3.0 && an.once("s")) an.face("smile"); if (s > 3.15 && an.once("d")) an.gesture("idle", .55); return s > 3.8 } },
    surprise: { start(an) { an.gesture("happy", .2); an.face("surprise") },
      run(an, s, o) { hop(o, s, .02, 6, an); o.headA += -1.8 * DEG * ss(0, .2, s) * (1 - ss(1.2, 1.6, s)); o.fx.shock = s < .7 ? s / .7 : -1; if (s > .03 && an.once("!")) an.events.push("shock");
        if (s > 1.4 && an.once("s")) an.face("smile"); if (s > 1.55 && an.once("d")) an.gesture("idle", .46); return s > 2.1 } },
    think: { start(an) { an.face("think") },
      run(an, s, o) { const k = ss(0, .6, s) * (1 - ss(2.6, 3.1, s)); o.headA += -3.5 * DEG * k; o.headX -= 1.5 * k; o.rot -= .25 * DEG * k; o.fx.think = s > .5 && s < 2.7 ? 1 : 0; if (s > 2.7 && an.once("s")) an.face("smile"); return s > 3.2 } },
    content: { start(an) { an.face("content") },
      run(an, s, o) { const k = ss(0, .5, s) * (1 - ss(2.2, 2.7, s)); o.headA += 1.8 * DEG * Math.sin(s * 3.2) * k; o.rot += .3 * DEG * Math.sin(s * 3.2) * k; o.fx.sparkle = s < 2.2 ? .5 : 0;
        if (s > 2.4 && an.once("s")) an.face("smile"); return s > 2.8 } },
    worried: { start(an) { an.gesture("sad", .5); an.face("worried") },
      run(an, s, o) { const k = ss(0, .5, s) * (1 - ss(2.4, 2.9, s)); o.headA += 2 * DEG * k; o.fx.sweat = s > .4 && s < 2.4 ? 1 : 0;
        if (s > 2.4 && an.once("s")) an.face("smile"); if (s > 2.5 && an.once("d")) an.gesture("idle", .5); return s > 3.0 } },
    bye: { start(an) { an.gesture("wave", .42); an.face("smile") },
      run(an, s, o) { an.waveK = 1 - ss(1.4, 1.7, s); const v = 1 - ss(1.6, 2.1, s); o.alpha = v; o.tint = [1, .97, .88, .7 * ss(1.4, 1.9, s)]; const sc = lerp(1, .92, ss(1.6, 2.1, s)); o.sx *= sc; o.sy *= sc; o.ty -= 20 * ss(1.6, 2.1, s);
        o.fx.gather = s > 1.5 ? -clamp((s - 1.5) / .8, 0, 1) : 0; if (s > 1.6 && an.once("pop")) an.events.push("poof"); return s > 2.4 },
      end(an) { an.visible = 0; an.waveK = 1; an.gesture("idle", .01); an.hidden = true } },
  };
  global.NicoleRig = NicoleRig; global.NicoleAnim = NicoleAnim; global.NICOLE_FEET = FEET;
})(window);
