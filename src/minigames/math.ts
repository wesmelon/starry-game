import { ChoiceQuizMinigame, drawSchoolBoard, label, pickN, rr, starPath, type Ctx, type MinigameDone } from './shared';

/* ================= SCHOOL : Number Time ================= */
function numberChoices(answer: number, min: number, max: number) {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) if (i !== answer) pool.push(i);
  return pickN(pool, 2).concat([answer]);
}
const MATH_THINGS: Record<string, [string, string]> = {
  apple: ['apple', 'apples'],
  orange: ['orange', 'oranges'],
  berry: ['berry', 'berries'],
  banana: ['banana', 'bananas'],
  strawberry: ['strawberry', 'strawberries'],
  star: ['star', 'stars'],
  block: ['block', 'blocks'],
};
const MATH_KINDS = Object.keys(MATH_THINGS);

function plural(kind: string, n: number) {
  const names = MATH_THINGS[kind] || ['thing', 'things'];
  return names[n === 1 ? 0 : 1];
}
function drawMathThing(g: Ctx, kind: string, cx: number, cy: number, r: number, dim?: boolean) {
  g.save();
  if (dim) g.globalAlpha = 0.32;
  if (kind === 'star') {
    starPath(g, cx, cy, r);
    g.fillStyle = '#ffd95f'; g.fill();
    g.strokeStyle = '#e8a020'; g.lineWidth = 2; g.stroke();
  } else if (kind === 'block') {
    g.fillStyle = '#8fd0e8'; rr(g, cx - r, cy - r, r * 2, r * 2, 6); g.fill();
    g.strokeStyle = '#5a8ab8'; g.lineWidth = 3; g.stroke();
  } else if (kind === 'orange') {
    g.fillStyle = '#f09040'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = '#ffd28a'; g.beginPath(); g.arc(cx - r * .28, cy - r * .28, r * .2, 0, 7); g.fill();
    g.fillStyle = '#6ab85f'; g.beginPath(); g.ellipse(cx + r * .3, cy - r * .86, r * .42, r * .2, -0.4, 0, 7); g.fill();
  } else if (kind === 'berry') {
    g.fillStyle = '#5a8ae8'; g.beginPath(); g.arc(cx, cy, r * .88, 0, 7); g.fill();
    g.fillStyle = '#3f5fb8'; g.beginPath(); g.arc(cx + r * .26, cy - r * .24, r * .22, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx - r * .25, cy - r * .28, r * .18, 0, 7); g.fill();
  } else if (kind === 'banana') {
    g.fillStyle = '#f5cf4f';
    g.beginPath();
    g.moveTo(cx - r * 1.05, cy - r * .25);
    g.bezierCurveTo(cx - r * .55, cy + r * .9, cx + r * .8, cy + r * .75, cx + r * 1.18, cy - r * .28);
    g.bezierCurveTo(cx + r * .72, cy + r * .18, cx - r * .42, cy + r * .2, cx - r * .82, cy - r * .55);
    g.closePath(); g.fill();
    g.strokeStyle = '#b87830'; g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(cx - r * 1.05, cy - r * .25);
    g.bezierCurveTo(cx - r * .55, cy + r * .9, cx + r * .8, cy + r * .75, cx + r * 1.18, cy - r * .28);
    g.stroke();
    g.strokeStyle = '#fff0a0'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - r * .58, cy - r * .13);
    g.bezierCurveTo(cx - r * .2, cy + r * .42, cx + r * .45, cy + r * .42, cx + r * .82, cy - r * .05);
    g.stroke();
    g.fillStyle = '#8a5a30';
    g.beginPath(); g.ellipse(cx - r * .98, cy - r * .34, r * .17, r * .09, -0.6, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + r * 1.2, cy - r * .3, r * .15, r * .09, -0.35, 0, 7); g.fill();
  } else if (kind === 'strawberry') {
    g.fillStyle = '#e85a5a';
    g.beginPath();
    g.moveTo(cx, cy + r * .9);
    g.bezierCurveTo(cx - r * 1.1, cy + r * .15, cx - r * .75, cy - r * .8, cx, cy - r * .35);
    g.bezierCurveTo(cx + r * .75, cy - r * .8, cx + r * 1.1, cy + r * .15, cx, cy + r * .9);
    g.fill();
    g.fillStyle = '#ffd8a8';
    for (let i = 0; i < 5; i++) g.fillRect(cx - r * .45 + i * r * .22, cy - r * .05 + (i % 2) * r * .28, 2, 3);
    g.fillStyle = '#6ab85f';
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.ellipse(cx + i * r * .23, cy - r * .62, r * .2, r * .38, i * .5, 0, 7); g.fill();
    }
  } else {
    g.fillStyle = '#e85a5a'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = '#6ab85f'; g.beginPath(); g.ellipse(cx + r * .35, cy - r * .85, r * .45, r * .22, -0.5, 0, 7); g.fill();
  }
  g.restore();
}
function drawMathRow(g: Ctx, kind: string, count: number, cx: number, cy: number, opts: { gap?: number; r?: number; crossedFrom?: number } = {}) {
  const gap = opts.gap || 48;
  const r = opts.r || 20;
  const start = cx - (count - 1) * gap / 2;
  for (let i = 0; i < count; i++) {
    const x = start + i * gap;
    const crossed = opts.crossedFrom !== undefined && i >= opts.crossedFrom;
    drawMathThing(g, kind, x, cy, r, crossed);
    if (crossed) {
      g.strokeStyle = '#d85a5a';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(x - r * 1.1, cy - r * 1.1); g.lineTo(x + r * 1.1, cy + r * 1.1); g.stroke();
      g.beginPath(); g.moveTo(x + r * 1.1, cy - r * 1.1); g.lineTo(x - r * 1.1, cy + r * 1.1); g.stroke();
    }
  }
}

