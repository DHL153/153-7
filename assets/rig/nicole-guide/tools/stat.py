import cv2,numpy as np,json,sys
B=cv2.imread('rig2/img/base.png',-1).astype(np.float32);F=json.load(open('rig2/frames.json'));I=json.load(open('rig2/faces.json'))
def lay(c,im,x0,y0):
  h,w=im.shape[:2];a=im[...,3:]/255.;c[y0:y0+h,x0:x0+w,:3]=c[y0:y0+h,x0:x0+w,:3]*(1-a)+im[...,:3]*a;c[y0:y0+h,x0:x0+w,3:]=np.maximum(c[y0:y0+h,x0:x0+w,3:],im[...,3:])
def comp(pose,e=None,m=None):
  c=B.copy()
  fx,fy,fw,fh=I['box']
  for z,n in [('eyes',e),('mouth',m)]:
    if n:lay(c,cv2.imread(f'rig2/img/{z}_{n}.png',-1).astype(np.float32),fx,fy)
  x0,y0,w,h=F[pose];lay(c,cv2.imread(f'rig2/img/arms_{pose}.png',-1).astype(np.float32),x0,y0)
  a=c[...,3:]/255.;return (c[...,:3]*a+np.array([215,228,236])*(1-a)).astype(np.uint8)
