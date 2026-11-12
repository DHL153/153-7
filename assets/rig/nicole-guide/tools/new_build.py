import cv2,numpy as np,shutil
MAP={'01':'idle','02':'sad_a','03':'happy_a','04':'wave_r','05':'wave','06':'guide_a','07':'wave_b','08':'wave_a','09':'sad','10':'happy','11':'wave_l','12':'guide','13':'body'}
O=cv2.imread('old_k/k_idle.png',-1);N=cv2.imread('in4/k_01.png',-1)
hsv=lambda i:cv2.cvtColor(i[...,:3],cv2.COLOR_BGR2HSV).astype(int)
def skin(i):h=hsv(i);return (h[...,0]<=22)&(h[...,1]>=40)&(h[...,1]<=160)&(h[...,2]>=165)&(i[...,3]>200)
hull=np.load('face_hull.npy')
reg=np.zeros(hull.shape,bool);reg[230:330,230:420]=True
mo=skin(O)&reg&(hull>0);mn=skin(N)&reg&(hull>0)
gain=np.median(O[...,:3][mo].astype(np.float32),0)/np.median(N[...,:3][mn].astype(np.float32),0);print('skin gain',gain.round(3))
def fixskin(k):
  s=cv2.GaussianBlur(skin(k).astype(np.float32),(0,0),1.0)[...,None]
  k=k.astype(np.float32);k[...,:3]=k[...,:3]*(1-s)+np.clip(k[...,:3]*gain,0,255)*s;return k.clip(0,255).astype(np.uint8)
eye=np.zeros(hull.shape,np.uint8);cv2.ellipse(eye,(282,232),(48,52),0,0,360,1,-1);cv2.ellipse(eye,(386,228),(38,50),0,0,360,1,-1)
for n,p in MAP.items():
  k=fixskin(cv2.imread(f'in4/k_{n}.png',-1))
  if p=='idle':
    # the old face (all 12 expressions were cut against it) goes on the new master; new hair and crown stay
    h=hsv(k);hair=(h[...,0]<=24)&(h[...,1]>40)&(h[...,2]>=60)&(h[...,2]<165)&~(eye>0)
    m=(cv2.erode(hull,np.ones((7,7),np.uint8))>0)&~cv2.dilate(hair.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
    f=cv2.GaussianBlur(m.astype(np.float32),(0,0),1.5)[...,None]*(m[...,None]|True)
    f=np.minimum(f,cv2.erode(hull,np.ones((3,3),np.uint8))[...,None].astype(np.float32))
    k=(k.astype(np.float32)*(1-f)+O.astype(np.float32)*f).astype(np.uint8)
  cv2.imwrite(f'k_{p}.png',k)
print('ok')
