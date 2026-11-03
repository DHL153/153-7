# motion frames at 1:1 scale (art space), with all motion on
import sys,subprocess,time,socket,base64,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.environ.get('RIG','rig'));OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True);plan=json.loads(sys.argv[2])
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.8)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':900,'height':1200});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(f'http://127.0.0.1:{port}/');pg.wait_for_function('window.__ready',timeout=60000)
    pg.evaluate("QA.manual=true;QA.diff();QA.anim.still=false")
    for ri,(name,js,n,every) in enumerate(plan):
      pg.evaluate(js)
      for i in range(n):
        pg.evaluate(f"for(let i=0;i<{max(1,int(every/0.02))};i++)QA.step({every/max(1,int(every/0.02))})")
        u=pg.evaluate("document.getElementById('c').toDataURL('image/png')");open(f'{OUT}/{ri:02d}{name}_{i:02d}.png','wb').write(base64.b64decode(u.split(',')[1]))
    print('errors',errs);b.close()
finally: srv.terminate()
