import { AudioSys } from '../audio';
import { BaseMinigame, DIRS, label, panel, resultScreen, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= BALLET : Waltz Steps ================= */
const POSES: Record<string, { name: string; note: string }> = {
  up: { name: 'Arabesque!', note: 'A5' },
  down: { name: 'Plié!', note: 'E5' },
  left: { name: 'Twirl left!', note: 'C5' },
  right: { name: 'Twirl right!', note: 'G5' },
};
const BALLET_FIRST_STEP_DELAY = 1.15;
const BALLET_SHOW_STEP_DELAY = 1.1;
const BALLET_FLASH_TIME = 0.65;
const BALLET_ROUND_PAUSE = 1.7;

export class BalletMinigame extends BaseMinigame {
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
