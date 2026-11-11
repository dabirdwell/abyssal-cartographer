// The "save it to play offline" link: served like GitHub Pages, and opened from disk.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const bytes = fs.readFileSync(FILE);
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const errs = [];
const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/abyssal-cartographer/' || u === '/abyssal-cartographer/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(bytes); }
  res.writeHead(404); res.end();
});
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/abyssal-cartographer/';
  const b = await chromium.launch();

  // Served from a website address
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  let p = await ctx.newPage(); p.on('pageerror', e => errs.push('web: ' + e.message));
  await p.goto(BASE + '#grim-gate-63|1|4|1|m|oneshot|on|||5e|dm|01'); await p.waitForTimeout(1000);
  const a = await p.evaluate(() => { const x = document.querySelector('#saveOffline'); return { text: x.textContent, href: x.href, dl: x.getAttribute('download') }; });
  ok(a.text === 'Save it to play offline' && a.dl === 'AbyssalCartographer.html' && a.href === BASE, 'footer link points at the page itself, no hash: ' + JSON.stringify(a));
  let [d] = await Promise.all([p.waitForEvent('download'), p.click('#saveOffline')]);
  let saved = path.join(OUT, 'saved_from_footer.html'); await d.saveAs(saved);
  ok(d.suggestedFilename() === 'AbyssalCartographer.html' && Buffer.compare(fs.readFileSync(saved), bytes) === 0, 'footer download is the exact game file (' + fs.statSync(saved).size + ' bytes)');
  await p.click('#btnExport');
  [d] = await Promise.all([p.waitForEvent('download'), p.click('#exportMenu button[data-x="save"]')]);
  saved = path.join(OUT, 'saved_from_export.html'); await d.saveAs(saved);
  ok(Buffer.compare(fs.readFileSync(saved), bytes) === 0, 'Export -> Save the whole game downloads the same file');
  ok(/no internet needed/i.test(await p.textContent('#toast')), 'toast says what to do with it');
  // player side line
  await p.goto(BASE + '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p'); await p.waitForTimeout(1000);
  ok(/No internet\? Use save it to play offline/.test(await p.textContent('#tabBody')), 'How to play tells a player how to go offline');
  await ctx.close();

  // The saved copy, opened from disk
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  p = await ctx.newPage(); p.on('pageerror', e => errs.push('file: ' + e.message));
  await p.goto('file://' + path.join(OUT, 'saved_from_footer.html') + '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p'); await p.waitForTimeout(1000);
  const f = await p.evaluate(() => { const x = document.querySelector('#saveOffline'); return { text: x.textContent, href: x.getAttribute('href') }; });
  ok(f.text === 'playing from your computer, works offline' && f.href === null, 'from disk, the footer says it is the offline copy');
  ok(/you are playing the copy saved on your computer/.test(await p.textContent('#tabBody')), 'How to play says so too');
  ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length) >= 1, 'the saved copy plays');
  await ctx.close();

  await b.close(); srv.close();
  if (errs.length) log.push('PAGE ERRORS: ' + JSON.stringify(errs));
  console.log(log.join('\n')); console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
