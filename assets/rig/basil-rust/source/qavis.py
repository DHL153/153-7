import sys,json,numpy as np,cv2
from PIL import Image
pre=sys.argv[1];res=json.load(open(f'{pre}/qa.json'));tiles=[]
def mark(png):
  im=np.array(Image.open(png).convert('RGBA'));a=(im[...,3]>40).astype(np.uint8);n,cc,st,_=cv2.connectedComponentsWithStats(a,8);main=1+np.argmax(st[1:,4])
  bg=(1-a).astype(np.uint8);ff=np.zeros((a.shape[0]+2,a.shape[1]+2),np.uint8);reach=bg.copy();cv2.floodFill(reach,ff,(0,0),2);hole=reach==1
  det=np.zeros_like(hole)
  for k in range(1,n):
    if k!=main and st[k,4]>=3:det|=cc==k
  v=np.zeros((*a.shape,3),np.uint8);v[...]=(43,58,90);al=im[...,3:4]/255.;v=(im[...,:3]*al+v*(1-al)).astype(np.uint8)
  v[cv2.dilate(hole.astype(np.uint8),np.ones((3,3)))>0]=(255,0,255);v[cv2.dilate(det.astype(np.uint8),np.ones((3,3)))>0]=(0,255,0)
  ys,xs=np.where(hole|det);return v,(xs,ys)
for sc,frames in res.items():
  worst=sorted(range(len(frames)),key=lambda i:-(sum(frames[i]['det'])*3+sum(frames[i]['holes'])))[:4]
  for i in worst:
    f=frames[i];v,(xs,ys)=mark(f['png'])
    if len(xs):cx,cy=int(np.median(xs)),int(np.median(ys))
    else:cx,cy=380,450
    x0,y0=max(0,min(1100-300,cx-150)),max(0,min(900-300,cy-150));t=Image.fromarray(v[y0:y0+300,x0:x0+300]).resize((300,300))
    tiles.append((t,f"{sc}:{f['tag']}#{i} det{f['det']} h{f['holes']}"))
W=Image.new('RGB',(1200,300*((len(tiles)+3)//4)),(0,0,0))
for k,(t,l) in enumerate(tiles):W.paste(t,((k%4)*300,(k//4)*300));print(k,l)
W.save(f'{pre}_flags.png')
