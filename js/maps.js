/* ======================================================================
   Starry ☆ Little Days — maps.js
   Tile maps as character grids. Each char maps to a painter in
   sprites.js. Building doors (H S P L C R O K) warp into interiors;
   mats (x) warp out. Bus stops (B) link the two outdoor maps.
   ====================================================================== */

const Maps = (() => {

  const DATA = {
    town: { label: 'Starview Meadow', base: '.', outdoor: true, music: 'meadow', rows: null },
    city: { label: 'Starbright City', base: ';', outdoor: true, music: 'city', rows: null },
  };

  // ---- grid helpers (shared by town & city) ----
  const grid = (w, h, fill) => Array.from({ length: h }, () => Array(w).fill(fill));
  function rect(g, x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  }
  function building(g, x, y, w, roofH, roofCh, doorCh, stub) {
    rect(g, x, y, x + w - 1, y + roofH - 1, roofCh);
    const wy = y + roofH;
    for (let i = 0; i < w; i++) g[wy][x + i] = (i % 3 === 1 && i > 0 && i < w - 1) ? 'o' : '=';
    const dy = wy + 1, dx = x + (w >> 1);
    rect(g, x, dy, x + w - 1, dy, '=');
    g[dy][dx] = doorCh;            // the door itself
    g[dy + 1][dx] = stub || 'p';  // little path stub to the street
  }
  function border(g, w, h, ch) {
    rect(g, 0, 0, w - 1, 1, ch); rect(g, 0, h - 2, w - 1, h - 1, ch);
    rect(g, 0, 0, 1, h - 1, ch); rect(g, w - 2, 0, w - 1, h - 1, ch);
  }
  function sprinkle(g, w, h) {        // flowers & grass tufts on open grass
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      if (g[y][x] !== '.') continue;
      if ((x * 7 + y * 13) % 31 === 0) g[y][x] = ',';
      else if ((x * 5 + y * 11) % 37 === 0) g[y][x] = "'";
    }
  }

  // ====================================================================
  //  TOWN — Starview Meadow (grown to give the little town room to breathe)
  // ====================================================================
  const TW = 64, TH = 46;
  {
    const tg = grid(TW, TH, '.');
    border(tg, TW, TH, '#');
    // north: home and school
    building(tg, 4, 3, 7, 2, '1', 'H');     // door at (7,6)
    building(tg, 38, 2, 9, 3, '3', 'S');    // door at (42,6)
    // mid: pool, sweet shop, ballet studio
    building(tg, 4, 11, 9, 2, '2', 'P');    // door at (8,14)
    building(tg, 20, 11, 7, 2, '5', 'C');   // door at (23,14)
    building(tg, 36, 11, 8, 2, '4', 'L');   // door at (40,14)
    // streets + vertical connectors (main street now runs east to the bus stop)
    rect(tg, 3, 8, 60, 8, 'p'); rect(tg, 3, 16, 48, 16, 'p'); rect(tg, 3, 20, 48, 20, 'p');
    rect(tg, 16, 9, 16, 15, 'p'); rect(tg, 31, 9, 31, 15, 'p');
    rect(tg, 16, 17, 16, 19, 'p'); rect(tg, 31, 17, 31, 19, 'p');
    // the lake (swimmable!) with a sandy beach on its east shore
    rect(tg, 6, 22, 14, 22, 'w');
    rect(tg, 5, 23, 15, 23, 'w');
    rect(tg, 4, 24, 16, 27, 'w');
    rect(tg, 5, 28, 15, 28, 'w');
    rect(tg, 6, 29, 13, 29, 'w');
    rect(tg, 17, 24, 19, 27, 's');
    tg[25][18] = '&';                    // a sandcastle on the beach
    // the park: fence with a gate, sand, slide, swings, and now a see-saw
    rect(tg, 28, 21, 46, 21, 'f');
    rect(tg, 29, 22, 45, 26, 's');
    tg[21][36] = 's'; tg[21][37] = 's';  // gate
    tg[23][31] = 'd';                    // slide
    tg[23][34] = 'g'; tg[23][35] = 'g';  // swings
    tg[24][43] = 'J';                    // see-saw
    // a sunny town square down south, with a wishing fountain
    rect(tg, 24, 21, 24, 32, 'p');       // path down from the mid street
    rect(tg, 22, 33, 34, 39, 'p');       // the square
    tg[36][28] = 'F';                    // the fountain
    // a little flower garden and two apple trees in the new green space
    tg[31][44] = '*'; tg[31][45] = '*'; tg[32][45] = '*'; tg[32][44] = '*';
    tg[10][14] = 'Y'; tg[18][50] = 'Y';
    // little woods tucked around town
    rect(tg, 18, 3, 20, 4, '#'); rect(tg, 33, 3, 34, 4, '#');
    rect(tg, 21, 24, 23, 25, '#'); rect(tg, 47, 23, 48, 27, '#');
    rect(tg, 25, 29, 27, 30, '#'); rect(tg, 52, 30, 54, 34, '#'); rect(tg, 8, 38, 10, 40, '#');
    sprinkle(tg, TW, TH);
    // signposts so you can tell the buildings apart, plus the home mailbox
    tg[7][5] = 'z';    // home mailbox
    tg[7][40] = 'a';   // school sign
    tg[15][6] = 'u';   // pool sign
    tg[15][21] = 'q';  // sweet shop sign
    tg[15][38] = 'n';  // ballet sign
    tg[19][38] = 'e';  // park sign
    tg[8][60] = 'B';   // bus stop to the city (on the east end of main street)
    tg[7][60] = 'i';   // bus-stop sign
    DATA.town.rows = tg.map(r => r.join(''));
  }

  // ====================================================================
  //  CITY — Starbright City (a busy little downtown to visit)
  // ====================================================================
  const CW = 60, CH = 40;
  {
    const cg = grid(CW, CH, ';');        // base is paved sidewalk
    border(cg, CW, CH, '#');
    // a leafy green strip down the middle-south and pocket parks
    rect(cg, 2, 19, CW - 3, 37, '.');
    // the grand avenue (two tiles tall) and a cross street
    rect(cg, 2, 17, CW - 3, 18, ':');
    rect(cg, 28, 2, 29, 37, ':');
    // sidewalks hugging the avenue
    rect(cg, 2, 16, CW - 3, 16, ';'); rect(cg, 2, 19, CW - 3, 19, ';');
    rect(cg, 27, 2, 27, 37, ';'); rect(cg, 30, 2, 30, 37, ';');
    // shops along the north side
    building(cg, 6, 4, 9, 3, '4', 'R', ';');    // Library     door (10,7)
    building(cg, 20, 4, 8, 2, '5', 'O', ';');   // Toy Store   door (23,6)
    building(cg, 40, 4, 8, 2, '1', 'K', ';');   // Bakery Café door (43,6)
    // a plaza fountain on the west green
    rect(cg, 8, 22, 22, 32, ';');
    cg[27][15] = 'F';                    // the city fountain
    // a carousel and a balloon cart on the east green
    cg[28][46] = '@';                    // carousel
    cg[21][20] = 'I';                    // balloon cart by the avenue
    cg[30][50] = 'g';                    // a city swing
    cg[24][40] = 'V';                    // a bubble stand
    cg[25][20] = 'U';                    // sidewalk hopscotch on the plaza
    // the petting zoo — a fenced grassy pen (gate gap on the top)
    rect(cg, 5, 24, 14, 34, 'f');
    rect(cg, 6, 25, 13, 33, '.');
    cg[24][9] = '.'; cg[24][10] = '.';   // gate
    // pocket greenery: trees + flower beds
    rect(cg, 50, 22, 52, 26, '#'); rect(cg, 34, 30, 36, 33, '#');
    cg[33][40] = '*'; cg[33][41] = '*'; cg[34][41] = '*'; cg[34][40] = '*';
    cg[30][52] = '*'; cg[31][52] = '*';
    cg[26][33] = 'Y'; cg[35][24] = 'Y';  // shade trees you can pick from
    sprinkle(cg, CW, CH);
    cg[18][3] = 'B';                     // bus stop back to town (west end of avenue)
    cg[16][3] = 'i';                     // bus-stop sign
    // shop signposts out on the sidewalk
    cg[9][8] = 'l';                      // library sign (book)
    cg[8][22] = 'j';                     // toy store sign (teddy)
    cg[8][42] = 'N';                     // bakery sign (cupcake)
    DATA.city.rows = cg.map(r => r.join(''));
  }

  // ====================================================================
  //  Interiors
  // ====================================================================
  DATA.home = {
    label: 'Home Sweet Home', base: '_', music: 'home',
    rows: [
      '||||||||||||||',
      '|b..mm.kkk...|',
      '|v...........|',
      '|y...........|',
      '|....rr......|',
      '|...cTTc.....|',
      '|............|',
      '|............|',
      '|......x.....|',
      '||||||||||||||',
    ],
  };

  DATA.school = {
    label: 'Sunny Sprouts School', base: '~', music: 'school',
    rows: [
      '||||||||||||||||||',
      '|.AAAAAA....mm...|',
      '|....t...........|',
      '|................|',
      '|..D...D...D.....|',
      '|................|',
      '|..D...D...D.....|',
      '|................|',
      '|................|',
      '|........x.......|',
      '||||||||||||||||||',
    ],
  };

  DATA.pool = {
    label: 'Splashy Swim Center', base: '~', music: 'pool',
    rows: [
      '||||||||||||||||||||',
      '|mm..............mm|',
      '|..EEEEEEEEEEEE....|',
      '|..EWWWWWWWWWWE....|',
      '|..EWWWWWWWWWWE....|',
      '|..EWWWWWWWWWWE....|',
      '|..EWWWWWWWWWWE....|',
      '|..EEEEEEEEEEEE....|',
      '|..................|',
      '|..................|',
      '|.........x........|',
      '||||||||||||||||||||',
    ],
  };

  DATA.ballet = {
    label: 'Twinkle Toes Studio', base: '^', music: 'ballet',
    rows: [
      '||||||||||||||||',
      '|.MMMMMMMMMM.Q.|',
      '|..............|',
      '|..............|',
      '|..............|',
      '|..............|',
      '|..............|',
      '|..............|',
      '|..............|',
      '|.......x......|',
      '||||||||||||||||',
    ],
  };

  DATA.shop = {
    label: "Mr. Scoop's Sweets", base: '-', music: 'shop',
    rows: [
      '||||||||||||||',
      '|............|',
      '|............|',
      '|.hGGGGGGGGh.|',
      '|............|',
      '|............|',
      '|............|',
      '|.....x......|',
      '||||||||||||||',
    ],
  };

  DATA.library = {
    label: 'Storytime Library', base: '~', music: 'home',
    rows: [
      '||||||||||||||||',
      '|.mmmmmm.mmmm..|',
      '|..............|',
      '|...rr....rr...|',
      '|..............|',
      '|...rr....rr...|',
      '|..............|',
      '|......x.......|',
      '||||||||||||||||',
    ],
  };

  DATA.toystore = {
    label: 'Tippy Top Toys', base: '-', music: 'shop',
    rows: [
      '||||||||||||||||',
      '|.mmmm..mmmm.y.|',
      '|..............|',
      '|..y...rr...y..|',
      '|..............|',
      '|....rr..rr....|',
      '|..............|',
      '|......x.......|',
      '||||||||||||||||',
    ],
  };

  DATA.cafe = {
    label: 'Honey Bun Bakery', base: '-', music: 'shop',
    rows: [
      '||||||||||||||||',
      '|..............|',
      '|.GGGGGGGGGG...|',
      '|..............|',
      '|..cT....Tc....|',
      '|..............|',
      '|......x.......|',
      '||||||||||||||||',
    ],
  };

  // water (w, W) is not solid — Starry can swim once she's had a class.
  // E is the walkable pool deck rim. Doors and bus stops stay walkable.
  const SOLID = new Set('#f12345=o|bvmkyTcADtMQGhdgaunqzeFYJ@IlijNV'.split(''));
  const WATER = new Set(['w', 'W']);
  const isWater = (name, x, y) => WATER.has(tileAt(name, x, y));

  // building doors: which outdoor map they sit on, and the interior they open
  const DOORS = {
    H: { outer: 'town', inner: 'home' },   S: { outer: 'town', inner: 'school' },
    P: { outer: 'town', inner: 'pool' },   L: { outer: 'town', inner: 'ballet' },
    C: { outer: 'town', inner: 'shop' },
    R: { outer: 'city', inner: 'library' }, O: { outer: 'city', inner: 'toystore' },
    K: { outer: 'city', inner: 'cafe' },
  };
  // outdoor<->outdoor links (bus stops): walk onto `ch` to ride between maps
  const OFF = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const LINKS = [
    { a: { map: 'town', ch: 'B' }, b: { map: 'city', ch: 'B' }, dir: 'right' },
  ];

  const warps = {};   // mapName -> { 'x,y': {map, x, y, dir} }

  function find(mapName, ch) {
    const rows = DATA[mapName].rows;
    for (let y = 0; y < rows.length; y++) {
      const x = rows[y].indexOf(ch);
      if (x >= 0) return { x, y };
    }
    return null;
  }

  function init() {
    for (const name of Object.keys(DATA)) warps[name] = {};
    for (const [door, { outer, inner }] of Object.entries(DOORS)) {
      const d = find(outer, door);
      const mat = find(inner, 'x');
      if (!d || !mat) continue;
      // step on the outdoor door -> appear just above the interior mat
      warps[outer][d.x + ',' + d.y] = { map: inner, x: mat.x, y: mat.y - 1, dir: 'up' };
      // step on the mat -> appear just below the outdoor door
      warps[inner][mat.x + ',' + mat.y] = { map: outer, x: d.x, y: d.y + 1, dir: 'down' };
    }
    for (const L of LINKS) {
      const a = find(L.a.map, L.a.ch), b = find(L.b.map, L.b.ch);
      if (!a || !b) continue;
      const f = OFF[L.dir], r = OFF[OPP[L.dir]];
      warps[L.a.map][a.x + ',' + a.y] = { map: L.b.map, x: b.x + f[0], y: b.y + f[1], dir: L.dir };
      warps[L.b.map][b.x + ',' + b.y] = { map: L.a.map, x: a.x + r[0], y: a.y + r[1], dir: OPP[L.dir] };
    }
  }

  function get(name) { return DATA[name]; }
  function tileAt(name, x, y) {
    const rows = DATA[name].rows;
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return '#';
    return rows[y][x];
  }
  function isSolid(name, x, y) { return SOLID.has(tileAt(name, x, y)); }
  function size(name) {
    const rows = DATA[name].rows;
    return { w: rows[0].length, h: rows.length };
  }
  function warpAt(name, x, y) { return warps[name] && warps[name][x + ',' + y] || null; }

  return { DATA, SOLID, DOORS, LINKS, init, get, tileAt, isSolid, isWater, size, warpAt, find };
})();
