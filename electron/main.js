/* Merge & Run La Mancha — Electron 실행 파일
   게임 폴더를 app://game/ 주소로 열어 줍니다.
   (file:// 로 열면 fetch()로 불러오는 배경음·효과음이 막혀서 이렇게 함) */
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');           // index.html 이 있는 폴더
const START = 'app://game/index.html';

// app:// 을 일반 웹 주소처럼 취급 → fetch · localStorage · iframe 같은 출처 접근이 http 서버와 똑같이 동작
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}]);

// 오디오 자동 재생 허용 (브라우저처럼 첫 클릭을 기다리지 않음)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 두 번 실행하면 새 창 대신 기존 창을 앞으로
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function serveGameFiles() {
  protocol.handle('app', async (req) => {
    try {
      const rel = decodeURIComponent(new URL(req.url).pathname);   // ?v=b13 같은 쿼리는 자동으로 빠짐
      const file = path.normalize(path.join(ROOT, rel));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {     // 폴더 밖 파일 차단
        return new Response('forbidden', { status: 403 });
      }
      return await net.fetch(pathToFileURL(file).toString());
    } catch (e) {
      console.error('[app://]', req.url, e);
      return new Response('not found', { status: 404 });
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#000000',
    title: 'Merge & Run La Mancha',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());

  // F11 = 전체 화면, F12 = 개발자 도구, Ctrl+R = 새로고침
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.key.toLowerCase() === 'r' && (input.control || input.meta)) { win.reload(); e.preventDefault(); }
  });

  // 게임 밖 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://game/')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });

  win.webContents.on('render-process-gone', (_e, d) => console.error('[renderer gone]', d.reason));
  win.loadURL(START);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { serveGameFiles(); createWindow(); });
app.on('window-all-closed', () => app.quit());
