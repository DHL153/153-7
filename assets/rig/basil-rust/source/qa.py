# Full motion QA: renders every scenario frame on a transparent canvas, then checks
#  - detached pieces (alpha components that are not the body)  - enclosed holes (background showing inside the body)
#  - joint angles (thigh/shin/foot/arm ranges) for twists / IK flips
import sys,subprocess,time,socket,base64,os,json,io
import numpy as np,cv2
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','brawl2'))
kit,name,pre=sys.argv[1],sys.argv[2],sys.argv[3]
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.8)
JS=r"""([sc])=>{H.reset();const an=H.an,r=H.rig;let vx=0;const out=[];const K=.6;
 const BONES=['thighN','shinN','footN','thighF','shinF','footF','armF','foreF','armU','armL','punch','torso','head','walkN','walkF'];
 const shot=(tag,facing)=>{const c=document.createElement('canvas');c.width=1100;c.height=900;const g=c.getContext('2d');r.draw(g,550,840,K,facing||1);
   const ang={};for(const b of BONES)if(r.by[b])ang[b]=+r.by[b].ar.toFixed(3);out.push({tag,img:c.toDataURL('image/png'),ang,act:an.act?an.act.name:null,alpha:JSON.stringify(r.alpha),swap:JSON.stringify(r.swap)})};
 const step=(dt,target,facing)=>{vx+=(target-vx)*(1-Math.exp(-6*dt));an.update(dt,{vx,facing:facing||1})};
 const run=(secs,target,every,tag,facing,act)=>{const n=Math.round(secs/ (1/120));for(let i=0;i<n;i++){if(act&&i===act[0])an.attack(act[1]);step(1/120,target,facing);if(i%every===0)shot(tag,facing)}};
 if(sc==='idle'){run(1,0,12,'idle');for(const f of ['happy','angry','focus','shout','effort',null]){an.setExpression(f);run(.3,0,18,'face_'+f)}an.setExpression(null);run(5,0,20,'blink')}
 if(sc==='walk'){run(.6,0,30,'pre');run(2.2,260,6,'walk260');run(1.2,0,6,'stop');run(1.6,700,5,'run700');run(1.2,0,6,'stop2')}
 if(sc==='punch'){run(.5,0,30,'pre');run(.8,0,3,'punch',1,[0,'smash']);run(.4,0,6,'after');run(.8,0,3,'punch2',1,[0,'smash'])}
 if(sc==='walkpunch'){run(1.2,260,20,'w');run(.9,260,3,'walkpunch',1,[0,'smash']);run(.8,260,6,'walkafter')}
 if(sc==='hop'){run(.5,0,30,'pre');run(.7,0,3,'hop',1,[0,'hop']);run(.6,260,6,'walk');run(.7,260,3,'walkhop',1,[0,'hop'])}
 if(sc==='turn'){run(.5,0,30,'pre');run(1.2,0,6,'idleL',-1);run(1.2,260,6,'walkL',-1);run(.8,0,3,'punchL',-1,[0,'smash']);run(.8,-260,6,'walkBack',-1)}
 return out}"""
res={}
try:
  with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(f'http://127.0.0.1:{port}/harness.html');pg.evaluate(f"H.load('{kit}','{name}')")
    for sc in ['idle','walk','punch','walkpunch','hop','turn']:res[sc]=pg.evaluate(JS,[sc])
    print('page errors',errs);b.close()
finally: srv.terminate()
os.makedirs(pre,exist_ok=True);rep={}
base=None
for sc,frames in res.items():
  for i,f in enumerate(frames):
    im=np.array(Image.open(io.BytesIO(base64.b64decode(f['img'].split(',')[1]))).convert('RGBA'));a=(im[...,3]>40).astype(np.uint8)
    n,cc,st,_=cv2.connectedComponentsWithStats(a,8);main=1+np.argmax(st[1:,4]) if n>1 else 0
    det=[int(st[k,4]) for k in range(1,n) if k!=main and st[k,4]>=3]
    bg=(1-a).astype(np.uint8);ff=np.zeros((a.shape[0]+2,a.shape[1]+2),np.uint8);reach=bg.copy();cv2.floodFill(reach,ff,(0,0),2)
    hn,hcc,hst,_=cv2.connectedComponentsWithStats((reach==1).astype(np.uint8),8);holes=[int(hst[k,4]) for k in range(1,hn) if hst[k,4]>=3]
    f['det']=det;f['holes']=holes;f['png']=f'{pre}/{sc}_{i:03d}.png';Image.fromarray(im).save(f['png'])
    del f['img']
json.dump(res,open(f'{pre}/qa.json','w'),ensure_ascii=False)
for sc,frames in res.items():
  dmax=max([sum(f['det']) for f in frames]+[0]);hmax=max([sum(f['holes']) for f in frames]+[0])
  angs={};[angs.setdefault(k,[]).append(v) for f in frames for k,v in f['ang'].items()]
  rng={k:(round(min(v),2),round(max(v),2)) for k,v in angs.items()}
  bad=[(f['tag'],i,f['det'],f['holes']) for i,f in enumerate(frames) if sum(f['det'])>0 or sum(f['holes'])>0]
  print(f'== {sc}: {len(frames)} frames, max detached px {dmax}, max hole px {hmax}');print('   angles',rng);print('   flagged',bad[:12],'...' if len(bad)>12 else '')
