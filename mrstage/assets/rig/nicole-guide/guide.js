/* 니콜 안내 NPC — 게임 연결 (2026-11-03)
   엔진(npc.js: NicoleRig · NicoleAnim)은 받은 그대로 쓰고, 여기서는
   ① 데이터(guide.def.js)의 그림을 불러 리그를 만들고
   ② 리그를 게임 캔버스(2D)에 그리고
   ③ 이펙트(빛 모임 · 반짝이 · 꽃잎 · 눈물 · 땀 · 생각 방울 · 놀람 선 · 착지 먼지)를 화면 좌표로 그린다.
   이펙트는 원본 미리보기(preview/index.html)와 같은 그림 · 같은 시점. 크기만 니콜 키에 맞춰 줄인다. */
(function (global) {
  'use strict';
  const D = () => global.NICOLE_GUIDE_DEF;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const REF_K = .86;            // 원본 미리보기의 니콜 배율 (이펙트 속도 · 크기의 기준)
  let ready = null;

  function load() {
    if (ready) return ready;
    const d = D();
    if (!d) return (ready = Promise.reject(new Error('NICOLE_GUIDE_DEF 없음')));
    ready = Promise.all(Object.entries(d.img).map(([k, src]) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res([k, im]); im.onerror = () => rej(new Error('그림 ' + k)); im.src = src;
    }))).then(pr => Object.fromEntries(pr));
    return ready;
  }

  class Guide {
    constructor(img) {
      const d = D();
      this.glc = document.createElement('canvas'); this.glc.width = 2; this.glc.height = 2;
      this.rig = new NicoleRig(this.glc, { img, frames: d.frames, faces: d.faces, weights: d.weights });
      this.an = new NicoleAnim(d.frames, { kp: {}, anchors: [] });
      this.an.hidden = true;
      this.parts = []; this.out = null; this.events = [];
      this.view = { x: 0, y: 0, k: 1 }; this.map = null; this.S = .2;
    }
    /* 한 프레임 진행. 엔진이 낸 이벤트(land · pop · poof · shock · act:* …)를 this.events 로 넘김 */
    update(dt) { this.out = this.an.update(dt); this.events = this.an.events.slice(); return this.out; }
    /* 니콜을 2D 캔버스에 그림. view = {x: 발 x, y: 발 y, k: 배율} (캔버스 픽셀) */
    draw(ctx, view) {
      const c = ctx.canvas, o = this.out; if (!o) return;
      if (this.glc.width !== c.width || this.glc.height !== c.height) { this.glc.width = c.width; this.glc.height = c.height; }
      this.view = view; this.rig.renderBody(o, view);
      if (o.alpha <= .002) return;
      ctx.save(); ctx.globalAlpha = o.alpha; ctx.drawImage(this.glc, 0, 0); ctx.restore();
    }
    /* 그림 좌표(680×1024, 발 = 300,992) → 리그 캔버스 픽셀 */
    a2c(x, y) { const r = [0, 0]; this.rig.view = this.view; this.rig.a2s([x, y], this.out, r); return r; }

    /* ── 이펙트 ── toScreen(px,py): 리그 캔버스 픽셀 → 화면(CSS px), S: 원본 대비 크기 */
    emit(toScreen, S, on) {
      const o = this.out; if (!o || !on) return; this.S = S;
      const f = o.fx, A = (x, y) => { const p = this.a2c(x, y); return toScreen(p[0], p[1]); }, P = this.parts;
      const ctr = A(300, 560), R = r => Math.max(2.2, r * Math.max(S, .22) * 1.4);   /* 작은 니콜(하늘 자리 ~110px)에서도 빛가루가 보이게 */
      if (f.gather > 0 && Math.random() < .9) for (let i = 0; i < 2; i++) { const a = rnd(0, 6.28), d = rnd(160, 300) * S;
        P.push({ k: 'in', x: ctr[0] + Math.cos(a) * d, y: ctr[1] + Math.sin(a) * d * 1.4, tx: ctr[0] + rnd(-60, 60) * S, ty: ctr[1] + rnd(-280, 200) * S, t: 0, life: rnd(.5, .8), r: R(rnd(5, 10)) }); }
      if (f.gather < 0 && Math.random() < .9) for (let i = 0; i < 3; i++) P.push({ k: 'mote', x: ctr[0] + rnd(-120, 120) * S, y: ctr[1] + rnd(-380, 300) * S, vx: rnd(-40, 40) * S, vy: rnd(-160, -60) * S, t: 0, life: rnd(.6, 1.1), r: R(rnd(4, 9)) });
      if (f.sparkle && Math.random() < .35 * (f.sparkle || 1)) { const p = A(rnd(150, 470), rnd(80, 420)); P.push({ k: Math.random() < .3 ? 'heart' : 'mote', x: p[0], y: p[1], vx: rnd(-30, 30) * S, vy: rnd(-110, -50) * S, t: 0, life: rnd(.7, 1.1), r: R(rnd(6, 11)) }); }
      if (f.tears && Math.random() < .07) { const e = Math.random() < .55 ? [262, 270] : [380, 266], p = A(e[0], e[1]); P.push({ k: 'tear', x: p[0], y: p[1], vx: rnd(-6, 6) * S, vy: 20 * S, t: 0, life: 1.1, r: R(4.2), gy: p[1] + rnd(40, 70) * S }); }
      if (f.think && Math.random() < .045) { const p = A(452, 150); P.push({ k: 'bub', x: p[0] + rnd(-6, 6) * S, y: p[1], vx: rnd(10, 22) * S, vy: -34 * S, t: 0, life: 1.6, r: R(rnd(8, 13)) }); }
      if (f.sweat && !P.some(p => p.k === 'sweat')) { const p = A(438, 150); P.push({ k: 'sweat', x: p[0], y: p[1], vx: 0, vy: 14 * S, t: 0, life: 1.8, r: R(9) }); }
      for (const e of this.events) {
        if (e === 'pop' || e === 'poof') for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), v = rnd(80, 320) * S;
          P.push({ k: i % 4 ? 'mote' : 'petal', x: ctr[0] + rnd(-40, 40) * S, y: ctr[1] + rnd(-200, 120) * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * S, t: 0, life: rnd(.6, 1.1), r: R(rnd(5, 10)), rot: rnd(0, 6) }); }
        if (e === 'land') { const p = A(300, 992); for (let i = 0; i < 8; i++) P.push({ k: 'dust', x: p[0] + rnd(-90, 90) * S, y: p[1] - 2, vx: rnd(-70, 70) * S, vy: rnd(-40, -10) * S, t: 0, life: rnd(.35, .55), r: R(rnd(10, 18)) }); }
        if (e === 'shock') { const p = A(430, 70); P.push({ k: 'shock', x: p[0], y: p[1], t: 0, life: .6, r: R(22) }); }
      }
      if (P.length > 260) P.splice(0, P.length - 260);
    }
    /* 빛 기둥(등장 때 빛이 모이는 곳) — 화면 좌표 */
    gatherCol(toScreen) { const o = this.out; if (!o || !(o.fx.gather > 0)) return null; const top = toScreen(...this.a2c(300, 20)), ft = toScreen(...this.a2c(300, 992));
      return { x: ft[0], top: top[1] - 30 * this.S, bot: ft[1], w: 140 * this.S, a: Math.sin(Math.PI * Math.min(1, o.fx.gather * 1.1)) }; }
    stepFx(dt) {
      const S = this.S;
      for (const p of this.parts) { p.t += dt;
        if (p.k === 'in') { p.x += (p.tx - p.x) * Math.min(1, dt * 5); p.y += (p.ty - p.y) * Math.min(1, dt * 5); }
        else if (p.k !== 'shock') { p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.k === 'tear') { p.vy += 420 * S * dt; if (p.y > p.gy) p.t = p.life; }
        if (p.k === 'petal') { p.vy += 160 * S * dt; p.vx *= .98; p.rot += dt * 4; }
        if (p.k === 'mote') { p.vx *= .96; p.vy *= .97; }
        if (p.k === 'dust') { p.vx *= .9; p.vy *= .9; } }
      this.parts = this.parts.filter(p => p.t < p.life);
    }
    /* 화면 좌표 캔버스(ctx, 배율 dpr)에 이펙트 그리기 */
    drawFx(g, dpr, col) {
      g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (col && col.a > 0) { const gr = g.createLinearGradient(col.x - col.w, 0, col.x + col.w, 0);
        gr.addColorStop(0, 'rgba(255,240,205,0)'); gr.addColorStop(.5, `rgba(255,240,205,${.4 * col.a})`); gr.addColorStop(1, 'rgba(255,240,205,0)');
        g.fillStyle = gr; g.fillRect(col.x - col.w, col.top, col.w * 2, col.bot - col.top); }
      const star = (x, y, r, a) => { g.save(); g.translate(x, y); g.globalAlpha = a; g.fillStyle = 'rgba(255,236,190,1)'; g.beginPath();
        for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .28 : r, q = i / 8 * Math.PI * 2; g.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); } g.closePath(); g.fill(); g.restore(); };
      const heart = (x, y, s, a) => { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a; g.fillStyle = '#f07c96'; g.beginPath(); g.moveTo(0, 6);
        g.bezierCurveTo(-12, -4, -6, -14, 0, -6); g.bezierCurveTo(6, -14, 12, -4, 0, 6); g.fill(); g.restore(); };
      const lw = Math.max(1, this.S * 2.4);
      for (const p of this.parts) { const k = p.t / p.life, a = Math.max(0, 1 - k);
        if (p.k === 'in' || p.k === 'mote') { g.globalCompositeOperation = 'lighter'; star(p.x, p.y, p.r * (p.k === 'in' ? 1 - k * .5 : 1), a * (p.k === 'in' ? Math.min(1, p.t * 6) : 1)); g.globalCompositeOperation = 'source-over'; continue; }
        if (p.k === 'heart') { heart(p.x, p.y, p.r / 9, a); continue; }
        if (p.k === 'petal') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = a; g.fillStyle = '#f6b9c6'; g.beginPath(); g.ellipse(0, 0, p.r, p.r * .55, 0, 0, 7); g.fill(); g.restore(); continue; }
        if (p.k === 'tear' || p.k === 'sweat') { g.globalAlpha = Math.min(1, a * (p.k === 'tear' ? 1.4 : 2)); g.fillStyle = p.k === 'tear' ? '#9fd3ff' : '#bfe6ff'; g.strokeStyle = p.k === 'tear' ? 'rgba(60,120,190,.8)' : '#5a8fbf'; g.lineWidth = lw * .7;
          const h = p.k === 'tear' ? 1.8 : 1.6; g.beginPath(); g.moveTo(p.x, p.y - p.r * h); g.quadraticCurveTo(p.x + p.r, p.y, p.x, p.y + p.r); g.quadraticCurveTo(p.x - p.r, p.y, p.x, p.y - p.r * h); g.fill(); g.stroke(); continue; }
        if (p.k === 'bub') { g.globalAlpha = a * .9; g.strokeStyle = '#8a7d9a'; g.fillStyle = 'rgba(255,255,255,.85)'; g.lineWidth = lw * .8; g.beginPath(); g.arc(p.x, p.y, p.r * (.6 + k * .6), 0, 7); g.fill(); g.stroke(); continue; }
        if (p.k === 'dust') { g.globalAlpha = a * .35; g.fillStyle = '#b9a796'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k), 0, 7); g.fill(); continue; }
        if (p.k === 'shock') { g.globalAlpha = a; g.strokeStyle = '#3a2f2a'; g.lineWidth = lw * 2; g.lineCap = 'round'; const s = (1 + .3 * Math.sin(k * Math.PI)) * p.r / 22;
          for (let i = 0; i < 3; i++) { const q = -1.2 + i * .45; g.beginPath(); g.moveTo(p.x + Math.cos(q) * 22 * s, p.y + Math.sin(q) * 22 * s); g.lineTo(p.x + Math.cos(q) * 48 * s, p.y + Math.sin(q) * 48 * s); g.stroke(); } } }
      g.restore();
    }
  }

  global.NicoleGuide = { load, create: img => new Guide(img), REF_K };
})(window);
