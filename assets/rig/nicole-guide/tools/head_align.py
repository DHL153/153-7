import cv2,numpy as np,json
exec(open('k.py').read().split("src={")[0])
g=lambda a:cv2.cvtColor(a,cv2.COLOR_BGR2GRAY);sift=cv2.SIFT_create(nfeatures=8000)
AT=cv2.imread('/mnt/user-data/outputs/nicole_npc/orders/attach_4_head_strawberry.png');h,w=AT.shape[:2]
N1=cv2.imread('in4/01.png');s=N1.shape[1]/572;ox,oy=int(130*s),int(40*s)
A1=np.array(json.load(open('in4/A.json'))['01']);H3=lambda A:np.vstack([A,[0,0,1]])
T=H3(A1)@np.array([[1,0,ox],[0,1,oy],[0,0,1]],float)          # attach -> canvas
# fit only on hair + crown (outside the face)
ma=np.full((h,w),255,np.uint8);cv2.ellipse(ma,(560,560),(260,300),0,0,360,0,-1)
ka,da=sift.detectAndCompute(g(AT),ma)
names=['blink','half','talk','laugh','surprise','sad','sadclosed','sadtalk','cry','worried','think','content']
for i,n in enumerate(names):
  F=cv2.imread(f'in5/{i+1:02d}.png');mf=cv2.resize(ma,(F.shape[1],F.shape[0]),interpolation=cv2.INTER_NEAREST)
  kf,df=sift.detectAndCompute(g(F),mf);mt=cv2.BFMatcher().knnMatch(df,da,k=2);good=[a for a,b in mt if a.distance<.72*b.distance]
  P=np.float32([kf[a.queryIdx].pt for a in good]);Q=np.float32([ka[a.trainIdx].pt for a in good])
  A,inl=cv2.estimateAffine2D(P,Q,ransacReprojThreshold=1.5,maxIters=8000)
  res=np.linalg.norm((P[inl[:,0]>0]@A[:,:2].T+A[:,2])-Q[inl[:,0]>0],axis=1)
  print(n,len(good),int(inl.sum()),'resid %.2f'%res.mean(),A.round(3).tolist())
  M=(T@H3(A))[:2]
  W=cv2.warpAffine(F,M,(680,1024),flags=cv2.INTER_AREA,borderValue=(0,255,0))
  cv2.imwrite(f'in5/k_{n}.png',key(W))
