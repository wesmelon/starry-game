---
name: add-minigame
description: Use when adding a new minigame to Starry Little Days, changing how an existing minigame plays, scores, or is launched, or wiring a game to an NPC, tile, or the class schedule. Covers the game class, registration metadata, all four launcher styles, the input model, and verification.
---

# Add a minigame

`MINIGAMES.md` at the repo root is the deep reference (drawing toolkit,
base-class hooks, design notes). This skill is the executable checklist
with a smoke-verified worked example.

## The five steps

1. Create `src/minigames/<id>.ts` exporting your class, extending
   `BaseMinigame` (or `ChoiceQuizMinigame` for three-card quizzes — see
   below). Import the base and drawing helpers from `./shared`, and
   `AudioSys`/`SpriteLib` from `../audio`/`../sprites` — copy the import
   lines of `src/minigames/shells.ts`. Strict TypeScript: declare every
   field.
2. Register it in `src/minigames.ts` (the registry file): import your
   class and add an `api.register(...)` call beside the others —
   **this is the only integration point**; launchers read the economics
   from it and the smoke test reads `keys`:

   ```ts
   api.register('mygame', MyGameMinigame, {
     label: 'My Game',                    // menus, toasts, day summary
     energy: 10, minutes: 30, minEnergy: 10,  // defaults: 12 / 40 / 15
     keys: ['left', 'right', 'action'],   // inputs the smoke test mashes
     description: 'One line for docs.',
   });
   ```

3. Give it one launcher in the world (four styles below).
4. Add a row to the `## Current games` table in `MINIGAMES.md`.
5. `npm run check` — must pass. `dev/check.js` fails on incomplete
   metadata or launchers referencing unregistered names; `dev/smoke.js`
   automatically plays every registered game to its result screen by
   mashing its `keys` (up to 12 000 frames at dt 0.05 ≈ 10 simulated
   minutes). Never edit `dev/` for a new game.

## Worked example (smoke-verified)

This complete game compiles under strict TS and finishes under the
smoke test — it was validated by temporarily registering it and running
`npm run check`. Pattern to copy: a per-turn timeout guarantees the game
always moves forward, even with zero input.

```ts
class AcornTossMinigame extends BaseMinigame {
  total = 8;
  thrown = 0;
  hits = 0;
  target = 1;        // which basket glows (0..2)
  aim = 1;           // which basket Starry faces
  timeLeft = 2.0;    // seconds left for this toss
  handleInput(act: string) {
    if (this.phase !== 'play') return;
    if (act === 'left') { this.aim = Math.max(0, this.aim - 1); AudioSys.sfx('blip'); }
    if (act === 'right') { this.aim = Math.min(2, this.aim + 1); AudioSys.sfx('blip'); }
    if (act === 'action') this.throwAcorn(this.aim === this.target);
  }
  throwAcorn(hit: boolean) {
    if (hit) { this.hits++; AudioSys.sfx('star'); } else AudioSys.sfx('deny');
    this.thrown++;
    this.target = Math.floor(Math.random() * 3);
    this.timeLeft = 2.0;
    if (this.thrown >= this.total) {
      this.complete(this.hits >= 7 ? 3 : this.hits >= 4 ? 2 : 1, this.hits === this.total);
    }
  }
  updatePlay(dt: number) {
    if (this.phase !== 'play') return;
    this.timeLeft -= dt;                       // the kindness timeout:
    if (this.timeLeft <= 0) this.throwAcorn(false);  // a slow turn is a miss, not a stall
  }
  draw(g: Ctx) {
    const W = g.canvas.width, H = g.canvas.height;
    g.fillStyle = '#e8f2d8'; g.fillRect(0, 0, W, H);
    if (this.phase === 'intro') {
      panel(g, W / 2 - 300, 250, 600, 160, '#fff8ee');
      label(g, 'Acorn Toss!', W / 2, 305, 36, '#b85c8a');
      label(g, 'Aim ← → at the glowing basket, E to toss. Press E!', W / 2, 360, 20, '#5a4a6a');
      return;
    }
    if (this.phase === 'result') {
      resultScreen(g, W, H, 'All tossed!', this.hits + ' of ' + this.total + ' acorns in!', this.stars, this.rt);
      return;
    }
    label(g, 'Acorn ' + Math.min(this.total, this.thrown + 1) + ' of ' + this.total, W / 2, 60, 26, '#7a4a9a');
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * 260;
      g.fillStyle = i === this.target ? '#ffd95f' : '#c9935c';
      rr(g, x - 70, 400, 140, 90, 16); g.fill();
      if (i === this.aim) { rr(g, x - 78, 392, 156, 106, 18); g.strokeStyle = '#ffb84f'; g.lineWidth = 5; g.stroke(); }
    }
    sprite(g, 'starry', 'up', Math.floor(this.t * 4) % 2 ? 1 : 2, W / 2 + (this.aim - 1) * 260, H - 40, 4);
  }
}
```

