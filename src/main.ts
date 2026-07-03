/* ======================================================================
   Starry ☆ Little Days — main.js
   Game loop, world simulation, schedule, rewards, save/load, rendering.
   ====================================================================== */

import { AudioSys } from './audio';
import { SpriteLib } from './sprites';
import { Maps } from './maps';
import { Entities } from './entities';
import { Minigames } from './minigames';
import { UI } from './ui';
import type { ChoiceOpt } from './ui';
import type { Animal, Dir, Minigame, Npc, Warp } from './types';

interface GState {
  day: number; tmin: number; stars: number; energy: number;
  skills: Record<string, number>;
  hearts: Record<string, number>;
  stickers: string[];
  duckFood: number;
  treats: number;
  toys: string[];
  fedDay: Record<string, number>;
  done: Record<string, boolean>;
  talked: Record<string, number>;
  counts: Record<string, number>;
  fun: Record<string, number>;
  flags: Record<string, boolean>;
}
interface NpcState {
  map: string; x: number; y: number; dir: Dir;
  homeX: number; homeY: number; wT: number; animT: number;
  moving: boolean; pauseT: number;
  tx: number | null; ty: number | null;
}
interface Anim {
  type: string; t: number; dur: number;
  tx: number; ty: number; ox: number; oy: number;
  after?: () => void;
  fired: Record<string, boolean>;
  land?: { x: number; y: number };
  ang?: number;
  lastHop?: number;
}
interface Part {
  kind: string; x: number; y: number; vx: number; vy: number;
  t: number; dur: number; r?: number;
}
interface Cam { x: number; y: number; }
type AnimState = { a: Animal; x: number; y: number; t: number; dir: Dir };

