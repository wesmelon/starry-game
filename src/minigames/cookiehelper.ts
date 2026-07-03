import { ChoiceQuizMinigame, drawShape, label, pickN, rr, sprite, starPath, type Ctx, type MinigameDone } from './shared';

/* ================= BAKERY : Cookie Helper ================= */
export interface BakeryTopping { name: string; kind: string; color: string; }
const BAKERY_TOPPINGS: BakeryTopping[] = [
  { name: 'pink frosting', kind: 'frosting', color: '#f08ab8' },
  { name: 'sprinkles', kind: 'sprinkles', color: '#5a8ae8' },
  { name: 'berries', kind: 'berries', color: '#e85a5a' },
  { name: 'choc chips', kind: 'chips', color: '#6b4328' },
  { name: 'sugar stars', kind: 'stars', color: '#ffd95f' },
  { name: 'heart candies', kind: 'hearts', color: '#f06a8a' },
];

function drawCookieTopping(g: Ctx, kind: string, cx: number, cy: number, r: number, col: string) {
  if (kind === 'frosting') {
    g.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.25;
      g.beginPath(); g.arc(cx + Math.cos(a) * r * .34, cy + Math.sin(a) * r * .24, r * .18, 0, 7); g.fill();
    }
    g.beginPath(); g.arc(cx, cy, r * .34, 0, 7); g.fill();
  } else if (kind === 'sprinkles') {
    const cols = ['#e85a5a', '#5a8ae8', '#6ab85f', '#ffd95f', '#9a7ad0'];
    g.lineWidth = Math.max(3, r * .08);
    for (let i = 0; i < 10; i++) {
      const a = i * 1.7;
      const x = cx + Math.cos(a) * r * (0.18 + (i % 3) * .16);
      const y = cy + Math.sin(a * .8) * r * .48;
      g.strokeStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(x - r * .09, y - r * .04); g.lineTo(x + r * .09, y + r * .04); g.stroke();
    }
  } else if (kind === 'berries') {
    g.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      g.beginPath(); g.arc(cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .34, r * .13, 0, 7); g.fill();
    }
  } else if (kind === 'chips') {
    g.fillStyle = col;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.2;
      const x = cx + Math.cos(a) * r * (0.2 + (i % 2) * .22);
      const y = cy + Math.sin(a) * r * .38;
      g.beginPath(); g.moveTo(x, y - r * .11); g.lineTo(x + r * .12, y + r * .1); g.lineTo(x - r * .12, y + r * .1); g.closePath(); g.fill();
    }
  } else if (kind === 'stars') {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      starPath(g, cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .35, r * .12);
      g.fillStyle = col; g.fill();
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + .3;
      drawShape(g, 'heart', cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .35, r * .13, col);
    }
  }
}

function drawCookie(g: Ctx, cx: number, cy: number, r: number, topping?: BakeryTopping) {
  g.fillStyle = '#d69a5b';
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = '#9d673d'; g.lineWidth = Math.max(3, r * .08); g.stroke();
  g.fillStyle = '#8a5432';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.45 + .4;
    g.beginPath(); g.arc(cx + Math.cos(a) * r * .48, cy + Math.sin(a) * r * .38, r * .08, 0, 7); g.fill();
  }
  if (topping) drawCookieTopping(g, topping.kind, cx, cy, r, topping.color);
}

export class CookieHelperMinigame extends ChoiceQuizMinigame {
  constructor(done: MinigameDone) {
    super(done, {
      title: 'Cookie Helper!',
      introLines: ['Mrs. Honey has warm cookies to decorate.', 'Arrows pick a topping · E adds it', 'Press E to start!'],
      introSprite: 'honey',
      footerSprite: 'starry',
      resultTitle: 'Fresh from the oven!',
      cardY: 395,
      cardH: 170,
      promptY: 74,
      progressY: 132,
      promptColor: '#7a4a34',
      progressColor: '#b85c8a',
    });
  }
  buildQuestion() {
    const opts = pickN(BAKERY_TOPPINGS, 3);
    const answer = opts[0];
    const shuffled = pickN(opts, 3);
    return { prompt: 'Add ' + answer.name + '!', opts: shuffled, ans: shuffled.indexOf(answer), topping: answer };
  }
  drawBackground(g: Ctx, W: number, H: number) {
    g.fillStyle = '#f8e7c8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e4b384'; g.fillRect(0, H - 155, W, 155);
    g.fillStyle = '#b9774d'; g.fillRect(0, 270, W, 52);
    g.fillStyle = '#fff0d2'; rr(g, 120, 92, 180, 120, 14); g.fill();
    g.fillStyle = '#b9774d'; rr(g, 142, 122, 136, 56, 10); g.fill();
    g.fillStyle = '#fff6e8'; rr(g, W - 305, 88, 190, 112, 14); g.fill();
    g.fillStyle = '#d69a5b'; rr(g, W - 275, 120, 130, 24, 10); g.fill();
    g.fillStyle = '#c48455'; rr(g, W - 255, 152, 90, 20, 10); g.fill();
    sprite(g, 'honey', 'down', Math.floor(this.t * 2) % 2 ? 1 : 0, 92, 316, 3.5);
  }
  drawPlayExtras(g: Ctx, W: number) {
    if (!this.q) return;
    g.fillStyle = '#b9774d'; rr(g, W / 2 - 150, 172, 300, 118, 18); g.fill();
    g.fillStyle = '#e0c4a2'; rr(g, W / 2 - 125, 188, 250, 86, 16); g.fill();
    drawCookie(g, W / 2, 231, 50, this.q.topping);
    label(g, 'decorate this cookie', W / 2, 308, 18, '#7a4a34');
  }
  drawOption(g: Ctx, opt: BakeryTopping, cx: number, cy: number) {
    drawCookie(g, cx, cy - 20, 42, opt);
    label(g, opt.name, cx, cy + 62, 17, '#5a4a6a');
  }
  resultSub() { return this.score + ' of 5 cookies decorated!'; }
}
