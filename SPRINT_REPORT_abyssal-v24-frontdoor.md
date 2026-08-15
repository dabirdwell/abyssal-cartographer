# Sprint report: Abyssal Cartographer v2.4, the front-door rework
## 2026-08-15 · branch `v2.4-frontdoor` (off `main`) · local commits only, nothing pushed

Governing principle applied throughout: no bouncers in the writing. Flavor
decorates instruction, it never replaces it. Plain first, Quire second.

Source of truth was `main`'s `/Users/david/Documents/Claude_Technical/abyssal-cartographer/AbyssalCartographer.html`
(v2.3, sha256 `947e61d0dab21e19f16d7c8506dc1db45d6b7a741379bd92f0c49d93b8865888`,
byte-identical to `index.html` at that commit). `table-beta.html`, `test-pairing.mjs`
and the `table-qr-beta` branch were never touched: they do not exist on this branch,
and `main` is unchanged.

---

## 1. The Quire welcome letter (screen letter only)

Changed `QLETTER()` at `/Users/david/Documents/Claude_Technical/abyssal-cartographer/AbyssalCartographer.html:1593`.
The print letter `QLETTER_PRINT()` at line 1603 was not touched: it does not appear
in the diff, which you can confirm with `git diff main..v2.4-frontdoor -- AbyssalCartographer.html`.

Five paragraphs became four. The riddle paragraph is gone, the orientation
paragraph is new and sits second, and the thirty-one-years image now arrives
after the reader knows what they are doing.

### Before (v2.3, four body paragraphs before the close)

> To the new hand, whoever you are.
>
> They have given you the map of a place nobody has been. That is not an error. That is the work.
>
> I drew for the Guild thirty-one years and never once from standing in the room. You draw from rumour, from what a survivor's hands do while she talks, from the way water stains a floor. Then you hand it to people braver than you and find out what you got right.
>
> You are about to do the same thing at a table. You will describe a room you have never seen to friends who have never been there. Then, the part nobody warns you about, you will find out what they do about it.
>
> I have left notes in the margins. Ignore them the moment you stop needing them. Turn them off entirely if they crowd the page. The ink keeps.
>
> Your first commission is on the table. I have marked it up.
>
> — Q.

### After (v2.4)

> To the new hand, whoever you are.
>
> You are about to run this game for your friends. The whole job is this: you describe a room, they say what their people do about it, you say what happens next. Everything else is decoration.
>
> I drew maps for the Guild for thirty-one years and never once from standing in the room. You will do the same thing at this table: describe a place you have never seen to friends who have never been there, and then find out what they do about it. That is not an error. That is the work.
>
> I have left notes in the margins. Ignore them the moment you stop needing them; turn them off entirely if they crowd the page. The ink keeps.
>
> Your first commission is on the table. I have marked it up.
>
> — Q.

### What moved, line by line

- **Deleted:** "They have given you the map of a place nobody has been." The
  referent problem ("who's they") is unfixable and its work is done better in
  plain words. Its second half, "That is not an error. That is the work," was
  kept and re-attached to the thirty-one-years paragraph, where it now lands on
  a thing the reader already understands.
