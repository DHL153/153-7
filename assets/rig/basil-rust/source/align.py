# similarity transform sheet-piece -> art(512) by SIFT + RANSAC, overlay check image
import sys,json
import numpy as np,cv2
from PIL import Image
def load(p):return np.array(Image.open(p).convert('RGBA'))
def sift_sim(piece,art,art_mask=None,scale_hint=None,ratio=.75):
  g1=cv2.cvtColor(piece[...,:3],cv2.COLOR_RGB2GRAY);g2=cv2.cvtColor(art[...,:3],cv2.COLOR_RGB2GRAY)
  up=4;g2u=cv2.resize(g2,None,fx=up,fy=up,interpolation=cv2.INTER_CUBIC)
  m2=None if art_mask is None else cv2.resize(art_mask.astype(np.uint8)*255,None,fx=up,fy=up,interpolation=cv2.INTER_NEAREST)
  s=cv2.SIFT_create(nfeatures=6000)
  k1,d1=s.detectAndCompute(g1,(piece[...,3]>128).astype(np.uint8)*255);k2,d2=s.detectAndCompute(g2u,m2)
  bf=cv2.BFMatcher();ms=bf.knnMatch(d1,d2,k=2);good=[m for m,n in ms if m.distance<ratio*n.distance]
  if len(good)<6:return None,len(good)
  p1=np.float32([k1[m.queryIdx].pt for m in good]);p2=np.float32([k2[m.trainIdx].pt for m in good])/up
  M,inl=cv2.estimateAffinePartial2D(p1,p2,method=cv2.RANSAC,ransacReprojThreshold=2.0,maxIters=5000,confidence=.999)
  return M,int(inl.sum()) if inl is not None else 0
def warp(piece,M,size=512,sup=1):
  M2=M.copy()*sup;M2[:,2]=M[:,2]*sup
  return cv2.warpAffine(piece,M2,(size*sup,size*sup),flags=cv2.INTER_AREA if M[0,0]<1 else cv2.INTER_LINEAR,borderValue=(0,0,0,0))
if __name__=='__main__':
  piece=load(sys.argv[1]);art=load(sys.argv[2]);out=sys.argv[3]
  M,n=sift_sim(piece,art,art[...,3]>0)
  print('inliers',n,'M',None if M is None else M.round(4).tolist(),'scale',None if M is None else float(np.hypot(M[0,0],M[1,0])))
  if M is not None:
    w=warp(piece,M).astype(float);a=art.astype(float)
    bg=np.full((512,512,3),255.);ca=a[...,:3]*a[...,3:]/255+bg*(1-a[...,3:]/255)
    o=ca.copy();al=w[...,3:]/255*.6;o=o*(1-al)+w[...,:3]*al
    Image.fromarray(np.concatenate([ca,o],1).astype(np.uint8)).resize((1536,768)).save(out)
