/* v4.1 and v4.2: the map that draws itself, what stands in each room, the notes to whoever is reading,
   and four ready-made characters whose every number is checked against a table worked out by hand.
   node tests/wonder-and-characters.test.js /abs/path/index.html /abs/out/
   Prints PASS/FAIL lines and ends with FAILS: n. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const FILE = process.argv[2], OUT = process.argv[3];
const log = []; let fails = 0; const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const html = fs.readFileSync(FILE), src = html.toString('utf8');
const DM = '#ember-loom-42.2|1|4|1|m|oneshot|on|||5e|dm|01|d', PL = '#ember-loom-42.2|1|4|1|m|oneshot|on|||5e|player|01|p';
/* worked out by hand from the fifth edition rules: scores, proficiency +2, armor, hit die */
const WANT = {
  fighter: { hp: 12, ac: 19, passive: 13, saves: 'Strength +5, Constitution +4', skills: 'Athletics +5, Intimidation +2, Perception +3, Survival +3', atk: { 'Longsword': ['+5', '1d8 + 3 slashing'], 'Light crossbow': ['+4', '1d8 + 2 piercing'] } },
  cleric: { hp: 11, ac: 18, passive: 13, dc: 13, spellhit: '+5', saves: 'Wisdom +5, Charisma +3', skills: 'Insight +5, Medicine +5, Persuasion +3, Religion +1', atk: { 'Warhammer': ['+4', '1d8 + 2 bludgeoning'], 'Light crossbow': ['+2', '1d8 piercing'] }, has: ['Heals 1d8 + 6 hit points', 'Heals 1d4 + 6 hit points'] },
  rogue: { hp: 10, ac: 14, passive: 12, saves: 'Dexterity +5, Intelligence +3', skills: "Acrobatics +5, Deception +3, Investigation +3, Perception +2, Sleight of Hand +5, Stealth +7, Thieves' tools +7", atk: { 'Shortsword': ['+5', '1d6 + 3 piercing'], 'Shortbow': ['+5', '1d6 + 3 piercing'], 'Dagger': ['+5', '1d4 + 3 piercing'] } },
  wizard: { hp: 7, ac: 13, passive: 13, dc: 13, spellhit: '+5', saves: 'Intelligence +5, Wisdom +3', skills: 'Arcana +5, History +5, Insight +3, Investigation +5, Perception +3', atk: { 'Dagger': ['+5', '1d4 + 3 piercing'], 'Fire Bolt (a cantrip)': ['+5', '1d10 fire'] }, has: ['On you, that is 16.'] }
};
(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const URL0 = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch();
  const open = async (hash, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] }, opts || {}));
    const p = await ctx.newPage(); const msgs = []; p.on('console', m => msgs.push(m.text())); p.on('pageerror', e => { log.push('PAGEERROR ' + e.message); fails++; }); await p.goto(URL0 + (hash || '')); return { ctx, p, msgs }; };

  // ---------- the map draws itself, and stands still for anyone who asks ----------
  { const { ctx, p, msgs } = await open(DM); await p.waitForTimeout(250);
    const a = await p.evaluate(() => ({ rooms: document.querySelectorAll('#mapSvg .roomG.ink').length, lines: document.querySelectorAll('#mapSvg .inkline').length, anim: getComputedStyle(document.querySelector('#mapSvg .roomG.ink') || document.body).animationName, delays: [...document.querySelectorAll('#mapSvg .roomG.ink')].map(g => parseInt(g.style.getPropertyValue('--d'))) }));
    ok(a.rooms > 5 && a.lines > 5 && a.anim === 'inkRoom', 'a new dungeon is drawn in ink: ' + a.rooms + ' rooms and ' + a.lines + ' passage lines are animated');
    ok(a.delays[0] === 0 && Math.max(...a.delays) > 600 && Math.max(...a.delays) <= 1900, 'rooms wait their turn outward from the entrance (first at 0 ms, last at ' + Math.max(...a.delays) + ' ms)');
    await p.screenshot({ path: path.join(OUT, 'w_ink_250ms.png') }); await p.waitForTimeout(3000);
    await p.click('#tabs button[data-tab="over"]'); await p.click('.rrow[data-goto-room="2"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .ink, #mapSvg .inkline').length) === 0, 'choosing a room afterwards does not replay the drawing');
    const furn = await p.evaluate(() => ({ groups: document.querySelectorAll('#mapSvg .roomG .furn').length, rooms: document.querySelectorAll('#mapSvg .roomG').length, shapes: document.querySelectorAll('#mapSvg .furn > *').length }));
    ok(furn.groups === furn.rooms && furn.shapes > furn.rooms * 2, 'every room shows what stands in it (' + furn.shapes + ' small drawings in ' + furn.rooms + ' rooms)');
    ok(msgs.some(m => /curious kind/.test(m)), 'the console greets whoever opens it');
    ok(/If you are reading the source: hello\./.test(src.slice(0, 900)), 'the source opens with a letter to whoever reads it');
    // the note to whoever runs the game
    await p.click('#btnExport'); await p.click('#exportMenu button[data-x="ai"]'); await p.waitForTimeout(400);
    const prompt = await p.evaluate(() => navigator.clipboard.readText());
    ok(/A NOTE FROM THE ONE WHO DREW THIS MAP, TO WHOEVER RUNS IT, HUMAN OR OTHERWISE/.test(prompt) && /that was meant too/.test(prompt), 'the AI game master is handed a note from the mapmaker');
    ok(/four ready-made first-level characters/.test(prompt), 'in fifth edition the AI is told it may offer the ready-made characters');
    ok(prompt.trim().endsWith('ask whether I have a character.'), 'and the prompt still ends by asking it to greet the player');
    // print: compass, furniture, small file
    const dl = p.waitForEvent('download'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="player"]'); const d = await dl; const f = path.join(OUT, 'w_handout.html'); await d.saveAs(f); const doc = fs.readFileSync(f, 'utf8');
    ok(/>N<\/text>/.test(doc) && /class="furn"/.test(doc) && !/class="roomG ink"/.test(doc) && !/tabindex/.test(doc), 'the printed map has a compass and furniture, and none of the screen-only parts');
    const pg = await ctx.newPage(); await pg.goto('file://' + f); await pg.waitForTimeout(400); const pdf = await pg.pdf({ format: 'Letter' }); ok(pdf.length < 1.5e6, 'the handout still prints small (' + (pdf.length / 1e6).toFixed(2) + ' MB)'); await pg.close();
    await ctx.close(); }
  { const { ctx, p } = await open(DM, { reducedMotion: 'reduce' }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelectorAll('#mapSvg .ink, #mapSvg .inkline').length) === 0, 'with reduced motion asked for, nothing is animated');
    await ctx.close(); }
  { const { ctx, p } = await open(PL); await p.waitForTimeout(2600);
    await p.fill('#revealNum', '2'); await p.click('#btnRevealNum'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => { const g = document.querySelector('#mapSvg .roomG[data-room="1"]'); return !!g && g.classList.contains('justLit'); }), 'a room inks in when it is lit');
    await p.click('#tabs button[data-tab="gm"]'); await p.waitForTimeout(200);
    ok(await p.isVisible('#btnChars'), 'the player\'s page offers the ready-made characters');
    await ctx.close(); }

  // ---------- four ready-made characters ----------
  { const { ctx, p } = await open(DM); await p.waitForTimeout(800);
    const dl = p.waitForEvent('download'); await p.click('#btnExport'); await p.click('#exportMenu button[data-x="chars"]'); const d = await dl; const f = path.join(OUT, 'characters.html'); await d.saveAs(f);
    const pg = await ctx.newPage(); await pg.setViewportSize({ width: 900, height: 1250 }); await pg.goto('file://' + f); await pg.waitForTimeout(400); await pg.screenshot({ path: path.join(OUT, 'characters_p1.png') }); await pg.screenshot({ path: path.join(OUT, 'characters_full.png'), fullPage: true });
    const txt = await pg.evaluate(() => document.body.innerText);
    ok(txt.includes('This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.'), 'the sheet carries the credit line the rules document asks for, word for word');
    ok(/5E compatible/.test(txt) && !/Dungeons|D&D|Shadowdark|Wizards of the Coast.*Wizards of the Coast/s.test(txt.replace(/This work includes[^]*legalcode\./, '')), 'and names no publisher anywhere else on the page');
    for (const k of Object.keys(WANT)) { const w = WANT[k];
      const got = await pg.evaluate(key => { const c = document.querySelector('.pg[data-pg="' + key + '"]'); if (!c) return null; const n = s => { const e = c.querySelector('[data-n="' + s + '"]'); return e ? e.textContent.trim() : null; };
        const atk = {}; c.querySelectorAll('tr[data-atk]').forEach(r => { atk[r.getAttribute('data-atk')] = [r.children[1].textContent.trim(), r.children[2].textContent.trim()]; });
        return { hp: +n('hp'), ac: +n('ac'), passive: +n('passive'), dc: n('dc') ? +n('dc') : undefined, spellhit: n('spellhit') || undefined, saves: n('saves'), skills: n('skills'), atk, text: c.innerText }; }, k);
      const bad = []; if (!got) bad.push('card missing'); else { for (const key of ['hp', 'ac', 'passive', 'dc', 'spellhit', 'saves', 'skills']) if (w[key] !== undefined && got[key] !== w[key]) bad.push(key + ' ' + got[key] + ' (want ' + w[key] + ')');
        for (const a of Object.keys(w.atk)) if (!got.atk[a] || got.atk[a][0] !== w.atk[a][0] || got.atk[a][1] !== w.atk[a][1]) bad.push(a + ' ' + JSON.stringify(got.atk[a]) + ' (want ' + JSON.stringify(w.atk[a]) + ')');
        (w.has || []).forEach(s => { if (!got.text.includes(s)) bad.push('missing: ' + s); }); }
      ok(bad.length === 0, k + ': every number on the card matches the hand-worked table' + (bad.length ? ' — ' + bad.join('; ') : '')); }
    const pdf = await pg.pdf({ format: 'Letter' }); fs.writeFileSync(path.join(OUT, 'characters.pdf'), pdf); const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok(pages >= 2 && pages <= 5, 'the four characters print on ' + pages + ' pages');
    await ctx.close(); }

  await b.close(); srv.close();
  log.push('FAILS: ' + fails); console.log(log.join('\n'));
})().catch(e => { console.log(log.join('\n')); console.log('CRASH ' + e.stack); console.log('FAILS: 99'); process.exit(1); });
