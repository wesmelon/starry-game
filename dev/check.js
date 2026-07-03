/* Node-side sanity checks for the game data (no browser needed).
   Reads the built bundle — run `npm run build` first (or `npm run check`,
   which builds and then runs this).
   Run: node dev/check.js                                          */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
// a window/document just real enough for the bundle to load; the game
// only touches the DOM from Game.init(), which we never call here
const windowStub = { addEventListener: () => {} };
const sandbox = {
  console, setInterval: () => 0, setTimeout: () => 0, performance: { now: () => 0 },
  window: windowStub, document: {}, localStorage: undefined,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let failures = 0;
function check(ok, msg) {
  if (!ok) { failures++; console.log('  FAIL  ' + msg); }
}

const bundlePath = path.join(root, 'dist/game.js');
if (!fs.existsSync(bundlePath)) {
  console.log('dist/game.js not found — run `npm run build` first.');
  process.exit(1);
}
try { vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), sandbox, { filename: 'dist/game.js' }); }
catch (e) { console.log('  FAIL  bundle threw at load: ' + e.message); process.exit(1); }

// the bundle exposes its modules on window.Starry for dev tooling
const { Maps, Entities, SpriteLib, AudioSys, Minigames } = windowStub.Starry;

// ---- maps ----
console.log('maps:');
const tileChars = new Set();
for (const [name, m] of Object.entries(Maps.DATA)) {
  const w = m.rows[0].length;
  m.rows.forEach((r, i) => {
    check(r.length === w, `${name} row ${i} has length ${r.length}, expected ${w}`);
    for (const ch of r) tileChars.add(ch);
  });
  check(typeof m.base === 'string', `${name} has a base tile`);
}
check(Maps.DATA.town.rows.length === 46 && Maps.DATA.town.rows[0].length === 64, 'town is 64x46');
check(!!Maps.DATA.city, 'city map exists');

// every used tile char has a painter (checked against the sprites PAINT registry indirectly)
const spritesSrc = fs.readFileSync(path.join(root, 'src/sprites.ts'), 'utf8');
for (const ch of tileChars) {
  check(SpriteLib.hasTile(ch), `tile char "${ch}" has a painter`);
}

// warps resolve and land on walkable tiles
Maps.init();
for (const [door, { outer, inner }] of Object.entries(Maps.DOORS)) {
  const d = Maps.find(outer, door);
  check(!!d, `${outer} has door ${door}`);
  if (!d) continue;
  const w = Maps.warpAt(outer, d.x, d.y);
  check(!!w, `door ${door} warps somewhere`);
  if (w) {
    check(w.map === inner, `door ${door} opens ${inner}`);
    check(!Maps.isSolid(w.map, w.x, w.y), `door ${door} spawn (${w.map} ${w.x},${w.y}) is walkable`);
    const mat = Maps.find(w.map, 'x');
    const back = Maps.warpAt(w.map, mat.x, mat.y);
    check(!!back && back.map === outer, `${inner} mat warps back to ${outer}`);
    if (back) check(!Maps.isSolid(outer, back.x, back.y), `${inner} exit spawn (${back.x},${back.y}) is walkable`);
  }
  // the tile directly below each door must be walkable so the door is reachable
  check(!Maps.isSolid(outer, d.x, d.y + 1), `tile below door ${door} is walkable`);
}
// bus-stop links resolve both ways and land on walkable tiles
for (const L of Maps.LINKS) {
  const a = Maps.find(L.a.map, L.a.ch), b = Maps.find(L.b.map, L.b.ch);
  check(!!a && !!b, `link ${L.a.map}<->${L.b.map} endpoints exist`);
  if (a && b) {
    const wa = Maps.warpAt(L.a.map, a.x, a.y), wb = Maps.warpAt(L.b.map, b.x, b.y);
    check(!!wa && wa.map === L.b.map && !Maps.isSolid(wa.map, wa.x, wa.y),
      `${L.a.map} bus stop lands walkable in ${L.b.map}`);
    check(!!wb && wb.map === L.a.map && !Maps.isSolid(wb.map, wb.x, wb.y),
      `${L.b.map} bus stop lands walkable in ${L.a.map}`);
  }
}

// ---- npcs ----
console.log('npcs:');
const hours = [7, 9, 12, 14, 17, 20];
for (const n of Entities.NPCS) {
  for (const day of [1, 2, 6, 7]) {
    for (const h of hours) {
      const loc = n.where({ day, dow: (day - 1) % 7, hour: h });
      check(!!Maps.DATA[loc.map], `${n.id} day${day} ${h}h: map ${loc.map} exists`);
      check(!Maps.isSolid(loc.map, loc.x, loc.y), `${n.id} day${day} ${h}h at ${loc.map}(${loc.x},${loc.y}) stands on walkable tile`);
      const lines = n.talk({ day, dow: (day - 1) % 7, hour: h });
      check(Array.isArray(lines), `${n.id} talk() returns an array`);
    }
  }
}
for (const d of Entities.DUCKS) {
  check(Maps.tileAt('town', Math.floor(d.x), Math.floor(d.y)) === 'w', `duck at (${d.x},${d.y}) starts on water`);
}
// land critters stand on walkable dry land (with room to wander +-0.7)
for (const a of Entities.ANIMALS) {
  check(!!Maps.DATA[a.map], `${a.id} lives on a real map (${a.map})`);
  for (const ox of [-0.7, 0, 0.7]) {
    const tx = Math.floor(a.x + ox), ty = Math.floor(a.y);
    check(!Maps.isSolid(a.map, tx, ty) && !Maps.isWater(a.map, tx, ty),
      `${a.id} wander spot (${a.map} ${tx},${ty}) is dry walkable land`);
  }
  check(['meow', 'woof', 'squeak'].includes(a.sfx), `${a.id} has an animal sfx`);
}
// the bike parks on walkable ground
{
  const mainSrcB = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
  const m = mainSrcB.match(/BIKE_HOME = \{ map: '([^']+)', x: ([\d.]+), y: ([\d.]+) \}/);
  check(!!m, 'found BIKE_HOME in main.ts');
  if (m) check(!Maps.isSolid(m[1], Math.floor(+m[2]), Math.floor(+m[3])) &&
               !Maps.isWater(m[1], Math.floor(+m[2]), Math.floor(+m[3])),
    `bike home (${m[1]} ${m[2]},${m[3]}) is dry walkable land`);
}

