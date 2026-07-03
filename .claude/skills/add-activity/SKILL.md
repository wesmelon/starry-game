---
name: add-activity
description: Use when adding a little interactable activity to Starry Little Days — a tile Starry presses E on (slide, shells, wishing well), a new sticker, a play animation/cutscene, or a shop item/toy. Covers interact() patterns, rewards, stickers, and the anim system.
---

# Add an activity, sticker, or play animation

## Interactable tile

Handler goes in `interact()` in `src/main.ts`. Two positions matter:
`ch` (the tile Starry faces) and `here` (the tile she stands on — use
`ch === 'x' || here === 'x'` for walkable things like flowers/shells).
Then register the char in the E-hint string (grep `bvyQdgwh` in
main.ts) or give it `FLAVOR` text (FLAVOR chars get the hint free).

Reward pattern — a gold star the first time each day, fun after:

```ts
if (ch === 'x') {
  AudioSys.sfx('pop');
  const first = funReward('myactivity', 1);      // (id, stars, energy?)
  award('mysticker');
  UI.say('Starry', [first ? 'First-time line!' : 'Repeat line!']);
  return;
}
```

`funReward(id, stars, energy)` — stars pay once per day; energy is a
free snack (apples/carrots use `0, 15`). Ids are saved forever.
For choices (play a game / do the simple thing), copy the bubble-stand
`UI.choose` block.

## Stickers — capacity warning

`Entities.STICKERS` is at **exactly 48 = the book's capacity**
(8 cols × 6 rows at cell 84 barely fits the 768px canvas). Before
adding sticker 49+, shrink `cell` or add a column in `drawBook`
(`src/ui.ts`) *and* the B-key navigation `cols` in main.ts (grep
`cols = 8`). A sticker needs:

1. `STICKERS` entry `{ id, icon, name, hint }` in entities.ts.
2. An icon in `ICONS` (sprites.ts): 16×16 `px()` art. **Formatting
   matters**: check.js finds icons via the regex
   `^\s{4}(\w+):\s*\(g\)` — 4-space indent, word-character name,
   `(g)` untyped param. Match the existing style exactly.
3. `award('id')` somewhere in main.ts (check.js verifies the id exists).

## Play animations (little cutscenes)

The `anim` system in main.ts takes over Starry's position for a few
seconds, then fires the reward. Launch with:

```ts
startAnim('mytype', f, durationSeconds, () => { /* reward + dialog */ });
```

Add a branch for `'mytype'` in `updateAnim`: set `player.x/y/dir` each
frame from `a.t / a.dur`, fire one-shot sounds with
`cue('id', atSeconds, fn)`, and restore or place the player when
`p >= 1` (use `landSpot([[x, y], ...fallbacks])` — never drop her on a
solid/water tile). Sparkle/bubble particles: `sparkles(x, y)`,
`bubbles(x, y)` (tile units). Existing types to copy: slide, swing,
seesaw, carousel, hop, pony, bounce.

## Shop items & toys

`SHOP_ITEMS` in entities.ts. Kinds: `energy: n` snack, `duckFood`,
`treats`, or `toy: true` (bought once, appears on the bedroom floor —
add its spot to `TOY_SPOTS` and icon to `TOY_ICONS` in main.ts). Add
the id to a shopkeeper's `stock`.

## New persistent state

Any new field on the save (`G`) goes in **both** `freshG()` and the
old-save defaults in `load()` in main.ts, or existing saves break.

Finish with `npm run check`.
