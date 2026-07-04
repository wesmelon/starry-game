import { AudioSys } from '../audio';
import { BaseMinigame, label, panel, resultScreen, rr, sprite, starPath, type Ctx, type MinigameDone } from './shared';

/* ================= CITY : Roller Lab ================= */
export interface RollerLevel { name: string; rows: string[]; }
const ROLL_LEVELS: RollerLevel[] = [
  {
    name: 'Two-Floor Drop',
    rows: [
      '###############',
      '#S..*......B..#',
      '######...######',
      '#.............#',
      '#.....*^......#',
      '#..#########..#',
      '#...........G.#',
      '###############',
    ],
  },
  {
    name: 'Key Garden',
    rows: [
      '###############',
      '#S..K.........#',
      '######...######',
      '#.............#',
      '#....*..B.D...#',
      '#..#########..#',
      '#..........G..#',
      '###############',
    ],
  },
  {
    name: 'Tiny Switchback',
    rows: [
      '###############',
      '#S..........*.#',
      '#####...#######',
      '#.............#',
      '#..*..^..K....#',
      '#..########..D#',
      '#............G#',
      '###############',
    ],
  },
  {
    name: 'Balcony Bounce',
    rows: [
      '###############',
      '#S............#',
      '#######..######',
      '#.......*..B..#',
      '#..#######....#',
      '#.^.K.....D...#',
      '#..#########G.#',
      '###############',
    ],
  },
  {
    name: 'Star Basement',
    rows: [
      '###############',
      '#..S*.........#',
      '#..######..####',
      '#.^...........#',
      '####..#########',
      '#...K....*..DG#',
      '#..############',
      '###############',
    ],
  },
  {
    name: 'Wonder Tower',
    rows: [
      '###############',
      '#S....*.......#',
      '########..#####',
      '#......B....K.#',
      '#..#########..#',
      '#.^...*...D...#',
      '#..#########G.#',
      '###############',
    ],
  },
];
const ROLL_CUSTOM_START = [
  '###############',
  '#S....*....B..#',
  '######...######',
  '#.............#',
  '#......^......#',
  '#..#########..#',
  '#..........G..#',
  '###############',
];
const ROLL_GRAVITY = 9.4;
const ROLL_MAX_SPEED = 7.0;
const ROLL_DRIVE_SPEED = 4.8;
const ROLL_DRIVE_TIME = 0.34;
const ROLL_HOP = -5.6;
// pads must reliably clear a full floor gap (~3 tiles): v²/2g ≈ 3.3
const ROLL_BOUNCE = -7.9;
const ROLL_BALL_R = 0.38;
const ROLL_PALETTE = ['.', '#', '*', 'K', 'D', 'B', '^', 'G', 'S'];
const ROLL_NAMES: Record<string, string> = {
  '.': 'path', '#': 'wall', '*': 'star', K: 'key', D: 'gate', B: 'box', '^': 'bounce', G: 'goal', S: 'start',
};

