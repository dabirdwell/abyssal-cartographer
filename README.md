# 🏰 Abyssal Cartographer

Abyssal Cartographer is a complete D&D session generator that runs entirely in your browser: one click produces a town, a mapped dungeon, encounters, traps, puzzles, treasure, and a boss lair. It exports two printable handouts — a full DM guide and a spoiler-free player map — so a table can be running in minutes.

*A Christmas gift for tabletop nerds* 🎁

## 🎮 Play It

**Live:** https://dabirdwell.github.io/abyssal-cartographer/ — play it in the browser, nothing to install.

**Or run it locally:** [download `AbyssalCartographer.html`](https://raw.githubusercontent.com/dabirdwell/abyssal-cartographer/main/AbyssalCartographer.html) and double-click it. No install, no build.

## 📦 Single file, no build

The whole app is **one HTML file** — `index.html` (the deploy copy) and `AbyssalCartographer.html` (the original filename, kept identical for existing inbound links). There is no `package.json`, no bundler, no backend, and nothing to compile: open the file and it runs.

To stay a single file, it loads React, Tailwind, Babel-standalone, and lucide icons from public CDNs at runtime, so the **first** load needs a network connection. After that, everything — map generation, exports, ambiance — happens locally in your browser. Your generated content never leaves the page.

## ✨ Features

### 🏘️ Town Generation
- Named settlements with inns
- Quest givers with dialogue, hooks, and rewards
- Shops with inventories
- Rumors and plot hooks

### 🗺️ Dungeon Generation
- **One-Shot Mode**: 8–12 rooms
- **Campaign Mode**: 14–20 rooms
- Interactive fog-of-war map with room icons
- Furniture icons inside rooms
- Varied room shapes (rect, circle, octagon)
- Seeded generation — the seed is shown, so a dungeon is reproducible

### ⚔️ Encounters & Bosses
- 30 monsters with full stat blocks
- 9 unique boss templates with lair actions
- CR-appropriate scaling
- Tactical suggestions per encounter

### 🧩 Puzzles & Riddles
- 8 puzzles with setup, solution, hints, and failure effects
- 7 riddles with answers and hints

### 🔊 Ambient Sound
- Curated YouTube playlist links per room type
- Sound, light, smell, and feel descriptions
- One-click ambiance for immersion

### 📄 Dual Export (take your content with you)
- **DM Guide**: full details with solutions, stats, and sound links — downloads as a standalone, printable HTML file
- **Player Handout**: puzzles without solutions, no trap reveals, secret rooms hidden — a separate HTML download

## 🚀 Deploy

This repo is Pages-ready. Two steps flip it live:

1. Push `main` to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.**

Pages serves `index.html` at the repository URL. The original `AbyssalCartographer.html` is preserved alongside it so older download links keep working.

## 📸 Screenshot (for the README)

To add a screenshot:

1. Open `index.html` in a browser and click **Generate Session**.
2. Open the **Map** view and click **Reveal** to show the whole dungeon.
3. Capture the window (macOS: `⌘⇧4`, then space to grab the window).
4. Save it to `docs/screenshot.png` and add it here:
   ```markdown
   ![Abyssal Cartographer — revealed dungeon map](docs/screenshot.png)
   ```

## 📋 Version History

### v1.3 (Current)
- 🐉 **30 monsters** (up from 20)
- 🎵 **Ambient sound links** — YouTube playlists per room
- 🪑 **Furniture icons** on map
- 🎯 **9 boss templates** (up from 7)
- 🧩 **8 puzzles, 7 riddles**

### v1.2
- Ambiance system (text descriptions)
- Room type icons on map
- Separate DM/Player exports

### v1.1
- Puzzle and riddle system
- Improved map with room shapes

### v1.0
- Initial release

## 📜 License

MIT License — free for personal and commercial use. See [`LICENSE`](LICENSE).

---

*"Roll for initiative!"* 🎲

<p align="center"><em>Æ</em></p>
