# 원화 − 팔 지운 원화(시트 2·3) → 팔 마스크 NA/FA + 두 팔 지운 몸(body512)
import numpy as np,cv2
from PIL import Image,ImageDraw
L=lambda p:np.array(Image.open(p).convert('RGBA').resize((512,512),Image.LANCZOS)).astype(np.float32)
R=np.array(Image.open('../sky25/new512.png').convert('RGBA')).astype(np.float32)
W=L('../sky25/recv2.png');X=L('../sky25/recv3.png')
PW=[(8,290),(28,250),(80,230),(118,210),(150,206),(166,224),(160,250),(182,280),(200,305),(202,343),(178,370),(140,394),(100,402),(40,380),(8,345)]
PX=[(306,204),(318,192),(345,198),(362,182),(420,176),(482,190),(512,228),(512,332),(470,350),(400,350),(352,326),(332,300),(322,268),(318,246),(306,236)]
def poly(P):
  m=Image.new('L',(512,512),0);ImageDraw.Draw(m).polygon(P,fill=255);return np.array(m)>0
aR=R[...,3]>40
def armmask(E,P):
  pm=poly(P);d=np.abs(R[...,:3]-E[...,:3]).mean(-1)
  m=aR&((E[...,3]<40)|(d>40))&cv2.dilate(pm.astype(np.uint8),np.ones((9,9),np.uint8)).astype(bool)
  m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))>0
  # 가이드 다각형 안 원화 = 팔 (지운 원화가 비슷한 색으로 다시 그린 곳 포함)
  m=(m|(pm&aR))
  m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))>0
  return m&aR
NA=armmask(W,PW);FA=armmask(X,PX)
FA&=~NA
FAd=cv2.dilate(FA.astype(np.uint8),np.ones((9,9),np.uint8)).astype(bool)
Bd=W.copy();Bd[FAd]=X[FAd];Bd[Bd[...,3]<40]=0
np.save('brawl/out_sky/nearArm.npy',NA);np.save('brawl/out_sky/farArm.npy',FA)
Image.fromarray(Bd.astype(np.uint8)).save('basil_work/sky/source/work/body512.png')
if __name__=='__main__':
  print('NA',NA.sum(),'FA',FA.sum())
  v=np.full((512,512,3),255,np.uint8);v[aR]=R[aR][:,:3]*.5+127;v[NA]=[230,60,60];v[FA]=[60,60,230]
  bb=np.full((512,512,3),255,np.uint8);ab=Bd[...,3]>40;bb[ab]=Bd[ab][:,:3]
  Image.fromarray(np.hstack([v,bb])).resize((1024,512)).save('arms_chk.png')
