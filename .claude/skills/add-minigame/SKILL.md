---
name: add-minigame
description: Use when adding a new minigame to Starry Little Days, or changing how an existing minigame plays, scores, or is launched. Covers the class, registration metadata, launchers (NPC, freeGames, tile, scheduled class), and verification.
---

# Add a minigame

**Read `MINIGAMES.md` first** — it is the full guide (contract, base
classes, drawing toolkit, launcher styles). This skill is the working
checklist plus the gotchas the doc assumes.

## Checklist

1. Write the class in `src/minigames.ts`, extending `BaseMinigame` or
   `ChoiceQuizMinigame` (three-card quizzes). Declare all fields —
   strict TS.
2. Register at the bottom of the file, next to the other
   `api.register(...)` calls. Metadata is the single integration point:

   ```ts
   api.register('mygame', MyGameMinigame, {
     label: 'My Game', energy: 10, minutes: 30, minEnergy: 10,
     keys: ['left', 'right', 'action'],   // what the smoke test mashes
     description: 'One line for docs.',
   });
   ```

3. Add one launcher: `game:`/`gamePrompt:` or `freeGames:` on an NPC in
   `src/entities.ts`, a tile menu in `interact()` in `src/main.ts`
   (`startFunGame({ name: '...' }, 'mygame')`), or a scheduled class
   (`CLASS_INFO` + `Entities.SKILLS` + `teaches:` — follow `art`).
4. Add a row to the Current games table in `MINIGAMES.md`.
5. `npm run check` — must pass before you are done.

## Gotchas that bite

- **Key repeat is off in minigames.** Only discrete keydowns arrive;
  "hold to move" silently does nothing. Design for taps.
- **The game must be finishable under its registered `keys` alone** —
  the smoke test mashes exactly those (plus periodic `action`) for up to
  ~10 simulated minutes. Untimed prompts must accept a registered key;
  otherwise add a timeout that counts as a miss and moves on.
- **The player must always be able to leave.** Every phase needs a path
  to `complete(...)` (Roller Lab once soft-locked in its editor — Esc on
  its menu is the fix pattern).
- `complete(stars, perfect)` clamps stars to 1–3; the launcher pays a
  bonus star for `perfect` and pays only once per day per game id.
  **Game ids live in save files** (`G.fun['game_<id>']`) — never rename
  or reuse one.
- Games needing raw letter keys: set `inputMode = 'letters'` on the
  class and put the letters in `keys` (see `hopscotch`).
- If the game awards a new sticker, see the `add-activity` skill —
  the sticker book is at exact capacity.

`dev/check.js` fails on missing metadata or launcher references to
unregistered names; `dev/smoke.js` plays every registered game to its
result screen. New games are covered automatically — do not edit `dev/`.
