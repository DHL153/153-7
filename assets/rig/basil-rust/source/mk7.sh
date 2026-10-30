set -e
cd /tmp/claude-0/-home-claude/fc46b234-cd35-5738-9457-66cd3f0cdca0/scratchpad/brawl2
python3 - <<'PY'
s=open('../basil_work/rust/rig/rig.js',encoding='utf-8').read()
br=open('brawler4.js',encoding='utf-8').read()
def rep(a,b):
  global s
  assert s.count(a)==1,a; s=s.replace(a,b)
rep("  class RunAnimator {\n    constructor(rig, opts = {}) {\n      this.rig = rig;",br+"\n  class RunAnimator {\n    constructor(rig, opts = {}) {\n      if (rig.def.brawler) { this.rig = rig; Brawler.init(this, rig, opts); return }   // brawler(opt-in, 5·15 바실 v6)\n      this.rig = rig;")
rep('    attack(name = "thrust", opts = {}) {\n','    attack(name = "thrust", opts = {}) {\n      if (this.brawl) return Brawler.attack(this, name, opts);\n')
rep("    update(dt, s = {}) {\n","    update(dt, s = {}) {\n      if (this.brawl) return Brawler.update(this, dt, s);\n")
rep("        const op = this.alpha[name] ?? 1; if (op <= .003) continue; ctx.globalAlpha = op;",
    "        const op = this.alpha[name] ?? 1; if (op <= .003) continue;\n        const clip_ = this.def.hemClip && this.def.hemClip.includes(name); if (clip_) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (this._hemPath(ctx, base)) ctx.clip() }   // hemClip(opt-in, 바실 v6): 이 조각은 밑단 아래만\n        ctx.globalAlpha = op;")
rep("        else { set(ctx, M); ctx.drawImage(img, -part.pivot[0], -part.pivot[1]) }\n        ctx.globalAlpha = 1;\n",
    "        else { set(ctx, M); ctx.drawImage(img, -part.pivot[0], -part.pivot[1]) }\n        ctx.globalAlpha = 1; if (clip_) ctx.restore();\n")
rep("      this.hemProfile = this._profile(images.skirt);","      this.hemProfile = this.def.hemFull && images.skirt ? this.def.hemFull.map(([x, y]) => [x / images.skirt.width, x, y]) : this._profile(images.skirt);   // hemFull(opt-in, 바실 v8): 밑단을 1px 간격으로 — 찢어진 톱니 사이로도 다리가 보이고, 허리 옆으로 삐진 다리는 잘림")
rep("/*  CharacterRig + RunAnimator v4 — ","/*  CharacterRig + RunAnimator v4 (+ brawler 모드 v4 · hemClip 2026-10-25: rig.json 에 `brawler`/`hemClip` 이 있을 때만 — 5·15 바실) — ")
open('rig.js','w',encoding='utf-8').write(s)
PY
for k in rust neon; do python3 -I build7.py $k v11_$k/rig >/dev/null; python3 -I crumbs.py v11_$k/rig farG punchG punchSkin farUp nearG nearUp; python3 -I patch_holes.py v11_$k/rig ../basil_work/$k/art/ref512.png; cp rig.js v11_$k/rig/; mkdir -p v11_$k/art; cp ../basil_work/$k/art/ref512.png v11_$k/art/; done
cp ../brawl/harness.html .
