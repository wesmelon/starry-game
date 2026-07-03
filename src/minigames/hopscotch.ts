import { AudioSys } from '../audio';
import { BaseMinigame, label, panel, resultScreen, rr, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= CITY : Hopscotch Hero ================= */
export const HOPSCOTCH_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export class HopscotchMinigame extends BaseMinigame {
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
