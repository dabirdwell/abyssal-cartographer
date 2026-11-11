const { chromium, devices } = require('playwright');
const path = require('path'); const fs = require('fs');
const FILE = process.argv[2], OUT = process.argv[3]; const SRC = 'file://' + FILE;
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
async function open(b, name, opts, hash) {
  const ctx = await b.newContext(Object.assign({ permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true }, opts));
  const p = await ctx.newPage();
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(`[${name}] console.${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => log.push(`[${name}] PAGEERROR ${e.message}`));
  await p.goto(SRC + (hash || '')); await p.waitForTimeout(1300); return { ctx, p };
}
const vis = (p, sel) => p.isVisible(sel);
(async () => {
  const b = await chromium.launch();

  // 1. Bare load: the door
  let { ctx, p } = await open(b, 'door', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  ok(await vis(p, '#roleDoor'), 'door shows on a bare first visit');
  ok(!(await p.$('#qNote')), 'folded note waits while the door is up');
  await p.screenshot({ path: path.join(OUT, '60_door.png') });
  await p.click('#doorPlayer'); await p.waitForTimeout(500);
  ok(!(await p.$('#roleDoor')), 'door closes');
  ok(await p.evaluate(() => document.body.classList.contains('role-player')), 'player role set');
  ok((await p.textContent('header .rules')).trim() === 'D&D 5e' && !(await p.$('#sysToggle')), 'the page says which rules it uses, and there is no switch to any other');
  ok(!(await vis(p, '.seedbox')) && !(await vis(p, '#viewToggle')) && !(await vis(p, '#btnExport')) && !(await vis(p, '#btnQuire')), 'DM controls hidden');
  ok(await vis(p, '#btnNewP') && await vis(p, '#btnRole'), 'New dungeon and role switch visible');
  ok(!(await vis(p, '.tabs button[data-tab="best"]')) && !(await vis(p, '.tabs button[data-tab="loot"]')) && await vis(p, '.tabs button[data-tab="gm"]'), 'tabs: gm shown, bestiary and treasure hidden');
  ok(await vis(p, '#btnCopyGM'), 'game master panel is the open tab');
  const revealedCount = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  log.push('room groups drawn in player map: ' + revealedCount);
  ok(!(await vis(p, '#btnRevealAll')) && !(await vis(p, '#btnFactionTint')), 'reveal-all and faction ink hidden');
  await p.screenshot({ path: path.join(OUT, '61_player_table.png') });
  ok(await p.textContent('#xpFoot') === '◆ Your game master keeps track of treasure and points.', 'footer in player role');
  // overview hides factions, room tab hides unrevealed
  await p.click('.tabs button[data-tab="over"]'); await p.waitForTimeout(200);
  const over = await p.textContent('#tabBody');
  ok(!/Factions/.test(over) && !/truth of this place/i.test(over), 'overview hides factions and the twist for a player');
  // copy prompt
  await p.click('.tabs button[data-tab="gm"]'); await p.waitForTimeout(200);
  await p.click('#btnCopyGM'); await p.waitForTimeout(400);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  fs.writeFileSync(path.join(OUT, 'prompt_player_5e.txt'), clip);
  ok(/\[Map: room 4\]/.test(clip) && /official stat block/.test(clip) && !/close = 5 feet|\bMV\b|, LV \d/.test(clip) && /Speed \d+ ft/.test(clip), 'prompt: map tag rule, SRD monsters, and every distance in feet');
  ok(!/the the|the The/.test(clip) && !/undefined/.test(clip), 'prompt: no doubled articles, no undefined');
  const lines = clip.split('\n').filter(l => l.startsWith('READ-ALOUD: ')).map(l => l.slice(12));
  const sentences = lines.flatMap(l => l.match(/[^.!?]+[.!?]+/g) || [l]).map(s => s.trim());
  const dup = sentences.filter((s, i) => sentences.indexOf(s) !== i);
  log.push('read-aloud sentences: ' + sentences.length + ', repeated after dedupe: ' + dup.length + (dup.length ? ' e.g. ' + JSON.stringify(dup.slice(0, 2)) : ''));
  ok((await p.textContent('#toast')).startsWith('Copied. Now open'), 'copy toast from the table');
  // links
  const links = await p.$$eval('.gmlinks a', as => as.map(a => [a.textContent, a.href, a.target, a.rel]));
  ok(links.length === 3 && links.every(l => l[2] === '_blank' && /noopener/.test(l[3])), 'three AI links open in new tabs: ' + JSON.stringify(links.map(l => l[1])));
  // reveal by number
  const n = await p.evaluate(() => 2);
  await p.fill('#revealNum', '2'); await p.click('#btnRevealNum'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#tabBody').textContent.includes('Room 2')), 'typing a room number lights it and opens it');
  await p.click('.tabs button[data-tab="gm"]'); await p.fill('#revealNum', '99'); await p.click('#btnRevealNum'); await p.waitForTimeout(200);
  ok(/run 1 to/.test(await p.textContent('#toast')), 'out-of-range room number is explained');
  // dice
  await p.click('.dice button.d20'); await p.waitForTimeout(100);
  const d = +(await p.textContent('#diceOut'));
  ok(d >= 1 && d <= 20, 'd20 rolls ' + d);
  // margins never fire for a player: light rooms 3 and 4 by number, watch toasts
  const toasts = [];
  p.on('console', () => {});
  await p.fill('#revealNum', '3'); await p.click('#btnRevealNum'); await p.waitForTimeout(150); toasts.push(await p.textContent('#toast'));
  ok(!toasts.some(t => t.startsWith('✎')), 'no Quire margin note for a player: ' + JSON.stringify(toasts));
  // share link carries role
  await p.click('#btnShare'); await p.waitForTimeout(300);
  const share = await p.evaluate(() => navigator.clipboard.readText());
  ok(/\|p$/.test(share), 'share link ends with the player flag: ' + share.slice(share.indexOf('#')));
  // switch back to DM
  await p.click('#btnRole'); await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.body.classList.contains('role-player'))), 'Be the game master restores DM role');
  ok(await vis(p, '.seedbox') && await vis(p, '#btnExport') && await vis(p, '.tabs button[data-tab="best"]'), 'DM controls back');
  await p.click(".tabs button[data-tab=\"over\"]"); await p.waitForTimeout(200); ok(/Factions/.test(await p.textContent("#tabBody")), "DM overview shows factions again");
  await p.screenshot({ path: path.join(OUT, '62_back_to_dm.png') });
  // 5e guide wording in DM mode (still 5e)
  await p.click('#btnQuire'); await p.waitForTimeout(300); await p.click('#qNext'); await p.waitForTimeout(200); await p.click('#qNext'); await p.waitForTimeout(200);
  const step2 = await p.textContent('#qSheet');
  ok(/adventurers/.test(step2) && !/delver/.test(step2) && /fifth edition/.test(step2), 'guide step 2 in 5e: adventurers, no delvers');
  for (let i = 0; i < 6; i++) { await p.click('#qNext'); await p.waitForTimeout(120); }
  const step8 = await p.textContent('#qSheet');
  ok(/How they grow/.test(step8) && /creatures defeated/.test(step8), 'guide step 8 in 5e is the 5e version');
  await p.keyboard.press('Escape');
  // remembered choice: a new page in the SAME context (same localStorage) with no hash -> DM (last choice), no door
  const p2 = await ctx.newPage(); await p2.goto(SRC); await p2.waitForTimeout(1200);
  ok(!(await p2.$('#roleDoor')) && !(await p2.evaluate(() => document.body.classList.contains('role-player'))), 'remembered choice (dm) skips the door');
  await ctx.close();

  // 2. Player link opens straight into the table, no door, 5e
  ({ ctx, p } = await open(b, 'plink', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '#drowned-beacon-78|1|4|1|m|oneshot|on|||5e|player|01|p'));
  ok(!(await p.$('#roleDoor')) && await p.evaluate(() => document.body.classList.contains('role-player')), 'player link: no door, player role');
  ok(await vis(p, '#btnCopyGM') && /Marked Feasthall/.test(await p.textContent('#tabBody')), 'player link: table shows the linked dungeon');
  await p.screenshot({ path: path.join(OUT, '63_player_link.png') });
  // remembered player choice: bare load in same context -> player, 5e, no door
  const p3 = await ctx.newPage(); await p3.goto(SRC); await p3.waitForTimeout(1200);
  ok(await p3.evaluate(() => document.body.classList.contains('role-player')) && !(await p3.$('#roleDoor')), 'remembered choice (player) opens the table');
  await ctx.close();

  // 3. Old 12-field DM link: unchanged behaviour, folded note appears
  ({ ctx, p } = await open(b, 'oldlink', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '#grim-gate-63|1|4|1|m|oneshot|on|||sd|dm|01'));
  ok(!(await p.$('#roleDoor')) && !(await p.evaluate(() => document.body.classList.contains('role-player'))), 'old link: DM role, no door');
  ok(!!(await p.$('#qNote')), 'old link: folded note drops');
  const svg26 = await p.innerHTML('#mapSvg');
  fs.writeFileSync(path.join(OUT, 'map26.svg.txt'), svg26);
  // the prompt names fifth edition and carries no other game's rules
  await p.click('#btnExport'); await p.click('#exportMenu button[data-x="ai"]'); await p.waitForTimeout(300);
  const sd = await p.evaluate(() => navigator.clipboard.readText());
  ok(/Dungeons & Dragons 5th edition, the SRD rules you know/.test(sd) && !/old-school|difficulty of 9|10 points is a level|Shadowdark|Arcane Library/.test(sd), 'a link that asks for the old rules still gets a fifth-edition prompt, with no other game in it');
  fs.writeFileSync(path.join(OUT, 'prompt_dm_sd.txt'), sd);
  await ctx.close();

  // 4. Phone, player mode
  ({ ctx, p } = await open(b, 'phone', { ...devices['iPhone 13'] }, '#drowned-beacon-78|1|4|1|m|oneshot|on|||5e|player|01|p'));
  const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(w.sw === w.cw, 'phone: no horizontal overflow ' + JSON.stringify(w));
  await p.screenshot({ path: path.join(OUT, '64_phone_player.png') });
  await p.evaluate(() => document.querySelector('#sidebar').scrollIntoView());
  await p.screenshot({ path: path.join(OUT, '65_phone_player_panel.png') });
  await ctx.close();

  // 5. Bare load on the phone: the door fits
  ({ ctx, p } = await open(b, 'phonedoor', { ...devices['iPhone 13'] }));
  const dw = await p.evaluate(() => { const r = document.querySelector('#roleDoor').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), cw: document.documentElement.clientWidth }; });
  ok(dw.l >= 0 && dw.r <= dw.cw, 'phone: door fits ' + JSON.stringify(dw));
  await p.screenshot({ path: path.join(OUT, '66_phone_door.png') });
  await ctx.close();

  await b.close();
  console.log(log.join('\n'));
  console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
