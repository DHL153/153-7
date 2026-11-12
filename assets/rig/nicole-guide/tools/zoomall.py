# pixel-level review: for a pose, rig composite vs source drawing, every 100x100 tile that differs, at 3x
import cv2,numpy as np,sys
exec(open('stat.py').read())
p=sys.argv[1];e=sys.argv[2] if len(sys.argv)>2 and sys.argv[2]!='-' else None;m=sys.argv[3] if len(sys.argv)>3 and sys.argv[3]!='-' else None
S=comp(p,e,m)
K=cv2.imread(f'k_{p}.png',-1).astype(np.float32);a=K[...,3:]/255.;K=(K[...,:3]*a+np.array([215,228,236])*(1-a)).astype(np.uint8)
d=np.abs(S.astype(int)-K.astype(int)).max(2)>40;d[:240]=False;d[np.load('face_hull.npy')>0]=False
tiles=[]
for y in range(300,700,80):
  for x in range(60,600,80):
    n=d[y:y+80,x:x+80].sum()
    if n>25:
      a_=cv2.resize(K[y:y+80,x:x+80],None,fx=3,fy=3,interpolation=cv2.INTER_NEAREST);b_=cv2.resize(S[y:y+80,x:x+80],None,fx=3,fy=3,interpolation=cv2.INTER_NEAREST)
      t=np.hstack([a_,np.full((240,3,3),0,np.uint8),b_]);cv2.putText(t,f'{x},{y} n{n}',(3,12),0,.4,(0,0,255),1);tiles.append(t)
print(len(tiles))
cols=3;rows=[]
for i in range(0,len(tiles),cols):
  r=tiles[i:i+cols];r+=[np.zeros_like(tiles[0])]*(cols-len(r));rows.append(np.hstack(r))
cv2.imwrite(f'za_{p}.png',np.vstack(rows) if rows else np.zeros((10,10,3),np.uint8))
