---
name: add-music
description: Use when adding or changing music or sound effects in Starry Little Days — a new chiptune song for a map, a new sfx, or tweaks to existing tracks. Covers the song data format, the track-sync invariant, and sfx synthesis recipes.
---

# Add a song or sound effect

Everything is synthesized live in `src/audio.ts` — no audio files.

## Songs

A song is `{ bpm, tracks: Track[] }` in `SONGS`; each track is
`{ wave, vol, env, decay?, notes }` where `notes` is a list of
`[noteName, beats]`:

- Note names: `'C5'`, `'F#4'`, `'Bb3'`… — letter + optional accidental
  + octave. `'R'` = rest. Chord stacks join with `+`: `'C4+E4+G4'`.
- `wave`: `sine` (bass/pads), `triangle` (melody), `square` (thin arps,
  keep vol ≤ 0.05), or `perc` (notes are then `k`/`h`/`s`/`R` — kick,
  hat, snare via the `perc('k.h.k.h.')` helper).
- `env`: `'sustain'` holds the note; `'pluck'` + `decay` seconds gives
  music-box/staccato hits.

Accompaniment helpers build tracks from a chord progression (names from
`CHORDS`: C Dm Em F G Am Bb E D A): `bassNotes(prog, octave)`,
`arpNotes(prog, octave, pattern)`, `offbeatNotes(prog, octave)`,
`waltzBass`/`waltzChords` (3/4 time), `chordNote(chord, degree, octave)`.

**The sync invariant (check.js enforces):** every track's total beat
count must evenly divide the longest track's total. Loop lengths of
8 bars melody / 8 bars bass / 8 bars arp work; a 3-bar track against a
32-beat melody fails the build. Compose in whole bars of the same time
signature.

Wire the song: reference its `SONGS` key as `music:` in a map's `DATA`
entry (`src/maps.ts`). Outdoor maps switch to `night` after ~7:30pm
automatically (`musicFor()` in main.ts). If you add a song, list it in
the README soundtrack table.

Keep the palette: melodies ~vol 0.20, bass 0.24–0.26, arps ≤ 0.08,
perc 0.45–0.5. Cheerful majors for day maps, gentle minors for
night/lullaby.

## Sound effects

Add to the `SFX` object (audio.ts) using the primitives:

- `tone(freq, now(), duration, wave, vol, bendToFreq?)` — a beep with
  optional pitch bend (rising bend = happy, falling = gentle no).
- `jingle([[note, startBeat, durBeats], ...])` — tiny arpeggio at
  150bpm (used by `confirm`, `sticker`, `fanfare`).
- `noiseHit(now(), dur, vol, highpassHz)` — splash/step textures.

Use `now()` for the current time inside SFX bodies. Call from game code
with `AudioSys.sfx('name')`. Keep effects short (< 0.5s) and quiet
(vol ≤ 0.2); this game never startles.

If a critter needs the new sfx as its voice, also extend the whitelist
in `dev/check.js` (`['meow', 'woof', 'squeak']`).

Finish with `npm run check` (validates note syntax, durations, and the
sync invariant). Sound itself can only be judged in a browser —
`npm run build`, open `index.html`, press N if music is muted.
