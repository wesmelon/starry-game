/* ======================================================================
   Starry ☆ Little Days — types.ts
   Shared domain types used across the game's modules.
   ====================================================================== */

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Action = Dir | 'action' | 'back';

/** Read-only view of the day handed to NPC schedules and dialogue. */
export interface GView {
  day: number;
  dow: number;      // 0 = Monday .. 6 = Sunday
  hour: number;
  tmin: number;
  stars: number;
  energy: number;
  skills: Record<string, number>;
  hearts: Record<string, number>;
  stickers: string[];
  duckFood: number;
  treats: number;
}

export interface NpcLocation { map: string; x: number; y: number; }

export interface FreeGameRef { game: string; label?: string; }

export interface Npc {
  id: string;
  name: string;
  sprite: string;
  radius: number;
  where: (g: GView) => NpcLocation;
  talk: (g: GView) => string[];
  /** class type in CLASS_INFO this NPC teaches */
  teaches?: string;
  friend?: boolean;
  story?: boolean;
  shop?: boolean;
  shopName?: string;
  greeting?: string;
  stock?: string[];
  bakery?: boolean;
  /** a single just-for-fun minigame this NPC hosts */
  game?: string;
  gamePrompt?: string;
  /** extra minigames offered alongside talking / class */
  freeGames?: FreeGameRef[];
  freeGamePrompt?: string;
}

export interface Animal {
  id: string;
  name: string;
  kind: string;
  map: string;
  x: number;
  y: number;
  sfx: string;
  fed: string;
  happy: string;
  hungry: string;
}

export interface Duck { x: number; y: number; dir: Dir; t: number; }

export interface Sticker { id: string; icon: string; name: string; hint: string; }

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  energy?: number;
  duckFood?: boolean;
  treats?: boolean;
  toy?: boolean;
  line: string;
}

export interface SkillDef { label: string; titles: string[]; }

export interface MapData {
  label: string;
  base: string;
  outdoor?: boolean;
  music: string;
  rows: string[];
}

export interface Warp { map: string; x: number; y: number; dir: Dir; }

export type MinigameInputMode = 'actions' | 'letters';

/** What the game loop needs from a running minigame. */
export interface Minigame {
  inputMode?: MinigameInputMode;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  key(act: string): void;
}
export type MinigameDone = (stars: number, perfect: boolean) => void;
