# 빌드 결과 → 저장소(assets/rig/basil-sky) + 게임(mrstage/assets/rig/basil-sky/rig.def.js, 조각 webp data URI)
import json,base64,io,os,shutil,sys
from PIL import Image
S=sys.argv[1];rd=S+'/skybuild/out_sky/rig';rig=json.load(open(rd+'/rig.json'))
dst='assets/rig/basil-sky';shutil.rmtree(dst+'/parts',ignore_errors=True);os.makedirs(dst+'/parts')
for f in os.listdir(rd+'/parts'):shutil.copy(rd+'/parts/'+f,dst+'/parts/'+f)
shutil.copy(rd+'/rig.json',dst+'/rig.json');shutil.copy(rd+'/rig.def.js',dst+'/rig.def.js')
src=dst+'/source/build';os.makedirs(src,exist_ok=True)
for f in ['build_kit.py','masks.py','cut_sheets.py','rebuild.sh','install.py','M_head.json','M_sift.json']:shutil.copy(S+'/skybuild/'+f,src+'/'+f)
for f in ['fill_under.py','cfg.json','M_sky.json']:shutil.copy(S+'/skybuild/source/'+f,src+'/'+f)
shutil.copy(S+'/skybuild/basil_work/sky/source/measure25.json',dst+'/source/measure25.json')
shutil.copy(S+'/sky25/s1b.png',dst+'/source/sheets/S1_parts.png')
g=json.loads(json.dumps(rig))
for k,p in g['parts'].items():
  b=io.BytesIO();Image.open(rd+'/'+p['src']).convert('RGBA').save(b,'WEBP',quality=92,method=6);p['src']='data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
g['cutHold']=0.22;g['brawler']['run']['maxStride']=80   # 게임 값 = 15 네온 바실과 같게
os.makedirs('mrstage/assets/rig/basil-sky',exist_ok=True)
open('mrstage/assets/rig/basil-sky/rig.def.js','w').write("window.MR_RIG_DEFS=window.MR_RIG_DEFS||{};window.MR_RIG_DEFS['basil-sky']="+json.dumps(g,ensure_ascii=False)+";\n")
print('installed',g['version'],os.path.getsize('mrstage/assets/rig/basil-sky/rig.def.js'))
