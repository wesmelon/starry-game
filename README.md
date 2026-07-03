# Starry ☆ Little Days

A cozy Stardew-style life sim about a toddler girl named Starry — going to
school, splashing through swim class, twirling at ballet, painting at art
class, making friends, and collecting stickers in the little town of
Starview Meadow. Hop a bus and three more places open up: **Starbright
City** (library, toy store, bakery, carousel, petting zoo), **Shelly
Shores** (a sunny beach with shells, palm trees, and a crab named Snippy),
and **Sunny Hooves Farm** (a pony, chickens, a piglet, and Daisy the cow in
her big red barn).

Everything is generated in code: all pixel art is drawn procedurally on
canvas, and the entire soundtrack (7 original chiptune songs + sound effects)
is synthesized live with the Web Audio API. No images, no audio files, no
runtime dependencies — the game is written in TypeScript and ships as a
single bundled script.

## How to run

Build once, then open `index.html` in any modern browser — it works
straight from disk:

```
npm install
npm run build

# Linux
xdg-open index.html

# macOS
open index.html

# Windows / WSL
explorer.exe index.html
```

Or serve it if you prefer:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Press any key on the title screen to start (this also unlocks the audio —
browsers require a key press before sound can play).

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Walk (or swim, or pedal) |
| E / Enter / Space | Talk, interact, feed, hop on/off the bike |
| B | Sticker book |
| J | Journal (skills & friendship hearts) |
| M | Town map (see where Starry is) |
| N | Toggle music |
| Esc | Close menus |

## A day in Starview Meadow

The clock runs from 7:00am to 10:00pm (1 real second = 2 game minutes), then
Starry falls asleep and a new day begins. Days follow a weekly schedule:

- **School** (Sunny Sprouts School) — weekdays, 8:00–11:30am. Letter Time:
  answer Ms. Bloom's letter, shape, and color questions. Ms. Bloom also
  offers **Number Time**, a simple math minigame, whenever you visit school.
- **Swim** (Splashy Swim Center) — Tuesday & Thursday, 1:00–4:00pm. Splash
  Dash: mash ← → to out-paddle the pace duck.
- **Ballet** (Twinkle Toes Studio) — Monday, Wednesday & Friday, 1:00–4:00pm.
  Waltz Steps: watch Madame Plié's routine, then repeat it with the arrows.
- **Art** (Rainbow Art Room, by the town square) — Saturday & Sunday,
  9:00–11:30am. Painting Time: answer Mr. Doodle's color questions
  (what do red and yellow make?).
- **Any day** — Sandy on the beach hosts **Shell Splash** (catch falling
  shells in a bucket) and Farmer Fern hosts **Veggie Round-up** (pick the
  carrots before they wiggle away). Each pays stars once a day.

Classes earn **stars** (the currency) and **skill XP**. Spend stars at
Mr. Scoop's Sweets for energy treats, Ducky Snacks, and Critter Treats. Talk
to Luna, Mia, and Theo every day to fill friendship hearts. There are
**48 stickers** to collect, from "First Day!" to "Big Moo!". Progress saves
automatically when Starry goes to sleep — and she can climb into bed any
time to nap, or to sleep the rest of the day away and start a fresh one.

Most little play activities — the carousel, swings, see-saw, hopscotch,
bubbles, fountain wishes and so on — give a **gold star** the first time you do
them each day (the carousel and pony give two!), and apples and carrots are
free energy snacks. So free-play afternoons are worth filling with fun. The
slide, swings, see-saw, carousel, hopscotch, and pony each play a **little
animation** — Starry actually clambers up the ladder, pumps the swing, and
trots around the paddock.

## Take the bus!

Three bus stops connect Starview Meadow to the wider world — walk onto a
stop to ride, and onto the matching stop to ride home again:

- The **blue stop** at the east end of main street goes to **Starbright
  City**.
- The **teal stop** on the town square goes to **Shelly Shores** beach.
- The **green stop** at the west end of main street goes to **Sunny Hooves
  Farm**.

### Starbright City

- **Read a story** with Miss Paige at the Storytime Library — or buy a
  **picture book** of Starry's very own.
