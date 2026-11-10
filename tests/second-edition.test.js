/* v4.0: the second edition of the generator, and proof that the first edition still builds what it always built.
   node tests/second-edition.test.js /abs/path/index.html /abs/out/           runs the checks
   node tests/second-edition.test.js /abs/path/index.html /abs/out/ fixture   rewrites tests/fixtures/first-edition.json from that file
   Prints PASS/FAIL lines and ends with FAILS: n. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILE = process.argv[2], OUT = process.argv[3], MODE = process.argv[4] || '';
const log = []; let fails = 0; const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const src = fs.readFileSync(FILE, 'utf8');
const eng = path.join(OUT, 'engine_under_test.js'); fs.writeFileSync(eng, src.slice(src.indexOf('/*ENGINE-START*/'), src.indexOf('/*ENGINE-END*/')));
delete require.cache[require.resolve(eng)]; const AC = require(eng);
const FIX = path.join(__dirname, 'fixtures', 'first-edition.json');
const cfgOf = (seed, i, depth) => ({ seed, depth: depth || 1, party: [2, 3, 4, 5, 6][i % 5], level: [0, 1, 1, 2, 3, 5][i % 6], size: ['s', 'm', 'l'][i % 3], mode: ['oneshot', 'delve', 'campaign'][(i >> 1) % 3], factions: i % 11 === 0 ? 'off' : 'on', origin: '', doom: '' });
const dflt = seed => ({ seed, depth: 1, party: 4, level: 1, size: 'm', mode: 'oneshot', factions: 'on', origin: '', doom: '' });
/* everything a table could notice about a dungeon, except the words of a riddle (one riddle was reworded for every edition) */
const digest = m => crypto.createHash('sha1').update(JSON.stringify({ g: m.genome, r: m.rooms.map(r => ({ i: r.id, c: r.cls, cells: r.cells, n: r.name, b: r.box, d: r.detail, e: r.enc, t: r.trap, p: r.puzzle, ra: r.riddle && r.riddle.a, tr: r.treasure, l: r.light, f: r.faction, fl: r.flooded, ru: r.rubble, x: r.exits, s: r.secretNote, st: r.stairsDown })), e: m.edges, f: m.factions, b: m.boss, w: m.wander, t: m.town, sd: m.stairsDown, l: m.lairId })).digest('hex');
const firstCodes = []; for (let i = 0; i < 240; i++) firstCodes.push(['rev-' + i, i]); firstCodes.push(['drowned-beacon-78', 2], ['iron-gallery-11', 2], ['quire', 2], ['bob', 4]);

if (MODE === 'fixture') {
  const out = {}; firstCodes.forEach(([s, i]) => { out[s + '|' + i] = digest(AC.generate(cfgOf(s, i))); out[s + '|d'] = digest(AC.generate(dflt(s))); });
  [2, 3].forEach(d => { out['drowned-beacon-78|depth' + d] = digest(AC.generate(Object.assign(dflt('drowned-beacon-78'), { mode: 'campaign', depth: d }))); });
  fs.mkdirSync(path.dirname(FIX), { recursive: true }); fs.writeFileSync(FIX, JSON.stringify(out, null, 0)); console.log('fixture written: ' + Object.keys(out).length + ' dungeons'); process.exit(0);
}

// ---------- 1. a code with no suffix still builds the first-edition dungeon ----------
{ const fx = JSON.parse(fs.readFileSync(FIX, 'utf8')); let same = 0, n = 0; const bad = [];
  firstCodes.forEach(([s, i]) => { for (const [k, c] of [[s + '|' + i, cfgOf(s, i)], [s + '|d', dflt(s)]]) { n++; if (digest(AC.generate(c)) === fx[k]) same++; else if (bad.length < 4) bad.push(k); } });
  [2, 3].forEach(d => { n++; if (digest(AC.generate(Object.assign(dflt('drowned-beacon-78'), { mode: 'campaign', depth: d }))) === fx['drowned-beacon-78|depth' + d]) same++; else bad.push('depth' + d); });
  ok(same === n, 'first edition: ' + same + ' of ' + n + ' dungeons are exactly what v3.4 built' + (bad.length ? ' (differs: ' + bad.join(', ') + ')' : '')); }

