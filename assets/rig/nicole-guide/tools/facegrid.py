import cv2,numpy as np,json,sys
I=json.load(open('rig2/faces.json'));x0,y0,w,h=I['box']
M=cv2.imread('k_idle.png')[...,:3].astype(np.float32)
def comp(e,m):
  bg=M.copy()
  for z,n in [('eyes',e),('mouth',m)]:
    if not n or n not in I[z]:continue
    p=cv2.imread(f'rig2/img/{z}_{n}.png',-1).astype(np.float32);a=p[...,3:]/255.;r=bg[y0:y0+h,x0:x0+w];bg[y0:y0+h,x0:x0+w]=r*(1-a)+p[...,:3]*a
  return bg
L=[('smile',None,None),('laugh','laugh','laugh'),('content','content','content'),('blink','blink',None),('half','half',None),('surprise','surprise','surprise'),
   ('sad','sad','sad'),('sadclosed','sadclosed','sad'),('sadtalk','sad','sadtalk'),('cry','cry','cry'),('worried','worried','worried'),('think','think','think'),('talk',None,'talk')]
t=[cv2.resize(comp(e,m)[80:360,150:500],None,fx=1.4,fy=1.4).astype(np.uint8) for _,e,m in L]
fl=cv2.imread('faceless.png');t.append(cv2.resize(fl[80:360,150:500],None,fx=1.4,fy=1.4))
for i,(n,_,_) in enumerate(L):cv2.putText(t[i],n,(3,14),0,.45,(0,0,255),1)
t.append(np.zeros_like(t[0]))
cv2.imwrite(sys.argv[1] if len(sys.argv)>1 else 'face3_chk.png',np.vstack([np.hstack(t[i:i+5]) for i in (0,5,10)]))
