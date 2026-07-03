---
name: add-area
description: Use when adding a new map, location, building interior, or tile type to Starry Little Days — a new outdoor area reachable by bus, a building with a door and interior, or a new tile character on any map. Covers picking a tile character (the namespace is nearly exhausted), the six tile registries, warp/door/bus wiring, and what the validators enforce.
---

# Add a map, interior, or tile type

Maps are arrays of strings in `src/maps.ts`; every character is a tile
type. The renderer draws the map's `base` tile under every cell, then
the cell's own tile on top — so most painters leave their background
transparent.

## Registry table — every new tile char touches these

| Registry | File / anchor | Required? |
| --- | --- | --- |
| `PAINT['x'] = (g) => {...}` painter | `src/sprites.ts`, grep `const PAINT` | always — check.js fails on a char with no painter |
| `SOLID` set | `src/maps.ts`, grep `const SOLID` (one long char string) | if the tile blocks walking |
| `MAP_COLORS` | `src/ui.ts`, grep `MAP_COLORS` | to show on the M-key map |
| `PLACE_NAMES` + `PLACE_CHARS` | `src/ui.ts`, grep `PLACE_CHARS` | doors/bus stops that get a name tag |
| `FLAVOR` | `src/main.ts`, grep `const FLAVOR` | if E should say something |
| E-hint char string | `src/main.ts`, grep `bvyQdgwh` | interactable tiles NOT in FLAVOR (FLAVOR chars get the hint automatically) |

## Picking a character — the namespace is exhausted

**Nearly every printable ASCII character is already claimed.** Audit
before choosing (run from the repo root; needs a fresh `npm run bundle`):

```sh
node -e '
const fs=require("fs"),vm=require("vm");
const w={addEventListener(){}};
const sb={window:w,document:{},console,setInterval:()=>0,setTimeout:()=>0,performance:{now:()=>0}};
sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(fs.readFileSync("dist/game.js","utf8"),sb);
const {SpriteLib,Maps}=w.Starry;
const used=new Set();
for(const m of Object.values(Maps.DATA))for(const r of m.rows)for(const c of r)used.add(c);
let free="";
for(let i=33;i<127;i++){const c=String.fromCharCode(i);if(!SpriteLib.hasTile(c)&&!used.has(c))free+=c;}
console.log("free tile chars:",free);'
```

As of this writing it prints exactly two survivors: `\` and `` ` `` —
both hostile inside string-literal grids (escaping hazards). **The
practical escape hatch is single-code-unit Unicode** (e.g. `¤`, `§`,
`°`): the grid code indexes strings one code unit at a time
(`rows[y][x]` in `tileAt`), so any char passes as long as
`'¤'.length === 1` in node. **Never use emoji** — `'🎈'.length === 2`,
which silently corrupts grid indexing and row-width checks. Test your
candidate's `.length` before committing to it.

## Painters (16×16 pixel tiles)

`px(g, x, y, w, h, color)` rectangles on a 16×16 canvas. Transparent
background unless the tile replaces the ground entirely. Painters
receive `(g, f)` with `f` 0|1 — a free two-frame idle animation (see
`'w'` water in PAINT). See the `pixel-art` skill for palettes and
conventions.

## New outdoor area, reachable by bus

1. `DATA` entry in maps.ts: `{ label, base, outdoor: true, music,
   rows: [] }`. Reuse a `SONGS` key from `src/audio.ts` for `music`
   (outdoor maps auto-switch to `night` in the evening).
2. A grid-builder block — copy the beach or farm block: `grid(w, h,
   base)`, `border(g, w, h, '#')` tree wall, then features, then
   `sprinkle(g, w, h)` **last**. Why last-and-grass-only: `sprinkle`
   literally skips any cell that isn't `'.'` (grep `function sprinkle`),
   so it only decorates untouched grass and would never overwrite your
   features — but running it early wastes cells you were about to build
   on.
3. Bus wiring — a dedicated stop char in town (paint it with the
   `busStop(g, base, light)` helper in a new color), a `B` stop on the
   new map, and a `LINKS` entry in maps.ts.
4. Extras: `BFLY[mapname]` butterfly list (grep `const BFLY`,
   src/main.ts), a first-visit trip sticker via the map table in
   `doWarp` (grep `citytrip`, src/main.ts), an `i` sign beside the stop.