// ---------- 2. the second edition keeps its promises ----------
const wallOf = (d, o) => o[1] < d[1] ? 'north' : o[1] > d[1] ? 'south' : o[0] > d[0] ? 'east' : 'west';
function walk(m, useSecrets) { /* play it: a locked door opens once its key's room is reached, a barred door only from its far side */
  const E = m.edges, keysAt = {}; E.forEach((e, k) => { if (e.type === 'locked' && e.keyIn != null) (keysAt[e.keyIn] = keysAt[e.keyIn] || []).push(k); });
  const have = new Set(), seen = new Set([0]); let ch = true;
  while (ch) { ch = false; seen.forEach(r => (keysAt[r] || []).forEach(k => { if (!have.has(k)) { have.add(k); ch = true; } }));
    E.forEach((e, k) => { const pass = e.type === 'open' || e.type === 'door' || e.type === 'stuck' || (e.type === 'secret' && useSecrets) || (e.type === 'locked' && have.has(k)) || (e.type === 'barred' && seen.has(e.a) && seen.has(e.b));
      if (!pass) return; if (seen.has(e.a) && !seen.has(e.b)) { seen.add(e.b); ch = true; } else if (seen.has(e.b) && !seen.has(e.a)) { seen.add(e.a); ch = true; } }); }
  return seen; }
{ const t = { n: 0, lair: 0, all: 0, keys: 0, gift: 0, name: 0, trap: 0, puzzle: 0, room: 0, sign: 0, wall: 0, hidden: 0, val: 0, e2: 0 }; const ex = {};
  const note = (k, s) => { t[k]++; if (!ex[k]) ex[k] = s; };
  for (let i = 0; i < 700; i++) { const seed = 'rev-' + i + '.2', m = AC.generate(i < 500 ? dflt(seed) : cfgOf(seed, i)); t.n++; if (m.ed === 2) t.e2++;
    const plain = walk(m, false), withS = walk(m, true);
    if (!plain.has(m.lairId)) note('lair', seed); if (withS.size < m.rooms.length) note('all', seed);
    if (m.edges.some(e => e.type === 'locked' && (e.keyIn == null || !plain.has(e.keyIn)) && !(plain.has(e.a) && plain.has(e.b)))) note('keys', seed);
    const gifts = m.factions.map(f => f.leader.gift && f.leader.gift.n); if (new Set(gifts).size < gifts.length) note('gift', seed);
    const firsts = m.factions.map(f => f.leader.name.split(' ')[0]).concat(m.town ? [m.town.keeper.split(',')[0], m.town.patron.name.split(' ')[0]] : []); if (new Set(firsts).size < firsts.length) note('name', seed + ' ' + firsts.join(','));
    const traps = m.rooms.filter(r => r.trap).map(r => r.trap.n); if (new Set(traps).size < traps.length) note('trap', seed);
    const puz = m.rooms.filter(r => r.puzzle).map(r => r.puzzle.n); if (new Set(puz).size < puz.length) note('puzzle', seed);
    const vals = m.rooms.flatMap(r => r.treasure.filter(x => x.kind === 'valuable').map(x => x.txt)); if (new Set(vals).size < vals.length && vals.length <= 24) note('val', seed);
    const names = m.rooms.map(r => r.name); if (new Set(names).size < names.length) note('room', seed + ' ' + names.filter((x, j) => names.indexOf(x) !== j).join(','));
    if (!m.rooms.some(r => r.clue)) note('sign', seed + ' twist: ' + m.genome.twist.slice(0, 50));
    m.edges.forEach(e => { [[e.a, e.b, e.da, e.path[0]], [e.b, e.a, e.db, e.path[e.path.length - 1]]].forEach(([from, to, d, o]) => { const x = m.rooms[from].exits.find(q => q.to === to + 1); if (!x || x.dir !== wallOf(d, o)) note('wall', seed); }); });
    const cells = m.edges.map(e => new Set(e.path.map(c => c[0] + ',' + c[1])));
    for (let a = 0; a < m.edges.length; a++) for (let b = a + 1; b < m.edges.length; b++) { const A = m.edges[a], B = m.edges[b]; if ([A.a, A.b].some(r => r === B.a || r === B.b)) continue; let hit = false; for (const c of cells[a]) if (cells[b].has(c)) { hit = true; break; } if (hit && !((A.meets || []).includes(b))) note('hidden', seed); } }
  ok(t.e2 === t.n, 'a code ending in .2 builds a second-edition dungeon (' + t.e2 + ' of ' + t.n + ')');
  ok(t.lair === 0, 'the boss can always be reached without a secret door, with every key found in turn' + (ex.lair ? ' (not in ' + t.lair + ', e.g. ' + ex.lair + ')' : ''));
  ok(t.all === 0, 'every room can be reached' + (ex.all ? ' (not in ' + t.all + ', e.g. ' + ex.all + ')' : ''));
  ok(t.keys === 0, 'no locked door waits on a key that cannot be reached' + (ex.keys ? ' (' + t.keys + ', e.g. ' + ex.keys + ')' : ''));
  ok(t.gift === 0, 'no two leaders share a special power' + (ex.gift ? ' (' + t.gift + ', e.g. ' + ex.gift + ')' : ''));
  ok(t.name === 0, 'nobody shares a first name' + (ex.name ? ' (' + t.name + ', e.g. ' + ex.name + ')' : ''));
  ok(t.trap === 0 && t.puzzle === 0 && t.val === 0, 'no trap, puzzle or valuable repeats in a dungeon' + (ex.trap || ex.puzzle || ex.val ? ' (e.g. ' + (ex.trap || ex.puzzle || ex.val) + ')' : ''));
  ok(t.room === 0, 'every room has a name of its own' + (ex.room ? ' (' + t.room + ', e.g. ' + ex.room + ')' : ''));
  ok(t.sign === 0, 'the truth of the place always leaves a sign in some room' + (ex.sign ? ' (' + t.sign + ' without, e.g. ' + ex.sign + ')' : ''));
  ok(t.wall === 0 && t.hidden === 0, 'exits still name the drawn wall, and passages that meet still say so'); }

