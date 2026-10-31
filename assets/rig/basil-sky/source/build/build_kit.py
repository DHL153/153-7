# 25 스카이 바실: v8 build7.py 가 읽는 입력(kit · seg · cut · cut2 · M_sky · cfg)을 시트 1~5로 만든다
import sys,os,json,math
sys.path.insert(0,'source')
import numpy as np,cv2
from PIL import Image,ImageDraw
from align import load,sift_sim,warp
R=load('basil_work/sky/art/ref512.png').astype(np.float32);aR=R[...,3]>40
Bd=load('basil_work/sky/source/work/body512.png').astype(np.float32);aB=Bd[...,3]>40
YY,XX=np.mgrid[0:512,0:512]
def poly(P):
  m=Image.new('L',(512,512),0);ImageDraw.Draw(m).polygon(P,fill=255);return np.array(m)>0
# ---------- 관절 (원화 px)
MS={'hip':[245,350],'neck':[250,250],
 'far':{'SH':[302,218],'EL':[335,246],'fist':[440,275]},
 'near':{'SH':[140,228],'EL':[150,262],'fist':[110,340]},
 'legs':{'near':{'hip':[205,375],'knee':[160,412],'ankle':[148,438]},'far':{'hip':[285,375],'knee':[320,410],'ankle':[332,436]}}}
json.dump(MS,open('basil_work/sky/source/measure25.json','w'),indent=1)
# ---------- 머리 · 끈 꼬리 (원화 픽셀)
HEADP=[(146,60),(205,55),(250,60),(300,95),(315,150),(312,175),(308,195),(306,215),(302,232),(285,248),(262,261),(240,261),(225,252),(212,238),(200,226),(185,222),(170,212),(152,207),(148,185),(146,140)]
head=poly(HEADP)&aR
tails=aR&(XX<147)&(YY<182)&~head
n,cc,st,_=cv2.connectedComponentsWithStats(tails.astype(np.uint8),8);tails=np.isin(cc,[i for i in range(1,n) if st[i,4]>=30])
FA=np.load('brawl/out_sky/farArm.npy');NA=np.load('brawl/out_sky/nearArm.npy')
head&=~FA
# ---------- 라벨: 1 몸통 · 2 반바지 · 3 가까운 다리 · 4 먼 다리 · 5 머리 · 6 끈
lab=np.zeros((512,512),np.uint8);body=aB|aR
lab[body]=1
r,g,b=[Bd[...,i] for i in range(3)];cream=(r>165)&(g>145)&(b>110)
shorts=body&(YY>=322)&~(cream&(YY<362)&((XX<206)|(XX>292)))
def below(p,q):
  (x1,y1),(x2,y2)=p,q;return (YY-y1)*(x2-x1)-(XX-x1)*(y2-y1)>0
legN=body&(XX<242)&(YY>385)&below((118,397),(202,423))
legF=body&(XX>=242)&(YY>385)&below((278,417),(358,401))
lab[shorts]=2;lab[legN&aR]=3;lab[legF&aR]=4;lab[head]=5;lab[tails]=6;lab[(NA|FA)&~head]=7
np.save('brawl/out_sky/labels.npy',lab)
# ---------- 머리 조각 · 표정 패치
O=[450.0,946.0];SC=2.0
def crop_save(rgba,name,pivot):
  a=rgba[...,3];ys,xs=np.where(a>8);x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  Image.fromarray(np.clip(rgba[y0:y1,x0:x1],0,255).astype(np.uint8)).save(f'basil_work/sky/rig/parts/{name}.png')
  return {'src':f'parts/{name}.png','pivot':[round(pivot[0]-float(x0),2),round(pivot[1]-float(y0),2)],'scale':SC},(x0,y0,x1,y1)
