/* Headless smoke test: boots the whole game with a stubbed canvas + audio,
   drives the title screen into a new game, mashes keys for a while, runs
   every minigame to completion, and draws every overlay for every map.
   Catches runtime errors that the data checks in check.js can't see.
   Run: node dev/smoke.js                                                */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function check(ok, msg) {
  if (!ok) { failures++; console.log('  FAIL  ' + msg); }
}

// ---- a canvas just real enough to draw into ----
const noop = () => {};
function fakeCtx(canvas) {
  return new Proxy({ canvas }, {
    get(t, k) {
      if (k === 'canvas') return t.canvas;
      if (k === 'measureText') return () => ({ width: 42 });
      if (k === 'createLinearGradient') return () => ({ addColorStop: noop });
      return noop;
    },
    set() { return true; },
  });
}
function fakeCanvas(w = 300, h = 150) {
  const c = { width: w, height: h };
  c.getContext = () => fakeCtx(c);
  return c;
}

// ---- window / document / storage stubs ----
const listeners = {};
const store = {};
let rafCb = null;
const windowStub = {
  addEventListener: (ev, fn) => { listeners[ev] = fn; },
};
const sandbox = {
  console, setInterval: () => 0, setTimeout: (fn) => { fn(); return 0; },
  performance: { now: () => simTime * 1000 },
  window: windowStub,
  document: {
    createElement: () => fakeCanvas(),
    getElementById: () => fakeCanvas(1248, 768),
  },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  },
  requestAnimationFrame: (cb) => { rafCb = cb; },
};
sandbox.globalThis = sandbox;
windowStub.requestAnimationFrame = sandbox.requestAnimationFrame;
let simTime = 0;
vm.createContext(sandbox);

