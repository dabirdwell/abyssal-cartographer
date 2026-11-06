# 🏰 Abyssal Cartographer

One HTML file that generates a complete dungeon crawl session. One seed produces a whole place: rooms with read-aloud text, an origin and doom that color everything, two or three factions with their own goals and a boss who leads one of them, locks and secrets that are always solvable, wandering tables, treasure worth XP, a town with rumors in one-shot mode, and endless descending levels in campaign mode. The same seed always rebuilds the same dungeon, so the URL is the save file and the share link.

Shadowdark-native, with a 5e conversion toggle. Run it for your friends, or play it yourself with an AI as game master.

*Started as a Christmas gift for tabletop nerds* 🎁

## 🎮 Play It

**Live:** https://dabirdwell.github.io/abyssal-cartographer/

**Or run it locally:** download [`AbyssalCartographer.html`](https://raw.githubusercontent.com/dabirdwell/abyssal-cartographer/main/AbyssalCartographer.html) and double-click it. No install, no account, no network calls, nothing written to your machine. It works with the wifi off.

## 🎲 Two ways in

The first visit asks one question: **I want to play**, or **I am running it for friends**.

- **Playing** opens the player's table: a map that lights up room by room as you explore, the real-time torch, dice, and a game master that is an AI. Two ways to get one. The quick way: one button copies the whole dungeon as a ready prompt for Claude, ChatGPT or Gemini, and you play in two tabs. The other way: play right here in the page, with your own API key (Claude, OpenAI or Gemini), a model running on your own computer (LM Studio or Ollama), or a hosted address you were given; the chat sits beside the map, rooms light themselves when the game master names them, and the conversation is kept per dungeon in your browser. Either way the dungeon stays fixed, so the AI cannot drift, and your screen never shows a secret. 5e rules by default on this path, because AI game masters know D&D best.
- **Running it** opens the full game master's screen. From there, Export → *Link for a player* copies an address that drops anyone straight onto the player's table, first room lit, nothing spoiled.

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
- **Dual export**: a full DM guide and a spoiler-free player handout, both standalone printable HTML. Quire's letter rides along in the DM guide when the margins are on

## 🚀 Deploy

This repo is Pages-ready. Two steps flip it live:

1. Push `main` to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.**

Pages serves `index.html` at the repository URL. The original `AbyssalCartographer.html` is preserved alongside it so older download links keep working.

## 📋 Version History

### v3.0 (Current)
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

---

*"Roll for initiative!"* 🎲

<p align="center"><em>Æ</em></p>