H=np.zeros_like(R);H[head]=R[head]
parts={};parts['head'],hb=crop_save(H,'head',MS['neck'])
T=np.zeros_like(R);T[tails]=R[tails];KN=[150,128];parts['pony'],_=crop_save(T,'pony',KN)
Mh=np.array(json.load(open('M_head.json'))['head']);p02=load('pieces/p02.png')
w02=warp(p02,Mh).astype(np.float32)
# 색 맞춤: 얼굴 피부(밝은 살색)에서 채널별 평균·표준편차
skin=head&(w02[...,3]>200)&(R[...,0]>120)&(R[...,0]<235)&(R[...,1]>70)&(R[...,2]<150)&(YY>150)&(YY<250)
mu_a=R[...,:3][skin].mean(0);sd_a=R[...,:3][skin].std(0);mu_s=w02[...,:3][skin].mean(0);sd_s=w02[...,:3][skin].std(0)
print('skin art',mu_a.round(1),'sheet',mu_s.round(1))
def cmatch(x):return np.clip(x*(mu_a/np.maximum(mu_s,1)),0,255)   # 곱셈으로만 맞춤: 검은 선은 그대로 검게
pm=Image.new('L',(512,512),0);ImageDraw.Draw(pm).ellipse([222,156,316,250],fill=255)
pm=cv2.GaussianBlur(np.array(pm).astype(np.float32)/255,(0,0),4)*(cv2.erode(head.astype(np.uint8),np.ones((7,7),np.uint8))>0)
FACES={'p03':None,'p04':'face_happy','p05':'face_angry','p06':'face_focus','p07':'face_shout','p08':'face_effort','p09':'face_half','p10':'face_closed'}
g02=cv2.cvtColor(p02[...,:3],cv2.COLOR_RGB2GRAY)
for pk,name in FACES.items():
  if not name:continue
  pf=load(f'pieces/{pk}.png')
  M,ninl=sift_sim(pf,np.dstack([p02[...,:3],p02[...,3:]]) if False else p02,p02[...,3]>128)
  # sift_sim 은 art 를 4배로 키워 맞춤 — 조각끼리도 그대로 씀
  A3=np.vstack([M,[0,0,1]]);H3=np.vstack([Mh,[0,0,1]]);Mf=(H3@A3)[:2]
  wf=warp(pf,Mf).astype(np.float32)
  F=H.copy();k=(pm*(wf[...,3]/255))[...,None];F[...,:3]=H[...,:3]*(1-k)+cmatch(wf[...,:3])*k
  rgba=np.zeros_like(R);rgba[head]=F[head]
  x0,y0,x1,y1=hb;Image.fromarray(np.clip(rgba[y0:y1,x0:x1],0,255).astype(np.uint8)).save(f'basil_work/sky/rig/parts/{name}.png')
  parts[name]=dict(parts['head'],src=f'parts/{name}.png');print(pk,name,'inliers',ninl,'s',round(float(np.hypot(M[0,0],M[1,0])),3))
bones=[{'name':'root','parent':None,'pos':[0,0]},
 {'name':'head','parent':'root','pos':[MS['neck'][0]*SC-O[0],MS['neck'][1]*SC-O[1]],'part':'head'},
 {'name':'pony','parent':'root','pos':[KN[0]*SC-O[0],KN[1]*SC-O[1]],'part':'pony'}]
kit={'name':'basil-sky-kit','refOrigin':O,'parts':parts,'bones':bones,
 'faces':{'happy':'face_happy','angry':'face_angry','focus':'face_focus','shout':'face_shout','effort':'face_effort'},
 'blinkFaces':{'half':'face_half','closed':'face_closed'},
 'metrics':{'bodyHeight':int((473-67)*2),'note':'rig units; 머리 위(y67)~발바닥(473) ×2'},
 'gameRef':{'refOrigin':[225.0,473.0],'refScale':2.0,'refLift':0,'note':'게임 그림 char_0025.png(512) = 원화(ref512)'}}
