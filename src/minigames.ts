/* ======================================================================
   Starry ☆ Little Days — minigames.js
   Toddler-sized activities: three classes (school, swim, ballet), the
   weekend art class, and just-for-fun games. Each exported factory returns
   { update(dt), draw(g), key(action) } and calls done(stars, perfect).
   Everyone gets at least one star — this is a kind game.
   ====================================================================== */

import { AudioSys } from './audio';
import { SpriteLib } from './sprites';
import type { Minigame, MinigameDone } from './types';

type Ctx = CanvasRenderingContext2D;
type MinigameCtor = new (done: MinigameDone) => Minigame;
interface QuizCfg {
  rounds?: number;
  title: string;
  titleY?: number;
  titleColor?: string;
  introLines?: string[];
  introSprite?: string;
  footerSprite?: string;
  resultTitle: string;
  startSfx?: string;
  promptY?: number;
  promptSize?: number;
  promptColor?: string;
  progressY?: number;
  progressColor?: string;
  cardW?: number;
  cardH?: number;
  cardGap?: number;
  cardY?: number;
}
interface QuizQuestion {
  prompt: string;
  opts: any[];
  ans: number;
  [extra: string]: any;
}

export const Minigames = (() => {

  const FONT = (s: number, w = 700) => `${w} ${s}px "Comic Sans MS", "Segoe UI", sans-serif`;

  function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function panel(g: Ctx, x: number, y: number, w: number, h: number, fill: string) {
    g.save();
    g.shadowColor = 'rgba(60,30,60,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    rr(g, x, y, w, h, 18); g.fillStyle = fill; g.fill();
    g.restore();
  }
  function label(g: Ctx, txt: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center', weight = 700) {
    g.font = FONT(size, weight); g.textAlign = align; g.textBaseline = 'middle';
    g.lineWidth = Math.max(3, size / 7); g.strokeStyle = 'rgba(255,255,255,.85)';
    g.strokeText(txt, x, y);
    g.fillStyle = col; g.fillText(txt, x, y);
  }
  function starPath(g: Ctx, cx: number, cy: number, r: number) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 ? r * 0.45 : r;
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }
  function drawStars(g: Ctx, cx: number, cy: number, n: number, t: number) {
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
  function sprite(g: Ctx, name: string, dir: string, frame: number, x: number, y: number, scale: number) {
    const c = SpriteLib.chr(name, dir, frame);
    if (c) g.drawImage(c, x - c.width * scale / 2, y - c.height * scale, c.width * scale, c.height * scale);
  }
  function resultUpdate(mg: { rt: number }, dt: number) { mg.rt += dt; }
  function resultScreen(g: Ctx, W: number, H: number, title: string, sub: string, stars: number, t: number) {
    panel(g, W / 2 - 260, H / 2 - 150, 520, 300, '#fff8ee');
    label(g, title, W / 2, H / 2 - 95, 34, '#b85c8a');
    drawStars(g, W / 2, H / 2, stars, t);
    label(g, sub, W / 2, H / 2 + 70, 19, '#7a6a8a');
    if (t > 1.2 && Math.floor(t * 2) % 2 === 0) label(g, 'Press E to finish', W / 2, H / 2 + 112, 16, '#9a8ab8');
  }
  function pickN<T>(arr: T[], n: number): T[] {
    const pool = arr.slice(), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

  class BaseMinigame {
    done: MinigameDone;
    phase: string;
    t: number;
    rt: number;
    stars: number;
    perfect: boolean;
    constructor(done: MinigameDone) {
      this.done = done;
      this.phase = 'intro';
      this.t = 0;
      this.rt = 0;
      this.stars = 1;
      this.perfect = false;
    }
    key(act: string) {
      if (this.phase === 'intro' && act === 'action') { this.start(); return; }
      if (this.phase === 'result' && act === 'action' && this.rt > 1) { this.done(this.stars, this.perfect); return; }
      this.handleInput(act);
    }
    start() {
      this.phase = 'play';
      AudioSys.sfx('confirm');
    }
    update(dt: number) {
      this.t += dt;
      if (this.phase === 'result') { resultUpdate(this, dt); return; }
      this.updatePlay(dt);
    }
    updatePlay(_dt: number) {}
    handleInput(_act: string) {}
    complete(stars: number, perfect: boolean) {
      this.stars = Math.max(1, Math.min(3, stars));
      this.perfect = !!perfect;
      this.phase = 'result';
      this.rt = 0;
      AudioSys.sfx(this.stars === 3 ? 'fanfare' : 'yay');
    }
  }

  class ChoiceQuizMinigame extends BaseMinigame {
    cfg: QuizCfg;
    rounds: number;
    round: number;
    score: number;
    sel: number;
    fb: number;
    fbGood: boolean;
    q: QuizQuestion | null;
    constructor(done: MinigameDone, cfg: QuizCfg) {
      super(done);
      this.cfg = cfg;
      this.rounds = cfg.rounds || 5;
      this.round = 0;
      this.score = 0;
      this.sel = 1;
      this.fb = 0;
      this.fbGood = false;
      this.q = null;
    }
    start() {
      this.phase = 'play';
      this.newQuestion();
      AudioSys.sfx(this.cfg.startSfx || 'confirm');
    }
    newQuestion() {
      this.q = this.buildQuestion();
      this.sel = 1;
      this.fb = 0;
    }
    buildQuestion(): QuizQuestion {
      throw new Error('ChoiceQuizMinigame subclasses must implement buildQuestion()');
    }
    handleInput(act: string) {
      if (this.phase !== 'play' || this.fb > 0 || !this.q) return;
      if (act === 'left') { this.sel = Math.max(0, this.sel - 1); AudioSys.sfx('blip'); }
      if (act === 'right') { this.sel = Math.min(2, this.sel + 1); AudioSys.sfx('blip'); }
      if (act === 'action') {
        this.fbGood = this.sel === this.q!.ans;
        this.fb = this.fbGood ? 0.9 : 1.4;
        if (this.fbGood) { this.score++; AudioSys.sfx('star'); } else AudioSys.sfx('deny');
      }
    }
    updatePlay(dt: number) {
      if (this.phase !== 'play' || this.fb <= 0) return;
      this.fb -= dt;
      if (this.fb > 0) return;
      this.round++;
      if (this.round >= this.rounds) {
        this.complete(this.score >= this.rounds ? 3 : this.score >= Math.ceil(this.rounds * 0.6) ? 2 : 1,
          this.score === this.rounds);
      } else {
        this.newQuestion();
      }
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      this.drawBackground(g, W, H);
      if (this.phase === 'intro') { this.drawIntro(g, W, H); return; }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.resultTitle(), this.resultSub(), this.stars, this.rt);
        return;
      }
      if (!this.q) return;
      label(g, this.q!.prompt, W / 2, this.cfg.promptY || 86, this.cfg.promptSize || 34, this.cfg.promptColor || '#fff8ee');
      label(g, 'Question ' + (this.round + 1) + ' of ' + this.rounds + '   ·   ★ ' + this.score,
        W / 2, this.cfg.progressY || 175, 20, this.cfg.progressColor || '#9a7ad0');
      this.drawPlayExtras(g, W, H);
      this.drawOptions(g, W);
      this.drawFooter(g, W, H);
    }
    drawIntro(g: Ctx, W: number, H: number) {
      label(g, this.cfg.title, W / 2, this.cfg.titleY || 86, 40, this.cfg.titleColor || '#fff8ee');
      panel(g, W / 2 - 300, 220, 600, 220, '#fff8ee');
      const lines = this.cfg.introLines || [];
      lines.forEach((txt, i) => label(g, txt, W / 2, 290 + i * 45, 22, i === lines.length - 1 ? '#b85c8a' : '#5a4a6a'));
      if (this.cfg.introSprite) sprite(g, this.cfg.introSprite, 'down', 0, W / 2, 590, 5);
    }
    drawOptions(g: Ctx, W: number) {
      const w = this.cfg.cardW || 190, h = this.cfg.cardH || 230;
      const gap = this.cfg.cardGap || 230, y = this.cfg.cardY || 230;
      for (let i = 0; i < 3; i++) {
        const x = W / 2 + (i - 1) * gap - w / 2;
        const isSel = i === this.sel;
        let fill = isSel ? '#fff' : '#fff8ee';
        if (this.fb > 0 && i === this.q!.ans) fill = '#d8f5c8';
        if (this.fb > 0 && !this.fbGood && i === this.sel) fill = '#f8d0d0';
        panel(g, x, y + (isSel ? -12 : 0), w, h, fill);
        if (isSel) { rr(g, x, y - 12, w, h, 18); g.strokeStyle = '#ffb84f'; g.lineWidth = 5; g.stroke(); }
        this.drawOption(g, this.q!.opts[i], x + w / 2, y + h / 2 + (isSel ? -12 : 0), isSel, i);
      }
    }
    drawBackground(_g: Ctx, _W: number, _H: number) {}
    drawOption(_g: Ctx, _opt: any, _cx: number, _cy: number, _isSel: boolean, _i: number) {}
    drawPlayExtras(_g: Ctx, _W: number, _H: number) {}
    drawFooter(g: Ctx, W: number, H: number) {
      if (this.cfg.footerSprite) sprite(g, this.cfg.footerSprite, 'up', Math.floor(this.t * 2) % 2 ? 1 : 2, W / 2, H - 18, 4);
    }
    resultTitle() { return this.cfg.resultTitle; }
    resultSub() { return this.score + ' of ' + this.rounds + ' — wonderful!'; }
  }

  /* ================= SCHOOL : Letter Time ================= */
  const LETTERS = 'ABCDEFGHKMPRST'.split('');
  const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
  const COLORS = [['red', '#e85a5a'], ['blue', '#5a8ae8'], ['green', '#6ab85f'], ['yellow', '#f0c040'], ['pink', '#f08ab8'], ['purple', '#9a7ad0']];

  function drawShape(g: Ctx, kind: string, cx: number, cy: number, r: number, col: string) {
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
  function drawSchoolBoard(g: Ctx, W: number) {
    g.fillStyle = '#fdf3dc'; g.fillRect(0, 0, W, g.canvas.height);
    g.fillStyle = '#3f7a5a'; g.fillRect(W / 2 - 330, 30, 660, 110);
    g.strokeStyle = '#8a6a4a'; g.lineWidth = 10; g.strokeRect(W / 2 - 330, 30, 660, 110);
  }

  class SchoolMinigame extends ChoiceQuizMinigame {
    constructor(done: MinigameDone) {
      super(done, {
        title: 'Letter Time!',
        introLines: ['Ms. Bloom asks 5 little questions.', 'Arrows pick a card · E chooses it', 'Press E to start!'],
        introSprite: 'msbloom',
        footerSprite: 'starry',
        resultTitle: 'Class is over!',
      });
    }
    buildQuestion() {
      const type = ['letter', 'shape', 'color'][Math.floor(Math.random() * 3)];
      let opts: any[], prompt: string;
      if (type === 'letter') { opts = pickN(LETTERS, 3); prompt = 'Find the letter ' + opts[0] + '!'; }
      else if (type === 'shape') { opts = pickN(SHAPES, 3); prompt = 'Find the ' + opts[0] + '!'; }
      else { opts = pickN(COLORS, 3); prompt = 'Find the ' + opts[0][0] + ' balloon!'; }
      const answer = opts[0];
      const shuffled = pickN(opts, 3);
      return { type, prompt, opts: shuffled, ans: shuffled.indexOf(answer) };
    }
    drawBackground(g: Ctx, W: number) { drawSchoolBoard(g, W); }
    drawOption(g: Ctx, opt: any, cx: number, cy: number) {
      if (this.q!.type === 'letter') label(g, opt, cx, cy, 86, '#5a6ac8');
      else if (this.q!.type === 'shape') drawShape(g, opt, cx, cy, 55, '#f08ab8');
      else {
        drawShape(g, 'circle', cx, cy - 8, 48, opt[1]);
        g.strokeStyle = '#888'; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx, cy + 78); g.stroke();
      }
    }
    resultSub() { return this.score + ' of 5 — wonderful!'; }
  }

  /* ================= SCHOOL : Number Time ================= */
  function numberChoices(answer: number, min: number, max: number) {
    const pool: number[] = [];
    for (let i = min; i <= max; i++) if (i !== answer) pool.push(i);
    return pickN(pool, 2).concat([answer]);
  }
  const MATH_THINGS: Record<string, [string, string]> = {
    apple: ['apple', 'apples'],
    orange: ['orange', 'oranges'],
    berry: ['berry', 'berries'],
    banana: ['banana', 'bananas'],
    strawberry: ['strawberry', 'strawberries'],
    star: ['star', 'stars'],
    block: ['block', 'blocks'],
  };
  const MATH_KINDS = Object.keys(MATH_THINGS);

  function plural(kind: string, n: number) {
    const names = MATH_THINGS[kind] || ['thing', 'things'];
    return names[n === 1 ? 0 : 1];
  }
  function drawMathThing(g: Ctx, kind: string, cx: number, cy: number, r: number, dim?: boolean) {
    g.save();
    if (dim) g.globalAlpha = 0.32;
    if (kind === 'star') {
      starPath(g, cx, cy, r);
      g.fillStyle = '#ffd95f'; g.fill();
      g.strokeStyle = '#e8a020'; g.lineWidth = 2; g.stroke();
    } else if (kind === 'block') {
      g.fillStyle = '#8fd0e8'; rr(g, cx - r, cy - r, r * 2, r * 2, 6); g.fill();
      g.strokeStyle = '#5a8ab8'; g.lineWidth = 3; g.stroke();
    } else if (kind === 'orange') {
      g.fillStyle = '#f09040'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.fillStyle = '#ffd28a'; g.beginPath(); g.arc(cx - r * .28, cy - r * .28, r * .2, 0, 7); g.fill();
      g.fillStyle = '#6ab85f'; g.beginPath(); g.ellipse(cx + r * .3, cy - r * .86, r * .42, r * .2, -0.4, 0, 7); g.fill();
    } else if (kind === 'berry') {
      g.fillStyle = '#5a8ae8'; g.beginPath(); g.arc(cx, cy, r * .88, 0, 7); g.fill();
      g.fillStyle = '#3f5fb8'; g.beginPath(); g.arc(cx + r * .26, cy - r * .24, r * .22, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - r * .25, cy - r * .28, r * .18, 0, 7); g.fill();
    } else if (kind === 'banana') {
      g.lineCap = 'round';
      g.strokeStyle = '#f5cf4f'; g.lineWidth = r * .58;
      g.beginPath(); g.arc(cx, cy - r * .18, r * 1.05, 0.25, Math.PI - 0.15); g.stroke();
      g.strokeStyle = '#b87830'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy - r * .18, r * 1.05, 0.25, 0.32); g.stroke();
      g.beginPath(); g.arc(cx, cy - r * .18, r * 1.05, Math.PI - 0.22, Math.PI - 0.15); g.stroke();
    } else if (kind === 'strawberry') {
      g.fillStyle = '#e85a5a';
      g.beginPath();
      g.moveTo(cx, cy + r * .9);
      g.bezierCurveTo(cx - r * 1.1, cy + r * .15, cx - r * .75, cy - r * .8, cx, cy - r * .35);
      g.bezierCurveTo(cx + r * .75, cy - r * .8, cx + r * 1.1, cy + r * .15, cx, cy + r * .9);
      g.fill();
      g.fillStyle = '#ffd8a8';
      for (let i = 0; i < 5; i++) g.fillRect(cx - r * .45 + i * r * .22, cy - r * .05 + (i % 2) * r * .28, 2, 3);
      g.fillStyle = '#6ab85f';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.ellipse(cx + i * r * .23, cy - r * .62, r * .2, r * .38, i * .5, 0, 7); g.fill();
      }
    } else {
      g.fillStyle = '#e85a5a'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.fillStyle = '#6ab85f'; g.beginPath(); g.ellipse(cx + r * .35, cy - r * .85, r * .45, r * .22, -0.5, 0, 7); g.fill();
    }
    g.restore();
  }
  function drawMathRow(g: Ctx, kind: string, count: number, cx: number, cy: number, opts: { gap?: number; r?: number; crossedFrom?: number } = {}) {
    const gap = opts.gap || 48;
    const r = opts.r || 20;
    const start = cx - (count - 1) * gap / 2;
    for (let i = 0; i < count; i++) {
      const x = start + i * gap;
      const crossed = opts.crossedFrom !== undefined && i >= opts.crossedFrom;
      drawMathThing(g, kind, x, cy, r, crossed);
      if (crossed) {
        g.strokeStyle = '#d85a5a';
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(x - r * 1.1, cy - r * 1.1); g.lineTo(x + r * 1.1, cy + r * 1.1); g.stroke();
        g.beginPath(); g.moveTo(x + r * 1.1, cy - r * 1.1); g.lineTo(x - r * 1.1, cy + r * 1.1); g.stroke();
      }
    }
  }

  class MathMinigame extends ChoiceQuizMinigame {
    constructor(done: MinigameDone) {
      super(done, {
        title: 'Number Time!',
        introLines: ['Ms. Bloom has 5 tiny number puzzles.', 'Arrows pick a number · E chooses it', 'Press E to start!'],
        introSprite: 'msbloom',
        footerSprite: 'starry',
        resultTitle: 'Numbers sparkle!',
        cardY: 320,
        cardH: 170,
        promptSize: 34,
      });
    }
    buildQuestion() {
      const type = ['count', 'add', 'take'][Math.floor(Math.random() * 3)];
      let answer: number, prompt: string, detail: any;
      if (type === 'count') {
        answer = 1 + Math.floor(Math.random() * 6);
        const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
        prompt = 'How many ' + plural(kind, answer) + '?';
        detail = { type, count: answer, kind };
      } else if (type === 'add') {
        const a = 1 + Math.floor(Math.random() * 5);
        const b = 1 + Math.floor(Math.random() * 4);
        const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
        answer = a + b;
        prompt = a + ' ' + plural(kind, a) + ' + ' + b + ' more = ?';
        detail = { type, a, b, kind };
      } else {
        const a = 3 + Math.floor(Math.random() * 6);
        const b = 1 + Math.floor(Math.random() * Math.min(4, a - 1));
        const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
        answer = a - b;
        prompt = a + ' ' + plural(kind, a) + ', take away ' + b + ' = ?';
        detail = { type, a, b, kind };
      }
      const opts = pickN(numberChoices(answer, 0, 10), 3);
      return Object.assign(detail, { prompt, opts, ans: opts.indexOf(answer), answer });
    }
    drawBackground(g: Ctx, W: number) { drawSchoolBoard(g, W); }
    drawPlayExtras(g: Ctx, W: number) {
      if (this.q!.type === 'count') {
        drawMathRow(g, this.q!.kind, this.q!.count, W / 2, 245, { gap: 58, r: 22 });
      } else if (this.q!.type === 'add') {
        drawMathRow(g, this.q!.kind, this.q!.a, W / 2 - 185, 245, { gap: 44, r: 20 });
        label(g, '+', W / 2, 245, 44, '#5a4a6a');
        drawMathRow(g, this.q!.kind, this.q!.b, W / 2 + 185, 245, { gap: 44, r: 20 });
      } else if (this.q!.type === 'take') {
        drawMathRow(g, this.q!.kind, this.q!.a, W / 2, 245, { gap: 48, r: 20, crossedFrom: this.q!.a - this.q!.b });
        label(g, 'Take away the crossed-out ones', W / 2, 285, 17, '#7a6a8a');
      }
    }
    drawOption(g: Ctx, opt: any, cx: number, cy: number) {
      label(g, String(opt), cx, cy, 72, '#5a6ac8');
    }
    resultSub() { return this.score + ' of 5 — super counting!'; }
  }

  /* ================= SWIM : Splash Dash ================= */
  class SwimMinigame extends BaseMinigame {
    goal: number;
    duckTime: number;
    dist: number;
    vel: number;
    last: string | null;
    time: number;
    bubbles: { x: number; y: number; vy: number; r: number; life: number }[];
    kick: number;
    beatDuck: boolean;
    constructor(done: MinigameDone) {
      super(done);
      this.goal = 100;
      this.duckTime = 14;
      this.dist = 0;
      this.vel = 0;
      this.last = null;
      this.time = 0;
      this.bubbles = [];
      this.kick = 0;
      this.beatDuck = false;
    }
    start() {
      this.phase = 'play';
      AudioSys.sfx('splash');
    }
    handleInput(act: string) {
      if (this.phase !== 'play') return;
      if ((act === 'left' || act === 'right') && act !== this.last) {
        this.last = act;
        this.vel = Math.min(this.vel + 16, 34);
        this.kick = 0.25;
        AudioSys.sfx('pop');
        for (let i = 0; i < 3; i++) this.bubbles.push({ x: 0, y: Math.random() * 20 - 10, vy: -20 - Math.random() * 30, r: 2 + Math.random() * 4, life: 1 });
      }
    }
    updatePlay(dt: number) {
      if (this.phase !== 'play') return;
      this.time += dt;
      this.vel = Math.max(0, this.vel - 14 * dt);
      this.dist += this.vel * dt;
      this.kick = Math.max(0, this.kick - dt);
      for (const b of this.bubbles) { b.y += b.vy * dt; b.life -= dt * 1.4; }
      this.bubbles = this.bubbles.filter(b => b.life > 0);
      if (this.dist >= this.goal) {
        this.beatDuck = this.time < this.duckTime;
        this.complete(this.beatDuck ? 3 : this.time < 22 ? 2 : 1, this.beatDuck);
      }
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#d4f0f8'; g.fillRect(0, 0, W, H);
      const wy = 230;
      g.fillStyle = '#6fc7e8'; g.fillRect(0, wy, W, H - wy);
      g.fillStyle = '#8fd6ef';
      for (let x = 0; x < W; x += 40) {
        const yy = wy + 8 + Math.sin(this.t * 2.5 + x * 0.05) * 5;
        g.fillRect(x, yy, 26, 4);
      }
      if (this.phase === 'intro') {
        panel(g, W / 2 - 310, 60, 620, 150, '#fff8ee');
        label(g, 'Splash Dash!', W / 2, 105, 36, '#3a8ab8');
        label(g, 'Paddle with ← and → , one after the other!', W / 2, 155, 21, '#5a4a6a');
        label(g, 'Can you swim across before Ducky? Press E!', W / 2, 185, 21, '#b85c8a');
        sprite(g, 'coach', 'down', 0, W / 2, wy - 6, 4);
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.beatDuck ? 'You beat Ducky!' : 'You made it!',
          'Across the pool in ' + this.time.toFixed(1) + 's', this.stars, this.rt);
        return;
      }
      const pad = 90, laneW = W - pad * 2;
      g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, pad, 60, laneW, 16, 8); g.fill();
      const duckDist = Math.min(this.goal, this.goal * this.time / this.duckTime);
      g.fillStyle = '#ffd95f'; rr(g, pad, 60, laneW * duckDist / this.goal, 16, 8); g.fill();
      g.fillStyle = '#3a8ab8'; rr(g, pad, 60, laneW * Math.min(1, this.dist / this.goal), 16, 8); g.fill();
      label(g, this.time.toFixed(1) + 's', W - 60, 68, 20, '#3a8ab8');
      label(g, 'paddle ← → !', W / 2, 110, 20, '#3a8ab8');
      const duckX = pad + laneW * duckDist / this.goal;
      const dc = SpriteLib.duck('right');
      g.drawImage(dc, duckX - 20, wy + 60 + Math.sin(this.t * 3) * 4, 40, 28);
      const sx = pad + laneW * Math.min(1, this.dist / this.goal);
      const sy = wy + 130 + Math.sin(this.t * 4) * 5;
      g.save();
      g.translate(sx, sy);
      g.rotate(Math.PI / 2 - 0.25 + (this.kick > 0 ? -0.15 : 0));
      const c = SpriteLib.chr('starry', 'up', this.kick > 0 ? 1 : 0)!;
      g.drawImage(c, -c.width * 1.8, -c.height * 1.8, c.width * 3.6, c.height * 3.6);
      g.restore();
      for (const b of this.bubbles) {
        g.fillStyle = 'rgba(255,255,255,' + Math.max(0, b.life * .7) + ')';
        g.beginPath(); g.arc(sx - 30 + b.x, sy + b.y, b.r, 0, 7); g.fill();
      }
      sprite(g, 'coach', 'down', 0, 60, wy - 6, 3);
    }
  }

  /* ================= BALLET : Waltz Steps ================= */
  const POSES: Record<string, { name: string; note: string }> = {
    up: { name: 'Arabesque!', note: 'A5' },
    down: { name: 'Plié!', note: 'E5' },
    left: { name: 'Twirl left!', note: 'C5' },
    right: { name: 'Twirl right!', note: 'G5' },
  };
  const DIRS: string[] = ['up', 'down', 'left', 'right'];

  class BalletMinigame extends BaseMinigame {
    round: number;
    passed: number;
    mistakes: number;
    seq: string[];
    showI: number;
    showT: number;
    inputI: number;
    flash: Record<string, { t: number; good: boolean }>;
    msg: string;
    msgT: number;
    waitT = 0;
    constructor(done: MinigameDone) {
      super(done);
      this.round = 0;
      this.passed = 0;
      this.mistakes = 0;
      this.seq = [];
      this.showI = 0;
      this.showT = 0;
      this.inputI = 0;
      this.flash = {};
      this.msg = '';
      this.msgT = 0;
    }
    start() {
      this.startRound();
      AudioSys.sfx('confirm');
    }
    startRound() {
      const len = 3 + this.round;
      this.seq = [];
      for (let i = 0; i < len; i++) this.seq.push(DIRS[Math.floor(Math.random() * 4)]);
      this.phase = 'show';
      this.showI = 0;
      this.showT = 0.8;
      this.inputI = 0;
      this.msg = 'Watch Madame...';
      this.msgT = 99;
    }
    flashDir(d: string, good: boolean) { this.flash[d] = { t: 0.35, good }; }
    nextRound() {
      this.round++;
      if (this.round >= 3) {
        this.complete(Math.max(1, this.passed), this.mistakes === 0);
      } else {
        this.phase = 'wait';
        this.waitT = 1.3;
      }
    }
    handleInput(act: string) {
      if (this.phase !== 'input' || !DIRS.includes(act)) return;
      const want = this.seq[this.inputI];
      if (act === want) {
        AudioSys.sfx('note', POSES[act].note);
        this.flashDir(act, true);
        this.inputI++;
        this.msg = POSES[act].name; this.msgT = 0.8;
        if (this.inputI >= this.seq.length) {
          this.passed++;
          this.msg = 'Beautiful!'; this.msgT = 1.2;
          AudioSys.sfx('yay');
          this.nextRound();
        }
      } else {
        AudioSys.sfx('deny');
        this.flashDir(act, false);
        this.mistakes++;
        this.msg = 'Almost! A wobble is just a twirl learning.'; this.msgT = 1.5;
        this.nextRound();
      }
    }
    updatePlay(dt: number) {
      this.msgT -= dt;
      for (const d of DIRS) if (this.flash[d]) { this.flash[d].t -= dt; if (this.flash[d].t <= 0) delete this.flash[d]; }
      if (this.phase === 'wait') { this.waitT -= dt; if (this.waitT <= 0) this.startRound(); }
      if (this.phase === 'show') {
        this.showT -= dt;
        if (this.showT <= 0) {
          if (this.showI < this.seq.length) {
            const d = this.seq[this.showI];
            AudioSys.sfx('note', POSES[d].note);
            this.flashDir(d, true);
            this.showI++; this.showT = 0.65;
          } else {
            this.phase = 'input';
            this.msg = 'Your turn, little star!'; this.msgT = 99;
          }
        }
      }
    }
    arrow(g: Ctx, cx: number, cy: number, dir: string, size: number, col: string) {
      g.save(); g.translate(cx, cy);
      const rot = ({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 } as Record<string, number>)[dir];
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
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#f3e6f5'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#eed9ab'; g.fillRect(0, H - 180, W, 180);
      g.fillStyle = '#d4ecf2'; g.fillRect(60, 40, W - 120, 130);
      g.strokeStyle = '#a89ab8'; g.lineWidth = 6; g.strokeRect(60, 40, W - 120, 130);
      g.fillStyle = '#9a6a40'; g.fillRect(40, 185, W - 80, 10);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 310, 230, 620, 180, '#fff8ee');
        label(g, 'Waltz Steps!', W / 2, 285, 36, '#9a7ad0');
        label(g, 'Madame dances 3 little dances.', W / 2, 335, 21, '#5a4a6a');
        label(g, 'Watch, then repeat with the arrows. Press E!', W / 2, 370, 21, '#b85c8a');
        sprite(g, 'madame', 'down', 0, W / 2 - 240, H - 60, 4);
        sprite(g, 'starry', 'down', 0, W / 2 + 240, H - 60, 4);
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.passed === 3 ? 'Magnifique!' : 'Lovely dancing!',
          this.passed + ' of 3 dances — curtsy!', this.stars, this.rt);
        return;
      }
      label(g, 'Dance ' + Math.min(3, this.round + 1) + ' of 3', W / 2, 75, 22, '#9a7ad0');
      if (this.msgT > 0) label(g, this.msg, W / 2, 130, 26, '#b85c8a');
      const cx = W / 2, cy = H / 2 + 40, R = 110;
      const POS: Record<string, [number, number]> = { up: [cx, cy - R], down: [cx, cy + R], left: [cx - R - 40, cy], right: [cx + R + 40, cy] };
      for (const d of DIRS) {
        const f = this.flash[d];
        const col = f ? (f.good ? '#ffd95f' : '#f08a8a') : '#cdb0ee';
        this.arrow(g, POS[d][0], POS[d][1], d, f ? 52 : 44, col);
      }
      for (let i = 0; i < this.seq.length; i++) {
        const done_ = (this.phase === 'input' ? this.inputI : this.showI) > i;
        g.fillStyle = done_ ? '#9a7ad0' : 'rgba(150,130,170,.3)';
        g.beginPath(); g.arc(cx - (this.seq.length - 1) * 14 + i * 28, cy, 8, 0, 7); g.fill();
      }
      const bob = Math.sin(this.t * 4.5) * 4;
      sprite(g, 'madame', 'down', Math.floor(this.t * 3) % 2 ? 1 : 2, 150, H - 50 + bob / 2, 4);
      sprite(g, 'starry', 'down', Math.floor(this.t * 3) % 2 ? 2 : 1, W - 150, H - 50 + bob, 4);
    }
  }

  /* ================= ART : Painting Time ================= */
  const PCOLORS: Record<string, string> = {
    red: '#e85a5a', blue: '#5a8ae8', green: '#6ab85f', yellow: '#f0c040',
    pink: '#f08ab8', purple: '#9a7ad0', orange: '#f09040', white: '#fdfdfa',
  };
  const MIXES = [
    ['red', 'yellow', 'orange'], ['blue', 'yellow', 'green'],
    ['red', 'blue', 'purple'], ['red', 'white', 'pink'],
  ];
  const THINGS = [
    ['a banana', 'yellow'], ['a little frog', 'green'], ['the big sky', 'blue'],
    ['a strawberry', 'red'], ["Starry's dress", 'pink'], ['juicy grapes', 'purple'],
    ['a crunchy carrot', 'orange'], ['a fluffy cloud', 'white'],
  ];
  function paintBlob(g: Ctx, cx: number, cy: number, r: number, col: string) {
    g.fillStyle = col;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.beginPath(); g.arc(cx - r * .5, cy - r * .55, r * .45, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + r * .55, cy + r * .4, r * .4, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.beginPath(); g.arc(cx - r * .3, cy - r * .3, r * .18, 0, 7); g.fill();
  }

  class ArtMinigame extends ChoiceQuizMinigame {
    colorNames: string[];
    constructor(done: MinigameDone) {
      super(done, {
        title: 'Painting Time!',
        introLines: ['Mr. Doodle asks 5 colorful questions.', 'Arrows pick a paint blob · E chooses it', 'Press E to start!'],
        introSprite: 'doodle',
        footerSprite: 'starry',
        promptSize: 32,
        resultTitle: 'What a masterpiece!',
      });
      this.colorNames = Object.keys(PCOLORS);
    }
    buildQuestion() {
      let prompt, answer;
      if (Math.random() < 0.5) {
        const m = MIXES[Math.floor(Math.random() * MIXES.length)];
        prompt = cap(m[0]) + ' and ' + m[1] + ' make...?';
        answer = m[2];
      } else {
        const th = THINGS[Math.floor(Math.random() * THINGS.length)];
        prompt = 'What color is ' + th[0] + '?';
        answer = th[1];
      }
      const opts = pickN(this.colorNames.filter(n => n !== answer), 2).concat([answer]);
      const shuffled = pickN(opts, 3);
      return { prompt, opts: shuffled, ans: shuffled.indexOf(answer) };
    }
    drawBackground(g: Ctx, W: number, H: number) {
      g.fillStyle = '#f1e8d4'; g.fillRect(0, 0, W, H);
      const bandCols = ['#e85a5a', '#f09040', '#f0c040', '#6ab85f', '#5a8ae8', '#9a7ad0'];
      bandCols.forEach((c, i) => { g.fillStyle = c; g.fillRect(W / 2 - 330, 30 + i * 18, 660, 18); });
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 10; g.strokeRect(W / 2 - 330, 30, 660, 108);
    }
    drawOption(g: Ctx, opt: any, cx: number, cy: number) {
      paintBlob(g, cx, cy - 10, 46, PCOLORS[opt]);
      label(g, opt, cx, cy + 76, 21, '#5a4a6a');
    }
    resultSub() { return this.score + ' of 5 — hang it on the fridge!'; }
  }

  /* ================= BEACH : Shell Splash ================= */
  class ShellsMinigame extends BaseMinigame {
    total: number;
    lane: number;
    drops: { lane: number; y: number; spd: number }[];
    spawned: number;
    caught: number;
    next: number;
    pop: number;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 12;
      this.lane = 1;
      this.drops = [];
      this.spawned = 0;
      this.caught = 0;
      this.next = 1.0;
      this.pop = 0;
    }
    laneX(W: number, lane: number) { return W / 2 + (lane - 1) * 230; }
    start() {
      this.phase = 'play';
      AudioSys.sfx('splash');
    }
    handleInput(act: string) {
      if (this.phase !== 'play') return;
      if (act === 'left') { this.lane = Math.max(0, this.lane - 1); AudioSys.sfx('blip'); }
      if (act === 'right') { this.lane = Math.min(2, this.lane + 1); AudioSys.sfx('blip'); }
    }
    updatePlay(dt: number) {
      this.pop = Math.max(0, this.pop - dt);
      if (this.phase !== 'play') return;
      if (this.spawned < this.total) {
        this.next -= dt;
        if (this.next <= 0) {
          this.drops.push({ lane: Math.floor(Math.random() * 3), y: -30, spd: 150 + this.spawned * 10 });
          this.spawned++;
          this.next = 1.5 - this.spawned * 0.05;
        }
      }
      const catchY = 520;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.y += d.spd * dt;
        if (d.y >= catchY) {
          if (d.lane === this.lane) { this.caught++; this.pop = 0.3; AudioSys.sfx('star'); }
          else AudioSys.sfx('splash');
          this.drops.splice(i, 1);
        }
      }
      if (this.spawned >= this.total && this.drops.length === 0) {
        this.complete(this.caught >= 10 ? 3 : this.caught >= 6 ? 2 : 1, this.caught === this.total);
      }
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#bfe8f5'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#6fc7e8'; g.fillRect(0, 120, W, 140);
      g.fillStyle = '#a4e2f6';
      for (let x = 0; x < W; x += 50) g.fillRect(x + ((this.t * 30) % 50), 150 + Math.sin(this.t * 2 + x) * 6, 30, 5);
      g.fillStyle = '#f2e3b0'; g.fillRect(0, 260, W, H - 260);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 310, 300, 620, 180, '#fff8ee');
        label(g, 'Shell Splash!', W / 2, 355, 36, '#3a8ab8');
        label(g, 'The waves toss shells — catch them in the bucket!', W / 2, 405, 21, '#5a4a6a');
        label(g, '← and → to run along the sand. Press E!', W / 2, 440, 21, '#b85c8a');
        sprite(g, 'sandy', 'down', 0, W / 2, 260, 4);
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.caught >= 10 ? 'A bucket of treasure!' : 'Beachy keen!',
          this.caught + ' of ' + this.total + ' shells caught!', this.stars, this.rt);
        return;
      }
      label(g, 'Shells: ' + this.caught + ' of ' + this.total, W / 2, 60, 26, '#3a8ab8');
      const ic = SpriteLib.icon('shell');
      for (const d of this.drops) {
        const x = this.laneX(W, d.lane);
        g.save();
        g.translate(x, d.y);
        g.rotate(Math.sin(this.t * 4 + d.lane) * 0.3);
        g.drawImage(ic, -24, -24, 48, 48);
        g.restore();
      }
      const sx = this.laneX(W, this.lane), sy = 620;
      sprite(g, 'starry', 'up', Math.floor(this.t * 5) % 2 + 1, sx, sy, 4);
      const bw = 70, bh = 46;
      g.fillStyle = '#ff9ec5'; g.fillRect(sx - bw / 2, sy - 160, bw, bh);
      g.fillStyle = '#e088ab'; g.fillRect(sx - bw / 2, sy - 160, bw, 8);
      if (this.pop > 0) { starPath(g, sx, sy - 180, 18 + this.pop * 30); g.fillStyle = '#ffd95f'; g.fill(); }
      sprite(g, 'sandy', 'down', 0, 80, 250, 3);
    }
  }

  /* ================= FARM : Veggie Round-up ================= */
  class VeggiesMinigame extends BaseMinigame {
    total: number;
    score: number;
    popped: number;
    cur: { dir: string; t: number; age: number } | null;
    wait: number;
    flashT: number;
    flashDir: string | null;
    flashGood: boolean;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 12;
      this.score = 0;
      this.popped = 0;
      this.cur = null;
      this.wait = 1.0;
      this.flashT = 0;
      this.flashDir = null;
      this.flashGood = false;
    }
    handleInput(act: string) {
      if (this.phase !== 'play' || !DIRS.includes(act)) return;
      if (this.cur && act === this.cur.dir) {
        this.score++; this.popped++;
        this.flashT = 0.4; this.flashDir = act; this.flashGood = true;
        this.cur = null; this.wait = 0.5 + Math.random() * 0.5;
        AudioSys.sfx('star');
      } else {
        this.flashT = 0.3; this.flashDir = act; this.flashGood = false;
        AudioSys.sfx('deny');
      }
    }
    updatePlay(dt: number) {
      this.flashT = Math.max(0, this.flashT - dt);
      if (this.phase !== 'play') return;
      if (!this.cur) {
        if (this.popped >= this.total) {
          this.complete(this.score >= 10 ? 3 : this.score >= 6 ? 2 : 1, this.score === this.total);
          return;
        }
        this.wait -= dt;
        if (this.wait <= 0) this.cur = { dir: DIRS[Math.floor(Math.random() * 4)], t: Math.max(0.9, 1.6 - this.popped * 0.06), age: 0 };
      } else {
        this.cur.t -= dt; this.cur.age += dt;
        if (this.cur.t <= 0) {
          this.popped++;
          this.cur = null; this.wait = 0.6;
          AudioSys.sfx('pop');
        }
      }
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#9ad469'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#8cc55e';
      for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 61) % H, 3, 3);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 240, 640, 190, '#fff8ee');
        label(g, 'Veggie Round-up!', W / 2, 295, 36, '#6a8a3a');
        label(g, 'Carrots pop out of four dirt mounds.', W / 2, 345, 21, '#5a4a6a');
        label(g, 'Press that arrow before they wiggle away. Press E!', W / 2, 380, 21, '#b85c8a');
        sprite(g, 'fern', 'down', 0, W / 2, 620, 5);
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.score >= 10 ? 'Harvest hero!' : 'Good picking!',
          this.score + ' of ' + this.total + ' carrots picked!', this.stars, this.rt);
        return;
      }
      label(g, 'Carrot ' + Math.min(this.total, this.popped + 1) + ' of ' + this.total + '   ·   picked ' + this.score, W / 2, 60, 26, '#6a8a3a');
      const cx = W / 2, cy = H / 2 + 20, R = 170;
      const POS: Record<string, [number, number]> = { up: [cx, cy - R], down: [cx, cy + R], left: [cx - R - 90, cy], right: [cx + R + 90, cy] };
      const ic = SpriteLib.icon('carrot');
      for (const d of DIRS) {
        const [x, y] = POS[d];
        g.fillStyle = '#b07a45';
        g.beginPath(); g.ellipse(x, y + 26, 74, 30, 0, 0, 7); g.fill();
        g.fillStyle = '#9a6438';
        g.beginPath(); g.ellipse(x, y + 30, 60, 20, 0, 0, 7); g.fill();
        if (this.flashT > 0 && this.flashDir === d) {
          g.fillStyle = this.flashGood ? 'rgba(255,217,95,.6)' : 'rgba(232,90,90,.4)';
          g.beginPath(); g.ellipse(x, y + 26, 80, 34, 0, 0, 7); g.fill();
        }
        if (this.cur && this.cur.dir === d) {
          const up = Math.min(1, this.cur.age * 6) * (0.85 + Math.sin(this.cur.age * 10) * 0.15);
          g.drawImage(ic, x - 32, y + 16 - 76 * up, 64, 64);
        }
        label(g, ARROW_GLYPHS[d], x, y + 62, 30, '#5a4a3a');
      }
      sprite(g, 'fern', 'down', 0, 110, H - 40, 4);
      sprite(g, 'starry', 'down', Math.floor(this.t * 3) % 2 ? 1 : 2, W - 110, H - 40, 4);
    }
  }

  /* ================= CITY : Bubble Pop ================= */
  class BubblePopMinigame extends BaseMinigame {
    total: number;
    lane: number;
    spawned: number;
    popped: number;
    bubbles: { lane: number; y: number; xoff: number; vy: number; r: number; hue: number }[];
    next: number;
    pops: { lane: number; xoff: number; y: number; t: number }[];
    wand: number;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 16;
      this.lane = 1;
      this.spawned = 0;
      this.popped = 0;
      this.bubbles = [];
      this.next = 0.45;
      this.pops = [];
      this.wand = 0;
    }
    laneX(W: number, lane: number) { return W / 2 + (lane - 1) * 230; }
    start() {
      this.phase = 'play';
      AudioSys.sfx('sparkle');
    }
    handleInput(act: string) {
      if (this.phase !== 'play') return;
      if (act === 'left') { this.lane = Math.max(0, this.lane - 1); AudioSys.sfx('blip'); }
      if (act === 'right') { this.lane = Math.min(2, this.lane + 1); AudioSys.sfx('blip'); }
      if (act !== 'action') return;
      let best = -1, bestDist = 999;
      for (let i = 0; i < this.bubbles.length; i++) {
        const b = this.bubbles[i];
        const d = Math.abs(b.y - 360);
        if (b.lane === this.lane && b.y > 135 && b.y < 610 && d < bestDist) { best = i; bestDist = d; }
      }
      this.wand = 0.2;
      if (best >= 0) {
        const b = this.bubbles.splice(best, 1)[0];
        this.popped++;
        this.pops.push({ lane: b.lane, xoff: b.xoff, y: b.y, t: 0 });
        AudioSys.sfx('pop');
      } else {
        AudioSys.sfx('deny');
      }
    }
    updatePlay(dt: number) {
      this.wand = Math.max(0, this.wand - dt);
      for (const p of this.pops) p.t += dt;
      this.pops = this.pops.filter(p => p.t < 0.35);
      if (this.phase !== 'play') return;
      if (this.spawned < this.total) {
        this.next -= dt;
        if (this.next <= 0) {
          this.bubbles.push({
            lane: Math.floor(Math.random() * 3),
            y: 720,
            xoff: Math.random() * 24 - 12,
            vy: 95 + Math.random() * 45,
            r: 22 + Math.random() * 12,
            hue: Math.random(),
          });
          this.spawned++;
          this.next = Math.max(0.35, 0.9 - this.spawned * 0.025);
        }
      }
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y -= b.vy * dt;
        b.xoff += Math.sin(this.t * 4 + i) * dt * 12;
        if (b.y < 105) this.bubbles.splice(i, 1);
      }
      if (this.spawned >= this.total && this.bubbles.length === 0) {
        this.complete(this.popped >= 13 ? 3 : this.popped >= 8 ? 2 : 1, this.popped === this.total);
      }
    }
    drawBubble(g: Ctx, x: number, y: number, r: number, hue: number) {
      const cols = ['rgba(180,230,255,.62)', 'rgba(255,190,220,.58)', 'rgba(210,190,255,.58)'];
      g.fillStyle = cols[Math.floor(hue * cols.length) % cols.length];
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.beginPath(); g.arc(x - r * .32, y - r * .35, r * .22, 0, 7); g.fill();
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#dff5fb'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#bfe8d8'; g.fillRect(0, H - 135, W, 135);
      for (let i = 0; i < 3; i++) {
        const x = this.laneX(W, i);
        g.fillStyle = i === this.lane ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.28)';
        rr(g, x - 80, 120, 160, 480, 24); g.fill();
      }
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 225, 640, 190, '#fff8ee');
        label(g, 'Bubble Pop!', W / 2, 280, 36, '#3a8ab8');
        label(g, 'Move under the bubbles, then press E to pop!', W / 2, 330, 21, '#5a4a6a');
        label(g, 'Catch as many floaty bubbles as you can. Press E!', W / 2, 365, 21, '#b85c8a');
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.popped >= 13 ? 'Pop-pop-perfect!' : 'So many bubbles!',
          this.popped + ' of ' + this.total + ' bubbles popped!', this.stars, this.rt);
        return;
      }
      label(g, 'Bubbles: ' + this.popped + ' of ' + this.total, W / 2, 62, 26, '#3a8ab8');
      for (const b of this.bubbles) this.drawBubble(g, this.laneX(W, b.lane) + b.xoff, b.y, b.r, b.hue);
      for (const p of this.pops) {
        const a = 1 - p.t / 0.35;
        starPath(g, this.laneX(W, p.lane) + p.xoff, p.y, 16 + p.t * 70);
        g.fillStyle = 'rgba(255,217,95,' + a.toFixed(2) + ')'; g.fill();
      }
      const sx = this.laneX(W, this.lane), sy = H - 45;
      sprite(g, 'starry', 'up', Math.floor(this.t * 4) % 2 ? 1 : 2, sx, sy, 4);
      g.strokeStyle = '#b85c8a'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx + 30, sy - 120); g.lineTo(sx + 70, sy - 170 - this.wand * 80); g.stroke();
      this.drawBubble(g, sx + 78, sy - 178 - this.wand * 80, 12, 0.2);
    }
  }

  /* ================= CITY : Balloon Bop ================= */
  const ARROW_GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' };
  const BALLOON_COLORS = ['#ff6f9e', '#7fb8e8', '#ffd95f', '#9adb7a', '#cdb0ee'];

  class BalloonBopMinigame extends BaseMinigame {
    total: number;
    round: number;
    score: number;
    cur: { dir: string; color: string; t: number; age: number } | null;
    flash: number;
    goodFlash: boolean;
    wait: number;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 12;
      this.round = 0;
      this.score = 0;
      this.cur = null;
      this.flash = 0;
      this.goodFlash = false;
      this.wait = 0;
    }
    start() {
      this.phase = 'play';
      this.nextBalloon();
      AudioSys.sfx('pop');
    }
    nextBalloon() {
      this.cur = {
        dir: DIRS[Math.floor(Math.random() * DIRS.length)],
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        t: Math.max(0.85, 1.65 - this.round * 0.04),
        age: 0,
      };
    }
    finishRound(good: boolean) {
      if (good) this.score++;
      this.round++;
      this.flash = 0.35;
      this.goodFlash = good;
      this.cur = null;
      if (good) AudioSys.sfx('star'); else AudioSys.sfx('deny');
      if (this.round >= this.total) {
        this.complete(this.score >= 10 ? 3 : this.score >= 6 ? 2 : 1, this.score === this.total);
      } else {
        this.wait = 0.4;
      }
    }
    handleInput(act: string) {
      if (this.phase !== 'play' || !DIRS.includes(act) || !this.cur) return;
      this.finishRound(act === this.cur.dir);
    }
    updatePlay(dt: number) {
      this.flash = Math.max(0, this.flash - dt);
      if (this.phase !== 'play') return;
      if (!this.cur) {
        this.wait -= dt;
        if (this.wait <= 0 && this.round < this.total) this.nextBalloon();
        return;
      }
      this.cur.age += dt;
      this.cur.t -= dt;
      if (this.cur.t <= 0) this.finishRound(false);
    }
    drawBalloon(g: Ctx, x: number, y: number, r: number, color: string) {
      g.fillStyle = color;
      g.beginPath(); g.ellipse(x, y, r * .82, r, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.beginPath(); g.ellipse(x - r * .25, y - r * .35, r * .18, r * .28, -0.3, 0, 7); g.fill();
      g.strokeStyle = '#9a8ab8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y + r); g.lineTo(x + Math.sin(this.t * 5) * 10, y + r + 80); g.stroke();
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#cfeaf8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff8ee';
      for (let i = 0; i < 6; i++) {
        g.beginPath(); g.arc(120 + i * 210, 120 + Math.sin(this.t + i) * 12, 34, 0, 7); g.fill();
        g.beginPath(); g.arc(155 + i * 210, 128 + Math.sin(this.t + i) * 12, 44, 0, 7); g.fill();
      }
      g.fillStyle = '#a8d8a0'; g.fillRect(0, H - 110, W, 110);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 225, 640, 190, '#fff8ee');
        label(g, 'Balloon Bop!', W / 2, 280, 36, '#b85c8a');
        label(g, 'Each balloon shows an arrow.', W / 2, 330, 21, '#5a4a6a');
        label(g, 'Press that arrow before it floats away. Press E!', W / 2, 365, 21, '#b85c8a');
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.score >= 10 ? 'Balloon parade!' : 'Floaty fun!',
          this.score + ' of ' + this.total + ' balloons bopped!', this.stars, this.rt);
        return;
      }
      label(g, 'Balloon ' + Math.min(this.total, this.round + 1) + ' of ' + this.total + '   ·   bopped ' + this.score, W / 2, 60, 25, '#b85c8a');
      if (this.flash > 0) {
        label(g, this.goodFlash ? 'Bop!' : 'Oops!', W / 2, 130, 30, this.goodFlash ? '#6ab85f' : '#d85a5a');
      }
      if (this.cur) {
        const bob = Math.sin(this.cur.age * 5) * 12;
        this.drawBalloon(g, W / 2, H / 2 - 10 + bob, 88, this.cur.color);
        label(g, ARROW_GLYPHS[this.cur.dir], W / 2, H / 2 - 8 + bob, 74, '#5a4a6a');
        g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, W / 2 - 160, 100, 320, 14, 7); g.fill();
        g.fillStyle = '#ffb84f'; rr(g, W / 2 - 160, 100, 320 * Math.max(0, this.cur.t / Math.max(0.85, 1.65 - this.round * 0.04)), 14, 7); g.fill();
      }
      sprite(g, 'starry', 'up', Math.floor(this.t * 4) % 2 ? 1 : 2, W / 2, H - 35, 4);
    }
  }

  /* ================= CITY : Hopscotch Hero ================= */
  class HopscotchMinigame extends BaseMinigame {
    total: number;
    step: number;
    score: number;
    cur: { dir: string; t: number; age: number } | null;
    flash: number;
    goodFlash: boolean;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 10;
      this.step = 0;
      this.score = 0;
      this.cur = null;
      this.flash = 0;
      this.goodFlash = false;
    }
    start() {
      this.phase = 'play';
      this.nextHop();
      AudioSys.sfx('confirm');
    }
    nextHop() {
      this.cur = { dir: DIRS[Math.floor(Math.random() * DIRS.length)], t: 1.5, age: 0 };
    }
    finishHop(good: boolean) {
      if (good) this.score++;
      this.step++;
      this.flash = 0.28;
      this.goodFlash = good;
      if (good) AudioSys.sfx('pop'); else AudioSys.sfx('deny');
      if (this.step >= this.total) {
        this.complete(this.score >= 9 ? 3 : this.score >= 5 ? 2 : 1, this.score === this.total);
      } else {
        this.nextHop();
      }
    }
    handleInput(act: string) {
      if (this.phase !== 'play' || !DIRS.includes(act) || !this.cur) return;
      this.finishHop(act === this.cur.dir);
    }
    updatePlay(dt: number) {
      this.flash = Math.max(0, this.flash - dt);
      if (this.phase !== 'play' || !this.cur) return;
      this.cur.age += dt;
      this.cur.t -= dt;
      if (this.cur.t <= 0) this.finishHop(false);
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#e8e2d8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#a8d8a0'; g.fillRect(0, H - 150, W, 150);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 225, 640, 190, '#fff8ee');
        label(g, 'Hopscotch Hero!', W / 2, 280, 36, '#9a7ad0');
        label(g, 'Hop to the arrow on each chalk square.', W / 2, 330, 21, '#5a4a6a');
        label(g, 'Press the matching arrow. Press E!', W / 2, 365, 21, '#b85c8a');
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.score >= 9 ? 'Hopscotch hero!' : 'Happy hopping!',
          this.score + ' of ' + this.total + ' hops landed!', this.stars, this.rt);
        return;
      }
      label(g, 'Hop ' + Math.min(this.total, this.step + 1) + ' of ' + this.total + '   ·   landed ' + this.score, W / 2, 62, 25, '#9a7ad0');
      const colors = ['#ff9ec5', '#7fb8e8', '#ffe06a', '#a8d8a0', '#cdb0ee'];
      const sx = W / 2, top = 150, cell = 82;
      for (let i = 0; i < this.total; i++) {
        const y = top + i * 45;
        const split = i % 3 === 2;
        const done = i < this.step;
        const active = i === this.step;
        const xs = split ? [sx - cell / 2, sx + cell / 2] : [sx];
        for (const x of xs) {
          rr(g, x - cell / 2, y, cell, 40, 8);
          g.fillStyle = active ? '#fff8ee' : (done ? 'rgba(154,219,122,.65)' : colors[i % colors.length]);
          g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
        }
      }
      const px = sx, py = top + this.step * 45 + 42;
      sprite(g, 'starry', 'down', Math.floor(this.t * 6) % 2 ? 1 : 2, px, py + Math.sin(this.t * 12) * 6, 3.5);
      if (this.cur) {
        const pulse = 1 + Math.sin(this.cur.age * 10) * 0.08;
        label(g, ARROW_GLYPHS[this.cur.dir], sx, 120, 66 * pulse, '#5a4a6a');
        g.fillStyle = 'rgba(255,255,255,.72)'; rr(g, sx - 155, 95, 310, 12, 6); g.fill();
        g.fillStyle = '#9a7ad0'; rr(g, sx - 155, 95, 310 * Math.max(0, this.cur.t / 1.5), 12, 6); g.fill();
      }
      if (this.flash > 0) label(g, this.goodFlash ? 'Hop!' : 'Wobble!', W / 2, H - 82, 28, this.goodFlash ? '#6ab85f' : '#d85a5a');
    }
  }

  const registry: Record<string, MinigameCtor> = {};
  const api: Record<string, any> = {
    create(name: string, done: MinigameDone): Minigame {
      const Ctor = registry[name];
      if (!Ctor) throw new Error('Unknown minigame: ' + name);
      return new Ctor(done);
    },
    register(name: string, Ctor: MinigameCtor) {
      registry[name] = Ctor;
      api[name] = (done: MinigameDone) => new Ctor(done);
    },
    types() { return Object.keys(registry); },
    BaseMinigame,
    ChoiceQuizMinigame,
  };
  api.register('school', SchoolMinigame);
  api.register('math', MathMinigame);
  api.register('swim', SwimMinigame);
  api.register('ballet', BalletMinigame);
  api.register('art', ArtMinigame);
  api.register('shells', ShellsMinigame);
  api.register('veggies', VeggiesMinigame);
  api.register('bubblepop', BubblePopMinigame);
  api.register('balloonbop', BalloonBopMinigame);
  api.register('hopscotch', HopscotchMinigame);

  return api;
})();
