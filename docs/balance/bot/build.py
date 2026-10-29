"""index.html의 게임 코어 스크립트(규칙 · 점수 · 목표 · 맞춤)를 뽑아 sim_body.js와 합쳐 sim.js를 만듭니다.
사용: python3 build.py [../../../index.html]  →  같은 폴더에 sim.js 생성"""
import re, sys, pathlib
here = pathlib.Path(__file__).resolve().parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here.parents[2] / 'index.html'
html = src.read_text(encoding='utf-8')
blocks = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', html, re.S)
core = [b for b in blocks if 'function score(' in b and 'function handType' in b]
if len(core) != 1:
    sys.exit(f'코어 스크립트를 하나로 찾지 못했어요 (찾은 수: {len(core)}) — index.html 구조가 바뀌었는지 확인하세요')
(here / 'sim.js').write_text(core[0] + '\n' + (here / 'sim_body.js').read_text(encoding='utf-8'), encoding='utf-8')
print('sim.js 생성 완료 —', src)
