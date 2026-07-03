# Starry ☆ Little Days — agent guide

A cozy life-sim about a toddler named Starry. Strict TypeScript in
`src/`, rendered on one 1248×768 canvas; all pixel art and music are
generated in code. No runtime dependencies. esbuild bundles
`src/main.ts` → `dist/game.js` (generated, gitignored) — the only
script `index.html` loads.

## Commands

```sh
npm run build     # tsc --noEmit + esbuild bundle  (dist/ is stale until you run this)
npm run watch     # rebuild on save; refresh the browser to see changes
npm run check     # build + dev/check.js (data) + dev/smoke.js (headless playthrough)
```

**A change is done only when `npm run check` is green.** The smoke test
boots the real bundle with a stubbed canvas and plays every registered
minigame to completion. In a browser, `window.Starry.*` exposes all
modules for console debugging.

## Iron rules (violating these breaks players or the build)

- **Kindness invariants** — the player is a toddler. Always ≥1 star, no
  fail states, misses get a gentle chime and encouraging words, timeouts
  move the player forward, every state has an exit. Key repeat is OFF in
  minigames: design for taps, never holds.
- **Save keys are forever.** NPC ids, sticker ids, `funReward`/game ids
  live in `localStorage` saves — never rename or reuse. Any new field on
  `G` goes in BOTH `freshG()` and the old-save defaults in `load()`
  (src/main.ts).
- **One character = one tile.** Map tiles are single string characters
  registered in six places (see the `add-area` skill). Printable ASCII
  is exhausted — only `` ` `` and `\` remain. Use single-code-unit
  Unicode (`'¤'.length === 1`); never emoji (`length === 2` corrupts
  grids).
- **Capacity cliffs**: the sticker book holds exactly 48 stickers
  (currently 48/48 — the 49th needs a `drawBook` layout change); the
  journal fits 5 friend rows (4 used).
- **Never edit `dev/` to onboard new content** — the validators discover
  minigames, tiles, NPCs, and stickers from the registries automatically.

## Where the knowledge lives

Skills in `.claude/skills/` are the maintainer's handbook; every claim
in them is verified against this codebase. Route by task:

| Task | Skill |
| --- | --- |
| First non-trivial task / "where is X?" | `architecture` |
| Something is broken / check fails | `debugging` |
| "Am I done?" / before committing | `verifying-changes` |
| Designing any new feature or content | `design-principles` |
| New minigame or launcher | `add-minigame` (+ `MINIGAMES.md` at repo root) |
| New map, interior, or tile type | `add-area` |
| New NPC or feedable critter | `add-character` |
| New E-interaction, sticker, animation, shop item | `add-activity` |
| New song or sound effect | `add-music` |
| Sprite/tile/icon art | `pixel-art` |

If you change a convention, update the matching skill in the same
commit — the skills are load-bearing documentation.

## Working conventions

- The human owner commits to `main` concurrently — run `git status` and
  `git log --oneline -5` before assuming tree state, and never revert
  changes you didn't make.
- Small fixes: commit directly on `main`. Large features: a branch,
  merged with `--no-ff`, branch deleted after. Subjects are short and
  imperative; bodies are concrete bullets.
- `README.md` is player-facing — update it when gameplay changes,
  not for internals.
