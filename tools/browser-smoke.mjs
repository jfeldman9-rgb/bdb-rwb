// Headless Chrome smoke. Launches its own static server and Chrome.
// node tools/browser-smoke.mjs
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
};
// BDB_SMOKE_DIR overrides the screenshot directory. The default is repo-local
// so a laptop without /opt/cursor/artifacts can still run the smoke.
const shotDir = process.env.BDB_SMOKE_DIR || join(root, 'docs/shots/browser-smoke');

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(root, pathname));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      const info = await stat(file);
      const type = MIME[extname(file)] || 'application/octet-stream';
      const range = req.headers.range;
      const common = { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
      // Chrome will not seek a clip (the Dad frame sits at 38 s) unless the host answers Range.
      if (range && info.isFile()) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!m) { res.writeHead(416, common); res.end(); return; }
        const start = m[1] === '' ? Math.max(0, info.size - Number(m[2] || 0)) : Number(m[1]);
        const end = m[2] === '' || m[1] === '' ? info.size - 1 : Math.min(info.size - 1, Number(m[2]));
        if (start > end || start >= info.size) { res.writeHead(416, { ...common, 'content-range': `bytes */${info.size}` }); res.end(); return; }
        res.writeHead(206, { ...common, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { ...common, 'content-length': info.size });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404); res.end('missing');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function waitJson(port) {
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch { /* chrome still booting */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome did not open its debug port');
}

const server = await startServer();
const httpPort = server.address().port;
const debugPort = 9333;
const chrome = spawn(process.env.CHROME || '/usr/bin/google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=/tmp/bdb-chrome-${debugPort}`,
  '--no-first-run', '--disable-extensions', 'about:blank',
], { stdio: 'ignore' });
let ws;
try {
  await waitJson(debugPort);
  const base = `http://127.0.0.1:${debugPort}`;
  const origin = `http://127.0.0.1:${httpPort}`;
  const tab = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0; const pending = new Map(), errors = [];
  ws.addEventListener('message', ({ data }) => {
    const m = JSON.parse(data);
    if (m.id) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) errors.push(`${m.params.response.status} ${m.params.response.url}`);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(expression, ms = 30000) { const end = Date.now() + ms; while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(100); } throw Error(`Timed out: ${expression}\n${errors.join('\n')}`); }
  async function shot(name) {
    await sleep(150);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${shotDir}/${name}.png`, Buffer.from(data, 'base64'));
  }
  await mkdir(shotDir, { recursive: true });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/?nocutscenes=1` });
  await waitFor('window.__game?.scene.isActive("title") && !document.getElementById("title").hidden');
  await shot('title');
  console.log('Title ready', await evaluate('({canvas:!!document.querySelector("canvas"),version:Phaser.VERSION})'));
  await send('Page.navigate', { url: `${origin}/?demo=1&nocutscenes=1` });
  await waitFor('window.__game?.scene.isActive("gameplay") && !!window.__game.scene.getScene("gameplay").hud');
  const boot = await evaluate(`(()=>{const s=window.__game.scene.getScene('gameplay');const card=document.getElementById('startup-error');return {started:!!s.started,stage:s.world.stageNo,elapsed:s.world.elapsed,cardHidden:!card||card.hidden};})()`);
  assert.equal(boot.started, true);
  assert.equal(boot.stage, 1);
  assert.equal(boot.cardHidden, true);
  await sleep(400);
  const advanced = await evaluate(`(()=>{const s=window.__game.scene.getScene('gameplay');const card=document.getElementById('startup-error');return {started:!!s.started,elapsed:s.world.elapsed,cardHidden:!card||card.hidden,stage:s.world.stageNo};})()`);
  assert.equal(advanced.started, true);
  assert.equal(advanced.cardHidden, true);
  assert.equal(advanced.stage, 1);
  assert.ok(advanced.elapsed > boot.elapsed, `frames did not advance (${boot.elapsed} -> ${advanced.elapsed})`);
  await shot('stage1');
  const gameplayShot = process.env.BDB_SMOKE_GAMEPLAY || join(shotDir, 'gameplay.png');
  await mkdir(dirname(gameplayShot), { recursive: true });
  await copyFile(`${shotDir}/stage1.png`, gameplayShot);
  let bossShot = false, splitShot = false, stampedeShot = false, status;
  for (let i = 0; i < 600; i++) {
    status = await evaluate(`(()=>{const s=window.__game.scene.getScene('gameplay');if(!s?.hud||s.switching||!s.scene.isActive())return {loading:true};let stampede=null;for(let i=0;i<90&&!s.switching&&!s.world.victory;i++){s.update(0,1000/60);const fx=s.papiFX;if(!window.__stampedeShot&&fx&&fx.runners.length>=14&&fx.age>0.8&&fx.age<1.35){window.__stampedeShot=true;stampede={age:+fx.age.toFixed(3),n:fx.runners.length,x:Math.round(fx.runners[0].x)};break;}}const card=document.getElementById('startup-error');return {stage:s.world.stageNo,zone:s.world.zoneIndex,boss:s.world.bossActive,phase:s.world.wingmen?.phase,victory:s.world.victory,elapsed:s.world.elapsed,started:!!s.started,cardHidden:!card||card.hidden,stats:s.world.stats,stampede};})()`);
    if (status.stampede && !stampedeShot) {
      await shot('stampede');
      stampedeShot = true;
      console.log('Stampede mid-sweep', JSON.stringify(status.stampede));
    }
    if (status.cardHidden === false || status.started === false) throw new Error('gameplay dropped: ' + JSON.stringify(status));
    if (status.boss && !bossShot) { await shot('boss'); bossShot = true; }
    if (status.stage === 3 && status.phase === 3 && !splitShot) { await shot('wingmen'); splitShot = true; }
    if (status.victory) break;
    await sleep(30);
  }
  if (!status?.victory) throw new Error('Browser demo failed to clear: ' + JSON.stringify(status));
  if (!stampedeShot) throw new Error('Papacito stampede was not on screen mid-sweep');
  await waitFor('!document.getElementById("victory").hidden');
  await shot('victory');
  console.log('Campaign complete', JSON.stringify(status));
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage' });
  await send('Page.navigate', { url: `${origin}/?touch=1&nocutscenes=1&autostart=1` });
  await waitFor('window.__game?.scene.isActive("gameplay") && !!window.__game.scene.getScene("gameplay").hud');
  await evaluate(`(()=>{window.__game.scene.getScene('gameplay').game.inp.enableTouch();})()`);
  const points = await evaluate(`(()=>{const point=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x+r.width*.8,y:r.y+r.height*.5};};return[point('stick'),point('tbFire')];})()`);
  const before = await evaluate('({x:window.__game.campaign.bob.x,shots:window.__game.campaign.stats.shots})');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.map((p, id) => ({ ...p, id, radiusX: 6, radiusY: 6, force: 1 })) });
  await sleep(800);
  const held = await evaluate('({x:window.__game.campaign.bob.x,shots:window.__game.campaign.stats.shots,held:window.__game.inp.down("fire"),difficulty:window.__game.campaign.difficultyKey})');
  assert.ok(held.x > before.x + 30);
  assert.ok(held.shots > before.shots);
  assert.equal(held.held, true);
  assert.equal(held.difficulty, 'story');
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(100);
  assert.equal(await evaluate('window.__game.inp.down("fire")'), false);
  await shot('touch-stage1');
  await evaluate('document.getElementById("pause").click()');
  const pausedAt = await evaluate('window.__game.campaign.elapsed');
  await sleep(150);
  assert.equal(await evaluate('window.__game.campaign.elapsed'), pausedAt);
  await evaluate('document.getElementById("pause").click()');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'orientation', value: 'portrait' }, { name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
  await sleep(100);
  assert.equal(await evaluate('getComputedStyle(document.getElementById("rotate")).display'), 'flex');
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'orientation', value: 'landscape' }, { name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
  await sleep(100);
  const touch = await evaluate(`({touch:document.body.classList.contains('touch'),buttons:[...document.querySelectorAll('.tb')].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()})`);
  console.log('Touch layout', JSON.stringify(touch));
  await evaluate(`window.__bdbTestGL=window.__game.renderer.gl.getExtension('WEBGL_lose_context');window.__bdbTestGL.loseContext()`);
  await waitFor('window.__game.isPaused && !document.getElementById("graphics-notice").hidden');
  await evaluate('window.__bdbTestGL.restoreContext()');
  await waitFor('!window.__game.isPaused && document.getElementById("graphics-notice").hidden');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Page.navigate', { url: `${origin}/?cutscenes=1` });
  await waitFor('window.__game?.scene.isActive("title") && !document.getElementById("title").hidden');
  await evaluate('document.getElementById("start").click()');
  await waitFor('!!document.querySelector("#bdb-cutscene video")');
  const sought = await evaluate(`(() => new Promise((resolve) => {
    const v = document.querySelector('#bdb-cutscene video');
    const end = performance.now() + 8000;
    const step = () => {
      if (v.readyState >= 1 && v.duration > 50 && Math.abs(v.currentTime - 38) > 0.4) {
        try { v.pause(); v.currentTime = 38; } catch (e) { /* retry */ }
      }
      if (v.currentTime > 30) { try { v.pause(); } catch (e) { /* shot is the still */ } resolve(v.currentTime); return; }
      if (performance.now() > end) { resolve(v.currentTime); return; }
      setTimeout(step, 100);
    };
    step();
  }))()`);
  await shot('intro-dad');
  console.log('Intro Dad frame at', sought);
  const video = await evaluate('({inline:document.querySelector("video").playsInline,src:document.querySelector("video").src,time:document.querySelector("video").currentTime})');
  assert.equal(video.inline, true);
  assert.match(video.src, /intro_v3\.mp4\?v=b67d6176/);
  assert.doesNotMatch(video.src, /opening\.mp4/);
  assert.ok(video.time > 30, `intro did not seek to Dad (${video.time})`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await waitFor('window.__game?.scene.isActive("gameplay") && !document.querySelector("#bdb-cutscene")');
  const playing = await evaluate(`(()=>{const s=window.__game.scene.getScene('gameplay');const card=document.getElementById('startup-error');return {started:!!s?.started,stage:s?.world?.stageNo,cardHidden:!card||card.hidden};})()`);
  assert.equal(playing.started, true);
  assert.equal(playing.stage, 1);
  assert.equal(playing.cardHidden, true);
  const report = {
    browser: 'Chromium, SwiftShader (not hardware performance evidence)',
    httpStatus: (await fetch(`${origin}/`)).status,
    campaign: status, touch,
    checks: { started: true, framesAdvanced: true, noErrorCard: true, stage1: true, introV3: true, simultaneousTouch: true, touchRelease: true, storyDefault: true, pauseFreezes: true, portraitRotate: true, graphicsRecovery: true, keyboardVideoSkip: true },
    errors,
    screenshots: ['title', 'stage1', 'boss', 'wingmen', 'victory', 'touch-stage1', 'stampede', 'intro-dad'].map((x) => `${shotDir}/${x}.png`),
  };
  await writeFile(`${shotDir}/browser-report.json`, JSON.stringify(report, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Browser smoke passed, zero runtime/HTTP errors.');
} finally {
  try { ws?.close(); } catch { /* already closed */ }
  chrome.kill('SIGKILL');
  await new Promise((r) => server.close(r));
}
