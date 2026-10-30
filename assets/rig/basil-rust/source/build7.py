# Basil rig v11b: shorts strands ride with the leg, head-trim strokes go to the far arm.
# Basil rig v11 (from v10): punch torso without the far-shoulder lump, jaw ink line restored.
# Basil rig v10 (from v9): mislabelled hem pixels go back to the shorts, legs bleed under the shorts with nearest skin. enclosed holes filled on every part, stand-leg thigh lives inside the shorts outline only.
# Basil rig v8 (from v7): clean legs (thigh extension under the shorts, no hem clip), shoulder-pivot straight punch.
# Basil rig v6: art pixels where the art shows them + Gemini part sheets (S0-S4) for everything hidden.
# usage: python3 -I build2.py rust|neon OUT_RIG_DIR
import sys,os,json,math,shutil,hashlib
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE);sys.path.insert(0,os.path.join(HERE,'..','brawl'))
import numpy as np,cv2
from PIL import Image
from place import placements
from align import load,warp
c,out=sys.argv[1],sys.argv[2];os.makedirs(out+'/parts',exist_ok=True)
kit=os.path.join(HERE,'..','basil_work',c);seg=os.path.join(HERE,'..','brawl','out_'+c);cut=os.path.join(HERE,'cut_'+c)
d,P=placements(kit);M_=json.load(open(os.path.join(HERE,f'M_{c}.json')))
R=load(f'{kit}/art/ref512.png');Bd=load(f'{kit}/source/work/body512.png')
L=np.load(f'{seg}/labels.npy');NA=np.load(f'{seg}/nearArm.npy');FA=np.load(f'{seg}/farArm.npy')
MS=json.load(open([f'{kit}/source/'+f for f in os.listdir(f'{kit}/source') if f.startswith('measure')][0]))
CFG=json.load(open(os.path.join(HERE,'cfg.json')))[c]
YY,XX=np.mgrid[0:512,0:512];K3=np.ones((3,3),np.uint8)
dil=lambda m,n:cv2.dilate(m.astype(np.uint8),K3,iterations=n)>0
O=d['refOrigin'];SC=2.0
SIL=(R[...,3]>40)   # art silhouette: hidden sheet pixels may only live inside it (idle = art exactly)
J={'pelvis':MS['hip'],'neck':MS['neck'],'SHf':MS['far']['SH'],'ELf':MS['far']['EL'],'fistF':MS['far']['fist'],
   'SHn':MS['near']['SH'],'ELn':MS['near']['EL'],'fistN':MS['near']['fist']}
for s,k in (('N','near'),('F','far')):
  for j in ('hip','knee','ankle'):J[j+s]=MS['legs'][k][j]
parts={}
def thigh_up(o,H,band_k=.10,keep=True):
  # grow a thigh upward from the first full-width row near the top, so the leg's top end always sits inside the shorts
  a=o[...,3]>128;ys=np.where(a.any(1))[0];top,bot=ys.min(),ys.max();wid=[a[y].sum() for y in range(top,bot+1)]
  ref=np.median(wid[:max(4,int((bot-top)*.35))]);yb=top
  for y in range(top,top+int((bot-top)*.4)):
    xs=np.where(a[y])[0]
    if len(xs) and (xs.max()-xs.min()+1)>=.9*ref and a[y,xs.min():xs.max()+1].mean()>.97: yb=y;break
  yb=min(yb+int(round((bot-top)*band_k*.3)),bot);row=o[yb].copy();xs=np.where(row[:,3]>128)[0]
  pad=H;n=np.zeros((o.shape[0]+pad,o.shape[1],4),np.float32);n[pad:]=o
  for y in range(pad+yb-1,max(-1,yb+pad-1-(H+(yb-top)))-1,-1):
    k=1.0;dst=n[y];m=(row[:,3]>128)&((dst[:,3]<200) if keep else True)
    dst[m]=row[m]
  return n,pad
