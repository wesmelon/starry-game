import { AudioSys } from '../audio';
import { BaseMinigame, drawShape, label, panel, pickN, resultScreen, rr, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= ART HOUSE : Stamp Studio ================= */
const STAMP_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const STAMP_COLORS: [string, string][] = [
  ['red', '#e85a5a'], ['blue', '#5a8ae8'], ['green', '#6ab85f'],
  ['yellow', '#f0c040'], ['pink', '#f08ab8'], ['purple', '#9a7ad0'],
];
export interface StampOption { shape: string; colorName: string; color: string; }

export class StampStudioMinigame extends BaseMinigame {
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
