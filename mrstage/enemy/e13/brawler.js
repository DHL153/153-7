"use strict";
/* ============================================================================
   해골 복서 오우거 (skull boxer ogre, boss) — layered 2D rig, one attack = the whole combination
   - Seven drawings: stance, jab, straight, hook, upper(cut), raise (both fists up), hit.
     Gemini kept the skull at exactly the same spot in every drawing, so they share one frame;
     only the uppercut is lifted (its legs were drawn longer) so the feet stay on the floor.
   - Gauntlets are iron, so nothing bends: whole drawings snap, lunge, squash and twist.
   - Every punch: wind-back → swap on the fastest frame → hit-stop → hold → next.
   ========================================================================== */
(function (global) {
  const ease = { o3: t => 1 - Math.pow(1 - t, 3), io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const DEG = Math.PI / 180;
  // the combination, one attack: jab jab JAB · hook · jab · hook · UPPER · DOWN (both fists) · jab · HOOK
  // [pose, duration, lunge px, twist deg, power, fist point]  — consecutive jabs alternate the jab / straight drawings (left-right)
  const F = { jab: [1000, 488], straight: [995, 481], hook: [905, 500], upper: [770, 80] };
  const STEPS = [
    ["jab", .15, 26, 2, .8], ["straight", .15, 34, 3, .9], ["jab", .17, 44, 2, 1.1], ["hook", .24, 50, 9, 1.4],
    ["straight", .15, 36, 3, 1.0], ["hook", .24, 52, 10, 1.5], ["upper", .34, 30, -6, 2.0], ["DOWN", .82, 0, 0, 2.4],
    ["jab", .15, 34, 2, 1.0], ["hook", .30, 60, 11, 1.9] ];
  let acc = .1; const COMBO = STEPS.map(st => { const o = { pose: st[0], t0: acc, dur: st[1], lunge: st[2], tw: st[3], pw: st[4], fist: F[st[0]] }; acc += st[1]; return o });
  const END = acc;
  class BoxerAnim {
    constructor() { this.fxOn = true; this.rage = false; this.t = 0; this.state = "idle"; this.st = 0; this.events = []; this.freeze = 0; this.prev = null }
    play(s) { this.state = s; this.st = 0; this.events.length = 0; this.fired = {}; this.freeze = 0; this.slamT = undefined }   // a new state never inherits the last slam timer
    once(k) { if (this.fired[k]) return false; this.fired[k] = 1; return true }
    stop(sec) { this.freeze = Math.max(this.freeze, sec) }
    update(dt) {
      this.events.length = 0;
      if (this.freeze > 0) { this.freeze -= dt; if (this.prev) return Object.assign({}, this.prev, { frozen: true }) }
      const sp = this.rage ? 1.3 : 1; this.t += dt; this.st += dt * (this.state === "attack" ? sp : 1); const s = this.st, T = this.t;
      // idle: Tyson peek-a-boo — bob and weave side to side, light bounce on the toes
      const wv = Math.sin(T * (this.rage ? 2.9 : 2.2)), bo = Math.abs(Math.sin(T * (this.rage ? 5.8 : 4.4)));
      const o = { pose: "stance", tx: 16 * wv, ty: -7 * bo, rot: 2.2 * DEG * wv, sx: 1 + .01 * (1 - bo), sy: 1 - .015 * (1 - bo),
        ghost: null, ghostA: 0, shake: 0, flash: 0, zoom: 1, impact: null, speed: 0, speedDir: 0, charge: -1, slam: -1, dash: 0, fall: -1, rage: this.rage };
      if (this.state === "enter") {
        // A a shadow grows on the floor 0–0.55 while he drops from the sky, both fists up (raise drawing) 0.25–0.55
        // B LANDS 0.55: superhero landing — huge squash, hit-stop, cracks, shockwave, rocks · C rises out of it 0.55–1.05
        // D shadowboxes: jab 1.18, straight 1.32 · E raises both fists and CLASHES them 1.72 · F drops into the guard, idle at 2.3
        o.fall = s < .55 ? s / .55 : -1;
        if (s < .55) { const p = seg(s, .25, .55); o.pose = "raise"; o.ty = s < .25 ? -2200 : lerp(-2200, 0, p * p); o.tx = 0; o.rot = 0; o.sx = .94; o.sy = 1.08; o.speed = s > .25 ? 1 : 0; o.speedDir = Math.PI / 2 }
        else if (s < 1.1) { const p = seg(s, .55, 1.05); o.pose = "stance"; o.sx = lerp(1.18, 1, ease.back(p)); o.sy = lerp(.76, 1, ease.back(p)); o.tx = 0; o.ty = 0; o.rot = 0;
          if (this.once("land")) { this.events.push("slam"); this.slamT = s; o.shake = 1.4; o.flash = 1; this.stop(.1) } o.zoom = 1 + .07 * (1 - ease.o3(seg(s, .55, 1.0))) }
        else if (s < 1.5) { o.pose = s < 1.32 ? "jab" : "straight"; const k = s < 1.32 ? seg(s, 1.18, 1.23) : seg(s, 1.32, 1.37); o.tx = 22 * ease.o3(k); o.rot = 2 * DEG; o.ty = 0;
          if (s > 1.18 && this.once("sb1")) this.events.push("whoosh"); if (s > 1.32 && this.once("sb2")) this.events.push("whoosh") }
        else if (s < 1.98) { o.pose = "raise"; const p = seg(s, 1.5, 1.62); o.sx = lerp(.96, 1, ease.back(p)); o.sy = lerp(1.06, 1, ease.back(p)); o.tx = 0; o.ty = 0; o.rot = -2 * DEG;
          if (s > 1.72 && this.once("clash")) { this.events.push("clash"); o.shake = .5; o.flash = 1; this.stop(.07) } }
        else { const p = seg(s, 1.98, 2.25); o.sx = lerp(1.05, 1, ease.back(p)); o.sy = lerp(.93, 1, ease.back(p)); o.tx = 16 * wv * p; o.ty = 0 }
        if (this.slamT !== undefined && s >= this.slamT) o.slam = seg(s, this.slamT, this.slamT + .9);
        if (s > 2.3) { this.slamT = undefined; this.play("idle") }
      }
      if (this.state === "attack") {
        o.tx = 0; o.ty = 0; o.rot = 0; o.sx = o.sy = 1;
        if (s < COMBO[0].t0) { const p = ease.io(s / COMBO[0].t0); o.rot = -3 * DEG * p; o.tx = -12 * p; o.sx = 1 + .03 * p; o.sy = 1 - .04 * p }
        for (let i = 0; i < COMBO.length; i++) {
          const C = COMBO[i], prevPose = i ? (COMBO[i - 1].pose === "DOWN" ? "stance" : COMBO[i - 1].pose) : "stance", s0 = s - C.t0;
          if (s0 < 0 || s0 >= C.dur) continue;
          const weave = (i % 2 ? 1 : -1);                         // the body bobs to the other side every punch
          if (C.pose === "DOWN") {                                // both fists up (charge), then smashed down
            const up = .34;
            if (s0 < up) { const p = seg(s0, 0, .1), c = seg(s0, .08, up); o.pose = "raise"; o.sx = lerp(.95, 1, ease.back(p)); o.sy = lerp(1.07, 1, ease.back(p)); o.rot = -4 * DEG * ease.io(c); o.ty = -12 * ease.io(c);
              if (c > .2) { o.tx = Math.sin(s * 120) * 2.4 * c; o.shake = .1 * c } o.charge = c; o.zoom = 1 + .03 * ease.io(c); o.ghost = s0 < .05 ? prevPose : null; o.ghostA = .3 }
            else { const k = seg(s0, up, up + .05), r = ease.back(seg(s0, up + .14, C.dur)); o.pose = "stance"; o.sx = lerp(1.14, 1, r); o.sy = lerp(.82, 1, r); o.rot = 3 * DEG * (1 - r); o.tx = 20 * (1 - r);
              o.ghost = s0 < up + .05 ? "raise" : null; o.ghostA = .35;
              if (this.once("slam")) { this.events.push("slam"); this.slamT = s; o.shake = 1.4; o.flash = 1; this.stop(.1) }
              o.zoom = 1 + .08 * (1 - ease.o3(seg(s0, up, up + .4))) }
            continue;
          }
          const wb = Math.min(.05, C.dur * .3);                   // a very short wind-back keeps the rhythm snappy
          if (s0 < wb) { const p = ease.io(s0 / wb); o.pose = prevPose; o.rot = -(1.5 + C.tw * .3) * DEG * p; o.tx = -10 * p * C.pw + 8 * weave; o.sx = 1 + .025 * p; o.sy = 1 - .03 * p;
            if (C.pose === "upper") { o.sy = 1 - .1 * p; o.sx = 1 + .05 * p }
            if (s0 + dt >= wb * .5 && this.once("w" + i)) this.events.push("whoosh") }
          else { const t = s0 - wb, k = ease.o3(seg(t, 0, .04)), r = ease.io(seg(t, .06, C.dur - wb));
            o.pose = C.pose; o.tx = lerp(-10 * C.pw, C.lunge, k) * (1 - .45 * r) + 8 * weave * (1 - r); o.rot = C.tw * DEG * (1 - .5 * r); o.ty = C.pose === "hook" ? 6 * (1 - r) : 0;
            o.sx = lerp(1.06, 1, ease.o3(seg(t, 0, .1))); o.sy = lerp(.95, 1, ease.o3(seg(t, 0, .1)));
            if (C.pose === "upper") o.ty = -15 * k * (1 - r);
            o.ghost = prevPose !== C.pose ? prevPose : null; o.ghostA = .35 * (1 - seg(t, 0, .05)); o.speed = 1 - seg(t, 0, .12); o.speedDir = C.pose === "upper" ? -Math.PI / 2 : 0;
            o.zoom = 1 + .015 * C.pw * (1 - ease.o3(seg(t, 0, .2)));
            if (this.once("hit" + i)) { this.events.push("hit"); o.shake = .18 * C.pw; o.flash = C.pw >= 1.9 ? 1 : 0; this.stop(.02 + .018 * C.pw) }
            o.impact = { k: seg(t, 0, Math.min(.28, C.dur)), fist: C.fist, pw: C.pw } }
        }
        if (this.slamT !== undefined && s >= this.slamT) o.slam = seg(s, this.slamT, this.slamT + .9);
        if (s >= END) { const p = seg(s, END, END + .3); o.pose = "stance"; o.tx = 16 * wv * p; o.ty = -7 * bo * p; o.rot = 2.2 * DEG * wv * p }
        if (s >= END + .35) { this.slamT = undefined; this.play("idle") }
      }
      if (this.state === "hurt") {
        // head snaps down (hit drawing), knocked back a step, then weaves back into the guard
        if (s < .45) { o.pose = "hit"; const k = ease.o3(seg(s, 0, .08)), r = ease.io(seg(s, .2, .45)); o.tx = -46 * k * (1 - r * .7); o.rot = -4 * DEG * k * (1 - r); o.ty = 0; o.sx = 1 + .02 * k; o.sy = 1 - .03 * k;
          o.flash = this.fxOn ? 1 - seg(s, 0, .12) : 0; if (this.once("hurt")) { this.events.push("hurt"); o.shake = .45; this.stop(.04) } }
        else { const p = seg(s, .45, .8); o.tx = -14 * (1 - ease.o3(p)) + 16 * wv * p; o.rot = 2.2 * DEG * wv * p; o.ty = -7 * bo * p }
        if (s >= .85) this.play("idle");
      }
      this.prev = Object.assign({}, o, { shake: 0, flash: 0 });
      return o;
    }
  }
  global.BoxerAnim = BoxerAnim; global.BOXER = { COMBO, END };
})(window);