def outline_cuts(rgba,zone,w=2.2):
  # draw the missing ink line on a part's edge inside 'zone' (edges that were cut against another layer)
  a=rgba[...,3]>128
  if not a.any():return rgba
  lum=rgba[...,:3]@np.array([.3,.59,.11]);dk=a&(lum<=np.percentile(lum[a],4))
  ink=np.median(rgba[dk][:,:3],0) if dk.sum()>5 else np.array([30.,18.,12.])
  if not np.all(np.isfinite(ink)):ink=np.array([30.,18.,12.])
  dt=cv2.distanceTransform(a.astype(np.uint8),cv2.DIST_L2,3);band=a&(dt<=w)&zone
  k=np.clip((w+.8-dt)/1.6,0,1)[band][:,None];o=rgba.astype(np.float32).copy();o[band,:3]=o[band,:3]*(1-k)+ink*k;return o
def clean_mask(m,k=5):
  op=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,np.ones((k,k),np.uint8))>0
  n_,cc_,st_,_=cv2.connectedComponentsWithStats(op.astype(np.uint8),8)
  if n_<2:return m
  big=cc_==(1+np.argmax(st_[1:,4]));return m&dil(big,2)
def fill_holes(rgba):
  # transparent pixels fully enclosed by the part (not reachable from the image border) = holes -> paint from neighbours
  al=(rgba[...,3]>8).astype(np.uint8);h,w=al.shape;ff=np.zeros((h+2,w+2),np.uint8);bg=1-al;reach=bg.copy()
  cv2.floodFill(reach,ff,(0,0),2);holes=(reach==1)
  if not holes.any():return rgba
  rgb=np.clip(rgba[...,:3],0,255).astype(np.uint8);src=rgb.copy();src[al==0]=0
  inp=cv2.inpaint(src,(holes|(al==0)&dil(holes,3)).astype(np.uint8),3,cv2.INPAINT_TELEA)
  o=rgba.astype(np.float32).copy();o[holes,:3]=inp[holes];o[holes,3]=255;return o
def save(n,rgba,pivot,scale=SC):
  rgba=fill_holes(rgba);a=rgba[...,3];ys,xs=np.where(a>8);x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
  Image.fromarray(rgba[y0:y1,x0:x1].astype(np.uint8)).save(f'{out}/parts/{n}.png')
  parts[n]={'src':f'parts/{n}.png','pivot':[round(float(pivot[0])-x0,2),round(float(pivot[1])-y0,2)],'scale':scale}
def over(dst,src,mask,feather=1.2):
  m=mask.astype(np.float32)
  if feather>0:m=cv2.GaussianBlur(m,(0,0),feather)*mask   # soft only inward
  o=dst.astype(np.float32).copy();a=m[...,None]
  o[...,:3]=dst[...,:3]*(1-a)+src[...,:3]*a;o[...,3]=np.maximum(dst[...,3],src[...,3]*m)
  return o
# ---------- torso: Gemini S0 under, art pixels where the art shows the torso
S0=warp(load(f'{cut}/S0_00.png'),np.array(M_['S0_00'])).astype(np.float32)
S0[YY>CFG['torsoCut']]=0;S0[~SIL]=0
lumA=R[...,:3].astype(np.float32)@np.array([.3,.59,.11],np.float32)
ringA=(L==1)&dil(NA|FA,1)&~(NA|FA)&(R[...,3]>0);ringD=ringA&(lumA<80)   # 1px ring round the arms: its ink belongs to the arm, the rest is torso art
ringN=ringD&dil(NA,1);ringF=ringD&dil(FA,1)&~ringN
artT=(L==1)&~(NA|FA)&~ringD&(R[...,3]>0)
tor=over(S0,R.astype(np.float32),artT)
save('torso',tor,J['pelvis'])
# punch torso: the far shoulder/upper-arm fill that lives under the art arm (inside FA) goes, thin outline strands near it go,
# and the vest/chest edge that bordered the arm gets its ink line -> the straight arm's own deltoid is the only shoulder
torP=tor.copy();ta=torP[...,3]>8;cutm=FA&ta;torP[cutm]=0
ta=torP[...,3]>8;opn=cv2.morphologyEx(ta.astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))>0
thin=ta&~opn&dil(FA,10);torP[thin]=0;torP=outline_cuts(torP,dil(FA|thin,3));save('torsoP',torP,J['pelvis'])
# ---------- shorts + stand legs: every art pixel lands on exactly one layer
skm=(L==2)&(R[...,3]>0);skm0=skm.copy()
op=cv2.morphologyEx(skm.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8))>0   # drop thin strands (outline remnants of the far leg)
n_,cc_,st_,_=cv2.connectedComponentsWithStats(op.astype(np.uint8),8);big=cc_==(1+np.argmax(st_[1:,4]))
skm=skm&dil(big,2)
luma=R[...,:3].astype(np.float32)@np.array([.3,.59,.11],np.float32)
LEG={}
for side,l in (('N',3),('F',4)):
  m0=(L==l)&(Bd[...,3]>40);mc=clean_mask(m0);strands=m0&~mc
  dark=mc&(luma<75)&dil((L==2)|strands,2)        # hem outline / cloth the segmentation gave to the leg -> belongs to the shorts
  LEG[side]=m0   # v8b: hem-outline strands stay on the standing leg (hidden while walking) - never dangle under the shorts
