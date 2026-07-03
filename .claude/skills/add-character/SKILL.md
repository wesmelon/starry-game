---
name: add-character
description: Use when adding an NPC (villager, teacher, shopkeeper, friend) or a feedable critter/animal to Starry Little Days, or when changing an existing character's schedule, dialogue, shop stock, or friendship behavior. Covers sprite palettes, entities.ts entries, role flags and their resolution order, and the validator constraints placement must satisfy.
---

# Add an NPC or critter

Characters live in two files: pixel art in `src/sprites.ts`, behavior in
`src/entities.ts`. `npm run check` validates placement and dialogue shape,
so run it after every step.

## NPC recipe

### 1. Sprite palette — `CHARDEFS` in `src/sprites.ts`

One entry per character: `{ kind, pal }`. `kind` is `'adult'`, `'kid'`,
or `'boy'` (boy = kid body with shirt/shorts rows). `pal` maps template
letters to hex colors. The letters (from the template comment at the top
of sprites.ts):

| Letter | Means | Fallback if omitted |
| --- | --- | --- |
| `H` | hair | none — always set it |
| `P` | pigtail/bun accent | transparent (no accent) |
| `D` | dress/shirt | none — always set it |
| `d` | dress shading | falls back to `D` |
| `A` | apron | falls back to `D` (set it for visible aprons) |
| `T` / `O` | boy shirt / shorts | `T`→`D`, `O`→`d`/`D` |
| `B` | shoes | default brown `#7a4632` |
| `S` `E` `R` `W` | skin/eye/blush/white | sensible defaults in `DEFAULTS` |

(Fallback logic: `palColor` in sprites.ts.) Adults usually set `P` to the
hair color so the bun matches. Keep to the pastel family — sample the
neighbors in `CHARDEFS`.

### 2. Entity — `NPCS` array in `src/entities.ts`

```ts
{
  id: 'finn2', name: 'Old Salty', sprite: 'salty', radius: 1.2,
  where: (G) => (G.hour >= 12 && G.hour < 19)
    ? { map: 'beach', x: 30, y: 12 } : { map: 'town', x: 10, y: 21 },
  talk: () => ['The lake says hello today. Splash means hello.',
               'I once caught a boot. Named him Bootie.',
               'Duckies are just tiny boats with opinions.'],
},
```

- `id` is forever (hearts/talk state are saved under it) — never rename.
- `sprite` must match the `CHARDEFS` key.
- `where(G)` may branch on `G.dow` (0=Mon…6=Sun) and `G.hour` (0–24).
  **Placement rule:** `dev/check.js` probes `where()` for days
  `[1, 2, 6, 7]` (Mon, Tue, Sat, Sun) × hours `[7, 9, 12, 14, 17, 20]`
  and requires every result to be a real map name and a non-solid tile.
  Pick tile coordinates by reading the map grid in `src/maps.ts`.
- `talk(G)` must always return a `string[]`. If it has multiple lines,
  the game shows ONE line, rotated daily (`lines[G.day % lines.length]`
  in `chatWith`, src/main.ts) — write each line to stand alone. Only Mom
  (`id: 'mom'`) speaks all her lines in sequence.
- `radius` = wander distance around the `where()` spot (0 = statue).
  Wandering ignores collision, so keep NPCs away from water edges.

### 3. Role flags — and their resolution order

`talkTo` in `src/main.ts` checks flags in THIS order; the first match
decides the whole interaction, so flag combinations matter:

1. **`shop: true`** — everything happens inside the shop menu.
   Needs `stock: [...SHOP_ITEMS ids]`, `greeting`, optional `shopName`.
   `story: true` adds a "Read a story ♪" menu row; `freeGames` entries
   appear as menu rows too (via `'__game:' + id` values in `openShop`).
   `bakery: true` switches which sticker treats award.
2. **`teaches: '<class>'`** (when class is in session) — offers the
   class; `freeGames` are appended to that menu. Requires a `CLASS_INFO`
   entry in main.ts, a skill in `Entities.SKILLS`, milestone stickers in
   `endClass`, and a registered minigame of the same name (check.js
   verifies all of this). Outside class hours, falls through to chat.
3. **`freeGames: [{ game, label }]`** — "what shall we play?" menu with
   a "Just saying hi" chat option. `freeGamePrompt` customizes the ask.
