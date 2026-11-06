// v3.0.2: a local game master reached from the website address (https) and from the saved copy (file://).
// The page is served at its real https address by intercepting the request; the "LM Studio" is a local stand-in.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const bytes = fs.readFileSync(FILE);
const SITE = 'https://dabirdwell.github.io/abyssal-cartographer/';
const HASH = '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p';
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const errs = [];

function lmServer(opts) {
  opts = opts || {};
  const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-private-network': 'true' };
  const srv = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, H); return res.end(); }
    if (req.url === '/v1/models') { setTimeout(() => { res.writeHead(200, { 'content-type': 'application/json', ...H }); res.end(JSON.stringify({ data: [{ id: 'local-gm-12b' }] })); }, opts.modelsDelay || 0); return; }
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'text/event-stream', ...H });
        const parts = ['The doors hang open. ', 'Cold air rises from below. ', '[Map: room 2]']; let i = 0;
        const t = setInterval(() => { if (i < parts.length) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); else { res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); } }, 10);
      }, opts.chatDelay || 0);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/v1' })));
}

async function ctxAt(b, o) {
  o = o || {}; const permState = o.permState;
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  if (o.grant) await ctx.grantPermissions(['local-network-access'], { origin: o.grant === true ? 'https://dabirdwell.github.io' : o.grant });
  await ctx.route(SITE + '**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: bytes }));
  await ctx.addInitScript(st => {
    window.__fetches = []; const f = window.fetch;
    window.fetch = function (u, init) { window.__fetches.push({ url: String(u), tas: init && init.targetAddressSpace }); return f.apply(this, arguments); };
    window.__permAsked = [];
    if (st && navigator.permissions) {
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = d => { window.__permAsked.push(d && d.name); if (st === 'throw') return Promise.reject(new TypeError('unknown permission')); if (d && /network$/.test(d.name)) return Promise.resolve({ state: st }); return q(d); };
    } else if (navigator.permissions) {
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = d => { window.__permAsked.push(d && d.name); return q(d); };
    }
  }, permState || null);
  return ctx;
}
async function open(ctx, url, name) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await p.goto(url); await p.waitForTimeout(900); return p; }
async function pickLocal(p, url) { await p.selectOption('#gmProv', 'lmstudio'); await p.waitForTimeout(250); await p.fill('#gmUrl', url); }