### Bus-link direction math (how `dir` really works)

`Maps.init()` builds both warps from one `LINKS` entry using
`OFF` (direction → dx,dy) and `OPP` (opposite):

```
warps[a][a.pos] = { map: b.map, pos: b.pos + OFF[dir],      dir }
warps[b][b.pos] = { map: a.map, pos: a.pos + OFF[OPP[dir]], dir: OPP[dir] }
```

Real example — `{ a: { map: 'town', ch: '6' }, b: { map: 'beach',
ch: 'B' }, dir: 'right' }`, where town's `6` sits at (34, 36) and the
beach `B` at (20, 3):

- Step on town (34, 36) → appear at beach **(21, 3)** facing right
  (one tile right of the stop — NOT on it, so you don't instantly warp
  back).
- Step on beach (20, 3) → appear at town **(33, 36)** facing left.

So both landing tiles — `dest + OFF[dir]` and `origin + OFF[opposite]`
— must be walkable; check.js verifies both. Pick `dir` so those two
tiles are open ground.

## New interior — worked example, "Cozy Reading Nook"

Every format detail below matches the real code (`barn` and `art` are
the reference interiors). Suppose the door goes on the town map with
the (currently unclaimed) char `¤`:

**1. maps.ts — the interior.** Equal-width rows, `|` walls, `x` mat:

```ts
DATA.nook = {
  label: 'Cozy Reading Nook', base: '_', music: 'home',
  rows: [
    '||||||||||||',
    '|mm......mm|',
    '|..r....r..|',
    '|..........|',
    '|.....x....|',
    '||||||||||||',
  ],
};
```

(`_` wood floor, `m` shelves, `r` rugs — all existing tiles.)

**2. maps.ts — the door registration** (inside `const DOORS`):

```ts
'¤': { outer: 'town', inner: 'nook' },
```

**3. maps.ts — place the building** in the town grid block:

```ts
building(tg, 12, 30, 6, 2, '2', '¤');   // roof rows 30-31, door at (15, 33)
```

`building(g, x, y, w, roofH, roofChar, doorChar, stub?)` draws the
roof, a wall row with windows, the door row with `doorChar` at
`x + (w >> 1)`, and a path stub *below the door* — the tile below the
stub must be reachable ground.

**4. sprites.ts — door art.** Add to `DOOR_TRIM` (grep `DOOR_TRIM`) and
append the char to the loop right below it:

```ts
'¤': '#c9a06a',                               // trim color, in DOOR_TRIM
for (const dc of ['H', ..., '>', '¤']) {      // the generator loop
```

**5. ui.ts** — `PLACE_NAMES['¤'] = 'Nook'` and append `¤` to the
`PLACE_CHARS` string.

check.js then verifies automatically: the door exists, its warp lands
on a walkable tile above the mat, the mat warps back to a walkable
tile below the door, the tile below the door is walkable, and every
char in the new rows has a painter. Equal row widths are also checked
— count characters carefully.

## Populating an area

- **NPCs / critters**: see the `add-character` skill. Hard constraints
  check.js probes: NPC `where()` must return walkable tiles at days
  {1,2,6,7} × hours {7,9,12,14,17,20}; critters need dry walkable land
  at x ± 0.7 around their spot.
- **Activities/stickers**: see `add-activity`.
- **Minigames in the area**: see `add-minigame` (Wonder Roll Park in
  the city is the reference for an interior built around a game).

## Gotchas

- Row width mismatches are the #1 interior mistake — every row of a
  map must be the same length or check.js fails.
- A door char is also a *tile* char: it must NOT be added to `SOLID`
  (players walk onto doors to enter) — same for bus stops.
- The `x` exit mat is found by `find(inner, 'x')` — exactly one per
  interior.
- `grid()`/`rect()` coordinates are `g[y][x]` (row first). The comment
  convention in the file writes `(x, y)` — don't mix them up.
- Bus stop chars are per-line: town's `B` goes to the city, `6` to the
  beach, `7` to the farm. A new line needs a NEW char for the town
  side; the far side can reuse `B` (lookup is per-map).

## Verify

`npm run check` (builds first via `npm run check`'s pipeline). Then
playtest: ride the bus both ways, enter/exit the door, press M on the
new map, walk the borders, and confirm E-hints on your new tiles.
