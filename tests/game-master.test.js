const { chromium, devices } = require('playwright');
const http = require('http'); const path = require('path'); const fs = require('fs');
const FILE = process.argv[2], OUT = process.argv[3]; const SRC = 'file://' + FILE;
const log = []; const ok = (c, m) => log.push((c ? 'PASS ' : 'FAIL ') + m);
const PLINK = '#grim-gate-63|1|4|1|m|oneshot|on|||5e|player|01|p';

// A fake OpenAI-compatible server (what LM Studio, Ollama and a hosted service speak)
const seen = [];
function sse(res, chunks) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' });
  let i = 0; const t = setInterval(() => {
    if (i < chunks.length) { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: chunks[i++] } }] }) + '\n\n'); }
    else { res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); }
  }, 15);
}
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' }); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return res.end(JSON.stringify({ data: [{ id: 'fake-gm-12b' }, { id: 'fake-gm-9b' }] })); }
  if (req.url === '/v1/chat/completions') {
    let b = ''; req.on('data', d => b += d); req.on('end', () => {
      const j = JSON.parse(b); seen.push(j);
      const turns = j.messages.filter(m => m.role === 'user').length;
      if (turns === 1) sse(res, ['Welcome, traveller. ', 'The doors of **The Hallowed Seam** hang open before you. ', 'Do you already have a character?']);
      else sse(res, ['You step through the southern passage into a cold workshop. ', 'Half-finished work sits clamped in vises. ', '[Map: room 2]']);
    }); return;
  }
  res.writeHead(404); res.end();
});