// ---------- 3. a campaign goes deeper into one place ----------
{ let moved = 0, rep = 0, n = 0, first = '';
  for (let i = 0; i < 40; i++) { const seed = 'deep-' + i + '.2', seen = new Set(); let g0 = null; n++;
    for (let d = 1; d <= 6; d++) { const m = AC.generate(Object.assign(dflt(seed), { mode: 'campaign', depth: d }));
      const g = m.genome.origin + '|' + m.genome.doom + '|' + m.genome.name + '|' + m.genome.age; if (!g0) g0 = g; else if (g !== g0) { moved++; break; }
      m.rooms.forEach(r => r.treasure.forEach(t => { if (t.kind === 'magic') { const k = t.txt.split(':')[0]; if (seen.has(k)) { rep++; if (!first) first = seed + ' depth ' + d + ' ' + k; } seen.add(k); } })); } }
  ok(moved === 0, 'six levels down, a campaign is still the same place with the same doom and name (' + n + ' campaigns)');
  ok(rep === 0, 'no magic item repeats in the first six levels of a campaign' + (first ? ' (' + rep + ' repeats, e.g. ' + first + ')' : '')); }

// ---------- 4. words ----------
ok(!/roots that nobody sees/.test(src), 'the riddle that was close to one in a novel is gone from every edition');
ok(/\.2$/.test(AC.randomSeed()), 'a new dungeon gets a second-edition code (' + AC.randomSeed() + ')');
{ let by = 0; for (let i = 0; i < 400; i++) { const m = AC.generate(dflt('by-' + i + '.2')); const b = m.factions.map(f => f.leader.name.slice(f.leader.name.indexOf(' ') + 1)).concat(m.town ? [m.town.patron.name.slice(m.town.patron.name.indexOf(' ') + 1)] : []); if (new Set(b).size < b.length) by++; }
  ok(by === 0, 'no two named people share a byname (' + by + ' of 400 dungeons do)'); }

// ---------- 5. in the browser: codes, and a sign on the game master's screen ----------
(async () => {
  const { chromium } = require('playwright'); const http = require('http');
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(src); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res)); const URL0 = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => { log.push('PAGEERROR ' + e.message); fails++; });
  await p.goto(URL0 + '#drowned-beacon-78|1|4|1|m|oneshot|on|||sd|dm|01|d'); await p.waitForTimeout(1200);
  const old = await p.textContent('#tabBody');
  await p.click('#btnGenerate'); await p.waitForTimeout(500);
  ok((await p.inputValue('#seedInput')) === 'drowned-beacon-78' && (await p.textContent('#tabBody')) === old, 'an old code typed or kept in the box builds the first-edition dungeon it always built');
  await p.click('#btnRandom'); await p.waitForTimeout(600); ok(/\.2$/.test(await p.inputValue('#seedInput')), 'New makes a second-edition code: ' + await p.inputValue('#seedInput'));
  await p.fill('#seedInput', 'the cellar under my house'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  ok((await p.inputValue('#seedInput')) === 'the cellar under my house.2', 'a name of your own gets the second edition, and the box shows it');
  const m = AC.generate(dflt('the cellar under my house.2')); const withSign = m.rooms.find(r => r.clue);
  await p.click('#tabs button[data-tab="over"]'); await p.waitForTimeout(200); await p.click('.rrow[data-goto-room="' + withSign.id + '"]'); await p.waitForTimeout(300);
  const panel = await p.textContent('#tabBody'); ok(/A sign of the truth/.test(panel) && panel.includes(withSign.clue.slice(0, 40)), 'the game master sees the sign in room ' + (withSign.id + 1) + ' (' + withSign.name + ')');
  await p.screenshot({ path: path.join(OUT, 'e2_sign.png') });
  await p.reload(); await p.waitForTimeout(1200); ok((await p.inputValue('#seedInput')) === 'the cellar under my house.2', 'the link carries the code, so a reload brings the same second-edition dungeon back');
  await b.close(); srv.close();
  log.push('FAILS: ' + fails); console.log(log.join('\n'));
})().catch(e => { console.log(log.join('\n')); console.log('CRASH ' + e.stack); console.log('FAILS: 99'); process.exit(1); });
