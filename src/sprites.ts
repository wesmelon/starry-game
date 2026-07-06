/* ======================================================================
   Starry ☆ Little Days — sprites.js
   Every sprite and tile is generated at load time from pixel templates
   and painter functions. No image files.
   ====================================================================== */

type Ctx = CanvasRenderingContext2D;
interface CharDef { kind: string; pal: Record<string, string>; }

export const SpriteLib = (() => {
  const TILE = 16, SCALE = 3;

  // ---------- character pixel templates ----------
  // chars: . none | H hair | S skin | E eye | R blush | D dress | d dress dark
  //        P pigtail/bun accent | T shirt | O shorts | B shoes | A apron | W white
  const GIRL: Record<string, string[]> = {
    down: [
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      'PHHHHHHHHHHP',
      'PHSSSSSSSSHP',
      '.HSESSSSESH.',
      '.HSRSSSSRSH.',
      '..SSSSSSSS..',
      '...DDDDDD...',
      '..DDDDDDDD..',
      '.DDdDDDDdDD.',
      '.DDDDDDDDDD.',
    ],
    up: [
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      'PHHHHHHHHHHP',
      'PHHHHHHHHHHP',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '..HHHHHHHH..',
      '...DDDDDD...',
      '..DDDDDDDD..',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
    ],
    left: [
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHHP',
      '.HSSSSSHHHHP',
      '.HSESSSHHHH.',
      '.HSRSSSHHHH.',
      '..SSSSSHHH..',
      '...DDDDDD...',
      '..DDDDDDDD..',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
    ],
  };
  const BOY_BOTTOM: Record<string, string[]> = {
    down: ['...TTTTTT...', '..TTTTTTTT..', '..OOOOOOOO..', '...OO..OO...'],
    up:   ['...TTTTTT...', '..TTTTTTTT..', '..OOOOOOOO..', '...OO..OO...'],
    left: ['...TTTTTT...', '..TTTTTTTT..', '..OOOOOOOO..', '....OO.OO...'],
  };
  const BABY: Record<string, string[]> = {
    down: [
      '...HHHHHH...',
      '..HHHHHHHH..',
      '..HSSSSSSH..',
      '..HSESSSEH..',
      '..HSRSSRSH..',
      '...SSSSSS...',
      '..TTTTTTTT..',
      '..TTOOOOTT..',
    ],
    up: [
      '...HHHHHH...',
      '..HHHHHHHH..',
      '..HHHHHHHH..',
      '..HHHHHHHH..',
      '..HHHHHHHH..',
      '...HHHHHH...',
      '..TTTTTTTT..',
      '..TTOOOOTT..',
    ],
    left: [
      '...HHHHHH...',
      '..HHHHHHHH..',
      '..HSSSSHHH..',
      '..HSESSHHH..',
      '..HSRSSHHH..',
      '...SSSSHH...',
      '..TTTTTTTT..',
      '..TTOOOOTT..',
    ],
  };
  const ADULT: Record<string, string[]> = {
    down: [
      '....PPPP....',
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '.HSSSSSSSSH.',
      '.HSESSSSESH.',
      '.HSSSSSSSSH.',
      '..SSSSSSSS..',
      '...DDDDDD...',
      '..DDAAAADD..',
      '..DDAAAADD..',
      '.DDDAAAADDD.',
      '.DDDAAAADDD.',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
    ],
    up: [
      '....PPPP....',
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '..HHHHHHHH..',
      '...DDDDDD...',
      '..DDDDDDDD..',
      '..DDDDDDDD..',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
    ],
    left: [
      '......PPPP..',
      '..HHHHHHHH..',
      '.HHHHHHHHHH.',
      '.HHHHHHHHHH.',
      '.HSSSSSHHHH.',
      '.HSESSSHHHH.',
      '.HSSSSSHHHH.',
      '..SSSSSHHH..',
      '...DDDDDD...',
      '..DDDDDDDD..',
      '..DDDDDDDD..',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
      '.DDDDDDDDDD.',
    ],
  };
  // leg frames: [idle, stepA, stepB]
  const LEGS: Record<string, string[][]> = {
    front: [
      ['...SS..SS...', '...SS..SS...', '...BB..BB...'],
      ['...SS..SS...', '...BB..SS...', '.......BB...'],
      ['...SS..SS...', '...SS..BB...', '...BB.......'],
    ],
    side: [
      ['....SS.SS...', '....SS.SS...', '....BB.BB...'],
      ['...SS..SS...', '..SS....SS..', '..BB....BB..'],
      ['....SS.SS...', '....SS.SS...', '....BB.BB...'],
    ],
  };

  const DEFAULTS: Record<string, string> = { S:'#ffd9b8', E:'#33241c', R:'#f7a8a0', B:'#7a4632', W:'#ffffff' };

  const CHARDEFS: Record<string, CharDef> = {
    starry:   { kind:'kid',   pal:{ H:'#7a4a2e', D:'#ff9ec5', d:'#ee7fae', P:'#ff5f9e', B:'#e0567f' } },
    mom:      { kind:'adult', pal:{ H:'#5a3a22', P:'#5a3a22', D:'#8fbfe8', A:'#fff7ee', B:'#8a5a3a' } },
    dad:      { kind:'adult', pal:{ H:'#4a2f1e', D:'#e0a458', B:'#5a4a3a' } },
    isaac:    { kind:'baby',  pal:{ H:'#6e4426', T:'#9adbc8', O:'#7fb8e8', B:'#5a6a8a' } },
    msbloom:  { kind:'adult', pal:{ H:'#b97a3f', P:'#b97a3f', D:'#a8d8a0', B:'#6a8a5a' } },
    coach:    { kind:'adult', pal:{ H:'#3a3530', D:'#ff8a5a', B:'#4a4a4a' } },
    madame:   { kind:'adult', pal:{ H:'#2a2530', P:'#2a2530', D:'#cdb0ee', B:'#9a7ad0' } },
    mrscoop:  { kind:'adult', pal:{ H:'#e8e4da', D:'#9adbc8', A:'#fffdf5', B:'#6a5a4a' } },
    luna:     { kind:'kid',   pal:{ H:'#3a3550', D:'#92d4e8', d:'#6fbcd8', P:'#ffd166', B:'#4a8aa8' } },
    mia:      { kind:'kid',   pal:{ H:'#eec96a', D:'#c9b2f2', d:'#b297e6', P:'#ff9ec5', B:'#a88ad8' } },
    theo:     { kind:'boy',   pal:{ H:'#6e4426', T:'#9ad88f', O:'#6f8fd8', B:'#5a6a8a' } },
    paige:    { kind:'adult', pal:{ H:'#3a3a4a', P:'#3a3a4a', D:'#8a9ad8', A:'#fff7ee', B:'#5a5a7a' } },
    bram:     { kind:'adult', pal:{ H:'#6a4a2a', P:'#6a4a2a', D:'#e8b85a', B:'#7a5a2a' } },
    honey:    { kind:'adult', pal:{ H:'#caa05a', P:'#caa05a', D:'#ffc7d8', A:'#fffdf5', B:'#b07a3a' } },
    rosie:    { kind:'kid',   pal:{ H:'#e8843f', D:'#9adb7a', d:'#7fc25e', P:'#ffd166', B:'#5a8a3a' } },
    sandy:    { kind:'adult', pal:{ H:'#e8b85a', P:'#e8b85a', D:'#ff6f6f', A:'#fff5fa', B:'#c85a50' } },
    fern:     { kind:'adult', pal:{ H:'#8a5a30', P:'#8a5a30', D:'#7a9fd0', A:'#e8d5a0', B:'#6a4a2a' } },
    doodle:   { kind:'adult', pal:{ H:'#d8763f', P:'#d8763f', D:'#8fd0e8', A:'#ffe6a0', B:'#b85c8a' } },
  };

  const DUCK = [
    '...WWW....',
    '..WEWW....',
    'OOWWWW....',
    '.WWWWWWWW.',
    '.WWWWWWWWW',
    '..WWWWWWW.',
    '...WWWW...',
  ];
  const DUCK_PAL: Record<string, string> = { W:'#fff8e4', E:'#2a2a2a', O:'#f2a444' };

  // little critters (face left; mirrored for right). A body, D dark, E eye,
  // W white, P pink
  const ANIMAL_TPL: Record<string, string[]> = {
    cat: [
      '.A..A.....',
      '.AAAA..A..',
      '.AEAA..A..',
      '.AAAAAAAA.',
      '.AWWAAAAA.',
      '..A..A....',
    ],
    pup: [
      '..........',
      '.DD....A..',
      '.AAA...A..',
      '.AEAAAAAA.',
      '.AAAAAAAA.',
      '..A..A.A..',
    ],
    bunny: [
      '.P.P......',
      '.W.W......',
      '.WWW......',
      '.WEW...WW.',
      '.WWWWWWWW.',
      '..W..W....',
    ],
    squirrel: [
      '......AA..',
      '.A.A.AAAA.',
      '.AAA.AAAA.',
      '.AEA..AAA.',
      '.AAAAAAA..',
      '..A..A....',
    ],
    chick: [
      '..........',
      '..AA......',
      '.AEAA.....',
      'DAAAAA....',
      '.AAAA.....',
      '..D.D.....',
    ],
    crab: [
      '..........',
      'PP.E.E.PP.',
      'P.AAAAA.P.',
      '.AAAAAAA..',
      'A.A.A.A.A.',
      '..........',
    ],
    pig: [
      '..........',
      '.AA...AA..',
      '.AAAAAAAA.',
      'PEAAAAAAA.',
      'PAAAAAAAA.',
      '..A..A....',
    ],
  };
  const ANIMAL_PAL: Record<string, Record<string, string>> = {
    cat:      { A:'#9a9aae', D:'#7a7a8e', E:'#222', W:'#ffffff', P:'#ffb7d2' },
    pup:      { A:'#c89058', D:'#8a5a30', E:'#222', W:'#ffffff', P:'#ffb7d2' },
    bunny:    { W:'#fdfdf8', A:'#fdfdf8', P:'#ffb7d2', E:'#222' },
    squirrel: { A:'#e8924a', D:'#c2702e', E:'#222', W:'#ffffff' },
    chick:    { A:'#ffe066', D:'#f2a444', E:'#222' },
    crab:     { A:'#e8705a', P:'#d84a3a', E:'#2a2a2a' },
    pig:      { A:'#f7b8c8', P:'#e88aa8', E:'#222' },
  };

  function palColor(pal: Record<string, string>, ch: string): string | null {
    if (ch === '.') return null;
    if (pal[ch] !== undefined) return pal[ch];
    if (ch === 'A' || ch === 'T') return pal.D;
    if (ch === 'O' || ch === 'd') return pal.d || pal.D;
    if (ch === 'P') return null;
    return DEFAULTS[ch] || null;
  }

  function rowsToCanvas(rows: string[], pal: Record<string, string>, mirror?: boolean) {
    const w = 12, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const col = palColor(pal, rows[y][x]);
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }

  function buildChar(def: CharDef) {
    let body = def.kind === 'adult' ? ADULT : def.kind === 'baby' ? BABY : GIRL;
    const bottom = def.kind === 'boy' ? BOY_BOTTOM : null;
    const out: Record<string, HTMLCanvasElement[]> = {};
    for (const dir of ['down', 'up', 'left', 'right']) {
      const srcDir = dir === 'right' ? 'left' : dir;
      let rows = body[srcDir].slice();
      if (bottom) rows = rows.slice(0, 7).concat(bottom[srcDir]);
      const legKind = (srcDir === 'left') ? 'side' : 'front';
      out[dir] = LEGS[legKind].map(legs =>
        rowsToCanvas(rows.concat(legs), def.pal, dir === 'right'));
    }
    return out;
  }

  // ---------- tile painters ----------
  function px(g: Ctx, x: number, y: number, w: number, h: number, col: string) { g.fillStyle = col; g.fillRect(x, y, w, h); }

  const GRASS = '#9ad469';
  function paintGrass(g: Ctx) {
    px(g, 0, 0, 16, 16, GRASS);
    px(g, 3, 4, 1, 1, '#8cc55e'); px(g, 11, 2, 1, 1, '#a9e078');
    px(g, 7, 9, 1, 1, '#8cc55e'); px(g, 13, 12, 1, 1, '#a9e078');
    px(g, 2, 13, 1, 1, '#8cc55e');
  }
  function flower(g: Ctx, x: number, y: number, col: string, f?: number) {
    const dy = f ? -1 : 0;
    px(g, x - 1, y + dy, 3, 1, col); px(g, x, y - 1 + dy, 1, 3, col);
    px(g, x, y + dy, 1, 1, '#ffd95f');
  }

  const PAINT: Record<string, (g: Ctx, f?: number, trim?: string) => void> = {
    '.': paintGrass,
    ',': (g, f) => { paintGrass(g); flower(g, 4, 5, '#ff9ec5', f); flower(g, 11, 11, '#fff5fa', f ? 0 : 1); },
    "'": (g, f) => {
      paintGrass(g);
      px(g, 4, 9 - (f||0), 1, 4, '#7fb854'); px(g, 7, 8, 1, 5, '#8cc55e'); px(g, 10, 9 + (f||0) - 1, 1, 4, '#7fb854');
    },
    '#': (g) => {
      paintGrass(g);
      px(g, 7, 11, 3, 4, '#8a5a3b');
      px(g, 2, 2, 12, 9, '#55a047'); px(g, 3, 1, 10, 11, '#55a047');
      px(g, 4, 2, 6, 4, '#74c25e'); px(g, 3, 6, 4, 3, '#469540'); px(g, 9, 7, 4, 3, '#469540');
      px(g, 5, 3, 2, 2, '#8fd97a');
    },
    f: (g) => {   // fence running left-right
      paintGrass(g);
      px(g, 1, 6, 14, 2, '#c9935c'); px(g, 1, 10, 14, 2, '#c9935c');
      px(g, 2, 4, 2, 10, '#b07a45'); px(g, 12, 4, 2, 10, '#b07a45');
    },
    '%': (g) => { // fence running up-down — the rails stand upright
      paintGrass(g);
      px(g, 6, 1, 2, 14, '#c9935c'); px(g, 10, 1, 2, 14, '#c9935c');
      px(g, 4, 2, 10, 2, '#b07a45'); px(g, 4, 12, 10, 2, '#b07a45');
    },
    p: (g) => {
      px(g, 0, 0, 16, 16, '#e9cd8f');
      px(g, 2, 3, 2, 1, '#d9b878'); px(g, 10, 6, 2, 1, '#d9b878');
      px(g, 5, 11, 2, 1, '#d9b878'); px(g, 12, 13, 2, 1, '#f4e0ae'); px(g, 7, 1, 2, 1, '#f4e0ae');
    },
    s: (g) => {
      px(g, 0, 0, 16, 16, '#f2e3b0');
      px(g, 3, 3, 1, 1, '#e3d29a'); px(g, 12, 5, 1, 1, '#e3d29a');
      px(g, 6, 10, 1, 1, '#e3d29a'); px(g, 10, 13, 1, 1, '#fdf2cc');
    },
    w: (g, f) => {
      px(g, 0, 0, 16, 16, '#6fc7e8');
      const o = f ? 4 : 0;
      px(g, 2 + o, 3, 4, 1, '#a4e2f6'); px(g, 9 - o + 3, 8, 4, 1, '#a4e2f6');
      px(g, 4 + o, 13, 3, 1, '#8fd6ef'); px(g, 1, 10, 2, 1, '#5cb4d8');
    },
    W: (g, f) => {
      px(g, 0, 0, 16, 16, '#7fd4f0');
      const o = f ? 3 : 0;
      px(g, 1 + o, 4, 5, 1, '#b8ecfa'); px(g, 8 - o + 2, 10, 5, 1, '#b8ecfa');
      px(g, 5, 14, 4, 1, '#a0e2f6');
    },
    E: (g) => {
      px(g, 0, 0, 16, 16, '#dceef2');
      px(g, 0, 0, 16, 1, '#b8d8e0'); px(g, 0, 15, 16, 1, '#b8d8e0');
      px(g, 0, 0, 1, 16, '#b8d8e0'); px(g, 15, 0, 1, 16, '#b8d8e0');
    },
    '1': (g) => roof(g, '#f5a0c0', '#e088ab'),
    '2': (g) => roof(g, '#7fb8e8', '#6aa3d4'),
    '3': (g) => roof(g, '#e88a8a', '#d47474'),
    '4': (g) => roof(g, '#b89fe0', '#a48acc'),
    '5': (g) => roof(g, '#8fe0c0', '#79ccab'),
    '<': (g) => roof(g, '#a98cf0', '#9174d8'),   // Starry's purple house roof
    '=': (g) => {
      px(g, 0, 0, 16, 16, '#f6edd8');
      px(g, 0, 14, 16, 2, '#decdb0'); px(g, 0, 4, 16, 1, '#ece0c6'); px(g, 0, 9, 16, 1, '#ece0c6');
    },
    o: (g) => {
      PAINT['='](g);
      px(g, 3, 3, 10, 9, '#8a6a4a'); px(g, 4, 4, 8, 7, '#bfe6f5');
      px(g, 5, 5, 2, 2, '#e8f8ff'); px(g, 7, 4, 1, 7, '#8a6a4a'); px(g, 4, 7, 8, 1, '#8a6a4a');
      px(g, 2, 12, 12, 1, '#d8c4a0');
    },
    door: (g, f, trim) => {
      PAINT['='](g);
      px(g, 3, 3, 10, 13, '#a06a3c'); px(g, 4, 2, 8, 1, '#a06a3c');
      px(g, 4, 4, 8, 10, '#b87f4c');
      px(g, 11, 9, 1, 2, '#ffd95f');
      if (trim) { px(g, 6, 6, 3, 1, trim); px(g, 7, 5, 1, 3, trim); }
    },
    _: (g) => {
      px(g, 0, 0, 16, 16, '#dca96e');
      px(g, 0, 5, 16, 1, '#c8925a'); px(g, 0, 11, 16, 1, '#c8925a');
      px(g, 6, 0, 1, 5, '#c8925a'); px(g, 11, 6, 1, 5, '#c8925a'); px(g, 3, 12, 1, 4, '#c8925a');
    },
    '~': (g) => {
      px(g, 0, 0, 16, 16, '#f1e8d4');
      px(g, 0, 7, 16, 1, '#e0d4ba'); px(g, 7, 0, 1, 7, '#e0d4ba'); px(g, 11, 8, 1, 8, '#e0d4ba');
    },
    '-': (g) => {
      px(g, 0, 0, 16, 16, '#dff3e9');
      px(g, 0, 0, 8, 8, '#cfeadd'); px(g, 8, 8, 8, 8, '#cfeadd');
    },
    '^': (g) => {
      px(g, 0, 0, 16, 16, '#eed9ab');
      px(g, 0, 4, 16, 1, '#dec790'); px(g, 0, 12, 16, 1, '#dec790'); px(g, 9, 5, 1, 7, '#dec790');
    },
    '|': (g) => {
      px(g, 0, 0, 16, 16, '#f4e4ef');
      px(g, 0, 10, 16, 1, '#dcc2d4'); px(g, 0, 11, 16, 5, '#e8d2e0');
    },
    b: (g) => { // bed head: pillow
      px(g, 1, 4, 14, 12, '#e88aae'); px(g, 1, 1, 14, 4, '#c96a90');
      px(g, 3, 5, 10, 5, '#ffffff'); px(g, 3, 9, 10, 1, '#e8e0e8');
      px(g, 1, 11, 14, 5, '#ffb7d2');
    },
    v: (g) => { // bed foot: blanket + star
      px(g, 1, 0, 14, 13, '#ffb7d2');
      px(g, 7, 4, 2, 2, '#ffd95f'); px(g, 6, 5, 4, 1, '#ffd95f'); px(g, 7, 6, 2, 1, '#ffd95f');
      px(g, 1, 13, 14, 2, '#c96a90');
    },
    m: (g) => {
      px(g, 1, 0, 14, 15, '#9a6a40'); px(g, 2, 1, 12, 6, '#7a5230'); px(g, 2, 8, 12, 5, '#7a5230');
      px(g, 3, 2, 2, 5, '#e87f7f'); px(g, 6, 2, 2, 5, '#7fb8e8'); px(g, 9, 2, 2, 5, '#a8d8a0');
      px(g, 4, 9, 2, 4, '#ffd166'); px(g, 7, 9, 2, 4, '#cdb0ee'); px(g, 10, 9, 2, 4, '#ff9ec5');
    },
    k: (g) => {
      px(g, 0, 0, 16, 6, '#ece4d4'); px(g, 0, 6, 16, 10, '#b08a5a');
      px(g, 2, 8, 5, 6, '#9a763e'); px(g, 9, 8, 5, 6, '#9a763e');
      px(g, 4, 1, 5, 3, '#8aa8b8'); px(g, 5, 0, 3, 1, '#6a8898');
    },
    y: (g) => {
      px(g, 2, 5, 12, 10, '#e8b86a'); px(g, 2, 5, 12, 2, '#d4a04e');
      px(g, 4, 2, 3, 3, '#e87f7f'); px(g, 8, 1, 3, 4, '#7fb8e8'); px(g, 6, 8, 4, 4, '#a8d8a0');
    },
    r: (g) => {
      px(g, 2, 2, 12, 12, '#ff9ec5'); px(g, 3, 3, 10, 10, '#ffd1e4');
      px(g, 7, 7, 2, 2, '#ff9ec5');
    },
    T: (g) => {
      px(g, 1, 3, 14, 9, '#c98f54'); px(g, 1, 3, 14, 2, '#dba368');
      px(g, 2, 12, 2, 4, '#a06a3c'); px(g, 12, 12, 2, 4, '#a06a3c');
      px(g, 6, 5, 4, 3, '#fff5e0');
    },
    c: (g) => {
      px(g, 4, 2, 8, 3, '#dba368'); px(g, 4, 5, 8, 6, '#c98f54');
      px(g, 4, 11, 2, 4, '#a06a3c'); px(g, 10, 11, 2, 4, '#a06a3c');
    },
    '♨': (g) => {
      px(g, 1, 6, 14, 8, '#fff5fa'); px(g, 1, 6, 14, 2, '#ffe0ec');
      px(g, 2, 8, 12, 5, '#8fd4e8');
      px(g, 4, 9, 2, 1, '#eaf7fb'); px(g, 9, 8, 2, 1, '#eaf7fb');
      px(g, 2, 13, 2, 2, '#e0a45f'); px(g, 12, 13, 2, 2, '#e0a45f');
    },
    A: (g) => {
      px(g, 0, 0, 16, 16, '#8a6a4a'); px(g, 1, 1, 14, 12, '#3f7a5a');
      px(g, 3, 3, 4, 1, '#fff'); px(g, 3, 5, 6, 1, '#fff');
      px(g, 9, 7, 4, 1, '#ffd95f'); px(g, 3, 9, 5, 1, '#fff');
    },
    D: (g) => {
      px(g, 2, 4, 12, 7, '#dba368'); px(g, 2, 4, 12, 2, '#ecb87c');
      px(g, 3, 11, 2, 4, '#a06a3c'); px(g, 11, 11, 2, 4, '#a06a3c');
      px(g, 4, 5, 5, 4, '#fff5e0'); px(g, 5, 6, 3, 1, '#b8b0a0');
    },
    t: (g) => {
      px(g, 0, 3, 16, 9, '#b97a3f'); px(g, 0, 3, 16, 2, '#cd8f54');
      px(g, 1, 12, 2, 4, '#8a5a30'); px(g, 13, 12, 2, 4, '#8a5a30');
      px(g, 3, 6, 4, 3, '#e87f7f'); px(g, 9, 6, 4, 2, '#fff5e0');
    },
    M: (g) => {
      px(g, 0, 0, 16, 16, '#f4e4ef');
      px(g, 1, 1, 14, 10, '#a89ab8'); px(g, 2, 2, 12, 8, '#d4ecf2');
      px(g, 3, 3, 3, 5, '#e8f8fc');
      px(g, 0, 12, 16, 2, '#9a6a40'); px(g, 7, 14, 2, 2, '#9a6a40');
    },
    Q: (g) => {
      px(g, 1, 1, 14, 14, '#5a4458'); px(g, 1, 1, 14, 3, '#6e5468');
      px(g, 2, 8, 12, 3, '#fffdf0');
      px(g, 4, 8, 1, 3, '#222'); px(g, 7, 8, 1, 3, '#222'); px(g, 10, 8, 1, 3, '#222');
      px(g, 5, 4, 6, 2, '#fff5fa');
    },
    '}': (g) => {  // painting easel with a half-finished rainbow
      px(g, 3, 13, 2, 3, '#a87840'); px(g, 11, 13, 2, 3, '#a87840');
      px(g, 2, 2, 12, 11, '#c9935c');
      px(g, 3, 3, 10, 8, '#fffdf5');
      px(g, 4, 6, 8, 1, '#ff6f6f'); px(g, 4, 7, 8, 1, '#ffd95f'); px(g, 4, 8, 8, 1, '#7fb8e8');
      px(g, 4, 12, 8, 1, '#b07a45');
    },
    G: (g) => {
      px(g, 0, 0, 16, 6, '#e8e0d0'); px(g, 0, 6, 16, 10, '#9adbc8');
      px(g, 0, 6, 16, 1, '#79ccab'); px(g, 3, 9, 4, 4, '#baf0dd'); px(g, 10, 9, 4, 4, '#baf0dd');
    },
    h: (g) => {
      px(g, 1, 0, 14, 7, '#cfe8f0'); px(g, 1, 0, 14, 1, '#a8c8d4');
      px(g, 3, 2, 3, 3, '#ff9ec5'); px(g, 7, 2, 3, 3, '#ffd95f'); px(g, 11, 2, 3, 3, '#a8d8a0');
      px(g, 1, 7, 14, 9, '#caa06a'); px(g, 1, 7, 14, 1, '#b08a5a');
    },
    x: (g) => {
      px(g, 2, 3, 12, 10, '#c8a878'); px(g, 3, 4, 10, 8, '#dbbf92');
      px(g, 4, 6, 8, 1, '#c8a878'); px(g, 4, 9, 8, 1, '#c8a878');
    },
    d: (g) => { // little slide
      paintGrass(g);
      px(g, 2, 4, 3, 10, '#c9935c'); px(g, 2, 5, 3, 1, '#a87840'); px(g, 2, 8, 3, 1, '#a87840'); px(g, 2, 11, 3, 1, '#a87840');
      px(g, 5, 4, 3, 3, '#ff9ec5');
      px(g, 7, 6, 3, 3, '#ff9ec5'); px(g, 9, 8, 3, 3, '#ff9ec5'); px(g, 11, 10, 3, 4, '#ff9ec5');
      px(g, 12, 13, 3, 1, '#e088ab');
    },
    g: (g) => { // little swing
      paintGrass(g);
      px(g, 1, 3, 2, 12, '#a87840'); px(g, 13, 3, 2, 12, '#a87840'); px(g, 1, 2, 14, 2, '#c9935c');
      px(g, 6, 4, 1, 6, '#888'); px(g, 9, 4, 1, 6, '#888');
      px(g, 5, 10, 6, 2, '#e0567f');
    },
    // signposts in front of buildings: wooden board + a little picture
    a: (g) => signpost(g, () => { // school: apple
      px(g, 6, 4, 4, 4, '#e85a5a'); px(g, 5, 5, 6, 2, '#e85a5a');
      px(g, 7, 3, 1, 1, '#7a5230'); px(g, 8, 2, 2, 1, '#74c25e');
    }),
    u: (g) => signpost(g, () => { // pool: water drop
      px(g, 7, 2, 2, 2, '#5cb4d8'); px(g, 6, 4, 4, 2, '#5cb4d8');
      px(g, 5, 5, 6, 3, '#5cb4d8'); px(g, 6, 6, 1, 1, '#c8f0fa');
    }),
    n: (g) => signpost(g, () => { // ballet: bow
      px(g, 4, 3, 3, 4, '#ff5f9e'); px(g, 9, 3, 3, 4, '#ff5f9e');
      px(g, 7, 4, 2, 2, '#e0407f');
    }),
    q: (g) => signpost(g, () => { // sweets: ice cream cone
      px(g, 6, 2, 4, 2, '#ff9ec5'); px(g, 5, 3, 6, 1, '#fff5fa');
      px(g, 6, 4, 4, 1, '#e8b86a'); px(g, 7, 5, 2, 3, '#dba368');
    }),
    e: (g) => signpost(g, () => { // park: sunshine
      px(g, 6, 3, 4, 4, '#ffd95f'); px(g, 7, 1, 2, 1, '#ffb84f');
      px(g, 7, 8, 2, 1, '#ffb84f'); px(g, 4, 4, 1, 2, '#ffb84f'); px(g, 11, 4, 1, 2, '#ffb84f');
    }),
    z: (g) => { // home: little pink mailbox
      paintGrass(g);
      px(g, 7, 8, 2, 7, '#a87840');
      px(g, 3, 3, 10, 6, '#ff9ec5'); px(g, 3, 3, 10, 1, '#e088ab');
      px(g, 4, 5, 4, 2, '#fff5fa');
      px(g, 13, 2, 1, 4, '#ffd95f'); px(g, 12, 2, 2, 1, '#ffd95f');
    },
    // ---- city ground ----
    ';': (g) => {  // paved sidewalk
      px(g, 0, 0, 16, 16, '#d9d2c4');
      px(g, 0, 7, 16, 1, '#c7bfae'); px(g, 7, 0, 1, 16, '#c7bfae');
      px(g, 2, 2, 1, 1, '#e6e0d4'); px(g, 11, 10, 1, 1, '#e6e0d4');
    },
    ':': (g) => {  // city road running left-right, with a dashed line
      px(g, 0, 0, 16, 16, '#7d7a82');
      px(g, 0, 0, 16, 1, '#6c6a72'); px(g, 0, 15, 16, 1, '#6c6a72');
      px(g, 3, 7, 6, 2, '#f2d65a');
    },
    '!': (g) => {  // city road running up-down — the dashes stand upright
      px(g, 0, 0, 16, 16, '#7d7a82');
      px(g, 0, 0, 1, 16, '#6c6a72'); px(g, 15, 0, 1, 16, '#6c6a72');
      px(g, 7, 3, 2, 6, '#f2d65a');
    },
    '+': (g) => {  // plain asphalt where two streets meet
      px(g, 0, 0, 16, 16, '#7d7a82');
      px(g, 3, 4, 1, 1, '#8a8790'); px(g, 11, 9, 1, 1, '#8a8790');
      px(g, 6, 13, 1, 1, '#6c6a72'); px(g, 13, 2, 1, 1, '#6c6a72');
    },
    // ---- new outdoor activities ----
    F: (g) => {  // wishing fountain
      px(g, 1, 9, 14, 6, '#b9b3a6'); px(g, 1, 13, 14, 2, '#8f95a0');
      px(g, 2, 6, 12, 5, '#bfe6f5'); px(g, 2, 6, 12, 1, '#a4d6e6');
      px(g, 1, 8, 14, 1, '#9aa0a6');
      px(g, 7, 2, 2, 5, '#cfd6dc'); px(g, 6, 1, 4, 2, '#e8f8ff');
      px(g, 5, 7, 1, 1, '#ffffff'); px(g, 10, 9, 1, 1, '#ffffff');
    },
    Y: (g) => {  // apple tree
      px(g, 7, 11, 2, 4, '#8a5a3b');
      px(g, 3, 2, 10, 9, '#4f9e3f'); px(g, 2, 4, 12, 5, '#4f9e3f');
      px(g, 4, 1, 8, 3, '#62b84e'); px(g, 4, 6, 1, 1, '#7ccf66');
      px(g, 5, 3, 2, 2, '#e85a5a'); px(g, 9, 5, 2, 2, '#e85a5a'); px(g, 7, 7, 2, 2, '#e85a5a');
    },
    '*': (g) => {  // a little flower patch you can pick from
      paintGrass(g);
      flower(g, 4, 5, '#ff7fb0', 0); flower(g, 8, 8, '#ffe06a', 1);
      flower(g, 11, 4, '#a98cf0', 0); flower(g, 7, 12, '#ff9ec5', 0);
      flower(g, 12, 11, '#fff5fa', 1);
    },
    J: (g) => {  // see-saw
      px(g, 7, 9, 2, 5, '#c9935c'); px(g, 5, 11, 6, 2, '#a87840');
      px(g, 1, 6, 14, 2, '#ff8aa8');
      px(g, 1, 5, 3, 1, '#ffd95f'); px(g, 12, 8, 3, 1, '#7fb8e8');
    },
    '&': (g) => {  // sandcastle on the beach
      PAINT['s'](g);
      px(g, 3, 8, 10, 6, '#e6c882'); px(g, 2, 5, 3, 3, '#e6c882');
      px(g, 7, 4, 2, 4, '#e6c882'); px(g, 11, 5, 3, 3, '#e6c882');
      px(g, 3, 4, 1, 2, '#ff7fb0');
      px(g, 6, 9, 1, 5, '#caa85e'); px(g, 9, 9, 1, 5, '#caa85e');
    },
    '@': (g) => {  // carousel
      px(g, 2, 2, 12, 2, '#ff7fb0'); px(g, 1, 4, 14, 2, '#fff5fa');
      px(g, 2, 3, 2, 1, '#ffd95f'); px(g, 6, 3, 2, 1, '#7fb8e8'); px(g, 10, 3, 2, 1, '#9adbc8');
      px(g, 7, 0, 2, 2, '#ff5f9e'); px(g, 2, 6, 12, 1, '#e0b85a');
      px(g, 7, 6, 2, 8, '#cdb0ee');
      px(g, 3, 9, 4, 3, '#fff5fa'); px(g, 3, 11, 1, 2, '#fff5fa'); px(g, 6, 11, 1, 2, '#fff5fa');
      px(g, 3, 7, 1, 3, '#ffd95f'); px(g, 10, 9, 1, 5, '#ffd95f'); px(g, 9, 10, 3, 2, '#7fb8e8');
    },
    I: (g) => {  // balloon cart
      px(g, 2, 1, 3, 3, '#ff6f9e'); px(g, 6, 0, 3, 3, '#7fb8e8');
      px(g, 10, 1, 3, 3, '#ffd95f'); px(g, 12, 3, 2, 2, '#9adbc8');
      px(g, 4, 4, 1, 5, '#b0a0b8'); px(g, 7, 3, 1, 6, '#b0a0b8'); px(g, 11, 4, 1, 5, '#b0a0b8');
      px(g, 2, 9, 12, 4, '#c98f54'); px(g, 2, 9, 12, 1, '#dba368');
      px(g, 3, 13, 2, 2, '#5a4458'); px(g, 11, 13, 2, 2, '#5a4458');
      px(g, 4, 10, 3, 2, '#fff5fa'); px(g, 9, 10, 3, 2, '#ffe06a');
    },
    B: (g) => busStop(g, '#5a7fb0', '#7a9fd0'),        // bus to the city
    '6': (g) => busStop(g, '#3fa8a0', '#63c8c0'),      // bus to the beach
    '7': (g) => busStop(g, '#7aa04a', '#9ac06a'),      // bus to the farm
    // ---- beach tiles (drawn over the sand base) ----
    Z: (g) => {  // seashells scattered on the sand
      px(g, 3, 4, 4, 3, '#ffb7d2'); px(g, 4, 3, 2, 1, '#ffb7d2'); px(g, 4, 5, 1, 2, '#e88ab0');
      px(g, 10, 9, 3, 3, '#fff5fa'); px(g, 11, 10, 1, 1, '#d8c8d8');
      px(g, 5, 12, 2, 2, '#ffe06a'); px(g, 12, 3, 2, 2, '#cfe6fa');
    },
    '[': (g) => {  // stripey beach umbrella
      px(g, 7, 6, 2, 9, '#a87840');
      px(g, 2, 3, 12, 3, '#ff6f6f'); px(g, 3, 2, 10, 1, '#ff6f6f'); px(g, 1, 5, 14, 2, '#ff6f6f');
      px(g, 5, 2, 2, 5, '#fff5fa'); px(g, 9, 2, 2, 5, '#fff5fa');
      px(g, 7, 0, 2, 2, '#ffd95f');
      px(g, 10, 12, 5, 3, '#7fb8e8'); px(g, 10, 12, 5, 1, '#a8d4f0');   // beach towel
    },
    ']': (g) => {  // big bouncy beach ball
      circleFill(g, 8, 9, 6, '#fff5fa');
      px(g, 7, 4, 4, 3, '#ff6f6f'); px(g, 11, 8, 3, 3, '#ffe06a');
      px(g, 3, 9, 3, 4, '#7fb8e8'); px(g, 7, 12, 4, 3, '#a8d8a0');
      px(g, 6, 6, 2, 2, '#ffffff');
    },
    ')': (g) => {  // swaying palm tree
      px(g, 7, 7, 2, 8, '#b08a5a'); px(g, 6, 12, 1, 1, '#9a744a'); px(g, 8, 9, 1, 1, '#9a744a');
      px(g, 2, 4, 5, 2, '#4f9e3f'); px(g, 9, 4, 5, 2, '#4f9e3f');
      px(g, 4, 2, 3, 2, '#62b84e'); px(g, 9, 2, 3, 2, '#62b84e');
      px(g, 6, 1, 4, 3, '#74c25e');
      px(g, 1, 6, 3, 1, '#4f9e3f'); px(g, 12, 6, 3, 1, '#4f9e3f');
      px(g, 9, 6, 2, 2, '#e8b86a');   // a little coconut
    },
    // ---- farm tiles ----
    '8': (g) => {  // hay bale
      px(g, 2, 4, 12, 11, '#e8c96a'); px(g, 2, 4, 12, 1, '#f4dd8e');
      px(g, 2, 8, 12, 1, '#d0a94e'); px(g, 2, 12, 12, 1, '#d0a94e');
      px(g, 5, 4, 1, 11, '#b8923e'); px(g, 10, 4, 1, 11, '#b8923e');
    },
    '9': (g) => {  // Buttercup the pony
      px(g, 1, 6, 1, 5, '#8a5a30');                                   // tail
      px(g, 2, 7, 10, 5, '#c89058');                                  // body
      px(g, 10, 3, 4, 5, '#c89058');                                  // head
      px(g, 9, 2, 2, 6, '#8a5a30'); px(g, 10, 1, 1, 2, '#8a5a30');    // mane + ear
      px(g, 13, 1, 1, 2, '#c89058');                                  // other ear
      px(g, 12, 4, 1, 1, '#222'); px(g, 12, 7, 2, 1, '#b07a45');      // eye + muzzle
      px(g, 3, 12, 2, 3, '#a87840'); px(g, 9, 12, 2, 3, '#a87840');   // legs
      px(g, 4, 6, 4, 2, '#ff9ec5');                                   // a pink saddle
    },
    '$': (g) => {  // veggie patch — carrots peeking out of the soil
      px(g, 0, 0, 16, 16, '#b07a45');
      px(g, 0, 5, 16, 1, '#9a6438'); px(g, 0, 11, 16, 1, '#9a6438');
      const carrot = (x: number, y: number) => {
        px(g, x, y, 2, 2, '#ff8a3a');
        px(g, x, y - 2, 1, 2, '#5a9a3a'); px(g, x + 1, y - 3, 1, 3, '#6fb84a');
      };
      carrot(3, 3); carrot(11, 3); carrot(7, 9); carrot(3, 13); carrot(12, 13);
    },
    '?': (g) => {  // friendly scarecrow
      px(g, 7, 8, 2, 7, '#a87840');                                   // pole
      px(g, 2, 7, 12, 2, '#a87840');                                  // arms
      px(g, 4, 8, 2, 1, '#ffd95f'); px(g, 10, 8, 2, 1, '#ffd95f');    // straw hands
      px(g, 5, 6, 6, 4, '#e87f7f');                                   // shirt
      px(g, 6, 2, 4, 4, '#ffe0a8');                                   // head
      px(g, 7, 4, 1, 1, '#222'); px(g, 9, 4, 1, 1, '#222');           // button eyes
      px(g, 5, 1, 6, 1, '#c9935c'); px(g, 4, 2, 8, 1, '#c9935c');     // floppy straw hat
    },
    '"': (g) => {  // a row of tall sunflowers
      px(g, 3, 8, 1, 7, '#5a9a3a'); px(g, 8, 7, 1, 8, '#5a9a3a'); px(g, 12, 9, 1, 6, '#5a9a3a');
      px(g, 1, 3, 5, 5, '#ffd95f'); px(g, 2, 4, 3, 3, '#8a5a30');
      px(g, 6, 2, 5, 5, '#ffd95f'); px(g, 7, 3, 3, 3, '#8a5a30');
      px(g, 10, 5, 5, 4, '#ffd95f'); px(g, 11, 6, 3, 2, '#8a5a30');
    },
    '{': (g) => {  // Daisy the cow
      px(g, 1, 6, 1, 4, '#e8e4da');                                   // tail
      px(g, 2, 5, 10, 7, '#fdfdf8');                                  // body
      px(g, 4, 6, 3, 3, '#3a3530'); px(g, 8, 9, 3, 2, '#3a3530');     // patches
      px(g, 3, 12, 2, 3, '#e8e4da'); px(g, 8, 12, 2, 3, '#e8e4da');   // legs
      px(g, 10, 2, 5, 5, '#fdfdf8');                                  // head
      px(g, 10, 1, 1, 2, '#d8d4ca'); px(g, 14, 1, 1, 2, '#d8d4ca');   // ears
      px(g, 11, 6, 4, 2, '#f7b8c8');                                  // soft pink muzzle
      px(g, 11, 3, 1, 1, '#222'); px(g, 13, 3, 1, 1, '#222');         // eyes
    },
    U: (g) => {  // sidewalk hopscotch drawn in chalk
      PAINT[';'](g);
      const c = '#fff6fb';
      px(g, 6, 1, 5, 1, c); px(g, 6, 5, 5, 1, c); px(g, 6, 1, 1, 5, c); px(g, 10, 1, 1, 5, c);
      px(g, 7, 2, 3, 3, '#ff9ec5');
      px(g, 6, 6, 5, 1, c); px(g, 6, 10, 5, 1, c); px(g, 6, 6, 1, 5, c); px(g, 10, 6, 1, 5, c);
      px(g, 7, 7, 3, 3, '#7fb8e8');
      px(g, 2, 11, 5, 1, c); px(g, 2, 15, 5, 1, c); px(g, 2, 11, 1, 4, c); px(g, 6, 11, 1, 4, c);
      px(g, 9, 11, 5, 1, c); px(g, 9, 15, 5, 1, c); px(g, 9, 11, 1, 4, c); px(g, 13, 11, 1, 4, c);
      px(g, 3, 12, 3, 3, '#ffe06a'); px(g, 10, 12, 3, 3, '#a8d8a0');
    },
    V: (g) => {  // a bubble stand with floaty bubbles
      paintGrass(g);
      px(g, 6, 9, 4, 6, '#9adbc8'); px(g, 6, 8, 4, 1, '#7fb8e8'); px(g, 7, 7, 2, 1, '#cfe6fa');
      px(g, 3, 3, 2, 2, '#cfe6fa'); px(g, 10, 2, 3, 3, '#e8f6fb');
      px(g, 7, 1, 2, 2, '#cfe6fa'); px(g, 12, 6, 2, 2, '#e8f6fb');
      px(g, 3, 3, 1, 1, '#ffffff'); px(g, 11, 3, 1, 1, '#ffffff');
    },
    // ---- new signposts ----
    i: (g) => signpost(g, () => {  // bus stop sign
      px(g, 3, 5, 10, 5, '#5a7fb0'); px(g, 4, 4, 8, 1, '#7a9fd0');
      px(g, 4, 6, 2, 2, '#fff5fa'); px(g, 7, 6, 2, 2, '#fff5fa'); px(g, 10, 6, 2, 2, '#fff5fa');
      px(g, 4, 10, 2, 1, '#222'); px(g, 10, 10, 2, 1, '#222');
    }),
    l: (g) => signpost(g, () => {  // library: open book
      px(g, 3, 3, 5, 7, '#7fb8e8'); px(g, 8, 3, 5, 7, '#5a98c8'); px(g, 7, 3, 1, 7, '#3a6a98');
      px(g, 4, 5, 3, 1, '#fff'); px(g, 9, 5, 3, 1, '#fff'); px(g, 4, 7, 3, 1, '#fff'); px(g, 9, 7, 3, 1, '#fff');
    }),
    j: (g) => signpost(g, () => {  // toy store: a star toy
      px(g, 7, 2, 2, 3, '#ffd95f'); px(g, 4, 5, 8, 2, '#ffd95f'); px(g, 5, 7, 6, 2, '#ffd95f');
      px(g, 4, 9, 3, 2, '#ffd95f'); px(g, 9, 9, 3, 2, '#ffd95f');
    }),
    N: (g) => signpost(g, () => {  // bakery: a cupcake
      px(g, 5, 3, 6, 2, '#ff9ec5'); px(g, 4, 4, 8, 2, '#ffb7d2'); px(g, 7, 1, 2, 2, '#e85a5a');
      px(g, 5, 6, 6, 4, '#e8b86a'); px(g, 6, 6, 1, 4, '#caa06a'); px(g, 9, 6, 1, 4, '#caa06a');
    }),
    '/': (g) => {  // Wonder Roll Park sign / puzzle table
      PAINT[';'](g);
      px(g, 1, 1, 14, 10, '#7fb8e8'); px(g, 2, 2, 12, 8, '#cfe6fa');
      px(g, 3, 3, 10, 2, '#ff9ec5'); px(g, 3, 8, 10, 1, '#7a6a8a');
      circleFill(g, 5, 7, 2, '#ffd95f'); circleFill(g, 11, 7, 2, '#9a7ad0');
      px(g, 7, 6, 2, 2, '#6ab85f'); px(g, 4, 12, 8, 3, '#c9935c'); px(g, 5, 11, 6, 1, '#e0b078');
    },
    '(': (g) => signpost(g, () => {  // art studio: a paintbrush
      px(g, 4, 7, 8, 2, '#c9935c'); px(g, 11, 6, 3, 3, '#8a8f98');
      px(g, 3, 6, 2, 3, '#ff6f9e'); px(g, 2, 7, 2, 2, '#ff6f9e');
      px(g, 5, 2, 2, 2, '#ffd95f'); px(g, 8, 2, 2, 2, '#7fb8e8'); px(g, 11, 2, 2, 2, '#9adb7a');
    }),
  };
  function signpost(g: Ctx, face: () => void) {
    paintGrass(g);
    px(g, 7, 9, 2, 6, '#a87840');
    px(g, 1, 1, 14, 9, '#c9935c');
    px(g, 2, 2, 12, 7, '#f4e0ae');
    face();
  }
  function busStop(g: Ctx, base: string, light: string) {
    px(g, 3, 2, 2, 12, '#8a8f98');
    px(g, 1, 2, 9, 5, base); px(g, 1, 2, 9, 1, light);
    px(g, 2, 4, 7, 2, '#fff5fa'); px(g, 3, 5, 1, 1, base); px(g, 6, 5, 1, 1, base);
    px(g, 9, 12, 6, 2, '#c9935c'); px(g, 10, 11, 1, 3, '#a87840'); px(g, 13, 11, 1, 3, '#a87840');
  }
  function circleFill(g: Ctx, cx: number, cy: number, r: number, col: string) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r + 0.5) px(g, cx + dx, cy + dy, 1, 1, col);
  }
  function paintBikeSide(g: Ctx) { // faces right; 16x11
    circleFill(g, 3, 7, 3, '#4a4a55'); circleFill(g, 3, 7, 1, '#c8c8d8');
    circleFill(g, 12, 7, 3, '#4a4a55'); circleFill(g, 12, 7, 1, '#c8c8d8');
    px(g, 3, 5, 1, 2, '#ff7fb0'); px(g, 4, 4, 7, 1, '#ff7fb0');
    px(g, 7, 5, 1, 3, '#ff7fb0'); px(g, 11, 4, 1, 3, '#ff7fb0');
    px(g, 2, 2, 3, 1, '#5a4458'); px(g, 3, 3, 1, 1, '#ff7fb0');
    px(g, 10, 2, 3, 1, '#5a4458'); px(g, 11, 3, 1, 1, '#ff7fb0');
    px(g, 13, 3, 3, 3, '#c9935c'); px(g, 13, 3, 3, 1, '#a87840');
  }
  function paintBikeFront(g: Ctx) { // 8x11
    px(g, 3, 6, 2, 5, '#4a4a55'); px(g, 3, 8, 2, 1, '#c8c8d8');
    px(g, 1, 2, 6, 1, '#5a4458'); px(g, 3, 3, 2, 3, '#ff7fb0');
    px(g, 2, 4, 4, 2, '#c9935c'); px(g, 2, 4, 4, 1, '#a87840');
  }
  function roof(g: Ctx, base: string, dark: string) {
    px(g, 0, 0, 16, 16, base);
    px(g, 0, 5, 16, 1, dark); px(g, 0, 10, 16, 1, dark); px(g, 0, 15, 16, 1, dark);
  }

  const DOOR_TRIM: Record<string, string> = { H:'#ff9ec5', S:'#e87f7f', P:'#7fb8e8', L:'#b89fe0', C:'#8fe0c0',
                     R:'#8a9ad8', O:'#ffb84f', K:'#ff9ec5', X:'#e88a8a', '0':'#a98cf0', '>':'#7fb8e8' };
  for (const dc of ['H', 'S', 'P', 'L', 'C', 'R', 'O', 'K', 'X', '0', '>']) {
    PAINT[dc] = ((trim) => (g, f) => PAINT.door(g, f, trim))(DOOR_TRIM[dc]);
  }

  // ---------- sticker icons (16x16) ----------
  function star(g: Ctx, col: string) {
    px(g, 7, 1, 2, 4, col); px(g, 5, 5, 6, 2, col); px(g, 1, 5, 14, 2, col);
    px(g, 3, 7, 10, 3, col); px(g, 2, 10, 4, 4, col); px(g, 10, 10, 4, 4, col);
    px(g, 6, 10, 4, 2, col);
  }
  const ICONS: Record<string, (g: Ctx) => void> = {
    star:  (g) => star(g, '#ffd95f'),
    block: (g) => { px(g,2,2,12,12,'#e87f7f'); px(g,3,3,10,10,'#ffb0b0'); px(g,6,5,1,6,'#fff'); px(g,9,5,1,6,'#fff'); px(g,6,7,4,1,'#fff'); },
    book:  (g) => { px(g,2,2,12,12,'#7fb8e8'); px(g,7,2,2,12,'#5a98c8'); px(g,4,5,2,1,'#fff'); px(g,4,8,2,1,'#fff'); },
    drop:  (g) => { px(g,7,1,2,3,'#7fd4f0'); px(g,5,4,6,4,'#7fd4f0'); px(g,3,8,10,5,'#7fd4f0'); px(g,5,9,2,2,'#c8f0fa'); },
    fish:  (g) => { px(g,2,6,9,5,'#ffb060'); px(g,4,5,5,7,'#ffb060'); px(g,11,5,3,3,'#ff9840'); px(g,11,9,3,3,'#ff9840'); px(g,4,7,1,1,'#222'); },
    crown: (g) => { px(g,2,4,2,5,'#ffd95f'); px(g,7,3,2,6,'#ffd95f'); px(g,12,4,2,5,'#ffd95f'); px(g,2,9,12,4,'#ffd95f'); px(g,7,10,2,2,'#ff9ec5'); },
    shoe:  (g) => { px(g,3,6,10,5,'#ff9ec5'); px(g,3,5,4,2,'#ff9ec5'); px(g,2,11,12,2,'#e088ab'); px(g,6,3,1,3,'#e088ab'); px(g,9,3,1,3,'#e088ab'); },
    bow:   (g) => { px(g,2,4,5,7,'#ff5f9e'); px(g,9,4,5,7,'#ff5f9e'); px(g,7,6,2,3,'#e0407f'); px(g,3,6,2,2,'#ff9ec5'); px(g,11,6,2,2,'#ff9ec5'); },
    heart: (g) => { px(g,3,3,4,3,'#ff6f9e'); px(g,9,3,4,3,'#ff6f9e'); px(g,2,5,12,4,'#ff6f9e'); px(g,4,9,8,3,'#ff6f9e'); px(g,6,12,4,2,'#ff6f9e'); px(g,4,4,2,2,'#ffb0cc'); },
    fly:   (g) => { px(g,7,4,2,9,'#6a5a4a'); px(g,3,3,4,4,'#cdb0ee'); px(g,9,3,4,4,'#ff9ec5'); px(g,3,8,4,4,'#ff9ec5'); px(g,9,8,4,4,'#cdb0ee'); },
    cream: (g) => { px(g,5,1,6,3,'#ff9ec5'); px(g,4,3,8,3,'#fff5fa'); px(g,5,7,6,7,'#e8b86a'); px(g,6,8,1,4,'#caa06a'); px(g,9,8,1,4,'#caa06a'); px(g,7,12,2,3,'#e8b86a'); },
    duck:  (g) => { px(g,4,3,5,4,'#fff8e4'); px(g,2,4,2,2,'#f2a444'); px(g,6,4,1,1,'#222'); px(g,4,7,9,5,'#fff8e4'); px(g,11,5,3,3,'#fff8e4'); },
    plate: (g) => { px(g,1,3,14,10,'#fff5fa'); px(g,3,4,10,8,'#f0e0e8'); px(g,5,6,4,3,'#e8b86a'); px(g,4,10,2,2,'#62b84e'); px(g,10,10,2,2,'#e85a5a'); },
    moon:  (g) => { px(g,5,2,6,2,'#ffe89a'); px(g,3,4,4,2,'#ffe89a'); px(g,2,6,4,4,'#ffe89a'); px(g,3,10,4,2,'#ffe89a'); px(g,5,12,6,2,'#ffe89a'); px(g,11,11,2,2,'#ffe89a'); },
    note:  (g) => { px(g,9,2,2,9,'#7a5fae'); px(g,11,2,3,2,'#7a5fae'); px(g,6,9,5,4,'#9a7fce'); },
    sun:   (g) => { px(g,5,5,6,6,'#ffd95f'); px(g,7,1,2,3,'#ffb84f'); px(g,7,12,2,3,'#ffb84f'); px(g,1,7,3,2,'#ffb84f'); px(g,12,7,3,2,'#ffb84f'); },
    medal: (g) => { px(g,5,1,2,5,'#e87f7f'); px(g,9,1,2,5,'#7fb8e8'); px(g,4,6,8,8,'#ffd95f'); px(g,6,8,4,4,'#ffb84f'); },
    cookie:(g) => { px(g,3,3,10,10,'#dba368'); px(g,2,5,12,6,'#dba368'); px(g,5,5,2,2,'#6a4a2a'); px(g,9,7,2,2,'#6a4a2a'); px(g,6,10,2,2,'#6a4a2a'); },
    swing: (g) => { px(g,2,2,2,12,'#a87840'); px(g,12,2,2,12,'#a87840'); px(g,2,1,12,2,'#c9935c'); px(g,6,3,1,7,'#888'); px(g,9,3,1,7,'#888'); px(g,5,10,6,2,'#e0567f'); },
    bike:  (g) => { px(g,1,8,6,6,'#4a4a55'); px(g,3,10,2,2,'#c8c8d8'); px(g,9,8,6,6,'#4a4a55'); px(g,11,10,2,2,'#c8c8d8'); px(g,4,4,8,2,'#ff7fb0'); px(g,7,6,2,4,'#ff7fb0'); px(g,3,2,3,2,'#5a4458'); px(g,10,2,3,2,'#5a4458'); },
    paw:   (g) => { px(g,4,1,3,3,'#c89058'); px(g,9,1,3,3,'#c89058'); px(g,1,4,3,3,'#c89058'); px(g,12,4,3,3,'#c89058'); px(g,4,6,8,7,'#c89058'); px(g,5,8,6,4,'#e8b888'); },
    wave:  (g) => { px(g,1,7,3,2,'#7fd4f0'); px(g,3,5,3,2,'#7fd4f0'); px(g,6,7,3,2,'#7fd4f0'); px(g,8,5,3,2,'#7fd4f0'); px(g,11,7,3,2,'#7fd4f0'); px(g,13,5,2,2,'#7fd4f0'); px(g,2,10,12,3,'#5cb4d8'); },
    wish:  (g) => { px(g,3,9,10,5,'#9aa0c8'); px(g,3,7,10,3,'#bfe6f5'); px(g,3,7,10,1,'#a4d6e6'); px(g,7,2,2,4,'#cfd6dc'); px(g,6,1,4,2,'#e8f8ff'); star(g,'#ffd95f'); px(g,5,11,1,1,'#fff'); },
    apple: (g) => { px(g,4,4,8,9,'#e85a5a'); px(g,3,6,10,6,'#e85a5a'); px(g,5,5,2,2,'#ff9a9a'); px(g,7,2,1,3,'#7a5230'); px(g,8,1,3,2,'#62b84e'); },
    bouquet:(g) => { px(g,7,7,2,8,'#5a8a4a'); px(g,3,3,4,4,'#ff7fb0'); px(g,9,3,4,4,'#ffe06a'); px(g,5,6,4,4,'#a98cf0'); px(g,4,4,1,1,'#fff'); px(g,10,4,1,1,'#fff'); px(g,2,12,12,2,'#ffb7d2'); },
    seesaw:(g) => { px(g,7,9,2,4,'#a87840'); px(g,5,12,6,2,'#8a5a30'); px(g,1,5,14,3,'#ff8aa8'); px(g,1,4,4,1,'#ffd95f'); px(g,11,8,4,1,'#7fb8e8'); },
    castle:(g) => { px(g,2,7,12,7,'#e6c882'); px(g,1,4,3,4,'#e6c882'); px(g,6,3,4,5,'#e6c882'); px(g,12,4,3,4,'#e6c882'); px(g,2,2,1,3,'#ff7fb0'); px(g,5,9,2,5,'#caa85e'); px(g,9,9,2,5,'#caa85e'); },
    carousel:(g)=> { px(g,2,2,12,2,'#ff7fb0'); px(g,1,4,14,2,'#fff5fa'); px(g,7,0,2,2,'#ff5f9e'); px(g,2,6,12,1,'#e0b85a'); px(g,7,6,2,8,'#cdb0ee'); px(g,3,9,4,3,'#fff5fa'); px(g,10,9,3,3,'#7fb8e8'); px(g,3,7,1,5,'#ffd95f'); px(g,11,7,1,5,'#ffd95f'); },
    balloon:(g) => { px(g,3,1,5,6,'#ff6f9e'); px(g,9,2,5,5,'#7fb8e8'); px(g,5,7,1,7,'#b0a0b8'); px(g,11,7,1,6,'#b0a0b8'); px(g,4,3,1,2,'#ffd1e0'); px(g,10,3,1,2,'#cfe6fa'); },
    bus:   (g) => { px(g,1,4,14,8,'#5a7fb0'); px(g,1,4,14,1,'#7a9fd0'); px(g,2,6,3,3,'#cfe6fa'); px(g,6,6,3,3,'#cfe6fa'); px(g,10,6,3,3,'#cfe6fa'); px(g,3,12,3,3,'#3a3a44'); px(g,10,12,3,3,'#3a3a44'); px(g,1,9,14,1,'#ffd95f'); },
    hop:   (g) => { px(g,6,1,5,4,'#ff9ec5'); px(g,6,6,5,4,'#7fb8e8'); px(g,2,11,5,4,'#ffe06a'); px(g,9,11,5,4,'#a8d8a0'); px(g,6,1,5,1,'#fff'); px(g,6,6,5,1,'#fff'); },
    bubbles:(g) => { px(g,3,3,4,4,'#cfe6fa'); px(g,9,2,5,5,'#e8f6fb'); px(g,5,8,6,6,'#bfe6f5'); px(g,4,4,1,1,'#fff'); px(g,10,3,1,1,'#fff'); px(g,6,9,1,1,'#fff'); },
    shell: (g) => { px(g,7,2,2,2,'#e88ab0'); px(g,5,4,6,3,'#ffb7d2'); px(g,3,7,10,4,'#ffb7d2'); px(g,4,11,8,3,'#ffb7d2'); px(g,7,4,1,10,'#e88ab0'); px(g,4,7,1,6,'#e88ab0'); px(g,10,7,1,6,'#e88ab0'); },
    ball:  (g) => { px(g,5,2,6,2,'#ff6f6f'); px(g,3,4,10,3,'#ff6f6f'); px(g,2,7,12,3,'#fff5fa'); px(g,3,10,10,2,'#7fb8e8'); px(g,5,12,6,2,'#7fb8e8'); px(g,4,4,2,2,'#ffb0b0'); },
    pony:  (g) => { px(g,1,7,1,4,'#8a5a30'); px(g,2,8,9,4,'#c89058'); px(g,9,3,5,6,'#c89058'); px(g,8,2,2,7,'#8a5a30'); px(g,12,4,1,1,'#222'); px(g,3,12,2,3,'#a87840'); px(g,8,12,2,3,'#a87840'); px(g,4,7,3,2,'#ff9ec5'); },
    carrot:(g) => { px(g,9,2,3,3,'#5a9a3a'); px(g,11,4,3,2,'#6fb84a'); px(g,8,5,3,3,'#ff8a3a'); px(g,6,7,4,3,'#ff8a3a'); px(g,4,9,4,3,'#ff8a3a'); px(g,2,11,3,3,'#ff8a3a'); px(g,7,7,1,1,'#e06a20'); px(g,5,10,1,1,'#e06a20'); },
    barn:  (g) => { px(g,3,2,10,3,'#a84440'); px(g,2,5,12,9,'#d45a54'); px(g,6,8,4,6,'#8a4a3a'); px(g,7,9,2,2,'#ffd95f'); px(g,3,6,2,2,'#fff5fa'); px(g,11,6,2,2,'#fff5fa'); },
    cow:   (g) => { px(g,3,4,10,8,'#fdfdf8'); px(g,2,2,3,3,'#d8d4ca'); px(g,11,2,3,3,'#d8d4ca'); px(g,4,10,8,4,'#f7b8c8'); px(g,5,6,2,2,'#222'); px(g,9,6,2,2,'#222'); px(g,6,11,1,2,'#e088ab'); px(g,9,11,1,2,'#e088ab'); px(g,10,4,3,3,'#3a3530'); },
    teddy: (g) => { px(g,3,2,4,4,'#c89058'); px(g,9,2,4,4,'#c89058'); px(g,4,3,2,2,'#e8b888'); px(g,10,3,2,2,'#e8b888'); px(g,3,5,10,8,'#c89058'); px(g,5,7,2,2,'#222'); px(g,9,7,2,2,'#222'); px(g,7,9,2,2,'#6a4a2a'); px(g,6,11,4,1,'#6a4a2a'); },
    froggy:(g) => { px(g,3,3,3,3,'#9ad88f'); px(g,10,3,3,3,'#9ad88f'); px(g,4,4,1,1,'#222'); px(g,11,4,1,1,'#222'); px(g,2,6,12,7,'#9ad88f'); px(g,4,9,8,2,'#5a8a4a'); px(g,2,13,3,2,'#7ab86a'); px(g,11,13,3,2,'#7ab86a'); },
    palette:(g)=> { px(g,2,3,12,9,'#dba368'); px(g,3,2,10,2,'#dba368'); px(g,3,12,8,2,'#dba368'); px(g,9,8,4,3,'#f6edd8'); px(g,4,4,2,2,'#ff6f6f'); px(g,8,3,2,2,'#ffd95f'); px(g,4,8,2,2,'#7fb8e8'); px(g,7,6,2,2,'#9adb7a'); },
    rainbow:(g)=> { px(g,2,10,2,4,'#ff6f6f'); px(g,3,7,2,3,'#ff6f6f'); px(g,5,5,3,2,'#ff6f6f'); px(g,8,4,3,2,'#ff6f6f'); px(g,4,10,2,4,'#ffd95f'); px(g,5,8,2,2,'#ffd95f'); px(g,7,7,3,1,'#ffd95f'); px(g,9,6,3,2,'#ffd95f'); px(g,6,10,2,4,'#7fb8e8'); px(g,7,9,3,1,'#7fb8e8'); px(g,9,8,3,2,'#7fb8e8'); px(g,11,6,3,3,'#fff5fa'); px(g,12,10,3,3,'#fff5fa'); },
  };

  // ---------- build everything ----------
  const tiles: Record<string, HTMLCanvasElement>[] = [{}, {}];      // [frame][char] -> canvas
  const chars: Record<string, Record<string, HTMLCanvasElement[]>> = {};            // name -> dir -> [3 canvases]
  const ducks: Record<string, HTMLCanvasElement> = {};            // 'left'/'right'
  const icons: Record<string, HTMLCanvasElement> = {};
  const animals: Record<string, Record<string, HTMLCanvasElement>> = {};          // kind -> 'left'/'right'
  const bikes: Record<string, HTMLCanvasElement> = {};            // 'side-left' / 'side-right' / 'front'

  function makeCanvas(w: number, h: number, fn: (g: Ctx) => void) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d')!);
    return c;
  }

  function build() {
    for (const ch of Object.keys(PAINT)) {
      if (ch === 'door') continue;
      for (const f of [0, 1]) tiles[f][ch] = makeCanvas(TILE, TILE, g => PAINT[ch](g, f));
    }
    for (const name of Object.keys(CHARDEFS)) chars[name] = buildChar(CHARDEFS[name]);
    for (const dir of ['left', 'right']) {
      ducks[dir] = makeCanvas(10, 7, g => {
        if (dir === 'right') { g.translate(10, 0); g.scale(-1, 1); }
        for (let y = 0; y < DUCK.length; y++) for (let x = 0; x < 10; x++) {
          const col = DUCK_PAL[DUCK[y][x]];
          if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
        }
      });
    }
    for (const name of Object.keys(ICONS)) icons[name] = makeCanvas(16, 16, g => ICONS[name](g));
    for (const kind of Object.keys(ANIMAL_TPL)) {
      const tpl = ANIMAL_TPL[kind], pal = ANIMAL_PAL[kind];
      animals[kind] = {};
      for (const dir of ['left', 'right']) {
        animals[kind][dir] = makeCanvas(10, tpl.length, g => {
          if (dir === 'right') { g.translate(10, 0); g.scale(-1, 1); }
          for (let y = 0; y < tpl.length; y++) for (let x = 0; x < 10; x++) {
            const col = pal[tpl[y][x]];
            if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
          }
        });
      }
    }
    bikes['side-right'] = makeCanvas(16, 11, paintBikeSide);
    bikes['side-left'] = makeCanvas(16, 11, g => { g.translate(16, 0); g.scale(-1, 1); paintBikeSide(g); });
    bikes.front = makeCanvas(8, 11, paintBikeFront);
  }

  return {
    TILE, SCALE, build,
    tile: (ch: string, f: number) => tiles[f % 2][ch],
    chr: (name: string, dir: string, f: number) => chars[name] && chars[name][dir][f],
    duck: (dir: string) => ducks[dir],
    icon: (name: string) => icons[name],
    animal: (kind: string, dir: string) => animals[kind] && animals[kind][dir],
    bike: (dir: string) => dir === 'left' ? bikes['side-left'] : dir === 'right' ? bikes['side-right'] : bikes.front,
    hasTile: (ch: string) => PAINT[ch] !== undefined,
    CHARDEFS,
  };
})();
