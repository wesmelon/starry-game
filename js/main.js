/* ======================================================================
   Starry ☆ Little Days — main.js
   Game loop, world simulation, schedule, rewards, save/load, rendering.
   ====================================================================== */

const Game = (() => {

  const T = SpriteLib.TILE * SpriteLib.SCALE; // 48 px per tile
  const SAVE_KEY = 'starry-little-days';
  const MIN_PER_SEC = 2;        // 1 real second = 2 game minutes
  const DAY_START = 7 * 60, DAY_END = 22 * 60;

  let canvas, ctx;
  let state = 'title';          // title | play | minigame | book | journal | map | summary
  let titleStarted = false, titleSel = 0;
  let audioReady = false;
  let time = 0, last = 0;
  let mg = null;                // active minigame
  let bookSel = 0;
  let fade = null;              // {t, dur, mid, fired}
  let locT = 0, locLabel = '';
  let summaryInfo = null, summaryT = 0;
  let prevTmin = 0;
  let stepT = 0;

  // ---------- persistent state ----------
  let G = null;
  function freshG() {
    return {
      day: 1, tmin: DAY_START, stars: 0, energy: 100,
      skills: { letters: 0, swim: 0, ballet: 0 },
      hearts: {}, stickers: [], duckFood: 0, treats: 0, fedDay: {},
      done: { school: false, swim: false, ballet: false },
      talked: {}, counts: { school: 0, swim: 0, ballet: 0 },
      fun: {},
      flags: {},
    };
  }
  function dow() { return (G.day - 1) % 7; }      // 0 = Monday
  function hour() { return G.tmin / 60; }
  function gview() { return { day: G.day, dow: dow(), hour: hour(), tmin: G.tmin, stars: G.stars, energy: G.energy, skills: G.skills, hearts: G.hearts, stickers: G.stickers, duckFood: G.duckFood, treats: G.treats }; }

  let stats = { stars: 0, lines: [] };

  // ---------- player & npcs ----------
  const player = { map: 'home', x: 4.5, y: 6.6, dir: 'down', moving: false, animT: 0, swimming: false, riding: false };
  const BIKE_HOME = { x: 12.5, y: 6.8 };
  const bike = { x: BIKE_HOME.x, y: BIKE_HOME.y };   // lives on the town map
  let waterHintT = 0;
  const npcState = {};   // id -> {map,x,y,dir,homeX,homeY,wT,animT,moving,pauseT}
  // critters drift gently around their home spot on the town map
  const animState = Entities.ANIMALS.map(a => ({ a, x: a.x, y: a.y, t: (a.x * 7) % 6, dir: 'left' }));

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
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!raw || !raw.G) return false;
      G = Object.assign(freshG(), raw.G);
      G.skills = Object.assign({ letters: 0, swim: 0, ballet: 0 }, raw.G.skills);
      G.done = Object.assign({ school: false, swim: false, ballet: false }, raw.G.done);
      return true;
    } catch (e) { return false; }
  }

  // ---------- helpers ----------
  function fadeTo(mid) { fade = { t: 0, dur: 0.45, mid, fired: false }; }
  function setLocation(label) { locLabel = label; locT = 2.4; }
  function award(id) {
    if (G.stickers.includes(id)) return;
    const st = Entities.STICKERS.find(s => s.id === id);
    G.stickers.push(id);
    stats.lines.push('New sticker: ' + st.name);
    UI.toast('New sticker: ' + st.name + '!', st.icon);
    AudioSys.sfx('sticker');
  }
  function gainStars(n) { G.stars += n; stats.stars += n; }
  // a little play activity: the first time each day it gives stars (and/or a
  // snack of energy); after that it's just for fun. Returns true the first time.
  function funReward(id, stars, energy) {
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
  function crossed(min) { return prevTmin < min && G.tmin >= min; }

  // ---------- class logic ----------
  const CLASS_INFO = {
    school: { label: 'School', skill: 'letters', firstSticker: 'firstday',
              prompt: 'Good morning, Starry! Ready for circle time?',
              days: [0, 1, 2, 3, 4], from: 8, to: 11.5 },
    swim:   { label: 'Swim', skill: 'swim', firstSticker: 'splash',
              prompt: 'Ready to make a big splash today?',
              days: [1, 3], from: 13, to: 16 },
    ballet: { label: 'Ballet', skill: 'ballet', firstSticker: 'twirl',
              prompt: 'Shall we dance, petite étoile?',
              days: [0, 2, 4], from: 13, to: 16 },
  };
  function classAvailable(type) {
    const c = CLASS_INFO[type];
    return c.days.includes(dow()) && hour() >= c.from && hour() < c.to && !G.done[type];
  }
  function startClass(type) {
    state = 'minigame';
    mg = Minigames[type === 'school' ? 'school' : type === 'swim' ? 'swim' : 'ballet'](
      (stars, perfect) => endClass(type, stars, perfect));
  }
  function endClass(type, stars, perfect) {
    const c = CLASS_INFO[type];
    const total = stars + (perfect ? 1 : 0);
    gainStars(total);
    G.energy = Math.max(0, G.energy - 20);
    G.done[type] = true;
    G.counts[type]++;
    const before = Entities.skillLevel(G.skills[c.skill]);
    G.skills[c.skill]++;
    const after = Entities.skillLevel(G.skills[c.skill]);
    if (type === 'school') G.tmin = Math.max(G.tmin, 12 * 60);
    else G.tmin = Math.min(G.tmin + 75, DAY_END - 10);
    award(c.firstSticker);
    stats.lines.push(c.label + ' class: ' + '★'.repeat(stars) + (perfect ? ' (perfect!)' : ''));
    UI.toast('+' + total + ' stars!', 'star');
    if (after > before) {
      const sk = Entities.SKILLS[c.skill];
      UI.toast(sk.label + ' is now Lv ' + after + ': ' + sk.titles[after - 1] + '!', 'medal');
      const milestones = {
        letters: { 3: 'abc', 5: 'scholar' }, swim: { 3: 'goldfish', 5: 'dolphin' }, ballet: { 3: 'tutu', 5: 'prima' },
      }[c.skill];
      if (milestones && milestones[after]) award(milestones[after]);
    }
    mg = null;
    state = 'play';
  }

  // ---------- shop ----------
  function openShop(npc) {
    const ids = npc.stock || Entities.SHOP_ITEMS.map(i => i.id);
    const stock = ids.map(id => Entities.SHOP_ITEMS.find(i => i.id === id)).filter(Boolean);
    const opts = stock.map(it => ({ label: it.name + '  (' + it.cost + '★)', value: it.id }));
    opts.push({ label: 'Just looking!', value: null });
    const who = npc.shopName || npc.name;
    UI.choose(who, npc.greeting || 'What would you like?', opts, (val) => {
      if (!val) return;
      const it = Entities.SHOP_ITEMS.find(i => i.id === val);
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
      } else {
        G.energy = Math.min(100, G.energy + it.energy);
        AudioSys.sfx('munch');
        award(npc.bakery ? 'baker' : 'sweet');
        UI.say('Starry', [it.line]);
      }
      AudioSys.sfx('confirm');
    });
  }

  // ---------- sleeping ----------
  function goToSleep(napOnly) {
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
      G.done = { school: false, swim: false, ballet: false };
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

  // ---------- interaction ----------
  const FLAVOR = {
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
    i: ['The sign says: City Bus Stop! Hop on to ride between Starview Meadow and Starbright City.'],
    l: ['The sign says: Storytime Library! Pick a book and read with Miss Paige.'],
    j: ['The sign says: Tippy Top Toys! Blocks, balls, and wind-up froggies.'],
    N: ['The sign says: Honey Bun Bakery! Muffins, cocoa, and twisty pretzels.'],
  };

  function facingTile() {
    const tx = Math.floor(player.x), ty = Math.floor(player.y - 0.1);
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir];
    return { x: tx + d[0], y: ty + d[1] };
  }
  function npcNearFace() {
    const f = facingTile();
    const fx = f.x + 0.5, fy = f.y + 0.5;
    let best = null, bd = 1.45;
    for (const n of Entities.NPCS) {
      const ns = npcState[n.id];
      if (!ns || ns.map !== player.map) continue;
      const dd = Math.hypot(ns.x - fx, (ns.y - 0.5) - fy);
      if (dd < bd) { bd = dd; best = n; }
    }
    return best;
  }

  function animalNear() {
    let best = null, bd = 1.5;
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
  function feedAnimal(s) {
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
      if (sameMap.every(an => G.fedDay[an.id] === G.day)) award(a.map === 'city' ? 'zoo' : 'critters');
    } else {
      UI.say(a.name, [a.hungry, 'Mr. Scoop sells Critter Treats at the sweet shop!']);
    }
  }

  function interact() {
    if (player.riding) return dismountHere();
    const npc = npcNearFace();
    if (npc) return talkTo(npc);
    const anim = animalNear();
    if (anim) return feedAnimal(anim);
    if (bikeNear()) {
      player.riding = true;
      AudioSys.sfx('bell');
      award('zoom');
      return;
    }
    const f = facingTile();
    const ch = Maps.tileAt(player.map, f.x, f.y);
    if (ch === 'b' || ch === 'v') {
      if (hour() >= 18) {
        UI.choose('', 'All tucked in and sleepy?', [
          { label: 'Goodnight! ☆', value: 'sleep' }, { label: 'Not yet', value: null },
        ], v => { if (v) goToSleep(false); });
      } else if (G.energy < 40) {
        UI.choose('', 'A little nap to recharge?', [
          { label: 'Nap time', value: 'nap' }, { label: 'No nap!', value: null },
        ], v => { if (v) goToSleep(true); });
      } else UI.say('Starry', ['Not sleepy yet! The day is still big.']);
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
      AudioSys.sfx('whee');
      funReward('slide', 1);
      award('whee');
      UI.say('Starry', ['Up the ladder... aaaand... WHEEEE!']);
      return;
    }
    if (ch === 'g') {
      AudioSys.sfx('whee');
      funReward('swing', 1);
      award('swing');
      UI.say('Starry', ['Higher! Higher! Starry can almost touch the clouds!']);
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
      AudioSys.sfx('whee');
      funReward('seesaw', 1);
      award('seesaw');
      UI.say('Starry', ['Up... and down... and UP! The see-saw goes wheee — bonk!']);
      return;
    }
    if (ch === '@') {
      AudioSys.sfx('ride');
      const first = funReward('carousel', 2);
      award('carousel');
      UI.say('Starry', [first ? 'Round and round on a sparkly horsie! The ticket man gives Starry TWO gold stars!'
                              : 'Another loop on the carousel! Starry waves on every single turn.']);
      return;
    }
    if (ch === 'I') {
      AudioSys.sfx('pop');
      funReward('balloon', 1);
      award('balloon');
      UI.say('Starry', ['A big shiny balloon, just for Starry! She holds the string SO tight.']);
      return;
    }
    if (ch === 'V') {
      AudioSys.sfx('sparkle');
      funReward('bubbles', 1);
      award('bubbles');
      UI.say('Starry', ['Big bubbles, little bubbles, a WHOLE bunch of bubbles! Pop! Pop! Pop!']);
      return;
    }
    // things you can be standing right on top of (flowers, sandcastle, hopscotch)
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
    if (ch === 'U' || here === 'U') {
      AudioSys.sfx('whee');
      funReward('hop', 1);
      award('hop');
      UI.say('Starry', ['One foot, two foot, hop-hop-HOP! Starry did the whole hopscotch!']);
      return;
    }
    if (FLAVOR[ch]) UI.say('', FLAVOR[ch]);
  }

  function talkTo(npc) {
    const ns = npcState[npc.id];
    // face each other
    ns.pauseT = 2.5;
    ns.dir = player.x < ns.x - 0.3 ? 'left' : player.x > ns.x + 0.3 ? 'right' : (player.y < ns.y ? 'up' : 'down');
    if (npc.shop) return openShop(npc);
    if (npc.teaches && classAvailable(npc.teaches)) {
      const c = CLASS_INFO[npc.teaches];
      if (G.energy < 20) {
        UI.say(npc.name, ['Oh my, those are sleepy eyes! Have a snack or a nap first, little one.']);
        return;
      }
      UI.choose(npc.name, c.prompt, [
        { label: "Let's go!", value: 'yes' }, { label: 'Not yet', value: null },
      ], v => { if (v) startClass(npc.teaches); });
      return;
    }
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
  const held = new Set();
  function moveDir() {
    let dx = 0, dy = 0;
    if (held.has('left')) dx -= 1;
    if (held.has('right')) dx += 1;
    if (held.has('up')) dy -= 1;
    if (held.has('down')) dy += 1;
    return { dx, dy };
  }
  function canSwim() { return G.skills.swim >= 1; }
  function blocked(x, y) {
    const hw = 0.27;
    for (const [ox, oy] of [[-hw, -0.35], [hw, -0.35], [-hw, 0.02], [hw, 0.02]]) {
      const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
      if (Maps.isSolid(player.map, tx, ty)) return true;
      // water needs a swim lesson first, and bikes stay on dry land
      if (Maps.isWater(player.map, tx, ty) && (player.riding || !canSwim())) return true;
    }
    return false;
  }
  function updatePlayer(dt) {
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
  function doWarp(w) {
    held.clear();
    fadeTo(() => {
      player.map = w.map;
      player.x = w.x + 0.5;
      player.y = w.y + 0.85;
      player.dir = w.dir;
      if (w.map === 'city') award('citytrip');
      setLocation(Maps.get(w.map).label);
    });
  }
  function playerFrame() {
    return player.moving ? 1 + Math.floor(player.animT * 6) % 2 : 0;
  }

  function updateNPCs(dt) {
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
      if (ns.tx !== null && ns.tx !== undefined) {
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

  function updateAnimals(dt) {
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

  function updateDucks(dt) {
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
  function updateClock(dt) {
    prevTmin = G.tmin;
    G.tmin += dt * MIN_PER_SEC;
    const d = dow();
    if (crossed(8 * 60 + 40) && d <= 4 && !G.done.school) UI.toast('School starts at 9! Off to Sunny Sprouts!', 'block');
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
  function update(dt) {
    UI.toastUpdate(dt);
    if (fade) {
      fade.t += dt;
      if (fade.t >= fade.dur && !fade.fired) { fade.fired = true; if (fade.mid) fade.mid(); }
      if (fade.t >= fade.dur * 2) fade = null;
    }
    if (state === 'play') {
      UI.dialogUpdate(dt);
      if (!UI.active() && !fade) {
        updatePlayer(dt);
        updateClock(dt);
      }
      updateNPCs(dt);
      updateAnimals(dt);
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
    // entities sorted by y
    const ents = [];
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
    drawButterflies(cam);
    // interaction hint
    if (state === 'play' && !UI.active() && !fade && !player.riding) {
      const npc = npcNearFace();
      const f = facingTile();
      const ch = Maps.tileAt(player.map, f.x, f.y);
      if (npc || animalNear() || bikeNear() || 'bvyQdgwhFYJ@I*&UV'.includes(ch) || FLAVOR[ch]) {
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

  function drawPlayer(cam) {
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

  function drawAnimal(s, cam) {
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

  function drawChar(sprite, ns, cam, forcedFrame) {
    const frame = forcedFrame !== undefined ? forcedFrame
      : (ns.moving ? 1 + Math.floor(ns.animT * 6) % 2 : 0);
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

  const BFLY = {
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
  };
  function drawButterflies(cam) {
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
      UI.drawSummary(ctx, G, summaryInfo, summaryT);
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
  const CODE_MAP = {
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

  function onKey(e) {
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
  function onKeyUp(e) {
    const act = CODE_MAP[e.code];
    if (act) held.delete(act);
  }

  // ---------- boot ----------
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    time += dt;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
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
}
