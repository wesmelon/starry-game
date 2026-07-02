/* ======================================================================
   Starry ☆ Little Days — minigames.js
   Three toddler-sized class activities. Each factory returns
   { update(dt), draw(g), key(action) } and calls done(stars, perfect).
   Everyone gets at least one star — this is a kind game.
   ====================================================================== */

const Minigames = (() => {

  const FONT = (s, w = 700) => `${w} ${s}px "Comic Sans MS", "Segoe UI", sans-serif`;

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function panel(g, x, y, w, h, fill) {
    g.save();
    g.shadowColor = 'rgba(60,30,60,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    rr(g, x, y, w, h, 18); g.fillStyle = fill; g.fill();
    g.restore();
  }
  function label(g, txt, x, y, size, col, align = 'center', weight = 700) {
    g.font = FONT(size, weight); g.textAlign = align; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 7); g.strokeStyle = 'rgba(255,255,255,.85)';
    g.strokeText(txt, x, y);
    g.fillStyle = col; g.fillText(txt, x, y);
  }
  function starPath(g, cx, cy, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 ? r * 0.45 : r;
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }
  function drawStars(g, cx, cy, n, t) {
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * 90;
      const pop = Math.min(1, Math.max(0, t * 1.5 - i * 0.45));
      const r = 34 * (i < n ? (0.5 + 0.5 * pop) : 1);
      starPath(g, x, cy, r);
      g.fillStyle = i < n ? '#ffd95f' : 'rgba(120,110,140,.25)';
      g.fill();
      if (i < n) { g.strokeStyle = '#e8a020'; g.lineWidth = 3; g.stroke(); }
    }
  }
  function sprite(g, name, dir, frame, x, y, scale) {
    const c = SpriteLib.chr(name, dir, frame);
    if (c) g.drawImage(c, x - c.width * scale / 2, y - c.height * scale, c.width * scale, c.height * scale);
  }
  function resultUpdate(mg, dt) { mg.rt += dt; }
  function resultScreen(g, W, H, title, sub, stars, t) {
    panel(g, W / 2 - 260, H / 2 - 150, 520, 300, '#fff8ee');
    label(g, title, W / 2, H / 2 - 95, 34, '#b85c8a');
    drawStars(g, W / 2, H / 2, stars, t);
    label(g, sub, W / 2, H / 2 + 70, 19, '#7a6a8a');
    if (t > 1.2 && Math.floor(t * 2) % 2 === 0) label(g, 'Press E to finish', W / 2, H / 2 + 112, 16, '#9a8ab8');
  }

  /* ================= SCHOOL : Letter Time ================= */
  const LETTERS = 'ABCDEFGHKMPRST'.split('');
  const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
  const COLORS = [['red', '#e85a5a'], ['blue', '#5a8ae8'], ['green', '#6ab85f'], ['yellow', '#f0c040'], ['pink', '#f08ab8'], ['purple', '#9a7ad0']];

  function drawShape(g, kind, cx, cy, r, col) {
    g.fillStyle = col;
    if (kind === 'circle') { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
    else if (kind === 'square') { g.fillRect(cx - r * .85, cy - r * .85, r * 1.7, r * 1.7); }
    else if (kind === 'triangle') {
      g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy + r * .8); g.lineTo(cx - r, cy + r * .8);
      g.closePath(); g.fill();
    }
    else if (kind === 'star') { starPath(g, cx, cy, r); g.fill(); }
    else if (kind === 'heart') {
      g.beginPath();
      g.moveTo(cx, cy + r * .9);
      g.bezierCurveTo(cx - r * 1.4, cy - r * .1, cx - r * .7, cy - r, cx, cy - r * .35);
      g.bezierCurveTo(cx + r * .7, cy - r, cx + r * 1.4, cy - r * .1, cx, cy + r * .9);
      g.fill();
    }
  }
  function pickN(arr, n) {
    const pool = arr.slice(), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  function school(done) {
    const ROUNDS = 5;
    const mg = { phase: 'intro', round: 0, score: 0, sel: 1, t: 0, rt: 0, fb: 0, fbGood: false, q: null };
    function newQ() {
      const type = ['letter', 'shape', 'color'][Math.floor(Math.random() * 3)];
      let opts, prompt;
      if (type === 'letter') { opts = pickN(LETTERS, 3); prompt = 'Find the letter ' + opts[0] + '!'; }
      else if (type === 'shape') { opts = pickN(SHAPES, 3); prompt = 'Find the ' + opts[0] + '!'; }
      else { opts = pickN(COLORS, 3); prompt = 'Find the ' + opts[0][0] + ' balloon!'; }
      const answer = opts[0];
      const shuffled = pickN(opts, 3);
      mg.q = { type, prompt, opts: shuffled, ans: shuffled.indexOf(answer) };
      mg.sel = 1; mg.fb = 0;
    }
    mg.key = (act) => {
      if (mg.phase === 'intro' && act === 'action') { mg.phase = 'play'; newQ(); AudioSys.sfx('confirm'); return; }
      if (mg.phase === 'result' && act === 'action' && mg.rt > 1) { done(mg.stars, mg.score === ROUNDS); return; }
      if (mg.phase !== 'play' || mg.fb > 0) return;
      if (act === 'left') { mg.sel = Math.max(0, mg.sel - 1); AudioSys.sfx('blip'); }
      if (act === 'right') { mg.sel = Math.min(2, mg.sel + 1); AudioSys.sfx('blip'); }
      if (act === 'action') {
        mg.fbGood = mg.sel === mg.q.ans;
        mg.fb = mg.fbGood ? 0.9 : 1.4;
        if (mg.fbGood) { mg.score++; AudioSys.sfx('star'); } else AudioSys.sfx('deny');
      }
    };
    mg.update = (dt) => {
      mg.t += dt;
      if (mg.phase === 'result') resultUpdate(mg, dt);
      if (mg.fb > 0) {
        mg.fb -= dt;
        if (mg.fb <= 0) {
          mg.round++;
          if (mg.round >= ROUNDS) {
            mg.stars = mg.score >= 5 ? 3 : mg.score >= 3 ? 2 : 1;
            mg.phase = 'result'; mg.rt = 0;
            AudioSys.sfx(mg.stars === 3 ? 'fanfare' : 'yay');
          } else newQ();
        }
      }
    };
    mg.draw = (g) => {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#fdf3dc'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#3f7a5a'; g.fillRect(W / 2 - 330, 30, 660, 110);
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 10; g.strokeRect(W / 2 - 330, 30, 660, 110);
      if (mg.phase === 'intro') {
        label(g, 'Letter Time!', W / 2, 86, 40, '#fff8ee');
        panel(g, W / 2 - 300, 220, 600, 220, '#fff8ee');
        label(g, 'Ms. Bloom asks 5 little questions.', W / 2, 290, 22, '#5a4a6a');
        label(g, 'Arrows pick a card · E chooses it', W / 2, 335, 22, '#5a4a6a');
        label(g, 'Press E to start!', W / 2, 400, 24, '#b85c8a');
        sprite(g, 'msbloom', 'down', 0, W / 2, 590, 5);
        return;
      }
      if (mg.phase === 'result') {
        resultScreen(g, W, H, 'Class is over!', mg.score + ' of 5 — wonderful!', mg.stars, mg.rt);
        return;
      }
      label(g, mg.q.prompt, W / 2, 86, 34, '#fff8ee');
      label(g, 'Question ' + (mg.round + 1) + ' of 5   ·   ★ ' + mg.score, W / 2, 175, 20, '#9a7ad0');
      for (let i = 0; i < 3; i++) {
        const x = W / 2 + (i - 1) * 230 - 95, y = 230, w = 190, h = 230;
        const isSel = i === mg.sel;
        let fill = isSel ? '#fff' : '#fff8ee';
        if (mg.fb > 0 && i === mg.q.ans) fill = '#d8f5c8';
        if (mg.fb > 0 && !mg.fbGood && i === mg.sel) fill = '#f8d0d0';
        panel(g, x, y + (isSel ? -12 : 0), w, h, fill);
        if (isSel) { rr(g, x, y - 12, w, h, 18); g.strokeStyle = '#ffb84f'; g.lineWidth = 5; g.stroke(); }
        const cy = y + h / 2 + (isSel ? -12 : 0), cx = x + w / 2;
        const o = mg.q.opts[i];
        if (mg.q.type === 'letter') label(g, o, cx, cy, 86, '#5a6ac8');
        else if (mg.q.type === 'shape') drawShape(g, o, cx, cy, 55, '#f08ab8');
        else { drawShape(g, 'circle', cx, cy - 8, 48, o[1]); g.strokeStyle = '#888'; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx, cy + 78); g.stroke(); }
      }
      sprite(g, 'starry', 'up', Math.floor(mg.t * 2) % 2 ? 1 : 2, W / 2, H - 18, 4);
    };
    return mg;
  }

  /* ================= SWIM : Splash Dash ================= */
  function swim(done) {
    const GOAL = 100, DUCK_TIME = 14;
    const mg = { phase: 'intro', t: 0, rt: 0, dist: 0, vel: 0, last: null, time: 0, bubbles: [], kick: 0 };
    mg.key = (act) => {
      if (mg.phase === 'intro' && act === 'action') { mg.phase = 'play'; AudioSys.sfx('splash'); return; }
      if (mg.phase === 'result' && act === 'action' && mg.rt > 1) { done(mg.stars, mg.beatDuck); return; }
      if (mg.phase !== 'play') return;
      if ((act === 'left' || act === 'right') && act !== mg.last) {
        mg.last = act;
        mg.vel = Math.min(mg.vel + 16, 34);
        mg.kick = 0.25;
        AudioSys.sfx('pop');
        for (let i = 0; i < 3; i++) mg.bubbles.push({ x: 0, y: Math.random() * 20 - 10, vy: -20 - Math.random() * 30, r: 2 + Math.random() * 4, life: 1 });
      }
    };
    mg.update = (dt) => {
      mg.t += dt;
      if (mg.phase === 'result') resultUpdate(mg, dt);
      if (mg.phase !== 'play') return;
      mg.time += dt;
      mg.vel = Math.max(0, mg.vel - 14 * dt);
      mg.dist += mg.vel * dt;
      mg.kick = Math.max(0, mg.kick - dt);
      for (const b of mg.bubbles) { b.y += b.vy * dt; b.life -= dt * 1.4; }
      mg.bubbles = mg.bubbles.filter(b => b.life > 0);
      if (mg.dist >= GOAL) {
        mg.beatDuck = mg.time < DUCK_TIME;
        mg.stars = mg.beatDuck ? 3 : mg.time < 22 ? 2 : 1;
        mg.phase = 'result'; mg.rt = 0;
        AudioSys.sfx(mg.stars === 3 ? 'fanfare' : 'yay');
      }
    };
    mg.draw = (g) => {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#d4f0f8'; g.fillRect(0, 0, W, H);
      // water
      const wy = 230;
      g.fillStyle = '#6fc7e8'; g.fillRect(0, wy, W, H - wy);
      g.fillStyle = '#8fd6ef';
      for (let x = 0; x < W; x += 40) {
        const yy = wy + 8 + Math.sin(mg.t * 2.5 + x * 0.05) * 5;
        g.fillRect(x, yy, 26, 4);
      }
      if (mg.phase === 'intro') {
        panel(g, W / 2 - 310, 60, 620, 150, '#fff8ee');
        label(g, 'Splash Dash!', W / 2, 105, 36, '#3a8ab8');
        label(g, 'Paddle with ← and → , one after the other!', W / 2, 155, 21, '#5a4a6a');
        label(g, 'Can you swim across before Ducky? Press E!', W / 2, 185, 21, '#b85c8a');
        sprite(g, 'coach', 'down', 0, W / 2, wy - 6, 4);
        return;
      }
      if (mg.phase === 'result') {
        resultScreen(g, W, H, mg.beatDuck ? 'You beat Ducky!' : 'You made it!',
          'Across the pool in ' + mg.time.toFixed(1) + 's', mg.stars, mg.rt);
        return;
      }
      // progress lane
      const pad = 90, laneW = W - pad * 2;
      g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, pad, 60, laneW, 16, 8); g.fill();
      const duckDist = Math.min(GOAL, GOAL * mg.time / DUCK_TIME);
      g.fillStyle = '#ffd95f'; rr(g, pad, 60, laneW * duckDist / GOAL, 16, 8); g.fill();
      g.fillStyle = '#3a8ab8'; rr(g, pad, 60, laneW * Math.min(1, mg.dist / GOAL), 16, 8); g.fill();
      label(g, mg.time.toFixed(1) + 's', W - 60, 68, 20, '#3a8ab8');
      label(g, 'paddle ← → !', W / 2, 110, 20, '#3a8ab8');
      // duck pacer
      const duckX = pad + laneW * duckDist / GOAL;
      const dc = SpriteLib.duck('right');
      g.drawImage(dc, duckX - 20, wy + 60 + Math.sin(mg.t * 3) * 4, 40, 28);
      // starry swimming
      const sx = pad + laneW * Math.min(1, mg.dist / GOAL);
      const sy = wy + 130 + Math.sin(mg.t * 4) * 5;
      g.save();
      g.translate(sx, sy);
      g.rotate(Math.PI / 2 - 0.25 + (mg.kick > 0 ? -0.15 : 0));
      const c = SpriteLib.chr('starry', 'up', mg.kick > 0 ? 1 : 0);
      g.drawImage(c, -c.width * 1.8, -c.height * 1.8, c.width * 3.6, c.height * 3.6);
      g.restore();
      for (const b of mg.bubbles) {
        g.fillStyle = 'rgba(255,255,255,' + Math.max(0, b.life * .7) + ')';
        g.beginPath(); g.arc(sx - 30 + b.x, sy + b.y, b.r, 0, 7); g.fill();
      }
      sprite(g, 'coach', 'down', 0, 60, wy - 6, 3);
    };
    return mg;
  }

  /* ================= BALLET : Waltz Steps ================= */
  const POSES = {
    up: { name: 'Arabesque!', note: 'A5' },
    down: { name: 'Plié!', note: 'E5' },
    left: { name: 'Twirl left!', note: 'C5' },
    right: { name: 'Twirl right!', note: 'G5' },
  };
  const DIRS = ['up', 'down', 'left', 'right'];

  function ballet(done) {
    const mg = { phase: 'intro', t: 0, rt: 0, round: 0, passed: 0, mistakes: 0, seq: [], showI: 0, showT: 0, inputI: 0, flash: {}, msg: '', msgT: 0 };
    function startRound() {
      const len = 3 + mg.round;
      mg.seq = [];
      for (let i = 0; i < len; i++) mg.seq.push(DIRS[Math.floor(Math.random() * 4)]);
      mg.phase = 'show'; mg.showI = 0; mg.showT = 0.8; mg.inputI = 0;
      mg.msg = 'Watch Madame...'; mg.msgT = 99;
    }
    function flashDir(d, good) { mg.flash[d] = { t: 0.35, good }; }
    mg.key = (act) => {
      if (mg.phase === 'intro' && act === 'action') { startRound(); AudioSys.sfx('confirm'); return; }
      if (mg.phase === 'result' && act === 'action' && mg.rt > 1) { done(mg.stars, mg.mistakes === 0); return; }
      if (mg.phase !== 'input' || !DIRS.includes(act)) return;
      const want = mg.seq[mg.inputI];
      if (act === want) {
        AudioSys.sfx('note', POSES[act].note);
        flashDir(act, true);
        mg.inputI++;
        mg.msg = POSES[act].name; mg.msgT = 0.8;
        if (mg.inputI >= mg.seq.length) {
          mg.passed++;
          mg.msg = 'Beautiful!'; mg.msgT = 1.2;
          AudioSys.sfx('yay');
          nextRound();
        }
      } else {
        AudioSys.sfx('deny');
        flashDir(act, false);
        mg.mistakes++;
        mg.msg = 'Almost! A wobble is just a twirl learning.'; mg.msgT = 1.5;
        nextRound();
      }
    };
    function nextRound() {
      mg.round++;
      if (mg.round >= 3) {
        mg.stars = Math.max(1, mg.passed);
        mg.phase = 'result'; mg.rt = 0;
        AudioSys.sfx(mg.stars === 3 ? 'fanfare' : 'yay');
      } else {
        mg.phase = 'wait'; mg.waitT = 1.3;
      }
    }
    mg.update = (dt) => {
      mg.t += dt; mg.msgT -= dt;
      for (const d of DIRS) if (mg.flash[d]) { mg.flash[d].t -= dt; if (mg.flash[d].t <= 0) delete mg.flash[d]; }
      if (mg.phase === 'result') resultUpdate(mg, dt);
      if (mg.phase === 'wait') { mg.waitT -= dt; if (mg.waitT <= 0) startRound(); }
      if (mg.phase === 'show') {
        mg.showT -= dt;
        if (mg.showT <= 0) {
          if (mg.showI < mg.seq.length) {
            const d = mg.seq[mg.showI];
            AudioSys.sfx('note', POSES[d].note);
            flashDir(d, true);
            mg.showI++; mg.showT = 0.65;
          } else {
            mg.phase = 'input';
            mg.msg = 'Your turn, little star!'; mg.msgT = 99;
          }
        }
      }
    };
    function arrow(g, cx, cy, dir, size, col) {
      g.save(); g.translate(cx, cy);
      const rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir];
      g.rotate(rot);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, -size); g.lineTo(size * .85, size * .2); g.lineTo(size * .35, size * .2);
      g.lineTo(size * .35, size); g.lineTo(-size * .35, size); g.lineTo(-size * .35, size * .2);
      g.lineTo(-size * .85, size * .2);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(90,60,110,.4)'; g.lineWidth = 3; g.stroke();
      g.restore();
    }
    mg.draw = (g) => {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#f3e6f5'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#eed9ab'; g.fillRect(0, H - 180, W, 180);
      g.fillStyle = '#d4ecf2'; g.fillRect(60, 40, W - 120, 130);
      g.strokeStyle = '#a89ab8'; g.lineWidth = 6; g.strokeRect(60, 40, W - 120, 130);
      g.fillStyle = '#9a6a40'; g.fillRect(40, 185, W - 80, 10);
      if (mg.phase === 'intro') {
        panel(g, W / 2 - 310, 230, 620, 180, '#fff8ee');
        label(g, 'Waltz Steps!', W / 2, 285, 36, '#9a7ad0');
        label(g, 'Madame dances 3 little dances.', W / 2, 335, 21, '#5a4a6a');
        label(g, 'Watch, then repeat with the arrows. Press E!', W / 2, 370, 21, '#b85c8a');
        sprite(g, 'madame', 'down', 0, W / 2 - 240, H - 60, 4);
        sprite(g, 'starry', 'down', 0, W / 2 + 240, H - 60, 4);
        return;
      }
      if (mg.phase === 'result') {
        resultScreen(g, W, H, mg.passed === 3 ? 'Magnifique!' : 'Lovely dancing!',
          mg.passed + ' of 3 dances — curtsy!', mg.stars, mg.rt);
        return;
      }
      label(g, 'Dance ' + Math.min(3, mg.round + 1) + ' of 3', W / 2, 75, 22, '#9a7ad0');
      if (mg.msgT > 0) label(g, mg.msg, W / 2, 130, 26, '#b85c8a');
      // dance pad
      const cx = W / 2, cy = H / 2 + 40, R = 110;
      const POS = { up: [cx, cy - R], down: [cx, cy + R], left: [cx - R - 40, cy], right: [cx + R + 40, cy] };
      for (const d of DIRS) {
        const f = mg.flash[d];
        const col = f ? (f.good ? '#ffd95f' : '#f08a8a') : '#cdb0ee';
        arrow(g, POS[d][0], POS[d][1], d, f ? 52 : 44, col);
      }
      // progress dots for input
      for (let i = 0; i < mg.seq.length; i++) {
        const done_ = (mg.phase === 'input' ? mg.inputI : mg.showI) > i;
        g.fillStyle = done_ ? '#9a7ad0' : 'rgba(150,130,170,.3)';
        g.beginPath(); g.arc(cx - (mg.seq.length - 1) * 14 + i * 28, cy, 8, 0, 7); g.fill();
      }
      const bob = Math.sin(mg.t * 4.5) * 4;
      sprite(g, 'madame', 'down', Math.floor(mg.t * 3) % 2 ? 1 : 2, 150, H - 50 + bob / 2, 4);
      sprite(g, 'starry', 'down', Math.floor(mg.t * 3) % 2 ? 2 : 1, W - 150, H - 50 + bob, 4);
    };
    return mg;
  }

  return { school, swim, ballet };
})();