`BaseMinigame.key()` already runs the outer flow: `action` on the intro
calls `start()` (default flips to `play` and plays the confirm sound);
`action` on the result screen (after 1s) calls `done(stars, perfect)`.
Everything else reaches your `handleInput`.

## ChoiceQuizMinigame — prefer it for question games

If the game is "ask 5 questions, pick one of three cards" (like
`school`, `math`, `art`, `stampstudio`, `cookiehelper`), extend
`ChoiceQuizMinigame` instead: it supplies selection, feedback colors,
scoring (3★ all correct, 2★ ≥ 60%, 1★ otherwise; perfect = all), and
intro/result screens. You implement `buildQuestion()` returning
`{ prompt, opts: [a, b, c], ans: indexOfCorrect, ...extras }` plus
`drawOption` / `drawBackground` / `drawPlayExtras`. Config knobs
(`QuizCfg`): `rounds, title, titleY, titleColor, introLines,
introSprite, footerSprite, resultTitle, startSfx, promptY, promptSize,
promptColor, progressY, progressColor, cardW, cardH, cardGap, cardY`.

## Launchers (pick one)

**A — NPC hosts the game** (`src/entities.ts`): talk → play/chat menu.

```ts
{ id: 'sandy', ..., game: 'shells',
  gamePrompt: 'The tide washed in a WHOLE bunch of shells! Want to play Shell Splash?' }
```

**B — NPC offers it alongside teaching/chatting** (`freeGames`):

```ts
freeGames: [{ game: 'math', label: 'Play Number Time' }],
freeGamePrompt: 'Want to play a little number game?',
```

Shop NPCs surface `freeGames` inside their shop menu automatically —
`openShop` in `src/main.ts` adds a `'__game:' + name` option (see
Mrs. Honey's `cookiehelper`). No extra wiring.

**C — a tile launches it** (`interact()` in `src/main.ts`); keep the
tile's simple interaction as a menu option:

```ts
UI.choose('Bubble Stand', 'A tray of bubble wands glitters in the sun.', [
  { label: 'Play Bubble Pop', value: 'game' },
  { label: 'Blow bubbles', value: 'blow' },
  { label: 'Not now', value: null },
], v => {
  if (v === 'game') startFunGame({ name: 'Bubble Stand' }, 'bubblepop');
  else if (v === 'blow') { /* the simple interaction */ }
});
```

**D — a scheduled class** (heavyweight; follow `art` end-to-end).
Touchpoints: a `CLASS_INFO` entry in main.ts
(`{ label, skill, firstSticker, prompt, days /*0=Mon..6=Sun*/, from, to }`),
a skill ladder in `Entities.SKILLS`, milestone stickers in `endClass`'s
`milestones` map, a teacher NPC with `teaches: 'mygame'`, and reminder
toasts in `updateClock` if it deserves one. check.js verifies `teaches`
has both a CLASS_INFO entry and a registered game of the same name.

## Input model — read before designing

- Actions delivered: `left right up down action back`. **Key repeat is
  off in minigames** (`onKey` drops repeats outside the play state), so
  "hold to move" silently fails — design for taps.
- Raw letter keys: set `this.inputMode = 'letters'` in the constructor;
  `onKey` then routes a–z via `keyLetter()` and your registered `keys`
  should list the letters (see `hopscotch`). In letters mode the intro/
  result screens also accept the letter `e` as the action key.

## Economics & permanence

- `startFunGame`/`endFunGame` (main.ts) read `Minigames.meta(game)` via
  `funGameInfo`: `minEnergy` gates entry, `energy` and `minutes` are
  spent every play, and stars (+1 for perfect) pay **once per day** —
  the state key is `G.fun['game_<id>']` and lives in save files
  forever, so never rename or reuse a game id.
- Kindness invariants: `complete()` clamps stars to 1–3 (everyone wins
  something); misses get the gentle `deny` chime and encouraging text;
  every phase must have a path forward (Roller Lab once soft-locked its
  editor — its menu Esc-to-finish is the fix pattern).

## Gotchas

- A game that can stall with no input hangs the smoke test — always
  have a timeout or make every prompt answerable by a registered key.
- New sticker with the game? See the `add-activity` skill first: the
  sticker book is at exact capacity.
- Adding fields to the save (`G`)? Extend both `freshG()` and the
  defaults in `load()` (main.ts) or old saves break.
