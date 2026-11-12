"use strict";
/* ============================================================================
   녹슨 풍차 거인 (rusty windmill giant, final boss) — layered sprite rig
   - The golem is solid stone and rusted iron: nothing on it should bend, so it is moved only as rigid
     layers (whole-body squash, tilt, drop, recoil). No mesh deformation at all.
   - The four windmill blades are ONE blade cut from the original art (the fully visible upper-right
     sail) plus a wooden stock down to the hub, repeated every 90°. They spin behind the body on their
     own angular velocity, which every state drives: creaking spin-up, idle turn, charge, gale, hit jolt.
   - Poses: body (no blades, from Gemini), raise (fists overhead), slam (fists on the ground).
     raise shares the body's legs to ~2 px; slam was drawn larger, so it is scaled to the body's size.
   - Hit-stop: the animator freezes its own clock for a few frames on the heaviest impacts.
   ========================================================================== */
(function (global) {
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), i2: t => t * t, io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  class MillAnim {
    constructor() { this.fxOn = true; this.rage = false; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.freeze = 0;
      this.ang = 0; this.w = .55; this.glow = 1; this.prev = null }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.freeze = 0 }
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    stop(sec) { this.freeze = Math.max(this.freeze, sec) }
    update(dt) {
      this.events.length = 0;
      if (this.freeze > 0) { this.freeze -= dt; if (this.prev) { this.prev.frozen = true; return this.prev } }   // hit-stop: hold the exact frame
      this.t += dt; this.st += dt; const s = this.st, T = this.t, R = this.rage;
      const wIdle = (R ? 1.45 : .55);
      // idle: a slow, heavy breath through the whole stone body (anchored at the feet) + a tiny sway
      const br = Math.sin(T * 1.35);
      const o = { pose: "body", tx: 0, ty: 0, rot: .25 * DEG * Math.sin(T * .6), sx: 1 - .004 * br, sy: 1 + .009 * br,
        flash: 0, shake: 0, zoom: 1, letter: 0, banner: 0, drop: -1, charge: -1, wind: 0, glowK: 1, ring: -1, roar: -1, streak: 0 };
      let wT = wIdle, wK = 2.5, glowT = (R ? 1.6 : 1) * (.8 + .2 * Math.sin(T * 3.2));
      if (this.state === "enter") {
        // A rumble 0–0.95 (letterbox in, dust falls, the shadow grows) · B drop 0.95–1.15 · C LAND 1.15 (hit-stop)
        // D squash/settle 1.15–1.7 · E blades creak and spin up 1.6–2.6 (three ratchet jerks, then smooth)
        // F eyes + cracks ignite 2.55 · G ROAR 2.75–3.45 (banner) · letterbox out 3.4–3.85 · idle at 3.9
        o.letter = s < .4 ? ease.o3(s / .4) : s < 3.4 ? 1 : 1 - ease.io(seg(s, 3.4, 3.85));
        o.shake = s < .95 ? .12 + .25 * s : 0; o.drop = s < .95 ? s / .95 : -1;
        if (s < 1.15) { const p = seg(s, .95, 1.15); o.ty = s < .95 ? -2200 : lerp(-2200, 0, ease.i2(p)); o.sy = 1.08; o.sx = .95; o.streak = s >= .95 ? 1 : 0 }
        else { const p = seg(s, 1.15, 1.7); o.sx = lerp(1.09, 1, ease.back(p)) * (1 - .004 * br); o.sy = lerp(.88, 1, ease.back(p)) * (1 + .009 * br);
          if (this.once("land")) { this.events.push("land"); o.shake = 1.3; o.flash = 1; this.stop(.1) } }
        // blades: stopped, then three ratchet jerks, then a smooth spin-up
        wT = 0; wK = 6; if (s > 1.6) { const k = s - 1.6; wT = k < .75 ? (Math.sin(k * 12.5) > .55 ? 1.6 : 0) : lerp(0, wIdle, seg(s, 2.35, 2.7)); if (k > .75 && k < .78 && this.once("spin")) this.events.push("spin") }
        glowT = s < 2.55 ? 0 : glowT * (s < 2.75 ? 2.2 : 1); if (s > 2.55 && this.once("ignite")) this.events.push("ignite");
        if (s > 2.75 && s < 3.45) { const k = ease.o3(seg(s, 2.75, 2.88)), r = ease.io(seg(s, 3.1, 3.45)); o.rot = -2.4 * DEG * k * (1 - r); o.sy = 1 + .035 * k * (1 - r); o.sx = 1 - .015 * k * (1 - r);
          o.roar = seg(s, 2.75, 3.45); wT = 3.2; glowT = 2.2; if (this.once("roar")) { this.events.push("roar"); o.shake = .9 } o.shake = Math.max(o.shake, .35 * (1 - seg(s, 2.8, 3.45))) }
        o.banner = s < 2.7 ? 0 : s < 3.6 ? ease.o3(seg(s, 2.7, 3.0)) : 1 - seg(s, 3.6, 3.95);
        if (s > 3.95) this.play("idle");
      }
      if (this.state === "slam") {
        // A crouch 0–0.25 · B RAISE 0.25 (fists overhead) — charge 0.25–1.0: tremble, cracks blaze, blades race, pebbles lift
        // C drop 1.0–1.1 · D IMPACT 1.1 (slam drawing, hit-stop, zoom punch, shockwave, cracks, rocks) · E hold 1.1–1.7
        // F rise back 1.7–2.1 (body drawing again with a dust puff) · idle at 2.2
        if (s < .25) { const p = ease.io(s / .25); o.sx = 1 + .035 * p; o.sy = 1 - .045 * p; wT = 1.6 }
        else if (s < 1.1) { const p = seg(s, .25, .4); o.pose = "raise"; o.sx = lerp(.96, 1, ease.back(p)); o.sy = lerp(1.07, 1, ease.back(p)); o.rot = -1.6 * DEG * ease.o3(p);
          if (s > .5) { const tr = seg(s, .5, 1.0); o.tx = Math.sin(s * 120) * 2.6 * tr; o.ty = Math.cos(s * 97) * 1.4 * tr; o.shake = .12 * tr }
          o.charge = seg(s, .25, 1.0); wT = lerp(1.6, 5.5, seg(s, .25, .9)); wK = 3; glowT = lerp(1.2, 2.6, o.charge); o.zoom = 1 + .035 * ease.io(o.charge);
          if (s > 1.0) { const q = seg(s, 1.0, 1.1); o.sy = lerp(1, .95, q); o.ty = -26 * Math.sin(Math.PI * q) }
          if (this.once("raise")) this.events.push("raise") }
        else if (s < 1.7) { o.pose = "slam"; const p = seg(s, 1.1, 1.45); o.sx = lerp(1.05, 1, ease.back(p)); o.sy = lerp(.93, 1, ease.back(p)); wT = 2.4; glowT = 2.2;
          if (this.once("hit")) { this.events.push("hit"); o.shake = 1.5; o.flash = 1; this.stop(.12) }
          o.zoom = 1 + .09 * (1 - ease.o3(seg(s, 1.1, 1.5))); o.ring = seg(s, 1.1, 1.9) }
        else { const p = seg(s, 1.7, 2.1); if (this.once("puff")) this.events.push("puff"); o.sx = lerp(1.03, 1, ease.back(p)); o.sy = lerp(.95, 1, ease.back(p)); o.ring = seg(s, 1.1, 1.9) }
        if (s >= 2.2) this.play("idle");
      }
      if (this.state === "gale") {
        // A wind-up 0–0.5: lean back, the blades race to full speed · B GALE 0.5–2.0: lean into it, a storm of wind,
        // torn cloth and grit pours across the screen (hits at 0.8 / 1.2 / 1.6) · C spin down and settle 2.0–2.6
        if (s < .5) { const p = ease.io(s / .5); o.rot = -3 * DEG * p; o.sx = 1 - .01 * p; o.sy = 1 + .02 * p; wT = 7.5; wK = 2.2; glowT = 1.5 }
        else if (s < 2.0) { const p = ease.o3(seg(s, .5, .7)); o.rot = lerp(-3, 2.2, p) * DEG + .4 * DEG * Math.sin(s * 9); o.tx = -10 * p; wT = 8.5; wK = 2.2; glowT = 1.8;
          o.wind = Math.min(1, seg(s, .5, .7)) * (1 - seg(s, 1.8, 2.0)); o.shake = .22 * o.wind;
          for (const h of [.8, 1.2, 1.6]) if (s > h && this.once("gust" + h)) this.events.push("hit") }
        else { const p = ease.io(seg(s, 2.0, 2.6)); o.rot = lerp(2.2, 0, p) * DEG; o.tx = lerp(-10, 0, p); wT = wIdle; wK = 1.4 }
        if (s >= 2.65) this.play("idle");
      }
      if (this.state === "hurt") {
        // knocked back (away from the player), white flash, stone chips; the blades jolt to a near stop and catch again
        if (s < .5) { const k = ease.o3(seg(s, 0, .08)), r = ease.io(seg(s, .18, .5)); o.rot = 2.6 * DEG * k * (1 - r); o.tx = 30 * k * (1 - r * .8); o.sx = 1 + .02 * k * (1 - r); o.sy = 1 - .03 * k * (1 - r);
          o.flash = 1 - seg(s, 0, .12); if (this.once("hurt")) { this.events.push("hurt"); o.shake = .55; this.w *= .15; this.stop(.05) } wT = s < .25 ? .1 : wIdle; wK = 3; glowT = s < .3 && Math.sin(s * 70) > 0 ? 2.2 : glowT }
        else { const p = seg(s, .5, .78); o.tx = 6 * (1 - ease.o3(p)) }
        if (s >= .82) this.play("idle");
      }
      // blades: angular velocity chases its target (wK = how hard it is driven), angle integrates
      this.w += (wT - this.w) * Math.min(1, wK * dt); this.ang += this.w * dt;
      this.glow += (glowT - this.glow) * Math.min(1, 10 * dt);
      o.bladeAng = this.ang; o.bladeW = this.w; o.glowK = this.glow; o.rage = R;
      this.prev = Object.assign({}, o, { shake: 0, flash: 0, frozen: false });
      return o;
    }
  }
  global.MillAnim = MillAnim;
})(window);