export class MathMinigame extends ChoiceQuizMinigame {
  constructor(done: MinigameDone) {
    super(done, {
      title: 'Number Time!',
      introLines: ['Ms. Bloom has 5 tiny number puzzles.', 'Arrows pick a number · E chooses it', 'Press E to start!'],
      introSprite: 'msbloom',
      footerSprite: 'starry',
      resultTitle: 'Numbers sparkle!',
      cardY: 320,
      cardH: 170,
      promptSize: 34,
    });
  }
  buildQuestion() {
    const type = ['count', 'add', 'take'][Math.floor(Math.random() * 3)];
    let answer: number, prompt: string, detail: any;
    if (type === 'count') {
      answer = 1 + Math.floor(Math.random() * 6);
      const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
      prompt = 'How many ' + plural(kind, answer) + '?';
      detail = { type, count: answer, kind };
    } else if (type === 'add') {
      const a = 1 + Math.floor(Math.random() * 5);
      const b = 1 + Math.floor(Math.random() * 4);
      const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
      answer = a + b;
      prompt = a + ' ' + plural(kind, a) + ' + ' + b + ' more = ?';
      detail = { type, a, b, kind };
    } else {
      const a = 3 + Math.floor(Math.random() * 6);
      const b = 1 + Math.floor(Math.random() * Math.min(4, a - 1));
      const kind = MATH_KINDS[Math.floor(Math.random() * MATH_KINDS.length)];
      answer = a - b;
      prompt = a + ' ' + plural(kind, a) + ', take away ' + b + ' = ?';
      detail = { type, a, b, kind };
    }
    const opts = pickN(numberChoices(answer, 0, 10), 3);
    return Object.assign(detail, { prompt, opts, ans: opts.indexOf(answer), answer });
  }
  drawBackground(g: Ctx, W: number) { drawSchoolBoard(g, W); }
  drawPlayExtras(g: Ctx, W: number) {
    if (this.q!.type === 'count') {
      drawMathRow(g, this.q!.kind, this.q!.count, W / 2, 245, { gap: 58, r: 22 });
    } else if (this.q!.type === 'add') {
      drawMathRow(g, this.q!.kind, this.q!.a, W / 2 - 185, 245, { gap: 44, r: 20 });
      label(g, '+', W / 2, 245, 44, '#5a4a6a');
      drawMathRow(g, this.q!.kind, this.q!.b, W / 2 + 185, 245, { gap: 44, r: 20 });
    } else if (this.q!.type === 'take') {
      drawMathRow(g, this.q!.kind, this.q!.a, W / 2, 245, { gap: 48, r: 20, crossedFrom: this.q!.a - this.q!.b });
      label(g, 'Take away the crossed-out ones', W / 2, 285, 17, '#7a6a8a');
    }
  }
  drawOption(g: Ctx, opt: any, cx: number, cy: number) {
    label(g, String(opt), cx, cy, 72, '#5a6ac8');
  }
  resultSub() { return this.score + ' of 5 — super counting!'; }
}