export class RollerLabMinigame extends BaseMinigame {
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
  rollIntent: number;
  rollT: number;
  spin: number;
  bounceT: number;
  pauseSel: number;
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
    this.rollIntent = 0;
    this.rollT = 0;
    this.spin = 0;
    this.bounceT = 0;
    this.pauseSel = 0;
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
    if (this.phase === 'pause') {
      const opts = this.pauseOptions();
      if (act === 'up') { this.pauseSel = (this.pauseSel - 1 + opts.length) % opts.length; AudioSys.sfx('blip'); }
      else if (act === 'down') { this.pauseSel = (this.pauseSel + 1) % opts.length; AudioSys.sfx('blip'); }
      else if (act === 'action') this.choosePause();
      else if (act === 'back') { this.phase = 'play'; AudioSys.sfx('blip'); }   // Esc again = quick resume
      return;
    }
    super.key(act);
  }
  // stuck on a floor (a pushed box sealed the only route, a drop left no
  // way back up)? Esc always opens this — resume, restart fresh, or leave.
  openPause() {
    this.phase = 'pause';
    this.pauseSel = 0;
    AudioSys.sfx('blip');
  }
  pauseOptions(): string[] {
    return this.mode === 'custom'
      ? ['Keep rolling', 'Restart this test', 'Back to Map Maker', 'Leave Roller Lab']
      : ['Keep rolling', 'Restart this floor', 'Leave Roller Lab'];
  }
  choosePause() {
    const choice = this.pauseOptions()[this.pauseSel];
    AudioSys.sfx('confirm');
    if (choice === 'Keep rolling') this.phase = 'play';
    else if (choice === 'Restart this floor') this.startLevel(ROLL_LEVELS[this.level].rows);
    else if (choice === 'Restart this test') this.startCustomTest();
    else if (choice === 'Back to Map Maker') this.phase = 'edit';
    else if (choice === 'Leave Roller Lab') {
      // matches the intro's own "leave" reward: credit for floors already
      // solved, a gentle 1 star for an in-progress map test
      this.complete(this.mode === 'custom' ? 1 : Math.max(1, Math.min(3, this.solved)), false);
    }
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
    this.rollIntent = 0;
    this.rollT = 0;
    this.bounceT = 0;
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
    if (act === 'back') { this.openPause(); return; }
    if (act === 'left' || act === 'right') {
      this.rollIntent = act === 'left' ? -1 : 1;
      this.rollT = ROLL_DRIVE_TIME;
    }
    else if (act === 'up') {
      if (this.isGrounded()) { this.vy = ROLL_HOP; AudioSys.sfx('pop'); }
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
    this.bounceT = Math.max(0, this.bounceT - dt);
    this.vy += ROLL_GRAVITY * dt;
    if (this.rollT > 0) {
      const target = this.rollIntent * ROLL_DRIVE_SPEED * (this.isGrounded() ? 1 : 0.75);
      this.vx += (target - this.vx) * Math.min(1, dt * 18);
      this.rollT = Math.max(0, this.rollT - dt);
    }
    // when the drive window ends, the marble decelerates through drag
    // below (not an instant stop) so it actually rolls to a halt
    this.limitSpeed();
    const drag = Math.pow(this.isGrounded() ? 0.35 : 0.78, dt * 5);
    this.vx *= drag;
    this.spin += this.vx * dt * 3.8;
    const sub = Math.max(1, Math.ceil(dt / 0.018));
    const step = dt / sub;
    for (let i = 0; i < sub; i++) this.stepBall(step);
    this.visitTile();
    if (this.mode === 'trail' && this.levelT > 45 && !this.helperUsed) {
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
    else if (this.tryPushBox(nx, this.ballY, Math.sign(this.vx))) {
      if (!this.collides(nx, this.ballY)) this.ballX = nx;
      this.vx *= 0.3;
    } else this.vx = 0;
    const ny = this.ballY + this.vy * dt;
    if (!this.collides(this.ballX, ny)) this.ballY = ny;
    else this.vy = this.vy > 0 ? 0 : this.vy * -0.22;
  }
  tryPushBox(x: number, y: number, dir: number) {
    if (!dir) return false;
    const box = this.touchingBox(x, y);
    if (!box) return false;
    const nx = box.x + dir;
    if (nx < 1 || nx >= this.w - 1 || !this.canMoveBoxInto(nx, box.y)) return false;
    this.setGrid(nx, box.y, 'B');
    this.setGrid(box.x, box.y, '.');
    this.msg = 'Box moved!';
    this.msgT = 1.0;
    AudioSys.sfx('pop');
    return true;
  }
  canMoveBoxInto(x: number, y: number) {
    const ch = this.grid[y][x];
    return ch === '.' || (ch === 'D' && this.hasKey);
  }
  touchingBox(x: number, y: number) {
    const r = ROLL_BALL_R;
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
      for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
        if (ty >= 0 && ty < this.h && tx >= 0 && tx < this.w && this.grid[ty][tx] === 'B') return { x: tx, y: ty };
      }
    }
    return null;
  }
  limitSpeed() {
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > ROLL_MAX_SPEED) { this.vx = this.vx / sp * ROLL_MAX_SPEED; this.vy = this.vy / sp * ROLL_MAX_SPEED; }
  }
  isGrounded() {
    // only the row strictly below the ball's own footprint counts —
    // touching a side wall must never register as standing on ground
    // (that let a mashed ↑ climb straight up a wall)
    const r = ROLL_BALL_R;
    const below = Math.floor(this.ballY + r + 0.02);
    if (below <= Math.floor(this.ballY)) return false;
    for (let tx = Math.floor(this.ballX - r + 0.02); tx <= Math.floor(this.ballX + r - 0.02); tx++) {
      if (this.solidAt(tx, below)) return true;
    }
    return false;
  }
  collides(x: number, y: number) {
    const r = ROLL_BALL_R;
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
    return ch === '#' || ch === 'B' || (ch === 'D' && !this.hasKey);
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
    } else if (ch === '^' && this.bounceT <= 0) {
      this.vy = ROLL_BOUNCE;
      this.bounceT = 0.22;
      this.msg = 'Boing!';
      this.msgT = 0.9;
      AudioSys.sfx('whee');
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
    this.solved++;
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
    if (this.phase === 'pause') this.drawPauseOverlay(g, W, H);
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
      ['Puzzle Trail', 'Six gravity mazes'],
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
    const progress = this.mode === 'trail' ? 'Floor ' + (this.level + 1) + '/' + ROLL_LEVELS.length + '   ·   ' : '';
    label(g, progress + 'Stars ' + this.starsGot + '/' + this.starsTotal + (this.hasKey ? '   ·   key!' : ''), W / 2, 103, 20, '#b85c8a');
    this.drawGrid(g, this.grid, W / 2, 176, true);
    if (this.msgT > 0) label(g, this.msg, W / 2, H - 78, 24, '#5a4a6a');
    label(g, '← → scoot · ↑ hop · ↓ fall fast · E brake · Esc pause', W / 2, H - 38, 18, '#7a6a8a');
  }
  drawPauseOverlay(g: Ctx, W: number, H: number) {
    g.fillStyle = 'rgba(60,40,70,.45)'; g.fillRect(0, 0, W, H);
    const opts = this.pauseOptions();
    const rowH = 54, h = 90 + opts.length * rowH, y0 = H / 2 - h / 2;
    panel(g, W / 2 - 220, y0, 440, h, '#fff8ee');
    label(g, 'Take a breath', W / 2, y0 + 46, 28, '#b85c8a');
    for (let i = 0; i < opts.length; i++) {
      const y = y0 + 92 + i * rowH;
      const sel = i === this.pauseSel;
      if (sel) { rr(g, W / 2 - 190, y - 24, 380, 48, 14); g.fillStyle = 'rgba(255,184,79,.3)'; g.fill(); }
      label(g, opts[i], W / 2, y, 22, sel ? '#7a4a9a' : '#5a4a6a');
    }
    label(g, '↑↓ choose · E picks · Esc resumes', W / 2, y0 + h - 18, 15, '#9a8ab8');
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
      this.drawBall(g, bx, by, cell);
    }
  }
  drawBall(g: Ctx, bx: number, by: number, cell: number) {
    const r = cell * 0.4;
    g.fillStyle = 'rgba(60,40,80,.18)';
    g.beginPath(); g.ellipse(bx, by + r * .86, r * .9, r * .24, 0, 0, 7); g.fill();
    g.fillStyle = '#ff9ec5'; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
    g.strokeStyle = '#b85c8a'; g.lineWidth = Math.max(2, cell * .05); g.stroke();
    g.fillStyle = '#ffd1e3'; g.beginPath(); g.arc(bx - r * .24, by - r * .28, r * .28, 0, 7); g.fill();
    g.fillStyle = '#3b2948';
    g.beginPath(); g.arc(bx - r * .33, by - r * .12, r * .085, 0, 7); g.fill();
    g.beginPath(); g.arc(bx + r * .33, by - r * .12, r * .085, 0, 7); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(bx - r * .36, by - r * .16, r * .028, 0, 7); g.fill();
    g.beginPath(); g.arc(bx + r * .30, by - r * .16, r * .028, 0, 7); g.fill();
    g.fillStyle = '#ff74a8';
    g.beginPath(); g.arc(bx - r * .48, by + r * .08, r * .095, 0, 7); g.fill();
    g.beginPath(); g.arc(bx + r * .48, by + r * .08, r * .095, 0, 7); g.fill();
    g.strokeStyle = '#6d4160'; g.lineWidth = Math.max(1.5, cell * .035);
    g.beginPath(); g.arc(bx, by + r * .06, r * .22, 0.15, Math.PI - 0.15); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(2, cell * .04);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(this.spin) * r * .62, by + Math.sin(this.spin) * r * .62);
    g.stroke();
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
    } else if (ch === 'B') {
      g.fillStyle = '#d49a5c'; rr(g, x + cell * .16, y + cell * .18, cell * .68, cell * .64, 8); g.fill();
      g.strokeStyle = '#8a5a35'; g.lineWidth = Math.max(2, cell * .05); g.stroke();
      g.strokeStyle = '#a87840'; g.lineWidth = Math.max(2, cell * .04);
      g.beginPath(); g.moveTo(x + cell * .28, y + cell * .5); g.lineTo(x + cell * .72, y + cell * .5); g.stroke();
      g.beginPath(); g.moveTo(x + cell * .5, y + cell * .28); g.lineTo(x + cell * .5, y + cell * .72); g.stroke();
    } else if (ch === '^') {
      g.fillStyle = '#ff9ec5'; rr(g, x + cell * .18, y + cell * .56, cell * .64, cell * .22, 8); g.fill();
      g.strokeStyle = '#b85c8a'; g.lineWidth = Math.max(2, cell * .05); g.stroke();
      g.fillStyle = '#ffd95f';
      g.beginPath(); g.moveTo(x + cell * .5, y + cell * .22); g.lineTo(x + cell * .72, y + cell * .55); g.lineTo(x + cell * .28, y + cell * .55); g.closePath(); g.fill();
    } else if (ch === 'G') {
      g.fillStyle = '#7fb8e8'; rr(g, x + cell * .18, y + cell * .2, cell * .64, cell * .6, 10); g.fill();
      label(g, 'GO', x + cell / 2, y + cell / 2, Math.max(14, cell * .28), '#fff8ee');
    } else if (ch === 'S') {
      g.fillStyle = '#ff9ec5'; g.beginPath(); g.arc(x + cell / 2, y + cell / 2, cell * .22, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(120,90,120,.18)'; g.lineWidth = 1; g.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
  }
}
