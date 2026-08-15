# 🏰 Abyssal Cartographer

One HTML file that generates a complete dungeon crawl session. One seed produces a whole place: rooms with read-aloud text, an origin and doom that color everything, two or three factions with their own goals and a boss who leads one of them, locks and secrets that are always solvable, wandering tables, treasure worth XP, a town with rumors in one-shot mode, and endless descending levels in campaign mode. The same seed always rebuilds the same dungeon, so the URL is the save file and the share link.

Shadowdark-native, with a 5e conversion toggle.

*Started as a Christmas gift for tabletop nerds* 🎁

## 🎮 Play It

**Live:** https://dabirdwell.github.io/abyssal-cartographer/

**Or run it locally:** download [`AbyssalCartographer.html`](https://raw.githubusercontent.com/dabirdwell/abyssal-cartographer/main/AbyssalCartographer.html) and double-click it. No install, no account, no network calls, nothing written to your machine. It works with the wifi off.

## 📦 One file, zero dependencies

v2 is a ground-up rewrite. There are no frameworks, no CDN loads, no build step, and no backend: the entire app is one self-contained HTML file. Generation, the map, the real-time torch, and the exports all happen locally in your browser. The only outbound links are nine optional YouTube ambiance links, and nothing loads unless you click one.

## ✨ What it generates

- **A coherent dungeon**, not random rooms: a genome of origin and doom colors names, descriptions, creatures, and treasure throughout
- **Factions**: two or three competing groups with goals, and a boss who leads one of them
- **Solvable by construction**: every locked door has a reachable key, and secrets can always be found
- **Shadowdark stat blocks** with a plain-language reading under each; the 5e toggle converts stats between systems
- **Real-time light**: torch one hour, lantern four, candle one at close range only; the screen goes cold and dark when the light burns out
- **Treasure as XP**, counted in hoard tiers, full award to every delver
- **The Margins**: an optional guidance layer for first-time GMs. A letter from Quire, a retired Guild cartographer, opens into a nine-step first commission built from your own generated dungeon. One checkbox turns all of it off
- **Town and rumors** in one-shot mode; endless descending levels in campaign mode
- **Dual export**: a full DM guide and a spoiler-free player handout, both standalone printable HTML. Quire's letter rides along in the DM guide when the margins are on

## 🚀 Deploy

This repo is Pages-ready. Two steps flip it live:

1. Push `main` to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.**

Pages serves `index.html` at the repository URL. The original `AbyssalCartographer.html` is preserved alongside it so older download links keep working.

## 📋 Version History

### v2.3 (Current)
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
