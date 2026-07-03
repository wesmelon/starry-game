---
name: add-character
description: Use when adding an NPC (villager, teacher, shopkeeper, friend) or a feedable critter/animal to Starry Little Days, or changing schedules, dialogue, shops, or friendship. Covers sprite palettes, entities.ts entries, role flags, and validator constraints.
---

# Add an NPC or critter

## NPC

1. **Sprite** — add to `CHARDEFS` in `src/sprites.ts`:
   `{ kind: 'adult' | 'kid' | 'boy', pal: {...} }`. Palette keys:
   `H` hair, `P` bun/pigtail accent, `D` dress/shirt, `d` dress shade,
   `A` apron, `T`/`O` boy shirt/shorts, `B` shoes. Colors are the soft
   pastel family — sample neighbors.
2. **Entity** — add to `NPCS` in `src/entities.ts`:
   - `where(gv)` returns `{ map, x, y }` — may vary by `gv.dow`
     (0=Mon…6=Sun) and `gv.hour`. check.js probes days {1,2,6,7} ×
     hours {7,9,12,14,17,20}: **every returned spot must be a walkable
     tile on a real map.**
   - `talk(gv)` returns `string[]` (always an array). Multi-line arrays
     rotate one line per day (except Mom, who speaks all lines).
   - `radius` is the wander distance around home.

3. **Role flags** (combine freely; resolution order in `talkTo` is
   shop → freeGames → game → chat):
   - `friend: true` — daily talk fills hearts; shows in the journal.
     **Journal space is tight** (5 friend rows fit) — check
     `drawJournal` layout in `src/ui.ts` before adding a 6th friend.
   - `shop: true` + `stock: [...ids]` + `greeting` — sells
     `SHOP_ITEMS`; `story: true` adds "Read a story ♪";
     `freeGames` also appear inside the shop menu.
   - `teaches: '<class>'` — needs a `CLASS_INFO` entry in main.ts, a
     skill in `Entities.SKILLS`, milestone stickers in `endClass`, and a
     registered minigame of the same name.
   - `game`/`gamePrompt` or `freeGames: [{ game, label }]` — hosts
     minigames (must be registered; check.js verifies).

## Critter (feedable animal)

1. **Template** — `ANIMAL_TPL` in sprites.ts: rows exactly **10 chars
   wide** from the set `. A D E W P` (check.js regex-validates widths),
   facing left; plus an `ANIMAL_PAL` entry.
2. **Entity** — `ANIMALS` in entities.ts: `{ id, name, kind, map, x, y,
   sfx, fed, happy, hungry }`.
   - `sfx` must be `meow`, `woof`, or `squeak` (check.js whitelist —
     extend the whitelist *and* add the sfx to audio.ts if you need a
     new voice).
   - The critter drifts x ± 0.7: that whole range must be walkable dry
     land (check.js verifies).
3. **Feeding sticker** — feeding every critter on one map in a day can
   award a sticker: the map→sticker table lives in `feedAnimal` in
   main.ts (`{ town: 'critters', city: 'zoo', farm: 'barnpals' }`).
   Maps without an entry award nothing (that's fine).

## Character-sprite template rules (if adding a new body type)

Character pixel rows are exactly **12 chars wide** from
`. H S E R D P d T O B A W` — check.js regex-validates every quoted row
in sprites.ts, so stray string literals that look like template rows
will fail the build. Keep art rows 12 (people) or 10 (animals/duck).

Finish with `npm run check`.
