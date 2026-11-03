import cv2,numpy as np,sys
d=sys.argv[1];poses=sys.argv[2].split(',');fa=sys.argv[3] if len(sys.argv)>3 else 'smile'
def over(im,bg=150):
  a=im[...,3:]/255.;return im[...,:3]*a+bg*(1-a)
rows=[]
for p in poses:
  r=cv2.imread(f'{d}/{p}_{fa}.png',-1).astype(np.float32);k=cv2.imread(f'k_{p}.png',-1).astype(np.float32)
  R,K=over(r),over(k);D=np.abs(R-K).max(2);D[:345]=0   # face patches are compared separately
  hot=(D>40).astype(np.uint8);n=int(hot.sum());print(p,'pixels off by >40:',n)
  vis=R.copy();vis[hot>0]=(0,0,255)
  rows.append(np.hstack([K[340:640,140:580],R[340:640,140:580],vis[340:640,140:580]]))
cv2.imwrite('diff_rows.png',np.vstack(rows).astype(np.uint8))
