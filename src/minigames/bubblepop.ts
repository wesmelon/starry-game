import { AudioSys } from '../audio';
import { BaseMinigame, label, panel, resultScreen, rr, sprite, starPath, type Ctx, type MinigameDone } from './shared';

/* ================= CITY : Bubble Pop ================= */
export class BubblePopMinigame extends BaseMinigame {
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
