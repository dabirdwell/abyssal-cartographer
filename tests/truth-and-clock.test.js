/* v3.4: the key agrees with the map, the torch burns by the clock, and the table's progress survives a reload.
   node tests/truth-and-clock.test.js /abs/path/index.html /abs/out/
   Prints PASS/FAIL lines and ends with FAILS: n. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const log = []; let fails = 0; const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const html = fs.readFileSync(FILE);
const SEEDS = ['drowned-beacon-78', 'rev-21', 'rev-240', 'rev-3', 'iron-gallery-11'];
const link = (seed, role) => '#' + seed + '|1|4|1|m|oneshot|on|||sd|' + (role === 'p' ? 'player|01|p' : 'dm|01|d');
const secs = async p => { const t = (await p.textContent('#torchTime')).trim().split(':').map(Number); return t.length === 3 ? t[0] * 3600 + t[1] * 60 + t[2] : t[0] * 60 + t[1]; };
const wallOf = (d, o) => o[1] < d[1] ? 'north' : o[1] > d[1] ? 'south' : o[0] > d[0] ? 'east' : 'west';

(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const URL0 = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch();
  const open = async (hash, opts, clockAt) => { const ctx = (opts && opts.ctx) || await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }, opts || {}));
    const p = await ctx.newPage(); p.on('pageerror', e => { log.push('PAGEERROR ' + e.message); fails++; });
    if (clockAt) await p.clock.install({ time: new Date(clockAt) });
    await p.goto(URL0 + (hash || '')); if (clockAt) await p.clock.runFor(1500); else await p.waitForTimeout(1200); return { ctx, p }; };
  const saveGame = async (p, name) => { const dl = p.waitForEvent('download'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="json"]'); const d = await dl; const f = path.join(OUT, name); await d.saveAs(f); return f; };

  // ---------- 1. the key agrees with the map ----------
  for (const seed of SEEDS) {
    const { ctx, p } = await open(link(seed));
    const m = JSON.parse(fs.readFileSync(await saveGame(p, 'save_' + seed + '.json'), 'utf8')).model;
    let wrong = 0, ends = 0, amb = 0, barredSame = 0, barred = 0, hidden = 0;
    m.edges.forEach(e => { [[e.a, e.b, e.da, e.path[0]], [e.b, e.a, e.db, e.path[e.path.length - 1]]].forEach(([from, to, d, o]) => { const ex = m.rooms[from].exits.find(x => x.to === to + 1); ends++; if (!ex || ex.dir !== wallOf(d, o)) wrong++; });
      if (e.type === 'barred') { barred++; const la = m.rooms[e.a].exits.find(x => x.to === e.b + 1).label, lb = m.rooms[e.b].exits.find(x => x.to === e.a + 1).label; if (la === lb || !/DC 15 STR/.test(la + lb) || !/this side/.test(la + lb)) barredSame++; } });
    m.rooms.forEach(r => { const d = r.exits.filter(x => !x.secret && !/shared doorway/.test(x.side || '')).map(x => x.dir + '|' + (x.side || '')); if (new Set(d).size < d.length) amb++; });
    const cells = m.edges.map(e => new Set(e.path.map(c => c[0] + ',' + c[1])));
    for (let i = 0; i < m.edges.length; i++) for (let j = i + 1; j < m.edges.length; j++) { const A = m.edges[i], B = m.edges[j]; if ([A.a, A.b].some(r => r === B.a || r === B.b)) continue; let hit = false; for (const c of cells[i]) if (cells[j].has(c)) { hit = true; break; } if (hit && !((A.meets || []).includes(j) && (B.meets || []).includes(i))) hidden++; }
    ok(wrong === 0, seed + ': every exit names the wall its door is drawn in (' + ends + ' door ends)');
    ok(amb === 0, seed + ': no room lists two doors it cannot tell apart');
    ok(barredSame === 0, seed + ': a barred door reads differently from its two sides and has a rule (' + barred + ' barred)');
    ok(hidden === 0, seed + ': no two unrelated passages share floor without the key saying they meet');
    if (seed === 'drowned-beacon-78') {
      await p.click('#tabs button[data-tab="room"]'); await p.waitForTimeout(200);
      const t = await p.textContent('#tabBody'); ok(/West: open passage to room 2/.test(t), 'room 1 of drowned-beacon-78 says its door is in the west wall, as drawn');
      const body = await p.evaluate(() => document.body.innerText); ok(!/\bDM\b/.test(body), 'the game master is never called DM on screen');
      ok(/Medium \(12 to 17 rooms\)/.test(await p.innerHTML('#cfgSize')), 'the settings give the real room counts');
      await p.emulateMedia({ media: 'print' }); const pr = await p.evaluate(() => getComputedStyle(document.body, '::before').content); ok(/open Export/.test(pr), 'pressing Print on the game explains where printing lives'); await p.emulateMedia({ media: 'screen' });
    }
    await ctx.close();
  }

  // ---------- 2. the light ----------
  { const T0 = '2026-11-09T20:00:00';
    let { ctx, p } = await open(link('drowned-beacon-78'), null, T0);
    await p.selectOption('#lightSource', 'lantern'); await p.click('#btnLight'); await p.clock.runFor(1000);
    const lan = await secs(p); ok(lan <= 3600 && lan >= 3595, 'a lantern burns one hour, as its label says (reads ' + await p.textContent('#torchTime') + ')');
    await p.selectOption('#lightSource', 'torch'); await p.click('#btnLight'); await p.clock.runFor(1000);
    const a = await secs(p);
    // a tab nobody is looking at: twenty minutes pass, and its timers fire once at most
    await p.clock.fastForward('20:00'); await p.clock.runFor(1000);
    const c = await secs(p); ok(a - c >= 1195 && a - c <= 1205, 'twenty minutes with the timers held back cost twenty minutes of torch (burned ' + (a - c) + ' s)');
    // reload: the torch is where the clock says
    await p.reload(); await p.clock.runFor(1500);
    const d = await secs(p); ok(d <= c && d >= c - 5, 'a reload keeps the torch burning (' + c + ' s before, ' + d + ' s after)');
    ok(/burning while you were away/.test(await p.textContent('#torchState')), 'and says so');
    // pause holds across a reload
    await p.click('#btnPause'); await p.clock.runFor(500); const held = await secs(p);
    await p.reload(); await p.clock.runFor(4000);
    ok(await secs(p) === held && (await p.textContent('#btnPause')).trim() === 'Resume', 'a paused torch is still paused, at the same time, after a reload (' + held + ' s)');
    await p.click('#btnPause'); await p.clock.runFor(3000); const moving = await secs(p); ok(held - moving >= 2 && held - moving <= 4, 'Resume starts it again');
    // warnings that were slept through fire once, the later one
    await p.clock.fastForward((moving - 200) * 1000); await p.clock.runFor(1000);
    ok(/Five minutes/.test(await p.textContent('#torchState')), 'waking inside the last five minutes gives the five-minute warning');
    // the light dies while the tab is away
    await p.clock.fastForward('10:00'); await p.clock.runFor(1500);
    ok(await p.evaluate(() => document.body.classList.contains('dark')) && /The light dies/.test(await p.textContent('#torchState')), 'it goes out on time while the tab is away');
    await ctx.close();
    // an expired torch: found out within the evening, forgotten by the next day
    ({ ctx, p } = await open(link('drowned-beacon-78'), null, T0)); await p.click('#btnLight'); await p.clock.runFor(1000);
    const p2 = await ctx.newPage(); await p2.clock.install({ time: new Date('2026-11-09T21:30:00') }); await p2.goto(URL0 + link('drowned-beacon-78')); await p2.clock.runFor(1500);
    ok(await p2.evaluate(() => document.body.classList.contains('dark')) && /died while you were away/.test(await p2.textContent('#torchState')), 'coming back after the hour: the light died while you were away');
    const p3 = await ctx.newPage(); await p3.clock.install({ time: new Date('2026-11-10T19:00:00') }); await p3.goto(URL0 + link('drowned-beacon-78')); await p3.clock.runFor(1500);
    ok(!(await p3.evaluate(() => document.body.classList.contains('dark'))) && (await p3.textContent('#torchTime')).trim() === '--:--', 'the next evening starts unlit');
    await ctx.close(); }

  // ---------- 3. what the table has done ----------
  { const { ctx, p } = await open(link('drowned-beacon-78'));
    await p.click('#tabs button[data-tab="loot"]'); await p.waitForTimeout(200);
    await p.locator('#tabBody input[data-loot]').nth(0).check(); await p.waitForTimeout(150); await p.locator('#tabBody input[data-loot]').nth(2).check(); await p.waitForTimeout(150);
    const carried = await p.textContent('#xpFoot');
    await p.reload(); await p.waitForTimeout(1200); await p.click('#tabs button[data-tab="loot"]'); await p.waitForTimeout(200);
    ok((await p.$$eval('#tabBody input[data-loot]:checked', x => x.length)) === 2 && (await p.textContent('#xpFoot')) === carried, 'ticked treasure survives a reload (' + carried.trim().slice(0, 40) + ')');
    const file = await saveGame(p, 'save_for_load.json');
    await p.click('#btnBank'); await p.waitForTimeout(200); const banked = await p.textContent('#banked');
    await p.reload(); await p.waitForTimeout(1200); await p.click('#tabs button[data-tab="loot"]'); await p.waitForTimeout(200);
    ok(+banked > 0 && (await p.textContent('#banked')) === banked, 'banked gold survives a reload (' + banked + ' gp)');
    // another dungeon, then the saved game comes back from its file
    await p.click('#btnRandom'); await p.waitForTimeout(600); await p.click('#btnRevealAll').catch(() => {});
    const chooser = p.waitForEvent('filechooser'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="load"]'); await (await chooser).setFiles(file); await p.waitForTimeout(900);
    await p.click('#tabs button[data-tab="loot"]'); await p.waitForTimeout(200);
    ok((await p.inputValue('#seedInput')) === 'drowned-beacon-78' && (await p.$$eval('#tabBody input[data-loot]:checked', x => x.length)) === 2, 'Load brings back the dungeon and its ticked treasure');
    ok(/^Loaded/.test(await p.textContent('#toast')), 'and says so');
    const junk = path.join(OUT, 'not_a_game.json'); fs.writeFileSync(junk, '{"hello":1}');
    const ch2 = p.waitForEvent('filechooser'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="load"]'); await (await ch2).setFiles(junk); await p.waitForTimeout(600);
    ok(/not a saved/.test(await p.textContent('#toast')), 'a file that is not a saved game is refused in plain words');
    await ctx.close(); }

  // ---------- 4. paper ----------
  { const { ctx, p } = await open(link('drowned-beacon-78'));
    for (const [x, name, limit] of [['dm', /_game_master\.html$/, 2.5], ['player', /_players\.html$/, 1.5]]) {
      const dl = p.waitForEvent('download'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="' + x + '"]'); const d = await dl; const f = path.join(OUT, 'print_' + x + '.html'); await d.saveAs(f);
      const doc = fs.readFileSync(f, 'utf8'); ok(name.test(d.suggestedFilename()), x + ' export is named ' + d.suggestedFilename());
      ok(/class="hatchL"/.test(doc) && !/<pattern/.test(doc) && !/url\(#(hatch|dots)/.test(doc), x + ' export draws its hatching as strokes, with no pattern fills');
      const pg = await ctx.newPage(); await pg.goto('file://' + f); await pg.waitForTimeout(500); const pdf = await pg.pdf({ format: 'Letter' }); fs.writeFileSync(path.join(OUT, 'print_' + x + '.pdf'), pdf);
      await pg.setViewportSize({ width: 900, height: 1150 }); await pg.screenshot({ path: path.join(OUT, 'print_' + x + '.png') }); await pg.close();
      ok(pdf.length < limit * 1e6, x + ' export prints to ' + (pdf.length / 1e6).toFixed(2) + ' MB (was 24 MB)'); }
    await ctx.close(); }

  await b.close(); srv.close();
  log.push('FAILS: ' + fails); console.log(log.join('\n'));
})().catch(e => { console.log(log.join('\n')); console.log('CRASH ' + e.stack); console.log('FAILS: 99'); process.exit(1); });