- **Buy toys** at Tippy Top Toys: a huggy teddy, a wind-up froggy, a bouncy
  ball. Every toy you bring home appears on Starry's bedroom floor.
- **Buy a bakery treat** — muffins, cozy cocoa, and twisty pretzels — from
  Mrs. Honey at the Honey Bun Bakery.
- **Ride the carousel**, grab a **balloon** from the cart, play **Balloon
  Bop**, and **make a wish** at the plaza fountain.
- **Hop the sidewalk hopscotch**, play **Hopscotch Hero**, **blow bubbles**
  at the bubble stand, play **Bubble Pop**, and pump the **city swings**.
- **Make friends with Rosie**, the baker's granddaughter who lives by the
  carousel — fill her hearts for the "City Pal" sticker.
- **Feed the petting zoo** — Smudge, Cottonball, and Pepper love Critter
  Treats; feed all three for a sticker.

### Shelly Shores

- **Play Shell Splash** with Sandy the lifeguard.
- **Collect seashells**, **bop the beach ball**, **build a sandcastle**, and
  swim in the sea (after swim class, of course).
- **Feed Snippy the crab** — he does a sideways happy dance.

### Sunny Hooves Farm

- **Ride Buttercup the pony** in her paddock (two gold stars, like the
  carousel!).
- **Play Veggie Round-up** with Farmer Fern, and **pull a crunchy carrot**
  from the veggie patch for free energy.
- **Say hello to Daisy the cow** in the big red barn — moo!
- **Feed the farm friends** — Peep, Nugget, and Wiggles the piglet (and
  Hazel the barn cat) — feed all three yard critters for a sticker.

## Little things to do around town

Beyond the classes, Starview Meadow is full of toddler-sized fun:

- **Pick apples** from the apple trees and **pick flowers** from the garden
  patches (both towns have them).
- **Build a sandcastle** on the lake beach.
- **Bounce on the see-saw**, zoom down the slide, and pump the swings in
  Sunnybank Park.
- **Make a wish** at the town-square fountain.

## Around town

- **Ride the bike** — Starry's pink bike is parked beside the house. Press E
  next to it to hop on and zoom around town (it politely waits outside
  buildings, and Mom parks it back home each morning).
- **Go swimming** — once Starry has taken a swim class, she can paddle in the
  town lake (and the swim center pool). Before that, the water says no.
- **Feed the critters** — Mochi the cat, Biscuit the puppy, Clover the bunny,
  and Pip the squirrel live around town and show a little thought bubble when
  they're hungry. Buy Critter Treats at the sweet shop; feed all four in one
  day for a sticker. The lake ducks still love their Ducky Snacks.
- **Read the signs** — every building has a signpost out front (an apple for
  school, a water drop for the pool, a bow for the ballet studio, an ice
  cream cone for the sweet shop) — press E to have Starry read it.

## Soundtrack

| Song | Where | Feel |
| --- | --- | --- |
| Starview Meadow | Town, daytime | Sunny C-major stroll |
| Downtown Skip | Starbright City, daytime | Busy, marching D-major |
| Pillow Stars | Home | Music-box lullaby |
| Crayon March | School | Bouncy staccato march |
| Bubble Float | Pool | Dreamy and weightless |
| Petite Étoile | Ballet studio | A-minor waltz in 3/4 |
| Sprinkle Rag | Sweet shop | Cheery little rag |
| Night Lights | Town after dark / day's end | Soft and starry |

## Development

The game is strict-mode TypeScript in `src/` — `audio.ts`, `sprites.ts`,
`maps.ts`, `entities.ts`, `minigames.ts`, `ui.ts`, `main.ts`, plus shared
types in `types.ts`. esbuild bundles `src/main.ts` into `dist/game.js`,
which is the only script `index.html` loads.

```
npm run build       # typecheck (tsc --noEmit) + bundle
npm run watch       # rebuild the bundle on every save
npm run typecheck   # types only
npm run check       # build, then run both validators below
```

Two headless validators run against the built bundle (no browser needed):

- `node dev/check.js` — data checks: map geometry, warps, NPC schedules,
  song note data, sprite templates, sticker definitions.
- `node dev/smoke.js` — boots the whole game with a stubbed canvas, plays
  every minigame to completion, and mashes keys in the live game loop.
