/* ======================================================================
   Starry ☆ Little Days — minigame registry
   ====================================================================== */

import { ArtMinigame } from './minigames/art';
import { BalletMinigame } from './minigames/ballet';
import { BalloonBopMinigame } from './minigames/balloonbop';
import { BubblePopMinigame } from './minigames/bubblepop';
import { CookieHelperMinigame } from './minigames/cookiehelper';
import { HopscotchMinigame, HOPSCOTCH_LETTERS } from './minigames/hopscotch';
import { MathMinigame } from './minigames/math';
import { RollerLabMinigame } from './minigames/rollerlab';
import { SchoolMinigame } from './minigames/school';
import { ShellsMinigame } from './minigames/shells';
import { StampStudioMinigame } from './minigames/stampstudio';
import { SwimMinigame } from './minigames/swim';
import { VeggiesMinigame } from './minigames/veggies';
import { BaseMinigame, ChoiceQuizMinigame, type Minigame, type MinigameCtor, type MinigameDone, type MinigameMeta, type MinigameMetaInput } from './minigames/shared';

export type { MinigameMeta, MinigameMetaInput } from './minigames/shared';

export const Minigames = (() => {
  const registry: Record<string, MinigameCtor> = {};
  const metas: Record<string, MinigameMeta> = {};
  const api: Record<string, any> = {
    create(name: string, done: MinigameDone): Minigame {
      const Ctor = registry[name];
      if (!Ctor) throw new Error('Unknown minigame: ' + name);
      return new Ctor(done);
    },
    /** Register a game and its metadata. This is the single integration
        point: launchers get the economics from meta(), and dev/smoke.js
        automatically plays every registered game using meta().keys. */
    register(name: string, Ctor: MinigameCtor, meta: MinigameMetaInput) {
      registry[name] = Ctor;
      metas[name] = { energy: 12, minutes: 40, minEnergy: 15, ...meta };
      api[name] = (done: MinigameDone) => new Ctor(done);
    },
    meta(name: string): MinigameMeta | undefined { return metas[name]; },
    types() { return Object.keys(registry); },
    BaseMinigame,
    ChoiceQuizMinigame,
  };

  // classes (launched on a schedule via CLASS_INFO in main.ts — their
  // energy/minutes here only apply if something launches them as fun games)
  api.register('school', SchoolMinigame, {
    label: 'Letter Time', keys: ['left', 'right', 'action'],
    description: "Ms. Bloom's letter, shape, and color questions.",
  });
  api.register('swim', SwimMinigame, {
    label: 'Splash Dash', keys: ['left', 'right'],
    description: 'Paddle ← → one after the other and out-swim the pace duck.',
  });
  api.register('ballet', BalletMinigame, {
    label: 'Waltz Steps', keys: ['up', 'down', 'left', 'right'],
    description: "Watch Madame Plié's routine, then repeat it with the arrows.",
  });
  api.register('art', ArtMinigame, {
    label: 'Painting Time', keys: ['left', 'right', 'action'],
    description: "Mr. Doodle's color-mixing questions.",
  });

  // just-for-fun games (launched by NPCs, freeGames lists, or tiles)
  api.register('math', MathMinigame, {
    label: 'Number Time', energy: 0, minutes: 20, minEnergy: 0,
    keys: ['left', 'right', 'action'],
    description: 'Counting, adding, and taking away with little fruit rows.',
  });
  api.register('stampstudio', StampStudioMinigame, {
    label: 'Stamp Studio', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['up', 'down', 'left', 'right', 'action'],
    description: 'Match Mr. Doodle\'s requested colored shape stamp.',
  });
  api.register('cookiehelper', CookieHelperMinigame, {
    label: 'Cookie Helper', energy: 6, minutes: 20, minEnergy: 5,
    keys: ['left', 'right', 'action'],
    description: 'Decorate warm bakery cookies with Mrs. Honey by matching toppings.',
  });
  api.register('rollerlab', RollerLabMinigame, {
    label: 'Roller Lab', energy: 10, minutes: 35, minEnergy: 10,
    keys: ['left', 'right', 'up', 'down', 'action'],
    description: 'Roll a cute gravity-pulled marble through six floor mazes with bounce pads and push boxes, or build and test a tiny custom map.',
  });
  api.register('shells', ShellsMinigame, {
    label: 'Shell Splash', keys: ['left', 'right'],
    description: 'Catch the falling shells in a bucket, three lanes.',
  });
  api.register('veggies', VeggiesMinigame, {
    label: 'Veggie Round-up', keys: ['up', 'down', 'left', 'right'],
    description: 'Pick each popped carrot with the matching arrow; carrots stay up until picked.',
  });
  api.register('bubblepop', BubblePopMinigame, {
    label: 'Bubble Pop', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['left', 'right', 'action'],
    description: 'Slide under rising bubbles and pop them with E.',
  });
  api.register('balloonbop', BalloonBopMinigame, {
    label: 'Balloon Bop', energy: 8, minutes: 25, minEnergy: 10,
    keys: ['up', 'down', 'left', 'right'],
    description: 'Each balloon shows an arrow — press it before it floats off.',
  });
  api.register('hopscotch', HopscotchMinigame, {
    label: 'Hopscotch Hero', energy: 8, minutes: 25, minEnergy: 10,
    keys: HOPSCOTCH_LETTERS,
    description: 'Hop the chalk course by matching each alphabet letter at your own pace.',
  });

  return api;
})();
