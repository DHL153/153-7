# where each of the kit's existing parts sits in art (ref512) pixel space at rest
import json,sys,math
import numpy as np
from PIL import Image
def placements(kit):
  d=json.load(open(f'{kit}/rig/rig.json'));B={b['name']:b for b in d['bones']};ox,oy=d['refOrigin']
  def world(n):
    b=B[n];x,y=b['pos'];a=b.get('rot',0)
    if b['parent']:
      px,py,pa=world(b['parent']);c,s=math.cos(pa),math.sin(pa);return px+c*x-s*y,py+s*x+c*y,pa+a
    return x,y,a
  out={}
  for n,b in B.items():
    if 'part' not in b:continue
    p=d['parts'][b['part']];wx,wy,wa=world(n);k=p.get('scale',1)
    out[n]=dict(part=b['part'],ax=(wx+ox)/2,ay=(wy+oy)/2,rot=wa,pivot=p['pivot'],k=k)
  return d,out
if __name__=='__main__':
  kit=sys.argv[1];d,P=placements(kit)
  for n,v in P.items():print(n,v['part'],'joint(art)=(%.1f,%.1f) rot=%.2f pivot=%s'%(v['ax'],v['ay'],v['rot'],v['pivot']),'topleft=(%.1f,%.1f)'%(v['ax']-v['pivot'][0],v['ay']-v['pivot'][1]))
