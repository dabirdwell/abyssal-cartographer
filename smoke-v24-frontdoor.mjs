/* v2.4 front-door smoke pass. Run with jsdom on the path:
     cd /tmp/abyssal-smoke && npm i jsdom
     node --experimental-vm-modules /path/to/smoke-v24-frontdoor.mjs /path/to/AbyssalCartographer.html
   The harness has no eyes: it checks structure, text and behaviour, never layout. */
import fs from "node:fs";
import { JSDOM } from "jsdom";

const file = process.argv[2] || new URL("./AbyssalCartographer.html", import.meta.url).pathname;
const html = fs.readFileSync(file, "utf8");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (detail ? "\n        " + detail : "")); }
};

const dom = new JSDOM(html, {
  url: "https://example.org/AbyssalCartographer.html",
  runScripts: "dangerously",
  pretendToBeVisual: true,
});
const { window } = dom;
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const sig = (el) => (el ? el.innerHTML.length + ":" + el.innerHTML.slice(0, 400) : "");

await new Promise((r) => window.setTimeout(r, 1400)); // let boot + the 900ms folded-note timer run

console.log("\n1. loads and auto-generates");
/* AC is a top-level `const`, so it lives in the global lexical scope, not on window. */
ok("AC engine present", window.eval("typeof AC === 'object' && typeof AC.generate === 'function'"));
ok("seed box filled on load", $("#seedInput").value.trim().length > 0, "value=" + JSON.stringify($("#seedInput").value));
ok("map drawn", $("#mapSvg").children.length > 0, "svg children=" + $("#mapSvg").children.length);
ok("first room panel rendered", $("#tabBody").textContent.trim().length > 40);
ok("footer reads v2.4", $("footer").textContent.includes("v2.4"));
ok("header reads v2.4", $(".brand .ver").textContent.trim() === "v2.4");

console.log("\n2. entry choreography");
ok("letter overlay NOT open on load", !$("#qOverlay").classList.contains("open"));
ok("config overlay NOT open on load", !$("#configOverlay").classList.contains("open"));
const note = $("#qNote");
ok("folded note present", !!note);
ok("folded note lives inside the map pane", !!note && note.parentElement.id === "mapPane");
ok("folded note offers a choice, not a wall", !!note && !!$("#qNoteGo") && !!$("#qNoteNo"));

console.log("\n3. New rolls a different dungeon");
const seed0 = $("#seedInput").value, map0 = sig($("#mapSvg"));
click($("#btnRandom"));
const seed1 = $("#seedInput").value, map1 = sig($("#mapSvg"));
ok("seed changed", seed0 !== seed1, seed0 + " -> " + seed1);
ok("map changed", map0 !== map1);
ok("hint stays hidden after New", !$("#seedHint").classList.contains("show"));

console.log("\n4. Generate on an unchanged seed fires the courtesy hint");
click($("#btnGenerate"));
const hint = $("#seedHint");
ok("hint shown", hint.classList.contains("show"));
ok("hint says the dungeon is already on screen", /already the dungeon on screen/.test(hint.textContent));
ok("hint names both ways out (New, paste a seed)", /Press New/.test(hint.textContent) && /paste a seed/.test(hint.textContent));
ok("hint is non-modal (not an overlay, seed box still usable)",
   !hint.classList.contains("overlay") && !$("#seedInput").disabled && hint.closest(".seedbox") !== null);
ok("rebuild still happened (seed unchanged, dungeon still drawn)",
   $("#seedInput").value === seed1 && $("#mapSvg").children.length > 0);

console.log("\n   ... and stays quiet when the seed really changed");
$("#seedInput").value = "smoke-test-alternate-seed";
$("#seedInput").dispatchEvent(new window.Event("input", { bubbles: true }));
click($("#btnGenerate"));
ok("hint hidden for a genuinely new seed", !$("#seedHint").classList.contains("show"));
ok("a different dungeon was built", $("#seedInput").value === "smoke-test-alternate-seed" && sig($("#mapSvg")) !== map1);

console.log("\n5. the letter renders with the new opening");
click($("#btnQuire"));
ok("overlay opens on request", $("#qOverlay").classList.contains("open"));
const letter = $("#qSheet .qletter").textContent.replace(/\s+/g, " ").trim();
ok("opens on the salutation", letter.startsWith("To the new hand, whoever you are."));
ok("job stated plainly in the second paragraph",
   /The whole job is this: you describe a room, they say what their people do about it, you say what happens next\. Everything else is decoration\./.test(letter));
ok("thirty-one years image kept, and it comes after orientation",
   letter.indexOf("thirty-one years") > letter.indexOf("Everything else is decoration"));
ok("the unfixable referent line is gone", !/They have given you the map of a place nobody has been/.test(letter));
ok("takedown clause preserved", /Ignore them the moment you stop needing them/.test(letter) && /The ink keeps\./.test(letter));
ok("commission close preserved", /Your first commission is on the table\./.test(letter));

console.log("\n6. 'seed' is glossed in the tap-to-explain layer");
const lab = $("#seedLabel");
ok("seed label present and tappable", !!lab && lab.classList.contains("qterm") && lab.dataset.q === "seed");
click(lab);
const pop = $("#qPop");
ok("popover opens", pop.classList.contains("open"));
ok("gloss says identity code / true name", /identity code/.test(pop.textContent) && /true name/.test(pop.textContent));
ok("gloss says same code in, same dungeon out", /same code in and you get the same dungeon back/.test(pop.textContent));
ok("gloss explains the share link", /shared link/.test(pop.textContent));

console.log("\n7. em dashes in new or edited on-screen copy");
const bodyProse = [
  $("#qSheet .qletter").textContent.replace(/—\s*Q\./g, ""), // signature glyph is not body prose
  $("#seedHint").textContent,
  $("#qPop").textContent.replace(/—\s*Q\./g, ""),
].join(" ");
ok("zero em dashes in new/edited body prose", !bodyProse.includes("—"),
   "found: " + JSON.stringify(bodyProse.match(/.{0,40}—.{0,40}/g)));

console.log("\n" + (fail ? "FAILED " : "OK ") + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
