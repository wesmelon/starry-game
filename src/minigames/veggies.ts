import { AudioSys } from '../audio';
import { SpriteLib } from '../sprites';
import { ARROW_GLYPHS, BaseMinigame, DIRS, label, panel, resultScreen, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= FARM : Veggie Round-up ================= */
export class VeggiesMinigame extends BaseMinigame {
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