async function clk(p, sel, name) {
  try { await p.click(sel, { timeout: 4000 }); }
  catch (e) {
    const info = await p.evaluate(s => { const el = document.querySelector(s); if (!el) return 'missing'; const c = el.getBoundingClientRect(); const h = document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2); return JSON.stringify({ rect: [c.x | 0, c.y | 0, c.width | 0, c.height | 0], hit: h && (h.tagName + '#' + h.id + '.' + h.className), st: document.querySelector('#tabBody') && document.querySelector('#tabBody').scrollTop, vw: innerWidth, vh: innerHeight }); }, sel);
    log.push('[' + name + '] CLICK BLOCKED on ' + sel + ' ' + info);
    await p.click(sel, { force: true });
  }
}
async function open(b, name, opts, hash) {
  const ctx = await b.newContext(Object.assign({ permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true }, opts));
  const p = await ctx.newPage();
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(`[${name}] console.${m.type()}: ${m.text()}`); });
  p.on('pageerror', e => log.push(`[${name}] PAGEERROR ${e.message}`));
  await p.goto(SRC + (hash || '')); await p.waitForTimeout(1200); return { ctx, p };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const PORT = server.address().port;
  const b = await chromium.launch();

  // 1. Local/hosted provider end to end
  let { ctx, p } = await open(b, 'hosted', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, PLINK);
  ok(await p.isVisible('#gmProv'), 'setup card shows on How to play');
  ok(!(await p.isVisible('.tabs button[data-tab="chat"]')), 'chat tab hidden until set up');
  await p.selectOption('#gmProv', 'hosted'); await p.waitForTimeout(200);
  await p.fill('#gmUrl', 'http://127.0.0.1:' + PORT + '/v1');
  await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelector('#gmModel') && document.querySelector('#gmModel').tagName === 'SELECT' && document.querySelector('#gmModel').options.length === 2), 'Check lists the server\'s two models');
  ok(/Connected\. 2 models/.test(await p.textContent('#tabBody')), 'connected message');
  await clk(p, '#gmStart', 'scenario'); await p.waitForTimeout(400);
  ok(await p.isVisible('.tabs button[data-tab="chat"]') && (await p.getAttribute('.tabs button[data-tab="chat"]', 'class') || '').includes('on'), 'Start opens the Game master tab');
  ok(await p.isVisible('#gmSendBtn') && (await p.textContent('#gmSendBtn')) === 'Begin', 'Begin button');
  await clk(p, '#gmSendBtn', 'scenario'); await p.waitForTimeout(900);
  const first = await p.textContent('#gmLog');
  ok(/Welcome, traveller/.test(first) && /Do you already have a character/.test(first), 'streamed greeting rendered');
  ok(seen.length === 1 && /ROOM 1:/.test(seen[0].messages[0].content) && seen[0].messages[0].role === 'system', 'server got the dungeon as the system prompt');
  ok(seen[0].max_tokens === undefined || seen[0].max_tokens >= 1400, 'no stingy cap on a hosted/local model: max_tokens=' + seen[0].max_tokens);
  await p.screenshot({ path: path.join(OUT, '70_chat_greeting.png') });
  const litBefore = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  await p.fill('#gmIn', 'I go south.'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const second = await p.textContent('#gmLog');
  ok(/cold workshop/.test(second) && /room 2 lit/.test(second), 'second reply rendered with the room chip');
  const litAfter = await p.evaluate(() => document.querySelectorAll('#mapSvg .roomG').length);
  ok(litAfter > litBefore, 'room 2 lit on the map by the tag (' + litBefore + ' -> ' + litAfter + ')');
  ok(seen.length === 2 && /\(Table: /.test(seen[1].messages[seen[1].messages.length - 1].content), 'table note travelled with the turn');
  ok(/I go south\./.test(second) && !/\(Table:/.test(second), 'table note not shown to the player');
  await p.screenshot({ path: path.join(OUT, '71_chat_room2.png') });
  // persistence: reload, Start again, history is there
  await p.reload(); await p.waitForTimeout(1200);
  ok(await p.isVisible('#gmStart'), 'after reload the setup remembers the provider (Start is offered)');
  const urlKept = await p.inputValue('#gmUrl'); ok(urlKept.includes(String(PORT)), 'address remembered');
  await clk(p, '#gmStart', 'scenario'); await p.waitForTimeout(400);
  ok(/Welcome, traveller/.test(await p.textContent('#gmLog')) && /cold workshop/.test(await p.textContent('#gmLog')), 'conversation survives a reload');
  // Start over
  await clk(p, '#gmNew', 'scenario'); await p.waitForTimeout(200);
  ok(/waiting/.test(await p.textContent('#gmLog')), 'Start over clears the chat');
  // phone width of the chat
  await ctx.close();

  // 2. Anthropic shape (intercepted): headers, caching, effort, SSE parse
  ({ ctx, p } = await open(b, 'anthropic', { viewport: { width: 1440, height: 900 } }, PLINK));
  let aReq = null, aList = null;
  await p.route('https://api.anthropic.com/**', async route => {
    const r = route.request();
    if (r.url().includes('/v1/models')) { aList = { h: r.headers() }; return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: [{ id: 'claude-haiku-5-5' }, { id: 'claude-sonnet-5-5' }] }) }); }
    aReq = { h: r.headers(), b: r.postDataJSON() };
    const body = ['{"type":"message_start"}', '{"type":"content_block_delta","delta":{"type":"text_delta","text":"The torch "}}', '{"type":"content_block_delta","delta":{"type":"text_delta","text":"gutters. [Map: room 2]"}}', '{"type":"message_stop"}'].map(d => 'data: ' + d + '\n\n').join('');
    return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'access-control-allow-origin': '*' }, body });
  });
  await p.selectOption('#gmProv', 'anthropic'); await p.waitForTimeout(200);
  await p.fill('#gmKey', 'sk-ant-test-123'); await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(500);
  ok(aList && aList.h['x-api-key'] === 'sk-ant-test-123' && aList.h['anthropic-dangerous-direct-browser-access'] === 'true', 'Anthropic model list sent key + browser-access header');
  ok((await p.inputValue('#gmModel')) === 'claude-haiku-5-5', 'Haiku first in the list');
  await clk(p, '#gmStart', 'scenario'); await p.waitForTimeout(300); await clk(p, '#gmSendBtn', 'scenario'); await p.waitForTimeout(700);
  ok(aReq && aReq.h['anthropic-version'] === '2023-06-01' && aReq.b.stream === true && Array.isArray(aReq.b.system) && aReq.b.system[0].cache_control && aReq.b.output_config && aReq.b.output_config.effort === 'low' && aReq.b.model === 'claude-haiku-5-5', 'Anthropic request shape: stream, cached system, low effort');
  ok(/The torch gutters/.test(await p.textContent('#gmLog')), 'Anthropic SSE parsed');
  ok(!(await p.evaluate(() => { try { return (localStorage.getItem('ac.gm') || '').includes('sk-ant'); } catch (e) { return false; } })), 'key NOT written to localStorage unless remembered');
  await ctx.close();

  // 3. Google shape (intercepted) and a refused key
  ({ ctx, p } = await open(b, 'google', { viewport: { width: 1440, height: 900 } }, PLINK));
  let gReq = null;
  await p.route('https://generativelanguage.googleapis.com/**', async route => {
    const u = route.request().url();
    if (u.includes('/models?')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ models: [{ name: 'models/gemini-x-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-x-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embedding-1', supportedGenerationMethods: ['embedContent'] }] }) });
    gReq = { u, b: route.request().postDataJSON() };
    const body = ['{"candidates":[{"content":{"parts":[{"text":"A cold wind. "}]}}]}', '{"candidates":[{"content":{"parts":[{"text":"[Map: room 2]"}]}}]}'].map(d => 'data: ' + d + '\n\n').join('');
    return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'access-control-allow-origin': '*' }, body });
  });
  await p.selectOption('#gmProv', 'google'); await p.waitForTimeout(200);
  await p.fill('#gmKey', 'AIza-test'); await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(500);
  ok((await p.inputValue('#gmModel')) === 'gemini-x-flash', 'Gemini: flash first, embedding model filtered out');
  await clk(p, '#gmStart', 'scenario'); await p.waitForTimeout(300); await clk(p, '#gmSendBtn', 'scenario'); await p.waitForTimeout(700);
  ok(gReq && /streamGenerateContent\?alt=sse/.test(gReq.u) && gReq.b.systemInstruction && gReq.b.contents[0].role === 'user', 'Google request shape');
  ok(/A cold wind/.test(await p.textContent('#gmLog')), 'Google SSE parsed');
  await ctx.close();

  ({ ctx, p } = await open(b, 'badkey', { viewport: { width: 1440, height: 900 } }, PLINK));
  await p.route('https://api.openai.com/**', route => route.fulfill({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: 'Incorrect API key provided' } }) }));
  await p.selectOption('#gmProv', 'openai'); await p.waitForTimeout(200); await p.fill('#gmKey', 'sk-bad'); await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(500);
  ok(/key was refused \(401\)/.test(await p.textContent('#tabBody')), 'refused key explained in plain words');
  await ctx.close();

  // 4. Local server unreachable: plain explanation
  ({ ctx, p } = await open(b, 'noserver', { viewport: { width: 1440, height: 900 } }, PLINK));
  await p.selectOption('#gmProv', 'lmstudio'); await p.waitForTimeout(200); await p.fill('#gmUrl', 'http://127.0.0.1:1/v1'); await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(1500);
  ok(/Could not reach/.test(await p.textContent('#tabBody')) && /CORS/.test(await p.textContent('#tabBody')), 'unreachable local server explained');
  await ctx.close();

  // 5. Phone: chat fits
  ({ ctx, p } = await open(b, 'phone', { ...devices['iPhone 13'] }, PLINK));
  await p.selectOption('#gmProv', 'hosted'); await p.waitForTimeout(200); await p.fill('#gmUrl', 'http://127.0.0.1:' + PORT + '/v1'); await clk(p, '#gmCheck', 'scenario'); await p.waitForTimeout(600); await clk(p, '#gmStart', 'scenario'); await p.waitForTimeout(300);
  await clk(p, '#gmSendBtn', 'scenario'); await p.waitForTimeout(900);
  const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(w.sw === w.cw, 'phone: no horizontal overflow with the chat ' + JSON.stringify(w));
  await p.evaluate(() => document.querySelector('#gmLog').scrollIntoView()); await p.screenshot({ path: path.join(OUT, '72_phone_chat.png') });
  await ctx.close();

  // 6. DM role untouched: no setup card, no chat tab
  ({ ctx, p } = await open(b, 'dm', { viewport: { width: 1440, height: 900 } }, '#grim-gate-63|1|4|1|m|oneshot|on|||sd|dm|01'));
  ok(!(await p.$('#gmProv')) && !(await p.isVisible('.tabs button[data-tab="chat"]')), 'DM role: no setup card, no chat tab');
  await ctx.close();

  await b.close(); server.close();
  console.log(log.join('\n')); console.log('\nFAILS: ' + log.filter(l => l.startsWith('FAIL')).length);
})();
