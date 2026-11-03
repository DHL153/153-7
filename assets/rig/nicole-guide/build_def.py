"""니콜 안내 NPC — 게임용 데이터 다시 만들기.
preview/(frames.json · faces.json · w.js · img/*.png) → mrstage/assets/rig/nicole-guide/guide.def.js
그림은 무손실 WebP data URI로 담음(WebGL 텍스처가 file:// 에서도 막히지 않게).
실행: python3 assets/rig/nicole-guide/build_def.py  (저장소 맨 위에서)
만든 뒤 index.html 의 guide.def.js?v= 값을 출력된 v로 바꿀 것."""
import json, io, base64, hashlib, re, os
from PIL import Image
P = 'assets/rig/nicole-guide/preview'
frames = json.load(open(P + '/frames.json')); faces = json.load(open(P + '/faces.json'))
W = json.loads(re.match(r'\s*window\.NICOLE_W\s*=\s*(\{.*\})\s*;?\s*$', open(P + '/w.js').read(), re.S).group(1))
names = ['base'] + ['arms_' + n for n in frames] + [z + '_' + n for z in ('eyes', 'mouth') for n in faces[z]]
img = {}
for n in names:
    b = io.BytesIO(); Image.open(f'{P}/img/{n}.png').save(b, 'WEBP', lossless=True, method=6)
    img[n] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
d = {'id': 'nicole-guide', 'frames': frames, 'faces': faces, 'weights': W, 'img': img}
d['v'] = hashlib.sha1(json.dumps(d, separators=(',', ':')).encode()).hexdigest()[:8]
os.makedirs('mrstage/assets/rig/nicole-guide', exist_ok=True)
open('mrstage/assets/rig/nicole-guide/guide.def.js', 'w').write(
    '/* 니콜 안내 NPC — 리그 데이터(팔 그림 12 · 표정 24 · 몸 1 · 메시 가중치). 원본: assets/rig/nicole-guide/preview · 다시 만들기: assets/rig/nicole-guide/build_def.py */\n'
    'window.NICOLE_GUIDE_DEF=' + json.dumps(d, separators=(',', ':')) + ';\n')
print('v =', d['v'])
