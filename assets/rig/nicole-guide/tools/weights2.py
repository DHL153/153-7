import cv2,numpy as np,json
b=cv2.imread('rig2/img/base.png',-1);H,W=b.shape[:2];YY,XX=np.mgrid[0:H,0:W].astype(np.float32)
ss=lambda a,c,x:np.clip((x-a)/(c-a),0,1)**2*(3-2*np.clip((x-a)/(c-a),0,1))
hsv=cv2.cvtColor(b[...,:3],cv2.COLOR_BGR2HSV).astype(int)
hair=(hsv[...,1]>40)&(hsv[...,2]<185)&(hsv[...,2]>=60)&(hsv[...,0]<=24)&(b[...,3]>100)
neck=np.zeros((H,W),np.uint8);cv2.fillPoly(neck,[np.int32([(262,318),(352,318),(352,372),(262,372)])],1);hair&=~(neck>0)
hair&=(YY<640);hair=cv2.morphologyEx(hair.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8)).astype(np.float32)
# the hair REGION (fill + its own outlines), smoothed: fill and outline always move together
hreg=cv2.morphologyEx(cv2.dilate(hair.astype(np.uint8),np.ones((7,7),np.uint8)),cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)).astype(np.float32)*(b[...,3]>0)
hs=cv2.GaussianBlur(hreg,(0,0),8)
head=np.where(YY<332,1.0,0.0)
head=np.maximum(head,(1-ss(334,364,YY))*(neck>0))
head=np.maximum(head,hs*(1-ss(330,610,YY)))
head=cv2.GaussianBlur(head.astype(np.float32),(0,0),8);head[YY<326]=1
swL=hs*ss(360,585,YY)*(XX<300);swR=hs*ss(345,480,YY)*(XX>=300)
swL=cv2.GaussianBlur(swL.astype(np.float32),(0,0),8);swR=cv2.GaussianBlur(swR.astype(np.float32),(0,0),8)
# keep the hair still right next to the sleeves (the arm layers sit on top there)
exec(open('seg.py').read().split('def cut(')[0].split('MASK={}')[0].replace("IM={p:cv2.imread(f'k_{p}.png',-1) for p in P};H,W=IM['idle'].shape[:2]","H,W=b.shape[:2]"))
sv=np.zeros((H,W),np.uint8)
for q in [SLV['near']]+list(SLV['far'].values()):cv2.fillPoly(sv,[np.int32(q)],1)
sv=cv2.GaussianBlur(cv2.dilate(sv,np.ones((41,41),np.uint8)).astype(np.float32),(0,0),8)
swL*=1-sv;swR*=1-sv
dress=(b[...,3]>0)&(hair<.5)
sk=ss(660,888,YY)*(YY<893)*dress;sk=cv2.GaussianBlur(sk.astype(np.float32),(0,0),8)
ST=8;gx=np.arange(0,W+1,ST);gy=np.arange(0,H+1,ST)
def S(w):return [int(round(100*float(w[min(H-1,y),min(W-1,x)]))) for y in gy for x in gx]
J={'step':ST,'nx':len(gx),'ny':len(gy),'head':S(head),'hairL':S(swL),'hairR':S(swR),'skirt':S(sk)}
open('rig2/w.js','w').write('window.NICOLE_W='+json.dumps(J,separators=(',',':'))+';')
v=np.zeros((H,W,3),np.float32);v[...,2]=head;v[...,1]=np.maximum(swL,swR);v[...,0]=sk
vis=(b[...,:3]/255*.4+v*.6)*np.maximum(b[...,3:]/255,.15)
cv2.imwrite('weights_vis.png',cv2.resize((vis*255).astype(np.uint8),None,fx=.6,fy=.6))
