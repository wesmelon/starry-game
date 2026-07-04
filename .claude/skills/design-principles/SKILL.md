---
name: design-principles
description: Use when designing, proposing, or evaluating anything new for Starry Little Days — a feature idea, a minigame concept, new dialogue, new rewards, or balance changes. Also use when reviewing content for tone. This is the project's quality bar; check ideas against it before writing code.
---

# Design principles — the quality bar

The player is a toddler (or someone playing like one). Every rule below
follows from that. The project motto: *everyone gets at least one star —
this is a kind game.*

## Kindness invariants (non-negotiable)

- **No fail states.** Nothing ends badly: minigames award 1–3 stars and
  `complete()` clamps to a 1-star minimum (`Math.max(1, Math.min(3,
  stars))` in `BaseMinigame`, `src/minigames/shared.ts`). There is no game-over, no losing health,
  no scolding.
- **Misses are gentle.** A wrong answer gets the soft `deny` chime (a
  quiet 180 Hz downward blip, `deny()` in `src/audio.ts`) and
  encouraging words — see Madame Plié: "A wobble is just a twirl that is
  still learning." Never punish beyond that.
- **Time moves the player forward.** Prompts that expire count as a miss
  and advance; nothing waits forever hoping the player figures it out.
- **Helpers genuinely help.** If assistance appears, it must do what it
  says. The pattern: Roller Lab's park helper (grep `park helper` in
  `src/minigames/rollerlab.ts`) rolls the marble to the next maze after 45s —
  it does not end the game or fake a reward.
- **Every state has an exit.** The player must always be able to leave —
  a menu Esc, a timeout, or a completion path. Audit each phase of a new
  feature for "how does a button-mashing 3-year-old get out of here?"
  Roller Lab's Esc-during-play now opens a pause menu (resume / restart
  the current floor or test / leave) instead of silently discarding
  progress or trapping the player in its Map Maker edit↔test loop — a
  reusable pattern for any minigame with a stuck-state risk (pushable
  boxes, player-authored content, multi-step state).

## Interaction rules

- Overworld: arrows/WASD walk (held keys fine), **E does everything
  else** (talk, poke, feed, ride). Don't invent new verbs or keys.
- Minigames: **key repeat is disabled** (`e.repeat` check in `onKey`,
  `src/main.ts`) — design for discrete taps, never hold-to-act.
- One decision at a time: `UI.choose` menus of 2–4 options, always
  including a decline like "Not yet" / "Just looking!".
- Interactables must advertise themselves: the floating E-hint bubble
  (grep `bvyQdgwh` in `src/main.ts`) or a hungry thought-bubble.

## Writing voice

Study `talk:` arrays in `src/entities.ts` and `UI.say` lines in
`src/main.ts` before writing dialogue. The rules they embody:

- Starry's own lines describe her in third person, present tense:
  *"Starry stacks the blocks... taller... taller... CRASH! Hee hee."*
- Short sentences. Exclamations welcome. Sound words everywhere:
  *plink plonk*, *boing*, *whoosh*, *moo*.
- Facts are tiny and delightful: *"Octopuses have THREE hearts. Wow!"*
- Encouragement, never sarcasm, irony, menace, or adult humor.
- Each NPC has one flavor: Coach Finn speaks in coach-isms, Madame Plié
  in gentle French-tinted metaphors, Luna in proud kid-facts. Match the
  existing voice when extending a character.
- Multi-line `talk:` arrays rotate one line per day — write each line to
  stand alone.

## Visual language

Pastels, chunky rounded shapes, soft shadows. Canonical UI colors
(verified in `src/minigames/shared.ts` / `src/ui.ts`):

| Use | Hex |
| --- | --- |
| Panel cream | `#fff8ee` |
| Heading pink | `#b85c8a` |
| Body text plum | `#5a4a6a` |
| Gold star accent | `#ffd95f` |

World palette and sprite rules live in the `pixel-art` skill.

## Reward economy (verified against the code)

Earning (per day):

| Source | Stars | Notes |
| --- | --- | --- |
| Class (school/swim/ballet/art) | 1–3 +1 perfect | costs 20 energy (`endClass`) |
| Fun minigame | 1–3 +1 perfect | **first play per day only** (`endFunGame`, `G.fun['game_<id>']`); costs `meta.energy` (0–12) |
| Little activity (`funReward`) | usually 1 | first time per day; carousel & pony pay 2 |
| Free snacks (apple, carrot) | 0 | +15 energy instead |

Spending (`SHOP_ITEMS` in `src/entities.ts`): snacks 2–5★ restore
25–60 energy; Ducky Snacks / Critter Treats 2★; toys 5–8★ (bought
once). Naps restore +40 energy; every morning resets to 100.

**Rule of thumb:** an honest day earns roughly 10–15★. Price new
one-off purchases at 2–8★ (a big toy ≈ one day of play), new repeatable
rewards at 1★ (2★ only for headline rides), and never gate core fun
behind stars — stars buy *extras*.

## Prefer content over systems

Cheapest-to-safest ways to add delight, in order: new dialogue lines →
new sticker + activity → new critter → new minigame in an existing
launcher → new building/area → **new system** (inventory, quests,
multiplayer... almost never). A new system is justified only when it
enables a whole category of content the existing registries cannot
express — and it must come with validator coverage in `dev/check.js`.

Mind the capacity cliffs before adding content: the sticker book is
full at exactly 48 (see `add-activity`), the journal fits 5 friends,
and free tile characters are scarce (see `add-area`).

## Before you ship a feature — checklist

1. Can a toddler fail or get stuck? (Must be no — check every phase.)
2. Does every miss respond with `deny` + kind words?
3. Is it playable with arrows + E, tap-only in minigames?
4. Does the dialogue pass the voice rules above, read-aloud test?
5. Do rewards fit the economy table (once-per-day gating, 1–2★)?
6. Do visuals use the canonical palette?
7. Does `npm run check` pass, and does the smoke test still finish
   every minigame?
8. Is it documented (README player-facing, MINIGAMES.md if a game)?
