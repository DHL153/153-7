import cv2,numpy as np,glob,json
exec(open('k.py').read().split("src={")[0])
g=lambda a:cv2.cvtColor(a,cv2.COLOR_BGR2GRAY);sift=cv2.SIFT_create(nfeatures=6000)
def fit(src,dst,ms=None,md=None):
  ks,ds=sift.detectAndCompute(g(src),ms);kd,dd=sift.detectAndCompute(g(dst),md)
  mt=cv2.BFMatcher().knnMatch(ds,dd,k=2);good=[a for a,b in mt if a.distance<.72*b.distance]
  P=np.float32([ks[a.queryIdx].pt for a in good]);Q=np.float32([kd[a.trainIdx].pt for a in good])
  A,inl=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=2.0,maxIters=8000);return A,int(inl.sum())
OM=cv2.imread('master_v1_clean.png')   # old master 572x1024 = canvas coords (k.py pads right to 680)
N1=cv2.imread('in4/01.png')
# new master -> old master using the head (face + hair) only
mo=np.zeros(OM.shape[:2],np.uint8);mo[60:330,80:480]=255
mn=np.zeros(N1.shape[:2],np.uint8);s=N1.shape[1]/572;mn[int(60*s):int(330*s),int(80*s):int(480*s)]=255
A1,n=fit(N1,OM,mn,mo);print('master->old',n,A1.round(4))
H3=lambda A:np.vstack([A,[0,0,1]])
res={}
for f in sorted(glob.glob('in4/*.png')):
  I=cv2.imread(f)
  if f.endswith('01.png'):A=A1
  else:
    sc=N1.shape[1]/I.shape[1];I0=cv2.resize(I,(N1.shape[1],N1.shape[0]),interpolation=cv2.INTER_CUBIC) if sc!=1 else I
    ml=np.zeros(N1.shape[:2],np.uint8);ml[int(N1.shape[0]*.62):int(N1.shape[0]*.97)]=255   # skirt + feet
    B,n=fit(I0,N1,ml,ml);A=(H3(A1)@H3(B))[:2]
    if sc!=1:A=(H3(A)@np.diag([sc,sc,1]))[:2]
    I=cv2.imread(f)
  W=cv2.warpAffine(I,A,(680,1024),flags=cv2.INTER_AREA,borderValue=(0,255,0))
  k=key(W);name=f.split('/')[-1][:-4];cv2.imwrite(f'in4/k_{name}.png',k);res[name]=A.tolist()
json.dump(res,open('in4/A.json','w'))
