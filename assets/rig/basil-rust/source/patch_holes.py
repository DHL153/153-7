# post-build: every art pixel that no idle layer draws (segmentation gaps) is given to the top-most neighbouring layer.
# usage: python3 -I patch_holes.py RIG_DIR ART_PNG
import sys,json,numpy as np,cv2
from PIL import Image
rd,artp=sys.argv[1],sys.argv[2];rig=json.load(open(rd+'/rig.json'));O=rig['refOrigin'];by={b['name']:b for b in rig['bones']}
def world(n):
  b=by[n];x,y=b['pos']
  while b['parent']:b=by[b['parent']];x+=b['pos'][0];y+=b['pos'][1]
  return x,y
hide=set(rig.get('hidden',[]))|{'walkF','walkN'}
R=np.array(Image.open(artp).convert('RGBA'));lay=[]
for n in rig['draw']:
  if n in hide or n not in by or 'part' not in by[n] or by[n].get('rot'):continue
  pn=by[n]['part'];p=rig['parts'][pn];im=np.array(Image.open(rd+'/'+p['src']).convert('RGBA'));wx,wy=world(n)
  x0=int(round((wx+O[0])/2-p['pivot'][0]));y0=int(round((wy+O[1])/2-p['pivot'][1]));lay.append([n,pn,im,x0,y0])
def full(L):
  n,pn,im,x0,y0=L;F=np.zeros((512,512),np.uint8);h,w=im.shape[:2];ys,xs=max(0,y0),max(0,x0);ye,xe=min(512,y0+h),min(512,x0+w)
  F[ys:ye,xs:xe]=im[ys-y0:ye-y0,xs-x0:xe-x0,3];return F
cov=np.zeros((512,512),np.uint8)
for L in lay:cov=np.maximum(cov,full(L))
holes=(R[...,3]>200)&(cov<100);print(rd,'holes',int(holes.sum()))
if holes.any():
  owner=np.full((512,512),-1);K=np.ones((5,5),np.uint8)
  HEADS={'head','pony','headB'}
  for heads_ok in (False,True):                    # body layers first (the head must not take back the arm's ink), then the head for what is left
    for i,L in enumerate(lay):                     # later (top-most) layers win
      if (L[0] in HEADS)!=heads_ok:continue
      near=cv2.dilate((full(L)>128).astype(np.uint8),K)>0;owner[holes&near&((owner<0)|(not heads_ok))]=i if True else owner
  for i,L in enumerate(lay):
    sel=holes&(owner==i)
    if not sel.any():continue
    n,pn,im,x0,y0=L;ys,xs=np.where(sel);h,w=im.shape[:2]
    # grow the part canvas if a hole pixel falls outside it
    px0,py0=min(0,xs.min()-x0),min(0,ys.min()-y0);px1,py1=max(w,xs.max()-x0+1),max(h,ys.max()-y0+1)
    if px0<0 or py0<0 or px1>w or py1>h:
      big=np.zeros((py1-py0,px1-px0,4),np.uint8);big[-py0:-py0+h,-px0:-px0+w]=im;im=big;x0+=px0;y0+=py0
      rig['parts'][pn]['pivot']=[rig['parts'][pn]['pivot'][0]-px0,rig['parts'][pn]['pivot'][1]-py0]
    im[ys-y0,xs-x0]=R[ys,xs];im[ys-y0,xs-x0,3]=255;Image.fromarray(im).save(rd+'/'+rig['parts'][pn]['src']);print('  ->',pn,len(ys))
  json.dump(rig,open(rd+'/rig.json','w'),ensure_ascii=False,indent=1)
  open(rd+'/rig.def.js','w').write("// 자동 생성: rig.json을 JS로 감싼 것 (brawl2/build7.py + patch_holes.py)\nwindow.MR_RIG_DEFS=window.MR_RIG_DEFS||{};window.MR_RIG_DEFS['%s']=%s;\n"%(rig['name'],json.dumps(rig,ensure_ascii=False)))
