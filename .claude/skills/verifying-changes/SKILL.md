---
name: verifying-changes
description: Use when deciding whether a change to Starry Little Days is finished — before committing, when asked to validate or test work, or when reviewing what the automated checks do and do not cover. Includes per-change-type playtest checklists, save-compatibility testing, documentation duties, and commit conventions.
---

# Verifying a change

## Definition of done

1. `npm run check` is green — typecheck, bundle, `dev/check.js` data
   validation, `dev/smoke.js` behavioral run. Non-negotiable; every
   commit on main passes it (that's what keeps `git bisect` usable).
2. The things the validators **cannot** see have been judged by a
   human or by you in a real browser:
   - visual look (a tile can be registered everywhere and still be ugly
     or unreadable at 48px)
   - audio (note data validates; whether it sounds pleasant doesn't)
   - dialogue tone and reading level (see `design-principles`)
   - difficulty and economy balance (star costs vs. earnings)
   - animation feel (timing/easing of play cutscenes)
3. Documentation updated (below).

To playtest: `npm run build` (or `watch`), open `index.html`. New game
(fresh save) is one keypress from the title screen; music toggles
with N.

## Playtest checklist by change type

**New map / area**
- Ride the bus there AND back (both landings must feel right, not just
  be walkable).
- Press M on the new map — colors legible, name tags present.
- Walk the full border; try to escape through decorations.
- Press E on everything you added: hint bubble appears, flavor text
  reads well.
- Wait for 7:30pm once — outdoor maps must look right under night tint.

**New minigame**
- Win once and lose (or flub) once; both result screens read kindly.
- Confirm the star toast pays out, then play again the same day and
  confirm the "just for fun now" message instead of double pay.
- Check energy cost and time advance feel right (`Minigames.meta`).
- Mash irrelevant keys mid-game — nothing should crash or soft-lock.

**New NPC / critter**
- Talk at morning, midday, evening (schedules vary by `gv.hour`/`dow`).
- If friend: heart toast fires once per day; journal row renders.
- If shop: buy something, be too poor for something.
- Critter: thought bubble when hungry; feed with and without treats.

**New save state (any new field on `G`)**
- Simulate an old save: in the browser console run
  `s = JSON.parse(localStorage['starry-little-days'])`, delete your new
  field from `s.G`, `localStorage['starry-little-days'] =
  JSON.stringify(s)`, reload, Continue. The game must behave as if the
  field had its default.
- Also re-read `freshG()` and `load()` in main.ts side by side — every
  field present in one must be defaulted in the other.

**Balance / economy changes** — play one full day start to sleep; check
the day-summary lines and that stars earned ≈ stars spendable.

## Documentation duty

| You changed | Update |
| --- | --- |
| anything a player can see or do | `README.md` (it is the player-facing manual — keep its voice) |
| minigames | `MINIGAMES.md` (Current games table + anything structural) |
| a convention, registry, or limit | the relevant skill in `.claude/skills/` — the skills are maintained docs, not one-off notes |

## Committing

Match the conventions visible in `git log`:
- Subject: short, imperative, specific ("Polish Roller Lab: kinder
  helper, guaranteed exits, editor touches" — not "fixes" or "updates").
- Body: concrete bullets of what changed and why it matters; mention
  bugs fixed with their symptom.
- Feature work of any size goes on a branch, merged with
  `git merge --no-ff <branch> -m "Merge branch '<branch>': <summary>"`,
  then the branch is deleted. Small focused fixes commit directly to
  main. Never commit with a red `npm run check`.
- Do not commit `dist/` or `node_modules/` (gitignored) — the bundle is
  a build product.

## Reviewing someone else's change

Run `npm run check` first, then read the diff against the registries
table in the `architecture` skill: most defects here are a missing
registry touchpoint, a save-shape miss, or a kindness-invariant
violation (`design-principles`), in that order of likelihood.
