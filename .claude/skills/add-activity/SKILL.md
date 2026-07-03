---
name: add-activity
description: Use when adding a small interactable activity to Starry Little Days — a tile Starry presses E on (slide, shells, wishing well), a new sticker, a play animation/cutscene, a shop item or toy — or when adding a new field to the save file. Covers interact() patterns, the once-per-day reward economy, sticker capacity, the anim system, and save migration.
---

# Add an activity, sticker, or play animation

Activities are E-key interactions handled in `interact()` in
`src/main.ts`. If your activity needs a brand-new tile character, do the
tile itself first (painter + registries) with the **add-area** skill;
this skill starts where the tile exists.

## How the E-prompt works (so your activity is discoverable)

Two tiles matter every frame (both computed in `interact()` and again in
the hint code — grep `interaction hint` in main.ts):

- `ch` — the tile Starry FACES (`facingTile()`).
- `here` — the tile she STANDS ON:
  `Maps.tileAt(map, floor(x), floor(y - 0.15))`. Use `here` for
  walkable things you stand in (flowers, shells, hopscotch).

The floating **E bubble** appears only when one of these holds
(verified condition in `drawWorld`): an NPC/animal/bike is near, or
`ch` is in the hint string `'bvyQdgwhFYJ@I*&UVZ]9${'`, or `here` is in
`'*&UZ$'`, or `FLAVOR[ch]` exists. So: **either add your char to the
appropriate hint string, or give it a `FLAVOR` line** (FLAVOR chars get
the hint for free, but then plain-E shows the flavor text unless your
handler returns first — handlers run before the FLAVOR fallback).

## Worked example: a tide-pool tile `ch === 'Q'`-style interaction

Handler in `interact()`, placed with the other tile branches:

```ts
if (ch === '~' /* your char */) {
  AudioSys.sfx('splash');
  sparkles(f.x + 0.5, f.y + 0.2);            // little star burst
  const first = funReward('tidepool', 1);    // (id, stars, energy?)
  award('tidepool_sticker');
  UI.say('Starry', [first ? 'A tiny crab waves back! Hello hello!'
                          : 'The tide pool sparkles. The crab is busy now.']);
  return;
}
```

- `funReward(id, stars, energy?)` (main.ts): pays `stars` and/or
  restores `energy` the FIRST time per day (tracked in `G.fun[id]`),
  returns whether it was the first time. Free snacks use `(id, 0, 15)`
  like apples/carrots. **Ids live in save files — never rename.**
- For a menu (play a minigame / do the simple thing / not now), copy
  the bubble-stand block: grep `ch === 'V'` in main.ts.

## Stickers — capacity is EXACTLY full

`Entities.STICKERS` currently has **48 entries and the book holds
exactly 48** (verified: `drawBook` in src/ui.ts uses `cols = 8`,
`cell = 84`, panel top y=50, height `100 + rows*84 + 110`; 6 rows →
bottom 764 on the 768px canvas; a 49th sticker makes 7 rows → bottom
848, off-screen). Before adding sticker 49+, shrink `cell` or raise
`cols` in BOTH places: `drawBook` (src/ui.ts) and the B-key navigation
(grep `cols = 8` in src/main.ts). Then a sticker needs:

1. A `STICKERS` entry `{ id, icon, name, hint }` in src/entities.ts.
2. An icon in `ICONS` (src/sprites.ts), 16×16 `px()` art. **Formatting
   is load-bearing**: dev/check.js discovers icons with the regex
   `/^\s{4}(\w+):\s*\(g\)/gm` — exactly 4-space indent, word-character
   name, literal `(g)` with no type annotation.
3. An `award('your_id')` call in src/main.ts (check.js scans main.ts
   with `/award\('(\w+)'\)/g` and requires every awarded id to exist).

## Play animations (little cutscenes)

The anim system in main.ts takes over Starry's position for a few
seconds, then runs your reward callback. Launch from a handler:

```ts
if (ch === '~') {
  startAnim('rockhop', f, 2.0, () => {   // (type, facingTile, seconds, after)
    funReward('rockhop', 1);
    award('rockhop_sticker');
    UI.say('Starry', ['Hop, hop, splash! Almost dry, even!']);
  });
  return;
}
```

Then add a branch in `updateAnim` (main.ts). Real signatures, verified:
`cue(id, atSeconds, fn)` fires `fn` once when `anim.t` passes
`atSeconds`; `landSpot([[x,y], ...fallbacks])` returns the first
non-solid, non-water candidate (last entry is the always-safe fallback —
usually the start position `[a.ox, a.oy]`); `sparkles(x, y)` and
`bubbles(x, y)` take tile units. Skeleton modeled on the `pony` branch:

```ts
} else if (a.type === 'rockhop') {
  const p2 = clamp01(a.t / a.dur);                    // 0 → 1 progress
  player.x = lerp(a.ox, a.tx + 0.5, p2);
  player.y = a.ty + 0.6 - Math.abs(Math.sin(p2 * Math.PI * 3)) * 0.3;
  player.dir = 'right';
  cue('s1', 0, () => AudioSys.sfx('pop'));
  cue('s2', 1.0, () => AudioSys.sfx('splash'));
  if (p2 >= 1) {
    const land = landSpot([[a.tx + 0.5, a.ty + 1.3], [a.ox, a.oy]]);
    player.x = land.x; player.y = land.y;
    sparkles(land.x, land.y - 0.3);
  }
}
```

When `a.t >= a.dur` the system clears `anim` and calls your `after`
callback. Existing types to copy: `slide`, `swing`, `seesaw`,
`carousel`, `hop`, `pony`, `bounce` (grep `a.type ===`). Rules: never
end with Starry on a solid/water tile (that's what `landSpot` is for),
and keep durations under ~3.5s — input is locked during the anim.

## Shop items & toys

`SHOP_ITEMS` in src/entities.ts. Kinds (checked in this order in
`openShop`): `duckFood`, `treats`, `toy: true`, else `energy: n` snack.
Add the id to a shopkeeper's `stock` array. Toys are bought once
(`openShop` filters owned toys out of stock), go into `G.toys`, award
the `mytoy` sticker, and appear on the bedroom floor — for a NEW toy
add its icon name to `TOY_ICONS` (top of the shop section, main.ts)
and a floor position to `TOY_SPOTS` (inside `drawWorld`, main.ts).

## New persistent save state

Any new field on `G` must be added in BOTH places in main.ts, or old
saves load `undefined` and break:

1. `freshG()` — the default for new games.
2. `load()` — defaults for saves that predate your field. Scalars and
   arrays are covered by `Object.assign(freshG(), raw.G)` **only if the
   old save lacks the key entirely**; nested records need their own
   line, following the existing pattern:
   `G.done = Object.assign({ ...defaults... }, raw.G.done);`
   (see `skills`/`done`/`counts`, and the `toys` array guard).

## Gotchas

- Handlers run top-down in `interact()`; `return` after handling or the
  FLAVOR fallback may also fire.
- `funReward` ids and sticker ids are permanent save keys.
- The E-hint and the handler are independent — forgetting the hint
  string/FLAVOR makes a working activity invisible to players.
- Locked/derived rewards that should pay once per day: always go
  through `funReward`, never hand-roll `gainStars` in a handler.

## Verify

`npm run check` (sticker ids, icons, award references, and the smoke
test still driving the world). Then playtest: trigger the activity
twice (first-time and repeat lines), confirm the E bubble shows, and if
you touched save state, confirm an existing save still loads (see the
verifying-changes skill).
