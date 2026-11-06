// Does Abyssal Cartographer play with the internet cut off?
// Every request that is not the file itself (or, in part 3, a model server on this computer) is blocked and recorded.
const { chromium } = require('playwright');
const http = require('http'); const path = require('path');
const FILE = process.argv[2], OUT = process.argv[3]; const SRC = 'file://' + FILE;
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);

async function sealed(b, extraAllow) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const outside = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (/^(file|data|blob):/.test(u)) return route.continue();
    if (extraAllow && u.startsWith(extraAllow)) return route.continue();
    outside.push(u); return route.abort();
  });
  ctx.on('request', r => { const u = r.url(); if (!u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:') && !(extraAllow && u.startsWith(extraAllow))) outside.push(u); });
  return { ctx, outside };
}
const errs = [];
async function page(ctx, hash, name) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await p.goto(SRC + (hash || '')); await p.waitForTimeout(1200); return p; }

(async () => {
  const b = await chromium.launch();

  // 1. A person running the game for friends, no internet at all
  let { ctx, outside } = await sealed(b);
  let p = await page(ctx, '', 'dm');
  ok(await p.isVisible('#roleDoor'), 'first-visit card appears');
  await p.click('#doorDM'); await p.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { await p.click('#btnRandom'); await p.waitForTimeout(250); }
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length) > 5, 'new dungeons generate');
  await p.click('#btnLight'); await p.waitForTimeout(1300);
  ok(/^(59|1:00)/.test(await p.textContent('#torchTime')) || /:59/.test(await p.textContent('#torchTime')), 'torch counts: ' + await p.textContent('#torchTime'));
  await p.click('#btnFog'); await p.waitForTimeout(200);
  const before = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  // switch to player view so only lit rooms draw, then click a doorway with a real mouse
  await p.click('#viewToggle button[data-view="player"]'); await p.waitForTimeout(300);
  const lit0 = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  const fr = await p.evaluate(() => { const f = document.querySelector('#mapSvg .frontier'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (fr) { await p.mouse.move(fr.x, fr.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(400); }
  const lit1 = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  ok(fr && lit1 > lit0, 'clicking a doorway lights the next room (' + lit0 + ' -> ' + lit1 + ')');
  await p.click('#viewToggle button[data-view="dm"]'); await p.waitForTimeout(200);
  await p.click('#btnQuire'); await p.waitForTimeout(300);
  ok(/You do not have to make anything up/.test(await p.textContent('#qSheet')), 'welcome letter opens');
  await p.keyboard.press('Escape');
  await p.click('#btnExport'); const [d1] = await Promise.all([p.waitForEvent('download'), p.click('#exportMenu button[data-x="dm"]')]);
  ok(/_DM\.html$/.test(d1.suggestedFilename()), 'DM guide downloads: ' + d1.suggestedFilename());
  await p.click('#btnExport'); const [d2] = await Promise.all([p.waitForEvent('download'), p.click('#exportMenu button[data-x="player"]')]);
  ok(/_players\.html$/.test(d2.suggestedFilename()), 'player handout downloads');
  await p.click('#btnExport'); await p.click('#exportMenu button[data-x="ai"]'); await p.waitForTimeout(300);
  ok(/THE DUNGEON:/.test(await p.evaluate(() => navigator.clipboard.readText())), 'AI prompt copies (pasting it needs internet, copying does not)');
  await p.click('.tabs button[data-tab="over"]'); await p.waitForTimeout(200);
  const gname = await p.evaluate(() => document.querySelector('.dun-title') ? document.querySelector('.dun-title').textContent : '');
  // the player display, second window, same computer
  await p.click('#btnExport'); await p.click('#exportMenu button[data-x="table"]'); await p.waitForTimeout(300);
  const href = await p.getAttribute('#tblOpenLink', 'href');
  const disp = await page(ctx, '', 'display'); await disp.goto(href); await disp.waitForTimeout(1500);
  const dname = await disp.evaluate(() => (document.querySelector('#tableName') || {}).textContent || '');

  ok(dname && dname === gname, 'player display opens and shows the same dungeon: ' + dname);
  await p.screenshot({ path: path.join(OUT, 'offline_dm.png') });
  ok(outside.length === 0, 'outside requests while running it for friends: ' + outside.length + (outside.length ? ' ' + JSON.stringify(outside.slice(0, 3)) : ''));
  await ctx.close();

  // 2. Playwright's own offline switch, belt and braces
  const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
  p = await c2.newPage(); p.on('pageerror', e => errs.push('offline-switch: ' + e.message)); await p.goto(SRC + '#grim-gate-63|1|4|1|m|oneshot|on|||5e|dm|01'); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length) > 5, 'with the browser fully offline the dungeon still builds');
  await c2.close();

  // 3. A player alone, game master on this computer (a stand-in for LM Studio), nothing else reachable
  const seen = [];
  const lm = http.createServer((req, res) => {
    const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json', ...h }); return res.end(JSON.stringify({ data: [{ id: 'local-gm-12b' }] })); }
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      seen.push(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'text/event-stream', ...h });
      const parts = ['The doors hang open. ', 'Cold air rises from below. ', '[Map: room 2]'];
      let i = 0; const t = setInterval(() => { if (i < parts.length) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); else { res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); } }, 10);
    });
  });
  await new Promise(r => lm.listen(0, '127.0.0.1', r)); const LM = 'http://127.0.0.1:' + lm.address().port;
  ({ ctx, outside } = await sealed(b, LM));
  p = await page(ctx, '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p', 'local');
  await p.selectOption('#gmProv', 'lmstudio'); await p.waitForTimeout(200);
  await p.fill('#gmUrl', LM + '/v1'); await p.click('#gmCheck'); await p.waitForTimeout(500);
  ok(/Connected\. 1 model/.test(await p.textContent('#tabBody')), 'the page finds the model on this computer');
  await p.click('#gmStart'); await p.waitForTimeout(300); await p.click('#gmSendBtn'); await p.waitForTimeout(800);
  ok(/Cold air rises/.test(await p.textContent('#gmLog')), 'the local game master answers');
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length) >= 2, 'its room tag lights the map');
  ok(seen.length === 1 && seen[0].max_tokens === undefined, 'no reply cap sent to a local model');
  await p.screenshot({ path: path.join(OUT, 'offline_local_gm.png') });
  ok(outside.length === 0, 'requests anywhere but this computer during local play: ' + outside.length + (outside.length ? ' ' + JSON.stringify(outside.slice(0, 3)) : ''));
  await ctx.close(); lm.close();

  await b.close();
  if (errs.length) log.push('PAGE ERRORS: ' + JSON.stringify(errs));
  console.log(log.join('\n')); console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
