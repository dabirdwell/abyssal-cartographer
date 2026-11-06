# Tests

Playwright suites against the single file. Chromium and Playwright must be installed (`npm i -D playwright && npx playwright install chromium`).

```
node tests/regression.test.js     AbyssalCartographer.html out/   # roles, links, prompt, phone (v2.6 baseline, updated for v2.7 copy)
node tests/game-master.test.js    AbyssalCartographer.html out/   # the in-page game master: a fake local server, Anthropic / Google / OpenAI request shapes, errors, phone
node tests/torchlight.test.js     AbyssalCartographer.html out/   # the light on the map, hatching, print export, frame times
node tests/player-display.test.js AbyssalCartographer.html out/   # the second-screen display: sync, no secrets, lights out, reconnect
node hosted/test_hosted.mjs       AbyssalCartographer.html        # the hosted game master against a fake Claude
```

Each prints PASS/FAIL lines and ends with `FAILS: n`. Screenshots land in `out/`.