strS=skm0&~skm;taken=np.zeros_like(strS)
for side in ('N','F'):
  add=strS&dil(LEG[side],4)&~taken;LEG[side]|=add;taken|=add   # thin shorts-edge strands that are really the leg's outline ride with the leg
hsv=cv2.cvtColor(R[...,:3].astype(np.uint8),cv2.COLOR_RGB2HSV);skinC=(hsv[...,0]>=4)&(hsv[...,0]<=22)&(hsv[...,1]>90)&(hsv[...,2]>150)
leak=(YY>J['pelvis'][1]+12)&skinC&skm;n_,cc_,st_,_=cv2.connectedComponentsWithStats(leak.astype(np.uint8),8)
for i in range(1,n_):
  if st_[i,4]>=10:skm&=~(cc_==i)   # leg-skin blobs that leaked into the shorts label (single highlight pixels stay)
# crumbs: shorts pieces that are not part of the main shorts body (leg-outline bits) ride with the nearest stand leg,
# so they never float beside the shorts when the walking legs take over
n_,cc_,st_,_=cv2.connectedComponentsWithStats(skm.astype(np.uint8),8);mainC=1+np.argmax(st_[1:,4])
for i in range(1,n_):
  if i==mainC:continue
  cm=cc_==i;skm&=~cm;dN=cv2.distanceTransform((~LEG['N']).astype(np.uint8),cv2.DIST_L2,3)[cm].min();dF=cv2.distanceTransform((~LEG['F']).astype(np.uint8),cv2.DIST_L2,3)[cm].min()
  if min(dN,dF)<=8:LEG['N' if dN<=dF else 'F']|=cm
sk=np.zeros_like(R);sk[skm]=R[skm];save('skirt',sk,J['pelvis'])
# hem at full resolution (every pixel column of the saved shorts image): the walking legs are only drawn below it
_sa=np.array(Image.open(f'{out}/parts/skirt.png'))[...,3]>128;HEMFULL=[]
for x in range(_sa.shape[1]):
  col=np.where(_sa[:,x])[0]
  if len(col):HEMFULL.append([x,int(col.max())])
