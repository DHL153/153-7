"use strict";
/* ============================================================================
   거북이 몽둥이 전사 (turtle staff warrior) — layered 2D rig
   - Three drawings: stance (staff on the shoulder), slam (staff smashed into the ground, mirrored to face
     the same way and shifted so the feet line up), shell (curled up in the shell, used as a rolling ball).
   - Turtle shell and staff are hard, so nothing is mesh-bent: whole drawings squash, tilt, slide and spin.
   ========================================================================== */
(function (global) {
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180, SR = 208;   // shell ball radius in image px
  class TurtleAnim {
    constructor() { this.fxOn = true; this.t = 0; this.state = "idle"; this.st = 0; this.events = [] }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.lastB = -1 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    update(dt) {
      this.t += dt; this.st += dt; const s = this.st, T = this.t; this.events.length = 0;
      // idle: a sturdy breath from the feet + a cocky little rock on the heels
      const br = Math.sin(T * 2.1);
      const o = { pose: "stance", tx: 0, ty: 0, rot: 1.2 * DEG * Math.sin(T * 1.05), sx: 1 - .006 * br, sy: 1 + .013 * br, spin: 0,
        flash: 0, shake: 0, impact: -1, popfx: -1, dizzy: 0, sweep: -1 };
      if (this.state === "enter") {
        // A rolls in curled up in its shell like a ball, little bounces (spin = distance / radius) 0–1.2
        // B skids and rocks to a stop 1.2–1.5 · C POP: head, arms, legs and staff spring out 1.55 · idle at 2.15
        const X0 = -1500;
        if (s < 1.55) { o.pose = "shell"; o.rot = 0;
          if (s < 1.2) { const p = s / 1.2, e = 1 - Math.pow(1 - p, 2); o.tx = lerp(X0, 0, e); o.spin = e * 3 * 2 * Math.PI;   // exactly 3 turns, so it always stops upright const bp = (e * 5) % 1; o.ty = -30 * Math.sin(Math.PI * bp) * (1 - p);
            const n = Math.floor(e * 5); if (n !== this.lastB) { if (this.lastB >= 0) this.events.push("bounce"); this.lastB = n } }
          else { const p = seg(s, 1.2, 1.5); o.spin = .3 * Math.sin(p * Math.PI * 2) * (1 - p); if (this.once("skid")) this.events.push("skid") }
          o.sx = o.sy = 1 }
        else { const p = seg(s, 1.55, 2.0); o.sx = lerp(1.12, 1, ease.back(p)); o.sy = lerp(.82, 1, ease.back(p)); if (this.once("pop")) { this.events.push("pop"); o.shake = .25 } o.popfx = seg(s, 1.55, 1.95) }
        if (s > 2.15) this.play("idle");
      }
      if (this.state === "attack") {
        // A wind-up 0–0.38: lean back, crouch, tremble · B SMASH 0.38: slam drawing, lunge, the staff end hits the ground
        // C hold 0.38–0.9 · D swap back with a small hop 0.9–1.3 · idle at 1.4
        if (s < .38) { const p = ease.io(seg(s, 0, .3)); o.rot = -7 * DEG * p; o.tx = -14 * p; o.sx = 1 + .03 * p; o.sy = 1 - .05 * p;
          if (s > .22) { o.tx += Math.sin(s * 120) * 1.6 } }
        else if (s < .9) { o.pose = "slam"; const k = ease.o3(seg(s, .38, .45)), r = ease.io(seg(s, .6, .9)); o.tx = lerp(-14, 36, k) * (1 - r * .5); o.rot = lerp(4, 0, ease.o3(seg(s, .38, .6))) * DEG;
          o.sx = lerp(1.06, 1, ease.o3(seg(s, .38, .55))); o.sy = lerp(.94, 1, ease.o3(seg(s, .38, .55))); o.sweep = seg(s, .3, .46);
          if (this.once("hit")) { this.events.push("hit"); o.shake = .8; o.flash = 1 } o.impact = seg(s, .38, .95) }
        else { const p = seg(s, .9, 1.3); o.tx = 18 * (1 - ease.io(p)); o.ty = -16 * Math.sin(Math.PI * seg(s, .9, 1.12)); o.sx = lerp(1.04, 1, ease.back(p)); o.sy = lerp(.95, 1, ease.back(p)); if (this.once("back")) this.events.push("back") }
        if (s >= 1.4) this.play("idle");
      }
      if (this.state === "hurt") {
        // ducks into the shell at once, knocked back sliding and spinning, then peeks out and pops back up
        if (s < .62) { o.pose = "shell"; const k = ease.o3(seg(s, 0, .5)); o.tx = -110 * k; o.spin = -1.3 * k * (1 - ease.io(seg(s, .35, .6))) + .12 * Math.sin(s * 40) * (1 - k);   // rolls back upright before peeking out
          o.flash = 1 - seg(s, 0, .12); if (this.once("hurt")) { this.events.push("hurt"); o.shake = .45 } o.dizzy = s > .3 ? 1 : 0 }
        else { const p = seg(s, .62, 1.0); o.tx = -110 * (1 - ease.io(p)); o.sx = lerp(1.1, 1, ease.back(seg(s, .62, .9))); o.sy = lerp(.85, 1, ease.back(seg(s, .62, .9)));
          if (this.once("pop")) this.events.push("pop"); o.popfx = seg(s, .62, .95) }
        if (s >= 1.05) this.play("idle");
      }
      return o;
    }
  }
  global.TurtleAnim = TurtleAnim; global.TURTLE = { SR };
})(window);
