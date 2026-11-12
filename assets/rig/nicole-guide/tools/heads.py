# whole-head expression patches: face + bangs + brows from ONE redraw; seam runs through plain hair, away from features
import cv2,numpy as np,json
M=cv2.imread('k_idle.png',-1);Mc=M[...,:3].astype(np.float32);H,W=M.shape[:2]
hv=cv2.cvtColor(M[...,:3],cv2.COLOR_BGR2HSV).astype(int)
crown=((hv[...,1]>90)&(hv[...,0]>=170)|(hv[...,0]<=6)&(hv[...,1]>120))|((hv[...,1]<40)&(hv[...,2]>200))
crown&=np.mgrid[0:H,0:W][0]<260
crown=cv2.dilate(crown.astype(np.uint8),np.ones((15,15),np.uint8))>0
inside=cv2.erode((M[...,3]>200).astype(np.uint8),np.ones((15,15),np.uint8))>0
Y,X=np.mgrid[0:H,0:W]
hull=np.load('face_hull.npy')>0
reg=np.zeros((H,W),np.uint8);cv2.ellipse(reg,(330,240),(150,125),0,0,360,1,-1)
reg=(reg>0)&inside&~crown&(Y<350)
reg|=hull&(Y<350)
soft=cv2.GaussianBlur(reg.astype(np.float32),(0,0),3.0);soft=np.where(cv2.erode(reg.astype(np.uint8),np.ones((9,9),np.uint8))>0,1.0,soft)*inside
mouthR=np.zeros((H,W),np.uint8);cv2.ellipse(mouthR,(331,292),(48,24),-8,0,360,1,-1);ms=cv2.GaussianBlur(mouthR.astype(np.float32),(0,0),3)
skin=lambda i:(lambda h:(h[...,0]<=22)&(h[...,1]>=40)&(h[...,1]<=160)&(h[...,2]>=165))(cv2.cvtColor(i[...,:3].astype(np.uint8),cv2.COLOR_BGR2HSV).astype(int))
names=['blink','half','talk','laugh','surprise','sad','sadclosed','sadtalk','cry','worried','think','content']
x0,y0,x1,y1=150,80,500,360;info={'box':[x0,y0,x1-x0,y1-y0],'eyes':[],'mouth':[]}
for n in names:
  F=cv2.imread(f'in5/k_{n}.png',-1).astype(np.float32)
  m=skin(F)&skin(M)&hull&(Y>250);g=np.median(Mc[m],0)/np.median(F[...,:3][m],0)
  sk=cv2.GaussianBlur(skin(F).astype(np.float32),(0,0),1)[...,None];F[...,:3]=F[...,:3]*(1-sk)+np.clip(F[...,:3]*g,0,255)*sk
  for z,a in [('eyes',soft),('mouth',ms*soft)]:
    rgba=np.dstack([F[...,:3],a*255*(F[...,3]/255.)])[y0:y1,x0:x1].clip(0,255).astype(np.uint8);rgba[rgba[...,3]==0,:3]=0
    cv2.imwrite(f'rig2/img/{z}_{n}.png',rgba);info[z].append(n)
json.dump(info,open('rig2/faces.json','w'))
v=Mc.copy();v[reg]=v[reg]*.5+np.array([255,0,255])*.5;cv2.imwrite('headmask.png',v[60:400,120:520].astype(np.uint8))
