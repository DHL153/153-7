#!/usr/bin/env python3
"""적 리그 묶음(enemyNN_xxx/preview)을 전투 무대용으로 바꿔 mrstage/enemy/<키>/ 에 넣습니다.

사용:  python3 tools/enemy/build.py <묶음을 푼 폴더> [키 ...]
  <묶음을 푼 폴더> 안에 enemy01_claw_ghost/preview/index.html 처럼 들어 있어야 합니다.
하는 일 (미리보기 코드는 그대로 두고 겉만 바꿈):
  1. 그림 PNG → WebP
  2. 배경 칠하기를 투명으로, 설명 · 버튼 숨김, 캔버스를 창에 꽉 차게
  3. 불러도 바로 보이지 않고, 무대가 EN.play('enter')를 부를 때 나타나게
  4. 무대용 창구 window.EN = {ready, play, state, idle, fx, speed, rage, on, hide}
그다음 `node tools/enemy/measure.js` 로 크기 · 길이를 재서 mrstage/enemy/enemies.json 을 만듭니다.
"""
import sys, re, json, shutil, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'mrstage' / 'enemy'
EMBED_CSS = ("<style id=\"lm-embed\">html,body{margin:0!important;background:transparent!important;overflow:hidden!important}"
             ".wrap{max-width:none!important;padding:0!important;margin:0!important}.wrap>*:not(.stage){display:none!important}"
             ".stage{border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important}"
             "canvas{display:block;width:100vw!important;height:100vh!important}</style>")
SHIM = """
<script>/* 무대용 창구 (tools/enemy/build.py 가 붙임) */
(function(){var w=window;function ok(){return !!(w.__ready&&w.QA)}
w.EN={ready:ok,
 play:function(s){if(!ok())return false;w.__vis=1;try{w.QA.play(s);}catch(e){return false;}return true;},
 state:function(){try{if(!ok())return '';return w.QA.state?w.QA.state():(w.QA.anim&&w.QA.anim.state)||'';}catch(e){return '';}},
 rage:function(v){try{w.QA.rage&&w.QA.rage(!!v);}catch(e){}},
 idle:function(){return this.state()==='idle';},
 hide:function(){w.__vis=0;},
 on:function(f){w.__onEv=typeof f==='function'?f:null;},   // 동작 중 사건(hit · shoot · slam …)을 무대에 알림
 fx:function(v){try{w.QA.fx(!!v);}catch(e){}},
 speed:function(v){w.__spd=Math.max(.25,Math.min(4,+v||1));}};
try{parent&&parent!==w&&parent.postMessage({lmEnemy:'loaded'},'*');}catch(e){}})();
</script>"""

def replace_bg(src):
    i = src.find('const bg=()=>{')
    if i < 0: raise SystemExit('bg() 를 찾지 못함')
    j = i + len('const bg=()=>'); depth = 0
    while True:
        ch = src[j]
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: break
        j += 1
    return src[:i] + 'const bg=()=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,g.canvas.width,g.canvas.height)}' + src[j+1:]

def build(pkg):
    name = pkg.name; m = re.match(r'enemy(\d+)_(.+)', name)
    if not m: return None
    key = 'e%02d' % int(m.group(1)); pv = pkg / 'preview'; dst = OUT / key
    if dst.exists(): shutil.rmtree(dst)
    (dst / 'img').mkdir(parents=True)
    for f in sorted((pv / 'img').iterdir()):
        if f.suffix.lower() == '.png':
            Image.open(f).convert('RGBA').save(dst / 'img' / (f.stem + '.webp'), quality=92, method=6, exact=True)
        else: shutil.copy(f, dst / 'img' / f.name)
    for f in pv.glob('*.js'):
        s = f.read_text(encoding='utf-8')
        (dst / f.name).write_text(re.sub(r"(img/[A-Za-z0-9_\-]+)\.png", r"\1.webp", s), encoding='utf-8')
    s = (pv / 'index.html').read_text(encoding='utf-8')
    s = replace_bg(s)
    a = 'if(QA.manual)return;'
    if s.count(a) != 1: raise SystemExit(f'{name}: frame() 모양이 다름')
    s = s.replace(a, a + "if(!window.__vis){g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,g.canvas.width,g.canvas.height);last=t;return}")
    b = 'const dt=Math.min(.05,(t-last)/1000)*(slow?.25:1);last=t;step(dt);draw(t)'
    if s.count(b) != 1: raise SystemExit(f'{name}: 시간 계산 모양이 다름')
    # 느린 기기에서도 실제 시간과 맞게: 밀린 시간은 0.05초씩 나눠 따라잡고 한 번만 그림 (예전: 0.05초로 잘라 느린 화면이 됨)
    s = s.replace(b, 'let __r=Math.min(.4,(t-last)/1000)*(slow?.25:1)*(window.__spd||1);last=t;do{const dt=Math.min(.05,__r);step(dt);__r-=dt}while(__r>1e-4);draw(t)')
    u = 'OUT=an.update(dt);'
    if s.count(u) != 1: raise SystemExit(f'{name}: update() 모양이 다름')
    s = s.replace(u, u + 'if(window.__onEv&&an.events&&an.events.length){for(const __e of an.events){try{window.__onEv(__e,an.state)}catch(_){}}}')
    s = s.replace("'.png'", "'.webp'"); s = re.sub(r"(img/[A-Za-z0-9_\-]+)\.png", r"\1.webp", s)
    title = re.search(r'<title>(.*?)</title>', s); title = title.group(1) if title else name
    s = '<!doctype html>\n' + s.replace('</style>', '</style>' + EMBED_CSS, 1) + SHIM
    (dst / 'index.html').write_text(s, encoding='utf-8')
    return {'key': key, 'slug': m.group(2), 'title': title}

if __name__ == '__main__':
    src = pathlib.Path(sys.argv[1]); only = set(sys.argv[2:])
    built = []
    for pkg in sorted(src.iterdir()):
        if not (pkg / 'preview' / 'index.html').exists(): continue
        r = build(pkg)
        if r and (not only or r['key'] in only): built.append(r); print(r['key'], r['slug'], r['title'])
    (OUT / '_built.json').write_text(json.dumps(built, ensure_ascii=False, indent=1), encoding='utf-8')
