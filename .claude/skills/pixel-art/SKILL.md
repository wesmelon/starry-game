---
name: pixel-art
description: Use when drawing or editing any visual asset in Starry Little Days — map tiles, character sprites, critter sprites, sticker icons, or painter helpers in src/sprites.ts. Covers the px() grammar, template formats, palette, and the art rules dev/check.js enforces.
---

# Pixel art — tiles, sprites, and icons

All art is procedural, generated at load time in `src/sprites.ts`.
There are no image files. Three asset kinds: **tile painters** (16×16),
**character/critter templates** (pixel-letter grids), and **icons**
(16×16, for stickers/toasts).

## Tile painters

A tile is a function in the `PAINT` record, drawing into a 16×16 canvas
with `px(g, x, y, w, h, color)` (a fillRect shorthand — grep
`function px` in `src/sprites.ts`).

- **Transparent vs full-tile:** the map's base tile (grass `.`, sand
  `s`, sidewalk `;`…) is always drawn underneath every tile, so
  painters for *objects* (trees, hay, cows) leave their background
  transparent and work on any ground. Painters that *are* ground
  (path `p`, water `w`, road `:`) fill all 16×16. `paintGrass(g)` is for
  tiles that must embed grass (e.g. fences with grass showing through).
- **Two-frame animation:** painters receive `(g, f)` with `f` = 0 or 1,
  swapped ~1.8×/sec. Use it for gentle motion — see water `'w'`:
  `const o = f ? 4 : 0;` shifts the wave highlights 4px. Most tiles
  ignore `f`.
- **Helpers** (grep the names): `signpost(g, face)` wooden sign with a
  custom pictogram callback; `busStop(g, base, light)` colored bus stop;
  `roof(g, base, dark)` striped building roof; `circleFill(g, cx, cy,
  r, col)` filled circle; door tiles are generated from `DOOR_TRIM` —
  add a door char there and to the loop below it, not as a hand-written
  painter.

New tile characters must also be registered in SOLID / MAP_COLORS /
FLAVOR etc. — that wiring is the `add-area` skill; this skill is only
how to draw.

## Character templates

People are pixel-letter grids: each row is a string exactly **12
characters wide**, one letter per pixel column. The charset (documented
at the top of sprites.ts):

| Char | Meaning | | Char | Meaning |
| --- | --- | --- | --- | --- |
| `.` | transparent | | `d` | dress shade |
| `H` | hair | | `P` | pigtail/bun accent |
| `S` | skin | | `T` | shirt (boy) |
| `E` | eye | | `O` | shorts (boy) |
| `R` | blush | | `B` | shoes |
| `D` | dress | | `A` | apron |
| `W` | white | | | |

- Bodies: `GIRL` (kids), `ADULT`, and `BOY_BOTTOM` (replaces a kid's
  lower rows). A character's `CHARDEFS` entry picks `kind: 'kid' |
  'adult' | 'boy'` plus a `pal` mapping letters → hexes; unmapped
  letters fall back to `DEFAULTS` (skin, eyes, blush, shoes, white).
- Directions: only `down`, `up`, `left` are drawn; `right` is `left`
  mirrored automatically.
- Legs: `LEGS` supplies 3 walking frames `[idle, stepA, stepB]` per
  facing (`front`/`side`) — you rarely touch these.

Critters (`ANIMAL_TPL`): rows exactly **10 wide**, charset `. A D E W
P` (body, dark, eye, white, pink), drawn facing **left**; the right
canvas is auto-mirrored (`g.translate(10, 0); g.scale(-1, 1)`).

## Icons (stickers, toasts)

16×16 `px()` functions in the `ICONS` record. **Formatting is
load-bearing:** `dev/check.js` discovers icon names with

```js
/^\s{4}(\w+):\s*\(g\)/gm
```

so every icon must start at exactly 4 spaces of indent, have a
word-character name, and take a bare `(g)` parameter — match the
existing one-liner style or sticker validation breaks.

## Canonical palette (verified hexes)

| Thing | Hex | | Thing | Hex |
| --- | --- | --- | --- | --- |
| Grass | `#9ad469` | | Wood post | `#a87840` |
| Path dirt | `#e9cd8f` | | Wood plank | `#c9935c` |
| Sand | `#f2e3b0` | | Pink (Starry) | `#ff9ec5` |
| Water | `#6fc7e8` | | Gold star | `#ffd95f` |
| Sidewalk | `#d9d2c4` | | Warm white | `#fff5fa` |
| Road asphalt | `#7d7a82` | | Apple red | `#e85a5a` |

Stay in this family — soft, warm, mid-saturation. Sample the closest
existing tile before inventing a hex.

## What check.js enforces (art section)

- Character rows: every quoted string of 6+ chars from the charset
  `[.HSERDPdTOBAW]` found in sprites.ts must be exactly 12 wide —
  regex `/^\s+'[.HSERDPdTOBAW]{12}',\s*$/gm`, with 10-wide
  `[.WEOADP]` strings exempted (animals/duck).
- Duck rows: `[.WEO]` strings must be 10 wide.
- **False-positive trap:** any indented string literal elsewhere in
  sprites.ts composed only of those letters (e.g. `'DADDA...'`) will be
  scanned as a template row and can fail the width check. Keep stray
  string constants out of sprites.ts or use characters outside the set.

## Worked example — a new object tile

```ts
'~': (g) => {  // birdbath (transparent bg — sits on any ground)
  px(g, 6, 10, 4, 5, '#b9b3a6');            // pedestal
  px(g, 3, 6, 10, 4, '#cfd6dc');            // basin
  px(g, 4, 7, 8, 2, '#bfe6f5');             // water
  px(g, 5, 7, 2, 1, '#e8f8ff');             // sparkle
},
```

(Char `~` is taken — pick a genuinely free one per `add-area`.)

## Verify

`npm run build` must compile; `npm run check` runs the art regexes and
confirms every map char has a painter and every sticker icon exists.
Judge the result visually: `npm run watch`, open `index.html`, walk to
the asset. Sprites render at 3× (`SCALE = 3`), so single pixels read as
chunky 3px blocks — detail below 2px reads as noise.
