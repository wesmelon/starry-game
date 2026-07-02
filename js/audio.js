/* ======================================================================
   Starry ☆ Little Days — audio.js
   Procedural chiptune engine (Web Audio). All music is generated live:
   no audio files. Songs are note lists; a lookahead scheduler plays them.
   ====================================================================== */

const AudioSys = (() => {

  // ---------- note math ----------
  const SEMI = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };
  const freqCache = {};
  function freq(name) {
    if (freqCache[name] !== undefined) return freqCache[name];
    const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
    if (!m) return 0;
    const midi = SEMI[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return (freqCache[name] = 440 * Math.pow(2, (midi - 69) / 12));
  }

  // ---------- song-building helpers ----------
  const CHORDS = {
    C:  ['C','E','G'],   Dm: ['D','F','A'],   Em: ['E','G','B'],
    F:  ['F','A','C'],   G:  ['G','B','D'],   Am: ['A','C','E'],
    Bb: ['Bb','D','F'],  E:  ['E','G#','B'],  D:  ['D','F#','A'],
    A:  ['A','C#','E'],
  };
  // i-th chord tone above the root, in octave oct
  function chordNote(ch, i, oct) {
    const t = CHORDS[ch];
    const deg = i % t.length;
    const o = oct + Math.floor(i / t.length);
    return t[deg] + (SEMI[t[deg]] < SEMI[t[0]] ? o + 1 : o);
  }
  // eighth-note arpeggio track from a chord progression (one chord per bar)
  function arpNotes(prog, oct, pattern) {
    const out = [];
    for (const ch of prog) for (const i of pattern) out.push([chordNote(ch, i, oct), 0.5]);
    return out;
  }
  // simple root/fifth bass, one chord per 4/4 bar
  function bassNotes(prog, oct) {
    const out = [];
    for (const ch of prog) {
      out.push([chordNote(ch, 0, oct), 1], [chordNote(ch, 2, oct), 1],
               [chordNote(ch, 0, oct), 1], [chordNote(ch, 2, oct), 1]);
    }
    return out;
  }
  // off-beat "chick" chords (eighth rests on the beat), 4/4
  function offbeatNotes(prog, oct) {
    const out = [];
    for (const ch of prog) {
      const stack = chordNote(ch, 1, oct) + '+' + chordNote(ch, 2, oct);
      for (let b = 0; b < 4; b++) out.push(['R', 0.5], [stack, 0.5]);
    }
    return out;
  }
  // waltz oom-pah-pah accompaniment (3/4): bass beat 1, chords beats 2+3
  function waltzBass(prog, oct) {
    const out = [];
    for (const ch of prog) out.push([chordNote(ch, 0, oct), 1], ['R', 2]);
    return out;
  }
  function waltzChords(prog, oct) {
    const out = [];
    for (const ch of prog) {
      const stack = chordNote(ch, 1, oct) + '+' + chordNote(ch, 2, oct);
      out.push(['R', 1], [stack, 1], [stack, 1]);
    }
    return out;
  }
  function perc(pattern) { // string per beat-eighth: k kick, h hat, s snare, . rest
    const out = [];
    for (const c of pattern) out.push([c === '.' ? 'R' : c, 0.5]);
    return out;
  }

  /* ---------- THE SOUNDTRACK ----------
     tracks: wave (sine|square|triangle|sawtooth|perc), vol, env (sustain|pluck),
     decay (pluck tail seconds), notes [[name|'R'|'A4+C5', beats], ...]      */
  const SONGS = {};

  // ~ Sunny Meadow ~ (town, day) — bright and bouncy
  {
    const prog = ['C','Dm','Am','G','F','C','G','C'];
    SONGS.meadow = { bpm: 112, tracks: [
      { wave:'triangle', vol:0.20, env:'sustain', notes: [
        ['E5',.5],['G5',.5],['A5',.5],['G5',.5],['E5',1],['C5',1],
        ['D5',.5],['E5',.5],['F5',.5],['E5',.5],['D5',1],['A4',1],
        ['E5',.5],['G5',.5],['A5',.5],['B5',.5],['C6',1],['A5',1],
        ['G5',1.5],['E5',.5],['G5',2],
        ['A5',.5],['G5',.5],['F5',.5],['G5',.5],['A5',1],['C6',1],
        ['G5',.5],['E5',.5],['C5',.5],['E5',.5],['G5',1],['E5',1],
        ['F5',1],['D5',1],['B4',1],['G4',1],
        ['C5',2],['R',1],['G4',.5],['B4',.5],
      ]},
      { wave:'sine', vol:0.26, env:'sustain', notes: bassNotes(prog, 2) },
      { wave:'square', vol:0.045, env:'pluck', decay:0.18, notes: arpNotes(prog, 4, [0,1,2,1,0,1,2,1]) },
      { wave:'perc', vol:0.5, notes: perc('k.h.k.h.'.repeat(8)) },
    ]};
  }

  // ~ Pillow Stars ~ (home) — music-box lullaby in 3/4
  {
    const prog = ['F','Bb','F','C','Dm','Bb','C','F'];
    SONGS.home = { bpm: 80, tracks: [
      { wave:'triangle', vol:0.20, env:'pluck', decay:0.9, notes: [
        ['F5',1],['A5',1],['C6',1],   ['D6',2],['C6',1],
        ['A5',1],['F5',1],['A5',1],   ['G5',3],
        ['F5',1],['A5',1],['D6',1],   ['C6',2],['Bb5',1],
        ['A5',1],['G5',1],['E5',1],   ['F5',3],
      ]},
      { wave:'triangle', vol:0.10, env:'pluck', decay:0.8,
        notes: prog.flatMap(ch => [[chordNote(ch,0,4),1],[chordNote(ch,1,4),1],[chordNote(ch,2,4),1]]) },
      { wave:'sine', vol:0.16, env:'sustain', notes: prog.flatMap(ch => [[chordNote(ch,0,3),3]]) },
    ]};
  }

  // ~ Crayon March ~ (school) — playful and bouncy
  {
    const prog = ['G','C','G','D','G','C','D','G'];
    SONGS.school = { bpm: 124, tracks: [
      { wave:'triangle', vol:0.20, env:'pluck', decay:0.22, notes: [
        ['B4',.5],['D5',.5],['G5',.5],['D5',.5],['B4',.5],['D5',.5],['G5',1],
        ['C5',.5],['E5',.5],['G5',.5],['E5',.5],['C5',1],['E5',1],
        ['D5',.5],['G5',.5],['B5',.5],['G5',.5],['D5',1],['B4',1],
        ['A4',.5],['D5',.5],['F#5',.5],['A5',.5],['F#5',1],['D5',1],
        ['G5',.5],['F#5',.5],['G5',.5],['A5',.5],['B5',1],['G5',1],
        ['E5',.5],['G5',.5],['C6',.5],['G5',.5],['E5',1],['C5',1],
        ['D5',.5],['E5',.5],['F#5',.5],['G5',.5],['A5',1],['C6',1],
        ['B5',.5],['A5',.5],['G5',2],['R',.5],['D5',.5],
      ]},
      { wave:'sine', vol:0.26, env:'sustain', notes: bassNotes(prog, 2) },
      { wave:'square', vol:0.040, env:'pluck', decay:0.10, notes: offbeatNotes(prog, 3) },
      { wave:'perc', vol:0.45, notes: perc('k.h.khh.'.repeat(8)) },
    ]};
  }

  // ~ Bubble Float ~ (pool) — dreamy and watery
  {
    const prog = ['C','F','Am','G','C','F','G','C'];
    SONGS.pool = { bpm: 96, tracks: [
      { wave:'sine', vol:0.22, env:'sustain', notes: [
        ['E5',1],['G5',1],['A5',1.5],['G5',.5],
        ['E5',2],['D5',2],
        ['C5',1],['D5',1],['E5',1],['G5',1],
        ['D5',2],['R',2],
        ['A5',1],['G5',1],['E5',1.5],['D5',.5],
        ['C5',2],['D5',1],['E5',1],
        ['G5',1.5],['A5',.5],['G5',1],['D5',1],
        ['C5',3],['R',1],
      ]},
      { wave:'triangle', vol:0.075, env:'pluck', decay:0.5, notes: arpNotes(prog, 5, [0,2,1,2,0,2,1,2]) },
      { wave:'sine', vol:0.22, env:'sustain',
        notes: prog.flatMap(ch => [[chordNote(ch,0,2),2],[chordNote(ch,2,2),2]]) },
    ]};
  }

  // ~ Petite Étoile ~ (ballet studio) — a gentle waltz in A minor
  {
    const prog = ['Am','Am','F','E','Am','Am','Dm','E','C','G','Am','Em','F','Dm','E','Am'];
    SONGS.ballet = { bpm: 142, tracks: [
      { wave:'triangle', vol:0.20, env:'sustain', notes: [
        ['A4',1],['C5',1],['E5',1],    ['A5',2],['G5',1],
        ['F5',1],['E5',1],['D5',1],    ['E5',3],
        ['A4',1],['C5',1],['E5',1],    ['B5',2],['A5',1],
        ['G5',1],['F5',1],['E5',1],    ['E5',3],
        ['E5',1],['G5',1],['C6',1],    ['B5',2],['G5',1],
        ['A5',1],['E5',1],['C5',1],    ['B4',3],
        ['F5',1],['G5',1],['A5',1],    ['D6',2],['A5',1],
        ['B5',1],['G#5',1],['D5',1],   ['C5',1],['B4',1],['A4',1],
      ]},
      { wave:'sine', vol:0.26, env:'sustain', notes: waltzBass(prog, 2) },
      { wave:'triangle', vol:0.085, env:'pluck', decay:0.30, notes: waltzChords(prog, 4) },
    ]};
  }

  // ~ Moonlight Hum ~ (night, town after dark)
  SONGS.night = { bpm: 66, tracks: [
    { wave:'sine', vol:0.18, env:'sustain', notes: [
      ['E4',2],['G4',2], ['A4',3],['R',1], ['G4',2],['E4',2], ['D4',3],['R',1],
    ]},
    { wave:'sine', vol:0.12, env:'sustain', notes: [
      ['C3+G3',4], ['A2+E3',4], ['F3+C4',4], ['G2+D3',4],
    ]},
    { wave:'triangle', vol:0.07, env:'pluck', decay:1.2, notes: [
      ['R',3],['C6',1], ['R',4], ['R',3],['E6',1], ['R',4],
    ]},
  ]};

  // ~ Sprinkle Rag ~ (sweet shop) — short and cheery
  {
    const prog = ['C','F','G','C'];
    SONGS.shop = { bpm: 116, tracks: [
      { wave:'triangle', vol:0.20, env:'pluck', decay:0.25, notes: [
        ['G4',.5],['C5',.5],['E5',.5],['G5',.5],['E5',.5],['C5',.5],['E5',1],
        ['A5',.5],['F5',.5],['C5',.5],['F5',.5],['A5',1],['F5',1],
        ['G5',.5],['B4',.5],['D5',.5],['G5',.5],['F5',.5],['D5',.5],['B4',1],
        ['C5',.5],['E5',.5],['G5',.5],['C6',.5],['G5',2],
      ]},
      { wave:'sine', vol:0.24, env:'sustain', notes: bassNotes(prog, 2) },
      { wave:'square', vol:0.04, env:'pluck', decay:0.10, notes: offbeatNotes(prog, 3) },
    ]};
  }

  // ~ Downtown Skip ~ (city) — bright, busy and marching along
  {
    const prog = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D'];
    SONGS.city = { bpm: 120, tracks: [
      { wave:'triangle', vol:0.20, env:'pluck', decay:0.22, notes: [
        ['A4',.5],['D5',.5],['F#5',.5],['A5',.5],['F#5',1],['D5',1],
        ['B4',.5],['D5',.5],['G5',.5],['B5',.5],['G5',1],['D5',1],
        ['A4',.5],['D5',.5],['F#5',.5],['A5',.5],['E5',1],['C#5',1],
        ['D5',.5],['E5',.5],['F#5',.5],['G5',.5],['A5',1.5],['F#5',.5],
        ['G5',.5],['A5',.5],['B5',.5],['A5',.5],['G5',1],['E5',1],
        ['F#5',.5],['A5',.5],['D6',.5],['A5',.5],['F#5',1],['D5',1],
        ['E5',.5],['F#5',.5],['G5',.5],['A5',.5],['B5',1],['G5',1],
        ['A5',.5],['F#5',.5],['D5',2],['R',.5],['A4',.5],
      ]},
      { wave:'sine', vol:0.26, env:'sustain', notes: bassNotes(prog, 2) },
      { wave:'square', vol:0.04, env:'pluck', decay:0.10, notes: offbeatNotes(prog, 3) },
      { wave:'perc', vol:0.45, notes: perc('k.h.khh.'.repeat(8)) },
    ]};
  }

  // ---------- engine ----------
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let song = null, songName = '', trackState = [], musicOn = true;
  const LOOKAHEAD = 0.18, TICK_MS = 45;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 1; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    // shared noise buffer for percussion / splashes
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(tick, TICK_MS);
    if (songName) { const n = songName; songName = ''; play(n); }
  }

  function play(name) {
    if (songName === name) return;
    songName = name;
    song = SONGS[name] || null;
    if (!ctx || !song) return;
    const t = ctx.currentTime + 0.08;
    trackState = song.tracks.map(() => ({ idx: 0, time: t }));
  }
  function stop() { song = null; songName = ''; }

  function toggleMusic() {
    musicOn = !musicOn;
    if (musicBus) musicBus.gain.value = musicOn ? 1 : 0;
    return musicOn;
  }

  function tick() {
    if (!ctx || !song || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    const spb = 60 / song.bpm;
    for (let i = 0; i < song.tracks.length; i++) {
      const tr = song.tracks[i], st = trackState[i];
      if (!tr.notes.length) continue;
      let guard = 0;
      while (st.time < horizon && guard++ < 200) {
        const [name, beats] = tr.notes[st.idx];
        const dur = beats * spb;
        if (name !== 'R') {
          if (tr.wave === 'perc') percHit(name, st.time, tr.vol);
          else for (const n of name.split('+')) voice(tr, freq(n), st.time, dur);
        }
        st.time += dur;
        st.idx = (st.idx + 1) % tr.notes.length;
      }
    }
  }

  function voice(tr, f, t, dur) {
    if (!f) return;
    const o = ctx.createOscillator();
    o.type = tr.wave;
    o.frequency.value = f;
    const g = ctx.createGain();
    const v = tr.vol;
    g.gain.setValueAtTime(0.0001, t);
    if (tr.env === 'pluck') {
      const tail = tr.decay || 0.3;
      g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      o.start(t); o.stop(t + tail + 0.05);
    } else {
      const end = t + Math.max(dur - 0.02, 0.05);
      g.gain.linearRampToValueAtTime(v, t + 0.015);
      g.gain.setValueAtTime(v, Math.max(end - 0.04, t + 0.02));
      g.gain.linearRampToValueAtTime(0.0001, end);
      o.start(t); o.stop(end + 0.05);
    }
    o.connect(g); g.connect(musicBus);
  }

  function percHit(kind, t, vol) {
    if (kind === 'k') { // soft kick
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.10);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.14);
    } else { // h hat / s snare
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = kind === 'h' ? 6500 : 2200;
      const g = ctx.createGain();
      const len = kind === 'h' ? 0.03 : 0.08;
      g.gain.setValueAtTime(vol * (kind === 'h' ? 0.12 : 0.22), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(t); src.stop(t + len + 0.02);
    }
  }

  // ---------- sound effects ----------
  function tone(f, t, dur, wave, vol, bend) {
    const o = ctx.createOscillator(); o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(bend, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseHit(t, dur, vol, hp) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }
  function jingle(seq) { // [[note, startBeat, durBeat], ...] at 150bpm
    const t0 = ctx.currentTime + 0.02, spb = 60 / 150;
    for (const [n, s, d] of seq) tone(freq(n), t0 + s * spb, d * spb, 'triangle', 0.18);
  }

  const SFX = {
    blip()    { tone(620, ctx.currentTime, 0.05, 'square', 0.05); },
    select()  { tone(freq('E5'), ctx.currentTime, 0.07, 'triangle', 0.14); },
    confirm() { jingle([['C5',0,.5],['E5',.5,.5],['G5',1,.9]]); },
    deny()    { tone(180, ctx.currentTime, 0.18, 'square', 0.07, 130); },
    star()    { jingle([['B5',0,.4],['E6',.35,1.0]]); },
    sticker() { jingle([['C5',0,.4],['E5',.3,.4],['G5',.6,.4],['C6',.9,.4],['E6',1.2,1.4]]); },
    fanfare() { jingle([['C5',0,.5],['E5',.5,.5],['G5',1,.5],['C6',1.5,1],['G5',2.5,.5],['C6',3,2]]); },
    splash()  { noiseHit(ctx.currentTime, 0.30, 0.22, 900); tone(300, ctx.currentTime, 0.18, 'sine', 0.1, 80); },
    step()    { noiseHit(ctx.currentTime, 0.03, 0.035, 3000); },
    yay()     { jingle([['G5',0,.3],['C6',.25,.8]]); },
    pop()     { tone(900, ctx.currentTime, 0.06, 'sine', 0.15, 1400); },
    sleep()   { jingle([['C6',0,.7],['G5',.7,.7],['E5',1.4,.7],['C5',2.1,1.6]]); },
    munch()   { noiseHit(ctx.currentTime, 0.06, 0.12, 1500); tone(250, ctx.currentTime + .07, 0.07, 'triangle', 0.1); },
    whee()    { tone(400, ctx.currentTime, 0.35, 'sine', 0.15, 1100); },
    quack()   { tone(310, ctx.currentTime, 0.09, 'sawtooth', 0.08, 240);
                tone(290, ctx.currentTime + 0.12, 0.09, 'sawtooth', 0.08, 220); },
    bell()    { tone(freq('E6'), ctx.currentTime, 0.18, 'triangle', 0.16);
                tone(freq('E6'), ctx.currentTime + 0.15, 0.30, 'triangle', 0.16); },
    meow()    { tone(620, ctx.currentTime, 0.28, 'sawtooth', 0.05, 420); },
    woof()    { tone(190, ctx.currentTime, 0.10, 'square', 0.08, 120);
                tone(210, ctx.currentTime + 0.14, 0.10, 'square', 0.08, 130); },
    squeak()  { tone(1100, ctx.currentTime, 0.07, 'sine', 0.10, 1500);
                tone(1300, ctx.currentTime + 0.1, 0.07, 'sine', 0.10, 1700); },
    note(n)   { tone(freq(n), ctx.currentTime, 0.5, 'triangle', 0.18); },
    sparkle() { jingle([['B5',0,.25],['E6',.18,.25],['A6',.36,.55]]); },
    ride()    { jingle([['C5',0,.3],['E5',.25,.3],['G5',.5,.3],['E5',.75,.3],['C5',1,.55]]); },
  };

  function sfx(name, arg) { if (ctx && ctx.state === 'running' && SFX[name]) SFX[name](arg); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  return { init, play, stop, sfx, toggleMusic, resume,
           get songName() { return songName; }, _SONGS: SONGS };
})();
