/* ======================================================================
   Starry ☆ Little Days — minigames.js
   Toddler-sized activities: three classes (school, swim, ballet), the
   weekend art class, and just-for-fun games. Each exported factory returns
   { update(dt), draw(g), key(action) } and calls done(stars, perfect).
   Everyone gets at least one star — this is a kind game.
   ====================================================================== */

import { AudioSys } from './audio';
import { SpriteLib } from './sprites';
import type { Minigame, MinigameDone, MinigameInputMode } from './types';

type Ctx = CanvasRenderingContext2D;
type MinigameCtor = new (done: MinigameDone) => Minigame;

/** Everything the rest of the game needs to know about a minigame lives
    here, next to its registration — launchers read the reward economics
    and the smoke test reads `keys`, so registering a game is the ONLY
    integration step besides giving it a launcher in the world. */
export interface MinigameMeta {
  /** shown in menus, day summaries, and toasts */
  label: string;
  /** energy Starry spends playing (default 12) */
  energy: number;
  /** in-game minutes that pass (default 40) */
  minutes: number;
  /** minimum energy needed to start (default 15) */
  minEnergy: number;
  /** inputs the headless smoke test mashes to finish the game;
      list the keys your handleInput() actually reacts to */
  keys: string[];
  /** one-line description for docs and future tooling */
  description: string;
}
export type MinigameMetaInput =
  Partial<MinigameMeta> & Pick<MinigameMeta, 'label' | 'keys' | 'description'>;

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
    inputMode: MinigameInputMode;
    done: MinigameDone;
    phase: string;
    t: number;
    rt: number;
    stars: number;
    perfect: boolean;
    constructor(done: MinigameDone) {
      this.inputMode = 'actions';
      this.done = done;
      this.phase = 'intro';
      this.t = 0;
      this.rt = 0;
      this.stars = 1;
      this.perfect = false;
    }
    key(act: string) {
      const menuAction = act === 'action' || (this.inputMode === 'letters' && act === 'e');
      if (this.phase === 'intro' && menuAction) { this.start(); return; }
      if (this.phase === 'result' && menuAction && this.rt > 1) { this.done(this.stars, this.perfect); return; }
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
      g.fillStyle = '#f5cf4f';
      g.beginPath();
      g.moveTo(cx - r * 1.05, cy - r * .25);
      g.bezierCurveTo(cx - r * .55, cy + r * .9, cx + r * .8, cy + r * .75, cx + r * 1.18, cy - r * .28);
      g.bezierCurveTo(cx + r * .72, cy + r * .18, cx - r * .42, cy + r * .2, cx - r * .82, cy - r * .55);
      g.closePath(); g.fill();
      g.strokeStyle = '#b87830'; g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(cx - r * 1.05, cy - r * .25);
      g.bezierCurveTo(cx - r * .55, cy + r * .9, cx + r * .8, cy + r * .75, cx + r * 1.18, cy - r * .28);
      g.stroke();
      g.strokeStyle = '#fff0a0'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - r * .58, cy - r * .13);
      g.bezierCurveTo(cx - r * .2, cy + r * .42, cx + r * .45, cy + r * .42, cx + r * .82, cy - r * .05);
      g.stroke();
      g.fillStyle = '#8a5a30';
      g.beginPath(); g.ellipse(cx - r * .98, cy - r * .34, r * .17, r * .09, -0.6, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx + r * 1.2, cy - r * .3, r * .15, r * .09, -0.35, 0, 7); g.fill();
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
  const BALLET_FIRST_STEP_DELAY = 1.15;
  const BALLET_SHOW_STEP_DELAY = 1.1;
  const BALLET_FLASH_TIME = 0.65;
  const BALLET_ROUND_PAUSE = 1.7;

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
      this.showT = BALLET_FIRST_STEP_DELAY;
      this.inputI = 0;
      this.msg = 'Watch Madame...';
      this.msgT = 99;
    }
    flashDir(d: string, good: boolean) { this.flash[d] = { t: good ? BALLET_FLASH_TIME : 0.45, good }; }
    nextRound() {
      this.round++;
      if (this.round >= 3) {
        this.complete(Math.max(1, this.passed), this.mistakes === 0);
      } else {
        this.phase = 'wait';
        this.waitT = BALLET_ROUND_PAUSE;
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
            this.showI++; this.showT = BALLET_SHOW_STEP_DELAY;
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

  /* ================= ART HOUSE : Stamp Studio ================= */
  const STAMP_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
  const STAMP_COLORS: [string, string][] = [
    ['red', '#e85a5a'], ['blue', '#5a8ae8'], ['green', '#6ab85f'],
    ['yellow', '#f0c040'], ['pink', '#f08ab8'], ['purple', '#9a7ad0'],
  ];
  interface StampOption { shape: string; colorName: string; color: string; }

  class StampStudioMinigame extends BaseMinigame {
    total: number;
    round: number;
    score: number;
    sel: number;
    fb: number;
    fbGood: boolean;
    target: StampOption | null;
    opts: StampOption[];
    ans: number;
    constructor(done: MinigameDone) {
      super(done);
      this.total = 8;
      this.round = 0;
      this.score = 0;
      this.sel = 0;
      this.fb = 0;
      this.fbGood = false;
      this.target = null;
      this.opts = [];
      this.ans = 0;
    }
    start() {
      this.phase = 'play';
      this.newStamp();
      AudioSys.sfx('confirm');
    }
    makeOption(shape?: string, color?: [string, string]): StampOption {
      const s = shape || STAMP_SHAPES[Math.floor(Math.random() * STAMP_SHAPES.length)];
      const c = color || STAMP_COLORS[Math.floor(Math.random() * STAMP_COLORS.length)];
      return { shape: s, colorName: c[0], color: c[1] };
    }
    sameStamp(a: StampOption, b: StampOption) {
      return a.shape === b.shape && a.colorName === b.colorName;
    }
    newStamp() {
      const target = this.makeOption();
      const opts = [target];
      let guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        const next = this.makeOption();
        if (!opts.some(o => this.sameStamp(o, next))) opts.push(next);
      }
      this.opts = pickN(opts, 4);
      this.target = target;
      this.ans = this.opts.findIndex(o => this.sameStamp(o, target));
      this.sel = 0;
      this.fb = 0;
      this.fbGood = false;
    }
    handleInput(act: string) {
      if (this.phase !== 'play' || this.fb > 0) return;
      if (act === 'left') { this.sel = this.sel % 2 === 0 ? this.sel : this.sel - 1; AudioSys.sfx('blip'); }
      else if (act === 'right') { this.sel = this.sel % 2 === 1 ? this.sel : this.sel + 1; AudioSys.sfx('blip'); }
      else if (act === 'up') { this.sel = this.sel < 2 ? this.sel : this.sel - 2; AudioSys.sfx('blip'); }
      else if (act === 'down') { this.sel = this.sel >= 2 ? this.sel : this.sel + 2; AudioSys.sfx('blip'); }
      else if (act === 'action') {
        this.fbGood = this.sel === this.ans;
        this.fb = this.fbGood ? 0.55 : 0.85;
        if (this.fbGood) { this.score++; AudioSys.sfx('star'); } else AudioSys.sfx('deny');
      }
    }
    updatePlay(dt: number) {
      if (this.phase !== 'play' || this.fb <= 0) return;
      this.fb -= dt;
      if (this.fb > 0) return;
      this.round++;
      if (this.round >= this.total) {
        this.complete(this.score >= 7 ? 3 : this.score >= 4 ? 2 : 1, this.score === this.total);
      } else {
        this.newStamp();
      }
    }
    drawStamp(g: Ctx, stamp: StampOption, cx: number, cy: number, r: number, pale = false) {
      g.save();
      if (pale) g.globalAlpha = 0.34;
      drawShape(g, stamp.shape, cx, cy, r, stamp.color);
      g.restore();
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#f1e8d4'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#dbe8f1'; g.fillRect(0, H - 155, W, 155);
      g.fillStyle = '#caa07a'; g.fillRect(W / 2 - 260, 118, 520, 18);
      g.fillRect(W / 2 - 18, 126, 36, 210);
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 6;
      rr(g, W / 2 - 235, 52, 470, 200, 14); g.stroke();
      g.fillStyle = '#fffdf5'; rr(g, W / 2 - 225, 62, 450, 180, 12); g.fill();
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 300, 640, 190, '#fff8ee');
        label(g, 'Stamp Studio!', W / 2, 355, 36, '#b85c8a');
        label(g, 'Mr. Doodle calls out a colored shape.', W / 2, 405, 21, '#5a4a6a');
        label(g, 'Pick the matching stamp with arrows, then press E!', W / 2, 440, 21, '#b85c8a');
        sprite(g, 'doodle', 'down', 0, W / 2, H - 40, 4);
        return;
      }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.score >= 7 ? 'Stamp-tastic!' : 'Lovely stamping!',
          this.score + ' of ' + this.total + ' stamps matched!', this.stars, this.rt);
        return;
      }
      if (!this.target) return;
      label(g, 'Stamp a ' + this.target.colorName + ' ' + this.target.shape + '!', W / 2, 88, 30, '#5a4a6a');
      this.drawStamp(g, this.target, W / 2, 168, 48);
      label(g, 'Stamp ' + (this.round + 1) + ' of ' + this.total + '   ·   ★ ' + this.score, W / 2, 285, 20, '#9a7ad0');
      const ox = W / 2 - 165, oy = 330;
      for (let i = 0; i < 4; i++) {
        const x = ox + (i % 2) * 330;
        const y = oy + Math.floor(i / 2) * 145;
        const isSel = i === this.sel;
        let fill = isSel ? '#fff' : '#fff8ee';
        if (this.fb > 0 && i === this.ans) fill = '#d8f5c8';
        if (this.fb > 0 && !this.fbGood && isSel) fill = '#f8d0d0';
        panel(g, x - 95, y - 55 + (isSel ? -8 : 0), 190, 110, fill);
        if (isSel) { rr(g, x - 95, y - 63, 190, 110, 18); g.strokeStyle = '#ffb84f'; g.lineWidth = 5; g.stroke(); }
        this.drawStamp(g, this.opts[i], x, y + (isSel ? -8 : 0), 33);
        label(g, this.opts[i].colorName, x, y + 48 + (isSel ? -8 : 0), 16, '#7a6a8a');
      }
      sprite(g, 'doodle', 'down', Math.floor(this.t * 3) % 2 ? 1 : 2, 110, H - 35, 3.5);
      sprite(g, 'starry', 'down', Math.floor(this.t * 3) % 2 ? 2 : 1, W - 110, H - 35, 3.5);
    }
  }

  /* ================= BAKERY : Cookie Helper ================= */
  interface BakeryTopping { name: string; kind: string; color: string; }
  const BAKERY_TOPPINGS: BakeryTopping[] = [
    { name: 'pink frosting', kind: 'frosting', color: '#f08ab8' },
    { name: 'sprinkles', kind: 'sprinkles', color: '#5a8ae8' },
    { name: 'berries', kind: 'berries', color: '#e85a5a' },
    { name: 'choc chips', kind: 'chips', color: '#6b4328' },
    { name: 'sugar stars', kind: 'stars', color: '#ffd95f' },
    { name: 'heart candies', kind: 'hearts', color: '#f06a8a' },
  ];

  function drawCookieTopping(g: Ctx, kind: string, cx: number, cy: number, r: number, col: string) {
    if (kind === 'frosting') {
      g.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.25;
        g.beginPath(); g.arc(cx + Math.cos(a) * r * .34, cy + Math.sin(a) * r * .24, r * .18, 0, 7); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, r * .34, 0, 7); g.fill();
    } else if (kind === 'sprinkles') {
      const cols = ['#e85a5a', '#5a8ae8', '#6ab85f', '#ffd95f', '#9a7ad0'];
      g.lineWidth = Math.max(3, r * .08);
      for (let i = 0; i < 10; i++) {
        const a = i * 1.7;
        const x = cx + Math.cos(a) * r * (0.18 + (i % 3) * .16);
        const y = cy + Math.sin(a * .8) * r * .48;
        g.strokeStyle = cols[i % cols.length];
        g.beginPath(); g.moveTo(x - r * .09, y - r * .04); g.lineTo(x + r * .09, y + r * .04); g.stroke();
      }
    } else if (kind === 'berries') {
      g.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        g.beginPath(); g.arc(cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .34, r * .13, 0, 7); g.fill();
      }
    } else if (kind === 'chips') {
      g.fillStyle = col;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.2;
        const x = cx + Math.cos(a) * r * (0.2 + (i % 2) * .22);
        const y = cy + Math.sin(a) * r * .38;
        g.beginPath(); g.moveTo(x, y - r * .11); g.lineTo(x + r * .12, y + r * .1); g.lineTo(x - r * .12, y + r * .1); g.closePath(); g.fill();
      }
    } else if (kind === 'stars') {
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        starPath(g, cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .35, r * .12);
        g.fillStyle = col; g.fill();
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5 + .3;
        drawShape(g, 'heart', cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .35, r * .13, col);
      }
    }
  }

  function drawCookie(g: Ctx, cx: number, cy: number, r: number, topping?: BakeryTopping) {
    g.fillStyle = '#d69a5b';
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.strokeStyle = '#9d673d'; g.lineWidth = Math.max(3, r * .08); g.stroke();
    g.fillStyle = '#8a5432';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.45 + .4;
      g.beginPath(); g.arc(cx + Math.cos(a) * r * .48, cy + Math.sin(a) * r * .38, r * .08, 0, 7); g.fill();
    }
    if (topping) drawCookieTopping(g, topping.kind, cx, cy, r, topping.color);
  }

  class CookieHelperMinigame extends ChoiceQuizMinigame {
    constructor(done: MinigameDone) {
      super(done, {
        title: 'Cookie Helper!',
        introLines: ['Mrs. Honey has warm cookies to decorate.', 'Arrows pick a topping · E adds it', 'Press E to start!'],
        introSprite: 'honey',
        footerSprite: 'starry',
        resultTitle: 'Fresh from the oven!',
        cardY: 395,
        cardH: 170,
        promptY: 74,
        progressY: 132,
        promptColor: '#7a4a34',
        progressColor: '#b85c8a',
      });
    }
    buildQuestion() {
      const opts = pickN(BAKERY_TOPPINGS, 3);
      const answer = opts[0];
      const shuffled = pickN(opts, 3);
      return { prompt: 'Add ' + answer.name + '!', opts: shuffled, ans: shuffled.indexOf(answer), topping: answer };
    }
    drawBackground(g: Ctx, W: number, H: number) {
      g.fillStyle = '#f8e7c8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e4b384'; g.fillRect(0, H - 155, W, 155);
      g.fillStyle = '#b9774d'; g.fillRect(0, 270, W, 52);
      g.fillStyle = '#fff0d2'; rr(g, 120, 92, 180, 120, 14); g.fill();
      g.fillStyle = '#b9774d'; rr(g, 142, 122, 136, 56, 10); g.fill();
      g.fillStyle = '#fff6e8'; rr(g, W - 305, 88, 190, 112, 14); g.fill();
      g.fillStyle = '#d69a5b'; rr(g, W - 275, 120, 130, 24, 10); g.fill();
      g.fillStyle = '#c48455'; rr(g, W - 255, 152, 90, 20, 10); g.fill();
      sprite(g, 'honey', 'down', Math.floor(this.t * 2) % 2 ? 1 : 0, 92, 316, 3.5);
    }
    drawPlayExtras(g: Ctx, W: number) {
      if (!this.q) return;
      g.fillStyle = '#b9774d'; rr(g, W / 2 - 150, 172, 300, 118, 18); g.fill();
      g.fillStyle = '#e0c4a2'; rr(g, W / 2 - 125, 188, 250, 86, 16); g.fill();
      drawCookie(g, W / 2, 231, 50, this.q.topping);
      label(g, 'decorate this cookie', W / 2, 308, 18, '#7a4a34');
    }
    drawOption(g: Ctx, opt: BakeryTopping, cx: number, cy: number) {
      drawCookie(g, cx, cy - 20, 42, opt);
      label(g, opt.name, cx, cy + 62, 17, '#5a4a6a');
    }
    resultSub() { return this.score + ' of 5 cookies decorated!'; }
  }

  /* ================= CITY : Roller Lab ================= */
  interface RollerLevel { name: string; rows: string[]; }
  const ROLL_LEVELS: RollerLevel[] = [
    {
      name: 'Star Ramp',
      rows: [
        '#############',
        '#...........#',
        '#...........#',
        '#...........#',
        '#...........#',
        '#S...*....G.#',
        '#############',
      ],
    },
    {
      name: 'Key Garden',
      rows: [
        '#############',
        '#...........#',
        '#...........#',
        '#...........#',
        '#...........#',
        '#S...K.D.*G.#',
        '#############',
      ],
    },
    {
      name: 'Tiny Switchback',
      rows: [
        '#############',
        '#...........#',
        '#...........#',
        '#...........#',
        '#...........#',
        '#S..*..K.DG.#',
        '#############',
      ],
    },
  ];
  const ROLL_CUSTOM_START = [
    '#############',
    '#...........#',
    '#...........#',
    '#...........#',
    '#...........#',
    '#S....*...G.#',
    '#############',
  ];
  const ROLL_GRAVITY = 9.4;
  const ROLL_MAX_SPEED = 7.0;
  const ROLL_PALETTE = ['.', '#', '*', 'K', 'D', 'G', 'S'];
  const ROLL_NAMES: Record<string, string> = {
    '.': 'path', '#': 'wall', '*': 'star', K: 'key', D: 'gate', G: 'goal', S: 'start',
  };

  class RollerLabMinigame extends BaseMinigame {
    menuSel: number;
    mode: 'trail' | 'custom';
    level: number;
    solved: number;
    grid: string[];
    custom: string[];
    w: number;
    h: number;
    ballX: number;
    ballY: number;
    vx: number;
    vy: number;
    starsGot: number;
    starsTotal: number;
    hasKey: boolean;
    cursorX: number;
    cursorY: number;
    msg: string;
    msgT: number;
    levelT: number;
    helperUsed: boolean;
    helped: number;
    constructor(done: MinigameDone) {
      super(done);
      this.menuSel = 0;
      this.mode = 'trail';
      this.level = 0;
      this.solved = 0;
      this.grid = [];
      this.custom = ROLL_CUSTOM_START.slice();
      this.w = 0;
      this.h = 0;
      this.ballX = 1.5;
      this.ballY = 1.5;
      this.vx = 0;
      this.vy = 0;
      this.starsGot = 0;
      this.starsTotal = 0;
      this.hasKey = false;
      this.cursorX = 1;
      this.cursorY = 1;
      this.msg = '';
      this.msgT = 0;
      this.levelT = 0;
      this.helperUsed = false;
      this.helped = 0;
    }
    key(act: string) {
      if (this.phase === 'intro') {
        if (act === 'left' || act === 'right') { this.menuSel = 1 - this.menuSel; AudioSys.sfx('blip'); }
        else if (act === 'action') {
          if (this.menuSel === 0) this.start();
          else this.startEditor();
        } else if (act === 'back') {
          // always-available exit so nobody is ever stuck in the park
          this.complete(Math.max(1, Math.min(3, this.solved)), false);
        }
        return;
      }
      if (this.phase === 'edit') {
        if (act === 'left') { this.cursorX = Math.max(1, this.cursorX - 1); AudioSys.sfx('blip'); }
        else if (act === 'right') { this.cursorX = Math.min(this.custom[0].length - 2, this.cursorX + 1); AudioSys.sfx('blip'); }
        else if (act === 'up') { this.cursorY = Math.max(1, this.cursorY - 1); AudioSys.sfx('blip'); }
        else if (act === 'down') { this.cursorY = Math.min(this.custom.length - 2, this.cursorY + 1); AudioSys.sfx('blip'); }
        else if (act === 'action') this.cycleTile();
        else if (act === 'back') this.startCustomTest();
        return;
      }
      super.key(act);
    }
    start() {
      this.mode = 'trail';
      this.level = 0;
      this.solved = 0;
      this.startLevel(ROLL_LEVELS[0].rows);
      AudioSys.sfx('confirm');
    }
    startEditor() {
      this.phase = 'edit';
      this.hasKey = false;   // so gates draw closed in the editor
      this.cursorX = 1;
      this.cursorY = 1;
      this.msg = 'Make a rolling maze';
      this.msgT = 2.2;
      AudioSys.sfx('confirm');
    }
    startCustomTest() {
      this.ensureCustomEndpoints();
      this.mode = 'custom';
      this.startLevel(this.custom);
      this.msg = 'Testing your map!';
      this.msgT = 2.4;
      AudioSys.sfx('confirm');
    }
    startLevel(rows: string[]) {
      this.phase = 'play';
      this.grid = rows.map(r => r);
      this.w = this.grid[0].length;
      this.h = this.grid.length;
      const s = this.findTile('S') || { x: 1, y: 1 };
      this.ballX = s.x + 0.5;
      this.ballY = s.y + 0.5;
      this.vx = 0;
      this.vy = 0;
      this.starsGot = 0;
      this.starsTotal = this.countTile('*');
      this.hasKey = false;
      this.levelT = 0;
      this.helperUsed = false;
      this.msg = this.mode === 'trail' ? ROLL_LEVELS[this.level].name : 'Your maze';
      this.msgT = 2.2;
    }
    findTile(ch: string) {
      for (let y = 0; y < this.grid.length; y++) {
        const x = this.grid[y].indexOf(ch);
        if (x >= 0) return { x, y };
      }
      return null;
    }
    countTile(ch: string) {
      let n = 0;
      for (const row of this.grid) for (const c of row) if (c === ch) n++;
      return n;
    }
    setGrid(x: number, y: number, ch: string) {
      this.grid[y] = this.grid[y].slice(0, x) + ch + this.grid[y].slice(x + 1);
    }
    setCustom(x: number, y: number, ch: string) {
      this.custom[y] = this.custom[y].slice(0, x) + ch + this.custom[y].slice(x + 1);
    }
    cycleTile() {
      const cur = this.custom[this.cursorY][this.cursorX];
      const next = ROLL_PALETTE[(Math.max(0, ROLL_PALETTE.indexOf(cur)) + 1) % ROLL_PALETTE.length];
      if (next === 'S' || next === 'G') {
        this.custom = this.custom.map(row => row.replace(next, '.'));
      }
      this.setCustom(this.cursorX, this.cursorY, next);
      this.msg = ROLL_NAMES[next];
      this.msgT = 1.4;
      AudioSys.sfx('pop');
    }
    ensureCustomEndpoints() {
      // drop missing markers on open path tiles so they never squash
      // each other (or end up buried in a wall)
      const openSpot = (fromEnd: boolean) => {
        const ys = [...this.custom.keys()];
        if (fromEnd) ys.reverse();
        for (const y of ys) {
          const row = this.custom[y];
          for (let i = 1; i < row.length - 1; i++) {
            const x = fromEnd ? row.length - 1 - i : i;
            if (row[x] === '.') return { x, y };
          }
        }
        return fromEnd ? { x: this.custom[0].length - 2, y: 1 } : { x: 1, y: 1 };
      };
      if (!this.custom.some(r => r.includes('S'))) {
        const p = openSpot(false);
        this.setCustom(p.x, p.y, 'S');
      }
      if (!this.custom.some(r => r.includes('G'))) {
        const p = openSpot(true);
        this.setCustom(p.x, p.y, 'G');
      }
    }
    handleInput(act: string) {
      if (this.phase !== 'play') return;
      if (act === 'action') { this.vx *= 0.35; this.vy *= 0.35; AudioSys.sfx('blip'); return; }
      if (act === 'back') {
        if (this.mode === 'custom') { this.phase = 'edit'; AudioSys.sfx('blip'); }
        else { this.phase = 'intro'; AudioSys.sfx('blip'); }
        return;
      }
      const push = 2.25;
      if (act === 'left') this.vx -= push;
      else if (act === 'right') this.vx += push;
      else if (act === 'up') {
        if (this.isGrounded()) { this.vy = -5.2; AudioSys.sfx('pop'); }
        return;
      }
      else if (act === 'down') this.vy += 3.2;
      else return;
      this.limitSpeed();
      AudioSys.sfx('blip');
    }
    updatePlay(dt: number) {
      if (this.phase !== 'play') {
        this.msgT = Math.max(0, this.msgT - dt);
        return;
      }
      this.levelT += dt;
      this.msgT = Math.max(0, this.msgT - dt);
      this.vy += ROLL_GRAVITY * dt;
      this.limitSpeed();
      const drag = Math.pow(0.75, dt * 5);
      this.vx *= drag;
      const sub = Math.max(1, Math.ceil(dt / 0.018));
      const step = dt / sub;
      for (let i = 0; i < sub; i++) this.stepBall(step);
      this.visitTile();
      if (this.mode === 'trail' && this.levelT > 70 && !this.helperUsed) {
        this.helperUsed = true;
        this.helped++;
        AudioSys.sfx('sparkle');
        this.finishLevel(true);
        if (this.phase === 'play') { this.msg = 'The park helper rolls the marble ahead!'; this.msgT = 2.6; }
      }
    }
    stepBall(dt: number) {
      const nx = this.ballX + this.vx * dt;
      if (!this.collides(nx, this.ballY)) this.ballX = nx;
      else this.vx *= -0.22;
      const ny = this.ballY + this.vy * dt;
      if (!this.collides(this.ballX, ny)) this.ballY = ny;
      else this.vy = this.vy > 0 ? 0 : this.vy * -0.22;
    }
    limitSpeed() {
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > ROLL_MAX_SPEED) { this.vx = this.vx / sp * ROLL_MAX_SPEED; this.vy = this.vy / sp * ROLL_MAX_SPEED; }
    }
    isGrounded() {
      return this.collides(this.ballX, this.ballY + 0.06);
    }
    collides(x: number, y: number) {
      const r = 0.28;
      for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
        for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
          if (!this.solidAt(tx, ty)) continue;
          if (x + r > tx && x - r < tx + 1 && y + r > ty && y - r < ty + 1) return true;
        }
      }
      return false;
    }
    solidAt(x: number, y: number) {
      if (x < 0 || y < 0 || y >= this.h || x >= this.w) return true;
      const ch = this.grid[y][x];
      return ch === '#' || (ch === 'D' && !this.hasKey);
    }
    visitTile() {
      const x = Math.floor(this.ballX), y = Math.floor(this.ballY);
      if (x < 0 || y < 0 || y >= this.h || x >= this.w) return;
      const ch = this.grid[y][x];
      if (ch === '*') {
        this.starsGot++;
        this.setGrid(x, y, '.');
        this.msg = 'Star collected!';
        this.msgT = 1.3;
        AudioSys.sfx('star');
      } else if (ch === 'K') {
        this.hasKey = true;
        this.setGrid(x, y, '.');
        this.msg = 'Gate key!';
        this.msgT = 1.5;
        AudioSys.sfx('sparkle');
      } else if (ch === 'G') {
        if (this.starsGot >= this.starsTotal) this.finishLevel();
        else if (this.msgT <= 0.2) {
          this.msg = 'Find the stars first!';
          this.msgT = 1.1;
          AudioSys.sfx('deny');
        }
      }
    }
    finishLevel(viaHelper = false) {
      AudioSys.sfx(viaHelper ? 'yay' : 'fanfare');
      if (this.mode === 'custom') {
        this.solved = 1;
        this.complete(3, true);
        return;
      }
      if (!viaHelper) this.solved++;
      if (this.level < ROLL_LEVELS.length - 1) {
        this.level++;
        this.startLevel(ROLL_LEVELS[this.level].rows);
      } else {
        this.complete(Math.max(1, 3 - this.helped), this.helped === 0);
      }
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      this.drawPark(g, W, H);
      if (this.phase === 'intro') { this.drawMenu(g, W, H); return; }
      if (this.phase === 'result') {
        resultScreen(g, W, H, this.mode === 'custom' ? 'Maze tested!' : 'Roller Lab complete!',
          this.mode === 'custom' ? 'Your marble found the goal!' : this.solved + ' of ' + ROLL_LEVELS.length + ' mazes solved!',
          this.stars, this.rt);
        return;
      }
      if (this.phase === 'edit') { this.drawEditor(g, W, H); return; }
      this.drawPlay(g, W, H);
    }
    drawPark(g: Ctx, W: number, H: number) {
      g.fillStyle = '#d8f2ee'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f3d29a'; g.fillRect(0, H - 145, W, 145);
      g.fillStyle = '#b86a8a'; rr(g, 80, 68, 250, 60, 18); g.fill();
      label(g, 'Wonder Roll Park', 205, 100, 25, '#fff8ee');
      g.fillStyle = '#ff9ec5'; rr(g, W - 230, 60, 150, 95, 20); g.fill();
      g.fillStyle = '#7fb8e8'; g.beginPath(); g.arc(W - 155, 108, 35, 0, 7); g.fill();
      g.fillStyle = '#ffd95f'; g.beginPath(); g.arc(W - 155, 108, 17, 0, 7); g.fill();
    }
    drawMenu(g: Ctx, W: number, H: number) {
      panel(g, W / 2 - 365, 195, 730, 340, '#fff8ee');
      label(g, 'Roller Lab', W / 2, 250, 42, '#b85c8a');
      label(g, 'Gravity tugs the marble through tiny logic mazes.', W / 2, 302, 22, '#5a4a6a');
      const cards = [
        ['Puzzle Trail', 'Three gentle marble mazes'],
        ['Map Maker', 'Build a maze and test it'],
      ];
      for (let i = 0; i < 2; i++) {
        const x = W / 2 + (i - 0.5) * 260;
        const y = 395;
        const sel = i === this.menuSel;
        panel(g, x - 110, y - 58 + (sel ? -8 : 0), 220, 116, sel ? '#fff' : '#f7efe4');
        if (sel) { rr(g, x - 110, y - 66, 220, 116, 18); g.strokeStyle = '#ffb84f'; g.lineWidth = 5; g.stroke(); }
        label(g, cards[i][0], x, y - 20 + (sel ? -8 : 0), 24, '#7a4a9a');
        label(g, cards[i][1], x, y + 22 + (sel ? -8 : 0), 17, '#5a4a6a');
      }
      label(g, 'Use ← → to choose · E picks · Esc when you\'re all done', W / 2, 493, 21, '#b85c8a');
      sprite(g, 'starry', 'down', Math.floor(this.t * 2) % 2 ? 1 : 2, W / 2, H - 25, 4);
    }
    drawPlay(g: Ctx, W: number, H: number) {
      const title = this.mode === 'trail' ? ROLL_LEVELS[this.level].name : 'Testing your map';
      label(g, title, W / 2, 62, 32, '#7a4a9a');
      label(g, 'Gravity pulls down   ·   Stars ' + this.starsGot + '/' + this.starsTotal + (this.hasKey ? '   ·   key!' : ''), W / 2, 103, 20, '#b85c8a');
      this.drawGrid(g, this.grid, W / 2, 176, true);
      if (this.msgT > 0) label(g, this.msg, W / 2, H - 78, 24, '#5a4a6a');
      label(g, '← → roll · ↑ hops · ↓ drops · E slows', W / 2, H - 38, 18, '#7a6a8a');
    }
    drawEditor(g: Ctx, W: number, H: number) {
      label(g, 'Map Maker', W / 2, 62, 34, '#7a4a9a');
      label(g, 'Move the cursor, stamp pieces, then test your maze.', W / 2, 105, 20, '#5a4a6a');
      this.drawGrid(g, this.custom, W / 2, 150, false);
      const cell = this.cellSize(this.custom);
      const ox = W / 2 - this.custom[0].length * cell / 2;
      const oy = 150;
      g.strokeStyle = '#ffb84f'; g.lineWidth = 5;
      rr(g, ox + this.cursorX * cell + 3, oy + this.cursorY * cell + 3, cell - 6, cell - 6, 8); g.stroke();
      const py = H - 118;
      const cur = this.custom[this.cursorY][this.cursorX];
      for (let i = 0; i < ROLL_PALETTE.length; i++) {
        const x = W / 2 - 240 + i * 80;
        if (ROLL_PALETTE[i] === cur) {
          rr(g, x - 30, py - 30, 60, 60, 12);
          g.fillStyle = 'rgba(255,184,79,.35)'; g.fill();
        }
        this.drawRollTile(g, ROLL_PALETTE[i], x - 24, py - 24, 48);
        label(g, ROLL_NAMES[ROLL_PALETTE[i]], x, py + 38, 13, '#5a4a6a');
      }
      if (this.msgT > 0) label(g, this.msg, W / 2, H - 64, 21, '#b85c8a');
      label(g, 'Current: ' + ROLL_NAMES[cur] + '   ·   E changes tile   ·   Esc tests', W / 2, H - 34, 18, '#7a6a8a');
    }
    cellSize(rows: string[]) {
      return Math.min(58, Math.floor(560 / rows[0].length));
    }
    drawGrid(g: Ctx, rows: string[], cx: number, top: number, withBall: boolean) {
      const cell = this.cellSize(rows);
      const ox = cx - rows[0].length * cell / 2;
      panel(g, ox - 16, top - 16, rows[0].length * cell + 32, rows.length * cell + 32, '#fff8ee');
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          this.drawRollTile(g, rows[y][x], ox + x * cell, top + y * cell, cell);
        }
      }
      if (withBall) {
        const bx = ox + this.ballX * cell, by = top + this.ballY * cell;
        g.fillStyle = '#9a7ad0'; g.beginPath(); g.arc(bx, by, cell * .28, 0, 7); g.fill();
        g.fillStyle = '#cdb0ee'; g.beginPath(); g.arc(bx - cell * .09, by - cell * .1, cell * .09, 0, 7); g.fill();
      }
    }
    drawRollTile(g: Ctx, ch: string, x: number, y: number, cell: number) {
      g.fillStyle = '#d9f2e7'; rr(g, x + 1, y + 1, cell - 2, cell - 2, 8); g.fill();
      if (ch === '#') {
        g.fillStyle = '#7a6a8a'; rr(g, x + 2, y + 2, cell - 4, cell - 4, 7); g.fill();
      } else if (ch === '*') {
        starPath(g, x + cell / 2, y + cell / 2, cell * .27); g.fillStyle = '#ffd95f'; g.fill();
      } else if (ch === 'K') {
        g.fillStyle = '#ffb84f'; g.beginPath(); g.arc(x + cell * .43, y + cell * .5, cell * .16, 0, 7); g.fill();
        g.fillRect(x + cell * .52, y + cell * .47, cell * .24, cell * .08);
        g.fillRect(x + cell * .68, y + cell * .5, cell * .06, cell * .13);
      } else if (ch === 'D') {
        g.fillStyle = this.hasKey ? 'rgba(154,219,122,.45)' : '#d8a45f';
        rr(g, x + cell * .2, y + cell * .15, cell * .6, cell * .7, 8); g.fill();
        label(g, this.hasKey ? 'open' : 'gate', x + cell / 2, y + cell / 2, Math.max(10, cell * .18), '#5a4a6a');
      } else if (ch === 'G') {
        g.fillStyle = '#7fb8e8'; rr(g, x + cell * .18, y + cell * .2, cell * .64, cell * .6, 10); g.fill();
        label(g, 'GO', x + cell / 2, y + cell / 2, Math.max(14, cell * .28), '#fff8ee');
      } else if (ch === 'S') {
        g.fillStyle = '#ff9ec5'; g.beginPath(); g.arc(x + cell / 2, y + cell / 2, cell * .22, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(120,90,120,.18)'; g.lineWidth = 1; g.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }
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
    cur: { dir: string; age: number } | null;
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
        if (this.wait <= 0) this.cur = { dir: DIRS[Math.floor(Math.random() * 4)], age: 0 };
      } else {
        this.cur.age += dt;
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
        label(g, 'Press that arrow to pick each carrot. Press E!', W / 2, 380, 21, '#b85c8a');
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
          const up = Math.min(1, this.cur.age * 6);
          const wiggle = up >= 1 ? Math.sin(this.cur.age * 10) * 3 : 0;
          g.drawImage(ic, x - 32 + wiggle, y + 16 - 76 * up, 64, 64);
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
  const HOPSCOTCH_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

  class HopscotchMinigame extends BaseMinigame {
    total: number;
    step: number;
    score: number;
    cur: { letter: string; age: number } | null;
    flash: number;
    goodFlash: boolean;
    constructor(done: MinigameDone) {
      super(done);
      this.inputMode = 'letters';
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
      this.cur = { letter: HOPSCOTCH_LETTERS[Math.floor(Math.random() * HOPSCOTCH_LETTERS.length)], age: 0 };
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
      if (this.phase !== 'play' || !/^[a-z]$/.test(act) || !this.cur) return;
      this.finishHop(act === this.cur.letter);
    }
    updatePlay(dt: number) {
      this.flash = Math.max(0, this.flash - dt);
      if (this.phase !== 'play' || !this.cur) return;
      this.cur.age += dt;
    }
    draw(g: Ctx) {
      const W = g.canvas.width, H = g.canvas.height;
      g.fillStyle = '#e8e2d8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#a8d8a0'; g.fillRect(0, H - 150, W, 150);
      if (this.phase === 'intro') {
        panel(g, W / 2 - 320, 225, 640, 190, '#fff8ee');
        label(g, 'Hopscotch Hero!', W / 2, 280, 36, '#9a7ad0');
        label(g, 'Hop to the letter on each chalk square.', W / 2, 330, 21, '#5a4a6a');
        label(g, 'Press the matching alphabet key. Press E!', W / 2, 365, 21, '#b85c8a');
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
          if (active && this.cur) label(g, this.cur.letter.toUpperCase(), x, y + 22, 25, '#5a4a6a');
        }
      }
      const px = sx, py = top + this.step * 45 + 42;
      sprite(g, 'starry', 'down', Math.floor(this.t * 6) % 2 ? 1 : 2, px, py + Math.sin(this.t * 12) * 6, 3.5);
      if (this.cur) {
        const pulse = 1 + Math.sin(this.cur.age * 10) * 0.08;
        label(g, this.cur.letter.toUpperCase(), sx, 120, 68 * pulse, '#5a4a6a');
      }
      if (this.flash > 0) label(g, this.goodFlash ? 'Hop!' : 'Wobble!', W / 2, H - 82, 28, this.goodFlash ? '#6ab85f' : '#d85a5a');
    }
  }

  const registry: Record<string, MinigameCtor> = {};
  const metas: Record<string, MinigameMeta> = {};
  const api: Record<string, any> = {
    create(name: string, done: MinigameDone): Minigame {
      const Ctor = registry[name];
      if (!Ctor) throw new Error('Unknown minigame: ' + name);
      return new Ctor(done);
    },
    /** Register a game and its metadata. This is the single integration
        point: launchers get the economics from meta(), and dev/smoke.js
        automatically plays every registered game using meta().keys. */
    register(name: string, Ctor: MinigameCtor, meta: MinigameMetaInput) {
      registry[name] = Ctor;
      metas[name] = { energy: 12, minutes: 40, minEnergy: 15, ...meta };
      api[name] = (done: MinigameDone) => new Ctor(done);
    },
    meta(name: string): MinigameMeta | undefined { return metas[name]; },
    types() { return Object.keys(registry); },
    BaseMinigame,
    ChoiceQuizMinigame,
  };

  // classes (launched on a schedule via CLASS_INFO in main.ts — their
  // energy/minutes here only apply if something launches them as fun games)
  api.register('school', SchoolMinigame, {
    label: 'Letter Time', keys: ['left', 'right', 'action'],
    description: "Ms. Bloom's letter, shape, and color questions.",
  });
  api.register('swim', SwimMinigame, {
    label: 'Splash Dash', keys: ['left', 'right'],
    description: 'Paddle ← → one after the other and out-swim the pace duck.',
  });
  api.register('ballet', BalletMinigame, {
    label: 'Waltz Steps', keys: ['up', 'down', 'left', 'right'],
    description: "Watch Madame Plié's routine, then repeat it with the arrows.",
  });
  api.register('art', ArtMinigame, {
    label: 'Painting Time', keys: ['left', 'right', 'action'],
    description: "Mr. Doodle's color-mixing questions.",
  });

  // just-for-fun games (launched by NPCs, freeGames lists, or tiles)
  api.register('math', MathMinigame, {
    label: 'Number Time', energy: 0, minutes: 20, minEnergy: 0,
    keys: ['left', 'right', 'action'],
    description: 'Counting, adding, and taking away with little fruit rows.',
  });
  api.register('stampstudio', StampStudioMinigame, {
    label: 'Stamp Studio', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['up', 'down', 'left', 'right', 'action'],
    description: 'Match Mr. Doodle\'s requested colored shape stamp.',
  });
  api.register('cookiehelper', CookieHelperMinigame, {
    label: 'Cookie Helper', energy: 6, minutes: 20, minEnergy: 5,
    keys: ['left', 'right', 'action'],
    description: 'Decorate warm bakery cookies with Mrs. Honey by matching toppings.',
  });
  api.register('rollerlab', RollerLabMinigame, {
    label: 'Roller Lab', energy: 10, minutes: 35, minEnergy: 10,
    keys: ['left', 'right', 'up', 'down', 'action'],
    description: 'Roll a gravity-pulled marble through logic mazes or build and test a tiny custom map.',
  });
  api.register('shells', ShellsMinigame, {
    label: 'Shell Splash', keys: ['left', 'right'],
    description: 'Catch the falling shells in a bucket, three lanes.',
  });
  api.register('veggies', VeggiesMinigame, {
    label: 'Veggie Round-up', keys: ['up', 'down', 'left', 'right'],
    description: 'Pick each popped carrot with the matching arrow; carrots stay up until picked.',
  });
  api.register('bubblepop', BubblePopMinigame, {
    label: 'Bubble Pop', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['left', 'right', 'action'],
    description: 'Slide under rising bubbles and pop them with E.',
  });
  api.register('balloonbop', BalloonBopMinigame, {
    label: 'Balloon Bop', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['up', 'down', 'left', 'right'],
    description: 'Each balloon shows an arrow — press it before it floats off.',
  });
  api.register('hopscotch', HopscotchMinigame, {
    label: 'Hopscotch Hero', energy: 8, minutes: 25, minEnergy: 10,
    keys: HOPSCOTCH_LETTERS,
    description: 'Hop the chalk course by matching each alphabet letter at your own pace.',
  });

  return api;
})();
