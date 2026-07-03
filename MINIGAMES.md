# Minigame Developer README

This project keeps minigames in `src/minigames.ts` behind the `Minigames`
registry. Callers still use `Minigames.school(done)` or
`Minigames.create('school', done)`, but each game is implemented as a class.

## Core lifecycle

Every minigame instance must expose:

- `key(action)`: receives normalized actions such as `left`, `right`, `up`,
  `down`, and `action`.
- `update(dt)`: advances game state in seconds.
- `draw(ctx)`: renders a full-screen canvas scene.
- `done(stars, perfect)`: callback supplied by the launcher. Call it only
  after the result screen accepts `action`.

Most games should extend `BaseMinigame`:

- `phase` starts as `intro`, moves to `play`, then `result`.
- `start()` handles the transition out of intro.
- `handleInput(action)` handles play input.
- `updatePlay(dt)` advances play-only state.
- `complete(stars, perfect)` enters result mode and plays the reward sound.

Quiz-style games can extend `ChoiceQuizMinigame`, which already handles:

- three-card left/right selection
- feedback timing
- score-based stars
- intro/result drawing hooks

## Registering a game

Add the class in `src/minigames.ts`, then register it near the bottom:

```js
api.register('bubblepop', BubblePopMinigame);
```

Registration adds both:

- `Minigames.create('bubblepop', done)`
- `Minigames.bubblepop(done)`

## Launching from the world

Scheduled classes use `CLASS_INFO` in `src/main.ts` and NPCs with `teaches`.
Free-play minigames use `startFunGame(actor, gameId)` and `FUN_GAME_INFO`.

Add reward metadata in `src/main.ts`:

```js
bubblepop: { label: 'Bubble Pop', energy: 8, minutes: 25, minEnergy: 10 },
```

Then launch it from an NPC, a `freeGames` entry, or a tile interaction:

```js
startFunGame({ name: 'Bubble Stand' }, 'bubblepop');
```

Daily reward state is keyed as `game_<gameId>`, so pick stable ids and do not
reuse ids for unrelated games.

## Current games

- `school`: Letter Time, Ms. Bloom's scheduled school class.
- `math`: Number Time, an always-available school math practice game.
- `swim`: Splash Dash, Coach Finn's swim class.
- `ballet`: Waltz Steps, Madame Plie's ballet class.
- `art`: Painting Time, Mr. Doodle's weekend art class.
- `shells`: Shell Splash at Shelly Shores.
- `veggies`: Veggie Round-up at Sunny Hooves Farm.
- `bubblepop`: Bubble Pop at the city bubble stand.
- `balloonbop`: Balloon Bop at the city balloon cart.
- `hopscotch`: Hopscotch Hero on the city hopscotch squares.

## Testing

Update `MG_KEYS` in `dev/smoke.js` for every registered minigame. The smoke
test starts each game, mashes the listed inputs, draws every frame, and expects
the result screen to finish.

Run:

```sh
npm run check   # typecheck + bundle + data checks + smoke test
```

## Design notes

- Keep games short: roughly 20-40 in-game minutes and under a minute of real
  play.
- Always award at least one star.
- Make random games timeout or advance on missed input so smoke tests and young
  players cannot get stuck.
- Prefer existing helpers (`panel`, `label`, `sprite`, `resultScreen`,
  `starPath`) before adding new drawing utilities.
- For tile-launched games, preserve the old simple interaction as a menu option
  when it already exists.