# ---------- stand legs: art pixels + the leg's own skin painted ~9px further UNDER the shorts (nearest skin colour, no smears)
# so the small leg/shorts shifts of breathing and punching never expose a cut edge; nothing is painted outside the shorts
for side,l in (('N',3),('F',4)):
  m=LEG[side];o=np.zeros_like(R).astype(np.float32);o[m]=R[m]   # the composite art itself: its ink where the hem crosses the leg (Bd had bare skin there)
  SOLID=skm&(R[...,3]>=250)   # only under fully opaque shorts pixels (never under their soft edge -> no skin halo)
  skinpx=m&(luma>=75);B=dil(m,9)&SOLID&~m
  if skinpx.any() and B.any():
    _,lab=cv2.distanceTransformWithLabels((~skinpx).astype(np.uint8),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    sy,sx=np.where(skinpx);k=lab[B]-1;o[B,:3]=R[sy[k],sx[k],:3];o[B,3]=255
  save('stand'+side,o,J['knee'+side])
def placed(bone):
  v=P[bone];im=np.array(Image.open(f"{kit}/rig/{d['parts'][v['part']]['src']}").convert('RGBA'))[...,3]>40
  m=np.zeros((512,512),bool);x0=int(round(v['ax']-v['pivot'][0]));y0=int(round(v['ay']-v['pivot'][1]));h,w=im.shape
  ys,xs=max(0,y0),max(0,x0);ye,xe=min(512,y0+h),min(512,x0+w);m[ys:ye,xs:xe]=im[ys-y0:ye-y0,xs-x0:xe-x0];return m
HEAD=dil(placed('head'),1)
# head + every face patch: ink line back on the jaw edge that was cut against the far arm, detached strokes dropped
hv=P['head']
def fix_head(path,want_removed=False):
  him=np.array(Image.open(path).convert('RGBA')).astype(np.float32);a_in=him[...,3]>40
  hx0=int(round(hv['ax']-hv['pivot'][0]));hy0=int(round(hv['ay']-hv['pivot'][1]));hh,hw=him.shape[:2]
  FAc=np.zeros((hh,hw),bool);ys0,xs0=max(0,hy0),max(0,hx0);ye0,xe0=min(512,hy0+hh),min(512,hx0+hw);FAc[ys0-hy0:ye0-hy0,xs0-hx0:xe0-hx0]=dil(FA,4)[ys0:ye0,xs0:xe0]
  al=him[...,3]>40;n_,cc_,st_,_=cv2.connectedComponentsWithStats(al.astype(np.uint8),8)
  for i in range(1,n_):
    if st_[i,4]<40:him[cc_==i]=0
  Z=cv2.dilate(FAc.astype(np.uint8),K3,iterations=6)>0;al=him[...,3]>40;E5=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7))   # 7px: smooth jaw contour, no zigzag
  if not (Z&al).any():return him
  bo=cv2.morphologyEx(al.astype(np.uint8),cv2.MORPH_OPEN,E5)>0;n_,cc_,st_,_=cv2.connectedComponentsWithStats(bo.astype(np.uint8),8)
  if n_<2:return him
  body=cc_==(1+np.argmax(st_[1:,4]));body=dil(body,1)&al;him[Z&al&~body]=0
  cl=cv2.morphologyEx(body.astype(np.uint8),cv2.MORPH_CLOSE,E5)>0;add=cl&~body&Z
  lumh=him[...,:3]@np.array([.3,.59,.11]);src=body&(lumh>90)
  if add.any() and src.any():
    _,lab=cv2.distanceTransformWithLabels((~src).astype(np.uint8),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL);sy,sx=np.where(src);k=lab[add]-1;him[add,:3]=him[sy[k],sx[k],:3];him[add,3]=255
  out_=outline_cuts(him,Z,2.6)
  if want_removed:
    rm=a_in&~(out_[...,3]>40);M=np.zeros((512,512),bool);M[ys0:ye0,xs0:xe0]=rm[ys0-hy0:ye0-hy0,xs0-hx0:xe0-hx0];return out_,M
  return out_
