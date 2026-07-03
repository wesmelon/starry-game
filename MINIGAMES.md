# Minigame Developer Guide

How to add a minigame to Starry ☆ Little Days. Written so that a developer
(human or AI agent) can build, wire up, and verify a new game **without
reading the rest of the codebase first**. Everything a game needs lives in
two places:

1. `src/minigames.ts` — the game class **and** its registration + metadata.
2. One launcher in the world — an NPC or a tile (see "Launching from the
   world" below).

The headless smoke test picks up new games automatically from the registry,
so there is nothing to update in `dev/`.

## The 60-second recipe

1. Write a class in `src/minigames.ts` extending `BaseMinigame` (or
   `ChoiceQuizMinigame` for three-card quizzes).
2. Register it at the bottom of the file with its metadata:

   ```ts
   api.register('fireflies', FirefliesMinigame, {
     label: 'Firefly Catch',            // shown in menus & day summaries
     energy: 8,                         // energy Starry spends (default 12)
     minutes: 25,                       // in-game minutes spent (default 40)
     minEnergy: 10,                     // needed to start (default 15)
     keys: ['left', 'right', 'action'], // inputs the smoke test mashes
     description: 'Catch blinking fireflies in a jar at dusk.',
   });
   ```

3. Give it a launcher (NPC `game:`/`freeGames:` in `src/entities.ts`, or a
   tile interaction in `src/main.ts` — examples below).
4. `npm run check` — typecheck, bundle, data checks, and the smoke test,
   which plays your game to completion using `keys`.

That's it. `dev/check.js` will fail loudly if a launcher references an
unregistered name or a registration is missing `label`/`keys`/`description`.

## Contract

A minigame instance must expose (the `Minigame` interface in
`src/types.ts`):

```ts
key(act: string): void;      // 'left' | 'right' | 'up' | 'down' | 'action' | 'back'
update(dt: number): void;    // dt is seconds (~0.016)
draw(g: CanvasRenderingContext2D): void;   // full-screen scene, canvas is 1248×768
```

and call `done(stars, perfect)` exactly once when the player leaves the
result screen. Extending `BaseMinigame` gives you all of that plumbing.

**Input model — important:** the game receives discrete keydown events
only. Key **repeat is disabled** while a minigame is open, so "hold to
move" does not work. Design around taps: lane switching (`shells`,
`bubblepop`), alternating mashes (`swim`), or matching prompts
(`ballet`, `balloonbop`, `veggies`, `hopscotch`).

**Rules (all games follow these):**

- Award 1–3 stars via `complete(stars, perfect)`; `perfect` earns a bonus
  star from the launcher. Everyone gets at least one star — this is a
  kind game (`complete` clamps for you).
- The game must end **without any input**: give prompts a timeout that
  counts as a miss and moves on. A stuck game hangs both toddlers and the
  smoke test.
- Keep it under a minute of real play.
- Randomness is fine, but never randomize away winnability.

## BaseMinigame

```ts
class BaseMinigame {
  phase: string;    // 'intro' → 'play' → 'result' (add your own like 'show'/'wait')
  t: number;        // seconds since creation (update() advances it)
  rt: number;       // seconds on the result screen
  start(): void;                                // intro → play; play a start sfx
  handleInput(act: string): void;               // input during play — override
  updatePlay(dt: number): void;                 // per-frame logic — override
  complete(stars: number, perfect: boolean);    // → result screen + fanfare/yay sfx
  draw(g: Ctx): void;                           // you write this one entirely
}
```

`key()` already handles: `action` on the intro calls `start()`; `action`
on the result screen (after 1s) calls `done`. Everything else lands in
`handleInput`. A typical `draw()` looks like:

```ts
draw(g: Ctx) {
  const W = g.canvas.width, H = g.canvas.height;
  /* background */
  if (this.phase === 'intro') { /* panel + how-to-play + "Press E!" */ return; }
  if (this.phase === 'result') {
    resultScreen(g, W, H, 'Nice title!', this.score + ' of ' + this.total + '!', this.stars, this.rt);
    return;
  }
  /* play scene */
}
```

## ChoiceQuizMinigame (three-card quizzes)

`school`, `math`, and `art` are ~60 lines each because this base class does
the whole quiz loop: card selection with ←/→, answer feedback colors,
scoring (3★ all correct, 2★ ≥60%, 1★ otherwise, perfect = all), intro and
result screens. You provide:

```ts
class MyQuiz extends ChoiceQuizMinigame {
  constructor(done: MinigameDone) {
    super(done, {
      title: 'Quiz Time!',                    // intro heading
      introLines: ['...', '...', 'Press E to start!'],
      introSprite: 'doodle',                  // teacher on the intro screen
      footerSprite: 'starry',                 // Starry at the bottom during play
      resultTitle: 'All done!',
      // optional layout: rounds, cardY/cardW/cardH/cardGap, promptSize...
    });
  }
  buildQuestion(): QuizQuestion {
    // return { prompt: 'Find the X!', opts: [a, b, c], ans: indexOfCorrect }
    // extra fields are allowed and come back via this.q!
  }
  drawOption(g: Ctx, opt: any, cx: number, cy: number) { /* draw one card */ }
  drawBackground(g: Ctx, W: number, H: number) { /* scene behind everything */ }
  drawPlayExtras(g: Ctx, W: number, H: number) { /* e.g. the objects to count */ }
}
```

