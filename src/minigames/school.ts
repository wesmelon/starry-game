import { ChoiceQuizMinigame, drawSchoolBoard, drawShape, label, pickN, type Ctx, type MinigameDone } from './shared';

/* ================= SCHOOL : Letter Time ================= */
const LETTERS = 'ABCDEFGHKMPRST'.split('');
const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart'];
const COLORS = [['red', '#e85a5a'], ['blue', '#5a8ae8'], ['green', '#6ab85f'], ['yellow', '#f0c040'], ['pink', '#f08ab8'], ['purple', '#9a7ad0']];

export class SchoolMinigame extends ChoiceQuizMinigame {
  constructor(done: MinigameDone) {
    super(done, {
      title: 'Letter Time!',
      introLines: ['Ms. Bloom asks 5 little questions.', 'Arrows pick a card · E chooses it', 'Press E to start!'],
      introSprite: 'msbloom',
      footerSprite: 'starry',
      resultTitle: 'Class is over!',
    });
  }
  buildQuestion() {
    const type = ['letter', 'shape', 'color'][Math.floor(Math.random() * 3)];
    let opts: any[], prompt: string;
    if (type === 'letter') { opts = pickN(LETTERS, 3); prompt = 'Find the letter ' + opts[0] + '!'; }
    else if (type === 'shape') { opts = pickN(SHAPES, 3); prompt = 'Find the ' + opts[0] + '!'; }
    else { opts = pickN(COLORS, 3); prompt = 'Find the ' + opts[0][0] + ' balloon!'; }
    const answer = opts[0];
    const shuffled = pickN(opts, 3);
    return { type, prompt, opts: shuffled, ans: shuffled.indexOf(answer) };
  }
  drawBackground(g: Ctx, W: number) { drawSchoolBoard(g, W); }
  drawOption(g: Ctx, opt: any, cx: number, cy: number) {
    if (this.q!.type === 'letter') label(g, opt, cx, cy, 86, '#5a6ac8');
    else if (this.q!.type === 'shape') drawShape(g, opt, cx, cy, 55, '#f08ab8');
    else {
      drawShape(g, 'circle', cx, cy - 8, 48, opt[1]);
      g.strokeStyle = '#888'; g.beginPath(); g.moveTo(cx, cy + 40); g.lineTo(cx, cy + 78); g.stroke();
    }
  }
  resultSub() { return this.score + ' of 5 — wonderful!'; }
}
