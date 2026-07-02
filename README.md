# Starry ☆ Little Days

A cozy Stardew-style life sim about a toddler girl named Starry — going to
school, splashing through swim class, twirling at ballet, making friends, and
collecting stickers in the little town of Starview Meadow. Hop the bus and the
whole of **Starbright City** opens up too: a library, a toy store, a bakery, a
carousel, a balloon cart, and a petting zoo.

Everything is generated in code: all pixel art is drawn procedurally on
canvas, and the entire soundtrack (7 original chiptune songs + sound effects)
is synthesized live with the Web Audio API. No images, no audio files, no
dependencies, no build step.

## How to run

Just open `index.html` in any modern browser — it works straight from disk:

```
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
  answer Ms. Bloom's letter, shape, and color questions.
- **Swim** (Splashy Swim Center) — Tuesday & Thursday, 1:00–4:00pm. Splash
  Dash: mash ← → to out-paddle the pace duck.
- **Ballet** (Twinkle Toes Studio) — Monday, Wednesday & Friday, 1:00–4:00pm.
  Waltz Steps: watch Madame Plié's routine, then repeat it with the arrows.
- **Weekends** — free play! Park, pond ducks, sweet shop, friends.

Classes earn **stars** (the currency) and **skill XP**. Spend stars at
Mr. Scoop's Sweets for energy treats, Ducky Snacks, and Critter Treats. Talk
to Luna, Mia, and Theo every day to fill friendship hearts. There are
**36 stickers** to collect, from "First Day!" to "City Pal". Progress saves
automatically when Starry goes to sleep.

Most little play activities — the carousel, swings, see-saw, hopscotch,
bubbles, fountain wishes and so on — give a **gold star** the first time you do
them each day (the carousel gives two!), and apples are a free energy snack. So
free-play days are worth filling with fun.

## Take the bus to Starbright City

A pink **bus stop** sits at the east end of Starview Meadow's main street —
walk onto it to ride to **Starbright City**, and walk onto the matching stop
there to ride home again. Around the city you can:

- **Read a story** with Miss Paige at the Storytime Library.
- **Play with the toys** at Tippy Top Toys (Mr. Bram's blocks go *click*).
- **Buy a bakery treat** — muffins, cozy cocoa, and twisty pretzels — from
  Mrs. Honey at the Honey Bun Bakery.
- **Ride the carousel**, grab a **balloon** from the cart, and **make a wish**
  at the plaza fountain.
- **Hop the sidewalk hopscotch**, **blow bubbles** at the bubble stand, and
  pump the **city swings**.
- **Make friends with Rosie**, the baker's granddaughter who lives by the
  carousel — fill her hearts for the "City Pal" sticker.
- **Feed the petting zoo** — Smudge, Cottonball, and Pepper love Critter
  Treats; feed all three for a sticker.

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

No tooling needed. The code is plain script-tag JavaScript: `audio.js`,
`sprites.js`, `maps.js`, `entities.js`, `minigames.js`, `ui.js`, `main.js`,
each exposing one global.

A headless data validator checks map geometry, warps, NPC schedules, song
note data, sprite templates, and sticker definitions:

```
node dev/check.js
```