HEADFIXED,HEADRM=fix_head(f"{kit}/rig/{d['parts'][P['head']['part']]['src']}",True)
# ---------- far arm: gauntlet = Gemini S4 (art pixels where visible); upper arm = Gemini S1 (art skin where visible)
G=warp(load(f"{cut}/{CFG['farG']}.png"),np.array(M_[CFG['farG']])).astype(np.float32)
gm=G[...,3]>128
G[~SIL|FA]=0;G=over(G,R.astype(np.float32),FA&dil(gm,2)&(R[...,3]>0),0)
G[ringF]=R[ringF];G[HEAD]=0;save('farG',G,J['ELf'])
def upper(piece,ball,elbow,SH,EL,across,ext):
  im=load(f'{cut}/{piece}.png').astype(np.float32);b=np.array(ball,float);e=np.array(elbow,float);ax=e-b;ln=np.linalg.norm(ax);u=ax/ln;n=np.array([-u[1],u[0]])
  h,w=im.shape[:2];yy,xx=np.mgrid[0:h,0:w];pr=(xx-b[0])*u[0]+(yy-b[1])*u[1]
  pn=(xx-b[0])*u[1]*-1+(yy-b[1])*u[0];im[(pr>ln*(1+ext))|(np.abs(pn)>ln*.42)]=0
  sh=np.array(SH,float);el=np.array(EL,float);v=el-sh;L_=np.linalg.norm(v);U=v/L_;N=np.array([-U[1],U[0]])
  along=L_/ln
  # piece px -> art px: p' = SH + along*((p-b).u) U + across*((p-b).n) N
  A=np.stack([along*U[0]*u+across*N[0]*n,along*U[1]*u+across*N[1]*n]);t=sh-A@b
  Mx=np.hstack([A,t[:,None]]).astype(np.float32)
  o=cv2.warpAffine(im,Mx,(512,512),flags=cv2.INTER_AREA,borderValue=(0,0,0,0));o[~SIL]=0;return o
F=CFG['farUp'];Uf=upper(F['piece'],F['ball'],F['elbow'],J['SHf'],J['ELf'],F['across'],F['ext'])
skin=FA&~dil(gm,1)&(R[...,3]>0)
Uf=over(Uf,R.astype(np.float32),skin,0.8)
Uf[HEAD&~HEADRM]=0;Uf[HEADRM]=R[HEADRM];save('farUp',Uf,J['SHf'])   # the arm's ink strokes the head no longer carries
# ---------- near arm: gauntlet = art pixels (S4 near is drawn longer than the art); upper arm = Gemini S1 hidden behind it
ng=np.zeros_like(R);ng[NA|ringN]=R[NA|ringN]
r_,g_,b_=[R[...,i].astype(int) for i in range(3)]
if CFG.get('vestRGB')=='olive':cloth=NA&(g_>=r_-6)&(g_>b_+22)&(R[...,3]>128)
else:cloth=np.zeros((512,512),bool)
cloth=cloth&(YY<J['ELn'][1]+30)
n_,cc_,st_,_=cv2.connectedComponentsWithStats(cloth.astype(np.uint8),8)
keep=np.zeros_like(cloth)
for i in range(1,n_):
  if st_[i,4]>=25:keep|=cc_==i
vest=dil(keep,2)&NA&(R[...,3]>0)
vo=np.zeros_like(R);vo[vest]=R[vest];ng[vest]=0
save('nearG',ng,J['ELn'])
HASVEST=bool(vest.any())
if HASVEST:save('vestN',vo,J['pelvis'])
N_=CFG['nearUp'];Un=upper(N_['piece'],N_['ball'],N_['elbow'],J['SHn'],J['ELn'],N_['across'],N_['ext'])
Un[~(cv2.erode(NA.astype(np.uint8),K3,iterations=2)>0)]=0   # near upper arm lives only under the gauntlet (art shows none of it)
save('nearUp',Un,J['SHn'])
# ---------- walking legs: P4 = knee+lower leg+foot as ONE drawing per walk phase (contact, passing, push-off, swing)
cut2=os.path.join(HERE,'cut2_'+c);WK=CFG['walk2'];walkMeta=[]
for i in range(4):
  im=load(f'{cut2}/S4_{i:02d}.png').astype(np.float32)
  k=WK['scale'];h,w=im.shape[:2];sm=cv2.resize(im,(max(1,int(w*k*SC)),max(1,int(h*k*SC))),interpolation=cv2.INTER_AREA)
  al=sm[...,3]>128;ys,xs=np.where(al);top=ys.min();bot=ys.max()
  tx=float(xs[ys<top+max(3,int((bot-top)*.06))].mean());ty=float(top+(bot-top)*.04)
  sm,pad=thigh_up(sm,int(round((xs.max()-xs.min())*.85)),keep=False);ty+=pad;al=sm[...,3]>128;ys,xs=np.where(al);top=ys.min();bot=ys.max()
  sx=float(xs[ys>=bot-3].mean());sy=float(bot)
  for sd in ('N','F'):
    o=sm.copy()
    if sd=='F':o[...,:3]*=WK.get('farShade',.86)
    Image.fromarray(o.astype(np.uint8)).save(f'{out}/parts/walk{sd}{i}.png');parts[f'walk{sd}{i}']={'src':f'parts/walk{sd}{i}.png','pivot':[round(tx,2),round(ty,2)],'scale':1.0}
  walkMeta.append({'sole':[round(sx-tx,2),round(sy-ty,2)]})
