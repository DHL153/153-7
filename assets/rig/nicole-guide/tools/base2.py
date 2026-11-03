# armless body = master everywhere the arms never were, the armless redraw (S1) where they were.
import cv2,numpy as np
M=cv2.imread('k_idle.png',-1).astype(np.float32);B=cv2.imread('k_body.png',-1).astype(np.float32);H,W=M.shape[:2]
pm=lambda i:np.dstack([i[...,:3]*i[...,3:]/255.,i[...,3:]])
d=np.abs(pm(M)-pm(B)).max(2)
R=(d>14).astype(np.uint8);R[:330]=0
R=cv2.morphologyEx(R,cv2.MORPH_OPEN,np.ones((3,3),np.uint8));R=cv2.dilate(R,np.ones((9,9),np.uint8))
n,cc,st,_=cv2.connectedComponentsWithStats(R);R=np.isin(cc,[k for k in range(1,n) if st[k,4]>300]).astype(np.float32)
f=cv2.GaussianBlur(R,(0,0),2.5);f=np.maximum(f,cv2.erode(R,np.ones((5,5),np.uint8)))[...,None]
out=M*(1-f)+B*f
# the redraw put the near arm BEHIND the back (a skin strip beside the dress): turn it into hair + dress side
o=out.astype(np.uint8);hsv=cv2.cvtColor(o[...,:3],cv2.COLOR_BGR2HSV).astype(int)
skin=(hsv[...,0]<=22)&(hsv[...,1]>=50)&(hsv[...,2]>=150)
zone=np.zeros((H,W),np.uint8);cv2.fillPoly(zone,[np.int32([(172,380),(262,380),(262,575),(172,575)])],1)
strip=cv2.dilate((skin&(zone>0)).astype(np.uint8),np.ones((7,7),np.uint8))>0
# also the dark outline around that strip
dark=(hsv[...,2]<110)&(zone>0)
strip|=(cv2.dilate(strip.astype(np.uint8),np.ones((9,9),np.uint8))>0)&dark
strip&=zone>0
# this strip is always under the near upper arm and sleeve (that arm hangs from the same shoulder in every pose);
# fill it with the earlier repaired body (hair on the left, dress on the right), never with arm skin
OB=cv2.imread('rig/img/base.png',-1);sel=strip&(OB[...,3]>0);o[sel]=OB[sel]
cv2.imwrite('rig2/img/base.png',o)
a=o[...,3:]/255.;v=(o[...,:3]*a+150*(1-a)).astype(np.uint8)
cv2.imwrite('base2_check.png',np.hstack([cv2.resize(v[360:600,150:460],None,fx=2,fy=2),]))
