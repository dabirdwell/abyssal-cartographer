# The hosted game master

Prior: /Users/david/Developer/clarity-ios-mac/lib/lm-provider.ts (differs in: this is a standalone door that speaks the OpenAI chat shape to the browser, streams, caches the dungeon, and meters by access code).

One small server (`server.mjs`, no dependencies, Node 20 or newer) that the Abyssal Cartographer app can use as its game master. The app already knows how to talk to it: on the player's How to play tab, choose "A hosted game master I was given an address for", enter the address and the access code, press Check, press Start.

What it does, in order:
1. Takes the app's request (the OpenAI chat shape: a system message holding the dungeon, then the turns).
2. Turns it into a Claude request with the dungeon marked for caching, so re-reading it each turn costs a tenth of the normal price.
3. Runs it on Claude Haiku 5.5 at low effort (fast answers; a game master should not pause to think).
4. Streams the reply back as it is written.
5. Counts a weighted token figure per access code and refuses, in plain words, when a code is over its share (default 20 turns a minute, 400,000 weighted tokens a day, about four hours of play).

It stores nothing a player writes. The log line per turn is the model, the time it took, and the token weight.

## What it costs
At Haiku 5.5 prices (November 2026: $0.10 per million tokens in, $0.50 out, $0.01 for cached re-reads), an hour of play is about seven to nine cents. One access code playing two hours a week costs under a dollar a month.

## Run it on your own machine first
```
cd hosted
ANTHROPIC_API_KEY=sk-ant-... ACCESS_CODES=my-first-code node server.mjs
```
Open the app from your computer (the downloaded file, or the live page), choose the hosted game master, address `http://localhost:8787/v1`, access code `my-first-code`, Check, Start.

Tests: `node test_hosted.mjs /path/to/AbyssalCartographer.html` (runs a fake Claude so it costs nothing).

## Put it on Fly.io (the same host as Clarity and Quiltographer)
These are the steps, so the process is yours too:
1. `fly launch --no-deploy` inside `hosted/` and accept the app name it offers (or give one, such as `abyssal-gm`). It writes `fly.toml`; the one here already has the right port and a small machine.
2. Give it the key, as a secret, never in a file: `fly secrets set ANTHROPIC_API_KEY=sk-ant-... ACCESS_CODES=code-one,code-two`
   Make a separate key in the Anthropic Console, in its own workspace with its own spend limit, the way Clarity and Dojo have theirs.
3. `fly deploy`. Fly builds the Dockerfile and starts one machine.
4. `curl https://<app>.fly.dev/health` should answer `{"ok":true,"model":"claude-haiku-5-5"}`.
5. Hand someone the address `https://<app>.fly.dev/v1` and one access code. Each code is one player (or one household); make a new one per person so a leak costs you one code, not the key.
6. To pull a code, change `ACCESS_CODES` with `fly secrets set` again; the machine restarts with the new list.

Nothing in the app changes when the server moves; the address is typed in by the player.

## What this is not, yet
- No accounts and no payments. Access codes are the whole gate. That is right for a handful of friends and wrong for the public; the public version needs sign-in (Supabase, as Clarity does) and a monthly cap per account.
- No memory between machines: the meter lives in the server's memory and resets when it restarts.
- No saving of games on the server. The player's browser keeps the conversation (per dungeon); the Fly machine keeps nothing.
