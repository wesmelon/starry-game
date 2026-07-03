import { AudioSys } from '../audio';
import { ARROW_GLYPHS, BaseMinigame, DIRS, label, panel, resultScreen, rr, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= CITY : Balloon Bop ================= */
const BALLOON_COLORS = ['#ff6f9e', '#7fb8e8', '#ffd95f', '#9adb7a', '#cdb0ee'];

export class BalloonBopMinigame extends BaseMinigame {
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
