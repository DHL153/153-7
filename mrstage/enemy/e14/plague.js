"use strict";
/* ============================================================================
   역병 의사 화염방사병 (plague-doctor flamethrower) — 2D layer rig
   The mask, the brass weapon and the barrel are rigid: the drawings move as whole layers.
   Drawings: stance, fire (braced, weapon level), hit (knocked back, weapon tipped up).
   ========================================================================== */
(function (global) {
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const DEG = Math.PI / 180;
  class PlagueAnim {
    constructor() { this.fxOn = true; this.rage = false; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.freeze = 0; this.prev = null }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.freeze = 0 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    stop(sec) { this.freeze = Math.max(this.freeze, sec) }
    update(dt) {
      this.events.length = 0;
      if (this.freeze > 0) { this.freeze -= dt; if (this.prev) { this.prev.frozen = true; return this.prev } }
      const sp = this.rage ? 1.25 : 1; this.t += dt; this.st += dt * sp; const s = this.st, T = this.t;
      // idle: a heavy breath through the robe, the barrel sways a hair, the lens glints now and then
      const br = Math.sin(T * 2.1);
      const o = { pose: "stance", tx: 0, ty: 0, rot: .3 * DEG * Math.sin(T * .9), sx: 1 - .006 * br, sy: 1 + .012 * br, alpha: 1,
        flash: 0, shake: 0, zoom: 1, smoke: -1, dark: 0, eye: 0, charge: 0, pilot: 0, flame: 0, gauge: .15 + .05 * Math.sin(T * 1.3), puff: 0, rage: this.rage };
      if ((T % 3.6) < .22) o.eye = Math.sin(Math.PI * (T % 3.6) / .22) * .6;
      if (this.state === "enter") {
        // 0–1.0 steam hisses out of the ground and a smoke cloud builds · 0.85–1.25 the lens flashes blue inside the smoke
        // 1.2–2.2 he walks out of the smoke (3 heavy steps) · 2.2–2.7 settles, nozzle hisses · idle at 2.8
        o.smoke = seg(s, 0, 1.0) * (1 - seg(s, 1.9, 2.8));
        const walk = seg(s, 1.2, 2.2);
        // inside the smoke only a dark shape shows (0.6–1.2), then the colours come in as he steps out
        o.alpha = s < 1.2 ? .6 * seg(s, .6, 1.05) : lerp(.6, 1, ease.o3(seg(s, 1.2, 1.5)));
        o.dark = 1 - seg(s, 1.2, 1.7);
        o.tx = lerp(-380, 0, ease.io(walk));
        if (s > 1.2 && s < 2.2) { const ph = (s - 1.2) / .333, k = ph % 1; o.ty = -10 * Math.sin(Math.PI * k); o.rot += 2.2 * DEG * Math.sin(Math.PI * ph);
          for (let i = 0; i < 3; i++) if (s > 1.2 + .333 * (i + 1) - .02 && this.once("step" + i)) { this.events.push("step"); o.shake = .18 } }
        o.eye = s > .85 && s < 1.25 ? Math.sin(Math.PI * seg(s, .85, 1.25)) * 1.6 : o.eye;
        if (s > .86 && this.once("glint")) this.events.push("glint");
        if (s > .05 && this.once("hiss")) this.events.push("hiss");
        if (s > 2.2) { const p = seg(s, 2.2, 2.6); o.sx *= lerp(1.04, 1, ease.back(p)); o.sy *= lerp(.95, 1, ease.back(p)); if (this.once("vent")) this.events.push("vent") }
        o.puff = s > 2.25 && s < 2.75 ? 1 : 0;
        if (s >= 2.8) this.play("idle");
      }
      if (this.state === "attack") {
        // A 0–0.7 pressure builds: the gauge needle climbs, the body trembles, steam leaks from the barrel
        // B 0.7 braced pose, the blue flame roars out 0.7–1.9 (recoil, heat shimmer, hits every 0.25 s)
        // C 1.9–2.3 the flame chokes off, a smoke ring puffs from the nozzle, back to stance · idle at 2.4
        if (s < .7) { const k = seg(s, 0, .7); o.charge = k; o.pilot = seg(s, .15, .6); o.gauge = lerp(.2, 1, ease.io(k));
          o.tx = Math.sin(s * 90) * 2.2 * k; o.ty = Math.cos(s * 77) * 1.4 * k; o.sx *= 1 + .03 * k; o.sy *= 1 - .03 * k; o.rot = -1.2 * DEG * k;
          if (this.once("pump")) this.events.push("pump") }
        else if (s < 1.9) { o.pose = "fire"; const k = seg(s, .7, .8), f = 1 - seg(s, 1.75, 1.9); o.flame = ease.o3(k) * f; o.gauge = 1 - .6 * seg(s, .8, 1.9);
          o.tx = -16 * ease.o3(k) + Math.sin(s * 70) * 2.5; o.ty = Math.cos(s * 63) * 1.5; o.rot = .8 * DEG * Math.sin(s * 40);
          o.shake = .14 * o.flame; o.zoom = 1 + .02 * o.flame;
          if (this.once("ignite")) { this.events.push("ignite"); o.flash = .6; o.shake = .5; this.stop(.06) }
          for (const h of [.95, 1.2, 1.45, 1.7]) if (s > h && this.once("h" + h)) this.events.push("hit") }
        else { const p = seg(s, 1.9, 2.3); o.tx = lerp(-16, 0, ease.o3(p)); o.sx *= lerp(.97, 1, ease.back(p)); o.sy *= lerp(1.03, 1, ease.back(p)); o.puff = 1;
          if (this.once("choke")) this.events.push("choke") }
        if (s >= 2.4) this.play("idle");
      }
      if (this.state === "hurt") {
        if (s < .38) { o.pose = "hit"; const k = ease.o3(seg(s, 0, .08)); o.tx = -34 * k; o.rot = -2 * DEG * k; o.flash = 1 - seg(s, 0, .14);
          if (this.once("hurt")) { this.events.push("hurt"); o.shake = .5; this.stop(.05) } }
        else { const p = seg(s, .38, .8); o.tx = lerp(-34, 0, ease.o3(p)); o.sx *= lerp(.96, 1, ease.back(p)); o.sy *= lerp(1.04, 1, ease.back(p));
          if (this.once("land")) this.events.push("step") }
        if (s >= .85) this.play("idle");
      }
      this.prev = Object.assign({}, o, { shake: 0, flash: 0, frozen: false });
      return o;
    }
  }
  global.PlagueAnim = PlagueAnim;
})(window);