# ---------- straight punch: P1 straight arm skin (scaled to the art) + the art far gauntlet; pivot = elbow
P1=load(f'{cut2}/S1_00.png').astype(np.float32);PK=CFG['punch']
pm=P1[...,3]>128;cx=PK['cuff'];P1[:,cx+PK['overlap']:]=0
yc=float(np.where(pm[:,max(0,cx-20)])[0].mean())
gH=float((G[...,3]>128).any(1).sum());thick=PK['thickK']*gH;cur=float(np.ptp(np.where(pm[:,cx-30])[0]))
ks=thick/cur;th=math.atan2(J['fistF'][1]-J['ELf'][1],J['fistF'][0]-J['ELf'][0]);THG=th
pm=P1[...,3]>128;xs_=np.where(pm.any(0))[0];x0=xs_.min()
rootT=float(np.ptp(np.where(pm[:,min(x0+12,cx)])[0]));xj=x0+.45*rootT;yj=float(np.where(pm[:,int(xj)])[0].mean())   # shoulder joint = centre of the sheet arm's own deltoid
a1=math.atan2(yc-yj,cx-xj);c1,s1=math.cos(-a1),math.sin(-a1);A=np.array([[c1,-s1],[s1,c1]])*ks
skinLen=float(math.hypot(cx-xj,yc-yj)*ks);PAD=40;t=np.array([PAD,PAD+60])-A@np.array([xj,yj]);Mx=np.hstack([A,t[:,None]]).astype(np.float32)
sk=cv2.warpAffine(P1,Mx,(int(skinLen+2*PAD+40),200),flags=cv2.INTER_AREA,borderValue=(0,0,0,0))   # arm lies along +x, pivot = shoulder
save('punchSkin',sk,(PAD,PAD+60));pg=G.copy()
pa_=(pg[...,3]>40).astype(np.uint8);n_,cc_,st_,_=cv2.connectedComponentsWithStats(pa_,8)
if n_>1:pg[(cc_!=(1+np.argmax(st_[1:,4])))&(pa_>0)]=0   # moving gauntlet = the gauntlet only (no ink crumbs from the shoulder ring)
save('punchG',pg,J['ELf'])
# ---------- head, pony, headB, faces from the kit (registered to its head)
for k in ['head','pony','headB']+list(d['faces'].values())+list(d.get('blinkFaces',{}).values()):
  if k in d['parts']:shutil.copy(f"{kit}/rig/{d['parts'][k]['src']}",f'{out}/parts/{k}.png');parts[k]=dict(d['parts'][k])
for k in [hv['part']]+list(d['faces'].values())+list(d.get('blinkFaces',{}).values()):
  if k in d['parts']:Image.fromarray(np.clip(fix_head(f"{kit}/rig/{d['parts'][k]['src']}"),0,255).astype(np.uint8)).save(f"{out}/parts/{k}.png")
# ---------- bones (rig units = art px x2; root = refOrigin)
r2=lambda p,q:[round((p[0]-q[0])*SC,2),round((p[1]-q[1])*SC,2)]
pel=J['pelvis'];bones=[{'name':'root','parent':None,'pos':[0,0]},{'name':'hip','parent':'root','pos':[round(pel[0]*SC-O[0],2),round(pel[1]*SC-O[1],2)]}]
B=lambda n,p,pos,part=None:bones.append(dict(name=n,parent=p,pos=pos,**({'part':part} if part else {})))
for s in ('F','N'):
  B('thigh'+s,'hip',r2(J['hip'+s],pel));B('shin'+s,'thigh'+s,r2(J['knee'+s],J['hip'+s]));B('foot'+s,'shin'+s,r2(J['ankle'+s],J['knee'+s]))
  B('walk'+s,'root',[0,0],'walk'+s+'0');B('stand'+s,'shin'+s,[0,0],'stand'+s)
