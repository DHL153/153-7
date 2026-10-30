import sys,json,numpy as np,cv2
from PIL import Image
pre=sys.argv[1];res=json.load(open(f'{pre}/qa.json'));out=[]
for sc,fr in res.items():
  worst=(0,None)
  for i,f in enumerate(fr):
    a=(np.array(Image.open(f['png']))[...,3]>40).astype(np.uint8);bg=1-a;ff=np.zeros((a.shape[0]+2,a.shape[1]+2),np.uint8);r=bg.copy();cv2.floodFill(r,ff,(0,0),2)
    n,cc,st,cen=cv2.connectedComponentsWithStats((r==1).astype(np.uint8),8)
    up=[(int(st[k,4]),int(cen[k][0]),int(cen[k][1])) for k in range(1,n) if st[k,4]>=3 and cen[k][1]<715]
    s=sum(x[0] for x in up)
    if s>worst[0]:worst=(s,(f['tag'],i,up))
  print(sc,'upper-body hole px max',worst)
