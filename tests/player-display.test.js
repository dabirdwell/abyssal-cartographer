/* The player display (the Table): two windows in one browser, kept in step.
   node test_table.js FILE OUTDIR
   Prints PASS/FAIL lines and "FAILS: n"; any PAGEERROR line is a failure of its own. */
const { chromium, devices } = require('playwright');
const path = require('path'); const fs = require('fs');
const FILE = process.argv[2], OUT = process.argv[3]; const SRC = 'file://' + FILE;
fs.mkdirSync(OUT, { recursive: true });
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const wire = (p, name) => {
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(`[${name}] console.${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => log.push(`[${name}] PAGEERROR ${e.message}`));
};
const DM_HASH = '#grim-gate-63|1|4|1|m|oneshot|on|||sd|dm|01';

/* The engine, run here in Node, gives us the dungeon's secrets so we can prove the display never carries them. */
function engine() {
  const h = fs.readFileSync(FILE, 'utf8');
  const code = h.slice(h.indexOf('/*ENGINE-START*/'), h.indexOf('/*ENGINE-END*/'));
  const m = { exports: {} }; new Function('module', code)(m); return m.exports;
}
function secretsOf(model) {
  const s = new Set([model.genome.twist]);
  for (const r of model.rooms) {
    if (r.trap) s.add(r.trap.n);
    if (r.enc) s.add(r.enc.mon.name);
    if (r.puzzle) s.add(r.puzzle.a);
    if (r.riddle) s.add(r.riddle.a);
    if (r.secretNote) s.add(r.secretNote);
  }
  for (const f of model.factions || []) { s.add(f.leader.name); s.add(f.goal); }
  return [...s].filter(x => x && x.length > 3);
}
/* Visible and hidden text of the page, scripts and styles left out. */
const pageText = p => p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach(e => e.remove()); return c.textContent; });
const rooms = p => p.$$eval('#mapSvg .roomG', gs => gs.map(g => +g.dataset.room).sort((a, b) => a - b));
const dmName = async p => { await p.click('.tabs button[data-tab="over"]'); await p.waitForTimeout(150); return (await p.textContent('#tabBody .dun-title')).trim(); };

(async () => {
  const b = await chromium.launch();
  const AC = engine();

  /* ---------- 1. the game master opens the display from the Export menu ---------- */
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  const dm = await ctx.newPage(); wire(dm, 'dm');
  await dm.goto(SRC + DM_HASH); await dm.waitForTimeout(1200);
  ok(!(await dm.$('#roleDoor')) && !(await dm.evaluate(() => document.body.classList.contains('role-player'))), 'DM link opens in DM role, no door');
  ok(!(await dm.evaluate(() => document.body.classList.contains('table'))), 'a normal link is not the display');
  const name1 = await dmName(dm);
  const secrets1 = secretsOf(AC.generate({ seed: 'grim-gate-63', depth: 1, party: 4, level: 1, size: 'm', mode: 'oneshot', factions: 'on', origin: '', doom: '' }));
  log.push('dungeon: ' + name1 + ' · secrets to check: ' + secrets1.length);
  // the menu item and the sheet
  await dm.click('#btnExport'); await dm.waitForTimeout(150);
  ok(await dm.isVisible('#exportMenu button[data-x="table"]'), 'Export menu offers "Player display for a TV or iPad"');
  await dm.click('#exportMenu button[data-x="table"]'); await dm.waitForTimeout(250);
  ok(await dm.isVisible('#tblHelp'), 'choosing it opens the sheet');
  const link = await dm.$eval('#tblOpenLink', a => ({ href: a.href, target: a.target, rel: a.rel, text: a.textContent }));
  ok(/#table:grim-gate-63\|1\|4\|1\|m\|oneshot\|on\|\|\|sd\|player\|0100\|p$/.test(link.href) && link.target === '_blank' && /noopener/.test(link.rel), 'the link is a plain anchor to #table: plus the thirteen fields (reveal bits 0100 = room 1 of 16): ' + link.href.slice(link.href.indexOf('#')));
  ok(link.href.split('#')[0] === SRC, 'the link points at this same file');
  ok(link.text === 'Open the player display', 'link text');
  ok(/No player display is open yet/.test(await dm.textContent('#tblStatus')), 'sheet says no display is open yet');
  const sheet = await dm.textContent('#tblHelp');
  ok(/TV/.test(sheet) && /Sidecar/.test(sheet) && /same computer/.test(sheet), 'sheet explains the TV / Sidecar drag and the same-computer rule');
  ok(!/—/.test(sheet), 'no em dash in the sheet');
  await dm.click('#tblCopy'); await dm.waitForTimeout(300);
  ok((await dm.evaluate(() => navigator.clipboard.readText())) === link.href, 'Copy the address copies the same address');
  await dm.screenshot({ path: path.join(OUT, '70_dm_sheet.png') });
  ok(!/window\.open\(/.test(fs.readFileSync(FILE, 'utf8')), 'no window.open anywhere in the file');

  // open the display from the link's href, same context so BroadcastChannel spans both windows
  const disp = await ctx.newPage(); wire(disp, 'display');
  await disp.setViewportSize({ width: 1920, height: 1080 });
  await disp.goto(link.href); await disp.waitForTimeout(1200);
  ok(await disp.evaluate(() => document.body.classList.contains('table')), 'display boots in display mode');
  ok(/A player display is open and following/.test(await dm.textContent('#tblStatus')), 'DM sheet now says the display is following');
  ok((await disp.textContent('#tableName')).trim() === name1, 'display shows the dungeon name: ' + name1);
  ok(JSON.stringify(await rooms(disp)) === '[0]', 'display shows only room 1');
  ok(!(await disp.isVisible('#tableIdle')), 'idle screen is gone once the game master answers');
  ok(!(await disp.$('#sidebar')) && !(await disp.$('footer')) && !(await disp.isVisible('header')) && !(await disp.isVisible('#mapTools')) && !(await disp.isVisible('.torchbtns')), 'no DM controls in the display: sidebar and footer removed, header, map tools and torch buttons hidden');
  ok(await disp.isVisible('#torchTime') && (await disp.textContent('#torchTime')).trim() === '--:--', 'display shows the unlit clock');
  ok(/Nobody has lit a torch yet/.test(await disp.textContent('#torchState')), 'display carries the game master\u2019s torch line');
  await dm.click('#tblHelpClose'); await dm.waitForTimeout(150);
  await disp.screenshot({ path: path.join(OUT, '71_display_room1.png') });

  /* ---------- 2. reveals follow ---------- */
  await dm.click('#mapSvg .frontier >> nth=0', { force: true }); await dm.waitForTimeout(350);
  await dm.click('#mapSvg .frontier >> nth=0', { force: true }); await dm.waitForTimeout(500);
  const dmRev = await dm.evaluate(() => { const f = location.hash.split('|'); return f[11]; });
  const dRooms = await rooms(disp);
  ok(dRooms.length === 3, 'after two frontier clicks the display shows three rooms: ' + JSON.stringify(dRooms.map(x => x + 1)));
  const dHex = await disp.evaluate(() => location.hash.split('|')[11]);
  ok(dHex === dmRev, 'display reveal bits match the DM share link: ' + dHex);
  // current room highlighted: the DM's selected room draws its walls in the accent colour on the display
  const dmSel = await dm.evaluate(() => +document.querySelector('#tabBody .klabel').textContent.match(/Room (\d+)/)[1] - 1);
  ok(!!(await disp.$('#mapSvg .roomG[data-room="' + dmSel + '"] [stroke="var(--accent)"]')), 'display highlights the current room ' + (dmSel + 1));
  ok(!(await disp.$('#mapSvg .roomG[data-room="0"] [stroke="var(--accent)"]')) || dmSel === 0, 'and no longer the first room');
  // the Room tab, while the display is open, offers the read-aloud push
  ok(await dm.isVisible('#tabBody button[data-push="box"]') && await dm.isVisible('#tabBody button[data-push="clear"]'), 'Room tab offers "Read this aloud on the player display" and "Clear the player display"');
  await dm.click('#tabBody button[data-push="box"]'); await dm.waitForTimeout(700);
  ok(await disp.evaluate(() => document.getElementById('tableStage').classList.contains('on')), 'read-aloud card appears on the display');
  const cardText = await disp.textContent('#tBody');
  const dmBox = (await dm.textContent('#tabBody .boxed')).trim();
  ok(cardText.trim() === dmBox, 'the card carries the room\u2019s read-aloud text');
  await disp.screenshot({ path: path.join(OUT, '72_display_card.png') });
  await dm.click('#tabBody button[data-push="clear"]'); await dm.waitForTimeout(1300);
  ok(!(await disp.evaluate(() => document.getElementById('tableStage').classList.contains('on'))), 'Clear takes the card down');
  await disp.screenshot({ path: path.join(OUT, '73_display_three_rooms.png') });

  /* ---------- 3. the torch ---------- */
  await dm.click('#btnLight'); await dm.waitForTimeout(600);
  const t1 = (await disp.textContent('#torchTime')).trim();
  await disp.waitForTimeout(2200);
  const t2 = (await disp.textContent('#torchTime')).trim();
  ok(/^(\d+:)?\d\d:\d\d$/.test(t1) && /^(\d+:)?\d\d:\d\d$/.test(t2) && toSec(t2) < toSec(t1), 'display clock counts down: ' + t1 + ' then ' + t2);
  ok(await disp.evaluate(() => !document.getElementById('flame').classList.contains('out')), 'display flame is lit');
  const dmT = (await dm.textContent('#torchTime')).trim();
  ok(Math.abs(toSec(dmT) - toSec(t2)) <= 2, 'display clock within two seconds of the DM clock: ' + dmT + ' vs ' + t2);
  await dm.click('#btnPause'); await dm.waitForTimeout(500);
  const p1 = (await disp.textContent('#torchTime')).trim(); await disp.waitForTimeout(1600);
  ok((await disp.textContent('#torchTime')).trim() === p1, 'pause on the DM freezes the display clock at ' + p1);
  await dm.click('#btnPause'); await dm.waitForTimeout(300);
  await dm.screenshot({ path: path.join(OUT, '74_dm_window.png') });
  // lights out
  await dm.click('#btnSnuff'); await dm.waitForTimeout(700);
  ok(await disp.evaluate(() => document.body.classList.contains('dark')), 'snuffing the torch darkens the display');
  ok(await disp.isVisible('.darkbanner') && /in the dark/.test(await disp.textContent('.darkbanner')), 'the dark banner shows on the display');
  ok(/snuff/.test(await disp.textContent('#torchState')), 'display carries the snuff line');
  await disp.waitForTimeout(1200);
  await disp.screenshot({ path: path.join(OUT, '75_display_lights_out.png') });

  /* ---------- 4. New follows ---------- */
  await dm.click('#btnLight'); await dm.waitForTimeout(300);
  await dm.click('#btnRandom'); await dm.waitForTimeout(900);
  const name2 = await dmName(dm);
  const seed2 = await dm.inputValue('#seedInput');
  ok(name2 !== name1 && (await disp.textContent('#tableName')).trim() === name2, 'after New the display shows the new dungeon: ' + name2);
  ok(JSON.stringify(await rooms(disp)) === '[0]', 'and only its first room');
  const dAddr = await disp.evaluate(() => location.hash);
  ok(dAddr.indexOf('#table:' + encodeURIComponent(seed2) + '|') === 0, 'display address follows the new seed: ' + dAddr);
  ok(!(await disp.evaluate(() => document.body.classList.contains('dark'))), 'new torch, display no longer dark');

  /* ---------- 5. no secrets on the display ---------- */
  const secrets2 = secretsOf(AC.generate({ seed: seed2, depth: 1, party: 4, level: 1, size: 'm', mode: 'oneshot', factions: 'on', origin: '', doom: '' }));
  const txt = await pageText(disp);
  const leaks = secrets1.concat(secrets2).filter(s => txt.includes(s));
  ok(leaks.length === 0, 'no twist, trap name, creature name, answer or secret note in the display DOM' + (leaks.length ? ': ' + JSON.stringify(leaks) : ''));
  ok(!/secret/i.test(txt), 'the word "secret" never appears on the display');
  ok(!/Bestiary|Treasure|Game master|Overview/.test(txt), 'no tab names on the display');
  ok(!/Reveal all|Reset fog|Fit map|Light torch|Snuff|Expedition terms|Generate|Export/.test(txt), 'no game master control labels anywhere in the display DOM, hidden or not');
  ok(!txt.includes(dmBox), 'the cleared card left no words behind');
  fs.writeFileSync(path.join(OUT, 'display_text.txt'), txt);

  /* ---------- 6. the display reloads on its own address and keeps up ---------- */
  await dm.click('#mapSvg .frontier >> nth=0', { force: true }); await dm.waitForTimeout(400);
  await disp.reload(); await disp.waitForTimeout(1200);
  ok((await rooms(disp)).length === 2 && (await disp.textContent('#tableName')).trim() === name2, 'a reloaded display rebuilds the dungeon from its address and catches up');

  /* ---------- 7. player role hides the control ---------- */
  await dm.click('#btnRole'); await dm.waitForTimeout(400);
  ok(await dm.evaluate(() => document.body.classList.contains('role-player')) && !(await dm.isVisible('#btnExport')) && !(await dm.isVisible('#exportMenu button[data-x="table"]')), 'player role hides the Export menu and with it the display control');
  await dm.click('#btnRole'); await dm.waitForTimeout(300);
  await ctx.close();

  /* ---------- 8. display opened first: idle screen, then the game master arrives ---------- */
  const ctx2 = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const d2 = await ctx2.newPage(); wire(d2, 'display-first');
  await d2.goto(SRC + '#table'); await d2.waitForTimeout(800);
  ok(await d2.isVisible('#tableIdle') && (await rooms(d2)).length === 0, 'a bare #table shows the idle screen and no map');
  ok(/waiting for the game master/i.test(await d2.textContent('#tableIdle')), 'idle screen says it waits for the game master');
  await d2.screenshot({ path: path.join(OUT, '76_display_idle.png') });
  const dm2 = await ctx2.newPage(); wire(dm2, 'dm-second'); await dm2.setViewportSize({ width: 1440, height: 900 });
  await dm2.goto(SRC + DM_HASH); await dm2.waitForTimeout(1500);
  ok(!(await d2.isVisible('#tableIdle')) && JSON.stringify(await rooms(d2)) === '[0]' && (await d2.textContent('#tableName')).trim() === name1, 'the game master\u2019s window arriving later wakes the display');
  // the Room tab shows the push buttons only while a display is open
  await dm2.click('.tabs button[data-tab="room"]'); await dm2.waitForTimeout(200);
  ok(await dm2.isVisible('#tabBody button[data-push="box"]'), 'DM Room tab offers the read-aloud push while the display is open');
  // a real window close fires pagehide (the display says goodbye); if that message were lost, the DM's ten-second watchdog notices the silence
  const t0 = Date.now();
  await d2.goto('about:blank'); await d2.close();
  let gone = false;
  for (let i = 0; i < 24 && !gone; i++) { await dm2.waitForTimeout(500); gone = !(await dm2.$('#tabBody button[data-push="box"]')); }
  ok(gone, 'closing the display removes the push buttons from the Room tab after ' + (Date.now() - t0) + ' ms');
  ok(/closed|stopped answering/.test(await dm2.textContent('#toast')), 'and the DM is told: ' + (await dm2.textContent('#toast')));
  await ctx2.close();

  /* ---------- 9. phone: the display address alone draws the dungeon ---------- */
  const ctx3 = await b.newContext({ ...devices['iPhone 13'] });
  const ph = await ctx3.newPage(); wire(ph, 'phone-display');
  await ph.goto(SRC + '#table:drowned-beacon-78|1|4|1|m|oneshot|on|||5e|player|03|p'); await ph.waitForTimeout(1000);
  const w = await ph.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(w.sw === w.cw, 'phone display: no horizontal overflow ' + JSON.stringify(w));
  ok(JSON.stringify(await rooms(ph)) === '[0,1]' && /Feasthall/.test(await ph.textContent('#tableName')), 'phone display builds two lit rooms from its address with no game master yet');
  ok(/Waiting for the game master/.test(await ph.textContent('#torchState')), 'and says it is waiting');
  await ph.screenshot({ path: path.join(OUT, '77_phone_display.png') });
  await ctx3.close();

  await b.close();
  console.log(log.join('\n'));
  console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL') || /PAGEERROR/.test(l)).length);
})();
function toSec(t) { const p = t.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
