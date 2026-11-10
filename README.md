# 🏰 Abyssal Cartographer

One HTML file that generates a complete dungeon crawl session. One seed produces a whole place: rooms with read-aloud text, an origin and doom that color everything, two or three factions with their own goals and a boss who leads one of them, locks and secrets that are always solvable, wandering tables, treasure worth XP, a town with rumors in one-shot mode, and endless descending levels in campaign mode. The same code always rebuilds the same dungeon, so the address is the save file and the share link.

Shadowdark-native, with a 5e conversion toggle. Run it for your friends, or play it yourself with an AI as game master.

*Started as a Christmas gift for tabletop nerds* 🎁

## 🎮 Play It

**Live:** https://dabirdwell.github.io/abyssal-cartographer/

**Or run it locally:** download [`AbyssalCartographer.html`](https://raw.githubusercontent.com/dabirdwell/abyssal-cartographer/main/AbyssalCartographer.html) and double-click it. No install, no account, no network calls, nothing written to your machine. It works with the wifi off.

## 🎲 Two ways in

The first visit asks one question: **I want to play**, or **I am running it for friends**.

- **Playing** opens the player's table: a map that lights up room by room as you explore, the real-time torch, dice, and a game master that is an AI. Two ways to get one. The quick way: one button copies the whole dungeon as a ready prompt for Claude, ChatGPT or Gemini, and you play in two tabs. The other way: play right here in the page, with your own API key (Claude, OpenAI or Gemini), a model running on your own computer (LM Studio or Ollama), or a hosted address you were given; the chat sits beside the map, rooms light themselves when the game master names them, and the conversation is kept per dungeon in your browser. Either way the dungeon stays fixed, so the AI cannot drift, and your screen never shows a secret. 5e rules by default on this path, because AI game masters know D&D best.
- **Running it** opens the full game master's screen. From there, Export → *Link for a player* copies an address that drops anyone straight onto the player's table, first room lit, nothing spoiled.

## 🔌 Playing without internet

Everything except an online AI runs from the one file, with the wifi off.

| You are | Without internet? | What it takes |
|---|---|---|
| Running the game for friends | Yes, all of it: dungeons, map, torch, the guide, exports, the player display | The file on your computer |
| Playing alone, AI as game master | Yes, if the AI runs on your computer | The file, plus LM Studio or Ollama with a model (choose it under *Where the brain is*) |
| Playing alone with Claude, ChatGPT or Gemini | No | An account you already have, or your own API key |
| Playing with a hosted game master | No | An address and access code from whoever runs it |

To get the file: **save it to play offline** at the bottom of the page (or Export → *Save the whole game for offline play*), then double-click the saved file.

## 🖥 A second screen for the table

Running it for friends with a TV, a projector, or an iPad in Sidecar: Export → **Player display for a TV or iPad** opens a second window that shows only what the players may see (the fogged map, the room they are in, the torch), kept in step with the game master's window. Same computer, any screen you can drag a window onto.

## 🏠 Hosting a game master for friends

`hosted/` holds a small server that runs the turns on Claude Haiku 5.5 behind access codes, at about a dime an hour of play. The app already knows how to talk to it. See `hosted/README.md`.

## 📦 One file, zero dependencies

v2 is a ground-up rewrite. There are no frameworks, no CDN loads, no build step, and no backend: the entire app is one self-contained HTML file. Generation, the map, the real-time torch, and the exports all happen locally in your browser. The only outbound links are nine optional YouTube searches for background sound, and nothing loads unless you click one. The in-page game master is the one exception, and only when you set it up: your words then go to the provider you chose, under your own account, and nowhere else.

## ✨ What it generates

- **A coherent dungeon**, not random rooms: a genome of origin and doom colors names, descriptions, creatures, and treasure throughout
- **Factions**: two or three competing groups with goals, and a boss who leads one of them
- **Solvable by construction**: every locked door has a reachable key, and secrets can always be found
- **Shadowdark stat blocks** with a plain-language reading under each; the 5e toggle converts stats between systems
- **Real-time light**: a torch burns one real hour, a lantern one hour per flask of oil, a candle one hour at close range only; the screen goes cold and dark when the light burns out
- **Treasure as XP**, counted in hoard tiers, full award to every delver
- **The Margins**: an optional guidance layer for first-time GMs. A letter from Quire, a retired Guild cartographer, opens into a nine-step first game built from your own generated dungeon. One checkbox turns all of it off
- **Town and rumors** in one-shot mode; endless descending levels in campaign mode
- **Play with an AI game master**: one click copies the whole dungeon as a ready-made prompt. Paste it into Claude, ChatGPT or Gemini and the AI runs the game for you, while the dungeon itself (map, creatures, treasure, secrets) stays fixed so the AI cannot drift. If the clipboard is blocked, it saves a text file instead
- **Dual export**: a full game master's guide and a spoiler-free player handout, both standalone printable HTML. Quire's letter rides along in the game master's guide when the margins are on

## 🚀 Deploy

This repo is Pages-ready. Two steps flip it live:

1. Push `main` to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.**

Pages serves `index.html` at the repository URL. The original `AbyssalCartographer.html` is preserved alongside it so older download links keep working.

## 📋 Version History

### v4.1 (Current)
Wonder. A new dungeon draws itself in ink, outward from the entrance, and a room inks in when it is lit (both stand still for anyone who has asked for reduced motion). Each room shows what stands in it: beds, coffins, pillars, shelves, an altar, a well. The printed map carries a compass, and the patron's offer on the player handout is in full-size type. The AI game master is handed a short note from the mapmaker. There is a letter in the source for whoever reads it, and one line in the console. On a phone the controls take less of the first screen.

### v4.0
The second edition of the generator. A dungeon's edition is part of its code: `ember-loom-42.2` is a second-edition dungeon, and a code with no suffix builds the first-edition dungeon it always built, so old links, saved games and printed guides still match. New dungeons are made in the second edition. What it changes: no two locked doors can hold each other's keys; a barred door is never the only way anywhere; no two leaders share a power, nobody shares a name, and no trap or puzzle repeats in one dungeon; rooms of one kind are told apart by where they lie (North Stores, South Stores); the truth of the place leaves signs in its rooms; the lists are deeper (traps, puzzles, riddles, details, valuables, magic, curses, powers, inns, towns); a campaign goes deeper into one place instead of a new one each level. In every edition, one riddle that was close to one in a novel still in copyright is replaced by an original.

### v3.5
Reading and reach. The text you read aloud is large and upright, small type is raised across the game, and Settings has a text size control. Rooms, exits and doorways can be chosen from the keyboard, Escape closes whatever is open, and the small messages are announced to screen readers. The first screen says what this is and offers sound once. The Overview follows the order of play, with the town first, and gives a rough guide to how long the dungeon takes. A player's screen no longer names a room's creatures before the game master has. "Dungeon code" replaces "seed", and Settings is headed Settings. The dungeon generator is untouched.

### v3.4
The key now agrees with the map. Every exit names the wall its door is drawn in, two doors in one wall are told apart, and passages with no room in common no longer cross (where the stone leaves no other way, the key says they meet). A barred door has a side and a rule. The lantern burns one hour, as its label says. The torch burns by the clock, so a hidden tab or a reload no longer slows, stops or resets it. Ticked treasure and banked gold are kept, and Export can load a saved game. The printed guide and handout draw their hatching as strokes, so a two-page handout prints to well under a megabyte instead of 24. The same code still builds the same rooms, doors, creatures and treasure; only the line of some passages moved.

### v3.3
A writing pass over everything the game puts together, deeper pools of mood lines, and Daniel (Supertonic 3) as the narrator.

### v3.2
Sounds that copy the physics: drips, doors and footsteps by doorway type, flint and steel in the dark, the lair, coins. Voices where they help.

### v3.1
Sound: the game master's voice, rooms you can hear, small cues. Everything is off until you turn it on.

### v3.0.2
A game master running on your own computer can be reached from the website: Chrome's permission question is explained before it appears.

### v3.0.1
Save the game for offline play from the page itself (the footer link, or Export). Opened from your computer, the page says it is the offline copy.

### v3.0
The game master inside the page: your own key (Claude, OpenAI, Gemini), a local model (LM Studio, Ollama) or a hosted address; streaming chat beside the map; rooms light themselves from the game master's tags; the torch state travels with each turn; conversations kept per dungeon. `hosted/`: a small Haiku 5.5 server with access codes.

### v2.7
The player display (The Table) returns, lifted from v3.2 onto the current line: Export → Player display for a TV or iPad. Map clicks now work in Chrome and Firefox (they only ever worked in Safari). Share links made below the first level now rebuild the dungeon on screen. Light as the picture: the map is lit by the torch and dims as the hour runs out. Hatched walls and stippled floors. A first-visit card that hides everything until you choose. Phones scroll again. Copy fixes from an outside read. Five small kindnesses hidden in the file.

### v2.6
The player's table: a first-visit door (play, or run it), a secrets-free player mode with a fogged map that follows you, dice, and the AI game master hand-off front and centre. Export → Link for a player. In 5e mode the Shadowdark words step aside (adventurers, 5e experience rules) and the AI prompt tells the game master to use the official 5e monsters it already knows; in Shadowdark mode the prompt carries a short rules reminder. Pasting a different dungeon's link into the same tab now rebuilds the page. The same seed still builds the same dungeon.

### v2.5
Play with an AI game master (Export menu). Welcome letter rewritten in plain words: the dungeon is built for you, and the letter says so. Phone layout fixed. 5e mode no longer mixes in Shadowdark's experience rules. Dead ambiance links replaced with YouTube searches. Small fixes to the DM guide, the torch controls and generated text. The same seed still builds the same dungeon.

### v2.4
Front-door rework: a plainer welcome letter, a labeled and explained seed box, and a note when Generate rebuilds the dungeon already on screen.

### v2.3
Ground-up rewrite: Shadowdark-native generation, faction and boss system, guaranteed-solvable locks, real-time torch timer, hoard-tier treasure XP, The Margins guidance layer, seed-as-URL saves and sharing, dual exports, zero external dependencies. 5e available as a conversion toggle.

### v1.3
30 monsters, ambient sound links, furniture icons, 9 boss templates, 8 puzzles and 7 riddles.

### v1.2
Ambiance system, room type icons, separate DM and Player exports.

### v1.1
Puzzle and riddle system, improved map with room shapes.

### v1.0
Initial release.

## 📜 License

The code is MIT licensed, free for personal and commercial use. See [`LICENSE`](LICENSE).

This is an independent product published under the Shadowdark RPG Third-Party License and is not affiliated with The Arcane Library, LLC. Shadowdark RPG © The Arcane Library, LLC.

### Voices

The voices are machine-made speech, generated in your browser. Nothing you hear is recorded or sent anywhere. Each model downloads once, only when you press its Download button under Sound.

- **Daniel and the other narrator voices:** Supertonic 3 by Supertone Inc., through the Transformers.js build `open-world-group/Supertonic-3-ONNX` (pinned to one commit). The model is under the [OpenRAIL-M license](https://huggingface.co/supertone-oss-archive/supertonic-3/blob/main/LICENSE), and its use restrictions apply to everyone who uses it here.
- **Kokoro voices:** Kokoro-82M (Apache 2.0) through `kokoro-js`.
- **This computer's voices:** the speech built into your browser and operating system.

---

*"Roll for initiative!"* 🎲

<p align="center"><em>Æ</em></p>
