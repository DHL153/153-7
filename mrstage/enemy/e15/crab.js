"use strict";
/* ============================================================================
   해적 게 (pirate crab) — 2D layer rig
   Shell and claws are rigid, so whole drawings are swapped: stance, open (claw wide open),
   smash (claw slammed down, touching the ground), hit (knocked back, hat flying).
   open and smash differ from stance ONLY in the right claw, so the swaps never shift the body.
   ========================================================================== */
(function (global) {
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const DEG = Math.PI / 180;
  class CrabAnim {
    constructor() { this.fxOn = true; this.rage = false; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.freeze = 0; this.prev = null; this.fired = {} }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.freeze = 0 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    stop(sec) { this.freeze = Math.max(this.freeze, sec) }
    update(dt) {
      this.events.length = 0;
      if (this.freeze > 0) { this.freeze -= dt; if (this.prev) { this.prev.frozen = true; return this.prev } }
      const sp = this.rage ? 1.25 : 1; this.t += dt; this.st += dt * sp; const s = this.st, T = this.t;
      // idle: a small sideways shuffle (crabs never stand still), a slow breath through the shell
      const o = { pose: "stance", tx: 5 * Math.sin(T * 1.7), ty: -1.5 * Math.abs(Math.sin(T * 3.4)), rot: .5 * DEG * Math.sin(T * 1.7), sx: 1 + .004 * Math.sin(T * 2.2), sy: 1 - .008 * Math.sin(T * 2.2),
        alpha: 1, flash: 0, shake: 0, zoom: 1, burrow: 0, mound: 0, clack: 0, slam: -1, rage: this.rage };
      if (this.state === "enter") {
        // 0–1.1 only the hat and eye stalks show above the sand, travelling sideways · 1.1–1.6 stops and peeks around twice
        // 1.6–1.85 bursts out of the sand · 1.85–2.1 lands · 2.15–2.75 "찰칵찰칵" two claw clacks · idle at 2.85
        const HID = 372;                                    // how far below the ground he sits while burrowed (only the top ~110 px show)
        if (s < 1.6) { o.burrow = 1; o.mound = 1; const k = seg(s, 0, 1.1);
          o.tx = lerp(-420, 0, ease.io(k)); o.ty = HID + 6 * Math.sin(s * 22) * (1 - seg(s, .9, 1.1)); o.rot = 2 * DEG * Math.sin(s * 14) * (1 - seg(s, .9, 1.1));
          if (s > 1.1) { const p = seg(s, 1.1, 1.6); o.ty = HID - 34 * Math.sin(Math.PI * Math.min(1, p * 2)) - 34 * Math.sin(Math.PI * Math.max(0, p * 2 - 1)); o.rot = (p < .5 ? -3 : 3) * DEG * Math.sin(Math.PI * ((p * 2) % 1)) }
          if (s > .02 && this.once("dig")) this.events.push("dig") }
        else if (s < 2.1) { const up = seg(s, 1.6, 1.78), dn = seg(s, 1.78, 2.0);
          o.burrow = s < 1.72 ? 1 : 0; o.mound = 1 - seg(s, 1.6, 1.75);
          o.ty = s < 1.78 ? lerp(HID - 20, -60, ease.o3(up)) : lerp(-60, 0, dn * dn); o.tx = 0;
          if (this.once("burst")) { this.events.push("burst"); o.shake = .35 }
          if (s > 2.0) { const p = seg(s, 2.0, 2.1); o.sx *= lerp(1.05, 1, p); o.sy *= lerp(.94, 1, p); if (this.once("land")) { this.events.push("land"); o.shake = .25 } } }
        else { const p = seg(s, 2.1, 2.3); o.sx *= lerp(1.05, 1, ease.back(p)); o.sy *= lerp(.94, 1, ease.back(p)); o.tx = 0; o.ty = 0;
          for (const [a, b, k] of [[2.2, 2.34, "c1"], [2.46, 2.6, "c2"]]) if (s > a && s < b) { o.pose = "open"; if (this.once(k + "o")) this.events.push("open") }
            else if (s >= b && this.once(k)) { this.events.push("clack"); o.clack = 1 } }
        if (s >= 2.85) this.play("idle");
      }
      if (this.state === "attack") {
        // A 0–0.36 two quick clacks (threat) · 0.36–0.72 claw held wide open, leaning back, trembling
        // B 0.72–0.88 two fast side-steps forward · 0.88 SMASH: the closed claw slams onto the ground (hit-stop, shock ring, splash)
        // C 0.88–1.3 holds, grinding the claw · 1.3–1.7 side-steps back · idle at 1.75
        if (s < .72) { const c = s < .12 || (s > .24 && s >= .24); o.pose = s < .12 || s > .24 ? "open" : "stance";
          if (s > .12 && this.once("k1")) { this.events.push("clack"); o.clack = 1 }
          if (s < .02 && this.once("o0")) this.events.push("open");
          if (s > .24 && this.once("o1")) this.events.push("open");
          const k = seg(s, .3, .72); o.rot = -3 * DEG * ease.o3(k) + .6 * DEG * Math.sin(s * 80) * k; o.tx = -10 * ease.o3(k) + Math.sin(s * 95) * 1.5 * k;
          o.sx *= 1 - .02 * k; o.sy *= 1 + .02 * k }
        else if (s < .88) { o.pose = "open"; const k = seg(s, .72, .88); o.tx = lerp(-10, 80, ease.io(k)); o.ty = -8 * Math.abs(Math.sin(Math.PI * 2 * k)); o.rot = lerp(-3, 2, k) * DEG;
          if (k > .5 && this.once("s1")) this.events.push("step") }
        else if (s < 1.3) { o.pose = "smash"; const k = seg(s, .88, .96); o.tx = 80; o.rot = lerp(4, 2, ease.o3(k)) * DEG; o.sx *= lerp(1.04, 1, k); o.sy *= lerp(.95, 1, k);
          o.slam = seg(s, .88, 1.28); o.zoom = 1 + .03 * (1 - seg(s, .88, 1.2));
          if (s > 1.0) o.tx += Math.sin(s * 70) * 1.5 * (1 - seg(s, 1.0, 1.3));   // grinding the claw into the ground
          if (this.once("slam")) { this.events.push("slam"); o.flash = .5; o.shake = .7; this.stop(.08) } }
        else { const k = seg(s, 1.3, 1.7); o.tx = lerp(80, 0, ease.io(k)); o.ty = -7 * Math.abs(Math.sin(Math.PI * 2 * k));
          if (k > .25 && this.once("s2")) this.events.push("step"); if (k > .75 && this.once("s3")) this.events.push("step") }
        if (s >= 1.75) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .4) { o.pose = "hit"; const k = ease.o3(seg(s, 0, .08)); o.tx = -30 * k; o.ty = -10 * Math.sin(Math.PI * seg(s, 0, .3)); o.rot = -2.5 * DEG * k; o.flash = 1 - seg(s, 0, .14);
          if (this.once("hurt")) { this.events.push("hurt"); o.shake = .45; this.stop(.05) } }
        else { const p = seg(s, .4, .8); o.tx = lerp(-30, 0, ease.o3(p)); o.sx *= lerp(1.04, 1, ease.back(p)); o.sy *= lerp(.95, 1, ease.back(p));
          if (this.once("land")) this.events.push("land") }
        if (s >= .85) this.play("idle");
      }
      this.prev = Object.assign({}, o, { shake: 0, flash: 0, clack: 0, frozen: false });
      return o;
    }
  }
  global.CrabAnim = CrabAnim;
})(window);
