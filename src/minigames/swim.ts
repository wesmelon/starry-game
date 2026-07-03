import { AudioSys } from '../audio';
import { SpriteLib } from '../sprites';
import { BaseMinigame, label, panel, resultScreen, rr, sprite, type Ctx, type MinigameDone } from './shared';

/* ================= SWIM : Splash Dash ================= */
export class SwimMinigame extends BaseMinigame {
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
