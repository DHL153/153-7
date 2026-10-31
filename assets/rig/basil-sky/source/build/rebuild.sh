set -e
cd /tmp/claude-0/-home-claude/9592899e-2689-533b-aaec-340a00cb4832/scratchpad/skybuild
python3 build_kit.py >/dev/null
cd source && python3 -I build7.py sky ../out_sky/rig && python3 -I crumbs.py ../out_sky/rig farG punchG punchSkin farUp nearG nearUp >/dev/null; python3 -I patch_holes.py ../out_sky/rig ../basil_work/sky/art/ref512.png >/dev/null; python3 -I fill_under.py ../out_sky/rig ../basil_work/sky ../brawl/out_sky
cd ../.. && rm -rf pv/sky/parts && cp -r skybuild/out_sky/rig/parts pv/sky/ && cp skybuild/out_sky/rig/rig.def.js pv/sky/ && python3 pv_shots.py pvout 2>&1|tail -1
python3 -c "
from PIL import Image
ims=[Image.open(f'pvout/walk_{i:02d}.png').crop((1380,450,1900,760)) for i in (1,3,5,7)]
S=Image.new('RGB',(520*4,310));[S.paste(im,(i*520,0)) for i,im in enumerate(ims)];S.save('pvout/wz.png')"
