/* Art workstream test: torchlight on the map and wall hatching.
   Usage: node test_art.js FILE OUTDIR
   Screenshots at deviceScaleFactor 2 for the human reviewer; a few checks print PASS/FAIL. */
const { chromium, devices } = require('playwright');
const path = require('path'); const fs = require('fs');
const FILE = process.argv[2], OUT = process.argv[3]; const SRC = 'file://' + FILE;
fs.mkdirSync(OUT, { recursive: true });
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const PLINK = '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p';
const DMLINK = '#grim-gate-63|1|4|1|m|oneshot|on|||sd|dm|01';
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

async function open(b, name, opts, hash, clock) {
  const ctx = await b.newContext(Object.assign({ permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true }, opts));
  const p = await ctx.newPage();
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(`[${name}] console.${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => log.push(`[${name}] PAGEERROR ${e.message}`));
  if (clock) await p.clock.install({ time: new Date('2026-11-06T20:00:00') });
  await p.goto(SRC + (hash || ''));
  if (clock) await p.clock.runFor(1500); else await p.waitForTimeout(1300);
  return { ctx, p };
}
const shot = (p, name, o) => p.screenshot(Object.assign({ path: path.join(OUT, name) }, o || {}));
const mapBox = p => p.evaluate(() => { const r = document.querySelector('#mapPane').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const lightState = p => p.evaluate(() => {
  const s = document.querySelector('#mapSvg');
  const g = s.querySelector('#tlG'), d = s.querySelector('#tlD'), L = s.querySelector('.tlL');
  return { cls: s.getAttribute('class') || '', rG: g && +g.getAttribute('r'), rD: d && +d.getAttribute('r'),
    pos: L && L.style.transform, lOpacity: L && getComputedStyle(L).opacity,
    glowOp: L && getComputedStyle(s.querySelector('.tlGlow')).opacity, darkOp: L && getComputedStyle(s.querySelector('.tlDark')).opacity,
    coreStop: d && getComputedStyle(d.querySelector('stop')).stopOpacity, midStop: d && getComputedStyle(d.querySelectorAll('stop')[1]).stopOpacity,
    hatchPaths: s.querySelectorAll('.hatchL use').length, rooms: s.querySelectorAll('.roomG').length, frontier: s.querySelectorAll('.frontier').length,
    dark: document.body.classList.contains('dark'), time: document.querySelector('#torchTime').textContent };
});
async function lightRooms(p, nums) { /* through the Game master tab's room-number box */
  await p.click('.tabs button[data-tab="gm"]'); await p.waitForTimeout(150);
  for (const n of nums) { await p.fill('#revealNum', String(n)); await p.click('#btnRevealNum'); await p.waitForTimeout(250); await p.click('.tabs button[data-tab="gm"]'); await p.waitForTimeout(120); }
}
/* CSS transitions and animations run on real time, not the page's fake clock, so visual settling uses real waits */
const settle = (p, ms) => p.waitForTimeout(ms || 1500);
/* fast-forward the torch to a given number of seconds left, read from the clock on the torch bar */
async function burnTo(p, secondsLeft) {
  const shown = await p.textContent('#torchTime'); const m = shown.match(/(\d+):(\d+)$/); const have = +m[1] * 60 + +m[2];
  await p.clock.runFor((have - secondsLeft) * 1000);
}

(async () => {
  const b = await chromium.launch();

  // (a) DM view, fresh load through a DM link (no door card): never lit, then lit
  let { ctx, p } = await open(b, 'dm', DESK, DMLINK, true);
  let st = await lightState(p);
  ok(/tl-none/.test(st.cls) && st.lOpacity === '0', 'never lit: light layer present but invisible ' + JSON.stringify({ cls: st.cls, op: st.lOpacity }));
  ok(st.hatchPaths === st.rooms * 3 && st.rooms > 0, 'hatching: three bands per room (' + st.hatchPaths + ' paths, ' + st.rooms + ' rooms)');
  await shot(p, 'a1_dm_never_lit.png');
  const mb = await mapBox(p);
  await shot(p, 'a1_dm_never_lit_map.png', { clip: mb });
  await p.click('#btnLight'); await p.clock.runFor(1000); await settle(p);
  st = await lightState(p);
  ok(!/tl-none/.test(st.cls) && /tl-dm/.test(st.cls) && st.lOpacity === '1', 'DM view lit: layer visible, dm class ' + JSON.stringify({ cls: st.cls, op: st.lOpacity, rG: st.rG }));
  ok(st.glowOp === '0.7' && st.darkOp === '0.24', 'DM view strengths come from the css variables ' + JSON.stringify({ glow: st.glowOp, dark: st.darkOp }));
  ok(Math.abs(st.rG - 9.5 * 14) < 0.2, 'fresh torch reaches full (' + st.rG + ' map units)');
  await shot(p, 'a2_dm_lit.png');
  // the light glides to a newly selected room (selected through the Overview list, which calls select())
  const before = st.pos;
  await p.click('.tabs button[data-tab="over"]'); await p.waitForTimeout(150);
  const posOf = () => p.evaluate(() => { const L = document.querySelector('.tlL'); const m = new DOMMatrixReadOnly(getComputedStyle(L).transform); return [Math.round(m.e), Math.round(m.f)]; });
  const p0 = await posOf();
  await p.click('.rrow[data-goto-room="3"]'); await p.waitForTimeout(250);
  const p1 = await posOf();
  await settle(p, 900);
  st = await lightState(p); const p2 = await posOf();
  ok(st.pos !== before, 'selecting room 4 moves the light (style transform ' + before + ' -> ' + st.pos + ')');
  ok((p1[0] !== p0[0] || p1[1] !== p0[1]) && (p1[0] !== p2[0] || p1[1] !== p2[1]), 'the light glides rather than jumps (computed position at 0 ms ' + p0 + ', 250 ms ' + p1 + ', settled ' + p2 + ')');
  await shot(p, 'a3_dm_lit_room4.png');
  // switch to Player view in the DM role: strong falloff
  await p.click('#viewToggle button[data-view="player"]'); await settle(p);
  st = await lightState(p);
  ok(!/tl-dm/.test(st.cls) && st.darkOp === '0.8', 'player view in the DM role: strong falloff ' + JSON.stringify({ cls: st.cls, dark: st.darkOp }));
  await shot(p, 'a4_dm_role_player_view.png');
  // print export: the DM guide, saved and opened as a page
  await p.click('#viewToggle button[data-view="dm"]'); await p.waitForTimeout(300);
  const [dlw] = await Promise.all([p.waitForEvent('download'), (async () => { await p.click('#btnExport'); await p.click('#exportMenu button[data-x="dm"]'); })()]);
  const dmGuide = path.join(OUT, 'dm_guide_export.html'); await dlw.saveAs(dmGuide);
  const guide = fs.readFileSync(dmGuide, 'utf8');
  ok(!/class="tlL"/.test(guide) && !/id="tlG"/.test(guide) && !/id="tlD"/.test(guide), 'print export carries no torchlight');
  ok(/class="hatchL"/.test(guide) && !/<pattern/.test(guide) && /href="#wp0"/.test(guide), 'print export carries the hatching, as strokes and with no pattern fills');
  await ctx.close();

  // (f) the exported guide, rendered
  ({ ctx, p } = await open(b, 'guide', DESK));
  await p.goto('file://' + dmGuide); await p.waitForTimeout(800);
  const svgBox = await p.evaluate(() => { const r = document.querySelector('svg').getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, 860) }; });
  await p.evaluate(() => document.querySelector('svg').scrollIntoView());
  await p.waitForTimeout(200);
  const svgBox2 = await p.evaluate(() => { const r = document.querySelector('svg').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await shot(p, 'f_dm_guide_print_map.png', { clip: svgBox2 });
  await shot(p, 'f_dm_guide_print_page.png');
  await ctx.close();

  // (b) player role via the link, torch lit, rooms 1 to 3 lit
  ({ ctx, p } = await open(b, 'player', DESK, PLINK, true));
  ok(await p.evaluate(() => document.body.classList.contains('role-player')), 'player link opens in the player role');
  await p.click('#btnLight'); await p.clock.runFor(1000);
  await lightRooms(p, [2, 3]);
  await settle(p);
  st = await lightState(p);
  ok(st.rooms === 3 && !/tl-dm/.test(st.cls) && st.darkOp === '0.8', 'player role: three rooms lit, strong falloff ' + JSON.stringify({ rooms: st.rooms, cls: st.cls, dark: st.darkOp }));
  await shot(p, 'b_player_lit_full.png');
  await shot(p, 'b_player_lit_full_map.png', { clip: await mapBox(p) });

  // half an hour in: the reach has shrunk
  await burnTo(p, 30 * 60); await settle(p, 300);
  st = await lightState(p);
  log.push('reach at thirty minutes: ' + st.rG + ' map units (' + (st.rG / 14).toFixed(1) + ' cells; full is 9.5 cells)');
  ok(st.rG < 9.5 * 14 && st.rG > 3 * 14, 'at thirty minutes the light has drawn in but is not yet guttering');
  await shot(p, 'b2_player_30min_left_map.png', { clip: await mapBox(p) });
  // (c) the same, with the torch at four minutes left: fast-forward the page clock
  await burnTo(p, 4 * 60); await settle(p, 400);
  st = await lightState(p);
  ok(/^0?3:5\d$|^0?4:00$/.test(st.time) && /tl-gutter/.test(st.cls) && Math.abs(st.rG - 3 * 14) < 0.2, 'four minutes left: guttering circle ' + JSON.stringify({ time: st.time, cls: st.cls, rG: st.rG }));
  await shot(p, 'c_player_4min_left.png');
  await shot(p, 'c_player_4min_left_map.png', { clip: await mapBox(p) });
  // (d) lights out
  await burnTo(p, 0); await p.clock.runFor(1200); await settle(p);
  st = await lightState(p);
  ok(st.dark && /tl-out/.test(st.cls) && st.glowOp === '0' && st.darkOp === '0.93', 'lights out: cold, nearly black ' + JSON.stringify({ dark: st.dark, cls: st.cls, glow: st.glowOp, edge: st.darkOp, core: st.coreStop }));
  ok(st.frontier > 0, 'frontier markers still drawn in the dark (' + st.frontier + ')');
  await shot(p, 'd_player_lights_out.png');
  await shot(p, 'd_player_lights_out_map.png', { clip: await mapBox(p) });
  // relight: the map warms again
  await p.click('#btnLight'); await p.clock.runFor(1000); await settle(p);
  st = await lightState(p);
  ok(!st.dark && !/tl-out/.test(st.cls) && st.glowOp === '1', 'a new torch brings the colour back');
  // (e) zoomed in on the hatching: wheel over the current room's label, so the zoom keeps it under the pointer
  const box = await mapBox(p);
  const lab = await p.evaluate(() => { const r = document.querySelector('#mapSvg .roomG[data-room="2"] circle').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(lab.x, lab.y);
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -100); await p.waitForTimeout(40); }
  await settle(p, 500);
  await shot(p, 'e_zoomed_hatching.png', { clip: { x: Math.max(box.x, lab.x - 330), y: Math.max(box.y, lab.y - 240), width: 660, height: 480 } });
  await shot(p, 'e_zoomed_hatching_pane.png', { clip: box });
  await ctx.close();

  // DM view when the torch is out (gentle: the DM still reads the map)
  ({ ctx, p } = await open(b, 'dmout', DESK, DMLINK, true));
  await p.click('#btnLight'); await p.clock.runFor(61 * 60 * 1000); await settle(p);
  st = await lightState(p);
  ok(st.dark && /tl-dm/.test(st.cls) && st.darkOp === '0.42', 'DM view, torch out: a cold tint, not a blackout ' + JSON.stringify({ edge: st.darkOp, core: st.coreStop }));
  await shot(p, 'g_dm_lights_out.png');
  // candle: shorter reach
  await p.selectOption('#lightSource', 'candle'); await p.click('#btnLight'); await p.clock.runFor(1000); await settle(p);
  st = await lightState(p);
  ok(Math.abs(st.rG - 5.5 * 14) < 0.2, 'a candle reaches only close (' + st.rG + ' map units)');
  await shot(p, 'h_dm_candle.png');
  // reduced motion: no pulse animation
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector('.tlPulse')).animationName);
  ok(anim === 'none', 'reduced motion switches the flicker off (animation-name ' + anim + ')');
  await p.emulateMedia({ reducedMotion: 'no-preference' });
  const anim2 = await p.evaluate(() => getComputedStyle(document.querySelector('.tlPulse')).animationName);
  ok(anim2 === 'tlbreathe', 'otherwise the slow breathing runs (animation-name ' + anim2 + ')');
  await ctx.close();

  // Frame-time sanity: a Large dungeon, time renderMap(true) through the Fit map button (its click handler is renderMap(true))
  ({ ctx, p } = await open(b, 'perf', DESK, DMLINK));
  await p.click('#btnConfig'); await p.selectOption('#cfgSize', 'l'); await p.click('#btnApplyCfg'); await p.waitForTimeout(800);
  const nRooms = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  await p.click('#btnLight'); await p.waitForTimeout(300);
  const timing = await p.evaluate(() => {
    const btn = document.querySelector('#btnFit'), ts = [];
    for (let i = 0; i < 25; i++) { const t0 = performance.now(); btn.click(); ts.push(performance.now() - t0); }
    ts.sort((a, b) => a - b);
    const els = document.querySelectorAll('#mapSvg *').length;
    return { median: +ts[12].toFixed(2), p90: +ts[22].toFixed(2), max: +ts[24].toFixed(2), elements: els };
  });
  // paint cost: frames per second over two seconds with the flicker running (requestAnimationFrame sampling)
  const fps = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
  log.push('perf: Large dungeon, ' + nRooms + ' rooms, ' + timing.elements + ' svg elements; renderMap(true) median ' + timing.median + ' ms, p90 ' + timing.p90 + ' ms, max ' + timing.max + ' ms; ' + fps + ' frames per second while the light breathes');
  ok(timing.median < 40, 'renderMap(true) on a Large dungeon stays under 40 ms (median ' + timing.median + ' ms)');
  await shot(p, 'i_large_dm_lit.png');
  await ctx.close();

  // Phone, player role, lit
  ({ ctx, p } = await open(b, 'phone', { ...devices['iPhone 13'] }, PLINK, true));
  await p.click('#btnLight'); await p.clock.runFor(1000); await settle(p);
  const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(w.sw === w.cw, 'phone: no horizontal overflow ' + JSON.stringify(w));
  await shot(p, 'j_phone_player_lit.png');
  await ctx.close();

  await b.close();
  console.log(log.join('\n'));
  console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
