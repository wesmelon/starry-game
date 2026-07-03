# Roadmap

Future work, roughly ordered inside each theme. Before building
anything: `design-principles` skill for the quality bar, `architecture`
for the lay of the land. Check items off (or delete them) as they land,
and add new ideas here rather than in TODOs scattered through code.

## Unblockers (do these before the content they gate)

- [ ] **Sticker book paging or denser grid** — the book holds exactly
  48 stickers and we are at 48/48, which blocks *every* content idea
  that wants a reward sticker. Either page the book (B again / arrows
  to flip) or move to a 10-column grid with smaller cells. Touchpoints:
  `drawBook` (src/ui.ts) + the B-key nav `cols = 8` (src/main.ts).
- [ ] **Journal layout v2** — 5 friend rows max (4 used) and no room
  for a 5th skill. Two-column friends, or tabs (skills / friends /
  toys). Touchpoint: `drawJournal` (src/ui.ts).
- [ ] **Adopt the Unicode tile-char convention** — ASCII is exhausted
  (only `` ` `` and `\` left). Pick a starter set of single-code-unit
  chars (`¤ § ° · ¢ £`), document them in the add-area skill as they're
  claimed. (A full refactor of grids from strings to string-arrays
  would lift the one-char limit entirely — bigger job, only if Unicode
  proves painful.)

## Reach (who can play this)

- [ ] **Touch controls** — the audience is toddlers; tablets are the
  natural device. On-screen D-pad + a big E button, pointer events on
  the canvas. Everything is tap-based already (key repeat is off in
  minigames), so the input model ports cleanly.
- [ ] **Save profiles** — siblings share devices. 2–3 named save slots
  on the title screen; the save is one localStorage key today
  (`starry-little-days`), so slots are a key-suffix + title-screen UI.
- [ ] **Settings that persist** — music on/off and volume survive
  reload (today N-toggle resets every session).
- [ ] **Reduced-motion / colorblind pass** — the game is gentle
  already; audit the few flashing/bouncing bits and the color-only
  quiz questions (Painting Time) for a shapes fallback.

## Content (cheapest joy per line — see design-principles' ladder)

- [ ] **A fourth bus destination** — ideas that fit the tone: a snowy
  hill (sledding anim + snowman building), a night firefly garden
  (only reachable after 7pm — the day/night tint already exists), a
  little train ride. Follow `add-area`; needs a sticker slot (see
  Unblockers).
- [ ] **Weekly rhythm events** — Saturday market in the town square,
  Sunday story-circle at the library. The schedule machinery
  (`CLASS_INFO` days/hours) already supports time-windowed things.
- [ ] **Mom quests** — "bring Mom 3 flowers", "visit Daisy" — tiny
  fetch quests told through Mom's morning dialogue, state in `G.flags`.
  One new system, many content slots; design it once, carefully.
- [ ] **More critters + a critter album page** — the feeding system
  scales; a J-journal tab showing befriended critters would make the
  collection visible.
- [ ] **Per-map songs** — beach reuses the pool song and farm reuses
  the meadow; both deserve their own (see `add-music`, README
  soundtrack table).
- [ ] **Birthday** — every 30th day, party at home: balloons, cake,
  friends visit, one-off sticker. Uses only existing systems.

## Minigames

- [ ] **Roller Lab: share codes** — the map maker can serialize a
  custom maze to a short code (the grid is 13×7 chars) so kids can
  swap mazes with a grown-up's help.
- [ ] **Difficulty ramp audit** — several games got harder features
  (gravity, boxes); playtest as a 3-year-old would and confirm 1 star
  is still reachable by mashing (the smoke test proves *finishable*,
  not *fair* — see verifying-changes).
- [ ] **One rhythm game** — the audio engine can schedule precisely;
  a "clap along with the song" game at ballet would be a new mechanic
  that fits the tone.

## Engineering health

- [ ] **CI** — a GitHub Action running `npm run check` on push; the
  whole pipeline is headless already, so this is ~10 lines of YAML.
- [ ] **Re-run the skills cold-read** — the fresh-agent review of
  `.claude/skills/` was interrupted (session limits); a Sonnet-class
  agent should attempt the worked tasks using only the skills and file
  findings. The skills claim command-verified accuracy; keep them
  honest as the code moves.
- [ ] **Save versioning** — saves carry `{ v: 1 }` but nothing reads
  `v`. Write the migration switch before the first breaking save
  change is needed, not during.
- [ ] **Split main.ts** — at ~1400 lines it's the file every change
  touches. Candidate seams: interactions (`interact` + FLAVOR), the
  anim system, drawing. Only worth it when it starts hurting; keep the
  module-per-global convention if split.

## Explicitly not planned

- Combat, failure states, timers that punish, ads, accounts, network
  features. Scores/leaderboards beyond stars. Anything that makes a
  three-year-old cry.
