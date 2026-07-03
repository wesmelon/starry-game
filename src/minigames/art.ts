import { cap, ChoiceQuizMinigame, label, pickN, type Ctx, type MinigameDone } from './shared';

/* ================= ART : Painting Time ================= */
const PCOLORS: Record<string, string> = {
  red: '#e85a5a', blue: '#5a8ae8', green: '#6ab85f', yellow: '#f0c040',
  pink: '#f08ab8', purple: '#9a7ad0', orange: '#f09040', white: '#fdfdfa',
};
const MIXES = [
  ['red', 'yellow', 'orange'], ['blue', 'yellow', 'green'],
  ['red', 'blue', 'purple'], ['red', 'white', 'pink'],
];
const THINGS = [
  ['a banana', 'yellow'], ['a little frog', 'green'], ['the big sky', 'blue'],
  ['a strawberry', 'red'], ["Starry's dress", 'pink'], ['juicy grapes', 'purple'],
  ['a crunchy carrot', 'orange'], ['a fluffy cloud', 'white'],
];
function paintBlob(g: Ctx, cx: number, cy: number, r: number, col: string) {
  g.fillStyle = col;
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.beginPath(); g.arc(cx - r * .5, cy - r * .55, r * .45, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + r * .55, cy + r * .4, r * .4, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.beginPath(); g.arc(cx - r * .3, cy - r * .3, r * .18, 0, 7); g.fill();
}

export class ArtMinigame extends ChoiceQuizMinigame {
  colorNames: string[];
  constructor(done: MinigameDone) {
    super(done, {
      title: 'Painting Time!',
      introLines: ['Mr. Doodle asks 5 colorful questions.', 'Arrows pick a paint blob · E chooses it', 'Press E to start!'],
      introSprite: 'doodle',
      footerSprite: 'starry',
      promptSize: 32,
      resultTitle: 'What a masterpiece!',
    });
    this.colorNames = Object.keys(PCOLORS);
  }
  buildQuestion() {
    let prompt, answer;
    if (Math.random() < 0.5) {
      const m = MIXES[Math.floor(Math.random() * MIXES.length)];
      prompt = cap(m[0]) + ' and ' + m[1] + ' make...?';
      answer = m[2];
    } else {
      const th = THINGS[Math.floor(Math.random() * THINGS.length)];
      prompt = 'What color is ' + th[0] + '?';
      answer = th[1];
    }
    const opts = pickN(this.colorNames.filter(n => n !== answer), 2).concat([answer]);
    const shuffled = pickN(opts, 3);
    return { prompt, opts: shuffled, ans: shuffled.indexOf(answer) };
  }
  drawBackground(g: Ctx, W: number, H: number) {
    g.fillStyle = '#f1e8d4'; g.fillRect(0, 0, W, H);
    const bandCols = ['#e85a5a', '#f09040', '#f0c040', '#6ab85f', '#5a8ae8', '#9a7ad0'];
    bandCols.forEach((c, i) => { g.fillStyle = c; g.fillRect(W / 2 - 330, 30 + i * 18, 660, 18); });
    g.strokeStyle = '#8a6a4a'; g.lineWidth = 10; g.strokeRect(W / 2 - 330, 30, 660, 108);
  }
  drawOption(g: Ctx, opt: any, cx: number, cy: number) {
    paintBlob(g, cx, cy - 10, 46, PCOLORS[opt]);
    label(g, opt, cx, cy + 76, 21, '#5a4a6a');
  }
  resultSub() { return this.score + ' of 5 — hang it on the fridge!'; }
}
