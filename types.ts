

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum AppState {
  VIEWING = 'VIEWING',
  QUIZ = 'QUIZ',
}

export type GamePhase = 'welcome' | 'playing' | 'intermission' | 'gameover';

export type ShapeType = 
    | 'cuboid' 
    | 'cylinder' 
    | 'cone' 
    | 'sphere' 
    | 'pyramid' 
    | 'frustum' 
    | 'hemisphere' 
    | 'tri_prism' 
    | 'hex_prism';

export interface ShapeSpec {
  id: string;
  type: ShapeType;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  dims: { 
      width?: number, 
      height?: number, 
      depth?: number, 
      radius?: number, 
      radiusTop?: number, 
      radiusBottom?: number 
  };
  color: number;
}

export interface LabelSpec {
    text: string;
    position: { x: number, y: number, z: number };
    color?: string; // Hex string '#ffffff'
}

export interface DimensionSpec {
    start: { x: number, y: number, z: number };
    end: { x: number, y: number, z: number };
    offset: { x: number, y: number, z: number }; 
    text: string;
    color?: number;
}

export interface AngleSpec {
    origin: { x: number, y: number, z: number };
    vecA: { x: number, y: number, z: number }; 
    vecB: { x: number, y: number, z: number }; 
    text?: string;
    color?: number;
}

export interface ProblemStage {
    id: string;
    question: string;
    answer: number;
    unit: string;
    hint?: string;
}

export interface Problem {
    id: string;
    title: string;
    difficulty: number; 
    
    // Visuals
    shapes: ShapeSpec[];
    labels?: LabelSpec[]; 
    dimensions?: DimensionSpec[]; 
    angles?: AngleSpec[]; 
    
    // Logic
    isBoss?: boolean;
    bossType?: 'mini' | 'main';
    bossName?: string;
    bossAvatar?: string;
    bossMusicTheme?: string;
    bossHP?: number; // Added
    stages: ProblemStage[];
    
    // Rewards
    goldReward: number;
    dropTable?: ShopItem[];
}

export type ItemType = 'consumable' | 'passive' | 'cosmetic';

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    cost: number;
    icon: string; 
    effectId: string;
    rarity?: 'common' | 'rare' | 'legendary';
    maxLevel?: number; 
    costMultiplier?: number; 
}

export type PlayerAvatarId = 'elf' | 'elf_female' | 'snowman' | 'penguin';

export interface PlayerState {
    version?: number;
    isDeveloperMode?: boolean; 
    avatarId: PlayerAvatarId;
    level: number;
    highScore: number; // Highest level reached
    xp: number;
    gold: number;
    maxLives: number;
    lives: number;
    streak: number;
    difficultyRating: number;
    inventory: string[];
    
    // Passives are now a map of ID -> Level (number)
    activePassives: Record<string, number>;
    
    cosmetics: {
        hat: string;
        outfit: string;
    };
    stats: {
        toleranceMultiplier: number;
        measureSnap: number;
        baseTime: number;
        goldMultiplier: number;
        bossDamageMultiplier: number; 
    };
    settings: {
        masterVolume: number;
        bgmVolume: number;
        sfxVolume: number;
    };
    latestLoot?: string;
}

export interface QuizState {
  userAnswer: string;
  currentStageIndex: number;
  feedback: 'idle' | 'correct' | 'incorrect' | 'gameover' | 'timeout' | 'stage_complete' | 'streak_bonus' | 'level_complete';
  timeLeft: number;
  timerActive: boolean;
}