export const Game = (() => {

  const T = SpriteLib.TILE * SpriteLib.SCALE; // 48 px per tile
  const SAVE_KEY = 'starry-little-days';
  const MIN_PER_SEC = 2;        // 1 real second = 2 game minutes
  const DAY_START = 7 * 60, DAY_END = 22 * 60;

  let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
  let state = 'title';          // title | play | minigame | book | journal | map | summary
  let titleStarted = false, titleSel = 0;
  let audioReady = false;
  let time = 0, last = 0;
  let mg: Minigame | null = null;   // active minigame
  let bookSel = 0;
  let fade: { t: number; dur: number; mid: () => void; fired: boolean } | null = null;
  let locT = 0, locLabel = '';
  let summaryInfo: { day: number; lines: string[] } | null = null, summaryT = 0;
  let prevTmin = 0;
  let stepT = 0;
  let anim: Anim | null = null;     // the little play cutscene, when one is running
  const parts: Part[] = [];         // sparkles & bubbles

  // ---------- persistent state ----------
  let G: GState = freshG();
  function freshG(): GState {
    return {
      day: 1, tmin: DAY_START, stars: 0, energy: 100,
      skills: { letters: 0, swim: 0, ballet: 0, art: 0 },
      hearts: {}, stickers: [], duckFood: 0, treats: 0, toys: [], fedDay: {},
      done: { school: false, swim: false, ballet: false, art: false },
      talked: {}, counts: { school: 0, swim: 0, ballet: 0, art: 0 },
      fun: {},
      flags: {},
    };
  }
  function dow() { return (G.day - 1) % 7; }      // 0 = Monday
  function hour() { return G.tmin / 60; }
  function gview() { return { day: G.day, dow: dow(), hour: hour(), tmin: G.tmin, stars: G.stars, energy: G.energy, skills: G.skills, hearts: G.hearts, stickers: G.stickers, duckFood: G.duckFood, treats: G.treats }; }

  let stats: { stars: number; lines: string[] } = { stars: 0, lines: [] };

  // ---------- player & npcs ----------
  const player: { map: string; x: number; y: number; dir: Dir; moving: boolean; animT: number; swimming: boolean; riding: boolean } =
    { map: 'home', x: 4.5, y: 6.6, dir: 'down', moving: false, animT: 0, swimming: false, riding: false };
  const BIKE_HOME = { x: 12.5, y: 6.8 };
  const bike = { x: BIKE_HOME.x, y: BIKE_HOME.y };   // lives on the town map
  let waterHintT = 0;
  const npcState: Record<string, NpcState> = {};
  // critters drift gently around their home spot on the town map
  const animState: AnimState[] = Entities.ANIMALS.map(a => ({ a, x: a.x, y: a.y, t: (a.x * 7) % 6, dir: 'left' as Dir }));

  function placeNPCs() {
    const gv = gview();
    for (const n of Entities.NPCS) {
      const loc = n.where(gv);
      let ns = npcState[n.id];
      if (!ns || ns.map !== loc.map) {
        ns = npcState[n.id] = {
          map: loc.map, x: loc.x + 0.5, y: loc.y + 0.85, dir: 'down',
          homeX: loc.x + 0.5, homeY: loc.y + 0.85, wT: Math.random() * 3,
          animT: 0, moving: false, pauseT: 0, tx: null, ty: null,
        };
      } else { ns.homeX = loc.x + 0.5; ns.homeY = loc.y + 0.85; }
    }
  }

  // ---------- save / load ----------
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, G })); } catch (e) { /* private mode */ }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!raw || !raw.G) return false;
      G = Object.assign(freshG(), raw.G);
      G.skills = Object.assign({ letters: 0, swim: 0, ballet: 0, art: 0 }, raw.G.skills);
      G.done = Object.assign({ school: false, swim: false, ballet: false, art: false }, raw.G.done);
      G.counts = Object.assign({ school: 0, swim: 0, ballet: 0, art: 0 }, raw.G.counts);
      if (!Array.isArray(G.toys)) G.toys = [];
      return true;
    } catch (e) { return false; }
  }

  // ---------- helpers ----------
  function fadeTo(mid: () => void) { fade = { t: 0, dur: 0.45, mid, fired: false }; }
  function setLocation(label: string) { locLabel = label; locT = 2.4; }
  function award(id: string) {
    if (G.stickers.includes(id)) return;
    const st = Entities.STICKERS.find(s => s.id === id);
    if (!st) return;
    G.stickers.push(id);
    stats.lines.push('New sticker: ' + st.name);
    UI.toast('New sticker: ' + st.name + '!', st.icon);
    AudioSys.sfx('sticker');
  }
  function gainStars(n: number) { G.stars += n; stats.stars += n; }
  // a little play activity: the first time each day it gives stars (and/or a
  // snack of energy); after that it's just for fun. Returns true the first time.
  function funReward(id: string, stars: number, energy?: number) {
    const first = G.fun[id] !== G.day;
    if (first) {
      G.fun[id] = G.day;
      if (stars) { gainStars(stars); UI.toast('+' + stars + ' star' + (stars > 1 ? 's' : '') + '!', 'star'); }
      if (energy) G.energy = Math.min(100, G.energy + energy);
    }
    return first;
  }
  function musicFor() {
    if (state === 'title') return titleStarted ? 'meadow' : 'home';
    if (state === 'summary') return 'night';
    const m = Maps.get(player.map);
    if (m.outdoor) return (hour() >= 19.5 || hour() < 6.5) ? 'night' : (m.music || 'meadow');
    return m.music || 'meadow';
  }
  function crossed(min: number) { return prevTmin < min && G.tmin >= min; }

  // ---------- class logic ----------
  const CLASS_INFO: Record<string, { label: string; skill: string; firstSticker: string; prompt: string; days: number[]; from: number; to: number }> = {
    school: { label: 'School', skill: 'letters', firstSticker: 'firstday',
              prompt: 'Good morning, Starry! Ready for circle time?',
              days: [0, 1, 2, 3, 4], from: 8, to: 11.5 },
    swim:   { label: 'Swim', skill: 'swim', firstSticker: 'splash',
              prompt: 'Ready to make a big splash today?',
              days: [1, 3], from: 13, to: 16 },
    ballet: { label: 'Ballet', skill: 'ballet', firstSticker: 'twirl',
              prompt: 'Shall we dance, petite étoile?',
              days: [0, 2, 4], from: 13, to: 16 },
    art:    { label: 'Art', skill: 'art', firstSticker: 'painter',
              prompt: 'The paints are ready! Shall we make something colorful?',
              days: [5, 6], from: 9, to: 11.5 },
  };
  function classAvailable(type: string) {
    const c = CLASS_INFO[type];
    return c.days.includes(dow()) && hour() >= c.from && hour() < c.to && !G.done[type];
  }
  function startClass(type: string) {
    state = 'minigame';
    mg = Minigames[type]((stars: number, perfect: boolean) => endClass(type, stars, perfect));
  }
  function endClass(type: string, stars: number, perfect: boolean) {
    const c = CLASS_INFO[type];
    const total = stars + (perfect ? 1 : 0);
    gainStars(total);
    G.energy = Math.max(0, G.energy - 20);
    G.done[type] = true;
    G.counts[type]++;
    const before = Entities.skillLevel(G.skills[c.skill]);
    G.skills[c.skill]++;
    const after = Entities.skillLevel(G.skills[c.skill]);
    if (type === 'school' || type === 'art') G.tmin = Math.max(G.tmin, 12 * 60);
    else G.tmin = Math.min(G.tmin + 75, DAY_END - 10);
    award(c.firstSticker);
    stats.lines.push(c.label + ' class: ' + '★'.repeat(stars) + (perfect ? ' (perfect!)' : ''));
    UI.toast('+' + total + ' stars!', 'star');
    if (after > before) {
      const sk = Entities.SKILLS[c.skill];
      UI.toast(sk.label + ' is now Lv ' + after + ': ' + sk.titles[after - 1] + '!', 'medal');
      const milestones = ({
        letters: { 3: 'abc', 5: 'scholar' }, swim: { 3: 'goldfish', 5: 'dolphin' },
        ballet: { 3: 'tutu', 5: 'prima' }, art: { 3: 'rainbow', 5: 'artist' },
      } as Record<string, Record<number, string>>)[c.skill];
      if (milestones && milestones[after]) award(milestones[after]);
    }
    mg = null;
    state = 'play';
  }

  // ---------- shop ----------
  const TOY_ICONS: Record<string, string> = { teddy: 'teddy', froggy: 'froggy', bball: 'ball', storybook: 'book' };
  function storyTime(npc: Npc) {
    const lines = npc.talk(gview()) || [];
    UI.say(npc.name, [lines[G.day % Math.max(1, lines.length)] || '...!']);
    funReward('story', 1);
    award('story');
    AudioSys.sfx('note', 'C5');
  }
  function openShop(npc: Npc) {
    const ids = npc.stock || Entities.SHOP_ITEMS.map(i => i.id);
    const stock = ids.map(id => Entities.SHOP_ITEMS.find(i => i.id === id))
      .filter((it): it is NonNullable<typeof it> => !!it)
      .filter(it => !(it.toy && G.toys.includes(it.id)));   // each toy comes home once
    const opts: ChoiceOpt[] = stock.map(it => ({ label: it.name + '  (' + it.cost + '★)', value: it.id }));
    if (npc.story) opts.push({ label: 'Read a story ♪', value: '__story' });
    opts.push({ label: 'Just looking!', value: null });
    const who = npc.shopName || npc.name;
    UI.choose(who, npc.greeting || 'What would you like?', opts, (val) => {
      if (val === '__story') return storyTime(npc);
      if (!val) return;
      const it = Entities.SHOP_ITEMS.find(i => i.id === val);
      if (!it) return;
      if (G.stars < it.cost) {
        UI.say(who, ['Oh dear, that needs ' + it.cost + ' stars. Earn some shiny ones in class!']);
        AudioSys.sfx('deny');
        return;
      }
      G.stars -= it.cost;
      if (it.duckFood) {
        G.duckFood += 3;
        UI.say(who, ['Three scoops of ducky snacks! The lake is down south, past the big path.'], null);
      } else if (it.treats) {
        G.treats += 3;
        UI.say(who, ['Three crunchy critter treats! The furry little townsfolk will love you.'], null);
      } else if (it.toy) {
        G.toys.push(it.id);
        award('mytoy');
        stats.lines.push('Brought home a new toy: ' + it.name);
        UI.toast(it.name + ' will be waiting in your room!', TOY_ICONS[it.id]);
        AudioSys.sfx('pop');
        UI.say('Starry', [it.line]);
      } else {
        G.energy = Math.min(100, G.energy + (it.energy || 0));
        AudioSys.sfx('munch');
        award(npc.bakery ? 'baker' : 'sweet');
        UI.say('Starry', [it.line]);
      }
      AudioSys.sfx('confirm');
    });
  }

  // ---------- just-for-fun minigames ----------
  // label / energy / minutes / minEnergy live in each game's registration
  // (see MinigameMeta in minigames.ts) — one place to define a game.
  function funGameInfo(game: string) {
    return Minigames.meta(game) || { label: game, energy: 12, minutes: 40, minEnergy: 15 };
  }
  function startFunGame(npc: { name: string; game?: string }, game?: string) {
    game = game || npc.game || '';
    const info = funGameInfo(game);
    if (G.energy < info.minEnergy) {
      UI.say(npc.name, ['Ooh, those are sleepy eyes! Have a little snack or a nap first.']);
      return;
    }
    state = 'minigame';
    mg = Minigames[game]((stars: number, perfect: boolean) => endFunGame(npc, game!, stars, perfect));
  }
  function endFunGame(npc: { name: string; game?: string }, game: string, stars: number, perfect: boolean) {
    const info = funGameInfo(game);
    const total = stars + (perfect ? 1 : 0);
    G.energy = Math.max(0, G.energy - info.energy);
    G.tmin = Math.min(G.tmin + info.minutes, DAY_END - 10);
    const id = 'game_' + game;
    if (G.fun[id] !== G.day) {
      G.fun[id] = G.day;
      gainStars(total);
      stats.lines.push('Played ' + info.label + ': ' + '★'.repeat(stars) + (perfect ? ' (perfect!)' : ''));
      UI.toast('+' + total + ' stars!', 'star');
    } else {
      UI.toast('Again! That one is just for fun now.', 'sun');
    }
    mg = null;
    state = 'play';
  }

  // ---------- sleeping ----------
  function goToSleep(napOnly: boolean) {
    AudioSys.sfx('sleep');
    fadeTo(() => {
      if (napOnly) {
        G.energy = Math.min(100, G.energy + 40);
        G.tmin = Math.min(G.tmin + 60, DAY_END - 30);
        UI.toast('A cozy little nap...', 'moon');
      } else {
        summaryInfo = { day: G.day, lines: stats.lines.slice() };
        if (stats.stars > 0) summaryInfo.lines.push('Stars earned today: ' + stats.stars);
        summaryT = 0;
        state = 'summary';
      }
    });
  }
  function newDay() {
    fadeTo(() => {
      G.day++;
      G.tmin = DAY_START;
      G.energy = 100;
      G.done = { school: false, swim: false, ballet: false, art: false };
      stats = { stars: 0, lines: [] };
      player.map = 'home'; player.x = 2.5; player.y = 2.7; player.dir = 'right';
      player.swimming = false; player.riding = false;
      bike.x = BIKE_HOME.x; bike.y = BIKE_HOME.y;   // Mom parks it back by the door
      placeNPCs();
      if (G.day >= 8) award('week');
      state = 'play';
      setLocation(UI.DAY_NAMES[dow()] + ' — Day ' + G.day);
      save();
    });
  }

  // ---------- little play animations ----------
  // when Starry uses the slide, swings, see-saw, carousel, hopscotch or
  // pony, a tiny cutscene takes over her position for a few seconds and
  // then hands back control (rewards & dialogue fire when it finishes).
  function sparkles(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random();
      parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.1 - 1.4, t: 0, dur: 0.6 });
    }
  }
  function bubbles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      parts.push({ kind: 'bub', x: x + (Math.random() - 0.5) * 0.8, y: y - Math.random() * 0.4,
                   vx: (Math.random() - 0.5) * 0.5, vy: -0.9 - Math.random() * 0.8,
                   t: 0, dur: 1.2 + Math.random() * 0.6, r: 3 + Math.random() * 5 });
    }
  }
  function updateParts(dt: number) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'spark') p.vy += 3.5 * dt;
      if (p.t >= p.dur) parts.splice(i, 1);
    }
  }
  function drawParts(cam: Cam) {
    for (const p of parts) {
      const a = Math.max(0, 1 - p.t / p.dur);
      const x = p.x * T - cam.x, y = p.y * T - cam.y;
      if (p.kind === 'spark') {
        ctx.fillStyle = `rgba(255,220,110,${a.toFixed(2)})`;
        ctx.fillRect(x - 4, y - 1, 8, 3); ctx.fillRect(x - 1, y - 4, 3, 8);
      } else {
        ctx.strokeStyle = `rgba(215,240,255,${(a * 0.9).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, p.r || 4, 0, 7); ctx.stroke();
      }
    }
  }

  function landSpot(cands: [number, number][]) {
    for (const [x, y] of cands)
      if (!Maps.isSolid(player.map, Math.floor(x), Math.floor(y)) &&
          !Maps.isWater(player.map, Math.floor(x), Math.floor(y))) return { x, y };
    return { x: cands[cands.length - 1][0], y: cands[cands.length - 1][1] };
  }
  function startAnim(type: string, f: { x: number; y: number }, dur: number, after?: () => void) {
    held.clear();
    player.moving = false;
    anim = { type, t: 0, dur, tx: f.x, ty: f.y, ox: player.x, oy: player.y, after, fired: {} };
  }
  function cue(id: string, at: number, fn: () => void) {
    if (!anim || anim.fired[id] || anim.t < at) return;
    anim.fired[id] = true; fn();
  }
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  function updateAnim(dt: number) {
    const a = anim!;
    a.t += dt;
    const p = clamp01(a.t / a.dur);
    if (a.type === 'slide') {
      const top = { x: a.tx + 0.25, y: a.ty + 0.5 };
      a.land = a.land || landSpot([[a.tx + 1.2, a.ty + 1.35], [a.tx + 0.5, a.ty + 1.35], [a.ox, a.oy]]);
      if (p < 0.35) {          // clamber up the ladder
        const q = p / 0.35;
        player.x = lerp(a.ox, top.x, q);
        player.y = lerp(a.oy, top.y, q) - Math.abs(Math.sin(q * 9)) * 0.06;
        player.dir = 'up';
        cue('c', 0, () => AudioSys.sfx('step'));
      } else if (p < 0.7) {    // WHEEE
        const q = (p - 0.35) / 0.35;
        player.x = lerp(top.x, a.land.x, q * q);
        player.y = lerp(top.y, a.land.y, q * q);
        player.dir = 'right';
        cue('w', a.dur * 0.35, () => AudioSys.sfx('whee'));
      } else {                 // a happy landing hop
        player.x = a.land.x;
        player.y = a.land.y - Math.abs(Math.sin((p - 0.7) / 0.3 * Math.PI)) * 0.25;
        player.dir = 'down';
        cue('l', a.dur * 0.7, () => { AudioSys.sfx('pop'); sparkles(a.land!.x, a.land!.y - 0.3); });
        if (p >= 1) player.y = a.land.y;
      }
    } else if (a.type === 'swing') {
      const px0 = a.tx + 0.5, py0 = a.ty + 0.15, L = 0.65;
      const ramp = Math.min(1, a.t / 0.9) * clamp01((a.dur - a.t) / 0.7);
      const th = Math.sin(a.t * 3.4) * 0.95 * ramp;
      player.x = px0 + Math.sin(th) * L * 1.5;
      player.y = py0 + Math.cos(th) * L;
      player.dir = 'down';
      cue('w1', 0.8, () => AudioSys.sfx('whee'));
      cue('w2', 1.9, () => AudioSys.sfx('whee'));
      if (p >= 1) {
        const land = landSpot([[a.tx + 0.5, a.ty + 1.35], [a.ox, a.oy]]);
        player.x = land.x; player.y = land.y;
        sparkles(land.x, land.y - 0.3);
      }
    } else if (a.type === 'seesaw') {
      const ramp = Math.min(1, a.t / 0.4) * clamp01((a.dur - a.t) / 0.4);
      player.x = a.tx + 0.3;
      player.y = a.ty + 0.75 - Math.abs(Math.sin(a.t * 5.5)) * 0.45 * ramp;
      player.dir = 'down';
      cue('w1', 0.4, () => AudioSys.sfx('whee'));
      cue('w2', 1.4, () => AudioSys.sfx('whee'));
      if (p >= 1) { player.x = a.ox; player.y = a.oy; }
    } else if (a.type === 'carousel') {
      const cx = a.tx + 0.5, cy = a.ty + 0.5, r = 1.05;
      if (a.ang === undefined) a.ang = Math.atan2(a.oy - cy, a.ox - cx);
      const sp = Math.min(1, a.t / 0.6) * clamp01((a.dur - a.t) / 0.6);
      a.ang += dt * 3.6 * sp;
      player.x = cx + Math.cos(a.ang) * r;
      player.y = cy + Math.sin(a.ang) * r * 0.65 - Math.abs(Math.sin(a.t * 5)) * 0.12;
      const vx = -Math.sin(a.ang), vy = Math.cos(a.ang) * 0.65;
      player.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      cue('r', 0, () => AudioSys.sfx('ride'));
      cue('w', 1.6, () => AudioSys.sfx('whee'));
      if (p >= 1) { player.x = a.ox; player.y = a.oy; sparkles(a.ox, a.oy - 0.5); }
    } else if (a.type === 'hop') {
      const hops = 5, q = p * hops;
      const i = Math.min(hops - 1, Math.floor(q));
      player.x = a.tx + 0.5 + [-0.22, 0.22, -0.22, 0.22, 0][i];
      player.y = a.ty + 0.7 - Math.abs(Math.sin(q * Math.PI)) * 0.3;
      player.dir = 'down';
      if (a.lastHop !== i) { a.lastHop = i; AudioSys.sfx('pop'); }
      if (p >= 1) { player.x = a.ox; player.y = a.oy; }
    } else if (a.type === 'pony') {
      player.x = a.tx + 0.4;
      player.y = a.ty + 0.55 - Math.abs(Math.sin(a.t * 4.5)) * 0.18;
      player.dir = 'right';
      cue('n', 0, () => AudioSys.sfx('neigh'));
      cue('r', 0.5, () => AudioSys.sfx('ride'));
      if (p >= 1) { player.x = a.ox; player.y = a.oy; sparkles(a.tx + 0.5, a.ty + 0.2); }
    } else if (a.type === 'bounce') {
      player.y = a.oy - Math.abs(Math.sin(a.t * 6)) * 0.35;
      cue('p1', 0, () => AudioSys.sfx('pop'));
      cue('p2', 0.55, () => AudioSys.sfx('pop'));
      if (p >= 1) player.y = a.oy;
    }
    if (a.t >= a.dur) {
      anim = null;
      if (a.after) a.after();
    }
  }

  // ---------- interaction ----------
  const FLAVOR: Record<string, string[]> = {
    k: ['Something smells yummy in the kitchen.'],
    m: ['So many picture books and bright little things!'],
    A: ['The board says: A is for Apple. And Adventure!'],
    T: ['The table is all set for snack time.'],
    h: ['Ooh... the sweets sparkle behind the glass.'],
    M: ['Starry checks her twirl in the big mirror. Hello, me!'],
    t: ["Ms. Bloom's desk. There's a box of gold star stickers!"],
    D: ['A tiny desk with a tiny chair. Just Starry-sized.'],
    E: ['The water sparkles. No running on the pool deck!'],
    c: ['A little chair for little sitting.'],
    a: ["The sign says: Sunny Sprouts School! ABC's and circle time inside."],
    u: ['The sign says: Splashy Swim Center! Kick kick kick!'],
    n: ['The sign says: Twinkle Toes Studio! Ballet with Madame Plié.'],
    q: ["The sign says: Mr. Scoop's Sweets! Ice cream and star cookies."],
    e: ['The sign says: Sunnybank Park! Slides, swings, and sandy toes.'],
    z: ['The mailbox is painted pink. Any letters for Starry? Not today!'],
    i: ['The sign says: Bus Stop! Little buses go to the city, the beach, and the farm.'],
    l: ['The sign says: Storytime Library! Pick a book and read with Miss Paige.'],
    j: ['The sign says: Tippy Top Toys! Blocks, balls, and wind-up froggies.'],
    N: ['The sign says: Honey Bun Bakery! Muffins, cocoa, and twisty pretzels.'],
    '(': ['The sign says: Rainbow Art Room! Painting with Mr. Doodle on weekend mornings.'],
    '}': ['An easel with a half-painted rainbow. It needs two more colors!'],
    '[': ['A stripey umbrella makes a circle of cool shade. Ahhh.'],
    ')': ['A tall palm tree. Its big leaves go swish, swish, swish.'],
    '8': ['A big bouncy hay bale. It smells like sunshine.'],
    '?': ['The scarecrow tips his floppy hat. "Hello, Mr. Scarecrow!"'],
    '"': ['Sunflowers taller than Starry! They all turn to look at the sun.'],
  };

  function facingTile() {
    const tx = Math.floor(player.x), ty = Math.floor(player.y - 0.1);
    const d = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as Record<Dir, [number, number]>)[player.dir];
    return { x: tx + d[0], y: ty + d[1] };
  }
  function npcNearFace(): Npc | null {
    const f = facingTile();
    const fx = f.x + 0.5, fy = f.y + 0.5;
    let best: Npc | null = null, bd = 1.45;
    for (const n of Entities.NPCS) {
      const ns = npcState[n.id];
      if (!ns || ns.map !== player.map) continue;
      const dd = Math.hypot(ns.x - fx, (ns.y - 0.5) - fy);
      if (dd < bd) { bd = dd; best = n; }
    }
    return best;
  }

  function animalNear(): AnimState | null {
    let best: AnimState | null = null, bd = 1.5;
    for (const s of animState) {
      if (s.a.map !== player.map) continue;
      const dd = Math.hypot(s.x - player.x, s.y - player.y);
      if (dd < bd) { bd = dd; best = s; }
    }
    return best;
  }
  function bikeNear() {
    return player.map === 'town' && !player.swimming &&
      Math.hypot(bike.x - player.x, bike.y - player.y) < 1.4;
  }
  function dismountHere() {
    player.riding = false;
    bike.x = player.x; bike.y = player.y;
    AudioSys.sfx('bell');
  }
  function feedAnimal(s: AnimState) {
    const a = s.a;
    AudioSys.sfx(a.sfx);
    if (G.fedDay[a.id] === G.day) { UI.say(a.name, [a.happy]); return; }
    if (G.treats > 0) {
      G.treats--;
      G.fedDay[a.id] = G.day;
      AudioSys.sfx('munch');
      UI.toast('♥ ' + a.name + ' loves it! (' + G.treats + ' treats left)', 'paw');
      UI.say(a.name, [a.fed]);
      const sameMap = Entities.ANIMALS.filter(an => an.map === a.map);
      const mapSticker = { town: 'critters', city: 'zoo', farm: 'barnpals' }[a.map];
      if (mapSticker && sameMap.every(an => G.fedDay[an.id] === G.day)) award(mapSticker);
    } else {
      UI.say(a.name, [a.hungry, 'Mr. Scoop sells Critter Treats at the sweet shop!']);
    }
  }

  function interact() {
    if (anim) return;
    if (player.riding) return dismountHere();
    const npc = npcNearFace();
    if (npc) return talkTo(npc);
    const animal = animalNear();
    if (animal) return feedAnimal(animal);
    if (bikeNear()) {
      player.riding = true;
      AudioSys.sfx('bell');
      award('zoom');
      return;
    }
    const f = facingTile();
    const ch = Maps.tileAt(player.map, f.x, f.y);
    if (ch === 'b' || ch === 'v') {
      // Starry can snuggle in any time — a quick nap, or sleep the whole
      // day away and wake up to a brand new one.
      const opts: ChoiceOpt[] = [];
      if (hour() < 20) opts.push({ label: 'Just a nap', value: 'nap' });
      opts.push({ label: hour() >= 18 ? 'Goodnight! ☆' : 'Sleep until tomorrow ☆', value: 'sleep' });
      opts.push({ label: 'Not yet', value: null });
      UI.choose('', hour() >= 18 ? 'All tucked in and sleepy?' : 'Snuggle into the cozy bed?', opts, v => {
        if (v === 'nap') goToSleep(true);
        else if (v === 'sleep') goToSleep(false);
      });
      return;
    }
    if (ch === 'y') {
      AudioSys.sfx('pop');
      funReward('toys', 1);
      if (player.map === 'toystore') award('playtime');
      UI.say('Starry', ['Starry stacks the blocks... taller... taller... CRASH! Hee hee.']);
      return;
    }
    if (ch === 'Q') {
      ['E5', 'G5', 'A5'].forEach((n, i) => setTimeout(() => AudioSys.sfx('note', n), i * 220));
      funReward('melody', 1);
      award('melody');
      UI.say('Starry', ['Plink plonk plink! Starry made a song!']);
      return;
    }
    if (ch === 'd') {
      startAnim('slide', f, 1.7, () => {
        funReward('slide', 1);
        award('whee');
        UI.say('Starry', ['Up the ladder... aaaand... WHEEEE!']);
      });
      return;
    }
    if (ch === 'g') {
      startAnim('swing', f, 3.4, () => {
        funReward('swing', 1);
        award('swing');
        UI.say('Starry', ['Higher! Higher! Starry can almost touch the clouds!']);
      });
      return;
    }
    if (ch === 'w') {
      if (G.duckFood > 0) {
        G.duckFood--;
        AudioSys.sfx('quack');
        award('ducky');
        UI.say('Starry', ['The duckies wiggle their tails for the snacks! (' + G.duckFood + ' left)']);
      } else {
        AudioSys.sfx('quack');
        UI.say('', ['The duckies paddle around happily. Maybe they would like a snack...']);
      }
      return;
    }
    if (ch === 'F') {
      AudioSys.sfx('sparkle');
      sparkles(f.x + 0.5, f.y + 0.1);
      const first = funReward('wish', 1);
      award('wish');
      UI.say('Starry', [first ? 'Starry makes a wish — and spots a lucky shiny coin by the rim!'
                              : 'Ripples spread out and out and out. Shh... make a quiet wish.']);
      return;
    }
    if (ch === 'Y') {
      AudioSys.sfx('munch');
      const first = funReward('apple', 0, 15);
      award('apple');
      UI.say('Starry', [first ? 'Up on tippy-toes... a shiny red apple! *crunch* Yummy AND good for you.'
                              : 'Still lots of apples up there, but Starry is all snacked out for now.']);
      return;
    }
    if (ch === 'J') {
      startAnim('seesaw', f, 2.3, () => {
        funReward('seesaw', 1);
        award('seesaw');
        UI.say('Starry', ['Up... and down... and UP! The see-saw goes wheee — bonk!']);
      });
      return;
    }
    if (ch === '@') {
      startAnim('carousel', f, 3.6, () => {
        const first = funReward('carousel', 2);
        award('carousel');
        UI.say('Starry', [first ? 'Round and round on a sparkly horsie! The ticket man gives Starry TWO gold stars!'
                                : 'Another loop on the carousel! Starry waves on every single turn.']);
      });
      return;
    }
    if (ch === '9') {
      startAnim('pony', f, 2.8, () => {
        const first = funReward('pony', 2);
        award('pony');
        UI.say('Starry', [first ? 'Clip, clop! Buttercup gives Starry a gentle little ride. Best pony EVER.'
                                : 'Buttercup nuzzles Starry\'s hair. One more little trot around the paddock!']);
      });
      return;
    }
    if (ch === ']') {
      startAnim('bounce', f, 1.3, () => {
        funReward('beachball', 1);
        award('beachball');
        UI.say('Starry', ['Boing! Boing! Starry bops the big stripey ball SO high!']);
      });
      return;
    }
    if (ch === '{') {
      AudioSys.sfx('moo');
      funReward('moo', 1);
      award('moo');
      UI.say('Daisy', ['Mooooo! (Daisy the cow says hello with her whole heart.)']);
      return;
    }
    if (ch === 'I') {
      UI.choose('Balloon Cart', 'The balloons bob up and down in the breeze.', [
        { label: 'Play Balloon Bop', value: 'game' },
        { label: 'Take a balloon', value: 'take' },
        { label: 'Not now', value: null },
      ], v => {
        if (v === 'game') startFunGame({ name: 'Balloon Cart' }, 'balloonbop');
        else if (v === 'take') {
          AudioSys.sfx('pop');
          funReward('balloon', 1);
          award('balloon');
          UI.say('Starry', ['A big shiny balloon, just for Starry! She holds the string SO tight.']);
        }
      });
      return;
    }
    if (ch === 'V') {
      UI.choose('Bubble Stand', 'A tray of bubble wands glitters in the sun.', [
        { label: 'Play Bubble Pop', value: 'game' },
        { label: 'Blow bubbles', value: 'blow' },
        { label: 'Not now', value: null },
      ], v => {
        if (v === 'game') startFunGame({ name: 'Bubble Stand' }, 'bubblepop');
        else if (v === 'blow') {
          AudioSys.sfx('sparkle');
          bubbles(player.x, player.y - 1.0);
          funReward('bubbles', 1);
          award('bubbles');
          UI.say('Starry', ['Big bubbles, little bubbles, a WHOLE bunch of bubbles! Pop! Pop! Pop!']);
        }
      });
      return;
    }
    // things you can be standing right on top of (flowers, shells, hopscotch...)
    const here = Maps.tileAt(player.map, Math.floor(player.x), Math.floor(player.y - 0.15));
    if (ch === '*' || here === '*') {
      AudioSys.sfx('pop');
      funReward('flowers', 1);
      award('bouquet');
      UI.say('Starry', ['Pink, yellow, and purple — Starry picks a little bouquet. For Mom!']);
      return;
    }
    if (ch === '&' || here === '&') {
      AudioSys.sfx('pop');
      funReward('castle', 1);
      award('castle');
      UI.say('Starry', ['Pat, pat, pat... a sandcastle with a flag on top! Nobody step on it.']);
      return;
    }
    if (ch === 'Z' || here === 'Z') {
      AudioSys.sfx('sparkle');
      sparkles(player.x, player.y - 0.6);
      const first = funReward('shells', 1);
      award('shell');
      UI.say('Starry', [first ? 'A swirly pink seashell! Starry holds it to her ear... it goes whoosh!'
                              : 'Another pretty shell for the bucket. This one sparkles!']);
      return;
    }
    if (ch === '$' || here === '$') {
      AudioSys.sfx('munch');
      const first = funReward('veggie', 0, 15);
      award('carrot');
      UI.say('Starry', [first ? 'Pull... pull... POP! A big orange carrot! *crunch crunch*'
                              : 'The other carrots need more sleep in the dirt, says Farmer Fern.']);
      return;
    }
    if (ch === 'U' || here === 'U') {
      const hx = ch === 'U' ? f : { x: Math.floor(player.x), y: Math.floor(player.y - 0.15) };
      UI.choose('Hopscotch', 'The chalk squares are ready for tiny feet.', [
        { label: 'Play Hopscotch Hero', value: 'game' },
        { label: 'Hop across', value: 'hop' },
        { label: 'Not now', value: null },
      ], v => {
        if (v === 'game') startFunGame({ name: 'Hopscotch' }, 'hopscotch');
        else if (v === 'hop') {
          startAnim('hop', hx, 2.1, () => {
            funReward('hop', 1);
            award('hop');
            UI.say('Starry', ['One foot, two foot, hop-hop-HOP! Starry did the whole hopscotch!']);
          });
        }
      });
      return;
    }
    if (FLAVOR[ch]) UI.say('', FLAVOR[ch]);
  }

  function talkTo(npc: Npc) {
    const ns = npcState[npc.id];
    // face each other
    ns.pauseT = 2.5;
    ns.dir = player.x < ns.x - 0.3 ? 'left' : player.x > ns.x + 0.3 ? 'right' : (player.y < ns.y ? 'up' : 'down');
    if (npc.shop) return openShop(npc);
    const freeGames = npc.freeGames || [];
    if (npc.teaches && classAvailable(npc.teaches)) {
      const c = CLASS_INFO[npc.teaches];
      const opts: ChoiceOpt[] = [{ label: "Let's go!", value: 'class' }];
      for (const game of freeGames) opts.push({ label: game.label || funGameInfo(game.game).label, value: game.game });
      opts.push({ label: 'Not yet', value: null });
      UI.choose(npc.name, c.prompt, opts, v => {
        if (v === 'class') {
          if (G.energy < 20) {
            UI.say(npc.name, ['Oh my, those are sleepy eyes! Have a snack or a nap first, little one.']);
            return;
          }
          startClass(npc.teaches!);
        } else if (v) startFunGame(npc, v);
      });
      return;
    }
    if (freeGames.length) {
      const opts: ChoiceOpt[] = freeGames.map(game => ({ label: game.label || funGameInfo(game.game).label, value: game.game }));
      opts.push({ label: 'Just saying hi', value: 'hi' });
      UI.choose(npc.name, npc.freeGamePrompt || 'What shall we play?', opts, v => {
        if (v === 'hi') chatWith(npc);
        else if (v) startFunGame(npc, v);
      });
      return;
    }
    if (npc.game) {
      UI.choose(npc.name, npc.gamePrompt || 'Want to play?', [
        { label: "Let's play!", value: 'play' },
        { label: 'Just saying hi', value: 'hi' },
      ], v => {
        if (v === 'play') startFunGame(npc);
        else if (v === 'hi') chatWith(npc);
      });
      return;
    }
    chatWith(npc);
  }

  function chatWith(npc: Npc) {
    const gv = gview();
    let lines = npc.talk(gv) || [];
    if (npc.id !== 'mom' && lines.length > 1) lines = [lines[G.day % lines.length]];
    if (npc.teaches && G.done[npc.teaches]) lines = ['That was lovely work today, Starry! See you next time.'];
    if (!lines.length) lines = ['...!'];
    UI.say(npc.name, lines);
    if (npc.story) { funReward('story', 1); award('story'); AudioSys.sfx('note', 'C5'); }
    if (npc.friend && G.talked[npc.id] !== G.day) {
      G.talked[npc.id] = G.day;
      G.hearts[npc.id] = Math.min(Entities.FRIEND_MAX, (G.hearts[npc.id] || 0) + 10);
      UI.toast('♥ ' + npc.name + ' likes playing with you!', 'heart');
      const friends = Entities.NPCS.filter(n => n.friend);
      if (friends.some(f => (G.hearts[f.id] || 0) >= Entities.FRIEND_MAX)) award('bestie');
      // the "social butterfly" sticker is still the three Starview Meadow kids
      if (['luna', 'mia', 'theo'].every(id => (G.hearts[id] || 0) >= 90)) award('butterfly');
      if ((G.hearts.rosie || 0) >= Entities.FRIEND_MAX) award('citypal');
    }
  }

  // ---------- movement ----------
  const held = new Set<string>();
  function moveDir() {
    let dx = 0, dy = 0;
    if (held.has('left')) dx -= 1;
    if (held.has('right')) dx += 1;
    if (held.has('up')) dy -= 1;
    if (held.has('down')) dy += 1;
    return { dx, dy };
  }
  function canSwim() { return G.skills.swim >= 1; }
  function blocked(x: number, y: number) {
    const hw = 0.27;
    for (const [ox, oy] of [[-hw, -0.35], [hw, -0.35], [-hw, 0.02], [hw, 0.02]]) {
      const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
      if (Maps.isSolid(player.map, tx, ty)) return true;
      // water needs a swim lesson first, and bikes stay on dry land
      if (Maps.isWater(player.map, tx, ty) && (player.riding || !canSwim())) return true;
    }
    return false;
  }
  function updatePlayer(dt: number) {
    const { dx, dy } = moveDir();
    const speed = (player.riding ? 7.0 : player.swimming ? 2.6 : G.energy < 20 ? 2.4 : 4.0) * dt;
    player.moving = !!(dx || dy);
    if (player.moving) {
      const len = Math.hypot(dx, dy) || 1;
      const nx = player.x + (dx / len) * speed;
      const ny = player.y + (dy / len) * speed;
      if (!blocked(nx, player.y)) player.x = nx;
      if (!blocked(player.x, ny)) player.y = ny;
      player.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : dx > 0 ? 'right' : player.dir)
                                                : (dy < 0 ? 'up' : 'down');
      player.animT += dt;
      stepT -= dt;
      if (stepT <= 0 && !player.swimming && !player.riding) { AudioSys.sfx('step'); stepT = 0.34; }
      // a friendly word when bumping into water you can't enter
      if (waterHintT <= 0) {
        const f = facingTile();
        if (Maps.isWater(player.map, f.x, f.y)) {
          if (player.riding) { waterHintT = 4; UI.toast('No biking into the water, silly!', 'drop'); }
          else if (!canSwim()) { waterHintT = 4; UI.toast('Swim class first! Coach Finn teaches Tue & Thu at 2.', 'drop'); }
        }
      }
      // warp check
      const tx = Math.floor(player.x), ty = Math.floor(player.y - 0.1);
      const w = Maps.warpAt(player.map, tx, ty);
      if (w) {
        if (player.riding) {                 // bikes wait outside, next to the door
          dismountHere();
          bike.x = player.x - 1; bike.y = player.y + 1;
        }
        doWarp(w);
      }
    } else player.animT = 0;
    // in or out of the water?
    const onWater = Maps.isWater(player.map, Math.floor(player.x), Math.floor(player.y - 0.15));
    if (onWater !== player.swimming) {
      player.swimming = onWater;
      AudioSys.sfx('splash');
      if (onWater && player.map === 'town') award('paddler');
    }
  }
  function doWarp(w: Warp) {
    held.clear();
    fadeTo(() => {
      player.map = w.map;
      player.x = w.x + 0.5;
      player.y = w.y + 0.85;
      player.dir = w.dir;
      const trip = ({ city: 'citytrip', beach: 'beachtrip', farm: 'farmtrip' } as Record<string, string>)[w.map];
      if (trip) award(trip);
      setLocation(Maps.get(w.map).label);
    });
  }
  function playerFrame() {
    return player.moving ? 1 + Math.floor(player.animT * 6) % 2 : 0;
  }

  function updateNPCs(dt: number) {
    placeNPCs();
    for (const n of Entities.NPCS) {
      const ns = npcState[n.id];
      if (ns.map !== player.map) continue;
      ns.animT += dt;
      if (ns.pauseT > 0) { ns.pauseT -= dt; ns.moving = false; continue; }
      ns.wT -= dt;
      if (ns.wT <= 0) {
        ns.wT = 2 + Math.random() * 3.5;
        if (Math.random() < 0.65 && n.radius > 0) {
          ns.tx = ns.homeX + (Math.random() * 2 - 1) * n.radius;
          ns.ty = ns.homeY + (Math.random() * 2 - 1) * n.radius * 0.7;
        } else { ns.tx = null; }
      }
      if (ns.tx != null && ns.ty != null) {
        const ddx = ns.tx - ns.x, ddy = ns.ty - ns.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist > 0.08) {
          ns.moving = true;
          const sp = 1.1 * dt;
          ns.x += (ddx / dist) * sp;
          ns.y += (ddy / dist) * sp;
          ns.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : (ddy < 0 ? 'up' : 'down');
        } else { ns.moving = false; ns.tx = null; }
      } else ns.moving = false;
    }
  }

  function updateAnimals(dt: number) {
    for (const s of animState) {
      s.t += dt;
      const vx = Math.sin(s.t * 0.5 + 1) * 0.2;
      s.x += vx * dt;
      s.y += Math.cos(s.t * 0.31) * 0.1 * dt;
      s.x = Math.max(s.a.x - 0.7, Math.min(s.a.x + 0.7, s.x));
      s.y = Math.max(s.a.y - 0.4, Math.min(s.a.y + 0.4, s.y));
      if (Math.abs(vx) > 0.02) s.dir = vx < 0 ? 'left' : 'right';
    }
  }

  function updateDucks(dt: number) {
    for (const d of Entities.DUCKS) {
      d.t += dt;
      const vx = Math.sin(d.t * 0.4) * 0.25;
      d.x += vx * dt;
      d.y += Math.cos(d.t * 0.23 + 1) * 0.14 * dt;
      const P = Entities.POND;
      d.x = Math.max(P.x0 + 0.6, Math.min(P.x1 - 0.2, d.x));
      d.y = Math.max(P.y0 + 0.4, Math.min(P.y1 - 0.2, d.y));
      d.dir = vx < 0 ? 'left' : 'right';
    }
  }

  // ---------- world clock ----------
  function updateClock(dt: number) {
    prevTmin = G.tmin;
    G.tmin += dt * MIN_PER_SEC;
    const d = dow();
    if (crossed(8 * 60 + 40) && d <= 4 && !G.done.school) UI.toast('School starts at 9! Off to Sunny Sprouts!', 'block');
    if (crossed(8 * 60 + 40) && d >= 5 && !G.done.art) UI.toast('Art class with Mr. Doodle at 9!', 'palette');
    if (crossed(13 * 60 + 40)) {
      if ((d === 0 || d === 2 || d === 4) && !G.done.ballet) UI.toast('Ballet with Madame Plié at 2!', 'shoe');
      if ((d === 1 || d === 3) && !G.done.swim) UI.toast('Swim class with Coach Finn at 2!', 'drop');
    }
    if (crossed(12 * 60) && d <= 4 && !G.done.school) {
      UI.toast('Oops... circle time is over for today.', 'block');
      stats.lines.push('Missed school today. Tomorrow for sure!');
      G.done.school = true;
    }
    if (player.map === 'town' && hour() >= 20) award('stargazer');
    if (G.tmin >= DAY_END) { UI.toast('*yaaawn* So sleepy...', 'moon'); goToSleep(false); }
  }

  // ---------- update ----------
  function update(dt: number) {
    UI.toastUpdate(dt);
    if (fade) {
      fade.t += dt;
      if (fade.t >= fade.dur && !fade.fired) { fade.fired = true; if (fade.mid) fade.mid(); }
      if (fade.t >= fade.dur * 2) fade = null;
    }
    if (state === 'play') {
      UI.dialogUpdate(dt);
      if (!UI.active() && !fade) {
        if (anim) updateAnim(dt);      // a little play cutscene has the wheel
        else { updatePlayer(dt); updateClock(dt); }
      }
      updateNPCs(dt);
      updateAnimals(dt);
      updateParts(dt);
      if (player.map === 'town') updateDucks(dt);
      if (waterHintT > 0) waterHintT -= dt;
      if (locT > 0) locT -= dt * 0.6;
    } else if (state === 'minigame' && mg) {
      mg.update(dt);
      UI.dialogUpdate(dt);
    } else if (state === 'summary') {
      summaryT += dt;
    }
    if (audioReady) AudioSys.play(musicFor());
  }

  // ---------- drawing ----------
  function camera() {
    const m = Maps.size(player.map);
    const mw = m.w * T, mh = m.h * T;
    const W = canvas.width, H = canvas.height;
    let cx = player.x * T - W / 2, cy = player.y * T - H / 2 - 20;
    cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, cx));
    cy = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, cy));
    return { x: cx, y: cy };
  }

  function drawWorld() {
    const cam = camera();
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#241e3c'; ctx.fillRect(0, 0, W, H);
    const map = Maps.get(player.map);
    const size = Maps.size(player.map);
    const frame = Math.floor(time * 1.8) % 2;
    const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(size.w - 1, Math.ceil((cam.x + W) / T));
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(size.h - 1, Math.ceil((cam.y + H) / T));
    const baseTile = SpriteLib.tile(map.base, frame);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const sx = Math.floor(x * T - cam.x), sy = Math.floor(y * T - cam.y);
        ctx.drawImage(baseTile, sx, sy, T, T);
        const ch = map.rows[y][x];
        if (ch !== map.base) {
          const tc = SpriteLib.tile(ch, frame);
          if (tc) ctx.drawImage(tc, sx, sy, T, T);
        }
      }
    }
    // toys Starry bought sit out on her bedroom floor
    if (player.map === 'home' && G.toys.length) {
      const TOY_SPOTS: Record<string, [number, number]> = { teddy: [2.4, 3.6], froggy: [3.4, 4.3], bball: [2.2, 5.0], storybook: [3.7, 3.3] };
      for (const id of G.toys) {
        const s = TOY_SPOTS[id], ic = SpriteLib.icon(TOY_ICONS[id]);
        if (s && ic) ctx.drawImage(ic, Math.floor(s[0] * T - 15 - cam.x), Math.floor(s[1] * T - 15 - cam.y), 30, 30);
      }
    }
    // entities sorted by y
    const ents: { y: number; draw: () => void }[] = [];
    for (const n of Entities.NPCS) {
      const ns = npcState[n.id];
      if (ns && ns.map === player.map)
        ents.push({ y: ns.y, draw: () => drawChar(n.sprite, ns, cam) });
    }
    ents.push({ y: player.y, draw: () => drawPlayer(cam) });
    for (const s of animState) {
      if (s.a.map === player.map) ents.push({ y: s.y, draw: () => drawAnimal(s, cam) });
    }
    if (player.map === 'town') {
      for (const d of Entities.DUCKS) {
        ents.push({ y: d.y, draw: () => {
          const c = SpriteLib.duck(d.dir);
          const bob = Math.sin(d.t * 2.2) * 2;
          ctx.drawImage(c, Math.floor(d.x * T - 15 - cam.x), Math.floor(d.y * T - 18 - cam.y + bob), 30, 21);
        }});
      }
      if (!player.riding) {
        const c = SpriteLib.bike('left');
        ents.push({ y: bike.y, draw: () =>
          ctx.drawImage(c, Math.floor(bike.x * T - 24 - cam.x), Math.floor(bike.y * T - 33 - cam.y), 48, 33) });
      }
    }
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw();
    drawParts(cam);
    drawButterflies(cam);
    // interaction hint
    if (state === 'play' && !UI.active() && !fade && !player.riding && !anim) {
      const npc = npcNearFace();
      const f = facingTile();
      const ch = Maps.tileAt(player.map, f.x, f.y);
      const here = Maps.tileAt(player.map, Math.floor(player.x), Math.floor(player.y - 0.15));
      if (npc || animalNear() || bikeNear() || 'bvyQdgwhFYJ@I*&UVZ]9${'.includes(ch) ||
          '*&UZ$'.includes(here) || FLAVOR[ch]) {
        const bx = player.x * T - cam.x, by = (player.y - 1) * T - cam.y - 46;
        ctx.fillStyle = 'rgba(255,250,240,.92)';
        ctx.beginPath(); ctx.arc(bx, by, 13, 0, 7); ctx.fill();
        ctx.font = '700 15px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#b85c8a'; ctx.fillText('E', bx, by + 1);
      }
    }
    UI.drawTint(ctx, G.tmin, !!map.outdoor);
  }

  function drawPlayer(cam: Cam) {
    const sx = player.x * T - cam.x, sy = player.y * T - cam.y;
    if (player.swimming) {
      const c = SpriteLib.chr('starry', player.dir, 0);
      const w = c.width * SpriteLib.SCALE;
      const bob = Math.sin(time * 2.4) * 2;
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 2, 20 + Math.sin(time * 3) * 2, 8, 0, 0, 7);
      ctx.fill();
      const srcRows = 8;   // head + shoulders peeking out of the water
      ctx.drawImage(c, 0, 0, c.width, srcRows,
        Math.floor(sx - w / 2), Math.floor(sy - srcRows * SpriteLib.SCALE - 6 + bob),
        w, srcRows * SpriteLib.SCALE);
      return;
    }
    if (player.riding) {
      ctx.fillStyle = 'rgba(40,30,50,.22)';
      ctx.beginPath(); ctx.ellipse(sx, sy + 4, 24, 6, 0, 0, 7); ctx.fill();
      const c = SpriteLib.chr('starry', player.dir, playerFrame());
      const cw = c.width * SpriteLib.SCALE, chh = c.height * SpriteLib.SCALE;
      ctx.drawImage(c, Math.floor(sx - cw / 2), Math.floor(sy - chh - 5), cw, chh);
      const bc = SpriteLib.bike(player.dir);
      const bw = bc.width * SpriteLib.SCALE, bh = bc.height * SpriteLib.SCALE;
      ctx.drawImage(bc, Math.floor(sx - bw / 2), Math.floor(sy - bh + 6), bw, bh);
      return;
    }
    drawChar('starry', { x: player.x, y: player.y, dir: player.dir, moving: player.moving, animT: player.animT }, cam, playerFrame());
  }

  function drawAnimal(s: AnimState, cam: Cam) {
    const c = SpriteLib.animal(s.a.kind, s.dir);
    const w = c.width * SpriteLib.SCALE, h = c.height * SpriteLib.SCALE;
    const bob = Math.sin(s.t * 2.5) * 1.5;
    const sx = s.x * T - cam.x, sy = s.y * T - cam.y;
    ctx.fillStyle = 'rgba(40,30,50,.18)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 3, w * 0.32, 4, 0, 0, 7); ctx.fill();
    ctx.drawImage(c, Math.floor(sx - w / 2), Math.floor(sy - h + bob), w, h);
    if (G.fedDay[s.a.id] !== G.day) {   // a hungry thought bubble
      const by = sy - h - 16 + Math.sin(time * 3 + s.t) * 2;
      ctx.fillStyle = 'rgba(255,250,240,.92)';
      ctx.beginPath(); ctx.arc(sx, by, 12, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sx - 6, by + 12, 3, 0, 7); ctx.fill();
      ctx.drawImage(SpriteLib.icon('cookie'), sx - 8, by - 8, 16, 16);
    }
  }

  function drawChar(sprite: string, ns: { x: number; y: number; dir: string; moving?: boolean; animT?: number }, cam: Cam, forcedFrame?: number) {
    const frame = forcedFrame !== undefined ? forcedFrame
      : (ns.moving ? 1 + Math.floor((ns.animT || 0) * 6) % 2 : 0);
    const c = SpriteLib.chr(sprite, ns.dir, frame);
    if (!c) return;
    const w = c.width * SpriteLib.SCALE, h = c.height * SpriteLib.SCALE;
    const sx = Math.floor(ns.x * T - w / 2 - cam.x), sy = Math.floor(ns.y * T - h - cam.y) + 4;
    ctx.fillStyle = 'rgba(40,30,50,.22)';
    ctx.beginPath();
    ctx.ellipse(ns.x * T - cam.x, ns.y * T - cam.y + 4, w * 0.34, 6, 0, 0, 7);
    ctx.fill();
    ctx.drawImage(c, sx, sy, w, h);
  }

  const BFLY: Record<string, { x: number; y: number; c: string; p: number }[]> = {
    town: [
      { x: 6.5, y: 9.5, c: '#ff9ec5', p: 0 }, { x: 14.5, y: 4.5, c: '#cdb0ee', p: 2.1 },
      { x: 24.5, y: 9.0, c: '#ffd166', p: 4.2 }, { x: 33.5, y: 17.5, c: '#ff9ec5', p: 1.3 },
      { x: 44.5, y: 9.5, c: '#a8d8e8', p: 3.3 }, { x: 22.5, y: 28.0, c: '#ffd166', p: 5.1 },
      { x: 43.5, y: 28.5, c: '#cdb0ee', p: 0.7 }, { x: 46.5, y: 36.0, c: '#ff9ec5', p: 2.6 },
    ],
    city: [
      { x: 16.5, y: 26.5, c: '#ff9ec5', p: 0.4 }, { x: 46.5, y: 30.5, c: '#ffd166', p: 2.0 },
      { x: 40.5, y: 33.5, c: '#cdb0ee', p: 4.0 }, { x: 9.5, y: 30.0, c: '#a8d8e8', p: 1.5 },
      { x: 52.5, y: 24.5, c: '#ff9ec5', p: 3.1 },
    ],
    beach: [
      { x: 8.5, y: 9.5, c: '#ffd166', p: 0.8 }, { x: 25.5, y: 6.5, c: '#ff9ec5', p: 2.4 },
      { x: 33.5, y: 13.5, c: '#a8d8e8', p: 4.4 },
    ],
    farm: [
      { x: 10.5, y: 12.5, c: '#ff9ec5', p: 0.3 }, { x: 24.5, y: 18.5, c: '#ffd166', p: 1.9 },
      { x: 33.5, y: 8.5, c: '#cdb0ee', p: 3.6 }, { x: 38.5, y: 24.5, c: '#a8d8e8', p: 5.2 },
    ],
  };
  function drawButterflies(cam: Cam) {
    const list = BFLY[player.map];
    if (!list) return;
    for (const b of list) {
      const x = (b.x + Math.sin(time * 0.7 + b.p) * 0.9) * T - cam.x;
      const y = (b.y + Math.sin(time * 1.1 + b.p * 2) * 0.5) * T - cam.y - 30;
      const flap = Math.abs(Math.sin(time * 9 + b.p));
      ctx.fillStyle = b.c;
      ctx.fillRect(x - 3 - flap * 2, y - 2, 3, 5);
      ctx.fillRect(x + 1 + flap * 2, y - 2, 3, 5);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x, y - 1, 1, 4);
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    if (state === 'title') {
      UI.drawTitle(ctx, time, hasSave(), titleSel, titleStarted);
    } else if (state === 'minigame' && mg) {
      mg.draw(ctx);
      UI.drawToasts(ctx);
    } else if (state === 'summary') {
      UI.drawSummary(ctx, G, summaryInfo!, summaryT);
    } else {
      drawWorld();
      UI.drawHUD(ctx, { ...gview(), tmin: G.tmin });
      UI.drawLocation(ctx, locLabel, locT);
      UI.drawDialog(ctx);
      UI.drawToasts(ctx);
      if (state === 'book') UI.drawBook(ctx, G, bookSel);
      if (state === 'journal') UI.drawJournal(ctx, gview());
      if (state === 'map') UI.drawMap(ctx, {
        map: player.map, px: player.x, py: player.y, dir: player.dir, t: time,
        npcs: Entities.NPCS
          .filter(n => npcState[n.id] && npcState[n.id].map === player.map)
          .map(n => ({ x: npcState[n.id].x, y: npcState[n.id].y, friend: !!n.friend })),
      });
    }
    if (fade) {
      const a = fade.t < fade.dur ? fade.t / fade.dur : 1 - (fade.t - fade.dur) / fade.dur;
      ctx.fillStyle = `rgba(20,16,38,${Math.max(0, Math.min(1, a)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- input ----------
  const CODE_MAP: Record<string, string> = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyE: 'action', Enter: 'action', Space: 'action', Escape: 'back',
  };

  function newGame() {
    G = freshG();
    stats = { stars: 0, lines: [] };
    player.map = 'home'; player.x = 4.5; player.y = 6.6; player.dir = 'down';
    player.swimming = false; player.riding = false;
    bike.x = BIKE_HOME.x; bike.y = BIKE_HOME.y;
    placeNPCs();
    fadeTo(() => {
      state = 'play';
      setLocation('Monday — Day 1');
      UI.say('Mom', [
        'Good morning, my little star! ☆',
        'Today is Monday — a school day! Circle time with Ms. Bloom starts at 9.',
        'Walk with the arrow keys, and press E to talk to people and poke at things.',
        'Your little pink bike is parked outside — press E next to it to ride!',
        "Earn stars in class and spend them at Mr. Scoop's. Off you go, sweet pea!",
      ]);
      G.flags.intro = true;
    });
  }
  function continueGame() {
    if (!load()) return newGame();
    stats = { stars: 0, lines: [] };
    player.map = 'home'; player.x = 2.5; player.y = 2.7; player.dir = 'right';
    player.swimming = false; player.riding = false;
    bike.x = BIKE_HOME.x; bike.y = BIKE_HOME.y;
    placeNPCs();
    fadeTo(() => {
      state = 'play';
      setLocation(UI.DAY_NAMES[dow()] + ' — Day ' + G.day);
    });
  }

  function onKey(e: KeyboardEvent) {
    if (e.repeat && state !== 'play') return;
    const act = CODE_MAP[e.code];
    if (CODE_MAP[e.code] || ['KeyB', 'KeyJ', 'KeyM', 'KeyN'].includes(e.code)) e.preventDefault();
    if (!audioReady) {
      AudioSys.init(); AudioSys.resume();
      audioReady = true;
    }
    AudioSys.resume();
    if (e.code === 'KeyN') {
      const on = AudioSys.toggleMusic();
      UI.toast(on ? 'Music on ♪' : 'Music off', 'note');
      return;
    }
    if (state === 'title') {
      if (!titleStarted) { titleStarted = true; AudioSys.sfx('confirm'); return; }
      const n = hasSave() ? 2 : 1;
      if (act === 'up' || act === 'down') { titleSel = (titleSel + 1) % n; AudioSys.sfx('blip'); }
      if (act === 'action') {
        AudioSys.sfx('confirm');
        if (hasSave() && titleSel === 0) continueGame();
        else newGame();
      }
      return;
    }
    if (state === 'minigame' && mg) { if (act) mg.key(act); return; }
    if (state === 'summary') {
      if (act === 'action' && summaryT > 0.8) { AudioSys.sfx('confirm'); newDay(); }
      return;
    }
    if (state === 'book') {
      const n = Entities.STICKERS.length, cols = 8;
      if (act === 'left') bookSel = (bookSel + n - 1) % n;
      if (act === 'right') bookSel = (bookSel + 1) % n;
      if (act === 'up') bookSel = (bookSel + n - cols) % n;
      if (act === 'down') bookSel = (bookSel + cols) % n;
      if (act === 'left' || act === 'right' || act === 'up' || act === 'down') AudioSys.sfx('blip');
      if (e.code === 'KeyB' || act === 'back' || act === 'action') state = 'play';
      return;
    }
    if (state === 'journal') {
      if (e.code === 'KeyJ' || act === 'back' || act === 'action') state = 'play';
      return;
    }
    if (state === 'map') {
      if (e.code === 'KeyM' || act === 'back' || act === 'action') { state = 'play'; AudioSys.sfx('blip'); }
      return;
    }
    // play state
    if (UI.active()) { if (act && !e.repeat) UI.dialogKey(act); return; }
    if (e.code === 'KeyB') { state = 'book'; AudioSys.sfx('select'); return; }
    if (e.code === 'KeyJ') { state = 'journal'; AudioSys.sfx('select'); return; }
    if (e.code === 'KeyM') { state = 'map'; AudioSys.sfx('select'); return; }
    if (act === 'action' && !e.repeat && !fade) { interact(); return; }
    if (['left', 'right', 'up', 'down'].includes(act)) held.add(act);
  }
  function onKeyUp(e: KeyboardEvent) {
    const act = CODE_MAP[e.code];
    if (act) held.delete(act);
  }

  // ---------- boot ----------
  function loop(ts: number) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    time += dt;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function init() {
    canvas = document.getElementById('game') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    SpriteLib.build();
    Maps.init();
    G = freshG();
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => held.clear());
    requestAnimationFrame(loop);
  }

  return { init };
})();

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => Game.init());
  // dev harness hook: check.js / smoke.js reach the modules through here
  (window as any).Starry = { Game, Maps, Entities, SpriteLib, AudioSys, UI, Minigames };
}
