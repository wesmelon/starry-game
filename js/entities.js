/* ======================================================================
   Starry ☆ Little Days — entities.js
   NPCs, schedules, dialogue, ducks, stickers, shop stock, skill ladders.
   ====================================================================== */

const Entities = (() => {

  // where(): G is the live game state {day, hour, dow (0=Mon..6=Sun)}
  const NPCS = [
    {
      id: 'mom', name: 'Mom', sprite: 'mom', radius: 1.2,
      where: () => ({ map: 'home', x: 10, y: 5 }),
      talk: (G) => {
        if (G.hour < 9) {
          if (G.dow <= 4) return [`Good morning, sunshine! School starts at 9. ${G.dow === 1 || G.dow === 3 ? 'And swim class at 2!' : (G.dow === 0 || G.dow === 2 || G.dow === 4 ? 'And ballet at 2!' : '')}`,
            'Hold my hand crossing the path, okay? Just kidding — off you go!'];
          return ['No school today, sweet pea! Go play in the park, or say hi to the duckies.'];
        }
        if (G.hour >= 19) return ['Look at those sleepy eyes... bedtime soon, little star.', 'Your bed is all fluffed and ready.'];
        const lines = [
          ['Have fun out there! Mr. Scoop has strawberry cones today...'],
          ['I love you THIS much! *stretches arms*'],
          ['Did you make a new friend today? Tell me everything later!'],
        ];
        return lines[G.day % lines.length];
      },
    },
    {
      id: 'msbloom', name: 'Ms. Bloom', sprite: 'msbloom', radius: 1, teaches: 'school',
      freeGames: [{ game: 'math', label: 'Play Number Time' }],
      freeGamePrompt: 'Want to play a little number game?',
      where: () => ({ map: 'school', x: 5, y: 3 }),
      talk: () => ['Welcome to Sunny Sprouts! We sing, we count, we wiggle.',
                   'Did you know? Octopuses have THREE hearts. Wow!',
                   'A is for Apple, B is for... Bunny? Banana? Both!'],
    },
    {
      id: 'coach', name: 'Coach Finn', sprite: 'coach', radius: 1, teaches: 'swim',
      where: () => ({ map: 'pool', x: 16, y: 4 }),
      talk: () => ['Kick-kick-kick! That\'s the splashy spirit!',
                   'Never swim right after a big lunch of cookies. Coach rule #1!',
                   'The water says hello. Say hello back: SPLASH!'],
    },
    {
      id: 'madame', name: 'Madame Plié', sprite: 'madame', radius: 1.4, teaches: 'ballet',
      where: () => ({ map: 'ballet', x: 5, y: 3 }),
      talk: () => ['Chin up, little étoile. Even penguins can waltz.',
                   'One-two-three, one-two-three... do you hear the music?',
                   'A wobble is just a twirl that is still learning.'],
    },
    {
      id: 'mrscoop', name: 'Mr. Scoop', sprite: 'mrscoop', radius: 1, shop: true,
      shopName: 'Mr. Scoop', greeting: 'Hello hello, little Starry! What would you like?',
      stock: ['juice', 'icecream', 'cookie', 'duckfood', 'treats'],
      where: () => ({ map: 'shop', x: 5, y: 2 }),
      talk: () => [],
    },
    {
      id: 'luna', name: 'Luna', sprite: 'luna', radius: 1.2, friend: true,
      where: (G) => (G.dow <= 4 && G.hour < 13)
        ? { map: 'school', x: 8, y: 5 } : { map: 'town', x: 38, y: 24 },
      talk: () => ['I can write my whole name! L-U-N-A. It has a moon in it!',
                   'Ms. Bloom let me feed the class goldfish today!',
                   'Race you to the slide! Ready... set... waddle!'],
    },
    {
      id: 'mia', name: 'Mia', sprite: 'mia', radius: 1.2, friend: true,
      where: (G) => (G.hour >= 12 && G.hour < 19)
        ? { map: 'ballet', x: 10, y: 4 } : { map: 'town', x: 41, y: 24 },
      talk: () => ['Watch my twirl! Wooo... whoa... I sat down. On purpose!',
                   'My tutu is pink like a strawberry. Yours is pretty too!',
                   'Madame says I am a "petite étoile". That means little star!'],
    },
    {
      id: 'theo', name: 'Theo', sprite: 'theo', radius: 1.2, friend: true,
      where: (G) => (G.hour >= 12 && G.hour < 19)
        ? { map: 'pool', x: 16, y: 6 } : { map: 'town', x: 33, y: 25 },
      talk: () => ['I held my breath for THREE whole seconds. I counted!',
                   'Coach Finn says I splash like a champion.',
                   'Do fish ever get thirsty? I think about this a lot.'],
    },
    // ---- Starbright City folks ----
    {
      id: 'paige', name: 'Miss Paige', sprite: 'paige', radius: 0.8, story: true,
      shop: true, shopName: 'Miss Paige', stock: ['storybook'],
      greeting: 'Welcome to storytime! Shall we read together, or would you like a book of your very own?',
      where: () => ({ map: 'library', x: 5, y: 2 }),
      talk: () => ['Welcome to the library! Shhh... the books are napping.',
                   'A baby owl is called an owlet. Hoo-hoo!',
                   'Pick a comfy rug and we can read a story together.'],
    },
    {
      id: 'bram', name: 'Mr. Bram', sprite: 'bram', radius: 0.8,
      shop: true, shopName: 'Mr. Bram', stock: ['teddy', 'froggy', 'bball'],
      greeting: 'Welcome to Tippy Top Toys! Everything here squeaks, stacks, or bounces.',
      where: () => ({ map: 'toystore', x: 5, y: 2 }),
      talk: () => ['Welcome to Tippy Top Toys! Wind-up froggies on sale.',
                   'Press the blocks — they go CLICK. So satisfying.',
                   'Every toy here has had at least one good nap.'],
    },
    {
      id: 'honey', name: 'Mrs. Honey', sprite: 'honey', radius: 1, shop: true, bakery: true,
      shopName: 'Mrs. Honey', greeting: 'Fresh from the oven, little Starry! What smells good?',
      stock: ['muffin', 'cocoa', 'pretzel'],
      where: () => ({ map: 'cafe', x: 5, y: 1 }),
      talk: () => [],
    },
    {
      id: 'rosie', name: 'Rosie', sprite: 'rosie', radius: 1.2, friend: true,
      where: () => ({ map: 'city', x: 43, y: 30 }),
      talk: () => ['I live by the carousel! I can hear it go ding-ding all day.',
                   'Wanna share a balloon? You hold the string — I hold the air!',
                   'My grampa is the baker. I get FIRST muffin. Every single time.'],
    },
    // ---- weekend art class in town ----
    {
      id: 'doodle', name: 'Mr. Doodle', sprite: 'doodle', radius: 1, teaches: 'art',
      where: () => ({ map: 'art', x: 5, y: 5 }),
      talk: () => ['Welcome to the Rainbow Art Room! Smocks on, sleeves up!',
                   'There are no scribbles here. Only very fast rainbows.',
                   'Blue and yellow had a hug — and out came green!'],
    },
    // ---- Shelly Shores ----
    {
      id: 'sandy', name: 'Sandy', sprite: 'sandy', radius: 1.4, game: 'shells',
      gamePrompt: 'The tide washed in a WHOLE bunch of shells! Want to play Shell Splash?',
      where: () => ({ map: 'beach', x: 18, y: 8 }),
      talk: () => ['Welcome to Shelly Shores! The waves say whoosh, whoosh.',
                   'Look for pink shells — those are the luckiest ones!',
                   'Splash all you like, little star. Sandy is watching the water!'],
    },
    // ---- Sunny Hooves Farm ----
    {
      id: 'fern', name: 'Farmer Fern', sprite: 'fern', radius: 1.4, game: 'veggies',
      gamePrompt: 'The carrots are popping up all silly today! Help me with the Veggie Round-up?',
      where: () => ({ map: 'farm', x: 13, y: 11 }),
      talk: () => ['Morning, little sprout! Buttercup the pony loves visitors.',
                   'The carrots grew extra crunchy this year. Take one!',
                   'Daisy the cow is in the big red barn. She says moo. A LOT.'],
    },
  ];

  // little ducks paddling on the town lake
  const DUCKS = [
    { x: 8.5, y: 24.5, dir: 'left', t: 0 },
    { x: 12.5, y: 26.5, dir: 'right', t: 1.7 },
  ];
  const POND = { x0: 5.4, y0: 23.4, x1: 15.6, y1: 27.6 };

  // hungry little critters — each would love one treat a day. `map` says where
  // they live (town strays, plus the city petting zoo).
  const ANIMALS = [
    { id: 'cat', name: 'Mochi', kind: 'cat', map: 'town', x: 12.5, y: 9.7, sfx: 'meow',
      fed: 'Mochi purrs like a tiny warm motor. Prrrr.',
      happy: 'Mochi is full and happy, doing a big stretchy stretch.',
      hungry: 'Mochi the cat sniffs your pockets hopefully...' },
    { id: 'pup', name: 'Biscuit', kind: 'pup', map: 'town', x: 27.5, y: 18.5, sfx: 'woof',
      fed: 'Biscuit gobbles the treat and wags his whole body!',
      happy: 'Biscuit flops over for belly rubs. Best puppy.',
      hungry: 'Biscuit the puppy looks at you with big round eyes...' },
    { id: 'bunny', name: 'Clover', kind: 'bunny', map: 'town', x: 40.5, y: 25.0, sfx: 'squeak',
      fed: 'Clover nibbles so fast her little nose wiggles!',
      happy: 'Clover does a happy binky hop. Boing!',
      hungry: 'Clover the bunny thumps a foot. Snack please...' },
    { id: 'squirrel', name: 'Pip', kind: 'squirrel', map: 'town', x: 25.5, y: 27.5, sfx: 'squeak',
      fed: 'Pip stuffs the treat in his cheeks. Both cheeks!',
      happy: 'Pip is busy burying something. Very important work.',
      hungry: 'Pip the squirrel chitters and points at his tummy...' },
    { id: 'zoo_cat', name: 'Smudge', kind: 'cat', map: 'city', x: 10.5, y: 27.5, sfx: 'meow',
      fed: 'Smudge headbutts your hand. That means "more, please".',
      happy: 'Smudge is loafing in a sunbeam. A perfect little loaf.',
      hungry: 'Smudge the zoo cat blinks slowly at the treat bag...' },
    { id: 'zoo_bunny', name: 'Cottonball', kind: 'bunny', map: 'city', x: 8.5, y: 29.5, sfx: 'squeak',
      fed: 'Cottonball munches and does the happy ear-wiggle!',
      happy: 'Cottonball is a fluffy puddle of sleepy bunny.',
      hungry: 'Cottonball the zoo bunny hops over, nose twitching...' },
    { id: 'zoo_pup', name: 'Pepper', kind: 'pup', map: 'city', x: 11.5, y: 31.5, sfx: 'woof',
      fed: 'Pepper spins in a happy circle, then a second one!',
      happy: 'Pepper naps in the hay with all four paws twitching.',
      hungry: 'Pepper the zoo puppy bonks the fence with her nose...' },
    { id: 'crab', name: 'Snippy', kind: 'crab', map: 'beach', x: 10.5, y: 17.5, sfx: 'squeak',
      fed: 'Snippy does a sideways happy dance. Click click!',
      happy: 'Snippy is busy decorating his burrow with a shell.',
      hungry: 'Snippy the crab waves his little claws at the treat bag...' },
    { id: 'hen1', name: 'Peep', kind: 'chick', map: 'farm', x: 32.5, y: 14.5, sfx: 'squeak',
      fed: 'Peep pecks up every crumb, then cheeps a thank-you!',
      happy: 'Peep is snoozing in a warm, fluffy puddle of feathers.',
      hungry: 'Peep the chick hops in place. Cheep! Cheep! Snack?' },
    { id: 'hen2', name: 'Nugget', kind: 'chick', map: 'farm', x: 34.5, y: 16.5, sfx: 'squeak',
      fed: 'Nugget zooms in a circle — the famous full-tummy zoomies!',
      happy: 'Nugget found a sunbeam and is not leaving it.',
      hungry: 'Nugget the chick tilts her head at your pockets...' },
    { id: 'piglet', name: 'Wiggles', kind: 'pig', map: 'farm', x: 26.5, y: 22.5, sfx: 'squeak',
      fed: 'Wiggles munches happily and wiggles from nose to tail!',
      happy: 'Wiggles is rolling in the grass. Life is very good.',
      hungry: 'Wiggles the piglet sniffs the air hopefully. Oink?' },
    { id: 'barncat', name: 'Hazel', kind: 'cat', map: 'barn', x: 12.5, y: 6.0, sfx: 'meow',
      fed: 'Hazel purrs and curls up on the warmest hay bale.',
      happy: 'Hazel is keeping one sleepy eye on the whole barn.',
      hungry: 'Hazel the barn cat pads over, tail curled like a question mark...' },
  ];

  const STICKERS = [
    { id: 'firstday',  icon: 'block',  name: 'First Day!',       hint: 'Go to your first school class' },
    { id: 'abc',       icon: 'book',   name: 'Little Reader',    hint: 'Reach Letters level 3' },
    { id: 'scholar',   icon: 'crown',  name: 'Star Pupil',       hint: 'Reach Letters level 5' },
    { id: 'splash',    icon: 'drop',   name: 'First Splash',     hint: 'Take your first swim class' },
    { id: 'goldfish',  icon: 'fish',   name: 'Goldfish',         hint: 'Reach Swimming level 3' },
    { id: 'dolphin',   icon: 'medal',  name: 'Little Dolphin',   hint: 'Reach Swimming level 5' },
    { id: 'twirl',     icon: 'shoe',   name: 'First Twirl',      hint: 'Take your first ballet class' },
    { id: 'tutu',      icon: 'bow',    name: 'Tiny Tutu',        hint: 'Reach Ballet level 3' },
    { id: 'prima',     icon: 'star',   name: 'Prima Starrina',   hint: 'Reach Ballet level 5' },
    { id: 'bestie',    icon: 'heart',  name: 'Best Friends',     hint: "Fill up a friend's hearts" },
    { id: 'butterfly', icon: 'fly',    name: 'Social Butterfly', hint: 'Become friends with all three kids' },
    { id: 'sweet',     icon: 'cream',  name: 'Sweet Tooth',      hint: 'Enjoy a treat at the Sweet Shop' },
    { id: 'whee',      icon: 'sun',    name: 'Wheee!',           hint: 'Go down the playground slide' },
    { id: 'swing',     icon: 'swing',  name: 'Sky High',         hint: 'Play on the swings' },
    { id: 'ducky',     icon: 'duck',   name: 'Duck Friend',      hint: 'Feed the lake ducks (buy Ducky Snacks)' },
    { id: 'critters',  icon: 'paw',    name: 'Friend of Critters', hint: 'Feed all four little critters in one day' },
    { id: 'paddler',   icon: 'wave',   name: 'Little Paddler',   hint: 'Go for a swim in the lake all by yourself' },
    { id: 'zoom',      icon: 'bike',   name: 'Zoom Zoom!',       hint: 'Ride the little pink bike' },
    { id: 'stargazer', icon: 'moon',   name: 'Stargazer',        hint: 'Be outside under the stars after 8pm' },
    { id: 'melody',    icon: 'note',   name: 'Little Melody',    hint: 'Plink the studio piano' },
    { id: 'week',      icon: 'cookie', name: 'One Big Week',     hint: 'Play through seven days' },
    { id: 'apple',     icon: 'apple',  name: 'Apple Picker',     hint: 'Pick an apple from a tree' },
    { id: 'bouquet',   icon: 'bouquet',name: 'Flower Picker',    hint: 'Pick a little bouquet of flowers' },
    { id: 'castle',    icon: 'castle', name: 'Sandcastle',       hint: 'Build a sandcastle on the beach' },
    { id: 'seesaw',    icon: 'seesaw', name: 'Up and Down',      hint: 'Bounce on the park see-saw' },
    { id: 'wish',      icon: 'wish',   name: 'Make a Wish',      hint: 'Toss a wish into a fountain' },
    { id: 'citytrip',  icon: 'bus',    name: 'City Trip!',       hint: 'Ride the bus to Starbright City' },
    { id: 'carousel',  icon: 'carousel',name:'Round and Round',  hint: 'Ride the city carousel' },
    { id: 'balloon',   icon: 'balloon',name: 'Balloon!',         hint: 'Get a balloon from the cart' },
    { id: 'story',     icon: 'book',   name: 'Story Time',       hint: 'Read a story at the library' },
    { id: 'playtime',  icon: 'block',  name: 'Toy Time',         hint: 'Play with the toys at the toy store' },
    { id: 'baker',     icon: 'cookie', name: 'Fresh Baked',      hint: 'Enjoy a treat at the bakery' },
    { id: 'zoo',       icon: 'paw',    name: 'Petting Zoo',      hint: 'Feed all the petting-zoo animals' },
    { id: 'hop',       icon: 'hop',    name: 'Hopscotch',        hint: 'Hop the sidewalk hopscotch in the city' },
    { id: 'bubbles',   icon: 'bubbles',name: 'Bubbles!',         hint: 'Blow bubbles at the bubble stand' },
    { id: 'citypal',   icon: 'heart',  name: 'City Pal',         hint: "Fill up Rosie's friendship hearts" },
    { id: 'beachtrip', icon: 'wave',   name: 'Beach Day!',       hint: 'Ride the bus to Shelly Shores' },
    { id: 'shell',     icon: 'shell',  name: 'Shell Seeker',     hint: 'Find a pretty seashell on the beach' },
    { id: 'beachball', icon: 'ball',   name: 'Beach Ball Bop',   hint: 'Bounce the big beach ball' },
    { id: 'farmtrip',  icon: 'barn',   name: 'Farm Day!',        hint: 'Ride the bus to Sunny Hooves Farm' },
    { id: 'pony',      icon: 'pony',   name: 'Pony Pal',         hint: 'Ride Buttercup the pony' },
    { id: 'carrot',    icon: 'carrot', name: 'Crunchy Carrot',   hint: 'Pull a carrot from the veggie patch' },
    { id: 'moo',       icon: 'cow',    name: 'Big Moo!',         hint: 'Say hello to Daisy in the big red barn' },
    { id: 'barnpals',  icon: 'paw',    name: 'Barn Buddies',     hint: 'Feed all the farm friends in one day' },
    { id: 'mytoy',     icon: 'teddy',  name: 'My Very Own Toy',  hint: 'Buy a toy to take home' },
    { id: 'painter',   icon: 'palette',name: 'Little Painter',   hint: 'Go to your first art class' },
    { id: 'rainbow',   icon: 'rainbow',name: 'Rainbow Maker',    hint: 'Reach Painting level 3' },
    { id: 'artist',    icon: 'medal',  name: 'Starry the Artist',hint: 'Reach Painting level 5' },
  ];

  const SHOP_ITEMS = [
    { id: 'juice',    name: 'Apple Juice',     cost: 2, energy: 25, line: 'Glug glug glug... ahh!' },
    { id: 'icecream', name: 'Strawberry Cone', cost: 3, energy: 40, line: 'Cold nose! Happy tummy!' },
    { id: 'cookie',   name: 'Star Cookie',     cost: 5, energy: 60, line: 'It tastes like a crunchy star!' },
    { id: 'duckfood', name: 'Ducky Snacks',    cost: 2, duckFood: true, line: 'The duckies will love these!' },
    { id: 'treats',   name: 'Critter Treats',  cost: 2, treats: true, line: 'Crunchy treats for furry friends!' },
    { id: 'muffin',   name: 'Blueberry Muffin',cost: 3, energy: 45, line: 'Muffin top first — that\'s the rule!' },
    { id: 'cocoa',    name: 'Cozy Cocoa',      cost: 2, energy: 30, line: 'Warm and chocolaty all the way down!' },
    { id: 'pretzel',  name: 'Twisty Pretzel',  cost: 4, energy: 55, line: 'Twisty and salty and SO good!' },
    // toys go home with Starry and wait in her room (each one is bought once)
    { id: 'teddy',    name: 'Huggy Teddy',     cost: 8, toy: true, line: 'So soft! Teddy needs a name... and a hug. Mostly a hug.' },
    { id: 'froggy',   name: 'Wind-up Froggy',  cost: 6, toy: true, line: 'Boing! Boing! Froggy hops all by himself!' },
    { id: 'bball',    name: 'Bouncy Ball',     cost: 5, toy: true, line: 'It bounces higher than Starry\'s head!' },
    { id: 'storybook',name: 'Picture Book',    cost: 6, toy: true, line: 'A book about a brave little bunny. Again! Again!' },
  ];

  const SKILLS = {
    letters: { label: 'Letters', titles: ['Doodler', 'ABC Singer', 'Word Wizkid', 'Story Lover', 'Reading Star'] },
    swim:    { label: 'Swimming', titles: ['Tadpole', 'Splasher', 'Goldfish', 'Flying Fish', 'Little Dolphin'] },
    ballet:  { label: 'Ballet', titles: ['Wobbler', 'Twinkle Toes', 'Twirler', 'Grand Jeté', 'Prima Starrina'] },
    art:     { label: 'Painting', titles: ['Scribbler', 'Crayon Kid', 'Rainbow Maker', 'Color Mixer', 'Little Artist'] },
  };
  const LEVEL_XP = [0, 2, 5, 9, 14]; // xp needed for levels 1..5
  function skillLevel(xp) {
    let lvl = 1;
    for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lvl = i + 1;
    return lvl;
  }

  const FRIEND_MAX = 150; // 5 hearts x 30

  return { NPCS, DUCKS, POND, ANIMALS, STICKERS, SHOP_ITEMS, SKILLS, LEVEL_XP, skillLevel, FRIEND_MAX };
})();
