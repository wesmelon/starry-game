---
name: add-music
description: Use when adding or changing music or sound effects in Starry Little Days — a new chiptune song for a map, a new sound effect, or tweaks to existing tracks. Covers the song data format, the track-sync invariant, accompaniment helpers, and sfx synthesis recipes.
---

# Add a song or sound effect

Everything is synthesized live in `src/audio.ts` — no audio files. A
lookahead scheduler loops each track independently, which is why the
sync invariant below exists.

## Song format

A song is `{ bpm, tracks: Track[] }` assigned to a key of `SONGS`
(grep `const SONGS` in `src/audio.ts`). Each track is
`{ wave, vol, env, decay?, notes }` where `notes` is `[noteName,
beats][]`:

- Note names: `'C5'`, `'F#4'`, `'Bb3'` — letter + optional `#`/`b` +
  octave. `'R'` = rest. Chord stacks join with `+`: `'C4+E4+G4'`.
  check.js validates against
  `/^([A-G][#b]?-?\d)(\+[A-G][#b]?-?\d)*$|^R$|^[khs]$/`.
- `wave`: `'sine'` (bass/pads), `'triangle'` (melodies), `'square'`
  (thin arps — keep vol ≤ 0.05, square is piercing), or `'perc'`
  (notes become `k`/`h`/`s`/`R` — kick, hat, snare).
- `env`: `'sustain'` holds for the note length; `'pluck'` + `decay`
  (seconds) gives music-box / staccato hits.

Accompaniment helpers build whole tracks from a chord progression.
Chord names come from `CHORDS`: `C Dm Em F G Am Bb E D A`.

| Helper | Output per chord | Beats per chord |
| --- | --- | --- |
| `bassNotes(prog, oct)` | root-fifth-root-fifth | 4 |
| `offbeatNotes(prog, oct)` | rest-chord ×4 ("chick" comping) | 4 |
| `arpNotes(prog, oct, pattern)` | one eighth-note per pattern step | `pattern.length / 2` |
| `waltzBass(prog, oct)` | oom (beat 1) + 2 rests | 3 |
| `waltzChords(prog, oct)` | rest-pah-pah | 3 |
| `perc(str)` | one eighth per char (`k h s .`) | `str.length / 2` |
| `chordNote(chord, degree, oct)` | a single note name | — |

## The sync invariant (check.js enforces it)

Tracks loop independently, so **every track's total beats must evenly
divide the longest track's total** or they drift apart. A 16-beat bass
under a 32-beat melody is fine (loops twice); a 12-beat one fails the
build. Compose in whole bars of one time signature and do the math —
as in this worked example:

```ts
// ~ Tidepool Tune ~ (a hypothetical beach song, 4/4)
{
  const prog = ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'];  // 8 chords
  SONGS.tidepool = { bpm: 104, tracks: [
    { wave: 'triangle', vol: 0.20, env: 'sustain', notes: [
      ['E5', 1], ['G5', 1], ['A5', 1.5], ['G5', .5],       // 4 beats
      ['F5', 1], ['A5', 1], ['C6', 2],                     // 4
      ['B5', .5], ['A5', .5], ['G5', 1], ['D5', 2],        // 4
      ['E5', 1], ['G5', 1], ['C5', 2],                     // 4
      ['A5', 1], ['C6', 1], ['B5', 1.5], ['A5', .5],       // 4
      ['F5', 1], ['A5', 1], ['G5', 2],                     // 4
      ['B4', .5], ['D5', .5], ['G5', 1], ['F5', 1], ['D5', 1], // 4
      ['C5', 3], ['R', 1],                                 // 4  → 32 total
    ]},
    { wave: 'sine', vol: 0.26, env: 'sustain', notes: bassNotes(prog, 2) },          // 8×4 = 32
    { wave: 'square', vol: 0.045, env: 'pluck', decay: 0.18,
      notes: arpNotes(prog, 4, [0, 1, 2, 1, 0, 1, 2, 1]) },                          // 8×(8/2) = 32
    { wave: 'perc', vol: 0.5, notes: perc('k.h.k.h.'.repeat(8)) },                   // 8×4 = 32
  ]};
}
```

Every track totals 32 beats (or a divisor of the max) → in sync forever.

## Wiring and conventions

- Reference the `SONGS` key as `music:` in a map's `DATA` entry
  (`src/maps.ts`). Interiors play their song always; **outdoor maps
  auto-switch to `night` from 7:30pm to 6:30am** (`hour() >= 19.5 ||
  hour() < 6.5` in `musicFor()`, `src/main.ts`).
- Volume palette (matches existing songs): melody ~0.20, sine bass
  0.24–0.26, square arps ≤ 0.05, triangle arps ≤ 0.085, perc 0.45–0.5.
- Mood: cheerful majors for daytime maps, gentle minors/waltzes for
  night, home, and ballet. Reuse an existing song for a new map unless
  the place has a genuinely new mood.
- New songs go in the README soundtrack table.

## Sound effects

Add to the `SFX` record in audio.ts using the primitives (use `now()`
for the current time — it asserts the AudioContext):

- `tone(freq, now(), duration, wave, vol, bendToFreqHz?)` — a beep;
  an upward bend reads happy, downward reads gentle-no.
- `jingle([[note, startBeat, durBeats], ...])` — a tiny 150 bpm
  arpeggio (how `confirm`, `sticker`, `fanfare` work).
- `noiseHit(now(), dur, vol, highpassHz)` — noise burst for splashes,
  steps, munches.

Worked example (a soft wind-chime for a new interaction):

```ts
chime()   { jingle([['A5', 0, .3], ['C6', .2, .3], ['E6', .4, .8]]); },
```

Then call `AudioSys.sfx('chime')` from game code. Keep effects short
(< 0.5s) and quiet (vol ≤ 0.2) — this game never startles. Two-part
animal voices bend two tones in sequence (see `moo()` / `neigh()`).

If a critter needs a new sfx as its voice, also extend the whitelist in
`dev/check.js` (grep `'meow', 'woof', 'squeak'`) or the build fails.

## Verify

`npm run check` validates note syntax, positive durations, and the sync
invariant for every song. Sound itself can only be judged by ear:
`npm run build`, open `index.html`, press N if music is muted, and
visit the map (or trigger the sfx) to listen.
