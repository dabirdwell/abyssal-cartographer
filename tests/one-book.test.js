/* v4.3: one book, read by torchlight. The faces the file carries, the rationing of amber, the burn line,
   the room's title, the repairs found on the way, and the printed pages in the same faces.
   node tests/one-book.test.js /abs/path/index.html /abs/out/
   Prints PASS/FAIL lines and ends with FAILS: n. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const log = []; let fails = 0; const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const html = fs.readFileSync(FILE), src = html.toString('utf8');
const DM = '#ember-loom-42.2|1|4|1|m|oneshot|on|||sd|dm|01|d';
const AMBER = /rgb\(24[0-9], 16[0-9], 6[0-9]\)|rgb\(255, 207, 110\)/;   // --torch and --flame
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const URL0 = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch();
  const open = async (hash, opts, clock) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }, opts || {}));
    const p = await ctx.newPage(); p.on('pageerror', e => { log.push('PAGEERROR ' + e.message); fails++; }); if (clock) await p.clock.install({ time: new Date('2026-11-10T20:00:00') });
    await p.goto(URL0 + (hash || '')); if (clock) await p.clock.runFor(1500); else await p.waitForTimeout(1400); return { ctx, p }; };
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });

  // ---------- the faces travel inside the file ----------
  { const main = src.slice(src.indexOf('<style>\n:root{'), src.indexOf('</style>', src.indexOf('<style>\n:root{')));
    ok(!/monospace|Iowan/.test(main) || /--serif:"Alegreya","Iowan Old Style"/.test(main) && !/monospace/.test(main), 'the stylesheet names no monospace face, and the old serif only as a fallback');
    const sizes = [...new Set((main.match(/font-size:\d+(?:\.\d+)?px/g) || []))];
    ok(sizes.length <= 8, 'the stylesheet uses ' + sizes.length + ' type sizes (it used 21): ' + sizes.map(z => z.slice(10)).sort((a, b) => parseFloat(a) - parseFloat(b)).join(' '));
    ok((src.match(/@font-face/g) || []).length === 6 && /SIL Open Font License/.test(src), 'six faces are carried in the file, with their license named');
    ok(!/fonts\.googleapis|fonts\.gstatic/.test(src), 'no face is fetched from anywhere'); }

  { const { ctx, p } = await open(DM, null, true);
    const loaded = await p.evaluate(async () => { await document.fonts.ready; return ['500 16px Alegreya', '700 16px Alegreya', 'italic 400 16px Alegreya', '500 16px "Alegreya Sans"', '700 16px "Alegreya Sans"'].map(f => document.fonts.check(f)); });
    ok(loaded.every(Boolean), 'the faces load from inside the file ' + JSON.stringify(loaded));
    await p.click('#btnRevealAll'); await p.waitForTimeout(300);

    // ---------- the room's entry ----------
    await p.click('#tabs button[data-tab="over"]'); await p.waitForTimeout(200);
    await p.evaluate(() => { const rows = document.querySelectorAll('#tabBody .rrow'); rows[rows.length - 1].scrollIntoView(); });
    const before = await p.evaluate(() => document.querySelector('#tabBody').scrollTop);
    await p.evaluate(() => { const rows = document.querySelectorAll('#tabBody .rrow'); rows[rows.length - 1].click(); }); await p.waitForTimeout(300);
    const after = await p.evaluate(() => document.querySelector('#tabBody').scrollTop);
    ok(before > 100 && after === 0, 'choosing a room far down a list opens its entry at the top (the list was at ' + before + ', the entry opens at ' + after + ')');
    const t = await p.evaluate(() => { const k = document.querySelector('#tabBody .klabel'); const n = k.querySelector('.rno'); const s = getComputedStyle(k), r = n.getBoundingClientRect();
      return { text: k.textContent, size: parseFloat(s.fontSize), caps: s.textTransform, ring: Math.round(r.width) + 'x' + Math.round(r.height), radius: getComputedStyle(n).borderRadius }; });
    ok(/^Room \d+ · /.test(t.text) && t.size >= 22 && t.caps === 'none', 'a room opens with its name as a title at ' + t.size + ' px, and still reads "' + t.text.slice(0, 22) + '" to a screen reader');
    ok(t.radius === '50%' && /^3[4-9]x3[4-9]$/.test(t.ring), 'its number sits in a ring like the one on the map (' + t.ring + ')');
    const heads = await p.$$eval('#tabBody .klabel:not(.rtitle)', ks => ks.map(k => { const s = getComputedStyle(k); return s.textTransform + '|' + s.fontVariantCaps + '|' + s.borderBottomWidth; }));
    ok(heads.length >= 2 && heads.every(h => h === 'none|all-small-caps|1px'), 'section heads are true small capitals over a hairline, not capitals spaced out');
    await p.click('.rrow[data-goto-room="9"]').catch(() => {}); await p.evaluate(() => { const r = [...document.querySelectorAll('#mapSvg .roomG')][9]; if (r) r.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p.waitForTimeout(300);
    await p.click('#tabs button[data-tab="best"]'); await p.waitForTimeout(250);
    const stat = await p.evaluate(() => { const m = document.querySelector('#tabBody .statblock .mline'); if (!m) return null; const s = getComputedStyle(m), bx = getComputedStyle(m.closest('.statblock')); return { fam: s.fontFamily, num: s.fontVariantNumeric, left: bx.borderLeftWidth, top: bx.borderTopWidth }; });
    ok(stat && /Alegreya Sans/.test(stat.fam) && /tabular-nums/.test(stat.num) && stat.left === '0px' && stat.top === '1px', 'a stat line is set in the sans with figures that line up, between two rules ' + JSON.stringify(stat));
    const plain = await p.$$eval('#tabBody .qplain', els => els.map(e => e.textContent));
    ok(plain.length > 0 && !plain.some(x => /\d, (close|near|far) damage/.test(x)), 'no plain reading runs a range into its damage (' + plain.length + ' read)');
    const ranged = plain.find(x => /it can strike from (close|near|far) away/.test(x));
    log.push('NOTE  ' + (ranged ? 'a ranged attack reads: "' + ranged.slice(ranged.indexOf('It strikes')) + '"' : 'this dungeon has no ranged attacker to read'));

    // ---------- amber is rationed ----------
    await p.click('#tabs button[data-tab="loot"]'); await p.waitForTimeout(250);
    const amber = await p.evaluate(re => { const R = new RegExp(re); const hit = []; const pick = sel => document.querySelectorAll(sel).forEach(e => { if (!e.offsetParent) return; const s = getComputedStyle(e); if (R.test(s.color) || R.test(s.borderTopColor) || R.test(s.backgroundColor)) hit.push(sel); });
      ['#btnGenerate', '#btnRandom', '#btnExport', '#btnShare', '#btnConfig', '#btnRole', '#tabBody .gp', '#tabBody a', '#tabBody .klabel', '#sysToggle button.on', '#viewToggle button.on', 'footer .xp b', '.rnum'].forEach(pick); return [...new Set(hit)]; }, AMBER.source);
    ok(amber.length === 0, 'nothing but the light is amber: buttons, coin, links and heads are not' + (amber.length ? ' (still amber: ' + amber.join(', ') + ')' : ''));
    const light = await p.evaluate(() => getComputedStyle(document.querySelector('#btnLight')).color);
    ok(AMBER.test(light), 'the one amber button is the one that lights the torch');

    // ---------- the clock and the burn line ----------
    const un = await p.evaluate(() => { const e = document.querySelector('#torchTime'); return { cls: e.className, text: e.textContent.trim(), anim: getComputedStyle(e).animationName, w: document.querySelector('#burn i').getBoundingClientRect().width }; });
    ok(un.cls === 'unlit' && un.text === '--:--' && un.anim === 'none' && un.w === 0, 'before any torch the clock is quiet, not an alarm, and no line burns ' + JSON.stringify(un));
    await p.click('#btnLight'); await p.clock.runFor(1000); await p.waitForTimeout(1300);
    const full = await p.evaluate(() => document.querySelector('#burn i').getBoundingClientRect().width / document.querySelector('#torchbar').getBoundingClientRect().width);
    ok(full > 0.98, 'a fresh torch draws the burn line across the whole page (' + Math.round(full * 100) + '%)');
    await p.clock.fastForward(30 * 60 * 1000 - 2100); await p.clock.runFor(1100); await p.waitForTimeout(1300);
    const half = await p.evaluate(() => ({ f: parseFloat(document.querySelector('#burn i').style.width) / 100, now: document.querySelector('#burn').getAttribute('aria-valuenow') }));   // the width it is sliding to; the slide itself takes a second
    ok(Math.abs(half.f - 0.5) < 0.02 && Math.abs(+half.now - 50) <= 1, 'with half the hour gone the line is half the page (' + Math.round(half.f * 100) + '%, announced as ' + half.now + ')');
    await p.clock.fastForward(26 * 60 * 1000 - 1100); await p.clock.runFor(1100); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelector('#burn').classList.contains('gutter')), 'in the last minutes the line gutters with the flame');
    await p.click('#btnPause'); await p.clock.runFor(300); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelector('#burn').classList.contains('held')), 'a paused torch holds the line still and dims it');
    await shot(p, 'b01_torch');
    await p.click('#btnSnuff'); await p.clock.runFor(1500); await p.waitForTimeout(300);
    const out = await p.evaluate(() => ({ dark: document.body.classList.contains('dark'), line: getComputedStyle(document.querySelector('#burn i')).display, light: getComputedStyle(document.querySelector('#btnLight')).color }));
    ok(out.dark && out.line === 'none' && AMBER.test(out.light), 'in the dark the line is gone, and the way back to light is the one warm thing on the page');
    await ctx.close(); }

  // ---------- reduced motion ----------
  { const { ctx, p } = await open(DM, { reducedMotion: 'reduce' }, true);
    await p.click('#btnLight'); await p.clock.runFor(1000); await p.clock.fastForward(56 * 60 * 1000); await p.clock.runFor(1100); await p.waitForTimeout(300);
    const a = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#burn i')); return s.animationName + '|' + s.transitionDuration; });
    ok(a === 'none|0s', 'for a reader who asked for less motion the burn line neither flickers nor slides (' + a + ')'); await ctx.close(); }

  // ---------- paper: the first card and the letter ----------
  { const { ctx, p } = await open('');
    const d = await p.evaluate(() => { const e = document.querySelector('#roleDoor'), s = getComputedStyle(e), b1 = getComputedStyle(document.querySelector('#doorPlayer')); const lum = c => { const m = c.match(/\d+/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
      return { ink: lum(s.color), img: s.backgroundImage.slice(0, 15), btnBg: lum(b1.backgroundColor), btnInk: lum(b1.color) }; });
    ok(d.ink < 60 && /gradient/.test(d.img) && d.btnBg < 60 && d.btnInk > 180, 'the first card is paper with ink on it, and its first choice is inked solid ' + JSON.stringify(d));
    await shot(p, 'b02_first_card'); await ctx.close(); }

  // ---------- a phone ----------
  { const { ctx, p } = await open('', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = 'The Starved Keep-Below of the Gray Abbot'; t.classList.add('show'); }); await p.waitForTimeout(350);
    const th = await p.evaluate(() => Math.round(document.querySelector('#toast').getBoundingClientRect().height));
    ok(th > 0 && th < 110, 'on a phone the dungeon\'s name is a small note at the top, not a column over the first card (' + th + ' px tall)');
    await p.tap('#doorPlayer'); await p.waitForTimeout(1500);
    const hidden = await p.evaluate(() => ['#btnPause', '#btnSnuff', '#chime'].map(s => { const e = document.querySelector(s); return !e.offsetParent; }));
    ok(hidden.every(Boolean), 'before the first torch a phone hides Pause, Snuff and the chime box ' + JSON.stringify(hidden));
    await p.tap('#btnLight'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => document.querySelector('#burn i').getBoundingClientRect().width) > 380, 'the burn line runs the width of a phone');
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on a phone');
    await shot(p, 'b03_phone'); await ctx.close(); }

  // ---------- the printed pages carry the same faces ----------
  { const { ctx, p } = await open(DM);
    for (const [x, name] of [['dm', 'guide'], ['player', 'handout'], ['chars', 'characters']]) {
      const dl = p.waitForEvent('download'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="' + x + '"]'); const d = await dl; const f = path.join(OUT, 'b_' + name + '.html'); await d.saveAs(f);
      const doc = fs.readFileSync(f, 'utf8'); const pg = await ctx.newPage(); await pg.goto('file://' + f); await pg.waitForTimeout(500);
      const fam = await pg.evaluate(async () => { await document.fonts.ready; return { body: getComputedStyle(document.body).fontFamily.split(',')[0], ok: document.fonts.check('400 14px Alegreya') }; });
      ok((doc.match(/@font-face/g) || []).length === 6 && /Alegreya/.test(fam.body) && fam.ok, 'the printed ' + name + ' carries the faces and is set in them');
      if (x === 'player') { const pdf = await pg.pdf({ format: 'Letter' }); ok(pdf.length < 1.5e6, 'and the handout still prints small (' + (pdf.length / 1e6).toFixed(2) + ' MB)'); }
      await pg.close(); }
    await ctx.close(); }

  await b.close(); srv.close();
  log.push('FAILS: ' + fails); console.log(log.join('\n'));
})().catch(e => { console.log(log.join('\n')); console.log('CRASH ' + e.stack); console.log('FAILS: 99'); process.exit(1); });
