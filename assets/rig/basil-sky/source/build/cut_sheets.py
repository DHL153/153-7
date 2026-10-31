# 시트(자홍 배경) → 조각 RGBA (부드러운 가장자리 + 자홍 번짐 제거)
import numpy as np,cv2,sys,os
from PIL import Image
def key(path):
  a=np.array(Image.open(path).convert('RGB')).astype(np.float32)
  r,g,b=a[...,0],a[...,1],a[...,2]
  mag=np.clip(((np.minimum(r,b)-g)-60)/80,0,1)        # 1 = 자홍
  al=1-mag
  fg=(al>.5).astype(np.uint8);fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
  n,cc,st,_=cv2.connectedComponentsWithStats(fg,8)
  out=[]
  for i in range(1,n):
    if st[i,4]<800:continue
    x,y,w,h=st[i,:4];m=cv2.dilate((cc==i).astype(np.uint8),np.ones((5,5),np.uint8))>0
    x0,y0=max(0,x-4),max(0,y-4);x1,y1=min(a.shape[1],x+w+4),min(a.shape[0],y+h+4)
    rgba=np.zeros((y1-y0,x1-x0,4),np.float32);sub=a[y0:y1,x0:x1].copy();aa=al[y0:y1,x0:x1]*m[y0:y1,x0:x1]
    # 자홍 섞인 가장자리 색 되돌리기
    k=np.clip(aa,0.05,1)[...,None];M=np.array([255,0,255],np.float32);sub=np.clip((sub-M*(1-k))/k,0,255)
    rgba[...,:3]=sub;rgba[...,3]=aa*255
    out.append(((y+h/2),x,rgba))
  return out
def rows(items,bands):
  def band(cy):
    for i,(a,b) in enumerate(bands):
      if a<=cy<b:return i
  return sorted(items,key=lambda t:(band(t[0]),t[1]))
if __name__=='__main__':
  os.makedirs('pieces',exist_ok=True)
  P=rows(key('../sky25/s1b.png'),[(0,310),(310,590),(590,800),(800,1024)])
  print('sheet1',len(P))
  for i,(cy,x,im) in enumerate(P,1):Image.fromarray(im.astype(np.uint8)).save(f'pieces/p{i:02d}.png')
  W=sorted(key('../sky25/sheet4.png'),key=lambda t:t[1]);print('walk',len(W))
  for i,(cy,x,im) in enumerate(W):Image.fromarray(im.astype(np.uint8)).save(f'pieces/walk{i}.png')
  A=key('../sky25/sheet5.png');print('punch',len(A));Image.fromarray(A[0][2].astype(np.uint8)).save('pieces/punch.png')