## Drawing toolkit

Helpers already in `src/minigames.ts` — prefer these over new utilities:

| Helper | What it does |
| --- | --- |
| `panel(g, x, y, w, h, fill)` | rounded soft-shadow card (use `'#fff8ee'`) |
| `label(g, txt, x, y, size, col, align?, weight?)` | outlined text, centered by default |
| `rr(g, x, y, w, h, r)` | rounded-rect path (then `g.fill()`/`g.stroke()`) |
| `starPath(g, cx, cy, r)` | 5-point star path |
| `drawStars(g, cx, cy, n, t)` | the 3-star result row (resultScreen calls it) |
| `resultScreen(g, W, H, title, sub, stars, rt)` | complete result overlay |
| `sprite(g, name, dir, frame, x, y, scale)` | draw a character, feet at (x, y) |
| `pickN(arr, n)` | n random distinct elements |
| `DIRS`, `ARROW_GLYPHS` | `['up','down','left','right']` and `↑ ↓ ← →` |

Characters for `sprite()`: `starry`, `mom`, `msbloom`, `coach`, `madame`,
`mrscoop`, `luna`, `mia`, `theo`, `paige`, `bram`, `honey`, `rosie`,
`sandy`, `fern`, `doodle` (dirs `down/up/left/right`, frames 0–2).
16×16 pixel icons via `SpriteLib.icon(name)` — `shells` rains
`icon('shell')`, `veggies` pops `icon('carrot')`.

House style: pastel scenes, chunky rounded shapes, `'#fff8ee'` panels,
headings in `'#b85c8a'`, body text `'#5a4a6a'`, gold accents `'#ffd95f'`.
Sounds via `AudioSys.sfx(...)`: `blip` (move), `star`/`pop` (success),
`deny` (gentle miss), `confirm`, `yay`, `fanfare`, `sparkle`, `whee`.

## Launching from the world

**A. An NPC hosts one game** (`src/entities.ts`) — talk to them, get a
play/chat choice:

```ts
{ id: 'sandy', ..., game: 'shells',
  gamePrompt: 'The tide washed in a WHOLE bunch of shells! Want to play?' }
```

**B. An NPC offers extra games besides talking/teaching** (`freeGames`):

```ts
{ id: 'msbloom', ..., teaches: 'school',
  freeGames: [{ game: 'math', label: 'Play Number Time' }],
  freeGamePrompt: 'Want to play a little number game?' }
```

**C. A tile launches it** (`interact()` in `src/main.ts`) — keep the
original simple interaction as a menu option:

```ts
if (ch === 'V') {
  UI.choose('Bubble Stand', 'A tray of bubble wands glitters in the sun.', [
    { label: 'Play Bubble Pop', value: 'game' },
    { label: 'Blow bubbles', value: 'blow' },
    { label: 'Not now', value: null },
  ], v => {
    if (v === 'game') startFunGame({ name: 'Bubble Stand' }, 'bubblepop');
    else if (v === 'blow') { /* the old interaction */ }
  });
  return;
}
```

Fun games pay stars **once per day** (state key `game_<id>` — ids are
forever, don't reuse them) and always cost `meta.energy` and
`meta.minutes`. Repeat plays are "just for fun".

**D. A scheduled class** is the heavyweight option: add a `CLASS_INFO`
entry in `src/main.ts` (label, skill, firstSticker, prompt, days 0=Mon…6=Sun,
from/to hours), a skill ladder in `Entities.SKILLS`, milestone stickers in
`endClass`, and a teacher NPC with `teaches: '<type>'`. Classes grant
skill XP and follow the weekly schedule; follow `art` end-to-end as the
reference.

## Current games

| id | label | launched by |
| --- | --- | --- |
| `school` | Letter Time | Ms. Bloom, weekday mornings (class) |
| `swim` | Splash Dash | Coach Finn, Tue/Thu (class) |
| `ballet` | Waltz Steps | Madame Plié, Mon/Wed/Fri (class) |
| `art` | Painting Time | Mr. Doodle, weekends (class) |
| `math` | Number Time | Ms. Bloom, `freeGames` |
| `stampstudio` | Stamp Studio | Mr. Doodle, `freeGames` |
| `shells` | Shell Splash | Sandy at the beach |
| `veggies` | Veggie Round-up | Farmer Fern |
| `bubblepop` | Bubble Pop | city bubble-stand tile |
| `balloonbop` | Balloon Bop | city balloon-cart tile |
| `hopscotch` | Hopscotch Hero | city hopscotch tile |

The single source of truth is the block of `api.register(...)` calls at
the bottom of `src/minigames.ts` — each game's label, economics, `keys`,
and description live there.

## Verifying

```sh
npm run check
```

- `tsc --noEmit` — your class compiles under strict mode.
- `dev/check.js` — registration metadata is complete; every `game`,
  `freeGames`, `startFunGame(...)`, and `teaches` reference resolves to a
  registered game.
- `dev/smoke.js` — boots the real bundle headlessly and plays **every
  registered game to its result screen**, mashing your declared `keys`.
  If your game can stall without input, this is what catches it.
