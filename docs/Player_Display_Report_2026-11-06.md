# The player display (the Table), ported from v3.2 onto v2.6. Report, 2026-11-06

Prior: (the Fawkes project folder) AbyssalCartographer-v3.2.html and (the Fawkes project folder) TABLE_FEATURE_NOTES_2026-08-14.md (differs in: the address scheme, the control's home in the Export menu, selection and the base level in the state, a heartbeat, a non-interactive display, and no window.open).

## Files

All in (this commit) 

- patch_table.py: twelve exact-match replacements against base_v2.6.html, plus one labelled repair block (see "A bug found outside my scope"). Run: `python3 patch_table.py ../base_v2.6.html AbyssalCartographer-table.html`.
- AbyssalCartographer-table.html: the built file.
- test_table.js: the Playwright script for this feature (55 checks). Run: `node test_table.js /abs/path/AbyssalCartographer-table.html /abs/path/shots`.
- test_table_run.log and test26_run.log: the last runs of both suites.
- shots/: screenshots at deviceScaleFactor 2. 70_dm_sheet.png (DM, 1440x900, the sheet open), 71_display_room1.png (display, 1920x1080, one room lit), 72_display_card.png (the read-aloud card), 73_display_three_rooms.png, 74_dm_window.png (DM with the torch lit and the Room tab's display buttons), 75_display_lights_out.png, 76_display_idle.png (display opened before any game master window), 77_phone_display.png (iPhone 13, display built from its address alone). The 60 to 66 shots and the .txt files are test26's own output.
- _scratch/: probes and early run logs, kept for the record, not deliverables.

## The protocol, in plain words

Both windows open a BroadcastChannel named `abyssal-table`, the same name v3.2 used. A BroadcastChannel is a browser feature that lets pages from the same file or site, open in the same browser on the same computer, send each other small messages. It never crosses to another device.

The display window says:
- `hello` when it opens, again every three seconds until it has heard a state, and whenever a game master's window asks `who`.
- `alive` every four seconds, so the game master's window knows it is still there.
- `bye` when it is closed or navigated away (pagehide and beforeunload). If it comes back from the browser's page cache it says `hello` again.

The game master's window says:
- `who` when it boots, so a display opened earlier answers and gets the state.
- `state` whenever anything the players may see changes. One small object: the dungeon's terms (seed, depth, party, level, size, mode, factions, origin, doom), the lit rooms as a hex bitmask (the same `rhex` the share link uses), the current room (`sel`), the rules system, the torch (seconds left, running, source, lights spent) and the line under the clock (`tmsg`). It is sent on reveal, select, New, Reveal all, Reset fog, the rules toggle, every torch tick, light, pause, resume, snuff, and every torch message. Sends are coalesced: at most one every 180 ms, with one trailing send so the last state always lands.
- `stage` with a room number, a kicker, a body and an optional sign-off, when the game master presses "Read this aloud on the player display", "Put the riddle on the player display" or "Show the puzzle on the player display". Only the read-aloud text, the riddle's question or the puzzle's setup travels. Answers and solutions never do.
- `clear` to take the card down (also sent on New).
- `dark` when the light dies, so the display can flash once.
- `gm-bye` when the game master's window unloads, so the display shows "Waiting for the game master's window." until a window comes back.

What the display does with a `state`: if the terms differ from what it has, it rebuilds the dungeon from them with `AC.generate` (the same deterministic generator, so the same seed gives the same rooms); it sets the lit rooms, the current room, the torch, the dark theme, and the line under the clock; it redraws the map only when the lit rooms, the current room or the darkness changed, not on every tick; it flashes faintly when rooms were added; it rewrites its own address so a reload of the display rebuilds the right dungeon; it takes a card down when the current room changes. Between messages it counts the torch down on its own, and every message resets it, so the clock cannot drift while the game master's window runs. Silence of ten seconds from the display makes the game master's window treat it as closed (toast, status line, the Room tab buttons go away).

The level in the state is the base level, not the level stored in the model. The model stores the level already raised by depth, and the generator raises it again, so sending the model's level (as v3.2 did) would rebuild a different dungeon from depth 2 down. Verified in Node for depths 1 to 4: the display's copy matches the game master's at every depth.

## The address scheme

A display address is `#table:` followed by the usual thirteen share-link fields, with the view field set to `player`, the role flag set to `p`, and the level field holding the base level. Example from the test: `#table:grim-gate-63|1|4|1|m|oneshot|on|||sd|player|0100|p`. A bare `#table` (or `#table:` with no fields) opens the idle screen and waits.

Why not v3.2's scheme: v3.2 detected the display with `location.hash.indexOf("table")>-1`, which any seed containing the letters "table" would have triggered. The colon cannot collide with a normal link: seeds are written with `encodeURIComponent`, which turns a colon into `%3A`, so no normal 13-field address can start with `#table:`. A display address pasted into an older build (no Table code) parses as a strange seed in player role, which spoils nothing.

## What changed and where (function names)

1. Header, Export menu HTML: one item, `<button data-x="table">Player display for a TV or iPad</button>`. In player role the whole menu is hidden by the existing `body.role-player .menuwrap` rule, so the control is hidden with it.
2. Exports region, the `#exportMenu` click handler: `else if(b.dataset.x==="table")tblLaunch();`.
3. Exports region, appended after that handler, the whole Table block: `TBL`, `TBL_PREFIX`, `tblOpen`, `tblSend`, `tblRhex`, `tblCfg`, `tblSig`, `tblAddressBody`, `tblIsDisplay`, `tblParseAddress`, `tblState`, `tblPush`, `tblPanel`, `tblHeard`, `tblLost`, `tblWatch`, `tblDmHears`, a `syncHash` wrapper (every share-link update also pushes; a no-op in display mode), `tblAddress`, `tblStatus`, `tblCopy`, `tblLaunch` (the sheet), a `beforeunload` sender of `gm-bye`, `tblDecoratePanel` and a `renderPanel` wrapper (the Room tab's display buttons, present only while a display is connected and only in DM role), the `[data-push]` click handler, and the display side: `tblBuild`, `tblApplyRhex`, `tblDrawIfChanged`, `tblFit`, `tblWriteAddress`, `tblIdle`, `tblReceive`, `tblStage`, `tblFlash`, `tblBootDisplay`.
4. `reveal`, `select`: `tblPush()` appended. `newDungeon`: `tblPush();tblSend({t:"clear"});` appended after `syncHash()`.
5. Torch: `renderTorch` gets `tblPush()` at its end; `lightsOut` gets `if(!TBL.isTable)tblSend({t:"dark"});` at its end; `torchMsg` gets `tblPush()` so the line under the clock travels (the snuff line is set after `renderTorch`, which is why this one was needed).
6. Boot: `tblOpen();` and `if(tblIsDisplay()){ tblBootDisplay(); return; }` at the top of `boot()`; `tblSend({t:"who"});` at its end.
7. CSS appended at the end of the `<style>` block under `/* ---------- the player display ... ---------- */`: the `body.table` layout (header, sidebar, map tools, footer, torch buttons, hints, door hidden; map pane full size; torch bar enlarged and allowed to wrap, so the dark banner drops to its own centered row instead of squeezing the name), `#tableName`, `#tableIdle`, `#tableStage` and `.tcard`, `#tableFlash`, a phone block, and the DM-side `.pushrow`, `.tbllink`, `.tbladdr`, `.tblrow`, `.tblstatus`.

Not touched: `renderGM`, `aiGMText`/`expAIGM`, the Margins, `buildMap`, `mapBounds`, `renderMap`. The display frames the map with its own `tblFit`, which sets the viewBox after `renderMap(true)` to the lit rooms plus the doorways just beyond them (secret passages excluded), with a 12x8-cell minimum, so one lit room fills a TV instead of sitting in an 18x13-cell neighbourhood.

In display mode `tblBootDisplay` removes `#sidebar`, `footer`, `#mapTools`, `#mapHint` and `#configOverlay` from the DOM, empties the header to a stub `#exportMenu` (the global click handler touches it), and replaces the torch buttons with hidden stubs for the three ids `renderTorch` and `chime` touch. The map is `pointer-events:none`, so a tap on the iPad can never light a room. The display never calls `renderPanel`, `syncHash`, `select` or `newDungeon`.

## What I verified and how

test_table.js, one Chromium browser, the display opened from the href of the DM's own "Open the player display" anchor in the same context: 55 PASS, 0 FAIL, no PAGEERROR, no console errors. In particular:
- The DM's link at `#grim-gate-63|1|4|1|m|oneshot|on|||sd|dm|01` opens in DM role; the Export item exists; the sheet opens; the anchor has `target="_blank" rel="noopener"` and points at the same file with `#table:` plus the thirteen fields; "Copy the address" puts the same address on the clipboard; the sheet mentions the TV, Sidecar and the same-computer rule; no em dash in it; `window.open(` is absent from the whole file (the patch script refuses to write if it appears).
- The display boots in display mode, shows the dungeon's name and only room 1, the idle screen is gone, no sidebar or footer in the DOM, header, map tools and torch buttons hidden, the unlit clock and the game master's torch line shown.
- Two frontier clicks in the DM window light rooms 2 and 3; the display shows exactly those three; its address's reveal bits equal the DM's share link's; the current room's walls are drawn in the accent colour on the display and room 1's no longer are.
- The Room tab offers the two display buttons; "Read this aloud" puts the room's exact read-aloud text on the display; "Clear" takes it down and leaves no words in the DOM.
- Light torch: the display's clock counts down (1:00:00 then 59:58), within two seconds of the DM's; Pause freezes it; Snuff darkens the display, shows the dark banner and carries the snuff line.
- New: the display follows to the new dungeon by name, shows only its first room, rewrites its address with the new seed, and is no longer dark after a new torch.
- No secrets: the engine is run in Node to list each dungeon's twist, trap names, creature names, puzzle solutions, riddle answers, secret notes, faction leaders and goals (14 strings for the first dungeon, the second dungeon's as well); none appears in the display's DOM text (scripts and styles excluded); the word "secret" never appears; no tab names; no game master control labels anywhere in the DOM, hidden or not.
- A reloaded display rebuilds the dungeon from its own address and catches up (two rooms, right name).
- Player role hides the Export menu and with it the control.
- Display opened first at a bare `#table`: idle screen, no map; a game master window opened afterwards wakes it within 1.5 s (handshake `who` then `hello`). Closing the display removes the Room tab's buttons in the DM window within about one second and toasts "The player display closed."
- iPhone 13: the display address alone builds two lit rooms with no game master window, says it is waiting, and has no horizontal overflow.
- Determinism: the display calls `AC.generate` with the same terms; no new `Math.random`, no new PRNG use (the three `Math.random` calls in the file are the pre-existing seed roller and dice). Depth check in Node: display equals game master at depths 1, 2, 3, 4.
- House rules: no em dash added (nine in the file, all the pre-existing "— Q." signatures); no fetch, no network; all labels say what they do.

test26.js against table/AbyssalCartographer-table.html, last five lines:

```
PASS the old-school prompt carries the rules reminder
PASS phone: no horizontal overflow {"sw":390,"cw":390}
PASS phone: door fits {"l":14,"r":376,"cw":390}

FAILS: 0
```

No PAGEERROR and no console error lines in that run either.

I looked at every screenshot. After the first look I changed three things: the display's framing (the first room was small in the middle of a 1920px window), the torch bar (the dark banner had squeezed the name to an ellipsis), and the card's exit (the backdrop vanished while the text faded; now they fade together).

## A bug found outside my scope, repaired in a labelled block

In base_v2.6.html the pan handler calls `svg.setPointerCapture(e.pointerId)` on pointerdown. In Chromium and Firefox the following pointerup is then retargeted to the `<svg>` itself, so `click(e)` never finds a `.frontier` or `.roomG` and clicking a room or a doorway does nothing. I confirmed this against the untouched base with instrumented pointer events (down on `rect`, up on `svg`, hash unchanged). v3.2 has the identical handler, and the owner's 2026-08-14 session revealed rooms in Safari, which fits Safari ignoring mouse pointer capture. test26.js never clicks the map (it lights rooms by number), so the suite could not see it. The live site is used from Chrome by anyone who is not the owner.

Because the Table is useless without map clicks, patch_table.py ends with one separate block labelled "REPAIR, outside the Table's own regions": in the pan/zoom IIFE's `click(e)`, the element is resolved with `document.elementFromPoint(e.clientX,e.clientY)||e.target` before the two `closest` calls. It is anchored on the four lines of `function click(e){` and nothing else, is not in `buildMap`, and can be deleted as one block if the map workstream touched that function. I recommend keeping it in the merged build; the main session decides.

## A second bug found, not fixed (outside my scope, no anchor of mine touches it)

`generate` computes `lvl = min(9, cfg.level + depth - 1)` and stores `cfg:{...cfg, level: lvl}`. `descend()` then builds the next depth from that stored level, so the party level compounds (1, 2, 4, 7 at depths 1 to 4 instead of 1, 2, 3, 4), and `syncHash` writes the stored level, so a share link made at depth 2 or deeper rebuilds a different dungeon than the one on screen (Node check: level 3 instead of 2 at depth 2, 6 instead of 4 at depth 3). It is in the engine and the "generate & wire" region, so I left it alone; the display protocol works around it by sending the base level. A fix would be to keep the base level in the model (or have `descend` and `syncHash` subtract `depth-1`).

## What only the owner can confirm, click by click

Safari on the Mac, the file opened from Finder (file://), then the same in Chrome (the Chrome control run the 2026-08-14 notes still list as open):

1. Double-click AbyssalCartographer-table.html. If the "Who are you tonight?" card shows, choose "I am running it for friends".
2. Click "Export ▾" at the top right, then "Player display for a TV or iPad". Expect a sheet titled "Show the players the map on a second screen" with a big link, the address in a grey box, "Copy the address", and the line "No player display is open yet."
3. Click "Open the player display". Expect a new Safari tab showing the dungeon's name top left, a large "--:--" clock, "Nobody has lit a torch yet..." under it, and the first room on a dark field. Switch back to the first tab: expect the sheet's line to read "A player display is open and following this window." and a toast "The player display is connected." to have shown. If the link did nothing (a Safari setting may block it), click "Copy the address", press Cmd-N for a new window, paste into the address bar, press Return: same expectation.
4. Make the display its own window: drag the new tab out of the tab bar, or Window > Move Tab to New Window.
5. Sidecar: Control Center > Screen Mirroring > choose the iPad. Drag the display window onto the iPad's screen, then View > Enter Full Screen in that window. Turn the iPad to face the players. (AirPlay to the TV is the same menu; choose the TV and set it to extend, not mirror, in System Settings > Displays.)
6. In the game master's window click a pulsing doorway marker just beyond the lit room. Expect the display to flash faintly and show the new room within a second, with the doorways beyond it in frame and the room you clicked outlined in orange. Click a lit room: expect only the orange outline to move on the display.
7. Click "Light torch". Expect the display's clock to start from 1:00:00 and stay within a second of yours; check again after five minutes. Click Pause: expect the display's clock to stop; Resume: it moves again.
8. In the Room tab, under the parchment box, click "Read this aloud on the player display". Expect the display to dim and show that paragraph in large type with "Room N" above it. Click "Clear the player display": expect the map back. If the room has a riddle or a puzzle, the extra button shows only the question or the setup, never the answer.
9. Click Snuff. Expect the display to turn cold blue, the clock to read "--:--", and the banner "You are in the dark..." under the name.
10. Click "⚄ New". Expect the display to switch to the new dungeon's name with only room 1 lit.
11. Close the display window. Expect, within about ten seconds, the toast "The player display closed." (or "stopped answering") and the two display buttons to leave the Room tab.
12. Reopen it from Export. Expect it to catch up at once, including rooms already lit.
13. Press Cmd-R in the game master's window while the display is open. Expect the display to say "Waiting for the game master's window." for a moment and then catch up.
14. Open a display first (paste the copied address into a new window before any game master window exists, or open the file with `#table` after the address): expect the idle screen "This screen is for the players...", then the map as soon as a game master window opens.

Things I cannot see from here: whether Safari opens a `target="_blank"` file:// link from a file:// page (the copy fallback covers a refusal); the legibility of the map and the clock from across a table on the iPad or TV (the sizes are 34px name, 42px clock, 19px line, 15px banner at 1920 wide); whether Safari throttles the game master's one-second timer when that window is fully hidden behind others (the display keeps counting on its own, and every message resets it, so the clock stays right either way); and the two pre-existing bugs above in the owner's own browser.

## Left behind from v3.2, on purpose

- The header button "▣ The Table beta" and its `.live` outline. The control now lives in the Export menu, and the live status is in the sheet, the toasts, and the Room tab buttons that appear only while a display is connected.
- Detection by `indexOf("table")` in the hash. Replaced by the `#table:` prefix.
- The `say` message and its toast on the display. Nothing in v3.2 ever sent it.
- A display that accepts clicks. v3.2's display kept the map's pointer handlers, so a tap on the iPad could pan, zoom, or even light a room locally. The display is now non-interactive; the game master's window drives everything.
- Sending the model's stored level. Replaced by the base level (see the protocol section).
- Edits inside the Reveal all and Reset fog handlers. The `syncHash` wrapper covers them without touching those lines.
- v3.2's copy ("The table is watching.", "Screen cleared.") replaced with plain lines that say what happened.

## Known limits

- One browser, one computer. Two game master windows on the same dungeon would both answer a display; it would follow whichever spoke last. Cross-device play is the phase 2 work the 2026-08-14 notes describe.
- The display's framing is automatic (lit rooms plus doorways beyond); there is no game master control over the display's zoom. A "frame the current room only" switch would be a small addition to the state message if wanted.
- The Room tab's display buttons are added by a wrapper around `renderPanel` that looks for the `.boxed` elements; if that tab's structure changes, the buttons move or vanish, but nothing breaks.