json.dump(kit,open('basil_work/sky/rig/rig.json','w'),ensure_ascii=False,indent=1)
# ---------- cut (부위) · cut2 (걷기 · 펀치)
os.makedirs('source/cut_sky',exist_ok=True);os.makedirs('source/cut2_sky',exist_ok=True)
import shutil
S0=Bd.copy();S0[(lab==5)|(lab==6)]=0;Image.fromarray(S0.astype(np.uint8)).save('source/cut_sky/S0_00.png')   # 몸통 = 두 팔·머리·끈 지운 몸
hsvR=cv2.cvtColor(np.clip(R[...,:3],0,255).astype(np.uint8),cv2.COLOR_RGB2HSV)
skinR=(hsvR[...,0]>=4)&(hsvR[...,0]<=22)&(hsvR[...,1]>70)&(hsvR[...,2]>90)
armskin=FA&skinR&(XX<352);armskin=cv2.morphologyEx(armskin.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))>0
fg=FA&~armskin;n_,cc_,st_,_=cv2.connectedComponentsWithStats(fg.astype(np.uint8),8);fg=cc_==(1+np.argmax(st_[1:,4]))
G4=np.zeros_like(R);G4[fg]=R[fg];Image.fromarray(G4.astype(np.uint8)).save('source/cut_sky/S4_02.png')   # 먼 건틀릿 = 원화 픽셀 (시트 15번은 각도가 달라 테두리가 남음)
shutil.copy('pieces/p14.png','source/cut_sky/S1_00.png');shutil.copy('pieces/p13.png','source/cut_sky/S1_01.png')
for i in range(4):shutil.copy(f'pieces/walk{i}.png',f'source/cut2_sky/S4_{i:02d}.png')
shutil.copy('pieces/punch.png','source/cut2_sky/S1_00.png')
Mg=np.array(json.load(open('M_sift.json'))['p15'])
json.dump({'S0_00':[[1.0,0.0,0.0],[0.0,1.0,0.0]],'S4_02':[[1.0,0.0,0.0],[0.0,1.0,0.0]]},open('source/M_sky.json','w'))
def balls(p):
  a=np.array(Image.open(p))[...,3]>128;ys,xs=np.where(a);h=ys.max()-ys.min();cx=float(xs.mean())
  return [round(cx,1),round(ys.min()+h*.2,1)],[round(cx,1),round(ys.max()-h*.18,1)]
bF,eF=balls('pieces/p14.png');bN,eN=balls('pieces/p13.png')
pa=np.array(Image.open('pieces/punch.png'))[...,3]>128;xs=np.where(pa.any(0))[0]
cfg=json.load(open('source/cfg.json'))
cfg['sky']={'torsoCut':380,'farG':'S4_02','sole':24,'walkHip':{'N':-22,'F':16},
 'farUp':{'piece':'S1_00','ball':bF,'elbow':eF,'across':0.26,'ext':0.12},
 'nearUp':{'piece':'S1_01','ball':bN,'elbow':eN,'across':0.26,'ext':0.12},
 'restBend':{'N':-1,'F':1},'walk2':{'scale':0.28,'farShade':0.86},
 'punch':{'cuff':int(xs.max())-4,'overlap':6,'thickK':0.3}}
json.dump(cfg,open('source/cfg.json','w'),ensure_ascii=False,indent=1)
print('cfg sky',cfg['sky'])
# 점검 그림
v=np.full((512,512,3),255,np.uint8);col={1:(200,200,200),2:(40,60,160),3:(230,120,60),4:(60,180,90),5:(240,200,60),6:(200,80,200)}
for k,c in col.items():v[lab==k]=c
v[NA&(lab>0)]=(v[NA&(lab>0)]*.5+np.array([255,0,0])*.5).astype(np.uint8);v[FA&(lab>0)]=(v[FA&(lab>0)]*.5+np.array([0,0,255])*.5).astype(np.uint8)
Image.fromarray(v).resize((768,768),Image.NEAREST).save('labels_chk.png')
# ---------- 시트 살색 → 원화 살색 (살색 픽셀만, 곱셈)
def skinfix(path):
  im=np.array(Image.open(path).convert('RGBA')).astype(np.float32);hsv=cv2.cvtColor(np.clip(im[...,:3],0,255).astype(np.uint8),cv2.COLOR_RGB2HSV)
  sk=(im[...,3]>128)&(hsv[...,0]>=5)&(hsv[...,0]<=22)&(hsv[...,1]>80)&(hsv[...,2]>120)
  if sk.sum()<50:return
  g=mu_a/np.maximum(im[...,:3][sk].mean(0),1);band=cv2.GaussianBlur(sk.astype(np.float32),(0,0),1.2)[...,None]
  im[...,:3]=np.clip(im[...,:3]*(1-band)+im[...,:3]*g*band,0,255);Image.fromarray(im.astype(np.uint8)).save(path)
  print(' skinfix',path,g.round(3))
for pth in ['source/cut_sky/S1_00.png','source/cut_sky/S1_01.png','source/cut2_sky/S1_00.png']+[f'source/cut2_sky/S4_{i:02d}.png' for i in range(4)]:skinfix(pth)
cfg=json.load(open('source/cfg.json'));cfg['sky']['punch']['thickK']=0.16;cfg['sky']['punch']['cuff']=1012;json.dump(cfg,open('source/cfg.json','w'),ensure_ascii=False,indent=1)
