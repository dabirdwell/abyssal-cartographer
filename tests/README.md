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
node tests/reading-and-reach.test.js AbyssalCartographer.html out/   # v3.5: type sizes, text size control, keyboard, Escape, announcements, the sound offer, order of play, phone touch sizes
node tests/second-edition.test.js AbyssalCartographer.html out/   # v4.0: the first edition still builds what v3.4 built (490 dungeons against a fixture); the second edition keeps its promises (700 dungeons); campaigns; codes in the browser. Add 'fixture' to rewrite the fixture from a file.
node tests/wonder-and-characters.test.js AbyssalCartographer.html out/   # v4.1 and v4.2: the map that draws itself, furniture, reduced motion, the notes to whoever reads, print; four ready-made characters, every number against a hand-worked table, and the credit line word for word
node tests/one-book.test.js AbyssalCartographer.html out/   # v4.3: the faces carried in the file, the type scale, the room's title and ring, small-capital heads, amber kept for the light, the burn line (full, half, guttering, paused, out, reduced motion), the paper card, the phone repairs, the printed pages in the same faces
(cd hosted && node test_hosted.mjs ../AbyssalCartographer.html)        # the hosted game master against a fake Claude
```

Each prints PASS/FAIL lines and ends with `FAILS: n`. Screenshots land in `out/`.