- **Deleted:** the rumour image ("from what a survivor's hands do while she
  talks, from the way water stains a floor"). This is the OPTIONAL call the
  rework doc left to you. The draft as written omits it, so the build omits it.
  It can be grafted back into the middle of the thirty-one-years paragraph in
  one edit if you want the image back now that it would land after orientation,
  not before it.
- **New second paragraph:** carries the whole job in one sentence.
- **Kept:** Quire's voice, the thirty-one-years cartographer image, the takedown
  clause ("Ignore them the moment you stop needing them. The ink keeps."), the
  commission close, and the signature. The takedown clause's internal full stop
  became a semicolon, per the draft.

### The beginner-shaped read (required review stage)

The first three sentences a first-time GM meets, in order:

1. "To the new hand, whoever you are."
2. "You are about to run this game for your friends."
3. "The whole job is this: you describe a room, they say what their people do about it, you say what happens next."

**Does a first-time GM know their job by sentence three? Yes.** Sentence 1 tells
them the letter is addressed to them specifically as a beginner. Sentence 2 tells
them what is about to happen and to whom. Sentence 3 is the entire loop of play in
plain words, with no term of art in it: describe, they act, you answer. Sentence 4
("Everything else is decoration") gives them permission to stop worrying about the
rest of the screen, which is the second thing a stalled beginner needs.

Nothing in the first three sentences requires decoding. The words that carry
flavor rather than instruction ("new hand", "commission", "the Guild") either
appear after the job is stated or are transparent from context. The one thing a
beginner still will not learn from this letter is anything about dice or rules;
that is by design, since it is the first commission's job and the letter now says
so plainly.

Honest limit on this read: I am not a first-time GM and cannot simulate one. This
is a structural read against the stall David actually had, not a replacement for
a second human cold read. Nick's independent stall points on the v2.3 letter
remain the more valuable dataset when they arrive.

---

## 2. Generate first-touch courtesy

New code at `/Users/david/Documents/Claude_Technical/abyssal-cartographer/AbyssalCartographer.html:1393`.

When Generate is pressed and the seed in the box (plus every other expedition
term) matches the dungeon already on screen, a small inline note appears just
under the seed box:

> This is already the dungeon on screen. Press New for a fresh one, or paste a seed to rebuild a specific dungeon.

Behaviour notes:

- **The rebuild is unchanged.** `newDungeon()` runs exactly as before, first;
  the hint only explains what happened. Fog resets and the panel re-renders
  as they always did.
- **Non-modal.** It is a positioned div inside `.seedbox`, not an overlay.
  Nothing is disabled, nothing needs dismissing. It hides itself after nine
  seconds, and also the moment you type in the seed box or press New.
- **It also covers the Enter key** in the seed box, which is the same gesture.
- **The comparison is on the whole configuration**, not just the seed, so
  changing party size or dungeon size in Settings and pressing Generate with
  the same seed correctly stays silent: that really is a different dungeon.
  Descended depths are handled too (`S.model.depth`), since Generate always
  builds at depth 1.
- `role="status"` and `aria-live="polite"` so a screen reader announces it
  without stealing focus.

---

## 3. "Seed" in the tap-to-explain layer

**Verified: v2.3 did not gloss "seed".** The `QTERMS` table at line 1521 defined
twenty terms (AC, HP, delver, morale, fog, torch, XP and so on) and had no entry
for seed. There was also no visible label on the seed box at all, only an
`aria-label`, so a sighted first-timer met an unlabelled box of gibberish text.

Two changes, both small:

- A plain `seed` label now sits before the input, carrying the existing
  `qterm` dotted underline, so it reads as a label and taps as a gloss.
- New `QTERMS.seed` entry:

  > **The seed.** A dungeon's short identity code, its true name. Put the same
  > code in and you get the same dungeon back, room for room, which is how a
  > shared link hands somebody else this exact place.

Consistent with the shipping copy: the Share toast already says "Same seed, same
dungeon, same secrets."

---

## 4. Entry choreography

**The build already does this. Nothing was changed for item 4.**

What the code does on a fresh open, verified by reading the boot path and
confirmed in the harness:

- `boot()` at line 1747 generates and draws the dungeon immediately. The map and
  the first room panel are the only things on screen.
- The letter overlay `#qOverlay` is opened only by `qOpen()`, and `qOpen()` is
  called from exactly two places: the `✎ Margins` header button, and the
  folded note's "Read it" button. Nothing calls it on load.
- `setTimeout(qDropNote,900)` drops the folded note 900ms after load, as a small
  card appended inside `#mapPane`, offering "Read it" and "Not tonight".
  "Not tonight" removes it outright.
- The `✎ Margins` button carries a `qping` pulse until the letter is opened,
  which is an invitation, not a gate.

So the dungeon has the reader's eyes first and the note invites rather than
interposes, which is what the rework doc asked for. The one thing I cannot
settle from the code is whether the note *feels* like an invitation where it
physically sits: it is absolutely positioned at `right:14px; bottom:34px`, 240px
wide, so it overlaps the bottom-right corner of the map. That is a question for
your eyes, listed below.

---

## 5. Harness results

`/Users/david/Documents/Claude_Technical/abyssal-cartographer/smoke-v24-frontdoor.mjs`,
run under jsdom 29.1.1 on Node 20.19.6. jsdom is not installed in this repo; the
harness was run from a scratch directory:

```
cd /tmp/abyssal-smoke && npm i jsdom
node /tmp/abyssal-smoke/smoke-v24-frontdoor.mjs \
  /Users/david/Documents/Claude_Technical/abyssal-cartographer/AbyssalCartographer.html
```

**Result: 34 passed, 0 failed.** What it actually checked:

| Group | Checks |
| --- | --- |
| Loads and auto-generates | engine present, seed box filled, map drawn, room panel rendered, v2.4 in header and footer |
| Entry choreography | letter overlay NOT open on load, config overlay NOT open on load, folded note present, note lives inside the map pane, note offers both "Read it" and "Not tonight" |
| New | seed changes, map changes, hint stays hidden |
| Generate courtesy | hint fires on unchanged seed, copy names both ways out, hint is not an overlay and blocks nothing, the rebuild still happened, and the hint stays quiet when the seed genuinely changed |
| Letter | opens on the salutation, the job sentence is present verbatim, thirty-one-years image appears after orientation, the "they have given you" line is gone, takedown clause and commission close preserved |
| Seed gloss | label is a tappable qterm, popover opens, gloss covers identity code, same-code-in-same-dungeon-out, and the share link |
| Em dashes | zero in all new and edited on-screen body prose |

**Em dash check, stated precisely.** Zero em dashes in every line this sprint
added: `git diff -U0 main..v2.4-frontdoor -- AbyssalCartographer.html | grep '^+' | grep '—'`
returns nothing. The letter still ends with the signature glyph "— Q.", which is
untouched v2.3 code, is a signature convention rather than body prose, and matches
the print letter and every guide step. Say the word if you want signatures
changed too; that is a house-style decision across the whole file, not a
front-door fix.

---

## 6. What only David's eyes can confirm

The harness has no eyes. jsdom does not lay anything out, does not paint, and
does not know what "crowded" looks like. Everything below is unverified by me:

1. **The seed hint's position and size.** It is absolutely positioned under the
   seed box, 302px wide, capped at 78vw. On a narrow window the header wraps,
   and I cannot see whether the hint then lands on top of the toggles or the
   Export menu. Please open it at a normal laptop width and at a squeezed width.
2. **Whether nine seconds is the right dwell time** for the hint, and whether it
   reads as a courtesy or as a scold. That is a feel judgement.
3. **The new `seed` label in the header.** It adds a word to a full header row.
   I cannot see whether the row still balances, or whether the dotted underline
   on a header label reads as "tap me" or as clutter.
4. **The folded note's placement over the map.** It sits over the bottom-right
   corner of the map pane. Whether that corner is ever the part of the map you
   need at first glance is a thing only looking will tell.
5. **The letter's feel on screen.** Four paragraphs instead of five changes the
   shape of the block, its length against the overlay, and how much of it lands
   above the fold. Read it cold, at the size it actually renders.
6. **Whether the rumour image should come back.** Doc marked it your call. It is
   currently out. One paragraph, one edit, either way.
7. **Any real browser at all.** Nothing here was opened in Safari or Chrome by
   me. The harness proves the logic and the words, not the page.

---

## 7. Files changed, and the state of the branch

- `/Users/david/Documents/Claude_Technical/abyssal-cartographer/AbyssalCartographer.html`: the four changes plus the version bump.
- `/Users/david/Documents/Claude_Technical/abyssal-cartographer/index.html`: byte-identical copy, verified by sha256 (`c4e08720a591afc3d040c003700935b60bae1b6f400b7024bbbbdb88325ca5d0` for both after the edits; re-check with `shasum -a 256 AbyssalCartographer.html index.html`).
- `/Users/david/Documents/Claude_Technical/abyssal-cartographer/smoke-v24-frontdoor.mjs`: new, the harness above.
- `/Users/david/Documents/Claude_Technical/abyssal-cartographer/SPRINT_REPORT_abyssal-v24-frontdoor.md`: this file.

Safety, as asked: branch `v2.4-frontdoor` only, local commits only, nothing
pushed, no `git add -A` (every path staged by name), no deletions, no published
or live flag set anywhere. Every writing change here is draft-equivalent and
waits on your review.
