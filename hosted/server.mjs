// Abyssal Cartographer: a hosted game master.
// A tiny OpenAI-compatible front door (what the single-file app already speaks) that runs the
// turns on Claude Haiku 5.5 with the dungeon cached. Nothing a player says is stored or logged.
//
// Prior: /Users/david/Developer/clarity-ios-mac/lib/lm-provider.ts (differs in: this speaks the
// OpenAI chat shape to the browser, streams, caches the system prompt, and meters per access code).
//
// Run:   ANTHROPIC_API_KEY=sk-ant-... node server.mjs
// Env:   PORT (8787)  MODEL (claude-haiku-5-5)  ACCESS_CODES ("" = open; else comma-separated codes)
//        TURNS_PER_MINUTE (20 per code or address)  TOKENS_PER_DAY (400000 per code or address)
//        ALLOW_ORIGIN (*)  UPSTREAM (https://api.anthropic.com, for tests)
import http from "node:http";

const PORT = +(process.env.PORT || 8787);
const MODEL = process.env.MODEL || "claude-haiku-5-5";
const KEY = process.env.ANTHROPIC_API_KEY || "";
const UPSTREAM = (process.env.UPSTREAM || "https://api.anthropic.com").replace(/\/$/, "");
const CODES = (process.env.ACCESS_CODES || "").split(",").map(s => s.trim()).filter(Boolean);
const TPM = +(process.env.TURNS_PER_MINUTE || 20);
const TPD = +(process.env.TOKENS_PER_DAY || 400000);
const ORIGIN = process.env.ALLOW_ORIGIN || "*";
if (!KEY) { console.error("Set ANTHROPIC_API_KEY."); process.exit(1); }

// Metering: in memory, per access code (or per address when the door is open). Resets with the process.
const meter = new Map(); // id -> {minute, turns, day, tokens}
function who(req) {
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (CODES.length) return CODES.includes(auth) ? "code:" + auth : null;
  return "ip:" + (req.headers["fly-client-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?");
}
function allow(id) {
  const now = Date.now(), m = meter.get(id) || { minute: 0, turns: 0, day: 0, tokens: 0 };
  const minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
  if (m.minute !== minute) { m.minute = minute; m.turns = 0; }
  if (m.day !== day) { m.day = day; m.tokens = 0; }
  meter.set(id, m);
  if (m.turns >= TPM) return "You are sending turns faster than the game master can read. Wait a minute.";
  if (m.tokens >= TPD) return "Today's share of the game master is used up. It resets tomorrow.";
  m.turns++; return null;
}
function spend(id, tokens) { const m = meter.get(id); if (m) m.tokens += tokens; }

const cors = { "access-control-allow-origin": ORIGIN, "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, OPTIONS" };
const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json", ...cors }); res.end(JSON.stringify(obj)); };
const oaiErr = (res, code, message) => json(res, code, { error: { message, type: "request_error" } });

function readBody(req) { return new Promise((ok, no) => { let b = ""; req.on("data", d => { b += d; if (b.length > 2e6) { no(new Error("too large")); req.destroy(); } }); req.on("end", () => ok(b)); req.on("error", no); }); }

// OpenAI chat shape -> Anthropic Messages shape. The system prompt (the dungeon) is cached.
function toAnthropic(body) {
  const sys = body.messages.filter(m => m.role === "system").map(m => String(m.content)).join("\n\n");
  const msgs = [];
  for (const m of body.messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = String(m.content ?? "");
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += "\n\n" + text; // Anthropic wants alternation
    else msgs.push({ role, content: text });
  }
  if (!msgs.length || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "Hello, game master." });
  return {
    model: MODEL, max_tokens: Math.min(+(body.max_tokens || 1400), 4000), stream: true,
    system: sys ? [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }] : undefined,
    messages: msgs, temperature: typeof body.temperature === "number" ? Math.max(0, Math.min(1, body.temperature)) : 0.8,
    output_config: { effort: "low" }
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, model: MODEL });
    if (req.method === "GET" && req.url.startsWith("/v1/models")) {
      if (CODES.length && !who(req)) return oaiErr(res, 401, "That access code was not recognised.");
      return json(res, 200, { object: "list", data: [{ id: MODEL, object: "model", owned_by: "humanityandai" }] });
    }
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      const id = who(req); if (!id) return oaiErr(res, 401, "That access code was not recognised.");
      const refusal = allow(id); if (refusal) return oaiErr(res, 429, refusal);
      let body; try { body = JSON.parse(await readBody(req)); } catch { return oaiErr(res, 400, "That was not a request the game master understands."); }
      if (!Array.isArray(body.messages) || !body.messages.length) return oaiErr(res, 400, "No messages.");
      const started = Date.now();
      const up = await fetch(UPSTREAM + "/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(toAnthropic(body))
      });
      if (!up.ok) {
        const t = await up.text().catch(() => "");
        console.log(`[gm] upstream ${up.status} in ${Date.now() - started}ms`);
        return oaiErr(res, up.status === 429 ? 429 : 502, up.status === 429 ? "The game master is busy. Try again in a minute." : "The game master could not be reached (" + up.status + ").");
      }
      // Stream back as OpenAI chunks.
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", ...cors });
      const chunkId = "chatcmpl-" + Math.random().toString(36).slice(2, 10);
      const send = (delta, finish) => res.write("data: " + JSON.stringify({ id: chunkId, object: "chat.completion.chunk", model: MODEL, choices: [{ index: 0, delta, finish_reason: finish || null }] }) + "\n\n");
      send({ role: "assistant", content: "" });
      const reader = up.body.getReader(), dec = new TextDecoder(); let buf = "", used = 0;
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n\n")) >= 0) {
          const ev = buf.slice(0, i); buf = buf.slice(i + 2);
          const data = ev.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("\n");
          if (!data) continue;
          let j; try { j = JSON.parse(data); } catch { continue; }
          if (j.type === "content_block_delta" && j.delta?.type === "text_delta") send({ content: j.delta.text });
          if (j.type === "message_start" && j.message?.usage) used += (j.message.usage.input_tokens || 0) + (j.message.usage.cache_read_input_tokens || 0) / 10 + (j.message.usage.cache_creation_input_tokens || 0);
          if (j.type === "message_delta" && j.usage) used += (j.usage.output_tokens || 0) * 5; // output costs five times input on Haiku
        }
      }
      send({}, "stop"); res.write("data: [DONE]\n\n"); res.end();
      spend(id, Math.round(used));
      console.log(`[gm] ${MODEL} ${Date.now() - started}ms ~${Math.round(used)} weighted tokens`); // never the text
      return;
    }
    json(res, 404, { error: { message: "Not here." } });
  } catch (e) {
    console.log("[gm] error", e?.message || e);
    if (!res.headersSent) oaiErr(res, 500, "The game master stumbled. Try again.");
    else { try { res.end(); } catch {} }
  }
});
server.listen(PORT, () => console.log(`[gm] listening on ${PORT}, model ${MODEL}, ${CODES.length ? CODES.length + " access codes" : "open door, metered by address"}`));
