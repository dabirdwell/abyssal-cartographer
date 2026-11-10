# Tests

Playwright suites against the single file. Chromium and Playwright must be installed (`npm i -D playwright && npx playwright install chromium`).

```
node tests/regression.test.js     AbyssalCartographer.html out/   # roles, links, prompt, phone (v2.6 baseline, updated for v2.7 copy)
node tests/game-master.test.js    AbyssalCartographer.html out/   # the in-page game master: a fake local server, Anthropic / Google / OpenAI request shapes, errors, phone
node tests/torchlight.test.js     AbyssalCartographer.html out/   # the light on the map, hatching, print export, frame times
node tests/player-display.test.js AbyssalCartographer.html out/   # the second-screen display: sync, no secrets, lights out, reconnect
node tests/offline.test.js        AbyssalCartographer.html out/   # every outside connection blocked: the full game, then a local model
node tests/save.test.js           AbyssalCartographer.html out/   # the save-for-offline link, served like GitHub Pages and from disk
node tests/local-model.test.js    AbyssalCartographer.html out/   # a local model reached from the https address and the saved copy: Chrome's permission, labels, hints, errors
node tests/sound.test.js          AbyssalCartographer.html out/ [kokoro]   # sound: voice, room sounds, torch, cues, read-aloud; add 'kokoro' to download and run the real voice model (needs internet)
node tests/truth-and-clock.test.js AbyssalCartographer.html out/   # v3.4: the key agrees with the map (door walls, shared doorways, barred doors, passages), the torch by the clock, reload and Load, print weight
(cd hosted && node test_hosted.mjs ../AbyssalCartographer.html)        # the hosted game master against a fake Claude
```

Each prints PASS/FAIL lines and ends with `FAILS: n`. Screenshots land in `out/`.
