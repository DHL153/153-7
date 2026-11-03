# face parts v3: only the drawn FEATURES change (eyes, brows, lashes, mouth, tears).
# skin and blush always come from the master: each patch = redraw features over a "faceless" master skin,
# and its edge lies on plain master skin, so no seam, no blush jump. Master hair and face outline are never touched.
import cv2,numpy as np,json
M=cv2.imread('k_idle.png',-1);Mc=M[...,:3];H,W=M.shape[:2]
hull=np.load('face_hull.npy');inner=cv2.erode(hull,np.ones((9,9),np.uint8))>0
def hsv(i):return cv2.cvtColor(i,cv2.COLOR_BGR2HSV).astype(int)
def skinlike(i):
  h=hsv(i);return (h[...,0]<=24)&(h[...,1]>=25)&(h[...,1]<=150)&(h[...,2]>=165)
def hairm(i):
  h=hsv(i);return (h[...,0]<=24)&(h[...,1]>40)&(h[...,2]>=60)&(h[...,2]<165)
inner=cv2.erode(hull,np.ones((5,5),np.uint8))>0
hm=hairm(Mc).astype(np.uint8);n_,cc,st,cen=cv2.connectedComponentsWithStats(hm)
eyesE=np.zeros((H,W),np.uint8);cv2.ellipse(eyesE,(282,235),(44,47),0,0,360,1,-1);cv2.ellipse(eyesE,(386,231),(35,45),0,0,360,1,-1)
browZ=np.zeros((H,W),np.uint8);cv2.rectangle(browZ,(366,156),(424,196),1,-1)
mouthZ=np.zeros((H,W),np.uint8);cv2.rectangle(mouthZ,(285,276),(375,315),1,-1)
keep=[k for k in range(1,n_) if st[k,4]>=40 and not eyesE[int(cen[k][1]),int(cen[k][0])] and not browZ[int(cen[k][1]),int(cen[k][0])] and not mouthZ[int(cen[k][1]),int(cen[k][0])]]
Mh=cv2.dilate(np.isin(cc,keep).astype(np.uint8),np.ones((3,3),np.uint8))>0   # real hair only: the brow and the irises are features
# the hair strands' own dark outlines are hair too (otherwise the face patch cuts into the strand edge = dented cheek)
_v=cv2.cvtColor(Mc,cv2.COLOR_BGR2HSV)[...,2]
_ol=(_v<100)&(cv2.dilate(Mh.astype(np.uint8),np.ones((9,9),np.uint8))>0)
_eyeCore=np.zeros((H,W),np.uint8);cv2.ellipse(_eyeCore,(282,235),(40,44),0,0,360,1,-1);cv2.ellipse(_eyeCore,(382,231),(27,42),0,0,360,1,-1)
Mh=Mh|(_ol&~(_eyeCore>0))
brow=np.zeros((H,W),np.uint8)
nb=np.zeros((H,W),bool);nb[262:290,344:376]=True
_hv=cv2.cvtColor(Mc,cv2.COLOR_BGR2HSV).astype(int)
nose=nb&((_hv[...,2]<150)|((_hv[...,1]>60)&(_hv[...,2]<200)))     # the nose stroke and its shadow only
nose=cv2.dilate(nose.astype(np.uint8),np.ones((5,5),np.uint8))>0
def features(i):
  f=(~skinlike(i))&(inner|((eyesE>0)&(hull>0)))&~nose&~Mh
  f=cv2.morphologyEx(f.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
  n,cc,st,_=cv2.connectedComponentsWithStats(f);return np.isin(cc,[k for k in range(1,n) if st[k,4]>=12])
def fill(m):
  m=m.astype(np.uint8);ff=m.copy();cv2.floodFill(ff,np.zeros((H+2,W+2),np.uint8),(0,0),1);return (m|(1-ff))>0
FM=features(Mc);FMf=fill(cv2.dilate(FM.astype(np.uint8),np.ones((3,3),np.uint8)))
# faceless skin: every master feature painted out with a smooth average of nearby plain skin (hair never leaks in)
hole=fill(cv2.dilate(FM.astype(np.uint8),np.ones((7,7),np.uint8)))&hull.astype(bool)&~Mh
known=(skinlike(Mc)&~cv2.dilate(hole.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)&(hull>0)).astype(np.float32)
sm=np.zeros(Mc.shape,np.float32);done=np.zeros(known.shape,bool)
for sg in [5,10,20,40,80]:      # multi-scale normalised fill: the finest scale that has enough nearby skin
  num=cv2.GaussianBlur(Mc.astype(np.float32)*known[...,None],(0,0),sg);den=cv2.GaussianBlur(known,(0,0),sg)
  ok=(den>.25)&~done;sm[ok]=num[ok]/den[ok][...,None];done|=ok
sm[~done]=np.median(Mc[known>0],0)
sm=cv2.GaussianBlur(sm,(0,0),3)
hf=cv2.GaussianBlur(hole.astype(np.float32),(0,0),1.5);hf=np.maximum(hf,hole.astype(np.float32))[...,None]
# harmonic fill: matches the surrounding skin exactly at the edge (no visible disk), done at half size for smoothness
hm_=cv2.dilate(hole.astype(np.uint8),np.ones((5,5),np.uint8))
# diffusion fill from plain master skin only (hair, lashes and lines are never sources)
kn=(skinlike(Mc)&(hm_==0)&(hull>0)).astype(np.float32)
img_=Mc.astype(np.float32)*kn[...,None];msk=kn.copy()
cur=img_.copy();w_=msk.copy()
for it in range(6):     # coarse-to-fine normalised blurs give a smooth membrane
  sg=[24,16,10,6,4,2][it]
  num=cv2.GaussianBlur(img_,(0,0),sg);den=cv2.GaussianBlur(msk,(0,0),sg)[...,None]
  est=num/np.maximum(den,1e-4)
  if it==0:fs_=est
  else:
    a_=np.clip(den*3,0,1);fs_=fs_*(1-a_)+est*a_
fs_=np.where(kn[...,None]>0,Mc.astype(np.float32),fs_)
fs_=cv2.GaussianBlur(fs_,(0,0),1.5)
hf=cv2.GaussianBlur(hm_.astype(np.float32),(0,0),2.0);hf=np.maximum(hf,hole.astype(np.float32))[...,None]
fl=(Mc.astype(np.float32)*(1-hf)+fs_*hf).clip(0,255).astype(np.uint8)
cv2.imwrite('faceless.png',fl)
def featuresR(F,zone_inner):
  d=np.abs(F.astype(int)-fl.astype(int)).max(2)>30
  Fi=F.astype(int);hh=hsv(F);blush=(Fi[...,2]>Fi[...,1]+22)&(hh[...,2]>150)&(hh[...,1]>25)&(np.mgrid[0:H,0:W][0]<276)
  f=d&zone_inner&~Mh&~nose&~blush
  f=cv2.morphologyEx(f.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
  n,cc,st,_=cv2.connectedComponentsWithStats(f);f=np.isin(cc,[k for k in range(1,n) if st[k,4]>=12])
  return fill(cv2.morphologyEx(f.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((3,3),np.uint8)))&zone_inner&~Mh
inner1=(cv2.erode(hull,np.ones((3,3),np.uint8))>0)|(browZ>0)|((eyesE>0)&(hull>0))
names=['blink','half','talk','laugh','surprise','sad','sadclosed','sadtalk','cry','worried','think','content']
YS=279;x0,y0,x1,y1=196,150,452,352;info={'box':[x0,y0,x1-x0,y1-y0],'eyes':[],'mouth':[]}
Y=np.mgrid[0:H,0:W][0]
for n in names:
  F=cv2.imread(f'f2_{n}.png');FR=featuresR(F,inner1)
  FR&=~(cv2.dilate(nose.astype(np.uint8),np.ones((15,15),np.uint8))>0)   # the redraw's own nose never comes in
  changed=(np.abs(F.astype(int)-Mc.astype(int)).max(2)>18)
  # zones by component: a feature that is the same as the master's stays the master's
  for zone,sel in [('eyes',Y<YS),('mouth',Y>=YS)]:
    fr=FR&sel;fm=FM&sel
    if not (fr&cv2.dilate(changed.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)).any() and not (fm&changed).any():continue
    reg=cv2.dilate((fr|fm).astype(np.uint8),np.ones((9,9),np.uint8))>0
    reg|=(fill(cv2.dilate((fr|fm).astype(np.uint8),np.ones((3,3),np.uint8)))&sel);reg=cv2.dilate(reg.astype(np.uint8),np.ones((5,5),np.uint8))>0;reg&=inner&~Mh&sel
    if reg.sum()<40:continue
    # soft feature alpha inside the region: redraw features over faceless skin
    fa=cv2.GaussianBlur(cv2.dilate(fr.astype(np.uint8),np.ones((3,3),np.uint8)).astype(np.float32),(0,0),.8)
    # where the master had a feature that is gone now, use the redraw's own painted skin there, tone-matched to the
    # master with a smooth per-pixel gain (measured on skin both share), so no flat 'patch' disk shows
    Ff=F.astype(np.float32);both=(skinlike(F)&skinlike(Mc)&~cv2.dilate((FR|FM).astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)&(hull>0)).astype(np.float32)
    nm=cv2.GaussianBlur(Mc.astype(np.float32)*both[...,None],(0,0),7);nf=cv2.GaussianBlur(Ff*both[...,None],(0,0),7);dd=cv2.GaussianBlur(both,(0,0),7)[...,None]
    gain=np.where(dd>.05,(nm+1)/(nf+1),1.0);gain=np.clip(gain,.85,1.18)
    Fs=np.clip(Ff*gain,0,255)
    Fi_=F.astype(int);pinkR=(Fi_[...,2]-Fi_[...,1])>(Mc.astype(int)[...,2]-Mc.astype(int)[...,1])+8   # redraw blush: keep the master's
    sk_ok=skinlike(F)&hole&~FR&~cv2.dilate(pinkR.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)
    under=np.where(sk_ok[...,None],Fs,fl.astype(np.float32))
    # inside the old eye area use the redraw's own (tone-matched) skin; fade to the master's skin over ~8 px of plain skin
    hole2=cv2.dilate(hole.astype(np.uint8),np.ones((9,9),np.uint8))>0
    zone_=(hole2&skinlike(F)&~FR&~cv2.dilate(pinkR.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool))|sk_ok
    hf=cv2.GaussianBlur(cv2.erode(zone_.astype(np.uint8),np.ones((3,3),np.uint8)).astype(np.float32),(0,0),3.0)
    hf=np.maximum(hf,sk_ok.astype(np.float32)*.0)[...,None]
    base_=np.where(hole[...,None],fl.astype(np.float32),Mc.astype(np.float32))
    # keep the master's smooth skin tone; borrow only the redraw's fine shading (eyelid crease etc.)
    detail=Fs-cv2.GaussianBlur(Fs,(0,0),5)
    under=base_+detail*hf
    col=F.astype(np.float32)*fa[...,None]+under*(1-fa[...,None])
    a=cv2.GaussianBlur(reg.astype(np.float32),(0,0),2.0)*reg+cv2.GaussianBlur(reg.astype(np.float32),(0,0),2.0)*(~reg)*0
    a=np.clip(cv2.GaussianBlur(reg.astype(np.float32),(0,0),1.6)*1.6,0,1)*(inner1&~Mh)
    # do not let the soft edge cross into the other zone
    a*=np.clip((YS+2-Y)/4,0,1) if zone=='eyes' else np.clip((Y-(YS-2))/4,0,1)
    a*=1-cv2.GaussianBlur(cv2.dilate(nose.astype(np.uint8),np.ones((5,5),np.uint8)).astype(np.float32),(0,0),1.2)   # the nose is always the master's
    # never touch the master's face outline or any hair: protect every dark line / hair pixel outside the feature zones
    _V=cv2.cvtColor(Mc,cv2.COLOR_BGR2HSV)[...,2]
    browL=np.zeros((H,W),bool);browL[176:206,250:330]=True
    featZ=(cv2.dilate(eyesE,np.ones((3,3),np.uint8))>0)|(browZ>0)|browL|(mouthZ>0)
    prot=(((_V<125)&~featZ)|(Mh&~featZ)|(hull==0))
    # the long outline where the face meets the right hair strand is always the master's (it runs through the eye zone)
    dk=((_V<125)|Mh).astype(np.uint8);dk[:150]=0;dk[330:]=0;dk[:,:392]=0;dk[cv2.dilate(browZ,np.ones((7,7),np.uint8))>0]=0;dk[browL]=0
    nn,cc2,st2,_=cv2.connectedComponentsWithStats(dk)
    edge=np.isin(cc2,[k for k in range(1,nn) if st2[k,3]>60])
    prot=prot|edge
    prot=cv2.dilate(prot.astype(np.uint8),np.ones((5,5),np.uint8)).astype(np.float32)
    a=a*(1-cv2.GaussianBlur(prot,(0,0),1.0))
    rgba=np.dstack([col,a*255])[y0:y1,x0:x1].clip(0,255).astype(np.uint8);rgba[rgba[...,3]==0,:3]=0
    cv2.imwrite(f'rig2/img/{zone}_{n}.png',rgba);info[zone].append(n)
json.dump(info,open('rig2/faces.json','w'));print(info)
