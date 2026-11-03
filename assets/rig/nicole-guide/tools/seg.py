# cut arm layers (near = image-left arm, far = image-right arm) for every pose, plus sleeve overlays and an armless base body
import cv2,numpy as np,json
P=['idle','guide','wave','happy','sad']
IM={p:cv2.imread(f'k_{p}.png',-1) for p in P};H,W=IM['idle'].shape[:2]
def poly(pts):m=np.zeros((H,W),np.uint8);cv2.fillPoly(m,[np.int32(pts)],1);return m>0
def armcolor(img):
  hsv=cv2.cvtColor(img[...,:3],cv2.COLOR_BGR2HSV).astype(int);h,s,v=hsv[...,0],hsv[...,1],hsv[...,2]
  skin=(h>=2)&(h<=22)&(s>=55)&(v>=150)&(img[...,3]>128)
  dark=(v<110)&(img[...,3]>40)
  return skin,dark
ROI={
 'idle': {'near':[(170,476),(250,482),(262,505),(300,512),(392,505),(398,520),(424,520),(424,600),(290,602),(172,594)],
          'far':[(374,484),(416,484),(420,520),(418,568),(392,576),(364,570),(350,545),(356,508),(374,505)]},
 'wave': {'near':[(170,476),(250,482),(262,505),(300,512),(402,512),(402,594),(290,600),(172,594)],
          'far':[(396,452),(440,436),(437,390),(445,316),(540,286),(566,330),(524,414),(494,428),(476,484),(448,520),(398,516)]},
 'guide':{'near':[(170,476),(250,482),(262,505),(300,512),(402,512),(402,594),(290,600),(172,594)],
          'far':[(372,462),(410,450),(450,420),(470,398),(500,378),(562,398),(568,440),(522,452),(476,466),(442,502),(406,538),(372,538)]},
 'happy':{'near':[(170,476),(250,482),(262,470),(298,400),(301,362),(318,323),(332,317),(362,316),(380,350),(382,420),(368,460),(330,464),(300,472),(256,548),(198,548),(170,520)],
          'far':[(345,440),(374,404),(400,430),(440,470),(446,556),(392,556),(360,492)],
          'cluster':[(301,362),(318,323),(332,317),(362,316),(380,350),(382,420),(368,460),(330,464),(300,442),(292,400)]},
 'sad':  {'near':[(170,476),(250,482),(262,480),(288,430),(330,398),(388,398),(396,440),(382,484),(352,510),(300,510),(256,548),(198,550),(170,520)],
          'far':[(368,470),(394,438),(440,470),(446,556),(392,556),(372,505)],
          'cluster':[(286,420),(330,398),(388,400),(396,440),(382,482),(352,508),(300,508)]},
}
# joints (shoulder pivot inside the sleeve, elbow, wrist) in the shared master space
J={'idle': {'near':[(206,452),(208,540),(318,556)],'far':[(390,452),(402,530),(378,556)]},
   'wave': {'near':[(206,452),(208,540),(318,556)],'far':[(394,450),(438,497),(476,410)]},
   'guide':{'near':[(206,452),(208,540),(318,556)],'far':[(390,448),(400,508),(468,445)]},
   'happy':{'near':[(206,452),(214,526),(318,440)],'far':[(390,452),(400,528),(366,440)]},
   'sad':  {'near':[(206,452),(212,532),(312,486)],'far':[(390,452),(402,532),(380,474)]}}
SLV={'near':[(150,408),(200,394),(249,408),(253,500),(184,502),(150,478)],
     'far':{'idle':[(366,404),(404,400),(416,440),(414,496),(370,498)],'happy':[(366,404),(404,400),(418,440),(416,494),(370,498)],'sad':[(366,404),(404,400),(418,440),(416,494),(370,498)],
            'wave':[(366,398),(410,394),(434,440),(430,482),(404,502),(368,500)],'guide':[(366,398),(402,394),(414,440),(410,470),(392,480),(368,480)]}}
def cut(img,roi,excl=None):
  skin,dark=armcolor(img);r=poly(roi)
  if excl is not None:r&=~excl
  sk=skin&r;near=cv2.dilate(sk.astype(np.uint8),np.ones((7,7),np.uint8))>0
  m=(sk|(dark&near&r)).astype(np.uint8)
  m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
  # fill holes (gaps between fingers, inner lines)
  ff=m.copy();cv2.floodFill(ff,np.zeros((H+2,W+2),np.uint8),(0,0),1);m=m|(1-ff)
  m&=r.astype(np.uint8)
  n,cc,st,_=cv2.connectedComponentsWithStats(m);m=np.isin(cc,[k for k in range(1,n) if st[k,4]>150])
  return m
MASK={}
for p in P:
  img=IM[p];cl=poly(ROI[p]['cluster']) if 'cluster' in ROI[p] else None
  MASK[(p,'near')]=cut(img,ROI[p]['near'])
  MASK[(p,'far')]=cut(img,ROI[p]['far'],cl)
np.save('masks.npy',{f'{k[0]}_{k[1]}':v for k,v in MASK.items()},allow_pickle=True)
# visual check
vis=[]
for p in P:
  im=IM[p][...,:3].astype(float)*.55+40;a=IM[p][...,3:]/255.;im=im*a+np.array([60,40,40])*(1-a)
  im[MASK[(p,'near')]]=im[MASK[(p,'near')]]*.4+np.array([60,60,255])*.6
  im[MASK[(p,'far')]]=im[MASK[(p,'far')]]*.4+np.array([255,140,40])*.6
  for a_ in ['near','far']:
    for q in J[p][a_]:cv2.circle(im,q,4,(0,255,255),-1)
    cv2.polylines(im,[np.int32(J[p][a_])],False,(0,255,255),1)
  vis.append(im[300:640,140:620])
cv2.imwrite('seg_vis.png',np.vstack([np.hstack(vis[:3]),np.hstack(vis[3:]+[np.zeros_like(vis[0])])]).astype(np.uint8))
json.dump({'J':J,'SLV':SLV},open('joints.json','w'))
