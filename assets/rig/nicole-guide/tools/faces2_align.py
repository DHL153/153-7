import cv2,numpy as np
M=cv2.imread('k_idle.png',-1);Mc=M[...,:3];H,W=M.shape[:2]
g=lambda a:cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)
sift=cv2.SIFT_create(nfeatures=4000)
hull=np.load('face_hull.npy')
# master keypoints only outside the face interior (hair, ears, collar) so changed features never drive the fit
mmask=np.zeros((H,W),np.uint8);mmask[30:420,100:500]=255;mmask[cv2.dilate(hull,np.ones((9,9),np.uint8))>0]=0
km,dm=sift.detectAndCompute(g(Mc),mmask)
names=['blink','half','talk','laugh','surprise','sad','sadclosed','sadtalk','cry','worried','think','content']
out={}
for i,n in enumerate(names):
  F=cv2.imread(f'in2/{i+3:02d}.png');s=1/(2*996/700)
  A0=np.float32([[s,0,130],[0,s,40]])
  kf,df=sift.detectAndCompute(g(F),None)
  mt=cv2.BFMatcher().knnMatch(df,dm,k=2);good=[a for a,b in mt if a.distance<.72*b.distance]
  src=np.float32([kf[a.queryIdx].pt for a in good]);dst=np.float32([km[a.trainIdx].pt for a in good])
  A,inl=cv2.estimateAffinePartial2D(src,dst,ransacReprojThreshold=1.5,maxIters=5000)
  sc=np.hypot(A[0,0],A[1,0]);print(n,len(good),int(inl.sum()),'scale %.4f rot %.2f'%(sc,np.degrees(np.arctan2(A[1,0],A[0,0]))),A[:,2].round(2),'expected',A0[:,2],s.__round__(4))
  w=cv2.warpAffine(F,A,(W,H),flags=cv2.INTER_AREA,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,255,0))
  cv2.imwrite(f'f2_{n}.png',w)