const root = path.join(__dirname, '..');
for (const f of ['js/audio.js', 'js/sprites.js', 'js/maps.js', 'js/entities.js', 'js/minigames.js', 'js/ui.js', 'js/main.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  try { vm.runInContext(src, sandbox, { filename: f }); }
  catch (e) { failures++; console.log('  FAIL  ' + f + ' threw at load: ' + e.message); }
}
const { Maps, Entities, SpriteLib, AudioSys, Minigames, UI, Game } =
  vm.runInContext('({ Maps, Entities, SpriteLib, AudioSys, Minigames, UI, Game })', sandbox);

// no real audio in a stub world
for (const k of ['init', 'play', 'stop', 'sfx', 'resume', 'toggleMusic']) AudioSys[k] = noop;

// ---- sprites build & registries ----
console.log('build:');
try { SpriteLib.build(); } catch (e) { failures++; console.log('  FAIL  SpriteLib.build threw: ' + e.message); }
Maps.init();
for (const [name, m] of Object.entries(Maps.DATA)) {
  for (const row of m.rows) for (const ch of row)
    check(!!SpriteLib.tile(ch, 0) && !!SpriteLib.tile(ch, 1), `tile "${ch}" (${name}) built`);
}
for (const name of Object.keys(SpriteLib.CHARDEFS))
  for (const dir of ['down', 'up', 'left', 'right'])
    check(!!SpriteLib.chr(name, dir, 0), `char sprite ${name}/${dir} built`);
for (const n of Entities.NPCS) check(!!SpriteLib.chr(n.sprite, 'down', 0), `NPC ${n.id} has sprite "${n.sprite}"`);
for (const a of Entities.ANIMALS)
  check(!!SpriteLib.animal(a.kind, 'left') && !!SpriteLib.animal(a.kind, 'right'), `animal kind "${a.kind}" built`);
for (const s of Entities.STICKERS) check(!!SpriteLib.icon(s.icon), `sticker ${s.id} icon "${s.icon}" built`);

// ---- overlays for every map ----
console.log('overlays:');
const g = fakeCtx(fakeCanvas(1248, 768));
for (const name of Object.keys(Maps.DATA)) {
  try { UI.drawMap(g, { map: name, px: 2.5, py: 2.5, dir: 'down', t: 1, npcs: [{ x: 3, y: 3, friend: true }] }); }
  catch (e) { failures++; console.log(`  FAIL  drawMap(${name}) threw: ` + e.message); }
}
try {
  UI.drawBook(g, { stickers: Entities.STICKERS.map(s => s.id) }, Entities.STICKERS.length - 1);
  UI.drawJournal(g, { day: 3, dow: 5, stars: 7, skills: { letters: 3, swim: 1, ballet: 0, art: 2 }, hearts: { luna: 40 } });
  UI.drawHUD(g, { day: 1, dow: 0, tmin: 9 * 60, stars: 2, energy: 80, treats: 1, duckFood: 2 });
} catch (e) { failures++; console.log('  FAIL  overlay draw threw: ' + e.message); }

// ---- every minigame, played to the end with mashy toddler input ----
console.log('minigames:');
const MG_KEYS = {
  school: ['left', 'right', 'action'], math: ['left', 'right', 'action'], art: ['left', 'right', 'action'],
  swim: ['left', 'right'], ballet: ['up', 'down', 'left', 'right'],
  shells: ['left', 'right'], veggies: ['up', 'down', 'left', 'right'],
  bubblepop: ['left', 'right', 'action'], balloonbop: ['up', 'down', 'left', 'right'],
  hopscotch: ['up', 'down', 'left', 'right'],
};
for (const name of Object.keys(MG_KEYS)) {
  let finished = false, err = null;
  try {
    const mg = Minigames[name]((stars, perfect) => {
      finished = true;
      check(stars >= 1 && stars <= 3, `${name} awards 1-3 stars (got ${stars})`);
      check(typeof perfect === 'boolean' || perfect === undefined || perfect === false || perfect === true,
        `${name} perfect flag ok`);
    });
    mg.key('action');                       // leave the intro
    const keys = MG_KEYS[name];
    for (let i = 0; i < 12000 && !finished; i++) {
      mg.update(0.05);
      mg.draw(g);
      if (i % 7 === 0) mg.key(keys[i % keys.length]);
      if (i % 9 === 0) mg.key(keys[Math.floor(Math.random() * keys.length)]);
      if (i % 31 === 0) mg.key('action');
    }
  } catch (e) { err = e; }
  check(!err, `${name} ran without throwing` + (err ? ': ' + err.message : ''));
  check(finished, `${name} reaches its result screen and finishes`);
}

// ---- boot the real game loop and mash keys for a simulated hour ----
console.log('game loop:');
try {
  listeners.load();                          // window 'load' -> Game.init()
  const frame = () => { const cb = rafCb; rafCb = null; simTime += 1 / 30; cb(simTime * 1000); };
  const key = (code) => listeners.keydown({ code, repeat: false, preventDefault: noop });
  const keyUp = (code) => listeners.keyup && listeners.keyup({ code, repeat: false, preventDefault: noop });
  frame();
  key('Enter'); frame();                     // wake the title
  key('Enter');                              // New Game
  for (let i = 0; i < 90; i++) frame();      // fade + Mom's welcome
  for (let i = 0; i < 10; i++) { key('Enter'); frame(); frame(); }   // skim dialogue
  const codes = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  for (let i = 0; i < 3600; i++) {           // ~2 game hours of toddling
    const c = codes[Math.floor(Math.random() * 4)];
    key(c);
    frame(); frame();
    keyUp(c);
    if (i % 11 === 0) { key('KeyE'); frame(); key('KeyE'); frame(); }
    if (i % 149 === 0) { key('KeyM'); frame(); key('KeyM'); frame(); }
    if (i % 151 === 0) { key('KeyB'); frame(); key('KeyB'); frame(); }
    if (i % 153 === 0) { key('KeyJ'); frame(); key('KeyJ'); frame(); }
  }
} catch (e) { failures++; console.log('  FAIL  game loop threw: ' + e.message + '\n' + e.stack.split('\n')[1]); }

console.log(failures === 0 ? '\nSmoke test passed ✓' : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
