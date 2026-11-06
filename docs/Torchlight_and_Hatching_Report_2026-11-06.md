# Art workstream report: torchlight on the map and hand-drawn hatching (2026-11-06)

Prior: none, searched "torch", "light", "hatch", "pattern", "gradient" in (this commit) base_v2.6.html and (the Fawkes project folder) TABLE_FEATURE_NOTES_2026-08-14.md. The base file had one per-cell dot pattern (`#dots`) and no light on the map.

## Files (all in (this commit) )
- `patch_art.py`: eleven exact-match replacements against `base_v2.6.html`, house style (`rep(old,new,label)`), each must match once. Run: `python3 patch_art.py ../base_v2.6.html AbyssalCartographer-art.html`.
- `AbyssalCartographer-art.html`: the built file (171,780 bytes; base is 164,107).
- `test_art.js`: the Playwright script for this feature. Run: `node test_art.js FILE OUTDIR`. It prints PASS/FAIL lines and `FAILS: 0` on the current build.
- `perf_art.js`: times `renderMap(true)` on a Large dungeon, base against art. Run: `node perf_art.js BASE ART`.
- `shots/`: the screenshots listed below, plus `dm_guide_export.html` (the DM guide the test downloaded) and the files `test26.js` writes.
- `base_shots/`: the same regression suite run on the unpatched base, kept for side-by-side comparison.
- Logs: `build.log`, `test_art.log`, `test26_art.log`, `perf_art.log`.

## What changed, and where
All anchors are inside the map code, the torch code and the `<style>` block. Nothing in the header HTML, the boot function, `renderGM`, the export text or the hash was touched.

