  /* ---------- brawler mode v4 (v8: shoulder-pivot punch) (opt-in: rig.json "brawler" block — 5 러스트 / 15 네온 바실 v6) ----------
     짧은 다리 + 큰 건틀릿 캐릭터:
       · 다리 = 2뼈 IK(골반-무릎-발목). 서 있을 땐 원화 다리(stand), 걸을 땐 시트 다리(허벅지·정강이·발) — 다리 길이·골반 자리도 같이 섞임.
         걸음: 디딘 발은 땅에 고정(배경과 같은 속도로 뒤로), 뜬 발은 호를 그림. 닿지 않으면 골반을 내려 맞춤(무릎 탈골 없음).
         반바지 밑단 위로는 다리를 그리지 않음(rig.def.hemClip) → 다리가 바지를 뚫지 않음
       · 팔 = 어깨(윗팔) + 팔꿈치(건틀릿) 2뼈. 가려진 어깨·윗팔·건틀릿 커프는 시트 그림이 밑에 있어 돌려도 구멍 없음
     공개 API 그대로: update(dt,{vx,facing,stepHz}) · attack(name,opts) · busy · events(hit) · setExpression · facingScale */
  const Brawler = {
    init(an, rig, opts) {
      an.brawl = rig.def.brawler; an.runSpeed = opts.runSpeed || 620; an.G = Object.assign({}, GAIT_DEFAULTS);
      an.t = 0; an.ph = 0; an.A = 0; an.facing = 1; an.turnT = 0; an.prevLVx = 0; an.act = null; an.events = []; an.expr = null; an.faceW = {};
      an.blinkT = 1.4; an.blinkAt = -9; an.prevHipY = 0; an.hipVy = 0;
      an.sF = new Spring(60, 7); an.sN = new Spring(48, 6); an.sP = new Spring(38, 5); an.sH = new Spring(140, 16); an.sL = new Spring(55, 11);
      const b = rig.by, LG = an.brawl.legs; an.legRest = {};
      for (const s of ["N", "F"]) {
        const v1 = b["shin" + s].pos, v2 = b["foot" + s].pos, H = b["thigh" + s].pos;
        const A_ = [H[0] + v1[0] + v2[0], H[1] + v1[1] + v2[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        // knee side of the rest leg = the IK sign that puts the knee back where the art has it
        const err = sg => { const t = Brawler.ik(H, A_, l1, l2, sg)[0]; return Math.hypot(H[0] + l1 * Math.cos(t) - H[0] - v1[0], H[1] + l1 * Math.sin(t) - H[1] - v1[1]) };
        an.legRest[s] = { H, v1, v2, A: A_, bend: err(1) <= err(-1) ? 1 : -1 };
      }
    },
    attack(an, name, opts = {}) {
      const acts = an.brawl.actions || {}; const def = acts[name] || (name === "wave" ? acts.hop : null) || (name === "thrust" ? acts.smash : null); if (!def) return false;
      if (an.act && an.act.t < (an.act.def.cancelAt ?? an.act.def.dur)) return false;
      an.act = { name, def, t: 0, speed: opts.speed || 1, hit: false, freeze: 0 }; return true;
    },
    ik(H, T, l1, l2, bend) {
      const dx = T[0] - H[0], dy = T[1] - H[1]; let d = Math.hypot(dx, dy); d = clamp(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * .9999);
      const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), t1 = a - bend * k;
      const K = [H[0] + l1 * Math.cos(t1), H[1] + l1 * Math.sin(t1)]; return [t1, Math.atan2(T[1] - K[1], T[0] - K[0])];
    },
    update(an, dt, s = {}) {
      dt = Math.min(dt, .05); an.t += dt; an.dt = dt; an.events.length = 0;
      const rig = an.rig, b = rig.by, C = an.brawl, R = C.run, I0 = C.idle || {}, LG = C.legs; rig.resetPose();
      const vx = s.vx || 0, want = an.act ? an.facing : (s.facing || (Math.abs(vx) > 1 ? Math.sign(vx) : an.facing));
      if (want !== an.facing) { an.facing = want; an.turnT = .16; an.prevLVx = -an.prevLVx }
      an.turnT = Math.max(0, an.turnT - dt);
      const lvx = vx * an.facing, sp = Math.abs(vx);
      const act = an.act; if (act) { if (act.freeze > 0) act.freeze -= dt; else act.t += dt * act.speed; if (act.t >= act.def.dur) an.act = null }
      const D = an.act ? an.act.def : null, at = an.act ? an.act.t : 0, tr = k => D && D[k] ? track(D[k], at) : 0;
      an.A = damp(an.A, D ? 0 : smooth(15, 200, sp), D ? 16 : 7, dt); const A = an.A, I = 1 - A;
      const hz = s.stepHz > 0 && sp > 14 ? s.stepHz : (R.hz0 + R.hzK * sp), T2 = 2 / hz, st = R.stance;
      if (!D) an.ph = (an.ph + dt / T2 * smooth(5, 60, sp)) % 1;
      const P = an.ph * TAU, T = an.t, br = Math.sin(T * TAU / (I0.period || 2.9));
      const accel = (lvx - an.prevLVx) / Math.max(dt, 1e-4); an.prevLVx = lvx;
      const leanA = an.sL.step(D ? 0 : clamp(accel * .00025, -.12, .12), dt);
      // ---- pelvis (before the leg fit)
      b.hip.ay = I * br * (I0.breath ?? 3) + A * (R.hipRun + R.bob * Math.max(0, Math.cos(2 * TAU * an.ph))) + tr("hipY");
      b.hip.ax = tr("hipX") + (D && D.shake ? Math.sin(T * 95) * tr("shake") : 0);
      // ---- legs: targets, lengths, IK, pelvis fit
      const w = smooth(.04, .22, A) >= .5 ? 1 : 0;   // v8: stand picture <-> walk picture is a clean swap (a cross-fade showed both legs half see-through)
      const S = Math.min(R.maxStride || 1e9, sp * st * T2), legs = {};
      for (const sd of ["N", "F"]) {
        const r = an.legRest[sd], ws = LG.walkHip[sd] * 2 - r.H[0];   // walk hip x offset (rig)
        const H0 = [r.H[0] + A * ws + b.hip.pos[0] + b.hip.ax, r.H[1] + b.hip.pos[1] + b.hip.ay];
        const v1 = [lerp(r.v1[0], 0, A), lerp(r.v1[1], LG.walkLen[0], A)], v2 = [lerp(r.v2[0], 0, A), lerp(r.v2[1], LG.walkLen[1], A)];
        const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        // walk foot (root space): stance slides back with the ground, swing arcs forward
        const u = (an.ph + (sd === "F" ? .5 : 0)) % 1; let fx, fl;
        if (u < st) { fx = S / 2 - S * u / st; fl = 0 } else { const q = (u - st) / (1 - st); fx = -S / 2 + S * (q * q * (3 - 2 * q)); fl = R.lift * Math.sin(Math.PI * q) * smooth(5, 60, sp) }
        const wx = LG.walkHip[sd] * 2 + b.hip.pos[0] + fx, wy = -(LG.sole || 0) - fl;
        const ax = r.A[0] + b.hip.pos[0] + tr("step" + sd), ay = r.A[1] + b.hip.pos[1] - tr("lift" + sd);
        const q_ = u < st ? u / st : -1, wi = q_ < 0 ? ((u - st) / (1 - st) > .78 ? 0 : 3) : q_ < .2 ? 0 : q_ < .72 ? 1 : 2;
        legs[sd] = { H0, v1, v2, l1, l2, Tg: [lerp(ax, wx, A), lerp(ay, wy, A)], bend: r.bend, walk: { i: wi, x: wx, y: -fl } };
      }
      let drop = 0;
      for (const sd in legs) { const g = legs[sd], Lm = (g.l1 + g.l2) * lerp(.9999, .985, A), dx = g.Tg[0] - g.H0[0];
        if (Math.abs(dx) < Lm) drop = Math.max(drop, (g.Tg[1] - g.H0[1]) - Math.sqrt(Lm * Lm - dx * dx)) }
      drop = Math.max(0, drop) * (1 - w); b.hip.ay += drop;   // walking drawings hang from the shorts: no pelvis fit while walking
      for (const sd in legs) {
        const g = legs[sd], H = [g.H0[0], g.H0[1] + drop];
        const s1 = this.ik(H, g.Tg, g.l1, g.l2, g.bend), s2 = this.ik(H, g.Tg, g.l1, g.l2, 1), k = smooth(.1, .6, A);
        const t1 = lerp(s1[0], s2[0], k), t2 = lerp(s1[1], s2[1], k);
        const th = b["thigh" + sd], sh = b["shin" + sd], ft = b["foot" + sd], a1 = Math.atan2(g.v1[1], g.v1[0]), a2 = Math.atan2(g.v2[1], g.v2[0]);
        th.ax = A * (LG.walkHip[sd] * 2 - an.legRest[sd].H[0]);
        th.ar = t1 - a1; sh.ax = g.v1[0] - sh.pos[0]; sh.ay = g.v1[1] - sh.pos[1]; sh.ar = (t2 - a2) - th.ar;
        ft.ax = g.v2[0] - ft.pos[0]; ft.ay = g.v2[1] - ft.pos[1]; ft.ar = -(th.ar + sh.ar);
        rig.alpha["walk" + sd] = w; rig.alpha["stand" + sd] = 1 - w;
        // walking drawing (knee + lower leg + foot in one picture, one per phase): hangs from a point inside the shorts,
        // swings so its sole lands on the gait target (planted foot moves with the ground) — no knee joint to break
        const wl = g.walk, M = LG.walk[wl.i], vx_ = M.sole[0], vy_ = M.sole[1], Rr = Math.hypot(vx_, vy_), ph_ = Math.atan2(vy_, vx_);
        const px = LG.walkHip[sd] * 2 + b.hip.pos[0] + b.hip.ax, th_ = Math.acos(clamp((wl.x - px) / Rr, -1, 1)) - ph_;
        const wb = b["walk" + sd]; wb.ax = px; wb.ay = wl.y - Rr * Math.sin(ph_ + th_); wb.ar = th_; rig.swap["walk" + sd] = "walk" + sd + wl.i;
      }
      const hipY = b.hip.ay; an.hipVy = damp(an.hipVy, (hipY - an.prevHipY) / Math.max(dt, 1e-4), 20, dt); an.prevHipY = hipY;
      // ---- torso, head
      b.torso.ar = I * br * .01 + A * (R.lean + R.leanBob * Math.sin(2 * P)) + leanA + tr("lean");
      b.torso.asy = 1 + I * br * .008; b.torso.asx = 1 - I * br * .003;
      const hl = an.sH.step(an.hipVy * .006, dt);
      b.head.ar = I * Math.sin(T * .8) * .02 - A * R.headRun - leanA * .5 + hl * .015 + tr("head");
      // ---- arms: shoulder + elbow, heavy gauntlets lag on springs and swing against the legs
      const LAGC = 10, fT = clamp(an.sF.step(hipY, dt) - hipY, -LAGC, LAGC), nT = clamp(an.sN.step(hipY, dt) - hipY, -LAGC, LAGC);   // v8: heavy-gauntlet lag capped so a hop never swings the arm off the shoulder
      b.armF.ar = I * br * (I0.armBreath ?? .018) + A * R.armSwing * Math.sin(P + .5) - fT * R.armLag + tr("farA");
      b.foreF.ar = -I * br * .012 + A * R.elbowSwing * Math.sin(P + 1.1) - fT * R.armLag * .5 + tr("farE");
      b.armU.ar = -I * br * (I0.armBreath ?? .018) * .7 - A * R.armSwing * Math.sin(P + .5) + nT * R.armLag + tr("nearA");
      b.armL.ar = tr("nearE");
      // straight punch (opt-in track pD): art far arm hidden, one-piece straight arm (sheet skin + art gauntlet) slides out along its own axis
      // v8: the straight arm hangs from the SHOULDER (its own deltoid under the head), never slides off the body.
      //     pOn = cross-fade art guard arm -> straight arm (swap on the fastest frame), pK = arm length (1 = drawing), pA = aim
      const pOn = D && D.pOn ? clamp(tr("pOn"), 0, 1) : 0;
      rig.alpha.farUp = rig.alpha.foreF = 1 - pOn; rig.alpha.punchSkin = rig.alpha.punchG = pOn;
      if (rig.def.parts.torsoP) rig.swap.torso = pOn > .5 ? "torsoP" : null;   // v11: torso without the far-shoulder lump while the straight arm is out
      if (b.punch) { const k = D && D.pK ? tr("pK") : 1; b.punch.ar = tr("pA"); b.punchSkin.asx = k; b.punchG.ax = (LG.skinLen || 0) * (k - 1) }
      b.armU.ax += tr("guardX"); b.armU.ay += tr("guardY");
      if (b.pony) { const pT = an.sP.step(hipY + accel * .01, dt) - hipY; b.pony.ar = clamp(-pT * .004 * (R.ponySway ?? .5) / .5, -.18, .18) }
      if (an.act && !an.act.hit && D.hitAt != null && at >= D.hitAt) { an.act.hit = true; if (D.hitStop) an.act.freeze = D.hitStop; rig.compute(); const p = rig.point(D.pOn ? "fistP" : "fistF"); an.events.push({ type: "hit", x: p[0], y: p[1] }) }
      // ---- faces + blink
      let fTarget = an.expr; if (D && D.face) for (const [k, n] of D.face) if (at >= k) fTarget = n === null ? an.expr : n;
      const faces = rig.def.faces || {}; for (const n in faces) an.faceW[n] = n === fTarget ? 1 : 0; rig.face = an.faceW;
      if (D || fTarget) { an.blinkT = Math.max(an.blinkT, .35); if (T - an.blinkAt > .02) an.blinkAt = -9 }
      an.blinkT -= dt; if (an.blinkT <= 0) { an.blinkT = 2.2 + Math.random() * 3; an.blinkAt = T }
      const bd = rig.def.blinkFaces ? .17 : .14, bt = T - an.blinkAt; rig.blink = bt < bd ? Math.sin(bt / bd * Math.PI) : 0;
    }
  };