(async () => {
  const b = await chromium.launch();

  // A. which addresses get which label (website address). The app's code is private, so read the label off each request.
  const cases = { 'http://localhost:1234/v1': 'loopback', 'http://127.0.0.1:1234/v1': 'loopback', 'http://[::1]:1234/v1': 'loopback', 'http://game.localhost:1234/v1': 'loopback',
    'http://192.168.1.5:1234/v1': 'local', 'http://10.0.0.2:11434/v1': 'local', 'http://172.20.1.1:1234/v1': 'local', 'http://studio.local:1234/v1': 'local',
    'http://172.40.1.1:1234/v1': undefined, 'http://100.78.177.90:1234/v1': undefined };
  let ctx = await ctxAt(b); let p = await open(ctx, SITE + HASH, 'unit');
  await ctx.route(u => !u.href.startsWith(SITE), r => r.abort());
  const got = {};
  for (const u of Object.keys(cases)) {
    await pickLocal(p, u); await p.evaluate(() => { window.__fetches = []; });
    await p.click('#gmCheck'); await p.waitForTimeout(400);
    const f = await p.evaluate(() => window.__fetches.find(x => /\/models$/.test(x.url)));
    got[u] = f ? f.tas : 'no request';
    await p.waitForSelector('#gmCheck:not([disabled])', { timeout: 15000 }).catch(() => {});
  }
  const wrong = Object.keys(cases).filter(u => got[u] !== cases[u]);
  ok(wrong.length === 0, 'address labels: ' + (wrong.length ? 'wrong for ' + JSON.stringify(wrong.map(u => [u, got[u]])) : Object.keys(cases).length + ' cases right'));
  ok(bytes.includes('name where I am by what the place is, never by its room number'), 'the prompt keeps room numbers out of the status block');
  const realState = await p.evaluate(async () => { try { return (await navigator.permissions.query({ name: 'loopback-network' })).state; } catch (e) { return 'throws: ' + e.message.slice(0, 60); } });
  log.push('INFO this Chromium answers loopback-network with: ' + realState);
  await ctx.close();

  // B. connect and play from the website address, after the player chose Allow
  let lm = await lmServer();
  ctx = await ctxAt(b, { grant: true }); p = await open(ctx, SITE + HASH, 'https-play');
  await pickLocal(p, lm.url);
  ok(/your browser asks whether this page may access other apps and services on this device, choose Allow|your browser will ask|already lets|Your browser is set/i.test(await p.textContent('#gmPerm')), 'setup says what the browser may ask');
  await p.click('#gmCheck'); await p.waitForTimeout(700);
  ok(/Connected\. 1 model/.test(await p.textContent('#tabBody')), 'from the https address, Check finds the model on this computer');
  await p.click('#gmStart'); await p.waitForTimeout(300); await p.click('#gmSendBtn'); await p.waitForTimeout(900);
  ok(/Cold air rises/.test(await p.textContent('#gmLog')), 'the local game master answers the https page');
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length) >= 2, 'its room tag lights the map');
  let fx = await p.evaluate(() => window.__fetches.filter(f => /127\.0\.0\.1/.test(f.url)));
  ok(fx.length >= 2 && fx.every(f => f.tas === 'loopback'), 'every request to this computer is labelled loopback: ' + JSON.stringify(fx.map(f => [f.url.replace(/.*\/v1/, ''), f.tas])));
  ok(!(await p.evaluate(() => window.__permAsked)).includes('local-network-access'), 'never asks the old permission name that crashes older Chrome');
  await p.screenshot({ path: path.join(OUT, 'v302_https_local.png') });
  await ctx.close(); lm.srv.close();

  // C. what the panel says for each answer the browser can give (prompt and granted are this Chromium's own answers)
  const said = {};
  for (const [st, o] of [['prompt', {}], ['granted', { grant: true }], ['denied', { permState: 'denied' }], ['throw', { permState: 'throw' }]]) {
    ctx = await ctxAt(b, o); p = await open(ctx, SITE + HASH, 'perm-' + st);
    await pickLocal(p, 'http://localhost:1234/v1'); await p.waitForTimeout(400);
    said[st] = await p.textContent('#gmPerm'); await ctx.close();
  }
  ok(/When you press Check, your browser will ask/.test(said.prompt), 'not yet asked: warns that the question is coming');
  ok(/already lets/.test(said.granted), 'already allowed: says so');
  ok(/site settings/.test(said.denied) && /reload/.test(said.denied), 'blocked before: says where to undo it');
  ok(/If your browser asks/.test(said.throw), 'browser cannot say: the plain warning stays');

  // C2. the player says Block (headless Chromium refuses the question by itself): the error says what to do
  lm = await lmServer();
  ctx = await ctxAt(b); p = await open(ctx, SITE + HASH, 'blocked');
  await pickLocal(p, lm.url); await p.click('#gmCheck'); await p.waitForTimeout(1200);
  let e0 = await p.textContent('.gmerr').catch(() => '');
  ok(/you chose Allow/.test(e0) && /site settings/.test(e0), 'refused permission: the error points at Allow and the site settings');
  await ctx.close(); lm.srv.close();

  // D. Check waits on the browser: the hint replaces the silence
  lm = await lmServer({ modelsDelay: 4500 });
  ctx = await ctxAt(b, { grant: true }); p = await open(ctx, SITE + HASH, 'wait-check');
  await pickLocal(p, lm.url); await p.click('#gmCheck'); await p.waitForTimeout(3500);
  ok(/Still waiting\. If your browser is asking/.test(await p.textContent('#gmPerm')), 'after three seconds of Checking…, the panel says what to look for');
  await p.waitForTimeout(1600);
  ok(/Connected\. 1 model/.test(await p.textContent('#tabBody')), 'and connects when the answer comes');
  await ctx.close(); lm.srv.close();

  // E. first turn waits on the browser: the chat says so too
  lm = await lmServer({ chatDelay: 5500 });
  ctx = await ctxAt(b, { grant: true }); p = await open(ctx, SITE + HASH, 'wait-chat');
  await pickLocal(p, lm.url); await p.fill('#gmModel', 'local-gm-12b'); await p.click('#gmStart'); await p.waitForTimeout(300);
  await p.click('#gmSendBtn'); await p.waitForTimeout(4600);
  ok(/Still waiting/.test(await p.textContent('#gmLog')), 'a slow first turn shows the hint in the chat');
  await p.waitForTimeout(1500);
  ok(/Cold air rises/.test(await p.textContent('#gmLog')) && !/Still waiting/.test(await p.textContent('#gmLog')), 'and the reply replaces it');
  await ctx.close(); lm.srv.close();

  // F. nothing listening: one clear error naming the three causes
  ctx = await ctxAt(b); p = await open(ctx, SITE + HASH, 'refused');
  await pickLocal(p, 'http://127.0.0.1:9/v1'); await p.click('#gmCheck'); await p.waitForTimeout(1500);
  let e = await p.textContent('.gmerr').catch(() => '');
  ok(/the server is running/.test(e) && /CORS is switched on \(in LM Studio, the Developer tab\)/.test(e) && /you chose Allow/.test(e) && /saved copy/.test(e), 'refused from https: the error names server, CORS, Allow, and the saved copy');
  await p.screenshot({ path: path.join(OUT, 'v302_refused.png') });
  await ctx.close();

  // G. the saved copy (file://): no label, no saved-copy advice, still plays
  const saved = path.join(OUT, 'v302_saved.html'); fs.writeFileSync(saved, bytes);
  lm = await lmServer();
  ctx = await ctxAt(b); p = await open(ctx, 'file://' + saved + HASH, 'file');
  log.push('INFO the saved copy answers loopback-network with: ' + await p.evaluate(async () => { try { return (await navigator.permissions.query({ name: 'loopback-network' })).state; } catch (e) { return 'throws'; } }));
  await pickLocal(p, lm.url); await p.click('#gmCheck'); await p.waitForTimeout(900);
  ok(/Connected\. 1 model/.test(await p.textContent('#tabBody')), 'the saved copy finds the model with no permission granted: ' + ((await p.textContent('.gmerr').catch(() => '')) || 'connected'));
  fx = await p.evaluate(() => window.__fetches.filter(f => /127\.0\.0\.1/.test(f.url)));
  ok(fx.length >= 1 && fx.every(f => f.tas === undefined), 'its requests carry no label');
  await pickLocal(p, 'http://127.0.0.1:9/v1'); await p.click('#gmCheck'); await p.waitForTimeout(1500);
  e = await p.textContent('.gmerr').catch(() => '');
  ok(/you chose Allow/.test(e) && !/saved copy/.test(e), 'refused from the saved copy: no advice to use the saved copy');
  await ctx.close(); lm.srv.close();

  // H. the paid providers are untouched (public address, no label)
  ctx = await ctxAt(b); p = await open(ctx, SITE + HASH, 'public');
  await ctx.route(u => !u.href.startsWith(SITE), r => r.abort());
  await p.selectOption('#gmProv', 'anthropic'); await p.waitForTimeout(250);
  ok(!(await p.$('#gmPerm')), 'no browser-question line for Claude');
  await p.fill('#gmKey', 'sk-ant-test-not-real'); await p.click('#gmCheck'); await p.waitForTimeout(800);
  fx = await p.evaluate(() => window.__fetches.filter(f => /anthropic/.test(f.url)));
  ok(fx.length >= 1 && fx.every(f => f.tas === undefined), 'Claude requests carry no label');
  e = await p.textContent('.gmerr').catch(() => '');
  ok(/Could not reach the provider/.test(e) && !/CORS/.test(e), 'a failed Claude call keeps the short provider error');
  await ctx.close();

  await b.close();
  if (errs.length) log.push('PAGE ERRORS: ' + JSON.stringify(errs));
  console.log(log.join('\n')); console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
