import { AudioSys } from '../audio';
import { SpriteLib } from '../sprites';
import type { Minigame, MinigameDone, MinigameInputMode } from '../types';

export type { Minigame, MinigameDone, MinigameInputMode };

export type Ctx = CanvasRenderingContext2D;
export type MinigameCtor = new (done: MinigameDone) => Minigame;

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

export interface QuizCfg {
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
export interface QuizQuestion {
  prompt: string;
  opts: any[];
  ans: number;
  [extra: string]: any;
}

export const FONT = (s: number, w = 700) => `${w} ${s}px "Comic Sans MS", "Segoe UI", sans-serif`;

export function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
export function panel(g: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  g.save();
  g.shadowColor = 'rgba(60,30,60,.25)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
  rr(g, x, y, w, h, 18); g.fillStyle = fill; g.fill();
  g.restore();
}
export function label(g: Ctx, txt: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center', weight = 700) {
  g.font = FONT(size, weight); g.textAlign = align; g.textBaseline = 'middle';
  g.lineWidth = Math.max(3, size / 7); g.strokeStyle = 'rgba(255,255,255,.85)';
  g.strokeText(txt, x, y);
  g.fillStyle = col; g.fillText(txt, x, y);
}
export function starPath(g: Ctx, cx: number, cy: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
export function drawStars(g: Ctx, cx: number, cy: number, n: number, t: number) {
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
export function sprite(g: Ctx, name: string, dir: string, frame: number, x: number, y: number, scale: number) {
  const c = SpriteLib.chr(name, dir, frame);
  if (c) g.drawImage(c, x - c.width * scale / 2, y - c.height * scale, c.width * scale, c.height * scale);
}
function resultUpdate(mg: { rt: number }, dt: number) { mg.rt += dt; }
export function resultScreen(g: Ctx, W: number, H: number, title: string, sub: string, stars: number, t: number) {
  panel(g, W / 2 - 260, H / 2 - 150, 520, 300, '#fff8ee');
  label(g, title, W / 2, H / 2 - 95, 34, '#b85c8a');
  drawStars(g, W / 2, H / 2, stars, t);
  label(g, sub, W / 2, H / 2 + 70, 19, '#7a6a8a');
  if (t > 1.2 && Math.floor(t * 2) % 2 === 0) label(g, 'Press E to finish', W / 2, H / 2 + 112, 16, '#9a8ab8');
}
export function pickN<T>(arr: T[], n: number): T[] {
  const pool = arr.slice(), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export class BaseMinigame {
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

export class ChoiceQuizMinigame extends BaseMinigame {
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

export function drawShape(g: Ctx, kind: string, cx: number, cy: number, r: number, col: string) {
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

export function drawSchoolBoard(g: Ctx, W: number) {
  g.fillStyle = '#fdf3dc'; g.fillRect(0, 0, W, g.canvas.height);
  g.fillStyle = '#3f7a5a'; g.fillRect(W / 2 - 330, 30, 660, 110);
  g.strokeStyle = '#8a6a4a'; g.lineWidth = 10; g.strokeRect(W / 2 - 330, 30, 660, 110);
}

export const DIRS: string[] = ['up', 'down', 'left', 'right'];
export const ARROW_GLYPHS: Record<string, string> = { up: '↑', down: '↓', left: '←', right: '→' };
