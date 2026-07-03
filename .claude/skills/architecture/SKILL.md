---
name: architecture
description: Use when orienting in the Starry Little Days codebase — answering "how does X work" or "where is Y", starting a first task in this repo, tracing the boot/game loop, understanding the save system, warps, registries, or the dev harness, or judging whether a planned feature hits a capacity limit.
---

# Starry ☆ Little Days — architecture map

A toddler life-sim in strict TypeScript on a single 2D canvas. All pixel
art is drawn procedurally and all audio is synthesized live — there are
no asset files. esbuild bundles `src/main.ts` into `dist/game.js`, the
only script `index.html` loads. `npm run build` = typecheck + bundle;
`npm run watch` rebuilds on save; `npm run check` = build + both
validators. No runtime dependencies.

## Modules (src/)

| File | Exported global | Owns |
| --- | --- | --- |
| `types.ts` | (types only) | shared interfaces: `GView`, `Npc`, `Animal`, `MapData`, `Warp`, `Minigame`, `Dir` |
| `audio.ts` | `AudioSys` | chiptune engine: `SONGS` data, lookahead scheduler, `SFX` synth recipes |
| `sprites.ts` | `SpriteLib` | every tile painter (`PAINT`), character/animal pixel templates, sticker icons (`ICONS`), canvas cache built once by `build()` |
| `maps.ts` | `Maps` | map grids (`DATA`), solidity (`SOLID`), doors (`DOORS`), bus links (`LINKS`), warp resolution (`init()`/`warpAt`) |
| `entities.ts` | `Entities` | `NPCS` (schedules + dialogue), `ANIMALS`, `STICKERS`, `SHOP_ITEMS`, `SKILLS` |
| `minigames.ts` + `minigames/` | `Minigames` | registry (`register(name, Ctor, meta)`) in `minigames.ts`; one module per game in `src/minigames/<id>.ts`; shared bases + drawing helpers in `src/minigames/shared.ts` |
| `ui.ts` | `UI` | dialogue boxes, HUD, toasts, title, sticker book, journal, M-key map, day/night tint |
| `main.ts` | `Game` | the game loop, world sim, save/load, interactions, play animations, input |

Modules never reach into each other's internals; everything crosses
through the exported objects above.

## Boot and loop

`index.html` → `dist/game.js` → (module init only) → `window` `load`
event → `Game.init()` (grep `function init` in main.ts) →
`SpriteLib.build()` pre-renders every sprite to offscreen canvases,
`Maps.init()` resolves all warps → `requestAnimationFrame(loop)` →
`loop` calls `update(dt)` then `draw()` forever. dt is clamped to 50ms.

`main.ts` runs a state machine in the `state` variable:
`title | play | minigame | book | journal | map | summary`. `play` is
the walking-around world; `minigame` delegates `update/draw/key` to the
active `mg` object; `summary` is the end-of-day screen. Input arrives
via `onKey`, which normalizes keys to `left/right/up/down/action/back`
(`CODE_MAP`).

## The tile-character registry

Every map is an array of equal-length strings; every character is a
tile. A character must be registered everywhere it matters:

| What | Where | Grep |
| --- | --- | --- |
| painter (required) | `src/sprites.ts` | `const PAINT` |
| impassable | `src/maps.ts` | `const SOLID` |
| M-key map color | `src/ui.ts` | `MAP_COLORS` |
| map name tag | `src/ui.ts` | `PLACE_NAMES` |
| E-press flavor text | `src/main.ts` | `const FLAVOR` |
| E-hint bubble | `src/main.ts` | grep `bvyQdgwh` |

Doors are chars in `Maps.DOORS` (outer map → interior; interiors exit
via the `x` mat tile). Bus stops link outdoor maps via `Maps.LINKS` —
town is the hub: `B`→city, `6`→beach, `7`→farm. See the `add-area`
skill before touching any of this.

## Save system

`localStorage['starry-little-days']` holds `{ v: 1, G }` where `G` is
the `GState` interface at the top of main.ts (day, tmin, stars, energy,
skills, hearts, stickers, duckFood, treats, toys, fedDay, done, talked,
counts, fun, flags). Saving happens on sleep (`newDay` → `save()`).
**Rule: every new `G` field must get a default in BOTH `freshG()` and
`load()`** — `load()` does `Object.assign(freshG(), raw.G)` plus
per-field merges for nested objects, so an old save missing your field
must still produce a complete `GState`.

## Minigames

Class registry in minigames.ts: `api.register(name, Ctor, meta)` where
`meta` (`MinigameMeta`) carries label, energy/minutes/minEnergy
economics, smoke-test `keys`, and a description. Launchers call
`Minigames[name](done)` or `Minigames.create(name, done)`; economics are
read via `Minigames.meta(name)`. `MINIGAMES.md` is the full guide.

## Dev harness

Both validators load the **built bundle** (`dist/game.js`) in a node
`vm` with stub canvas/window — build first. The bundle exposes
`window.Starry = { Game, Maps, Entities, SpriteLib, AudioSys, UI,
Minigames }` (grep `Starry =` in main.ts) as the tooling hook; it is
also available in a real browser console.

- `dev/check.js` — data validation: map row lengths, every char has a
  painter, warps/doors/bus links land on walkable tiles, NPC schedule
  spots walkable, critter wander ranges dry, song note syntax + track
  sync, sticker/icon/award integrity, minigame registration + launcher
  references.
- `dev/smoke.js` — behavior: builds every sprite, draws every overlay
  for every map, plays **every registered minigame to its result
  screen** by mashing its `meta.keys`, then boots the real game loop
  and mashes keys through simulated play.

## Capacity cliffs (verified limits)

- **Tile characters: effectively exhausted.** 92 printable ASCII chars
  already have painters; only `` ` `` and `\` remain (both hostile in
  string literals). Escape hatch: single-code-unit Unicode chars
  (e.g. `¤`, `é`) work — grids index by UTF-16 code unit — but **never
  emoji** (2 code units; breaks row-length checks and indexing).
- **Sticker book: 48 of 48 slots used.** 8 cols × 6 rows at cell 84
  exactly fits the 768px canvas. Sticker 49 requires resizing the grid
  in `drawBook` (src/ui.ts, grep `cols = 8, cell = 84`) *and* the
  B-key nav constant in main.ts (grep `cols = 8`).
- **Journal friends: 5 rows fit, 4 used.** Panel is 640px tall from
  y=40; friend rows start ≈y=462 at 46px each (grep `drawJournal` in
  ui.ts). A 6th friend needs a layout change. Skills section is full at
  4 (rows of 62px).
- **Canvas is fixed 1248×768** (index.html); every screen hardcodes
  those proportions.
- Day runs 7:00–22:00 game time (`DAY_START`/`DAY_END` in main.ts),
  1 real second = 2 game minutes.

## Where to go next

| Task | Skill |
| --- | --- |
| new minigame | `add-minigame` (+ `MINIGAMES.md`) |
| new map / building / tile | `add-area` |
| new NPC or critter | `add-character` |
| new activity / sticker / animation / toy | `add-activity` |
| new song or sfx | `add-music` |
| pixel art conventions | `pixel-art` |
| the quality bar for new ideas | `design-principles` |
| something is broken | `debugging` |
| "am I done?" | `verifying-changes` |