4. **`game: '<id>'` + `gamePrompt`** — single play/chat choice.
5. Plain chat (`chatWith`).

**`friend: true`** works with chat (paths 3–5): first talk each day
adds 10 hearts (`FRIEND_MAX` is 150 = 5 hearts × 30 in entities.ts), so
a friend maxes out in 15 days. Friends appear in the J-key journal.
**Journal budget (verified from `drawJournal` math in src/ui.ts):** the
panel bottom is y=680; with 4 skills, friend rows start at y=462 and
step 46px — room for exactly **5 friend rows**, and 4 exist today. A
6th friend (or a 5th skill, which pushes friends down 62px) needs a
`drawJournal` layout change. Friendship stickers (`bestie`,
`butterfly`, `citypal`) are hardcoded in `chatWith` — extend there if
the new friend should have one.

## Critter recipe (feedable animal)

### 1. Art — `ANIMAL_TPL` + `ANIMAL_PAL` in sprites.ts

Rows are **exactly 10 chars wide**, drawn facing LEFT (the right-facing
version is auto-mirrored). Allowed chars, enforced by a check.js regex:
`. W E O A D P` — by convention `A` body, `D` dark accent, `E` eye,
`W` white, `P` pink. Example shape (the cat):

```ts
turtle: [
  '..........',
  '..DDDDD...',
  '.DAAAAAD..',
  'AEAAAAAAD.',
  '.AAAAAAA..',
  '..A..A....',
],
```

Add a matching `ANIMAL_PAL` entry: `turtle: { A:'#8fbf8a', D:'#5a8a5a',
E:'#222' }` — letters missing from the palette render transparent.

### 2. Entity — `ANIMALS` array in entities.ts

```ts
{ id: 'turtle', name: 'Sheldon', kind: 'turtle', map: 'beach', x: 28.5, y: 17.5, sfx: 'squeak',
  fed: 'Sheldon munches in slow motion. Worth the wait!',
  happy: 'Sheldon naps inside his shell. Do-not-disturb.',
  hungry: 'Sheldon the turtle looks at the treat bag... slowly...' },
```

- `sfx` must pass the check.js whitelist, quoted:
  `['meow', 'woof', 'squeak'].includes(a.sfx)` — to add a new voice,
  add the sfx to `SFX` in src/audio.ts AND extend that whitelist.
- Critters drift around their home spot. check.js verifies dry walkable
  land at x-offsets `[-0.7, 0, 0.7]` (same y) — so the three tiles
  `floor(x±0.7), floor(y)` must all be non-solid, non-water.
- The three lines: `hungry` shows before feeding, `fed` right after,
  `happy` for repeat visits that day.

### 3. Feeding behavior (already wired — know what you get)

`feedAnimal` in main.ts: feeding costs one Critter Treat (bought at
Mr. Scoop's). Unfed critters show a cookie thought-bubble
(`hungry thought bubble` in `drawAnimal`). Feeding EVERY critter on one
map in a single day awards a sticker via the map table in `feedAnimal`:
`{ town: 'critters', city: 'zoo', farm: 'barnpals' }` — maps absent
from the table award nothing (fine), or add a new sticker id there
(see the add-activity skill for adding stickers — capacity warning!).

## Gotchas

- Template rows elsewhere: check.js regex-scans ALL quoted strings in
  sprites.ts that look like template rows; people rows must be exactly
  12 chars of `. H S E R D P d T O B A W`, animal/duck rows exactly 10
  of `. W E O A D P`. A stray string literal matching those charsets at
  the wrong width fails the build.
- `where()` must return walkable spots at ALL probed times — a
  common failure is an NPC standing on furniture at 7am because the
  "morning" branch was never checked against the interior grid.
- Shop NPCs never plain-chat: their `talk()` lines are unreachable
  except via `story`/menu paths. Don't put important dialogue there.
- New save-visible behavior (a heart target, a flag) goes through
  `freshG()`/`load()` in main.ts — see the add-activity skill.

## Verify

`npm run check` — placement probes, dialogue shape, template widths,
sfx whitelist, minigame references. Then playtest: talk to the NPC at
morning/afternoon/evening, and feed the critter twice (fed + happy).
