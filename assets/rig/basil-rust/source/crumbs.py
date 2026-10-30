# post-build: tiny pieces that float >3px away from a part's main body are removed from parts that move on their own (arms, gauntlets)
import sys,numpy as np,cv2
from PIL import Image
rd=sys.argv[1]
for p in sys.argv[2:]:
  f=f'{rd}/parts/{p}.png';im=np.array(Image.open(f).convert('RGBA'));a=(im[...,3]>20).astype(np.uint8);n,cc,st,_=cv2.connectedComponentsWithStats(a,8)
  if n<3:continue
  main=cc==(1+np.argmax(st[1:,4]));near=cv2.dilate(main.astype(np.uint8),np.ones((7,7),np.uint8))>0;rm=0
  for k in range(1,n):
    cm=cc==k
    if cm is main or (cm&main).any():continue
    if st[k,4]<60 and not (cm&near).any():im[cm]=0;rm+=int(st[k,4])
  if rm:Image.fromarray(im).save(f);print(' crumbs',p,rm)