// ---- sprites ----
console.log('sprites:');
vm.runInContext(`
  __sprErrs = [];
  (() => {
    const src = ${JSON.stringify(spritesSrc)};
    const widths = src.match(/'[.A-Za-z]{8,}'/g) || [];
  })();
`, sandbox);
// template width check: parse the literal rows from source
const tplRows = spritesSrc.match(/^\s+'[.HSERDPdTOBAW]{12}',\s*$/gm) || [];
const badRows = (spritesSrc.match(/^\s+'[.HSERDPdTOBAW]{6,}',\s*$/gm) || [])
  .filter(r => !/'[.HSERDPdTOBAW]{12}',/.test(r))
  .filter(r => !/'[.WEOADP]{10}',/.test(r)); // duck & animal rows are 10 wide on purpose
check(badRows.length === 0, `all character template rows are 12 wide (bad: ${badRows.slice(0, 3).join(' ')})`);
check(tplRows.length > 60, `found ${tplRows.length} template rows`);

// duck rows are 10 wide
const duckRows = spritesSrc.match(/^\s+'[.WEO]{4,}',\s*$/gm) || [];
for (const r of duckRows) check(/'[.WEO]{10}',/.test(r), `duck row ${r.trim()} is 10 wide`);

// ---- audio ----
console.log('audio:');
const SONGS = AudioSys._SONGS;
const noteRe = /^([A-G][#b]?-?\d)(\+[A-G][#b]?-?\d)*$|^R$|^[khs]$/;
for (const [name, song] of Object.entries(SONGS)) {
  check(song.bpm > 0, `${name} has bpm`);
  song.tracks.forEach((tr, i) => {
    let total = 0;
    for (const [n, b] of tr.notes) {
      check(noteRe.test(n), `${name} track ${i}: bad note "${n}"`);
      check(b > 0, `${name} track ${i}: bad duration ${b}`);
      total += b;
    }
    check(total > 0, `${name} track ${i} non-empty`);
    tr.total = total;
  });
  const totals = song.tracks.map(t => t.total);
  const max = Math.max(...totals);
  for (const t of totals) {
    check(Math.abs(max / t - Math.round(max / t)) < 1e-6,
      `${name}: track length ${t} divides longest ${max} (stays in sync)`);
  }
}

// ---- minigames ----
// every registered game has usable metadata, and everything in the world
// that launches a game points at a registered name
console.log('minigames:');
const gameNames = new Set(Minigames.types());
for (const name of gameNames) {
  const meta = Minigames.meta(name);
  check(!!meta && typeof meta.label === 'string' && meta.label.length > 0, `minigame ${name} has a label`);
  check(!!meta && Array.isArray(meta.keys) && meta.keys.length > 0, `minigame ${name} declares smoke-test keys`);
  check(!!meta && typeof meta.description === 'string' && meta.description.length > 0, `minigame ${name} has a description`);
}
for (const n of Entities.NPCS) {
  if (n.game) check(gameNames.has(n.game), `${n.id}.game "${n.game}" is a registered minigame`);
  for (const fg of n.freeGames || [])
    check(gameNames.has(fg.game), `${n.id} freeGames "${fg.game}" is a registered minigame`);
}
{
  const mainTs = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
  for (const m of mainTs.matchAll(/startFunGame\([^,)]+,\s*'(\w+)'\)/g))
    check(gameNames.has(m[1]), `startFunGame('${m[1]}') in main.ts is a registered minigame`);
  for (const n of Entities.NPCS) {
    if (!n.teaches) continue;
    check(new RegExp('^    ' + n.teaches + ':\\s*\\{ label:', 'm').test(mainTs),
      `${n.id}.teaches "${n.teaches}" has a CLASS_INFO entry in main.ts`);
    check(gameNames.has(n.teaches), `${n.id}.teaches "${n.teaches}" is a registered minigame`);
  }
}

// ---- stickers / shop ----
console.log('stickers & shop:');
const ids = new Set();
for (const s of Entities.STICKERS) {
  check(!ids.has(s.id), `sticker id ${s.id} unique`);
  ids.add(s.id);
}
const iconNames = (spritesSrc.match(/^\s{4}(\w+):\s*\(g\)/gm) || []).map(s => s.trim().split(':')[0]);
for (const s of Entities.STICKERS) {
  check(iconNames.includes(s.icon) || s.icon === 'star', `sticker ${s.id} icon "${s.icon}" exists (have: ${iconNames.length})`);
}

// awarded sticker ids referenced in main.js exist
const mainSrc = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
const awarded = [...mainSrc.matchAll(/award\('(\w+)'\)/g)].map(m => m[1]);
for (const a of awarded) check(ids.has(a), `award('${a}') is a real sticker`);
const milestoneIds = ['abc', 'scholar', 'goldfish', 'dolphin', 'tutu', 'prima'];
for (const m of milestoneIds) check(ids.has(m), `milestone sticker ${m} exists`);

console.log(failures === 0 ? '\nAll checks passed ✓' : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
