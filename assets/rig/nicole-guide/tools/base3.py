# repair the near-shoulder region of the armless base: S1 hair/dress, the strip where S1 drew an arm behind the back
# is filled from drawings where that spot is visible (happy, sad), the rest painted from neighbours (never seen)
import cv2,numpy as np
B=cv2.imread('rig2/img/base.png',-1);S1=cv2.imread('k_body.png',-1);H,W=B.shape[:2]
MK=np.load('masks.npy',allow_pickle=True).item()
def poly(pts):m=np.zeros((H,W),np.uint8);cv2.fillPoly(m,[np.int32(pts)],1);return m>0
hs=lambda i:cv2.cvtColor(i[...,:3],cv2.COLOR_BGR2HSV).astype(int)
h=hs(S1);skin=(h[...,0]<=22)&(h[...,1]>=50)&(h[...,2]>=150)
zone=poly([(150,375),(268,375),(268,600),(150,600)])
strip=cv2.dilate((skin&zone).astype(np.uint8),np.ones((9,9),np.uint8))>0
strip|=(cv2.dilate(strip.astype(np.uint8),np.ones((7,7),np.uint8))>0)&(h[...,2]<110)&zone
strip&=zone
out=B.copy();out[zone]=S1[zone]
got=np.zeros((H,W),bool)
SLVn=poly([(150,395),(200,388),(258,400),(262,512),(184,512),(150,480)])
CL={'happy':[(301,362),(318,323),(332,317),(362,316),(380,350),(382,420),(368,460),(330,464),(300,442),(292,400)],
    'sad':[(286,420),(330,398),(388,400),(396,440),(382,482),(352,508),(300,508)]}
for p in ['happy','sad']:
  K=cv2.imread(f'k_{p}.png',-1);arm=MK[p+'_near']|MK[p+'_far']|poly(CL[p])|SLVn
  arm=cv2.dilate(arm.astype(np.uint8),np.ones((9,9),np.uint8))>0
  ok=strip&~got&~arm&(K[...,3]>200);out[ok]=K[ok];got|=ok
Y=np.mgrid[0:H,0:W][0]
for p in ['happy','sad']:
  K=cv2.imread(f'k_{p}.png',-1);hk=hs(K);sk=(hk[...,0]<=22)&(hk[...,1]>=50)&(hk[...,2]>=150)
  ok=zone&~got&(Y>515)&(Y<590)&(np.mgrid[0:H,0:W][1]<262)&~(cv2.dilate(sk.astype(np.uint8),np.ones((5,5),np.uint8))>0)&(K[...,3]>200);out[ok]=K[ok];got|=ok
rest=strip&~got;print('strip',int(strip.sum()),'from drawings',int(got.sum()),'painted',int(rest.sum()))
inp=cv2.inpaint(out[...,:3],rest.astype(np.uint8)*255,7,cv2.INPAINT_TELEA);out[rest,:3]=inp[rest];out[rest,3]=255
# soften the seam between the repaired zone and the rest
f=cv2.GaussianBlur(zone.astype(np.float32),(0,0),1.5)[...,None]
out=(B.astype(np.float32)*(1-f)+out.astype(np.float32)*f).astype(np.uint8)
cv2.imwrite('rig2/img/base.png',out)
