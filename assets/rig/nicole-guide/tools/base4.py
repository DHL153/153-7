import cv2,numpy as np
M=cv2.imread('k_idle.png',-1).astype(np.float32);B=cv2.imread('k_body.png',-1).astype(np.float32);H,W=M.shape[:2]
hull=np.load('face_hull.npy')
pm=lambda i:np.dstack([i[...,:3]*i[...,3:]/255.,i[...,3:]])
d=np.abs(pm(M)-pm(B)).max(2)
R=(d>16).astype(np.uint8);R[:330]=0;R[hull>0]=0
R=cv2.morphologyEx(R,cv2.MORPH_OPEN,np.ones((3,3),np.uint8));R=cv2.dilate(R,np.ones((9,9),np.uint8))
n,cc,st,_=cv2.connectedComponentsWithStats(R);R=np.isin(cc,[k for k in range(1,n) if st[k,4]>300]).astype(np.float32)
f=np.maximum(cv2.GaussianBlur(R,(0,0),2.5),cv2.erode(R,np.ones((5,5),np.uint8)))[...,None]
out=pm(M)*(1-f)+pm(B)*f;a=out[...,3:];rgb=np.where(a>0,out[...,:3]/np.maximum(a,1e-3)*255,0)
base=np.dstack([rgb,a]).clip(0,255).astype(np.uint8);base[base[...,3]==0,:3]=0
cv2.imwrite('rig2/img/base.png',base)
