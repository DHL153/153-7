# rest-pose composite of all visible idle layers vs the art: where the art is opaque but the rig shows background (holes)
import sys,json,numpy as np
from PIL import Image
H='/tmp/claude-0/-home-claude/fc46b234-cd35-5738-9457-66cd3f0cdca0/scratchpad/'
kit,c=sys.argv[1],sys.argv[2];rig=json.load(open(H+f'brawl2/{kit}/rig/rig.json'));O=rig['refOrigin'];by={b['name']:b for b in rig['bones']}
def world(n):
  b=by[n];x,y=b['pos']
  while b['parent']:b=by[b['parent']];x+=b['pos'][0];y+=b['pos'][1]
  return x,y
hide=set(rig.get('hidden',[]))|{'walkF','walkN'}
can=Image.new('RGBA',(512,512),(0,0,0,0))
for n in rig['draw']:
  if n in hide or n not in by or 'part' not in by[n]:continue
  p=rig['parts'][by[n]['part']];im=Image.open(H+f'brawl2/{kit}/rig/'+p['src']).convert('RGBA');wx,wy=world(n)
  can.alpha_composite(im,(int(round((wx+O[0])/2-p['pivot'][0])),int(round((wy+O[1])/2-p['pivot'][1]))))
  if n=='head':
    f=rig['faces'].get('happy') or list(rig['faces'].values())[0]
a=np.array(can);R=np.array(Image.open(H+f'basil_work/{c}/art/ref512.png').convert('RGBA'))
holes=(R[...,3]>200)&(a[...,3]<100);extra=(R[...,3]<20)&(a[...,3]>120)
print(kit,'holes',int(holes.sum()),'extra',int(extra.sum()))
v=np.zeros((512,512,4),np.uint8);v[...]=(43,58,90,255);al=a[...,3:4]/255.;v[...,:3]=(a[...,:3]*al+v[...,:3]*(1-al)).astype(np.uint8)
v[holes]=(255,0,255,255);v[extra]=(0,255,0,255)
Image.fromarray(v).resize((1024,1024),Image.NEAREST).save(H+f'bfix/holes_{c}.png')
ys,xs=np.where(holes);print('hole bbox',xs.min() if len(xs) else '-',xs.max() if len(xs) else '-',ys.min() if len(ys) else '-',ys.max() if len(ys) else '-')
