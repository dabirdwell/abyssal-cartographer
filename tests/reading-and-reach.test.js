/* v3.5: reading and reach. Type, text size, keyboard, announcements, plain headings, the sound offer, order of play.
   node tests/reading-and-reach.test.js /abs/path/index.html /abs/out/
   Prints PASS/FAIL lines and ends with FAILS: n. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const log = []; let fails = 0; const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const html = fs.readFileSync(FILE);
const DM = '#drowned-beacon-78|1|4|1|m|oneshot|on|||sd|dm|01|d', PL = '#drowned-beacon-78|1|4|1|m|oneshot|on|||5e|player|03|p';
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const URL0 = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch();
  const open = async (hash, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }, opts || {}));
    const p = await ctx.newPage(); p.on('pageerror', e => { log.push('PAGEERROR ' + e.message); fails++; }); await p.goto(URL0 + (hash || '')); await p.waitForTimeout(1200); return { ctx, p }; };
  const shot = (p, n, full) => p.screenshot({ path: path.join(OUT, n + '.png'), fullPage: !!full });
  const store = (p, k) => p.evaluate(key => localStorage.getItem(key), k);

  // ---------- the first screen ----------
  { const { ctx, p } = await open('');
    ok(/One click builds a whole dungeon adventure/.test(await p.textContent('#roleDoor')), 'the first screen says what this is');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'doorPlayer'), 'the first choice has the keyboard focus');
    await shot(p, 'r01_door');
    await p.check('#doorSound'); await p.click('#doorDM'); await p.waitForTimeout(700);
    const snd = JSON.parse(await store(p, 'ac.sound') || '{}'); ok(snd.room === true && snd.cues === true && snd.voice === false, 'ticking sound at the door turns on room sounds and cues, and no voice');
    await ctx.close(); }

  // ---------- the game master's screen ----------
  { const { ctx, p } = await open(DM);
    await p.click('#tabs button[data-tab="room"]'); await p.waitForTimeout(250);
    const box = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#tabBody .boxed')); return { size: parseFloat(s.fontSize), style: s.fontStyle }; });
    ok(box.size >= 17 && box.style === 'normal', 'read-aloud text is ' + box.size + ' px and upright');
    await shot(p, 'r02_room');
    await p.click('#tabs button[data-tab="over"]'); await p.waitForTimeout(250);
    const sizes = await p.evaluate(() => { const h = {}; let tot = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while (n = w.nextNode()) { const e = n.parentElement; if (!e || !e.offsetParent || !n.textContent.trim() || e.closest('svg')) continue; const s = parseFloat(getComputedStyle(e).fontSize); const c = n.textContent.trim().length; h[s] = (h[s] || 0) + c; tot += c; }
      let small = 0, tiny = 0; for (const k in h) { if (+k <= 12.5) small += h[k]; if (+k < 11.5) tiny += h[k]; } return { small: small / tot, tiny, tot }; });
    ok(sizes.tiny === 0, 'nothing on the game master\'s screen is set under 11.5 px (map labels aside, which zoom with the map)');
    ok(sizes.small < 0.25, 'text at 12.5 px or smaller is ' + Math.round(sizes.small * 100) + '% of the screen (was 70%)');
    const order = await p.$$eval('#tabBody .klabel', ks => ks.map(k => k.textContent)); const iTown = order.findIndex(t => /the last town/.test(t)), iFac = order.findIndex(t => /^Factions/.test(t));
    ok(iTown >= 0 && iFac > iTown, 'the town comes before the factions: ' + JSON.stringify(order.slice(0, 5)));
    ok(/rough guide to length/.test(await p.textContent('#tabBody')), 'the Overview says roughly how long the dungeon takes');
    await shot(p, 'r03_overview');
    // keyboard
    await p.focus('.rrow[data-goto-room="3"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    ok(/Room 4/.test(await p.textContent('#tabBody .klabel')), 'Enter on a row of the room list opens that room');
    const ex = await p.$('#tabBody .exitline[role="button"]'); const to = ex ? +(await ex.getAttribute('data-goto-room')) + 1 : -1; if (ex) { await ex.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
    ok(ex && new RegExp('Room ' + to + ' ').test(await p.textContent('#tabBody .klabel')), 'Enter on an exit goes to the room it leads to (room ' + to + ')');
    await p.focus('#mapSvg .roomG[data-room="6"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok(/Room 7 /.test(await p.textContent('#tabBody .klabel')) && await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-room') === '6'), 'Enter on a room of the map opens it and keeps the focus there');
    ok(/^Room 1, /.test(await p.getAttribute('#mapSvg .roomG[data-room="0"]', 'aria-label')), 'rooms on the map have names a screen reader can say');
    // Escape
    await p.click('#btnExport'); await p.keyboard.press('Escape'); const e1 = await p.evaluate(() => document.querySelector('#exportMenu').classList.contains('open'));
    await p.click('#btnConfig'); await p.waitForTimeout(100); await shot(p, 'r04_settings'); ok(/^Settings/.test((await p.textContent('#configOverlay h2')).trim()), 'settings are headed Settings');
    await p.keyboard.press('Escape'); const e2 = await p.evaluate(() => document.querySelector('#configOverlay').classList.contains('open'));
    await p.click('#btnSound'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); const e3 = await p.evaluate(() => document.querySelector('#soundMenu').classList.contains('open'));
    ok(!e1 && !e2 && !e3, 'Escape closes Export, Settings and Sound');
    ok((await p.getAttribute('#toast', 'aria-live')) === 'polite', 'the small messages are announced');
    // text size
    await p.click('#btnConfig'); await p.click('#textSize button[data-tz="1.3"]'); await p.keyboard.press('Escape');
    const z1 = await p.evaluate(() => getComputedStyle(document.querySelector('#tabBody')).zoom); await shot(p, 'r05_larger');
    await p.reload(); await p.waitForTimeout(1200); const z2 = await p.evaluate(() => getComputedStyle(document.querySelector('#tabBody')).zoom);
    ok(+z1 === 1.3 && +z2 === 1.3, 'text size Larger takes effect at once and is kept (zoom ' + z1 + ', after reload ' + z2 + ')');
    ok((await p.inputValue('#seedInput')) === 'drowned-beacon-78', 'changing text size did not rebuild the dungeon');
    // words
    ok((await p.textContent('#seedLabel')).trim() === 'dungeon code' && !/\bseed\b/i.test(await p.evaluate(() => document.querySelector('header').innerText)), 'the header says dungeon code, not seed');
    // the sound offer at the first torch
    await p.click('#btnLight'); await p.waitForTimeout(400); ok(await p.isVisible('#sndOffer'), 'lighting the first torch offers sound once');
    await p.click('#sndOffer'); await p.waitForTimeout(300); const s2 = JSON.parse(await store(p, 'ac.sound') || '{}'); ok(s2.room === true && !(await p.$('#sndOffer')), 'taking the offer turns sound on and the offer goes away');
    await p.reload(); await p.waitForTimeout(1200); await p.click('#btnLight'); await p.waitForTimeout(400); ok(!(await p.$('#sndOffer')), 'the offer is not made twice');
    await ctx.close(); }

  // ---------- the player's screen ----------
  { const { ctx, p } = await open(PL);
    await p.click('#tabs button[data-tab="room"]'); await p.waitForTimeout(250); await p.fill('#revealNum', '2').catch(() => {});
    await p.click('#tabs button[data-tab="gm"]'); await p.fill('#revealNum', '2'); await p.click('#btnRevealNum'); await p.waitForTimeout(500);
    const t = await p.textContent('#tabBody'); ok(/Room 2/.test(t) && !/Creatures/.test(t) && !/Giant|Acolyte|Zealot|Wight/.test(t), 'a lit room on the player\'s screen does not name its creatures');
    await shot(p, 'r06_player_room');
    await ctx.close(); }

  // ---------- a phone ----------
  { const { ctx, p } = await open(PL, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const small = await p.$$eval('button, select', els => els.filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 40).length);
    ok(small === 0, 'on a phone every button and menu is at least 40 px tall (' + small + ' are not)');
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll on a phone');
    await shot(p, 'r07_phone'); await ctx.close(); }

  await b.close(); srv.close();
  log.push('FAILS: ' + fails); console.log(log.join('\n'));
})().catch(e => { console.log(log.join('\n')); console.log('CRASH ' + e.stack); console.log('FAILS: 99'); process.exit(1); });