B('skirt','hip',[0,0],'skirt');B('torso','hip',[0,0],'torso');B('head','torso',r2(J['neck'],pel),'head')
if 'pony' in P:B('pony','head',r2((P['pony']['ax'],P['pony']['ay']),J['neck']),'pony')
if 'headB' in P:B('headB','head',[0,0],'headB')
B('armF','torso',r2(J['SHf'],pel));B('farUp','armF',[0,0],'farUp');B('foreF','armF',r2(J['ELf'],J['SHf']),'farG');B('fistF','foreF',r2(J['fistF'],J['ELf']))
B('punch','torso',r2(J['SHf'],pel));bones[-1]['rot']=round(THG,4);B('punchSkin','punch',[0,0],'punchSkin');B('punchG','punch',[round(skinLen*SC,2),0],'punchG');bones[-1]['rot']=round(-THG,4);B('fistP','punchG',r2(J['fistF'],J['ELf']))
if HASVEST:B('vestN','torso',[0,0],'vestN')
B('armU','torso',r2(J['SHn'],pel));B('nearUp','armU',[0,0],'nearUp');B('armL','armU',r2(J['ELn'],J['SHn']),'nearG');B('fistN','armL',r2(J['fistN'],J['ELn']))
legs={'walkLen':[60,60],'sole':0,'walkHip':CFG['walkHip'],'walk':walkMeta,'punchTheta':round(THG,4),'skinLen':round(skinLen*SC,1)}
draw=['walkF','standF','walkN','standN','torso','skirt']+(['headB'] if 'headB' in P else [])+['farUp','punchSkin','foreF','punchG','head']+(['pony'] if 'pony' in P else [])+['nearUp','armL']+(['vestN'] if HASVEST else [])
br=json.load(open(os.path.join(HERE,'motion5.json')));br['legs']=legs
rig={'name':'basil-'+c,'version':'','units':'rig px (원화 512 ×2)','refOrigin':O,'refScale':1.0,'refLift':0,'parts':parts,'bones':bones,'draw':draw,
 'hemClip':['walkF','walkN'],'hemFull':HEMFULL,'hidden':['punchSkin','punchG'],'faces':d['faces'],'blinkFaces':d.get('blinkFaces',{}),
 'legs':{'boot':{'part':'standN'},'near':{'x':0},'far':{'x':0},'hip':[0,0],'thigh':1,'shin':1},'brawler':br,'metrics':d.get('metrics'),
 'ui':{'attack':'smash','touch':'hop'},'gameRef':d.get('gameRef'),
 'note':f'basil-{c} v11: 보이는 곳 = 원화 픽셀, 가려진 곳 = 제미나이 부위 시트(S0 몸통·S1 윗팔·S2 다리·S4 먼 건틀릿). 다리 = 2뼈 IK + 서 있는 원화 다리/걷는 시트 다리 교차, 팔 = 어깨+팔꿈치 2뼈. rig.js brawler 모드'}
h=hashlib.md5(json.dumps(rig,sort_keys=True).encode()+b''.join(open(f'{out}/parts/'+f,'rb').read() for f in sorted(os.listdir(out+'/parts')))).hexdigest()[:8];rig['version']=h
json.dump(rig,open(f'{out}/rig.json','w'),ensure_ascii=False,indent=1)
open(f'{out}/rig.def.js','w').write("// 자동 생성: rig.json을 JS로 감싼 것 (brawl2/build3.py)\nwindow.MR_RIG_DEFS=window.MR_RIG_DEFS||{};window.MR_RIG_DEFS['basil-%s']=%s;\n"%(c,json.dumps(rig,ensure_ascii=False)))
print(c,h,len(parts),'parts')
