import { AudioSys } from '../audio';
import { SpriteLib } from '../sprites';
import { BaseMinigame, label, panel, resultScreen, sprite, starPath, type Ctx, type MinigameDone } from './shared';

/* ================= BEACH : Shell Splash ================= */
export class ShellsMinigame extends BaseMinigame {
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
