# key every pose into a shared 680x1024 space (master coordinates; extra room on the right for the guide hand)
import cv2,numpy as np
from PIL import Image
CW,CH=680,1024
def key(a):
  a=a.astype(np.float32);B,G,R=a[...,0],a[...,1],a[...,2];gx=G-np.maximum(R,B)
  al=np.clip((120-gx)/70,0,1)
  h,w=al.shape;sp=(G>150)&(R>110)&(B>110)&(gx>8);sp[:int(h*.8)]=0;sp[:,:int(w*.6)]=0
  sp=cv2.dilate(sp.astype(np.uint8),np.ones((11,11)))>0;al[sp]=0
  m=(al>.5).astype(np.uint8);n,cc,st,_=cv2.connectedComponentsWithStats(m,8)
  keep=np.isin(cc,[k for k in range(1,n) if st[k,4]>=80]);keep=cv2.dilate(keep.astype(np.uint8),np.ones((5,5),np.uint8))>0;al=al*keep
  lim=np.maximum(R,B);a[...,1]=np.where(G>lim,lim,G)
  # pull the half-transparent edge toward the dark outline colour so no green or light halo remains
  e=(al>0)&(al<1);a[e]=a[e]*al[e,None]+np.array([38,40,52])*(1-al[e,None])
  return np.dstack([a,al*255]).clip(0,255).astype(np.uint8)
src={'idle':('master_v1_clean.png',None),'guide':('in/guide_v2.png',None),'wave':('in/wave_v1.png',None),'happy':('in/happy_v1.png',None),'sad':('in/sad_v1.png',None)}
for n,(f,A) in src.items():
  im=cv2.imread(f);A=np.load(A) if A else np.float32([[1,0,0],[0,1,0]])
  W=cv2.warpAffine(im,A,(CW,CH),flags=cv2.INTER_CUBIC,borderValue=(0,255,0))
  k=key(W);cv2.imwrite(f'k_{n}.png',k);print(n,'ok')
