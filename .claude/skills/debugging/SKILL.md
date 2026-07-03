---
name: debugging
description: Use when something in Starry Little Days is broken — a crash, a bug report, wrong behavior in play, a failing npm run check, a smoke-test hang, or a regression after a change. Covers triage order, headless reproduction, browser debugging, and this codebase's known failure classes.
---

# Debugging Starry ☆ Little Days

## Triage: always start with `npm run check`

It runs four stages in order; **where** it fails tells you the class of
bug:

| Failure looks like | Stage | Usually means |
| --- | --- | --- |
| `src/foo.ts(12,3): error TS...` and the run stops | `tsc --noEmit` | type error — the strict compiler is right more often than you; don't cast it away, fix the shape |
| lines starting `  FAIL  ` under a section header (`maps:`, `npcs:`, `minigames:`…) then `N check(s) failed` | `dev/check.js` | data integrity: a registry you forgot to update, a warp landing on a solid tile, an unregistered minigame reference — the FAIL message names the exact object |
| `  FAIL  <name> ran without throwing: ...` | `dev/smoke.js` | a runtime exception inside that minigame's update/draw/key — the message carries the error text |
| `  FAIL  <name> reaches its result screen and finishes` | `dev/smoke.js` | a **hang**: the game cannot finish under its registered `meta.keys` — a prompt waits for a key it doesn't accept, or there's no timeout path |
| `  FAIL  game loop threw: ...` | `dev/smoke.js` | crash in the world sim (main.ts update/draw/interact), triggered by random key-mashing |

Both dev scripts test the **bundle**: if you're iterating on a fix, run
the full `npm run check` (it rebuilds), not `node dev/check.js` alone,
or you'll be testing stale code.

## Headless reproduction (no browser)

The bundle runs in node with stub DOM — this is how the validators work,
and it's the fastest debug loop. The tooling hook is `window.Starry`.
Minimal probe (verified to run):

```js
// probe.js — node probe.js   (after npm run bundle)
const fs = require('fs'), vm = require('vm');
const noop = () => {};
const ctx2d = () => new Proxy({}, {
  get: (t, k) => k === 'canvas' ? { width: 1248, height: 768 }
    : k === 'measureText' ? () => ({ width: 10 }) : noop,
  set: () => true });
const canvas = () => ({ width: 300, height: 150, getContext: ctx2d });
const win = { addEventListener: noop };
const sandbox = {
  console, window: win, document: { createElement: canvas, getElementById: canvas },
  localStorage: { getItem: () => null, setItem: noop },
  setInterval: () => 0, setTimeout: (f) => f(), performance: { now: () => 0 },
  requestAnimationFrame: noop,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/game.js', 'utf8'), sandbox);
const { Maps, SpriteLib, Minigames, Entities } = win.Starry;
Maps.init();
console.log(Maps.tileAt('town', 7, 6));      // 'H' — the home door
console.log(Minigames.types());               // every registered game
```

From here you can drive a single minigame deterministically
(`const mg = Minigames.create('shells', (s, p) => console.log(s, p));
mg.key('action'); mg.update(0.05); ...`) or replicate the full
input-driven loop — copy the `game loop:` section of `dev/smoke.js`,
which captures listeners and fires synthetic keydowns.

## Browser debugging

`npm run watch` in one terminal, open `index.html`, refresh after each
save. In the console, `window.Starry` gives you everything:
`Starry.Maps.tileAt('town', 8, 8)`, `Starry.Entities.NPCS`,
`Starry.Minigames.meta('rollerlab')`. Music too loud while testing —
press N. Note `Game` only exports `init`; live player state is closure-
private by design — add a temporary field to the `Starry` object in
main.ts if you need to watch it, and remove it before committing.

## Known failure classes (seen in this project's history)

1. **Map char without a painter** — check.js: `tile char "x" has a
   painter`. You used a char in a grid without a `PAINT` entry, or
   claimed a char that renders elsewhere. See `add-area`.
2. **Unregistered minigame reference** — check.js `minigames:` section
   names the NPC/launcher. The registration in minigames.ts is the
   single source of truth.
3. **Save-shape break** — new `G` field works on fresh games but
   crashes/NaNs on "Continue". Cause: field added to `freshG()` but not
   defaulted in `load()` (or vice versa). Fix both; see the save rule in
   the `architecture` skill. Test with an old-shaped save (see
   `verifying-changes`).
4. **Undefined-field NaN (case study: the Bubble Pop pop-star bug).**
   Bubbles had `{lane, xoff, y, ...}` but the pop effect once read
   `bubble.x` — undefined — so burst stars silently drew at `NaN`
   coordinates: no crash, art just never appeared. The TypeScript port
   caught it as a type error. Lesson: "invisible thing" bugs are
   usually NaN geometry; check every field name in the draw path, and
   trust tsc errors over quick casts.
5. **Smoke hang** — the game can't finish under its `meta.keys` (see
   the triage table). Fix by accepting a registered key at every prompt
   or adding a timeout that advances (the park-helper pattern in
   Roller Lab, grep `helperUsed` in minigames.ts). Also confirm every
   phase has an exit — Roller Lab once trapped players in its
   editor↔test loop with no way out.

## Regressions: bisect fearlessly

Every commit on main passes `npm run check`, so
`git bisect start; git bisect bad; git bisect good <old>` with
`git bisect run npm run check` (or run manually per step for behavioral
bugs) converges fast. `node_modules` and `dist` are gitignored — run
`npm install` once if bisecting across the TypeScript-port boundary.

## When you fix it

Add a regression guard where one fits: data invariants belong in
`dev/check.js` (cheap `check(cond, msg)` lines), behavioral guarantees
in `dev/smoke.js`. Then `npm run check`, and see `verifying-changes`
before you commit.
