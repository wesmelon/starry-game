---
name: add-area
description: Use when adding a new map, location, building interior, or tile type to Starry Little Days — a new outdoor area reachable by bus, a building with a door, or a new tile character on any map. Covers the tile-char registries, warp/door/bus wiring, and the validators.
---

# Add a map, interior, or tile type

Maps are character grids (`src/maps.ts`); every character is a tile with
a painter. One character = one tile type, and each new character must be
registered in **all** of these places:

| Registry | File | Required? |
| --- | --- | --- |
| `PAINT['x'] = (g) => {...}` painter | `src/sprites.ts` | always (check.js fails otherwise) |
| `SOLID` char string | `src/maps.ts` | if impassable |
| `MAP_COLORS` | `src/ui.ts` | if it should show on the M-key map |
| `PLACE_NAMES` + `PLACE_CHARS` | `src/ui.ts` | doors/bus stops that deserve a name tag |
| `FLAVOR` | `src/main.ts` | if pressing E should say something |
| interaction-hint char string | `src/main.ts` (grep `bvyQdgwh`) | if interactable but not in FLAVOR |

**Free characters are scarce.** Before claiming one, confirm it is
unused in both `PAINT` and every map grid:
`grep -c "'x'" src/sprites.ts src/maps.ts` and eyeball the grids.
Punctuation is fine (`{ } [ ] ( ) < > / ! % $ ? "` are taken — check!).

## Painters (16×16 pixel tiles)

`px(g, x, y, w, h, color)` rectangles inside a 16×16 cell. Leave the
background transparent unless the tile *replaces* the ground — the map's
base tile is always drawn underneath. Painters get `(g, frame)` where
`frame` is 0/1 for a two-frame idle animation (see `w` water).

## New outdoor area (bus-connected)

1. `DATA` entry: `{ label, base, outdoor: true, music, rows: [] }` —
   reuse a song name from `audio.ts` `SONGS`.
2. Grid-builder block (copy the beach/farm blocks): `grid()`, `border()`
   trees, features, `sprinkle()` last (it only decorates the base char).
3. Bus stop: a dedicated stop char in **town** (painter = `busStop(g,
   color, light)` variant) and a `B` on the new map, then a `LINKS`
   entry. **Direction semantics:** `dir` is the direction you face when
   you arrive next to the destination stop — the tile at
   `dest_stop + dir` and at `town_stop + opposite(dir)` must both be
   walkable (check.js verifies both landings).
4. Optional per-area extras: `BFLY[mapname]` butterflies (main.ts), a
   trip sticker via the map in `doWarp` (`{ city: 'citytrip', ... }`),
   an `i` sign next to the stop.

## New interior (behind a door)

1. `DATA` entry with literal `rows` — **every row string the same
   length**, `|` walls, an `x` exit mat.
2. Pick a door char: add to `Maps.DOORS` (`{ outer, inner }`), to
   `DOOR_TRIM` + the door-painter loop in sprites.ts, and to
   `PLACE_NAMES`/`PLACE_CHARS`.
3. Place the door with `building(grid, x, y, w, roofH, roofChar,
   doorChar)` — it draws roof/wall/door and a path stub below.

## Validator contract (`npm run check`)

check.js enforces: equal row lengths; every used char has a painter;
door/mat warps resolve and land walkable; the tile below every door is
walkable; bus links land walkable both ways; NPC `where()` spots and
critter wander ranges (x ± 0.7) are walkable dry land. Place NPCs and
critters accordingly (see the `add-character` skill).
