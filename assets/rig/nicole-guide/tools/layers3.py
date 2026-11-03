# frame-based arms: for every drawing, the exact pixels that differ from the armless base (arms, sleeves,
# hands, the shadows they cast on the dress). base + layer == the drawing.
import cv2,numpy as np,json,sys
B=cv2.imread('rig2/img/base.png',-1).astype(np.float32);H,W=B.shape[:2]
MK=np.load('masks.npy',allow_pickle=True).item()
pm=lambda i:np.dstack([i[...,:3]*i[...,3:]/255.,i[...,3:]])
hull=np.load('face_hull.npy')>0
names=sys.argv[1].split(',') if len(sys.argv)>1 else ['idle','guide','wave','happy','sad']
info=json.load(open('rig2/frames.json')) if len(sys.argv)>1 else {}
for p in names:
  D=cv2.imread(f'k_{p}.png',-1).astype(np.float32)
  # tone-match the whole drawing to the master (each redraw comes a shade lighter/darker): skin and dress separately
  M0=cv2.imread('k_idle.png',-1).astype(np.float32);Mh_=cv2.cvtColor(M0[...,:3].astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int);Dh_=cv2.cvtColor(D[...,:3].astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int)
  same=(np.abs(D[...,:3]-M0[...,:3]).max(2)<40)&(D[...,3]>250)&(M0[...,3]>250);same[:345]=False
  for cls in [lambda h:(h[...,0]<=22)&(h[...,1]>=45)&(h[...,2]>=150), lambda h:(h[...,1]<45)&(h[...,2]>=170)]:
    m=same&cls(Mh_)&cls(Dh_)
    if m.sum()>200:
      g=np.median(M0[...,:3][m],0)/np.maximum(np.median(D[...,:3][m],0),1);sel=cls(Dh_)&(D[...,3]>0)
      D[...,:3][sel]=np.clip(D[...,:3][sel]*g,0,255)
  d=np.abs(pm(D)-pm(B)).max(2)
  hs=cv2.cvtColor(D[...,:3].astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int)
  hair=(hs[...,1]>40)&(hs[...,2]<185)&(hs[...,2]>=60)&(hs[...,0]<=24)&~((hs[...,1]>=45)&(hs[...,2]>=150))
  arm=np.zeros((H,W),bool)
  for a in ['near','far']:
    if f'{p}_{a}' in MK:arm|=MK[f'{p}_{a}']
  if not arm.any():   # in-between drawing: its arm = skin that is not on the base, outside the face
    sk=(hs[...,0]<=22)&(hs[...,1]>=45)&(hs[...,2]>=120);arm=sk&(d>25)&~hull;arm[:280]=False
    arm=cv2.morphologyEx(arm.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))>0
  near=cv2.dilate(arm.astype(np.uint8),np.ones((41,41),np.uint8))>0
  R=(d>12)&(near|(np.mgrid[0:H,0:W][0]>330))
  R&=~(hair&~cv2.dilate(arm.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool))
  R[:300]=False;R&=~hull
  # neck and collar: always the base's, except the hands themselves (a skin blob that reaches down to the arms)
  neckZ=np.zeros((H,W),bool);neckZ[330:395,245:375]=True
  sk_=((hs[...,0]<=22)&(hs[...,1]>=45)&(hs[...,2]>=120)&(D[...,3]>200)&~hull).astype(np.uint8)
  sk_[:330]=0
  nn,ccc,stt,_=cv2.connectedComponentsWithStats(sk_)
  armc=np.isin(ccc,[k for k in range(1,nn) if stt[k,1]+stt[k,3]>430 and stt[k,4]>400 and stt[k,1]<400])
  armc=cv2.dilate((armc&(np.mgrid[0:H,0:W][0]>=330)).astype(np.uint8),np.ones((5,5),np.uint8))>0
  neckSkinBase=cv2.cvtColor(B[...,:3].astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int)
  R&=~(neckZ&~armc)
  # never carry hair: hair-coloured pixels of the drawing stay out; dark outline pixels stay only if they border
  # the arm itself (skin, sleeve, hand) and not just hair. Above the neck only hand skin and its outline.
  V=hs[...,2];S_=hs[...,1];H_=hs[...,0]
  hairD=(H_<=24)&(S_>40)&(V>=60)&(V<165)&~((S_>=45)&(V>=150))
  light=(V>=150)&~hairD&(D[...,3]>200)
  # the near puff sleeve and upper arm are always drawn from the drawing (the base under them is never shown)
  SLVn=np.zeros((H,W),np.uint8);cv2.fillPoly(SLVn,[np.int32([(150,395),(200,388),(258,400),(262,512),(184,512),(150,480)])],1)
  R=(R|((SLVn>0)&(D[...,3]>200))).astype(np.uint8)
  core=((H_<=22)&(S_>=45)&(V>=150)&(R>0))|((SLVn>0)&(D[...,3]>200))
  nearArm=cv2.dilate(core.astype(np.uint8),np.ones((37,37),np.uint8))>0
  R&=~(hairD&~nearArm)       # hair right next to the arm comes with it (it does not sway there); hair farther away is the base's
  dark=(V<110)&~(hairD&nearArm)
  R&=~(dark&~(cv2.dilate((light&R).astype(np.uint8),np.ones((7,7),np.uint8))>0))
  skinA=(H_<=22)&(S_>=45)&(V>=120)
  up=np.zeros((H,W),bool);up[:350]=True
  R&=~(up&~(skinA|(dark&(cv2.dilate((skinA&R&up).astype(np.uint8),np.ones((5,5),np.uint8))>0))))
  R=R|((d>20)&(cv2.dilate(arm.astype(np.uint8),np.ones((15,15),np.uint8))>0)&(S_<40)&(D[...,3]>200)&~hull)   # grey things the hands shade (pendant, collar)
  R=cv2.morphologyEx(R.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
  R=cv2.morphologyEx(R,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
  n,cc,st,_=cv2.connectedComponentsWithStats(R);R=np.isin(cc,[k for k in range(1,n) if st[k,4]>40]).astype(np.uint8)
  R=cv2.dilate(R,np.ones((5,5),np.uint8))
  soft=cv2.GaussianBlur(R.astype(np.float32),(0,0),1.2);soft=np.where(cv2.erode(R,np.ones((3,3),np.uint8))>0,1.0,soft)
  a=soft*D[...,3]/255.
  # where the drawing is transparent but the base is not (rare), the layer cannot erase: report it
  hole=int(((D[...,3]<30)&(B[...,3]>200)&(R>0)).sum())
  ys,xs=np.where(a>0.01);x0,y0,x1,y1=xs.min()-2,ys.min()-2,xs.max()+3,ys.max()+3
  out=np.dstack([D[...,:3],a*255])[y0:y1,x0:x1].clip(0,255).astype(np.uint8);out[out[...,3]==0,:3]=0
  cv2.imwrite(f'rig2/img/arms_{p}.png',out);info[p]=[int(x0),int(y0),int(x1-x0),int(y1-y0)]
  # check: base + layer vs drawing
  lay=np.zeros_like(B);lay[y0:y1,x0:x1]=out;la=lay[...,3:]/255.
  comp=np.dstack([B[...,:3]*(1-la)+lay[...,:3]*la,np.maximum(B[...,3:],lay[...,3:])])
  err=np.abs(pm(comp)-pm(D)).max(2);err[:345]=0
  print(p,'box',info[p],'pixels off >40:',int((err>40).sum()),'holes',hole)
json.dump(info,open('rig2/frames.json','w'))
