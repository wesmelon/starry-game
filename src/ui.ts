/* ======================================================================
   Starry ☆ Little Days — ui.js
   Dialogue, HUD, title, sticker book, journal, summary, toasts, tint.
   ====================================================================== */

import { AudioSys } from './audio';
import { SpriteLib } from './sprites';
import { Maps } from './maps';
import { Entities } from './entities';
import type { GView } from './types';

type Ctx = CanvasRenderingContext2D;
export interface ChoiceOpt { label: string; value: string | null; }
interface Dialog {
  name: string;
  lines: string[];
  idx: number;
  chars: number;
  choices: ChoiceOpt[] | null;
  pendingChoices?: ChoiceOpt[] | null;
  sel: number;
  onDone?: ((v: string | null) => void) | null;
}

export const UI = (() => {

  const FONT = (s: number, w = 700) => `${w} ${s}px "Comic Sans MS", "Segoe UI", sans-serif`;
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function panel(g: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
    g.save();
    g.shadowColor = 'rgba(50,25,55,.3)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
    rr(g, x, y, w, h, 14); g.fillStyle = fill; g.fill();
    g.restore();
    if (stroke) { rr(g, x, y, w, h, 14); g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); }
  }
  function text(g: Ctx, txt: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'left', weight = 700) {
    g.font = FONT(size, weight); g.textAlign = align; g.textBaseline = 'middle';
    g.fillStyle = col; g.fillText(txt, x, y);
  }
  function heart(g: Ctx, cx: number, cy: number, r: number, col: string) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx, cy + r * .9);
    g.bezierCurveTo(cx - r * 1.4, cy - r * .1, cx - r * .7, cy - r, cx, cy - r * .35);
    g.bezierCurveTo(cx + r * .7, cy - r, cx + r * 1.4, cy - r * .1, cx, cy + r * .9);
    g.fill();
  }
  function starShape(g: Ctx, cx: number, cy: number, r: number, col: string) {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 ? r * 0.45 : r;
      i ? g.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad)
        : g.moveTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
    }
    g.closePath(); g.fill();
  }
  function wrap(g: Ctx, txt: string, size: number, maxW: number) {
    g.font = FONT(size);
    const words = txt.split(' '), lines = [];
    let cur = '';
    for (const w of words) {
      const tryLine = cur ? cur + ' ' + w : w;
      if (g.measureText(tryLine).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = tryLine;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------------- dialogue ----------------
  let dialog: Dialog | null = null;

  function say(name: string, lines: string[], onDone?: ((v: string | null) => void) | null) {
    dialog = { name, lines: lines.slice(), idx: 0, chars: 0, choices: null, sel: 0, onDone };
  }
  function choose(name: string, prompt: string, opts: ChoiceOpt[], onDone: (v: string | null) => void) {
    dialog = { name, lines: [prompt], idx: 0, chars: 0, pendingChoices: opts, choices: null, sel: 0, onDone };
  }
  const active = () => !!dialog;

  function dialogKey(act: string) {
    if (!dialog) return false;
    const d = dialog;
    const lineLen = d.lines[d.idx].length;
    if (d.choices) {
      if (act === 'up' || act === 'left') { d.sel = (d.sel + d.choices.length - 1) % d.choices.length; AudioSys.sfx('blip'); }
      if (act === 'down' || act === 'right') { d.sel = (d.sel + 1) % d.choices.length; AudioSys.sfx('blip'); }
      if (act === 'action') {
        const val = d.choices[d.sel].value;
        dialog = null;
        AudioSys.sfx('select');
        if (d.onDone) d.onDone(val);
      }
      return true;
    }
    if (act === 'action') {
      if (d.chars < lineLen) { d.chars = lineLen; return true; }
      if (d.idx < d.lines.length - 1) { d.idx++; d.chars = 0; AudioSys.sfx('blip'); return true; }
      if (d.pendingChoices) { d.choices = d.pendingChoices; d.pendingChoices = null; return true; }
      dialog = null;
      if (d.onDone) d.onDone(null);
      return true;
    }
    return true; // swallow keys while talking
  }

  function dialogUpdate(dt: number) {
    if (!dialog) return;
    const d = dialog;
    if (d.chars < d.lines[d.idx].length) {
      const before = Math.floor(d.chars);
      d.chars = Math.min(d.lines[d.idx].length, d.chars + dt * 40);
      if (Math.floor(d.chars) > before && Math.floor(d.chars) % 3 === 0) AudioSys.sfx('blip');
    } else if (d.pendingChoices && d.idx === d.lines.length - 1) {
      d.choices = d.pendingChoices; d.pendingChoices = null;
    }
  }

  function drawDialog(g: Ctx) {
    if (!dialog) return;
    const d = dialog;
    const W = g.canvas.width, H = g.canvas.height;
    const bx = 70, bw = W - 140, bh = 130, by = H - bh - 24;
    panel(g, bx, by, bw, bh, 'rgba(255,250,240,.96)', '#e0b8d0');
    if (d.name) {
      panel(g, bx + 18, by - 20, Math.max(110, d.name.length * 13 + 30), 38, '#ffb7d2');
      text(g, d.name, bx + 18 + Math.max(110, d.name.length * 13 + 30) / 2, by - 1, 18, '#7a3a5a', 'center');
    }
    const shown = d.lines[d.idx].slice(0, Math.floor(d.chars));
    const lines = wrap(g, shown, 20, bw - 60);
    lines.forEach((ln, i) => text(g, ln, bx + 30, by + 36 + i * 28, 20, '#4a3a5a'));
    if (d.choices) {
      const cw = 240, ch = d.choices.length * 44 + 20;
      const cx = W - 140 - cw, cy = by - ch - 10;
      panel(g, cx, cy, cw, ch, 'rgba(255,250,240,.97)', '#e0b8d0');
      d.choices.forEach((c, i) => {
        if (i === d.sel) {
          rr(g, cx + 10, cy + 12 + i * 44, cw - 20, 38, 10);
          g.fillStyle = '#ffe6f0'; g.fill();
          starShape(g, cx + 28, cy + 31 + i * 44, 9, '#ffb84f');
        }
        text(g, c.label, cx + 44, cy + 31 + i * 44, 19, i === d.sel ? '#b85c8a' : '#6a5a7a');
      });
    } else if (d.chars >= d.lines[d.idx].length) {
      const blink = Math.floor(performance.now() / 400) % 2 === 0;
      if (blink) text(g, '▾', bx + bw - 32, by + bh - 22, 22, '#cf8ab0', 'center');
    }
  }

  // ---------------- toasts ----------------
  const toasts: { msg: string; icon?: string; t: number }[] = [];
  function toast(msg: string, icon?: string) { toasts.push({ msg, icon, t: 0 }); }
  function toastUpdate(dt: number) {
    if (toasts.length) {
      toasts[0].t += dt;
      if (toasts[0].t > 3) toasts.shift();
    }
  }
  function drawToasts(g: Ctx) {
    if (!toasts.length) return;
    const t = toasts[0];
    const W = g.canvas.width;
    const a = Math.min(1, t.t * 4, (3 - t.t) * 2);
    const y = 64 - (t.t < 0.25 ? (0.25 - t.t) * 120 : 0);
    g.save(); g.globalAlpha = Math.max(0, a);
    g.font = FONT(19);
    const w = g.measureText(t.msg).width + (t.icon ? 76 : 44);
    panel(g, W / 2 - w / 2, y - 22, w, 44, 'rgba(255,250,240,.95)', '#e0b8d0');
    if (t.icon) {
      const ic = SpriteLib.icon(t.icon);
      if (ic) g.drawImage(ic, W / 2 - w / 2 + 14, y - 16, 32, 32);
    }
    text(g, t.msg, W / 2 + (t.icon ? 16 : 0), y + 1, 19, '#7a4a6a', 'center');
    g.restore();
  }

  // ---------------- HUD ----------------
  function fmtClock(min: number) {
    let h = Math.floor(min / 60), m = Math.floor(min % 60);
    const ap = h >= 12 ? 'pm' : 'am';
    let hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function planFor(dow: number) {
    if (dow <= 4) {
      const aft = (dow === 0 || dow === 2 || dow === 4) ? 'Ballet 2pm' : 'Swim 2pm';
      return 'School 9am · ' + aft;
    }
    return 'Art 9am · then free play!';
  }

  function drawHUD(g: Ctx, G: GView) {
    const W = g.canvas.width;
    // left: energy + stars
    panel(g, 16, 14, 218, 78, 'rgba(255,250,240,.92)');
    const spr = SpriteLib.chr('starry', 'down', 0);
    g.drawImage(spr, 24, 20, 36, 42);
    heart(g, 80, 36, 9, '#ff6f9e');
    g.fillStyle = 'rgba(150,130,150,.3)'; rr(g, 94, 28, 126, 14, 7); g.fill();
    const e = Math.max(0, G.energy) / 100;
    g.fillStyle = e > 0.25 ? '#ff8fb8' : '#e85a5a';
    if (e > 0) { rr(g, 94, 28, Math.max(10, 126 * e), 14, 7); g.fill(); }
    starShape(g, 80, 64, 10, '#ffd95f');
    text(g, '× ' + G.stars, 96, 65, 19, '#8a6a3a');
    if (G.energy < 20) text(g, 'so sleepy...', 150, 65, 15, '#9a8ab8');
    else {
      const snacks = [];
      if (G.treats > 0) snacks.push(G.treats + ' treats');
      if (G.duckFood > 0) snacks.push(G.duckFood + ' ducky');
      if (snacks.length) text(g, snacks.join(' · '), 148, 65, 13, '#9a8ab8', 'left', 400);
    }
    // right: day + clock + plan
    panel(g, W - 250, 14, 234, 78, 'rgba(255,250,240,.92)');
    const moon = G.tmin >= 19 * 60 || G.tmin < 6 * 60;
    if (moon) { g.drawImage(SpriteLib.icon('moon'), W - 240, 22, 28, 28); }
    else { g.drawImage(SpriteLib.icon('sun'), W - 240, 22, 28, 28); }
    text(g, DAY_NAMES[G.dow] + ' · Day ' + G.day, W - 204, 30, 17, '#7a4a6a');
    text(g, fmtClock(G.tmin), W - 204, 54, 17, '#7a4a6a');
    text(g, planFor(G.dow), W - 240, 78, 14, '#9a7ad0');
  }

  function drawLocation(g: Ctx, label_: string, t: number) {
    if (t <= 0) return;
    const a = Math.min(1, t);
    g.save(); g.globalAlpha = a;
    g.font = FONT(22);
    const w = g.measureText(label_).width + 50;
    panel(g, g.canvas.width / 2 - w / 2, 110, w, 44, 'rgba(70,45,80,.75)');
    text(g, label_, g.canvas.width / 2, 133, 22, '#ffe6f0', 'center');
    g.restore();
  }

  // ---------------- day/night tint ----------------
  function drawTint(g: Ctx, tmin: number, outdoor: boolean) {
    const W = g.canvas.width, H = g.canvas.height;
    const h = tmin / 60;
    let dusk = 0, night = 0;
    if (h >= 17 && h < 20) dusk = 1 - Math.abs(h - 18.5) / 1.5;
    if (h >= 19) night = Math.min(1, (h - 19) / 2.5);
    if (h < 7.5) night = Math.max(night, 0.5);
    if (dusk > 0) { g.fillStyle = `rgba(255,140,70,${(dusk * (outdoor ? 0.18 : 0.08)).toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (night > 0) { g.fillStyle = `rgba(24,22,64,${(night * (outdoor ? 0.5 : 0.28)).toFixed(3)})`; g.fillRect(0, 0, W, H); }
  }

  // ---------------- title ----------------
  function drawTitle(g: Ctx, t: number, hasSave: boolean, sel: number, started: boolean) {
    const W = g.canvas.width, H = g.canvas.height;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2b2440'); grad.addColorStop(0.6, '#5a4a7a'); grad.addColorStop(1, '#b87aa0');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // twinkling stars
    for (let i = 0; i < 40; i++) {
      const x = (i * 257 + 80) % W, y = (i * 173 + 40) % (H * 0.55);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      g.fillStyle = `rgba(255,240,200,${tw.toFixed(2)})`;
      g.fillRect(x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
    }
    starShape(g, W / 2 + 235, 145, 26 + Math.sin(t * 2) * 3, '#ffd95f');
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = FONT(74);
    g.lineWidth = 12; g.strokeStyle = '#4a2a50'; g.strokeText('Starry', W / 2, 150);
    g.fillStyle = '#ffb7d2'; g.fillText('Starry', W / 2, 150);
    g.font = FONT(30);
    g.lineWidth = 7; g.strokeStyle = '#4a2a50'; g.strokeText('☆ Little Days ☆', W / 2, 225);
    g.fillStyle = '#ffe6a0'; g.fillText('☆ Little Days ☆', W / 2, 225);
    g.restore();
    text(g, 'a very small life in Starview Meadow', W / 2, 270, 17, '#d8c8e8', 'center', 400);
    // starry toddling along the bottom
    const wx = (t * 60) % (W + 100) - 50;
    const dir = 'right';
    const c = SpriteLib.chr('starry', dir, Math.floor(t * 6) % 2 + 1);
    g.drawImage(c, wx, H - 120, 48, 56);
    if (!started) {
      if (Math.floor(t * 1.6) % 2 === 0) text(g, '— press any key —', W / 2, H / 2 + 80, 22, '#fff0f8', 'center');
      return;
    }
    const opts = hasSave ? ['Continue', 'New Game'] : ['New Game'];
    opts.forEach((o, i) => {
      const y = H / 2 + 60 + i * 56;
      if (i === sel) {
        panel(g, W / 2 - 140, y - 24, 280, 48, 'rgba(255,230,240,.92)');
        starShape(g, W / 2 - 110, y, 11, '#ffb84f');
      }
      text(g, o, W / 2, y, 24, i === sel ? '#b85c8a' : '#e8d8f0', 'center');
    });
    text(g, 'arrows + E / Enter', W / 2, H - 40, 15, '#c8b8d8', 'center', 400);
  }

  // ---------------- day summary ----------------
  function drawSummary(g: Ctx, G: unknown, info: { day: number; lines: string[] }, t: number) {
    const W = g.canvas.width, H = g.canvas.height;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1c1834'); grad.addColorStop(1, '#3a3060');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      const x = (i * 311 + 60) % W, y = (i * 139 + 30) % (H * 0.5);
      g.fillStyle = `rgba(255,240,200,${(0.3 + 0.7 * Math.abs(Math.sin(t + i))).toFixed(2)})`;
      g.fillRect(x, y, 2, 2);
    }
    g.drawImage(SpriteLib.icon('moon'), W / 2 + 180, 70, 64, 64);
    panel(g, W / 2 - 270, 130, 540, 360, 'rgba(255,250,240,.95)');
    text(g, 'Goodnight, Day ' + info.day + '!', W / 2, 180, 32, '#7a4a6a', 'center');
    const lines = info.lines.length ? info.lines : ['A quiet little day. Those are nice too.'];
    lines.slice(0, 6).forEach((ln, i) => text(g, '· ' + ln, W / 2 - 230, 235 + i * 36, 19, '#5a4a6a'));
    if (t > 1 && Math.floor(t * 1.6) % 2 === 0)
      text(g, 'Press E for a brand new day', W / 2, 455, 18, '#b85c8a', 'center');
  }

  // ---------------- sticker book ----------------
  function drawBook(g: Ctx, G: { stickers: string[] }, sel: number) {
    const W = g.canvas.width, H = g.canvas.height;
    g.fillStyle = 'rgba(40,25,50,.6)'; g.fillRect(0, 0, W, H);
    const S = Entities.STICKERS;
    const cols = 8, cell = 84, rows = Math.ceil(S.length / cols);
    const oy = 150;
    panel(g, W / 2 - 350, 50, 700, oy - 50 + rows * cell + 110, '#fff6e8', '#e0b8d0');
    text(g, '☆ My Sticker Book ☆', W / 2, 95, 30, '#b85c8a', 'center');
    const got = G.stickers;
    text(g, got.length + ' / ' + S.length + ' collected', W / 2, 132, 17, '#9a8ab8', 'center');
    const ox = W / 2 - cols * cell / 2;
    S.forEach((st, i) => {
      const x = ox + (i % cols) * cell, y = oy + Math.floor(i / cols) * cell;
      const has = got.includes(st.id);
      rr(g, x + 8, y + 8, cell - 16, cell - 16, 12);
      g.fillStyle = i === sel ? '#ffe6f0' : (has ? '#fff' : 'rgba(180,170,190,.18)');
      g.fill();
      if (i === sel) { rr(g, x + 8, y + 8, cell - 16, cell - 16, 12); g.strokeStyle = '#ffb84f'; g.lineWidth = 4; g.stroke(); }
      if (has) g.drawImage(SpriteLib.icon(st.icon), x + cell / 2 - 28, y + cell / 2 - 28, 56, 56);
      else text(g, '?', x + cell / 2, y + cell / 2, 30, 'rgba(140,120,150,.5)', 'center');
    });
    const st = S[sel];
    const has = got.includes(st.id);
    text(g, has ? st.name : '? ? ?', W / 2, oy + rows * cell + 28, 24, '#7a4a6a', 'center');
    text(g, st.hint, W / 2, oy + rows * cell + 62, 17, '#9a8ab8', 'center', 400);
    text(g, 'B to close', W / 2, H - 38, 15, '#b8a8c8', 'center', 400);
  }

  // ---------------- journal ----------------
  function drawJournal(g: Ctx, G: GView) {
    const W = g.canvas.width, H = g.canvas.height;
    g.fillStyle = 'rgba(40,25,50,.6)'; g.fillRect(0, 0, W, H);
    panel(g, W / 2 - 330, 40, 660, 640, '#fff6e8', '#e0b8d0');
    text(g, "☆ Starry's Journal ☆", W / 2, 85, 30, '#b85c8a', 'center');
    text(g, 'Day ' + G.day + ' · ' + DAY_NAMES[G.dow] + ' · ★ ' + G.stars + ' stars saved up', W / 2, 122, 17, '#9a8ab8', 'center');
    // skills
    let y = 172;
    for (const key of Object.keys(Entities.SKILLS)) {
      const sk = Entities.SKILLS[key];
      const xp = G.skills[key] || 0;
      const lvl = Entities.skillLevel(xp);
      const cur = Entities.LEVEL_XP[lvl - 1];
      const next = Entities.LEVEL_XP[lvl] !== undefined ? Entities.LEVEL_XP[lvl] : cur;
      const frac = lvl >= 5 ? 1 : (xp - cur) / (next - cur || 1);
      text(g, sk.label, W / 2 - 280, y, 21, '#7a4a6a');
      text(g, 'Lv ' + lvl + ' · ' + sk.titles[lvl - 1], W / 2 - 280, y + 26, 15, '#9a7ad0', 'left', 400);
      g.fillStyle = 'rgba(150,130,150,.25)'; rr(g, W / 2 - 40, y - 8, 300, 18, 9); g.fill();
      g.fillStyle = '#9adbc8'; if (frac > 0) { rr(g, W / 2 - 40, y - 8, Math.max(12, 300 * frac), 18, 9); g.fill(); }
      text(g, lvl >= 5 ? 'MAX!' : (xp - cur) + ' / ' + (next - cur), W / 2 + 270, y + 1, 14, '#7a6a8a', 'right', 400);
      y += 62;
    }
    // friends
    text(g, 'Friends', W / 2 - 280, y + 6, 21, '#7a4a6a');
    y += 42;
    const friends = Entities.NPCS.filter(n => n.friend);
    friends.forEach((f) => {
      const pts = G.hearts[f.id] || 0;
      const full = Math.floor(pts / 30);
      const c = SpriteLib.chr(f.sprite, 'down', 0);
      g.drawImage(c, W / 2 - 280, y - 18, 27, 31);
      text(g, f.name, W / 2 - 240, y, 18, '#5a4a6a');
      for (let i = 0; i < 5; i++)
        heart(g, W / 2 - 100 + i * 34, y, 11, i < full ? '#ff6f9e' : 'rgba(150,130,150,.3)');
      y += 46;
    });
    text(g, 'J to close', W / 2, H - 38, 15, '#b8a8c8', 'center', 400);
  }

  // ---------------- area map ----------------
  // a soft storybook palette: every tile char maps to a little patch of colour
  const MAP_COLORS: Record<string, string> = {
    '.': '#a9de7c', ',': '#9fd673', "'": '#a4da76',     // grass tufts
    ';': '#dad4c6', ':': '#c3bcac',                      // city pavement / avenue
    '!': '#c3bcac', '+': '#c3bcac',                      // upright road / crossing
    'p': '#e7d2a4', 's': '#f1e4b4',                      // dirt path / sand
    'w': '#7cc3ea', 'W': '#7cc3ea', 'E': '#cfeaf5',      // water / pool deck
    'f': '#cba074', '%': '#cba074', '#': '#56a55f',      // fences / trees & hedges
    '1': '#ff9ec5', '2': '#8fd0e8', '3': '#ffd479',      // building roofs
    '4': '#bfa3e6', '5': '#ff9a8f', '<': '#b89aec',
    '=': '#d2ad86', 'o': '#bfe6f2',                      // walls / windows
    // interiors
    '_': '#ecdcc6', '~': '#dbe8f1', '^': '#f1e1ed', '-': '#f4e4d2', '|': '#9a7a6a',
    'b': '#bfa3e6', 'v': '#bfa3e6', 'm': '#caa07a', 'k': '#cdd5db',
    'r': '#ffb7d2', 'c': '#caa07a', 'T': '#caa07a', 'A': '#caa07a',
    't': '#caa07a', 'D': '#caa07a', 'M': '#bfe6f2', 'Q': '#9a7a6a',
    'h': '#ffd479', 'G': '#ffd479', 'y': '#ff9a8f', 'x': '#ffcf4d',
    '}': '#c9935c',
    // little outdoor things to do
    'F': '#8fd0e8', '@': '#ff8fc0', 'I': '#ff6f9e', 'V': '#a8d8e8',
    'U': '#ffd479', 'd': '#ff9a8f', 'g': '#bfa3e6', 'J': '#8fd0e8',
    '*': '#ff9ec5', 'Y': '#e0584f', '&': '#f1e4b4',
    // beach & farm
    'Z': '#ffd9e8', '[': '#ff9a8f', ']': '#8fd0e8', ')': '#56a55f',
    '8': '#e8c96a', '9': '#c89058', '$': '#e8955a', '?': '#caa07a',
    '"': '#ffd479', '{': '#fdfdf8', '(': '#caa07a',
  };
  // doors, the bus stops and interior exits get a little name tag
  const PLACE_NAMES: Record<string, string> = {
    H: 'Home', S: 'School', P: 'Pool', C: 'Sweets', L: 'Ballet',
    R: 'Library', O: 'Toys', K: 'Bakery', X: 'Barn', '0': 'Art',
    B: 'Bus stop', '6': 'Beach bus', '7': 'Farm bus', x: 'Door',
  };
  const PLACE_CHARS = 'HSPCLROKX0B67x';

  function tagPill(g: Ctx, label: string, cx: number, cy: number, col?: string, bg?: string) {
    g.font = FONT(13);
    const w = g.measureText(label).width + 14;
    rr(g, cx - w / 2, cy - 17, w, 16, 8);
    g.fillStyle = bg || 'rgba(255,250,240,.9)'; g.fill();
    text(g, label, cx, cy - 9, 13, col || '#6a4a5a', 'center');
  }
  function heading(g: Ctx, cx: number, cy: number, dir: string) {
    const d = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as Record<string, [number, number]>)[dir] || [0, 1];
    g.save(); g.translate(cx, cy); g.rotate(Math.atan2(d[1], d[0]));
    g.fillStyle = '#b85c8a';
    g.beginPath(); g.moveTo(17, 0); g.lineTo(9, -5); g.lineTo(9, 5); g.closePath(); g.fill();
    g.restore();
  }

  // info: { map, px, py, dir, t, npcs:[{x,y,friend}] }
  function drawMap(g: Ctx, info: { map: string; px: number; py: number; dir: string; t: number; npcs: { x: number; y: number; friend: boolean }[] }) {
    const W = g.canvas.width, H = g.canvas.height;
    g.fillStyle = 'rgba(40,25,50,.6)'; g.fillRect(0, 0, W, H);
    const m = Maps.get(info.map), rows = m.rows;
    const mw = rows[0].length, mh = rows.length;
    // fit the whole area into a comfy box, keeping the tiles square
    const cell = Math.max(4, Math.min(40, Math.floor(Math.min((W - 360) / mw, (H - 230) / mh))));
    const gridW = cell * mw, gridH = cell * mh;
    const ox = Math.round((W - gridW) / 2), oy = 140;
    panel(g, ox - 24, 70, gridW + 48, oy + gridH + 56 - 70, '#fff6e8', '#e0b8d0');
    text(g, '☆ ' + m.label + ' ☆', W / 2, 108, 28, '#b85c8a', 'center');
    // the map itself — paint the base, then the features on top
    g.save();
    g.translate(ox, oy);
    g.fillStyle = MAP_COLORS[m.base] || '#a9de7c';
    g.fillRect(0, 0, gridW, gridH);
    for (let y = 0; y < mh; y++) {
      const row = rows[y];
      for (let x = 0; x < mw; x++) {
        const ch = row[x];
        const col = ch !== m.base && MAP_COLORS[ch];
        if (col) { g.fillStyle = col; g.fillRect(x * cell, y * cell, cell, cell); }
      }
    }
    g.strokeStyle = '#e0b8d0'; g.lineWidth = 2; g.strokeRect(1, 1, gridW - 2, gridH - 2);
    g.restore();
    // friends (and other folk) wandering this map show as little dots
    for (const n of info.npcs) {
      g.fillStyle = n.friend ? '#ff6f9e' : 'rgba(120,90,110,.65)';
      g.beginPath(); g.arc(ox + n.x * cell, oy + n.y * cell, Math.max(2.5, cell * 0.3), 0, 7); g.fill();
    }
    // name tags for the doors, the bus stop and interior exits
    for (const ch of PLACE_CHARS) {
      const p = Maps.find(info.map, ch);
      if (p) tagPill(g, PLACE_NAMES[ch], ox + (p.x + 0.5) * cell, oy + p.y * cell - 3);
    }
    // Starry — a pulsing gold star with a little heading arrow + name tag
    const sx = ox + info.px * cell, sy = oy + info.py * cell;
    const pulse = 1 + Math.sin(info.t * 4) * 0.12;
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.beginPath(); g.arc(sx, sy, 11 * pulse, 0, 7); g.fill();
    heading(g, sx, sy, info.dir);
    starShape(g, sx, sy, 9 * pulse, '#ffb84f');
    tagPill(g, 'Starry', sx, sy - 16, '#b85c8a', '#fff0f6');
    // footer legend + how to close
    const fy = oy + gridH + 22;
    starShape(g, W / 2 - 150, fy, 8, '#ffb84f');
    text(g, '= you', W / 2 - 138, fy + 1, 15, '#7a6a8a', 'left', 400);
    g.fillStyle = '#ff6f9e'; g.beginPath(); g.arc(W / 2 + 22, fy, 5, 0, 7); g.fill();
    text(g, '= friends', W / 2 + 34, fy + 1, 15, '#7a6a8a', 'left', 400);
    text(g, 'M to close', W / 2, fy + 26, 15, '#b8a8c8', 'center', 400);
  }

  return {
    say, choose, active, dialogKey, dialogUpdate, drawDialog,
    toast, toastUpdate, drawToasts,
    drawHUD, drawLocation, drawTint, drawTitle, drawSummary, drawBook, drawJournal, drawMap,
    fmtClock, DAY_NAMES,
  };
})();
