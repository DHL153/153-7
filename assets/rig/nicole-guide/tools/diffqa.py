# render every held pose with all motion frozen and compare it to its source drawing, pixel by pixel
import sys,subprocess,time,socket,base64,os,json,cv2,numpy as np
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.environ.get('RIG','rig'));OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True);poses=sys.argv[2].split(',')
faces=sys.argv[3].split(',') if len(sys.argv)>3 else ['smile']
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.8)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':900,'height':1200});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(f'http://127.0.0.1:{port}/');pg.wait_for_function('window.__ready',timeout=60000);pg.evaluate("QA.manual=true;QA.diff()")
    for po in poses:
      for fa in faces:
        pg.evaluate(f"QA.anim.gesture('{po}',0.001);QA.anim.face('{fa}');for(let i=0;i<90;i++)QA.step(0.02)")
        u=pg.evaluate("document.getElementById('c').toDataURL('image/png')");open(f'{OUT}/{po}_{fa}.png','wb').write(base64.b64decode(u.split(',')[1]))
    print('errors',errs,pg.evaluate("document.getElementById('err').textContent"));b.close()
finally: srv.terminate()