1. `<style>`, after `#mapSvg.panning{cursor:grabbing}`: a block headed "torchlight on the map". It defines four CSS variables on `#mapSvg` (`--tl-ink`, `--tl-glow`, `--tl-edge`, `--tl-core`) with overrides for `#mapSvg.tl-dm` (DM view) and `body.dark` (torch out); the layer classes `.tlL`, `.tlGlow`, `.tlDark`, `.tlStop`, `.tlPulse`; the two flicker animations `tlbreathe` (3.4 s, scale 0.988 to 1.03) and `tlgutter` (0.64 s, scale 0.9 to 1.05); and a `prefers-reduced-motion` rule that stops the flicker and the glide.
2. New function `artInk(model)` (before `buildMap`): a tiny generator seeded by a string hash of `model.seed` plus ":art" (same shape as the existing `jitterMap` generator, kept entirely separate from the dungeon's own random numbers). It returns the `<defs>` content: the floor grain tile (`#dots`, now 22 stipple dots in a two-cell tile instead of one dot per cell), and three hatch tiles of short bent pen strokes (`#hatchA` dense, `#hatchB` sparse, `#hatchX` crossing at the opposite angle), all two cells square, all in `var(--wallink)`. One whole-map pen tilt of up to 8 degrees comes from the same generator.
3. New function `lightDefs()`: the two radial gradients, `#tlG` (warm glow, amber to transparent) and `#tlD` (dark ring, transparent at the centre to full ink at the edge). The dark gradient's stop opacities read CSS variables, so the view and the torch state change them without touching the SVG.
4. `jitterMap`: wall coordinates are rounded to a tenth of a map unit. Same random sequence, same look, half the characters of path text.
5. `buildMap`: `parts[0]` is now a placeholder filled at the end with the defs (`artInk`, `lightDefs` only when `opts.light` is given, and one `<path id="wpN">` per room holding that room's wall path). Each room's wall is drawn with `<use href="#wpN">` instead of repeating the path text. Three more `<use>` elements per room go into a `hatch` array and are placed in `<g class="hatchL">` right after the defs, under corridors and floors, so only the outside of each wall shows them: widths 1.3, 0.9 and 0.56 cells, patterns B, A and X, opacities 0.38, 0.5 and 0.55 (times 0.2 for unrevealed rooms in DM view). When `opts.light` is given, a `<g class="tlL">` is written just before the frontier markers, translated to the light's position, holding `.tlPulse` with two huge rects filled by the two gradients. Frontier markers stay above the dark so the way onward is always findable. Room groups, `data-room`, `.frontier[data-goto]` and the room count are unchanged.
6. `buildMap`, corridors: the corridor outline stroke changed from the fixed `rgba(217,203,166,0.28)` to `var(--wallink)` with `stroke-opacity="0.28"`. On screen this is the same colour (the variable is #d9cba6, which is rgb 217,203,166). In the print export it becomes dark ink, so corridors now print; before, they were nearly invisible on parchment (compare `base_shots` with `shots/f_dm_guide_print_map.png`). This is the one repair outside the brief's two parts; it is one attribute inside `buildMap`.
7. New `lightAt()` and the changed `renderMap(fit)`: `lightAt` returns the centroid of the selected room's cells in map units. `renderMap` builds the light group where it last stood (`LPOS`), then calls `renderLight(cur)`, which sets the new position through a CSS transform after one forced layout, so the light glides to the new room over 0.7 s instead of jumping. `LPOS` resets when `S.model` changes.
8. New `lightReach()` and `renderLight(cur)` (torch section, before the `#btnLight` listener). `lightReach` turns the torch's seconds into a radius: full reach 9.5 cells (candle 5.5), shrinking by `(remain-300)/(total-300)` to the power 0.6, held at 3 cells in the last five minutes, 2.4 cells once out. `renderLight` toggles four classes on `#mapSvg` (`tl-none`, `tl-out`, `tl-gutter`, `tl-dm`), writes `r` on the two gradients (the dark one at 1.18 times the glow), and glides the group when a position is passed. No SVG rebuild per tick.
9. `torchTick` and `lightUp` call `renderLight()` after `renderTorch()`. `lightsOut` already calls `renderMap(false)`, which ends in `renderLight`.
10. `mapSVGString` is unchanged and passes no `opts.light`, so the print exports carry the hatching and no light. The test checks the saved DM guide for `class="tlL"`, `id="tlG"` and `id="tlD"` and finds none.

## What the map looks like at each torch stage
- Never lit (torch bar reads --:--): the map looks as it did, plus the hatching and the finer grain. The light layer exists at opacity 0.
- Fresh torch, player view or player role: a warm amber pool over the party's room and the corridors around it, bright at the centre, dusk at about seven cells, near-black at the edges of the pane. Neighbouring lit rooms sit in the half-dark. The whole pool breathes about three percent in size over 3.4 seconds. Lighting the first torch fades the light in over 1.2 seconds.
- Fresh torch, DM view: the same glow at 70 percent strength, with a 24 percent tint beyond it. Every room, label and unrevealed outline stays readable. The glow says where the party is.
- Half an hour left: the pool has drawn in to about seven cells. Rooms three or four cells away are now dark.
- Ten minutes left: the breathing turns into a fast gutter (0.64 s) to match the flame at the top of the page.
- Five minutes left: a knuckle of light three cells wide around the current room. Everything else is dark.
- Torch out (`body.dark`): the glow is gone, the ink turns grey-blue through the existing dark palette, the current room is faintly visible under a half-strength veil, and everything else is nearly black (93 percent ink in player view, 42 percent in DM view so the DM can still run the room). The frontier markers stay visible in the cold accent colour.
- Lighting a new torch brings the colour back over 1.2 seconds.
- Moving to another room: the whole light slides to it over 0.7 seconds.

## What was verified, and how
- `node test_art.js` on the built file: 24 PASS, 0 FAIL, no page errors (`test_art.log`). It checks: the layer is present but invisible before any torch; three hatch bands per room; the DM view strengths come from the CSS variables (glow 0.7, dark 0.24); full reach is 133 map units; selecting room 4 through the Overview list moves the light and the computed position is in between at 250 ms (a glide, not a jump); player view in the DM role uses the strong falloff; the saved DM guide has hatching and no light; the player link opens in the player role with three rooms lit; reach at thirty minutes is 7.0 cells; at four minutes the circle is 42 units with the gutter class; at zero the body is dark, glow 0, edge 0.93, core 0.5; frontier markers are still drawn; a new torch restores the colour; DM view when out is edge 0.42; a candle reaches 77 units; `prefers-reduced-motion: reduce` gives `animation-name: none` and otherwise `tlbreathe`; the phone has no horizontal overflow.
- The torch was advanced with Playwright's `page.clock` (`clock.install` and `clock.runFor`), which fires the real `setInterval` ticks, so no test hook was added to the page and `S` stays private. CSS transitions run on real time, so the script waits in real time before reading opacities.
- `node (this commit) test26.js art/AbyssalCartographer-art.html art/shots`, last five lines:
```
PASS Shadowdark prompt carries the rules reminder
PASS phone: no horizontal overflow {"sw":390,"cw":390}
PASS phone: door fits {"l":14,"r":376,"cw":390}

FAILS: 0
```
  No `PAGEERROR` lines (`test26_art.log`).
- I looked at every screenshot. Fixes made from looking: strokes were too long and scribbly at the default zoom (shortened, thinned, made denser and more parallel); hatching on unrevealed rooms shouted over their faint walls (now 0.2 of normal); the DM tint hid the DM's unrevealed rooms (0.34 down to 0.24 lit, 0.55 down to 0.42 out); the band ended in a straight line (outer band widened and lightened so it tapers); the first rebuild doubled the SVG text (walls now by reference, coordinates rounded).
- Determinism: all visual variation comes from the `artInk` generator seeded by `model.seed`, or from the existing `jitterMap` generator. No `Math.random()`. The dungeon generator's random numbers are not consumed by any new code (no call into `AC`).

## Screenshots (in `shots/`, 1440x900 at scale 2 unless noted)
- `a1_dm_never_lit.png`, `a1_dm_never_lit_map.png`: DM view through a DM link, no torch lit yet: hatching only.
- `a2_dm_lit.png`: DM view, fresh torch. `a3_dm_lit_room4.png`: after selecting room 4 (the light slid there). `a4_dm_role_player_view.png`: Player view in the DM role.
- `b_player_lit_full.png`, `b_player_lit_full_map.png`: player role via the link, torch lit, rooms 1 to 3 lit. `b2_player_30min_left_map.png`: thirty minutes left.
- `c_player_4min_left.png`, `c_player_4min_left_map.png`: four minutes left. `d_player_lights_out.png`, `d_player_lights_out_map.png`: torch out.
- `e_zoomed_hatching.png`, `e_zoomed_hatching_pane.png`: zoomed in on the current room.
- `f_dm_guide_print_map.png`, `f_dm_guide_print_page.png`: the exported DM guide rendered as a page.
- `g_dm_lights_out.png`: DM view, torch out. `h_dm_candle.png`: DM view, candle. `i_large_dm_lit.png`: Large dungeon, DM view, lit. `j_phone_player_lit.png`: iPhone 13, player role, lit.

## Frame-time sanity check (Large dungeon, seed grim-gate-63, 20 rooms, 1440x900 at scale 2)
`renderMap(true)` was timed through the Fit map button (its click handler is `renderMap(true)`; the click runs synchronously) with `performance.now()`, 41 runs each (`perf_art.log`):
- base: 565 svg elements, 68,937 characters of svg, median 1.9 ms, p90 2.8 ms, max 5 ms, 60.8 frames per second idle.
- art: 794 svg elements, 84,764 characters of svg, median 3.1 ms, p90 4.7 ms, max 8.1 ms, 59.8 frames per second idle with the flicker running.
One torch tick does four class toggles and two attribute writes; it does not rebuild the SVG. Moving the light forces one layout (the glide trick), once per room change. The 230 extra elements are 110 stroke paths and 22 dots inside pattern tiles (drawn once, then tiled by the browser), one `<defs>` path and three `<use>` per room, and three elements for the light.

## Only a human can confirm
- How dark the DM view should feel. I chose a 24 percent tint while lit and 42 percent when out, on the rule that the DM's own information must stay readable; the player side is 80 and 93 percent. All six numbers are CSS variables at the top of the torchlight block in `<style>`, so they can be changed without touching code.
- Whether the breathing and the gutter flicker read as a candle, not a strobe, on a real display over minutes. Screenshots cannot show motion.
- Safari and Firefox rendering of three things Chromium handles: CSS variables and `calc()` in gradient `stop-opacity`, a CSS `transform` animation on an SVG `<g>` scaling about its own origin, and `href` on `<use>`. All three are in the current versions of those browsers to my knowledge, and none was run here.
- How the hatching looks on paper from a real printer, as opposed to the rendered export in `shots/f_dm_guide_print_map.png`.
- Clicking a room on the map in a real browser. Playwright's synthesized click does not trigger the map's pointer-capture click path, on the base file as well as on this build, so the test selects rooms through the Overview list and the room-number box instead; the live app's clicks are unchanged by this patch.

## Chosen not to do
- No displacement or turbulence filter for a ragged band edge; a filter over the map layer would be re-rendered on every pan and zoom frame. The taper comes from three stroke widths instead.
- No SMIL animation for the flicker, although the frontier markers already use it, because SMIL ignores `prefers-reduced-motion`.
- The glide is not a transition of the gradient radius; the radius changes by a fraction of a unit per second and needs none.
- The pre-existing `rgba(217,203,166,...)` colours on labels and the rubble dots were left alone; only the corridor outline mattered for print.
- Nothing was added for the Table (second-window) workstream; that file is not touched.
