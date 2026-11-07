// v3.1 sound: the game master's voice, room sounds, the torch, small cues, read-aloud buttons, and Kokoro in the browser.
// Speech is stubbed (headless Linux has no voices) so every spoken sentence is recorded; audio is tapped with an analyser.
// Usage: node v31.test.js FILE OUT [kokoro]   (add "kokoro" to also download and run the real Kokoro model; needs internet)
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const FILE = process.argv[2], OUT = process.argv[3], KOKORO = process.argv[4] === 'kokoro';
const bytes = fs.readFileSync(FILE); const SRC = 'file://' + FILE;
const SITE = 'https://dabirdwell.github.io/abyssal-cartographer/';
const DM = '#grim-gate-63|1|4|1|m|oneshot|on|||5e|dm|01';
const PL = '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p';
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const errs = [];

const INSTRUMENT = () => {
  // speech: record every sentence; voices like a Mac would list them
  window.__spoken = []; window.__cancels = 0; let speaking = false, timer = null;
  const voices = [
    { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', localService: true },
    { name: 'Daniel (Enhanced)', lang: 'en-GB', voiceURI: 'daniel-enh', localService: true },
    { name: 'Google français', lang: 'fr-FR', voiceURI: 'gfr', localService: false }];
  const stub = {
    get speaking() { return speaking; }, getVoices: () => voices, addEventListener() {},
    speak(u) { window.__spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate }); speaking = true; clearTimeout(timer); timer = setTimeout(() => { speaking = false; }, 1500); },
    cancel() { window.__cancels++; speaking = false; } };
  Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  // audio: tap whatever reaches the speakers; count what gets made
  window.__taps = []; window.__made = { osc: 0, buf: 0 }; window.__bufDur = [];
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest) {
    if (dest instanceof AudioDestinationNode && !this.__tapped) { this.__tapped = true; const a = this.context.createAnalyser(); a.fftSize = 2048; conn.call(this, a); window.__taps.push(a); }
    return conn.apply(this, arguments); };
  const co = BaseAudioContext.prototype.createOscillator; BaseAudioContext.prototype.createOscillator = function () { window.__made.osc++; return co.apply(this, arguments); };
  const cb = BaseAudioContext.prototype.createBufferSource; BaseAudioContext.prototype.createBufferSource = function () { window.__made.buf++; const s = cb.apply(this, arguments); const st = s.start; s.start = function () { if (s.buffer && s.buffer.sampleRate === 24000) window.__bufDur.push(s.buffer.duration); return st.apply(this, arguments); }; return s; };
  window.__rms = () => { let best = 0; for (const a of window.__taps) { const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; best = Math.max(best, Math.sqrt(s / d.length)); } return best; };
};
async function ctxNew(b, extra) { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }, extra || {})); await ctx.addInitScript(INSTRUMENT); return ctx; }
async function open(ctx, url, name) { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await p.goto(url); await p.waitForTimeout(900); return p; }
async function panel(p) { if (!(await p.isVisible('#soundMenu'))) { await p.click('#btnSound'); await p.waitForTimeout(250); } }
async function closePanel(p) { if (await p.isVisible('#soundMenu')) { await p.click('#btnSound'); await p.waitForTimeout(150); } }
async function rmsOver(p, ms) { let best = 0; const end = Date.now() + ms; while (Date.now() < end) { best = Math.max(best, await p.evaluate(() => window.__rms())); await p.waitForTimeout(120); } return best; }
async function dungeonText(p) { await p.click('#btnExport'); await p.click('#exportMenu button[data-x="ai"]'); await p.waitForTimeout(300); return p.evaluate(() => navigator.clipboard.readText()); }
function gmServer(parts, gap) {
  const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  const srv = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, H); return res.end(); }
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json', ...H }); return res.end(JSON.stringify({ data: [{ id: 'local-gm' }] })); }
    let body = ''; req.on('data', d => body += d); req.on('end', () => {
      res.writeHead(200, { 'content-type': 'text/event-stream', ...H }); let i = 0;
      const t = setInterval(() => { if (i < parts.length) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); else { res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); } }, gap);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/v1' })));
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. the button, the panel, everything off at first
  let ctx = await ctxNew(b); let p = await open(ctx, SRC + DM, 'dm');
  ok(await p.isVisible('#btnSound'), 'game master view: the Sound button is in the header');
  await panel(p);
  const offs = await p.evaluate(() => ['#sndVoice', '#sndRoom', '#sndCues'].map(s => document.querySelector(s).checked));
  ok(offs.every(x => !x), 'everything starts off');
  const opts = await p.evaluate(() => [...document.querySelectorAll('#sndSysVoice option')].map(o => o.textContent));
  ok(opts[0] === 'Daniel (Enhanced)' && opts.length === 2, "this computer's voices: English only, the enhanced one first, as the reading app ranks them: " + JSON.stringify(opts));
  const before = await dungeonText(p);
  await panel(p);
  ok(await p.evaluate(() => window.__taps.length === 0 && window.__made.osc === 0), 'no sound is made until something is switched on');

  // 2. room sounds
  await p.check('#sndRoom'); await p.waitForTimeout(2500);
  const roomR = await rmsOver(p, 1500);
  ok(roomR > 0.0005, 'room sounds play once switched on (level ' + roomR.toFixed(4) + ')');
  const osc0 = await p.evaluate(() => window.__made.osc); await p.waitForTimeout(6000); const osc1 = await p.evaluate(() => window.__made.osc);
  const firstSound = await p.evaluate(() => { const s = document.querySelector('.senses'); return s ? s.textContent : ''; });
  log.push('INFO room 1 says: ' + firstSound.replace(/\s+/g, ' ').slice(0, 120) + '; oscillators made in 6 s: ' + (osc1 - osc0));
  // the torch: crackle comes and goes with the flame
  await closePanel(p);
  let buf0 = await p.evaluate(() => window.__made.buf); await p.waitForTimeout(3000); let buf1 = await p.evaluate(() => window.__made.buf);
  const quiet = (buf1 - buf0) / 3;
  await p.click('#btnLight'); await p.waitForTimeout(1500);
  buf0 = await p.evaluate(() => window.__made.buf); await p.waitForTimeout(3000); buf1 = await p.evaluate(() => window.__made.buf);
  const lit = (buf1 - buf0) / 3;
  ok(lit > quiet + 3, 'a lit torch crackles: ' + lit.toFixed(1) + ' crackles a second, against ' + quiet.toFixed(1) + ' before');
  await p.screenshot({ path: path.join(OUT, 'v31_dm_sound.png') });
  await panel(p); await p.uncheck('#sndRoom'); await p.waitForTimeout(4500);
  const offR = await rmsOver(p, 800);
  ok(offR < roomR / 5, 'switching room sounds off fades them away (' + offR.toFixed(5) + ')');
  // same link, same dungeon, after all that sound
  await closePanel(p);
  const after = await dungeonText(p);
  ok(before.length > 1000 && before === after, 'the dungeon is word for word the same after the sounds ran (' + before.length + ' characters)');
  // settings are remembered
  await p.reload(); await p.waitForTimeout(900); await panel(p);
  ok(await p.evaluate(() => !document.querySelector('#sndRoom').checked), 'switched off stays off after a reload');
  await p.check('#sndCues'); await p.reload(); await p.waitForTimeout(900); await panel(p);
  ok(await p.evaluate(() => document.querySelector('#sndCues').checked), 'switched on stays on after a reload');
  await closePanel(p);

  // 3. small cues: dice and a newly lit room
  await p.click('#viewToggle button[data-view="player"]').catch(() => {}); await p.waitForTimeout(300);
  let o0 = await p.evaluate(() => window.__made.osc);
  const fr = await p.evaluate(() => { const f = document.querySelector('#mapSvg .frontier'); if (!f) return null; const r = f.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (fr) { await p.mouse.move(fr.x, fr.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500); }
  let o1 = await p.evaluate(() => window.__made.osc);
  ok(fr && o1 - o0 >= 3, 'lighting a room by clicking a doorway plays a low note (' + (o1 - o0) + ' tones)');
  await ctx.close();

  // 4. read aloud: the room box, with this computer's voice
  ctx = await ctxNew(b); p = await open(ctx, SRC + DM, 'read');
  await p.click('#mapSvg .roomG').catch(() => {}); await p.waitForTimeout(400);
  await p.click('.tabs button[data-tab="room"]').catch(() => {}); await p.waitForTimeout(300);
  const box = await p.evaluate(() => { const x = document.querySelector('#tabBody .boxed'); return x ? x.textContent : ''; });
  await p.click('#tabBody .readbtn'); await p.waitForTimeout(300);
  let spoken = await p.evaluate(() => window.__spoken.map(s => s.text));
  ok(box && spoken.join(' ').replace(/\s+/g, ' ') === box.replace(/\s+/g, ' ').trim() && spoken.length >= 2, '▶ Read aloud speaks the room box sentence by sentence (' + spoken.length + ' sentences)');
  ok(await p.evaluate(() => window.__spoken[0].voice === 'Daniel (Enhanced)'), 'with the best-ranked voice');
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => window.__cancels >= 1), 'Esc stops the voice');
  await ctx.close();

  // 5. the game master's voice, following the stream
  const parts = ['The doors ', 'hang open. ', 'Cold air rises from below, ', 'smelling of wet stone. ', '**What do you do?** ', '[Map: room 2]'];
  let gm = await gmServer(parts, 250);
  ctx = await ctxNew(b); p = await open(ctx, SRC + PL, 'voice');
  await p.selectOption('#gmProv', 'lmstudio'); await p.waitForTimeout(200); await p.fill('#gmUrl', gm.url); await p.click('#gmCheck'); await p.waitForTimeout(500);
  await p.click('#gmStart'); await p.waitForTimeout(300);
  ok(await p.isVisible('#btnSound'), "player's view: the Sound button is there too");
  await panel(p); await p.check('#sndVoice'); await closePanel(p);
  await p.click('#gmSendBtn'); await p.waitForTimeout(900);
  const mid = await p.evaluate(() => { const m = [...document.querySelectorAll('#gmLog .msg')].pop(); return m ? m.textContent : ''; });
  ok(/The doors hang open/.test(mid), 'the reply shows while it is still being written (repair): "' + mid.replace(/\s+/g, ' ').slice(0, 60) + '"');
  const midSpoken = await p.evaluate(() => window.__spoken.length);
  ok(midSpoken >= 1, 'the voice starts on the first finished sentence, before the reply is done (' + midSpoken + ')');
  await p.waitForTimeout(1800);
  spoken = await p.evaluate(() => window.__spoken.map(s => s.text));
  ok(JSON.stringify(spoken) === JSON.stringify(['The doors hang open.', 'Cold air rises from below, smelling of wet stone.', 'What do you do?']), 'it speaks each sentence once, without the map tag or the bold marks: ' + JSON.stringify(spoken));
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length >= 2), 'the map tag still lights the room');
  const c0 = await p.evaluate(() => window.__cancels);
  await p.click('#gmLog .msg.assistant .readbtn'); await p.waitForTimeout(300);
  ok(await p.evaluate(c => window.__cancels > c && window.__spoken.length === 6, c0), '▶ on a message hears it again from the start');
  await p.click('#gmSendBtn').catch(() => {}); await p.fill('#gmIn', 'I step inside.'); await p.click('#gmSendBtn'); await p.waitForTimeout(300);
  ok(await p.evaluate(c => window.__cancels > c + 1, c0), 'a new turn stops the old voice');
  await p.waitForTimeout(2200);
  await panel(p); await p.uncheck('#sndVoice'); await closePanel(p);
  const n0 = await p.evaluate(() => window.__spoken.length);
  await p.fill('#gmIn', 'I listen.'); await p.click('#gmSendBtn'); await p.waitForTimeout(2200);
  ok(await p.evaluate(n => window.__spoken.length === n, n0), 'with the voice switched off, nothing is spoken');
  await p.screenshot({ path: path.join(OUT, 'v31_player_voice.png') });
  // Kokoro chosen but never downloaded: nothing downloads by itself; this computer's voice speaks and says how to get Kokoro
  await panel(p); await p.check('#sndVoice'); await p.selectOption('#sndSrc', 'kokoro'); await p.waitForTimeout(300);
  ok(/Download the Kokoro voice \(about \d+ MB, once\)/.test(await p.textContent('#soundMenu')), 'choosing Kokoro offers a one-time download and says the size');
  await closePanel(p);
  const n1 = await p.evaluate(() => window.__spoken.length);
  await p.fill('#gmIn', 'I wait.'); await p.click('#gmSendBtn'); await p.waitForTimeout(2200);
  ok(await p.evaluate(n => window.__spoken.length > n, n1) && /open Sound and press Download/.test(await p.textContent('#toast')), 'until it is downloaded, this computer speaks and the page says how to get Kokoro');
  await ctx.close(); gm.srv.close();

  // 6. the Table window stays silent even with sound switched on
  ctx = await ctxNew(b); p = await open(ctx, SRC + DM, 'table-main');
  await panel(p); await p.check('#sndRoom'); await p.check('#sndVoice'); await closePanel(p);
  await p.click('#btnExport'); await p.click('#exportMenu button[data-x="table"]'); await p.waitForTimeout(300);
  const href = await p.getAttribute('#tblOpenLink', 'href');
  const t = await open(ctx, 'about:blank', 'table'); await t.goto(href); await t.waitForTimeout(3000);
  ok(!(await t.$('#btnSound')) && await t.evaluate(() => window.__taps.length === 0 && window.__made.osc === 0 && window.__made.buf === 0), 'the player display makes no sound and has no Sound button');
  await ctx.close();

  // 7. phone width: the panel fits
  ctx = await ctxNew(b, { viewport: { width: 390, height: 844 } }); p = await open(ctx, SRC + PL, 'phone');
  await p.click('#btnSound'); await p.waitForTimeout(300);
  const fit = await p.evaluate(() => { const r = document.querySelector('#soundMenu').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth, sw: document.documentElement.scrollWidth }; });
  ok(fit.l >= 0 && fit.r <= fit.w && fit.sw <= fit.w, 'on a phone the panel fits the screen: ' + JSON.stringify(fit));
  await p.screenshot({ path: path.join(OUT, 'v31_phone_panel.png') });
  await ctx.close();

  // 8. Kokoro for real: download, speak, remember (needs internet)
  if (KOKORO) {
    const kb = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY }, args: ['--autoplay-policy=no-user-gesture-required'] });
    const kctx = await kb.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
    await kctx.addInitScript(INSTRUMENT);
    await kctx.route(SITE + '**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: bytes }));
    p = await kctx.newPage(); p.on('pageerror', e => errs.push('kokoro: ' + e.message)); await p.goto(SITE + PL); await p.waitForTimeout(900);
    await panel(p); await p.selectOption('#sndSrc', 'kokoro'); await p.waitForTimeout(600);
    const label = await p.textContent('#sndKLoad'); log.push('INFO offered: ' + label);
    const t0 = Date.now(); await p.click('#sndKLoad');
    let st = ''; const seen = new Set();
    while (Date.now() - t0 < 240000) { st = await p.textContent('#sndKStatus').catch(() => ''); seen.add(st.replace(/\d+/g, 'n')); if (/^Ready/.test(st) || /could not load/.test(st)) break; await p.waitForTimeout(1000); }
    ok(/^Ready/.test(st), 'Kokoro downloads and gets ready in ' + Math.round((Date.now() - t0) / 1000) + ' s: ' + st.slice(0, 80));
    ok([...seen].some(s => /Downloading the voice… n of n MB/.test(s)), 'the download shows its progress in MB');
    await p.click('#sndTest');
    const t1 = Date.now(); let durs = [];
    while (Date.now() - t1 < 90000) { durs = await p.evaluate(() => window.__bufDur); if (durs.length >= 2) break; await p.waitForTimeout(1000); }
    ok(durs.length >= 2 && durs.every(d => d > 1), 'Kokoro speaks the sample, sentence by sentence (' + durs.map(d => d.toFixed(1) + ' s').join(', ') + ', first after ' + Math.round((Date.now() - t1) / 1000) + ' s)');
    ok(await p.evaluate(() => window.__spoken.length === 0), 'and this computer\'s voice stays quiet');
    ok(await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('ac.sound')).kokDownloaded === true; } catch (e) { return false; } }), 'the page remembers Kokoro was downloaded');
    await p.reload(); await p.waitForTimeout(900); await panel(p);
    ok(/Downloaded before/.test(await p.textContent('#soundMenu')) && !(await p.$('#sndKLoad')), 'after a reload it does not ask to download again');
    const t2 = Date.now(); await p.click('#sndTest'); durs = [];
    while (Date.now() - t2 < 120000) { durs = await p.evaluate(() => window.__bufDur); if (durs.length >= 1) break; await p.waitForTimeout(1000); }
    ok(durs.length >= 1, 'and speaks from the browser\'s copy (first sentence after ' + Math.round((Date.now() - t2) / 1000) + ' s)');
    await p.screenshot({ path: path.join(OUT, 'v31_kokoro.png') });
    // the saved copy (opened from the computer) runs Kokoro too
    const fctx = await kb.newContext({ ignoreHTTPSErrors: true }); await fctx.addInitScript(INSTRUMENT);
    p = await fctx.newPage(); p.on('pageerror', e => errs.push('kokoro-file: ' + e.message)); await p.goto(SRC + PL); await p.waitForTimeout(900);
    await panel(p); await p.selectOption('#sndSrc', 'kokoro'); await p.waitForTimeout(400); await p.click('#sndKLoad');
    const t3 = Date.now(); st = '';
    while (Date.now() - t3 < 180000) { st = await p.textContent('#sndKStatus').catch(() => ''); if (/^Ready|could not/.test(st)) break; await p.waitForTimeout(1000); }
    await p.click('#sndTest'); durs = []; const t4 = Date.now();
    while (/^Ready/.test(st) && Date.now() - t4 < 90000) { durs = await p.evaluate(() => window.__bufDur); if (durs.length) break; await p.waitForTimeout(1000); }
    ok(/^Ready/.test(st) && durs.length >= 1, 'the saved copy downloads and speaks with Kokoro too: ' + st.slice(0, 40));
    await kb.close();
  }

  await b.close();
  if (errs.length) log.push('PAGE ERRORS: ' + JSON.stringify(errs));
  console.log(log.join('\n')); console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
