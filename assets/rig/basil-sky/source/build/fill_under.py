# 가까운 건틀릿에 가려진 반바지(원화에 없는 곳)를 시트 2(가까운 팔 지운 원화)로 채움 — 걸을 때 건틀릿이 움직여도 반바지에 구멍이 안 보이게
import sys,json,numpy as np,cv2
from PIL import Image
rd=sys.argv[1];kit=sys.argv[2];seg=sys.argv[3]
rig=json.load(open(rd+'/rig.json'));MS=json.load(open(kit+'/source/measure25.json'))
Bd=np.array(Image.open(kit+'/source/work/body512.png').convert('RGBA'));NA=np.load(seg+'/nearArm.npy');L=np.load(seg+'/labels.npy')
YY,XX=np.mgrid[0:512,0:512]
def below(p,q):(x1,y1),(x2,y2)=p,q;return (YY-y1)*(x2-x1)-(XX-x1)*(y2-y1)>0
zone=cv2.dilate(NA.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)&(Bd[...,3]>40)&(YY>=336)&~below((118,397),(202,423))&(XX<245)
p=rig['parts']['skirt'];im=np.array(Image.open(rd+'/'+p['src']).convert('RGBA'));pel=MS['hip']
x0=int(round(pel[0]-p['pivot'][0]));y0=int(round(pel[1]-p['pivot'][1]));h,w=im.shape[:2]
ys,xs=np.where(zone);px0,py0=min(0,xs.min()-x0),min(0,ys.min()-y0);px1,py1=max(w,xs.max()-x0+1),max(h,ys.max()-y0+1)
if px0<0 or py0<0 or px1>w or py1>h:
  big=np.zeros((py1-py0,px1-px0,4),np.uint8);big[-py0:-py0+h,-px0:-px0+w]=im;im=big;x0+=px0;y0+=py0;p['pivot']=[p['pivot'][0]-px0,p['pivot'][1]-py0]
cur=im[ys-y0,xs-x0];put=cur[:,3]<200
im[ys[put]-y0,xs[put]-x0]=Bd[ys[put],xs[put]]
Image.fromarray(im).save(rd+'/'+p['src']);print('fill_under skirt',int(put.sum()))
# hemFull 다시 (반바지 밑단이 넓어졌을 수 있음)
sa=im[...,3]>128;rig['hemFull']=[[x,int(np.where(sa[:,x])[0].max())] for x in range(sa.shape[1]) if sa[:,x].any()]
json.dump(rig,open(rd+'/rig.json','w'),ensure_ascii=False,indent=1)
open(rd+'/rig.def.js','w').write("// 자동 생성: rig.json을 JS로 감싼 것 (build7.py + fill_under.py)\nwindow.MR_RIG_DEFS=window.MR_RIG_DEFS||{};window.MR_RIG_DEFS['%s']=%s;\n"%(rig['name'],json.dumps(rig,ensure_ascii=False)))
