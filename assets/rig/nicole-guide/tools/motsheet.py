import sys,glob,cv2,numpy as np
d,pat,reg,out=sys.argv[1],sys.argv[2],[int(v) for v in sys.argv[3].split(',')],sys.argv[4];cols=int(sys.argv[5]) if len(sys.argv)>5 else 6
fs=sorted(glob.glob(f'{d}/{pat}*.png'));ims=[]
for f in fs:
  im=cv2.imread(f,-1).astype(np.float32);a=im[...,3:]/255.;im=(im[...,:3]*a+150*(1-a)).astype(np.uint8)[reg[1]:reg[3],reg[0]:reg[2]]
  s=300/im.shape[1];im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC);cv2.putText(im,f.split('/')[-1][:-4],(3,12),0,.38,(0,0,255),1);ims.append(im)
rows=[]
for i in range(0,len(ims),cols):
  r=ims[i:i+cols];r+=[np.full_like(ims[0],255)]*(cols-len(r));rows.append(np.hstack(r))
cv2.imwrite(out,np.vstack(rows))
