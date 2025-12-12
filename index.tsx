/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VOXEL WORKSHOP - FULL MONOLITH BUNDLE
 * Contains all logic for GitHub Pages compatibility.
*/

import React, { Component, ErrorInfo, useReducer, useEffect, useRef, useState, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { 
    Ruler, Calculator, Heart, BookOpen, RefreshCw, ShoppingBag, 
    Wand2, ChevronDown, ChevronUp, Clock, Skull, ArrowRight, 
    Settings, Play, ChevronRight, ChevronLeft, Lock, Unlock, 
    Coins, Trophy, X, Volume2, Music, Speaker, Check, Filter 
} from 'lucide-react';

// ==========================================
// 1. TYPES
// ==========================================

export enum AppState {
  VIEWING = 'VIEWING',
  QUIZ = 'QUIZ',
}

export type GamePhase = 'welcome' | 'playing' | 'intermission' | 'gameover';

export type ShapeType = 
    | 'cuboid' | 'cylinder' | 'cone' | 'sphere' | 'pyramid' 
    | 'frustum' | 'hemisphere' | 'tri_prism' | 'hex_prism';

export interface ShapeSpec {
  id: string;
  type: ShapeType;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  dims: { width?: number, height?: number, depth?: number, radius?: number, radiusTop?: number, radiusBottom?: number };
  color: number;
}

export interface LabelSpec {
    text: string;
    position: { x: number, y: number, z: number };
    color?: string;
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
    shapes: ShapeSpec[];
    labels?: LabelSpec[]; 
    dimensions?: DimensionSpec[]; 
    angles?: AngleSpec[]; 
    isBoss?: boolean;
    bossType?: 'mini' | 'main';
    bossName?: string;
    bossAvatar?: string;
    bossMusicTheme?: string;
    bossHP?: number;
    stages: ProblemStage[];
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
    highScore: number;
    xp: number;
    gold: number;
    maxLives: number;
    lives: number;
    streak: number;
    difficultyRating: number;
    inventory: string[];
    activePassives: Record<string, number>;
    cosmetics: { hat: string; outfit: string; };
    stats: { toleranceMultiplier: number; measureSnap: number; baseTime: number; goldMultiplier: number; bossDamageMultiplier: number; };
    settings: { masterVolume: number; bgmVolume: number; sfxVolume: number; };
    latestLoot?: string;
}

export interface QuizState {
  userAnswer: string;
  currentStageIndex: number;
  feedback: 'idle' | 'correct' | 'incorrect' | 'gameover' | 'timeout' | 'stage_complete' | 'streak_bonus' | 'level_complete';
  timeLeft: number;
  timerActive: boolean;
}

// ==========================================
// 2. CONSTANTS
// ==========================================

export const COLORS = {
  background: 0x0f172a,
  gridPrimary: 0x334155, 
  gridSecondary: 0x1e293b,
  presents: [0xdc2626, 0x16a34a, 0xca8a04, 0x2563eb, 0xffffff],
  shapeLine: 0xffffff,
  measurePoint: 0xfacc15,
  measureLine: 0xfca5a5,
  snow: 0xffffff,
};

export const CONFIG = {
  FLOOR_Y: -0.1,
};

export const FORMULAS = [
    { name: "Cuboid (Prism)", volume: "V = l × w × h", sa: "A = 2(lw + lh + wh)" },
    { name: "Cylinder", volume: "V = πr²h", sa: "A = 2πrh + 2πr²" },
    { name: "Cone", volume: "V = (1/3)πr²h", sa: "A = πr(r + √(h² + r²))" },
    { name: "Pyramid (Square Based)", volume: "V = (1/3)b²h", sa: "A = b² + 2b × slant_height" },
    { name: "Sphere", volume: "V = (4/3)πr³", sa: "A = 4πr²" }
];

// ==========================================
// 3. AUDIO
// ==========================================

declare class Howl { constructor(o:any); play(id?:number):number; stop(id?:number):void; fade(f:number,t:number,d:number,id:number):void; volume(v:number,id?:number):number; rate(r:number,id?:number):void; stereo(p:number,id?:number):void; loop(l:boolean,id?:number):void; once(e:string,c:()=>void,id?:number):void; playing(id?:number):boolean; }
declare const Howler: { volume(v:number):void; mute(m:boolean):void; ctx:AudioContext; autoUnlock:boolean; };

export interface SoundConfig {
    src: string[];
    volume?: number;
    loop?: boolean;
    html5?: boolean;
}
export type AudioManifest = Record<string, SoundConfig>;

class AudioManager {
    private sounds: Map<string, Howl> = new Map();
    private currentMusicId: number | null = null;
    private currentMusicName: string | null = null;
    private pendingMusic: string | null = null;
    private masterVol: number = 0.6;
    private musicVol: number = 0.8;
    private sfxVol: number = 1.0;
    private isMuted: boolean = false;
    private isLoaded: boolean = false;

    constructor() {
        if (typeof Howler !== 'undefined') Howler.autoUnlock = true;
    }
    
    public resume() {
        if (typeof Howler !== 'undefined' && Howler.ctx) {
            if (Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => this.checkMusicHealth());
            } else {
                this.checkMusicHealth();
            }
        }
    }
    
    private checkMusicHealth() {
        if (this.currentMusicName && this.currentMusicId !== null) {
            const sound = this.sounds.get(this.currentMusicName);
            if (sound && !sound.playing(this.currentMusicId)) {
                const vol = this.musicVol * this.masterVol;
                this.currentMusicId = sound.play();
                sound.volume(vol, this.currentMusicId);
                sound.loop(true, this.currentMusicId);
            }
        }
    }

    public async load(manifest: AudioManifest): Promise<void> {
        if (this.isLoaded) return;
        if (typeof Howl === 'undefined') return;

        const promises = Object.entries(manifest).map(([key, config]) => {
            return new Promise<void>((resolve) => {
                const sound = new Howl({
                    src: config.src,
                    volume: config.volume ?? 1.0,
                    loop: config.loop ?? false,
                    html5: config.html5 ?? false,
                    preload: true,
                    onload: () => resolve(),
                    onloaderror: () => resolve()
                });
                this.sounds.set(key, sound);
            });
        });

        await Promise.all(promises);
        this.isLoaded = true;
        if (this.pendingMusic) {
            this.playBGM(this.pendingMusic);
            this.pendingMusic = null;
        }
    }

    public playSFX(name: string, options?: { volume?: number, rate?: number, pan?: number, variance?: number }) {
        if (this.isMuted || !this.isLoaded) return;
        const sound = this.sounds.get(name);
        if (!sound) return;

        const id = sound.play();
        const vol = (options?.volume ?? 1.0) * this.sfxVol * this.masterVol;
        sound.volume(vol, id);
        if (options?.pan) sound.stereo(options.pan, id);
        let rate = options?.rate ?? 1.0;
        if (options?.variance) rate += (Math.random() * options.variance * 2) - options.variance;
        sound.rate(rate, id);
    }

    public playBGM(name: string, fadeDuration: number = 1500) {
        this.resume();
        if (!this.isLoaded) { this.pendingMusic = name; return; }
        
        if (this.currentMusicName === name) {
            const currentSound = this.sounds.get(name);
            if (currentSound && this.currentMusicId !== null && currentSound.playing(this.currentMusicId)) return;
        }

        if (this.currentMusicName && this.currentMusicName !== name) {
            const oldSound = this.sounds.get(this.currentMusicName);
            const oldId = this.currentMusicId;
            if (oldSound && oldId !== null) {
                if (oldSound.playing(oldId)) {
                    oldSound.fade(oldSound.volume(oldId), 0, fadeDuration, oldId);
                    oldSound.once('fade', () => oldSound.stop(oldId), oldId);
                } else {
                    oldSound.stop(oldId);
                }
            }
        }

        const newSound = this.sounds.get(name);
        if (!newSound) { this.currentMusicName = null; return; }

        this.currentMusicName = name;
        const targetVol = this.musicVol * this.masterVol;
        this.currentMusicId = newSound.play();
        newSound.volume(0, this.currentMusicId);
        newSound.loop(true, this.currentMusicId);
        newSound.fade(0, targetVol, fadeDuration, this.currentMusicId);
    }

    public stopBGM(fadeDuration: number = 500) {
        if (!this.currentMusicName || this.currentMusicId === null) return;
        const sound = this.sounds.get(this.currentMusicName);
        if (sound) {
            sound.fade(sound.volume(this.currentMusicId), 0, fadeDuration, this.currentMusicId);
            sound.once('fade', () => sound.stop(this.currentMusicId!), this.currentMusicId);
        }
        this.currentMusicName = null;
        this.currentMusicId = null;
        this.pendingMusic = null;
    }

    public setVolumes(master: number, music: number, sfx: number) {
        this.masterVol = master;
        this.musicVol = music;
        this.sfxVol = sfx;
        if (typeof Howler !== 'undefined') Howler.volume(this.masterVol);
        if (this.currentMusicName && this.currentMusicId !== null) {
            const sound = this.sounds.get(this.currentMusicName);
            if (sound) sound.volume(this.musicVol * this.masterVol, this.currentMusicId);
        }
    }
}

export const audio = new AudioManager();

export const AUDIO_MANIFEST: AudioManifest = {
    'ui_click':    { src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.2 },
    'ui_open':     { src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'], volume: 0.3 },
    'ui_close':    { src: ['https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'], volume: 0.3 },
    'buy':         { src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.5 },
    'snap':        { src: ['https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3'], volume: 0.2 },
    'correct':     { src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.5 },
    'level_up':    { src: ['https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'], volume: 0.6 },
    'victory_boss': { src: ['https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3'], volume: 0.7 }, 
    'wrong':       { src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], volume: 0.5 },
    'gameover_sfx':{ src: ['https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'], volume: 0.8 },
    'damage_take': { src: ['https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3'], volume: 1.0 },
    'damage_boss': { src: ['https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'], volume: 0.8 },
    'clock_tick':  { src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.6 }, 
    'bgm_workshop': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dance%20of%20the%20Sugar%20Plum%20Fairy.mp3'], loop: true, html5: true, volume: 0.6 },
    'bgm_summer': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'], loop: true, html5: true, volume: 0.6 },
    'bgm_nutcracker': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crusade.mp3'], loop: true, html5: true, volume: 0.7 },
    'bgm_krampus': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3'], loop: true, html5: true, volume: 0.8 },
    'bgm_mecha': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Moorland.mp3'], loop: true, html5: true, volume: 0.7 },
    'bgm_miniboss': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3'], loop: true, html5: true, volume: 0.7 },
    'bgm_boss': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3'], loop: true, html5: true, volume: 0.7 },
    'bgm_gameover': { src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Virtutes%20Instrumenti.mp3'], loop: true, html5: true, volume: 0.5 }
};

// ==========================================
// 4. CONTENT GENERATORS
// ==========================================

export const SHOP_ITEMS: ShopItem[] = [
    { id: 'cookie', name: 'Gingerbread', description: 'Heal 1 Heart', type: 'consumable', cost: 50, icon: '🍪', effectId: 'heal', rarity: 'common' },
    { id: 'snowglobe', name: 'Snow Globe', description: 'Skip Level (or Hit Boss)', type: 'consumable', cost: 150, icon: '🔮', effectId: 'skip', rarity: 'rare' },
    { id: 'bomb', name: 'Cherry Bomb', description: 'Damage Boss', type: 'consumable', cost: 200, icon: '💣', effectId: 'bomb', rarity: 'rare' },
    { id: 'heart_plus', name: 'Heart Container', description: '+1 Max Life', type: 'passive', cost: 150, icon: '❤️', effectId: 'heart_boost', maxLevel: 3, costMultiplier: 2.0 },
    { id: 'pencil', name: 'Sharp Pencil', description: '+Boss Damage', type: 'passive', cost: 120, icon: '✏️', effectId: 'damage_boost', maxLevel: 5, costMultiplier: 1.5 },
    { id: 'stopwatch', name: 'Frosty Watch', description: '+Max Time', type: 'passive', cost: 80, icon: '⏱️', effectId: 'time_boost', maxLevel: 5, costMultiplier: 1.4 },
    { id: 'sack', name: 'Magic Sack', description: '+Gold Gain', type: 'passive', cost: 200, icon: '💰', effectId: 'gold_boost', maxLevel: 5, costMultiplier: 1.6 },
    { id: 'hat_santa', name: 'Santa Hat', description: 'Classic Red', type: 'cosmetic', cost: 300, icon: '🎅', effectId: 'hat_santa' },
    { id: 'hat_blue', name: 'Frozen Cap', description: 'Icy Blue', type: 'cosmetic', cost: 300, icon: '🧢', effectId: 'hat_blue' },
    { id: 'tunic_green', name: 'Elf Tunic', description: 'Traditional', type: 'cosmetic', cost: 250, icon: '👕', effectId: 'tunic_green' },
    { id: 'tunic_red', name: 'Santa Suit', description: 'Festive Red', type: 'cosmetic', cost: 350, icon: '🧥', effectId: 'tunic_red' },
    { id: 'tunic_blue', name: 'Glacier Tunic', description: 'Icy Cool', type: 'cosmetic', cost: 350, icon: '❄️', effectId: 'tunic_blue' },
];

const BOSS_LOOT: ShopItem[] = [
    { id: 'crown_ice', name: 'Ice Crown', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '👑', effectId: 'hat_ice', rarity: 'legendary' },
    { id: 'antlers', name: 'Reindeer Antlers', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '🦌', effectId: 'hat_antlers', rarity: 'legendary' },
    { id: 'monocle_gold', name: 'Golden Monocle', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '🧐', effectId: 'hat_monocle', rarity: 'rare' },
    { id: 'protractor', name: 'The Protractor', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '📐', effectId: 'hat_geo', rarity: 'legendary' }
];

const createId = () => Math.random().toString(36).substring(7);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const toDeg = (rad: number) => rad * (180 / Math.PI);
const toRad = (deg: number) => deg * (Math.PI / 180);

const SimpleCube = (diff: number): Problem => {
    const s = randInt(3, 8 + diff);
    return { id: createId(), title: "Cube Volume", difficulty: diff, goldReward: 10 + diff, shapes: [{ id: '1', type: 'cuboid', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:s,height:s,depth:s}, color: COLORS.presents[0] }], dimensions: [{ start: {x:-s/2, y:-s/2, z:s/2}, end: {x:s/2, y:-s/2, z:s/2}, offset: {x:0,y:-1,z:0}, text: `s=${s}` }], stages: [{ id: '1', question: "Calculate the volume of the cube.", answer: Math.pow(s,3), unit: 'u³', hint: 'V = s³' }] };
};
const CylinderVol = (diff: number): Problem => {
    const r = randInt(2, 5 + diff/2); const h = randInt(5, 10 + diff);
    return { id: createId(), title: "Cylinder Volume", difficulty: diff, goldReward: 15 + diff, shapes: [{ id: '1', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[1] }], dimensions: [{ start: {x:-r, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `d=${r*2}` }, { start: {x:r, y:0, z:0}, end: {x:r, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` }], stages: [{ id: '1', question: "Calculate the volume.", answer: Math.PI * r * r * h, unit: 'u³', hint: 'V = πr²h' }] };
};
const ConeSlant = (diff: number): Problem => {
    const r = randInt(3, 6); const h = randInt(4, 8); const l = Math.sqrt(r*r + h*h);
    return { id: createId(), title: "Cone Slant Height", difficulty: diff, goldReward: 20, shapes: [{ id: '1', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[2] }], dimensions: [{ start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:r + 2, y:0, z:0}, text: `h=${h}` }, { start: {x:0, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `r=${r}` }], stages: [{ id: '1', question: "Find the slant height (l).", answer: l, unit: 'u', hint: 'Pythagoras: l² = h² + r²' }] };
};
const IceCreamVol = (diff: number): Problem => {
    const r = randInt(3, 5); const h_cone = randInt(6, 10); const vol = (Math.PI * r*r * h_cone)/3 + (2/3 * Math.PI * Math.pow(r,3));
    return { id: createId(), title: "Ice Cream Volume", difficulty: diff + 1, goldReward: 30, shapes: [{ id: 'cone', type: 'cone', position: {x:0,y:h_cone/2,z:0}, rotation:{x:Math.PI,y:0,z:0}, dims:{radius:r, height:h_cone}, color: COLORS.presents[3] }, { id: 'hemi', type: 'hemisphere', position: {x:0,y:h_cone,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r}, color: COLORS.presents[4] }], dimensions: [{ start: {x:r, y:0, z:0}, end: {x:r, y:h_cone, z:0}, offset: {x:1,y:0,z:0}, text: `h_cone=${h_cone}` }, { start: {x:0, y:h_cone, z:0}, end: {x:r, y:h_cone, z:0}, offset: {x:0,y:1,z:0}, text: `r=${r}` }], stages: [{ id: '1', question: "Find total volume of the solid.", answer: vol, unit: 'u³', hint: 'V_cone + V_hemisphere' }] };
};
const SiloSA = (diff: number): Problem => {
    const r = randInt(3, 5); const h_cyl = randInt(5, 8); const h_cone = randInt(3, 5); const l = Math.sqrt(r*r + h_cone*h_cone); const sa = (2 * Math.PI * r * h_cyl) + (Math.PI * r * l) + (Math.PI * r * r);
    return { id: createId(), title: "Silo Surface Area", difficulty: diff + 2, goldReward: 40, shapes: [{ id: 'cyl', type: 'cylinder', position: {x:0,y:h_cyl/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h_cyl}, color: COLORS.presents[1] }, { id: 'cone', type: 'cone', position: {x:0,y:h_cyl + h_cone/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h_cone}, color: COLORS.presents[0] }], dimensions: [{ start: {x:r, y:0, z:0}, end: {x:r, y:h_cyl, z:0}, offset: {x:1,y:0,z:0}, text: `h_cyl=${h_cyl}` }, { start: {x:r, y:h_cyl, z:0}, end: {x:r, y:h_cyl+h_cone, z:0}, offset: {x:1,y:0,z:0}, text: `h_cone=${h_cone}` }, { start: {x:0, y:0, z:r}, end: {x:r, y:0, z:r}, offset: {x:0,y:0,z:1}, text: `r=${r}` }], stages: [{ id: '1', question: "Find Total Surface Area.", answer: sa, unit: 'u²', hint: 'Cyl_curved + Cone_curved + Base' }] };
};
const HollowPipeVol = (diff: number): Problem => {
    const R = randInt(4, 6); const r = randInt(1, 3); const h = randInt(8, 12); const vol = Math.PI * h * (R*R - r*r);
    return { id: createId(), title: "Pipe Volume", difficulty: diff + 1, goldReward: 25, shapes: [{ id: 'outer', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:R, height:h}, color: COLORS.presents[1] }, { id: 'inner', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h+0.1}, color: 0x0f172a }], dimensions: [{ start: {x:0, y:h, z:0}, end: {x:R, y:h, z:0}, offset: {x:0,y:1,z:0}, text: `R=${R}` }, { start: {x:0, y:h, z:0}, end: {x:-r, y:h, z:0}, offset: {x:0,y:1,z:0}, text: `r=${r}` }, { start: {x:R, y:0, z:0}, end: {x:R, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` }], stages: [{ id: '1', question: "Find volume of the material.", answer: vol, unit: 'u³', hint: 'V_outer - V_inner' }] };
};
const ConeFrustumVol = (diff: number): Problem => {
    const R = randInt(5, 8); const r = randInt(2, 4); const h = randInt(6, 10); const vol = (Math.PI * h / 3) * (R*R + R*r + r*r);
    return { id: createId(), title: "Frustum Volume", difficulty: diff + 3, goldReward: 45, shapes: [{ id: 'frustum', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:R, radiusTop:r, height:h}, color: COLORS.presents[2] }], dimensions: [{ start: {x:R, y:0, z:0}, end: {x:r, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` }, { start: {x:0, y:0, z:R}, end: {x:R, y:0, z:R}, offset: {x:0,y:0,z:1}, text: `R=${R}` }, { start: {x:0, y:h, z:r}, end: {x:r, y:h, z:r}, offset: {x:0,y:0,z:1}, text: `r=${r}` }], stages: [{ id: '1', question: "Calculate the volume.", answer: vol, unit: 'u³', hint: 'V = (πh/3)(R² + Rr + r²)' }] };
};
const TrigFindHeight = (diff: number): Problem => {
    const base = randInt(10, 20); const angle = randInt(25, 60); const rad = toRad(angle); const height = base * Math.tan(rad);
    return { id: createId(), title: "Trig: Find Height", difficulty: diff, goldReward: 25, shapes: [{ id: 'tri', type: 'pyramid', position: {x:0,y:height/2,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:base, height:height}, color: COLORS.presents[0] }], dimensions: [{ start: {x:0, y:0, z:0}, end: {x:base, y:0, z:0}, offset: {x:0,y:-0.5,z:0}, text: `adj=${base}` }], angles: [{ origin: {x:base, y:0, z:0}, vecA: {x:-1,y:0,z:0}, vecB: {x:-1,y:height/base,z:0}, text: `${angle}°` }], stages: [{ id: '1', question: "Find the vertical height (h).", answer: height, unit: 'u', hint: 'tan(θ) = opp/adj' }] };
};
const TrigFindSlant = (diff: number): Problem => {
    const h = randInt(10, 15); const angle = randInt(30, 60); const rad = toRad(angle); const l = h / Math.sin(rad);
    return { id: createId(), title: "Trig: Slant Height", difficulty: diff, goldReward: 25, shapes: [{ id: 'cone', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius: h / Math.tan(rad), height:h}, color: COLORS.presents[3] }], dimensions: [{ start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:0}, text: `h=${h}` }], angles: [{ origin: {x:h/Math.tan(rad), y:0, z:0}, vecA: {x:-1,y:0,z:0}, vecB: {x:-1,y:Math.tan(rad),z:0}, text: `${angle}°` }], stages: [{ id: '1', question: "Find the slant height (l).", answer: l, unit: 'u', hint: 'sin(θ) = opp/hyp' }] };
};
const TrigRamp = (diff: number): Problem => {
    const base = randInt(8, 15); const height = randInt(5, 12); const angle = toDeg(Math.atan(height/base));
    return { id: createId(), title: "Ramp Angle", difficulty: diff, goldReward: 30, shapes: [{ id: 'pyr', type: 'pyramid', position: {x:0,y:height/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:base*2, height:height}, color: COLORS.presents[2] }], dimensions: [{ start: {x:0, y:0, z:0}, end: {x:0, y:0, z:base}, offset: {x:1,y:0,z:0}, text: `adj=${base}` }, { start: {x:0, y:0, z:0}, end: {x:0, y:height, z:0}, offset: {x:0,y:0,z:-1}, text: `opp=${height}` }], angles: [{ origin: {x:0, y:0, z:base}, vecA: {x:0,y:0,z:-1}, vecB: {x:0,y:height,z:-base}, text: `θ` }], stages: [{ id: '1', question: "Find the angle of elevation θ.", answer: angle, unit: '°', hint: 'tan(θ) = opp/adj' }] };
};
const TrigConeApex = (diff: number): Problem => {
    const r = randInt(5, 10); const h = randInt(8, 15); const halfAngle = toDeg(Math.atan(r/h)); const fullAngle = halfAngle * 2;
    return { id: createId(), title: "Cone Apex Angle", difficulty: diff + 1, goldReward: 35, shapes: [{ id: 'cone', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[4] }], dimensions: [{ start: {x:0, y:h, z:0}, end: {x:r, y:0, z:0}, offset: {x:1,y:1,z:0}, text: `l` }, { start: {x:-r, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `diameter=${r*2}` }, { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:1}, text: `h=${h}` }], angles: [{ origin: {x:0, y:h, z:0}, vecA: {x:r,y:-h,z:0}, vecB: {x:-r,y:-h,z:0}, text: `θ` }], stages: [{ id: '1', question: "Calculate the total apex angle θ.", answer: fullAngle, unit: '°', hint: 'Find half angle first: tan(α) = r/h' }] };
};
const TrigPyramidEdge = (diff: number): Problem => {
    const base = randInt(10, 16); const h = randInt(8, 12); const diag = Math.sqrt(base*base + base*base); const halfDiag = diag / 2; const angle = toDeg(Math.atan(h / halfDiag));
    return { id: createId(), title: "Pyramid Edge Angle", difficulty: diff + 2, goldReward: 40, shapes: [{ id: 'pyr', type: 'pyramid', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:halfDiag*1.4, height:h}, color: COLORS.presents[0] }], dimensions: [{ start: {x:-base/2, y:0, z:base/2}, end: {x:base/2, y:0, z:base/2}, offset: {x:0,y:0,z:1}, text: `w=${base}` }, { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:-1}, text: `h=${h}` }], angles: [{ origin: {x:base/2, y:0, z:base/2}, vecA: {x:-1,y:0,z:-1}, vecB: {x:-base/2,y:h,z:-base/2}, text: `θ` }], stages: [{ id: '1', question: "Find angle between the slant edge and the base.", answer: angle, unit: '°', hint: '1. Find diagonal. 2. Use tan(θ) = h / (diag/2)' }] };
};
const TrigCuboidSpace = (diff: number): Problem => {
    const w = randInt(6, 10); const d = randInt(6, 10); const h = randInt(5, 8); const floorDiag = Math.sqrt(w*w + d*d); const angle = toDeg(Math.atan(h / floorDiag));
    return { id: createId(), title: "Space Diagonal", difficulty: diff + 3, goldReward: 50, shapes: [{ id: 'box', type: 'cuboid', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:w, height:h, depth:d}, color: 0x94a3b8 }], dimensions: [{ start: {x:-w/2, y:0, z:d/2}, end: {x:w/2, y:0, z:d/2}, offset: {x:0,y:0,z:1}, text: `w=${w}` }, { start: {x:w/2, y:0, z:d/2}, end: {x:w/2, y:0, z:-d/2}, offset: {x:1,y:0,z:0}, text: `d=${d}` }, { start: {x:w/2, y:0, z:-d/2}, end: {x:w/2, y:h, z:-d/2}, offset: {x:1,y:0,z:0}, text: `h=${h}` }], angles: [{ origin: {x:-w/2, y:0, z:d/2}, vecA: {x:w,y:0,z:-d}, vecB: {x:w,y:h,z:-d}, text: `θ` }], stages: [{ id: '1', question: "Find the angle between the 3D diagonal and the base.", answer: angle, unit: '°', hint: '1. Find floor diagonal. 2. tan(θ) = h/floor_diag' }] };
};

const BossNutcracker = (level: number): Problem => ({ id: createId(), title: "General Nutcracker", difficulty: 5, goldReward: 200, isBoss: true, bossName: "Nutcracker", bossAvatar: "💂", bossType: 'main', bossMusicTheme: 'nutcracker', bossHP: 100, dropTable: [BOSS_LOOT[0]], shapes: [{ id: 'body', type: 'cuboid', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:10, height:15, depth:6}, color: COLORS.presents[0] }, { id: 'head', type: 'cuboid', position: {x:0,y:20,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:8, height:8, depth:8}, color: COLORS.presents[4] }], stages: [{ id: '1', question: "Calculate volume of the BODY (Red Prism).", answer: 10*15*6, unit: 'u³' }, { id: '2', question: "Calculate surface area of HEAD (White Cube).", answer: 6*(8*8), unit: 'u²' }, { id: '3', question: "The Hat (not shown) is a cone with r=4, h=3. Find its Volume.", answer: (Math.PI*16*3)/3, unit: 'u³' }, { id: '4', question: "Find the Slant Height of that Hat.", answer: 5, unit: 'u' }, { id: '5', question: "Total Height of Body + Head.", answer: 15 + 8, unit: 'u' }], dimensions: [{ start: {x:-5, y:2.5, z:3}, end: {x:5, y:2.5, z:3}, offset: {x:0,y:-1,z:0}, text: 'w=10' }, { start: {x:5, y:2.5, z:3}, end: {x:5, y:17.5, z:3}, offset: {x:1,y:0,z:0}, text: 'h_body=15' }] });
const BossKrampus = (level: number): Problem => ({ id: createId(), title: "Krampus Lair", difficulty: 7, goldReward: 400, isBoss: true, bossName: "Krampus", bossAvatar: "👹", bossType: 'main', bossMusicTheme: 'krampus', bossHP: 200, dropTable: [BOSS_LOOT[1]], shapes: [{ id: 'cage', type: 'cylinder', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:6, height:16}, color: 0x334155 }, { id: 'horn', type: 'cone', position: {x:5,y:18,z:0}, rotation:{x:0,y:0,z:-0.5}, dims:{radius:2, height:10}, color: 0x9f1239 }], stages: [{ id: '1', question: "Volume of the Cage (Cylinder).", answer: Math.PI*6*6*16, unit: 'u³' }, { id: '2', question: "Curved Surface Area of the Cage.", answer: 2*Math.PI*6*16, unit: 'u²' }, { id: '3', question: "Volume of the Horn (Cone).", answer: (Math.PI*2*2*10)/3, unit: 'u³' }, { id: '4', question: "Slant height of the Horn.", answer: Math.sqrt(100+4), unit: 'u' }, { id: '5', question: "Distance from Cage base center to Horn tip (approx coords).", answer: Math.sqrt(5*5 + 18*18), unit: 'u', hint: '3D Pythagoras' }], dimensions: [{ start: {x:-6, y:0, z:0}, end: {x:6, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: 'd=12' }, { start: {x:6, y:0, z:0}, end: {x:6, y:16, z:0}, offset: {x:1,y:0,z:0}, text: 'h=16' }] });
const BossMechaSanta = (level: number): Problem => ({ id: createId(), title: "Mecha-Santa Protocol", difficulty: 9, goldReward: 600, isBoss: true, bossName: "Mecha-Santa", bossAvatar: "🤖", bossType: 'main', bossMusicTheme: 'mecha', bossHP: 300, dropTable: [BOSS_LOOT[2]], shapes: [{ id: 'torso', type: 'cuboid', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:12, height:14, depth:8}, color: 0x94a3b8 }, { id: 'core', type: 'sphere', position: {x:0,y:10,z:4}, rotation:{x:0,y:0,z:0}, dims:{radius:3}, color: 0xef4444 }], stages: [{ id: '1', question: "Volume of Torso (Cuboid).", answer: 12*14*8, unit: 'u³' }, { id: '2', question: "Volume of Reactor Core (Sphere).", answer: (4/3)*Math.PI*27, unit: 'u³' }, { id: '3', question: "Surface Area of Reactor Core.", answer: 4*Math.PI*9, unit: 'u²' }, { id: '4', question: "Space remaining in torso if Core was inside.", answer: (12*14*8) - ((4/3)*Math.PI*27), unit: 'u³' }, { id: '5', question: "Diagonal of the Torso.", answer: Math.sqrt(12*12 + 14*14 + 8*8), unit: 'u' }], dimensions: [{ start: {x:-6, y:3, z:4}, end: {x:6, y:3, z:4}, offset: {x:0,y:-1,z:0}, text: 'w=12' }, { start: {x:6, y:3, z:4}, end: {x:6, y:17, z:4}, offset: {x:1,y:0,z:0}, text: 'h=14' }] });
const BossYeti = (level: number): Problem => ({ id: createId(), title: "Yeti King", difficulty: 6, goldReward: 250, isBoss: true, bossName: "Yeti King", bossAvatar: "🦍", bossType: 'main', bossMusicTheme: 'boss', bossHP: 150, dropTable: [BOSS_LOOT[0]], shapes: [{ id: 'body', type: 'hemisphere', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:8}, color: 0xffffff }, { id: 'head', type: 'cuboid', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:6,height:6,depth:6}, color: 0xbae6fd }], stages: [{ id: '1', question: "Volume of Body (Hemisphere, r=8).", answer: (2/3)*Math.PI*512, unit: 'u³' }, { id: '2', question: "Surface Area of the Body (Curved + Base).", answer: 3*Math.PI*64, unit: 'u²' }, { id: '3', question: "Volume of Head (Cube, s=6).", answer: 216, unit: 'u³' }, { id: '4', question: "Total Volume.", answer: ((2/3)*Math.PI*512) + 216, unit: 'u³' }] });
const BossDarkElf = (level: number): Problem => ({ id: createId(), title: "Dark Elf Sorcerer", difficulty: 8, goldReward: 350, isBoss: true, bossName: "Malekith", bossAvatar: "🧝", bossType: 'main', bossMusicTheme: 'boss', bossHP: 200, dropTable: [BOSS_LOOT[2]], shapes: [{ id: 'tower', type: 'hex_prism', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:6, height:16}, color: 0x4c1d95 }], stages: [{ id: '1', question: "Area of Hexagon Base (s=6).", answer: (3*Math.sqrt(3)/2)*36, unit: 'u²', hint: 'Area = (3√3 / 2) * s²' }, { id: '2', question: "Volume of Tower (Area * h).", answer: ((3*Math.sqrt(3)/2)*36) * 16, unit: 'u³' }, { id: '3', question: "Lateral Surface Area (6 rectangles).", answer: 6 * 6 * 16, unit: 'u²' }], dimensions: [{ start: {x:0,y:0,z:0}, end: {x:6,y:0,z:0}, offset: {x:0,y:0,z:1}, text: 's=6' }, { start: {x:6,y:0,z:0}, end: {x:6,y:16,z:0}, offset: {x:1,y:0,z:0}, text: 'h=16' }] });
const BossGeometer = (level: number): Problem => ({ id: createId(), title: "The Geometer", difficulty: 10, goldReward: 500, isBoss: true, bossName: "The Geometer", bossAvatar: "📐", bossType: 'main', bossMusicTheme: 'mecha', bossHP: 250, dropTable: [BOSS_LOOT[3]], shapes: [{ id: 'cube', type: 'cuboid', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:20,height:20,depth:20}, color: 0x64748b }, { id: 'pyr', type: 'pyramid', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:20, height:20}, color: 0xfacc15 }], stages: [{ id: '1', question: "Find Space Diagonal of the Cube (s=20).", answer: Math.sqrt(20*20 + 20*20 + 20*20), unit: 'u' }, { id: '2', question: "Angle between Space Diagonal and Floor.", answer: toDeg(Math.atan(20 / Math.sqrt(800))), unit: '°' }, { id: '3', question: "Volume of the internal Pyramid.", answer: (400*20)/3, unit: 'u³' }, { id: '4', question: "Surface Area of the Cube.", answer: 6*400, unit: 'u²' }, { id: '5', question: "Angle of Elevation of Pyramid Edge.", answer: toDeg(Math.atan(20 / (Math.sqrt(800)/2))), unit: '°' }], dimensions: [{ start: {x:-10,y:0,z:10}, end: {x:10,y:0,z:10}, offset: {x:0,y:-1,z:0}, text: 's=20' }, { start: {x:10,y:0,z:10}, end: {x:10,y:20,z:10}, offset: {x:1,y:0,z:0}, text: 'h=20' }] });

const MiniBossSled = (level: number): Problem => ({ id: createId(), title: "Grinch Sled", difficulty: 4, goldReward: 100, isBoss: true, bossName: "The Grinch", bossAvatar: "🛷", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 50, shapes: [{ id: 'base', type: 'cuboid', position: {x:0,y:2,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:12, height:4, depth:8}, color: COLORS.presents[2] }, { id: 'seat', type: 'cuboid', position: {x:-2,y:6,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:4, height:4, depth:6}, color: COLORS.presents[0] }], stages: [{ id: '1', question: "Volume of the base.", answer: 12*4*8, unit: 'u³' }, { id: '2', question: "Volume of the seat.", answer: 4*4*6, unit: 'u³' }, { id: '3', question: "Total Volume.", answer: (12*4*8) + (4*4*6), unit: 'u³' }], dimensions: [{ start: {x:-6, y:0, z:4}, end: {x:6, y:0, z:4}, offset: {x:0,y:0,z:1}, text: 'L=12' }, { start: {x:6, y:0, z:4}, end: {x:6, y:0, z:-4}, offset: {x:1,y:0,z:0}, text: 'W=8' }] });
const MiniBossHouse = (level: number): Problem => ({ id: createId(), title: "Gingerbread House", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Cookie Monster", bossAvatar: "🏠", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60, shapes: [{ id: 'base', type: 'cuboid', position: {x:0,y:5,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:10, height:10, depth:10}, color: 0xcd853f }, { id: 'roof', type: 'pyramid', position: {x:0,y:10 + 3,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:10, height:6}, color: 0xffffff }], stages: [{ id: '1', question: "Volume of the base (Cube).", answer: 1000, unit: 'u³' }, { id: '2', question: "Volume of the roof (Pyramid).", answer: (100*6)/3, unit: 'u³' }, { id: '3', question: "Slant height of the roof.", answer: Math.sqrt(25 + 36), unit: 'u', hint: 'l² = (w/2)² + h²' }], dimensions: [{ start: {x:-5, y:0, z:5}, end: {x:5, y:0, z:5}, offset: {x:0,y:-1,z:0}, text: 's=10' }, { start: {x:5, y:10, z:5}, end: {x:5, y:16, z:5}, offset: {x:1,y:0,z:0}, text: 'h=6' }] });
const MiniBossSnowman = (level: number): Problem => ({ id: createId(), title: "Snow Golem", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Frosty Guard", bossAvatar: "⛄", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60, shapes: [{ id: 'bot', type: 'sphere', position: {x:0,y:4,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:4}, color: 0xffffff }, { id: 'mid', type: 'sphere', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:3}, color: 0xffffff }, { id: 'top', type: 'sphere', position: {x:0,y:15,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:2}, color: 0xffffff }], stages: [{ id: '1', question: "Volume of Bottom Sphere (r=4).", answer: (4/3)*Math.PI*64, unit: 'u³' }, { id: '2', question: "Volume of Head (r=2).", answer: (4/3)*Math.PI*8, unit: 'u³' }, { id: '3', question: "Total Height.", answer: 4+4 + 3+3 + 2+2, unit: 'u' }], dimensions: [{ start: {x:-4, y:4, z:0}, end: {x:4, y:4, z:0}, offset: {x:0,y:0,z:1}, text: 'd=8' }, { start: {x:-2, y:15, z:0}, end: {x:2, y:15, z:0}, offset: {x:0,y:0,z:1}, text: 'd=4' }] });
const MiniBossTrain = (level: number): Problem => ({ id: createId(), title: "Polar Express", difficulty: 6, goldReward: 140, isBoss: true, bossName: "Engine 25", bossAvatar: "🚂", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 70, shapes: [{ id: 'boiler', type: 'cylinder', position: {x:0,y:3,z:-2}, rotation:{x:Math.PI/2,y:0,z:0}, dims:{radius:3, height:10}, color: 0xef4444 }, { id: 'cab', type: 'cuboid', position: {x:0,y:5,z:4}, rotation:{x:0,y:0,z:0}, dims:{width:6, height:8, depth:4}, color: 0x1e293b }], stages: [{ id: '1', question: "Volume of Boiler (Cylinder, r=3, h=10).", answer: Math.PI*9*10, unit: 'u³' }, { id: '2', question: "Volume of Cab (6x8x4).", answer: 6*8*4, unit: 'u³' }, { id: '3', question: "Total Volume.", answer: (Math.PI*90) + 192, unit: 'u³' }], dimensions: [{ start: {x:-3, y:3, z:-7}, end: {x:3, y:3, z:-7}, offset: {x:0,y:-1,z:0}, text: 'd=6' }, { start: {x:3, y:3, z:-7}, end: {x:3, y:3, z:3}, offset: {x:1,y:0,z:0}, text: 'len=10' }] });
const MiniBossTree = (level: number): Problem => ({ id: createId(), title: "Evergreen Sentinel", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Timber", bossAvatar: "🌲", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60, shapes: [{ id: 'trunk', type: 'cylinder', position: {x:0,y:2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:2, height:4}, color: 0x451a03 }, { id: 'leaves', type: 'cone', position: {x:0,y:12,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:6, height:16}, color: 0x15803d }], stages: [{ id: '1', question: "Volume of Trunk (Cylinder).", answer: Math.PI*4*4, unit: 'u³' }, { id: '2', question: "Volume of Leaves (Cone).", answer: (Math.PI*36*16)/3, unit: 'u³' }, { id: '3', question: "Slant height of Leaves.", answer: Math.sqrt(6*6 + 16*16), unit: 'u' }], dimensions: [{ start: {x:-2, y:0, z:2}, end: {x:2, y:0, z:2}, offset: {x:0,y:0,z:0}, text: 'd_trunk=4' }, { start: {x:-6, y:4, z:0}, end: {x:6, y:4, z:0}, offset: {x:0,y:0,z:1}, text: 'd_cone=12' }, { start: {x:6, y:4, z:0}, end: {x:6, y:20, z:0}, offset: {x:1,y:0,z:0}, text: 'h_cone=16' }] });
const MiniBossMimic = (level: number): Problem => ({ id: createId(), title: "Surprise Gift", difficulty: 7, goldReward: 160, isBoss: true, bossName: "Mimic", bossAvatar: "🎁", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 80, shapes: [{ id: 'box', type: 'cuboid', position: {x:0,y:5,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:10,height:10,depth:10}, color: COLORS.presents[3] }], stages: [{ id: '1', question: "Surface Area of the Cube (s=10).", answer: 600, unit: 'u²' }, { id: '2', question: "Space Diagonal length.", answer: Math.sqrt(300), unit: 'u' }], dimensions: [{ start: {x:-5,y:0,z:5}, end: {x:5,y:0,z:5}, offset: {x:0,y:-1,z:0}, text: 's=10' }] });
const MiniBossReindeer = (level: number): Problem => ({ id: createId(), title: "Robo-Rudolph", difficulty: 6, goldReward: 150, isBoss: true, bossName: "R-3000", bossAvatar: "🦌", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 70, shapes: [{ id: 'body', type: 'cylinder', position: {x:0,y:5,z:0}, rotation:{x:Math.PI/2,y:0,z:0}, dims:{radius:4, height:12}, color: 0x78350f }, { id: 'legs', type: 'cuboid', position: {x:0,y:2,z:-4}, rotation:{x:0,y:0,z:0}, dims:{width:2, height:4, depth:2}, color: 0x000000 }], stages: [{ id: '1', question: "Volume of Body (Cylinder, r=4, h=12).", answer: Math.PI*16*12, unit: 'u³' }, { id: '2', question: "Surface Area of Body.", answer: (2*Math.PI*4*12) + (2*Math.PI*16), unit: 'u²' }] });

let lastQuestionType: string = '';
export const ProblemGenerator = {
    generate: (level: number, diff: number): Problem => {
        if (level % 10 === 0) {
            const bosses = level >= 15 ? [BossNutcracker, BossKrampus, BossMechaSanta, BossYeti, BossDarkElf, BossGeometer] : [BossNutcracker, BossKrampus, BossMechaSanta, BossYeti, BossDarkElf];
            const pick = bosses[Math.floor(Math.random() * bosses.length)];
            return pick(level);
        }
        if (level % 5 === 0) {
            const minis = [MiniBossSled, MiniBossHouse, MiniBossSnowman, MiniBossTrain, MiniBossTree, MiniBossMimic, MiniBossReindeer];
            const pick = minis[Math.floor(Math.random() * minis.length)];
            return pick(level);
        }
        const generators = [
            { fn: SimpleCube, type: 'vol_basic', weight: 0.1 }, { fn: CylinderVol, type: 'vol_cyl', weight: 0.1 }, { fn: ConeSlant, type: 'slant', weight: 0.1 },
            { fn: IceCreamVol, type: 'comp_vol', weight: 0.1 }, { fn: SiloSA, type: 'comp_sa', weight: 0.1 },
            { fn: HollowPipeVol, type: 'hollow', weight: 0.1 }, { fn: ConeFrustumVol, type: 'frustum', weight: 0.1 },
            { fn: TrigFindHeight, type: 'trig_basic', weight: 0.06 }, { fn: TrigFindSlant, type: 'trig_slant', weight: 0.06 }, { fn: TrigRamp, type: 'trig_ramp', weight: 0.06 }, { fn: TrigConeApex, type: 'trig_apex', weight: 0.06 }, { fn: TrigPyramidEdge, type: 'trig_pyr', weight: 0.06 }, { fn: TrigCuboidSpace, type: 'trig_3d', weight: 0.06 }
        ];
        const validGens = generators.filter(g => { if (level < 3 && g.type.startsWith('trig')) return false; return true; });
        let pool = validGens.filter(g => g.type !== lastQuestionType);
        if (pool.length === 0) pool = validGens;
        const totalWeight = pool.reduce((sum, g) => sum + g.weight, 0);
        let r = Math.random() * totalWeight;
        let selected = pool[0];
        for (const g of pool) { r -= g.weight; if (r <= 0) { selected = g; break; } }
        lastQuestionType = selected.type;
        return selected.fn(diff);
    }
};

// ==========================================
// 5. GAME STATE
// ==========================================

export const INITIAL_PLAYER_STATE: PlayerState = {
    version: 8, isDeveloperMode: false, avatarId: 'elf', level: 1, highScore: 1, xp: 0, gold: 0, lives: 2, maxLives: 2, streak: 0, difficultyRating: 1.0, inventory: [], activePassives: {}, cosmetics: { hat: 'none', outfit: 'none' }, stats: { toleranceMultiplier: 1.0, measureSnap: 1.0, baseTime: 60, goldMultiplier: 1.0, bossDamageMultiplier: 1.0 }, settings: { masterVolume: 0.6, bgmVolume: 0.8, sfxVolume: 1.0 }, latestLoot: undefined
};
export const INITIAL_QUIZ_STATE: QuizState = { userAnswer: '', currentStageIndex: 0, feedback: 'idle', timeLeft: 60, timerActive: false };
export const initialGameState = { player: INITIAL_PLAYER_STATE, quiz: INITIAL_QUIZ_STATE, phase: 'welcome', currentProblem: null };

const applyAvatarStats = (player: PlayerState, avatarId: PlayerAvatarId): PlayerState => {
    const stats = { ...player.stats };
    let maxLives = player.maxLives;
    if (avatarId === 'elf_female') stats.goldMultiplier += 0.2;
    if (avatarId === 'snowman') stats.baseTime += 15;
    if (avatarId === 'penguin') maxLives += 1;
    return { ...player, stats, maxLives, avatarId };
};

function gameReducer(state: any, action: any) {
    switch (action.type) {
        case 'LOAD_SAVE':
            const loaded = { ...INITIAL_PLAYER_STATE, ...action.payload };
            if (!loaded.settings) loaded.settings = INITIAL_PLAYER_STATE.settings;
            return { ...state, player: loaded };
        case 'RESET_GAME':
            const retainedPlayerState: PlayerState = { ...state.player, level: 1, xp: 0, difficultyRating: 1.0, lives: state.player.maxLives, streak: 0, latestLoot: undefined };
            return { ...initialGameState, player: retainedPlayerState, phase: 'welcome' };
        case 'START_GAME': {
            let startPlayer = applyAvatarStats(state.player, action.avatarId);
            startPlayer.lives = startPlayer.maxLives;
            if (state.player.isDeveloperMode && startPlayer.gold < 100000) startPlayer.gold = 100000;
            return { ...state, phase: 'playing', player: startPlayer, currentProblem: ProblemGenerator.generate(1, 1), quiz: { ...INITIAL_QUIZ_STATE, timerActive: true, timeLeft: startPlayer.stats.baseTime } };
        }
        case 'SET_VOLUME': {
            const newSettings = { ...state.player.settings };
            if (action.category === 'master') newSettings.masterVolume = action.value;
            if (action.category === 'bgm') newSettings.bgmVolume = action.value;
            if (action.category === 'sfx') newSettings.sfxVolume = action.value;
            return { ...state, player: { ...state.player, settings: newSettings } };
        }
        case 'DEV_UNLOCK': return { ...state, player: { ...state.player, isDeveloperMode: true, gold: 100000 } };
        case 'TICK_TIMER': {
            if (state.phase !== 'playing' || !state.quiz.timerActive) return state;
            const newTime = state.quiz.timeLeft - 1;
            if (newTime <= 0) {
                 const lives = state.player.lives - 1;
                 if (lives <= 0) return { ...state, phase: 'gameover', player: { ...state.player, lives: 0, highScore: state.player.level > state.player.highScore ? state.player.level : state.player.highScore }, quiz: {...state.quiz, timeLeft: 0, feedback: 'timeout'} };
                 return { ...state, player: {...state.player, lives}, quiz: {...state.quiz, timeLeft: state.player.stats.baseTime, feedback: 'timeout'} };
            }
            return { ...state, quiz: { ...state.quiz, timeLeft: newTime } };
        }
        case 'SET_ANSWER': return { ...state, quiz: { ...state.quiz, userAnswer: action.value } };
        case 'RESET_FEEDBACK': return { ...state, quiz: { ...state.quiz, feedback: 'idle' } };
        case 'SUBMIT_ANSWER': {
            if (!state.currentProblem) return state;
            const stage = state.currentProblem.stages[state.quiz.currentStageIndex];
            const val = parseFloat(state.quiz.userAnswer);
            if (isNaN(val)) return state;
            let correct = false;
            if (state.player.isDeveloperMode) correct = true;
            else {
                const sf3 = parseFloat(stage.answer.toPrecision(3));
                const user3 = parseFloat(val.toPrecision(3));
                const tolerance = 0.05 * state.player.stats.toleranceMultiplier; 
                if (Math.abs(val - stage.answer) < Math.abs(stage.answer * tolerance) || sf3 === user3) correct = true;
            }
            if (correct) {
                 const isLast = state.quiz.currentStageIndex >= state.currentProblem.stages.length - 1;
                 if (isLast) {
                     const reward = Math.ceil(state.currentProblem.goldReward * state.player.stats.goldMultiplier); 
                     let lootDrop: string | undefined = undefined;
                     if (state.currentProblem.isBoss && state.currentProblem.dropTable) {
                         const roll = Math.random();
                         const item = state.currentProblem.dropTable[0];
                         if (roll < 0.4 && !state.player.inventory.includes(item.id)) lootDrop = item.id;
                     }
                     let newInv = state.player.inventory;
                     if (lootDrop) newInv = [...newInv, lootDrop];
                     return { ...state, phase: 'intermission', player: { ...state.player, gold: state.player.gold + reward, streak: state.player.streak + 1, xp: state.player.xp + 10, latestLoot: lootDrop, inventory: newInv }, quiz: { ...state.quiz, feedback: 'correct', timerActive: false } };
                 }
                 return { ...state, quiz: { ...state.quiz, feedback: 'stage_complete', currentStageIndex: state.quiz.currentStageIndex + 1, userAnswer: '' } };
            } else {
                 const lives = state.player.lives - 1;
                 if (lives <= 0) return { ...state, phase: 'gameover', player: { ...state.player, lives: 0, highScore: state.player.level > state.player.highScore ? state.player.level : state.player.highScore }, quiz: { ...state.quiz, feedback: 'incorrect' } };
                 return { ...state, player: {...state.player, lives}, quiz: { ...state.quiz, feedback: 'incorrect', timeLeft: state.player.stats.baseTime } };
            }
        }
        case 'NEXT_LEVEL': {
            const nextLvl = state.player.level + 1;
            const diff = state.player.difficultyRating + 0.2;
            return { ...state, phase: 'playing', player: { ...state.player, level: nextLvl, difficultyRating: diff, latestLoot: undefined }, currentProblem: ProblemGenerator.generate(nextLvl, diff), quiz: { ...INITIAL_QUIZ_STATE, timerActive: true, timeLeft: state.player.stats.baseTime } };
        }
        case 'EQUIP_ITEM': {
            const { item } = action;
            if (item.type !== 'cosmetic') return state;
            const newCos = { ...state.player.cosmetics };
            if (item.effectId.startsWith('hat')) newCos.hat = item.effectId;
            if (item.effectId.startsWith('tunic')) newCos.outfit = item.effectId;
            return { ...state, player: { ...state.player, cosmetics: newCos } };
        }
        case 'BUY_ITEM': {
            const { item } = action;
            const currentLevel = state.player.activePassives[item.id] || 0;
            const max = item.maxLevel || 1;
            let cost = item.cost;
            if (item.type === 'passive' && item.costMultiplier && currentLevel > 0) cost = Math.floor(item.cost * Math.pow(item.costMultiplier, currentLevel));
            if (state.player.gold >= cost && currentLevel < max) {
                const newGold = state.player.gold - cost;
                if (item.type === 'passive') {
                    const newLevel = currentLevel + 1;
                    const newPassives = { ...state.player.activePassives, [item.id]: newLevel };
                    const newStats = { ...state.player.stats };
                    const newPlayer = { ...state.player, gold: newGold, activePassives: newPassives };
                    if (item.effectId === 'gold_boost') newStats.goldMultiplier = 1.0 + (newLevel * 0.2);
                    if (item.effectId === 'time_boost') newStats.baseTime = 60 + (newLevel * 15);
                    if (item.effectId === 'damage_boost') newStats.bossDamageMultiplier = 1.0 + (newLevel * 0.25);
                    if (item.effectId === 'heart_boost') { newPlayer.maxLives = 2 + newLevel; newPlayer.lives = newPlayer.lives + 1; }
                    newPlayer.stats = newStats;
                    return { ...state, player: newPlayer };
                } else if (item.type === 'cosmetic') {
                    const newCos = { ...state.player.cosmetics };
                    if (item.effectId.startsWith('hat')) newCos.hat = item.effectId;
                    if (item.effectId.startsWith('tunic')) newCos.outfit = item.effectId;
                    return { ...state, player: { ...state.player, gold: newGold, cosmetics: newCos, inventory: [...state.player.inventory, item.id] }};
                } else {
                    return { ...state, player: { ...state.player, gold: newGold, inventory: [...state.player.inventory, item.id] } };
                }
            }
            return state;
        }
        case 'USE_ITEM': {
            const { itemId } = action;
            if (!state.player.inventory.includes(itemId)) return state;
            if (itemId === 'cookie' && state.player.lives >= state.player.maxLives) return state;
            const idx = state.player.inventory.indexOf(itemId);
            const newInv = [...state.player.inventory];
            newInv.splice(idx, 1);
            let newPlayer = { ...state.player, inventory: newInv };
            let newQuiz = { ...state.quiz };
            if (itemId === 'cookie') newPlayer.lives = Math.min(newPlayer.lives + 1, newPlayer.maxLives);
            else if (itemId === 'snowglobe') {
                 if (state.currentProblem?.isBoss) {
                     const isLast = state.quiz.currentStageIndex >= (state.currentProblem.stages.length - 1);
                     if (isLast) return { ...state, phase: 'intermission', player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) }, quiz: { ...newQuiz, feedback: 'correct', timerActive: false } };
                     else return { ...state, player: newPlayer, quiz: { ...state.quiz, feedback: 'stage_complete', currentStageIndex: state.quiz.currentStageIndex + 1, userAnswer: '' } };
                 } else return { ...state, phase: 'intermission', player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) }, quiz: { ...newQuiz, feedback: 'correct', timerActive: false } };
            } else if (itemId === 'bomb') {
                if (state.currentProblem?.isBoss) {
                     const isLast = state.quiz.currentStageIndex >= (state.currentProblem.stages.length - 1);
                     if (isLast) return { ...state, phase: 'intermission', player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) }, quiz: { ...newQuiz, feedback: 'correct', timerActive: false } };
                     return { ...state, player: newPlayer, quiz: { ...state.quiz, feedback: 'stage_complete', currentStageIndex: state.quiz.currentStageIndex + 1, userAnswer: '' } };
                }
            }
            return { ...state, player: newPlayer, quiz: newQuiz };
        }
        default: return state;
    }
}

// ==========================================
// 6. ENGINE
// ==========================================

class SimpleOrbitControls {
    private camera: THREE.Camera; private domElement: HTMLElement; private isDragging = false; private previousMousePosition = { x: 0, y: 0 }; private spherical = new THREE.Spherical(); private target = new THREE.Vector3(0, 5, 0); public autoRotate = false; private lastPinchDist = 0;
    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        this.camera = camera; this.domElement = domElement;
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target); this.spherical.setFromVector3(offset);
        this.domElement.addEventListener('mousedown', this.onMouseDown); document.addEventListener('mousemove', this.onMouseMove); document.addEventListener('mouseup', this.onMouseUp); this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });
        this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false }); this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false }); this.domElement.addEventListener('touchend', this.onTouchEnd);
    }
    private onMouseDown = (e: MouseEvent) => { if (e.button === 0) { this.isDragging = true; this.previousMousePosition = { x: e.clientX, y: e.clientY }; this.domElement.style.cursor = 'grabbing'; } }
    private onMouseMove = (e: MouseEvent) => { if (this.isDragging) { this.rotate(e.clientX - this.previousMousePosition.x, e.clientY - this.previousMousePosition.y); this.previousMousePosition = { x: e.clientX, y: e.clientY }; } }
    private onMouseUp = () => { this.isDragging = false; this.domElement.style.cursor = 'crosshair'; }
    private onTouchStart = (e: TouchEvent) => { if (e.touches.length === 1) { this.isDragging = true; this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) { this.isDragging = false; const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; this.lastPinchDist = Math.sqrt(dx*dx + dy*dy); } }
    private onTouchMove = (e: TouchEvent) => { if (e.touches.length === 1 && this.isDragging) { this.rotate(e.touches[0].clientX - this.previousMousePosition.x, e.touches[0].clientY - this.previousMousePosition.y); this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } else if (e.touches.length === 2) { e.preventDefault(); const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const dist = Math.sqrt(dx*dx + dy*dy); this.zoom((this.lastPinchDist - dist) * 0.1); this.lastPinchDist = dist; } }
    private onTouchEnd = () => { this.isDragging = false; this.lastPinchDist = 0; }
    private rotate(dx: number, dy: number) { this.spherical.theta -= dx * 0.008; this.spherical.phi -= dy * 0.008; this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi)); }
    private zoom(delta: number) { this.spherical.radius += delta; this.spherical.radius = Math.max(5, Math.min(80, this.spherical.radius)); }
    private onMouseWheel = (e: WheelEvent) => { e.preventDefault(); this.zoom(e.deltaY * 0.05); }
    public update() { if (this.autoRotate && !this.isDragging) this.spherical.theta += 0.002; const offset = new THREE.Vector3().setFromSpherical(this.spherical); this.camera.position.copy(this.target).add(offset); this.camera.lookAt(this.target); }
    public dispose() { this.domElement.removeEventListener('mousedown', this.onMouseDown); document.removeEventListener('mousemove', this.onMouseMove); document.removeEventListener('mouseup', this.onMouseUp); this.domElement.removeEventListener('wheel', this.onMouseWheel); this.domElement.removeEventListener('touchstart', this.onTouchStart); this.domElement.removeEventListener('touchmove', this.onTouchMove); this.domElement.removeEventListener('touchend', this.onTouchEnd); }
}

class GeometryEngine {
  private container: HTMLElement; private scene: THREE.Scene; private camera: THREE.PerspectiveCamera; private renderer: THREE.WebGLRenderer; private controls: SimpleOrbitControls;
  private shapes: THREE.Group = new THREE.Group(); private labelsGroup: THREE.Group = new THREE.Group(); private dimensionsGroup: THREE.Group = new THREE.Group(); private anglesGroup: THREE.Group = new THREE.Group(); private measureLineGroup: THREE.Group = new THREE.Group(); private previewLineGroup: THREE.Group = new THREE.Group(); private snapMarkersGroup: THREE.Group = new THREE.Group();
  private raycaster = new THREE.Raycaster(); private mouse = new THREE.Vector2();
  private isMeasuring = false; private snapPoints: { position: THREE.Vector3, type: string }[] = []; private activeSnapPoint: THREE.Vector3 | null = null; private measureStart: THREE.Vector3 | null = null; private highlightMesh: THREE.Mesh;
  private onMeasureChange: (distance: number | null) => void; private animationId: number = 0; private snowParticles: THREE.Points | null = null;

  constructor(container: HTMLElement, onMeasureChange: (d: number | null) => void) {
    this.container = container; this.onMeasureChange = onMeasureChange;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(COLORS.background); this.scene.fog = new THREE.FogExp2(COLORS.background, 0.015);
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); this.camera.position.set(24, 24, 24); 
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); this.renderer.setSize(window.innerWidth, window.innerHeight); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); this.renderer.shadowMap.enabled = true; container.appendChild(this.renderer.domElement);
    this.controls = new SimpleOrbitControls(this.camera, this.renderer.domElement);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6)); const dir = new THREE.DirectionalLight(0xffea00, 1.2); dir.position.set(10, 20, 10); dir.castShadow = true; this.scene.add(dir);
    this.scene.add(this.shapes, this.labelsGroup, this.dimensionsGroup, this.anglesGroup, this.measureLineGroup, this.previewLineGroup, this.snapMarkersGroup);
    const grid = new THREE.GridHelper(50, 50, COLORS.gridPrimary, COLORS.gridSecondary); grid.position.y = CONFIG.FLOOR_Y; this.scene.add(grid);
    this.setupSnow();
    this.highlightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false, transparent: true, opacity: 0.8 })); this.highlightMesh.visible = false; this.scene.add(this.highlightMesh);
    this.container.addEventListener('pointerdown', this.onPointerDown); this.container.addEventListener('pointermove', this.onPointerMove); this.container.addEventListener('touchstart', this.onTouchMove, { passive: false }); 
    this.animate();
  }
  private animate = () => { this.animationId = requestAnimationFrame(this.animate); this.controls.update(); this.updateSnow(); this.renderer.render(this.scene, this.camera); }
  public handleResize() { if (!this.container) return; const w = this.container.clientWidth; const h = this.container.clientHeight; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  public cleanup() { cancelAnimationFrame(this.animationId); this.controls.dispose(); this.container.removeEventListener('pointerdown', this.onPointerDown); this.container.removeEventListener('pointermove', this.onPointerMove); this.renderer.dispose(); }
  private setupSnow() { const geo = new THREE.BufferGeometry(); const count = 1500; const pos = new Float32Array(count * 3); for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 100; geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.snowParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: COLORS.snow, size: 0.3, transparent: true, opacity: 0.8 })); this.scene.add(this.snowParticles); }
  private updateSnow() { if(!this.snowParticles) return; const positions = this.snowParticles.geometry.attributes.position.array as Float32Array; for(let i=1; i<positions.length; i+=3) { positions[i] -= 0.05; if (positions[i] < -10) positions[i] = 40; } this.snowParticles.geometry.attributes.position.needsUpdate = true; }
  public loadScene(shapes: ShapeSpec[], labels: LabelSpec[], angles: AngleSpec[], dimensions: DimensionSpec[]) {
      this.shapes.clear(); this.labelsGroup.clear(); this.dimensionsGroup.clear(); this.anglesGroup.clear(); this.measureLineGroup.clear(); this.previewLineGroup.clear(); this.snapMarkersGroup.clear(); this.snapPoints = []; this.measureStart = null; this.onMeasureChange(null);
      shapes.forEach(spec => { const mesh = this.createShapeMesh(spec); this.shapes.add(mesh); this.generateSnapPoints(spec); });
      labels.forEach(l => this.createLabel(l)); dimensions.forEach(d => this.createDimension(d)); angles.forEach(a => this.createAngle(a));
      if (this.isMeasuring) this.showSnapMarkers();
  }
  private createShapeMesh(spec: ShapeSpec): THREE.Group {
      const group = new THREE.Group(); group.position.set(spec.position.x, spec.position.y, spec.position.z); group.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
      let geo: THREE.BufferGeometry;
      if (spec.type === 'cylinder') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 32); else if (spec.type === 'cone') geo = new THREE.ConeGeometry(spec.dims.radius, spec.dims.height, 32); else if (spec.type === 'sphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 32); else if (spec.type === 'pyramid') geo = new THREE.CylinderGeometry(0, spec.dims.radius, spec.dims.height, 4); else if (spec.type === 'hemisphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 16, 0, Math.PI*2, 0, Math.PI/2); else if (spec.type === 'tri_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 3); else if (spec.type === 'hex_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 6); else geo = new THREE.BoxGeometry(spec.dims.width, spec.dims.height, spec.dims.depth);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh, new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: COLORS.shapeLine, linewidth: 2 })));
      return group;
  }
  private generateSnapPoints(spec: ShapeSpec) {
      const dummy = new THREE.Object3D(); dummy.position.set(spec.position.x, spec.position.y, spec.position.z); dummy.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z); dummy.updateMatrix();
      const addPoint = (v: THREE.Vector3, t: string) => this.snapPoints.push({ position: v.clone().applyMatrix4(dummy.matrix), type: t });
      addPoint(new THREE.Vector3(0,0,0), 'center');
      if (spec.dims.height) { addPoint(new THREE.Vector3(0, spec.dims.height/2, 0), 'center_top'); addPoint(new THREE.Vector3(0, -spec.dims.height/2, 0), 'center_bottom'); }
      if (spec.dims.width) { const w = spec.dims.width/2, h = spec.dims.height/2, d = spec.dims.depth/2; [w,-w].forEach(x=>[h,-h].forEach(y=>[d,-d].forEach(z=>addPoint(new THREE.Vector3(x,y,z), 'vertex')))); }
      if (spec.dims.radius) { const r = spec.dims.radius, h = spec.dims.height?spec.dims.height/2:0; [[r,-h,0],[-r,-h,0],[0,-h,r],[0,-h,-r]].forEach(p=>addPoint(new THREE.Vector3(...p), 'rim')); if(['cylinder','hex_prism','tri_prism'].includes(spec.type)) [[r,h,0],[-r,h,0],[0,h,r],[0,h,-r]].forEach(p=>addPoint(new THREE.Vector3(...p), 'rim')); if(['sphere','hemisphere'].includes(spec.type)) [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]].forEach(p=>addPoint(new THREE.Vector3(...p), 'surface')); }
  }
  public setMeasuringMode(active: boolean) { this.isMeasuring = active; if (active) this.showSnapMarkers(); else { this.snapMarkersGroup.clear(); this.highlightMesh.visible = false; this.measureStart = null; this.measureLineGroup.clear(); this.previewLineGroup.clear(); this.onMeasureChange(null); } }
  private showSnapMarkers() { this.snapMarkersGroup.clear(); const g = new THREE.SphereGeometry(0.25), m = new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true, opacity: 0.6 }); this.snapPoints.forEach(pt => { const d = new THREE.Mesh(g, m); d.position.copy(pt.position); this.snapMarkersGroup.add(d); }); }
  public setAutoRotate(active: boolean) { this.controls.autoRotate = active; }
  private onPointerMove = (e: MouseEvent) => { this.updateMouse(e.clientX, e.clientY); this.checkSnapping(); }
  private onTouchMove = (e: TouchEvent) => { if (e.touches.length > 0) { this.updateMouse(e.touches[0].clientX, e.touches[0].clientY - 50); this.checkSnapping(); } }
  private updateMouse(x: number, y: number) { const rect = this.renderer.domElement.getBoundingClientRect(); this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1; this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1; }
  private checkSnapping() {
      if (!this.isMeasuring) return;
      this.raycaster.setFromCamera(this.mouse, this.camera); this.activeSnapPoint = null; this.highlightMesh.visible = false;
      let closestDist = Infinity, closestPoint: THREE.Vector3 | null = null;
      const intersects = this.raycaster.intersectObjects(this.shapes.children, true);
      if (intersects.length > 0) { closestPoint = intersects[0].point; closestDist = 0; }
      for(const pt of this.snapPoints) { if (closestPoint) { const d = pt.position.distanceTo(closestPoint); if (d < 1.5 && d < closestDist + 1) { this.activeSnapPoint = pt.position; break; } } }
      if (this.activeSnapPoint) { this.highlightMesh.position.copy(this.activeSnapPoint); this.highlightMesh.visible = true; this.renderer.domElement.style.cursor = 'crosshair'; this.previewLineGroup.clear(); if (this.measureStart) { const geo = new THREE.BufferGeometry().setFromPoints([this.measureStart, this.activeSnapPoint]); this.previewLineGroup.add(new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff1493, dashSize: 0.5, gapSize: 0.2, scale: 1, depthTest: false }))); } } else { this.renderer.domElement.style.cursor = 'default'; this.previewLineGroup.clear(); }
  }
  private onPointerDown = (e: MouseEvent) => {
      if (!this.isMeasuring || !this.activeSnapPoint) return;
      if (!this.measureStart) { this.measureStart = this.activeSnapPoint.clone(); this.measureLineGroup.clear(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false})); m.position.copy(this.measureStart); this.measureLineGroup.add(m); } 
      else { const end = this.activeSnapPoint.clone(); const dist = this.measureStart.distanceTo(end); this.previewLineGroup.clear(); this.measureLineGroup.clear(); const tube = new THREE.TubeGeometry(new THREE.LineCurve3(this.measureStart, end), 1, 0.3, 8, false); const mesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false })); const s = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false})); s.position.copy(this.measureStart); const e = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false})); e.position.copy(end); this.measureLineGroup.add(mesh, s, e); this.onMeasureChange(dist); this.measureStart = null; }
  }
  private createLabel(spec: LabelSpec) { const c = document.createElement('canvas'); const ctx = c.getContext('2d'); if(!ctx) return; c.width=256;c.height=128; ctx.fillStyle=spec.color||'#ffffff'; ctx.font='bold 40px Arial'; ctx.textAlign='center'; const p = spec.text.split('_'); ctx.fillText(p[0], 128, 64); if(p[1]) { ctx.font='bold 28px Arial'; ctx.fillText(p[1], 128+ctx.measureText(p[0]).width/2+10, 84); } const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.position.set(spec.position.x, spec.position.y, spec.position.z); s.scale.set(4, 2, 1); this.labelsGroup.add(s); }
  private createDimension(spec: DimensionSpec) { const s = new THREE.Vector3(spec.start.x, spec.start.y, spec.start.z), e = new THREE.Vector3(spec.end.x, spec.end.y, spec.end.z), o = new THREE.Vector3(spec.offset.x, spec.offset.y, spec.offset.z); const p1 = s.clone().add(o), p2 = e.clone().add(o); this.dimensionsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false })), new THREE.Line(new THREE.BufferGeometry().setFromPoints([s, p1]), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false })), new THREE.Line(new THREE.BufferGeometry().setFromPoints([e, p2]), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false }))); const mid = p1.clone().lerp(p2, 0.5).add(o.clone().normalize().multiplyScalar(0.5)); this.createLabel({ text: spec.text, position: {x:mid.x, y:mid.y, z:mid.z} }); }
  private createAngle(spec: AngleSpec) { const o = new THREE.Vector3(spec.origin.x, spec.origin.y, spec.origin.z), dA = new THREE.Vector3(spec.vecA.x, spec.vecA.y, spec.vecA.z).normalize(), dB = new THREE.Vector3(spec.vecB.x, spec.vecB.y, spec.vecB.z).normalize(), l = 1.5; if(dA.distanceTo(dB)<0.001)return; const m = new THREE.LineBasicMaterial({ color: 0xfacc15, depthTest: false }); this.anglesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dA.clone().multiplyScalar(l*1.5))]), m), new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dB.clone().multiplyScalar(l*1.5))]), m)); const pA = o.clone().add(dA.clone().multiplyScalar(l)), pB = o.clone().add(dB.clone().multiplyScalar(l)); const cl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pA, pB]), new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize:0.2, gapSize:0.1, depthTest:false })); cl.computeLineDistances(); this.anglesGroup.add(cl); const pos = o.clone().add(dA.clone().add(dB).normalize().multiplyScalar(l * 1.2)); this.createLabel({ text: spec.text || 'θ', position: {x:pos.x, y:pos.y, z:pos.z}, color: '#facc15' }); }
}

// ==========================================
// 7. COMPONENTS
// ==========================================

const CharacterAvatar: React.FC<{level?: number, avatarId: PlayerAvatarId, cosmetics: { hat: string, outfit: string }}> = ({ level = 1, avatarId, cosmetics }) => {
    const getTunicColor = (base: string) => { if (cosmetics.outfit === 'tunic_red') return '#dc2626'; if (cosmetics.outfit === 'tunic_blue') return '#2563eb'; if (cosmetics.outfit === 'tunic_green') return '#15803d'; return base; };
    const renderHat = (yOffset: number) => {
        if (cosmetics.hat === 'hat_santa') return (<g transform={`translate(0, ${yOffset})`}><path d="M20 25 C20 15 30 5 50 5 C70 5 80 15 80 25 L80 35 L20 35 Z" fill="#dc2626" /><circle cx="80" cy="35" r="8" fill="white" /><rect x="20" y="30" width="60" height="10" rx="5" fill="white" /></g>);
        if (cosmetics.hat === 'hat_blue') return (<g transform={`translate(0, ${yOffset})`}><path d="M25 25 C25 10 75 10 75 25 L75 35 L25 35 Z" fill="#3b82f6" /><circle cx="50" cy="8" r="8" fill="#93c5fd" /><rect x="25" y="30" width="50" height="8" rx="2" fill="#1d4ed8" /></g>);
        return null;
    };
    return (
        <div className="w-16 h-16 relative hover:scale-110 transition-transform cursor-pointer">
            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
                {avatarId === 'elf' && <><path d="M30 60 L70 60 L80 110 L20 110 Z" fill={getTunicColor('#166534')} /><path d="M50 60 L50 110" stroke="rgba(0,0,0,0.2)" strokeWidth="2" /><rect x="25" y="85" width="50" height="8" fill="#451a03" /><rect x="45" y="84" width="10" height="10" fill={level >= 5 ? "#fbbf24" : "#f59e0b"} stroke={level >= 10 ? "#fff" : "none"} strokeWidth="1"/><circle cx="50" cy="40" r="22" fill="#fecaca" /><path d="M28 40 L15 35 L28 45 Z" fill="#fecaca" /><path d="M72 40 L85 35 L72 45 Z" fill="#fecaca" /><circle cx="42" cy="38" r="3" fill="#1e293b" /><circle cx="58" cy="38" r="3" fill="#1e293b" /><path d="M45 50 Q50 55 55 50" stroke="#1e293b" strokeWidth="2" fill="none" />{cosmetics.hat === 'none' && <path d="M25 30 L50 5 L75 30 Z" fill={level >= 20 ? "#ca8a04" : "#166534"} />}{renderHat(0)}{level >= 10 && <path d="M35 60 Q50 75 65 60" fill="none" stroke="#fbbf24" strokeWidth="3" />}</>}
                {avatarId === 'elf_female' && <><path d="M25 40 Q20 80 30 90 L70 90 Q80 80 75 40" fill="#fcd34d" /><path d="M35 60 L65 60 L75 110 L25 110 Z" fill={getTunicColor('#0d9488')} /><rect x="30" y="80" width="40" height="6" fill="#f59e0b" /><circle cx="50" cy="40" r="20" fill="#fecaca" /><path d="M30 35 L20 25 L32 40 Z" fill="#fecaca" /><path d="M70 35 L80 25 L68 40 Z" fill="#fecaca" /><path d="M38 38 Q42 35 45 38" stroke="#1e293b" strokeWidth="2" fill="none" /><path d="M37 38 L35 36" stroke="#1e293b" strokeWidth="1" /><path d="M55 38 Q58 35 62 38" stroke="#1e293b" strokeWidth="2" fill="none" /><path d="M63 38 L65 36" stroke="#1e293b" strokeWidth="1" /><path d="M45 48 Q50 52 55 48" stroke="#be123c" strokeWidth="2" fill="none" /><rect x="25" y="50" width="10" height="30" rx="5" fill="#fcd34d" /><rect x="65" y="50" width="10" height="30" rx="5" fill="#fcd34d" />{cosmetics.hat === 'none' && <path d="M30 30 L50 2 L70 30 Z" fill={level >= 20 ? "#ca8a04" : "#0d9488"} />}{renderHat(-5)}{level >= 5 && <circle cx="50" cy="65" r="4" fill="#fbbf24" stroke="#fff" strokeWidth="1" />}</>}
                {avatarId === 'snowman' && <><circle cx="50" cy="90" r="25" fill="white" stroke="#e2e8f0" strokeWidth="2" /><circle cx="50" cy="55" r="20" fill="white" stroke="#e2e8f0" strokeWidth="2" /><circle cx="50" cy="25" r="15" fill="white" stroke="#e2e8f0" strokeWidth="2" /><circle cx="45" cy="22" r="2" fill="black" /><circle cx="55" cy="22" r="2" fill="black" /><path d="M50 25 L65 28 L50 31 Z" fill="#f97316" /><circle cx="50" cy="50" r="2" fill={level >= 10 ? "#facc15" : "#1e293b"} /><circle cx="50" cy="60" r="2" fill={level >= 10 ? "#facc15" : "#1e293b"} />{level >= 5 && <path d="M35 45 Q50 55 65 45" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />}{level >= 10 && <circle cx="55" cy="22" r="4" fill="none" stroke="#facc15" strokeWidth="1" />}{renderHat(-15)}</>}
                {avatarId === 'penguin' && <><ellipse cx="50" cy="65" rx="30" ry="40" fill="#1e293b" /><ellipse cx="50" cy="70" rx="20" ry="30" fill="white" /><circle cx="40" cy="50" r="4" fill="white" /><circle cx="40" cy="50" r="1.5" fill="black" /><circle cx="60" cy="50" r="4" fill="white" /><circle cx="60" cy="50" r="1.5" fill="black" />{level >= 10 && <g><rect x="35" y="46" width="12" height="6" fill="black" /><rect x="53" y="46" width="12" height="6" fill="black" /><line x1="47" y1="49" x2="53" y2="49" stroke="black" strokeWidth="2" /></g>}<path d="M45 55 L55 55 L50 65 Z" fill="#f59e0b" /><path d="M30 100 Q20 100 25 90 L35 95 Z" fill="#f59e0b" /><path d="M70 100 Q80 100 75 90 L65 95 Z" fill="#f59e0b" />{level >= 5 && <path d="M40 75 L60 75 L40 85 L60 85 Z" fill="#ef4444" />}{renderHat(15)}</>}
            </svg>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm">{level}</div>
        </div>
    );
};

const FormulaModal: React.FC<{isOpen: boolean; onClose: () => void}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-2 border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-indigo-100 text-indigo-600"><BookOpen size={24} strokeWidth={2.5} /></div><div><h2 className="text-xl font-extrabold text-slate-800">IB Formula Booklet</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Math SL Reference</p></div></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {FORMULAS.map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                    <h3 className="font-bold text-slate-800 mb-2">{f.name}</h3><div className="grid grid-cols-1 gap-2 text-sm"><div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg"><span className="font-semibold text-slate-500 text-xs uppercase">Volume</span><span className="font-serif italic font-bold text-indigo-700">{f.volume}</span></div><div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg"><span className="font-semibold text-slate-500 text-xs uppercase">Surface Area</span><span className="font-serif italic font-bold text-indigo-700">{f.sa}</span></div></div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<{isOpen: boolean; onClose: () => void; settings: any; onUpdate: any}> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-3xl"><div className="flex items-center gap-2"><Settings size={20} className="text-slate-400" /><h2 className="text-lg font-bold text-white">Settings</h2></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X size={20} /></button></div>
        <div className="p-6 space-y-6">
            <div className="space-y-2"><div className="flex justify-between text-sm font-bold text-slate-300"><span className="flex items-center gap-2"><Volume2 size={16}/> Master Volume</span><span>{Math.round(settings.masterVolume * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={settings.masterVolume} onChange={(e) => onUpdate('master', parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"/></div>
            <div className="space-y-2"><div className="flex justify-between text-sm font-bold text-slate-300"><span className="flex items-center gap-2"><Music size={16}/> Music</span><span>{Math.round(settings.bgmVolume * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={settings.bgmVolume} onChange={(e) => onUpdate('bgm', parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/></div>
            <div className="space-y-2"><div className="flex justify-between text-sm font-bold text-slate-300"><span className="flex items-center gap-2"><Speaker size={16}/> Sound FX</span><span>{Math.round(settings.sfxVolume * 100)}%</span></div><input type="range" min="0" max="1" step="0.05" value={settings.sfxVolume} onChange={(e) => onUpdate('sfx', parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/></div>
        </div>
      </div>
    </div>
  );
};

const ShopModal: React.FC<{isOpen: boolean; onClose: () => void; playerState: PlayerState; onBuy: (item: ShopItem) => void}> = ({ isOpen, onClose, playerState, onBuy }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'consumable' | 'passive' | 'cosmetic'>('all');
  if (!isOpen) return null;
  const filteredItems = SHOP_ITEMS.filter(item => activeTab === 'all' ? true : item.type === activeTab);
  const tabs = [{ id: 'all', label: 'All' }, { id: 'consumable', label: 'Items' }, { id: 'passive', label: 'Perks' }, { id: 'cosmetic', label: 'Style' }] as const;
  const inventoryCounts = playerState.inventory.reduce((acc, itemId) => { acc[itemId] = (acc[itemId] || 0) + 1; return acc; }, {} as Record<string, number>);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-500/20 text-amber-500"><ShoppingBag size={20} strokeWidth={2.5} /></div><div><h2 className="text-lg font-extrabold text-white leading-tight">Supply Depot</h2><div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm"><span>🪙 {playerState.gold}</span>{playerState.isDeveloperMode && <span className="text-xs bg-rose-500 text-white px-2 rounded">DEV</span>}</div></div></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="flex p-2 gap-1 overflow-x-auto shrink-0 border-b border-slate-700/50 scrollbar-hide">
            {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'}`}>{tab.label}</button>))}
        </div>
        <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
            {filteredItems.map((item) => {
                const currentLevel = playerState.activePassives[item.id] || 0;
                const maxLevel = item.maxLevel || 1;
                const ownedCount = inventoryCounts[item.id] || 0;
                let cost = item.cost;
                if (item.type === 'passive' && item.costMultiplier && currentLevel > 0) cost = Math.floor(item.cost * Math.pow(item.costMultiplier, currentLevel));
                if (playerState.isDeveloperMode) cost = 0;
                const canAfford = playerState.gold >= cost;
                const isMaxed = currentLevel >= maxLevel;
                const isCosmeticOwned = item.type === 'cosmetic' && (playerState.cosmetics.hat === item.effectId || playerState.cosmetics.outfit === item.effectId || (playerState.inventory.includes(item.id)));
                const isDisabled = isMaxed || (isCosmeticOwned) || !canAfford;
                return (
                    <div key={item.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-700 flex items-center gap-3 hover:bg-slate-700/60 transition-colors">
                        <div className="relative w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-2xl shrink-0 border border-slate-600/50">{item.icon}{item.type === 'passive' && (<div className="absolute -bottom-1 -right-1 bg-slate-900 text-[10px] px-1 rounded border border-slate-600 font-mono text-slate-300">{currentLevel}/{maxLevel}</div>)}{ownedCount > 0 && item.type === 'consumable' && (<div className="absolute -top-1 -left-1 bg-indigo-500 text-white text-[9px] font-bold px-1 rounded-full border border-slate-800">{ownedCount}</div>)}</div>
                        <div className="flex-1 min-w-0"><h3 className="text-slate-100 font-bold text-sm truncate">{item.name}</h3><p className="text-slate-400 text-xs truncate">{item.description}</p></div>
                        <button onClick={() => onBuy(item)} disabled={isDisabled} className={`h-9 px-3 min-w-[80px] rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0 ${isMaxed || isCosmeticOwned ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-900/50 cursor-default' : canAfford ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/10' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>{isMaxed || isCosmeticOwned ? (<Check size={14} strokeWidth={3} />) : (<>{!canAfford && <Lock size={12} />}{cost}</>)}</button>
                    </div>
                );
            })}
            {filteredItems.length === 0 && (<div className="text-center py-8 text-slate-500 text-sm italic">No items in this category.</div>)}
        </div>
      </div>
    </div>
  );
};

const SideButton: React.FC<{ onClick: () => void, active?: boolean, icon: React.ReactNode, label: string, color: 'slate'|'amber'|'indigo' }> = ({ onClick, active, icon, label, color }) => {
  const styles = { slate: active ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/80 text-white hover:bg-slate-700', amber: active ? 'bg-amber-500 text-slate-900' : 'bg-slate-800/80 text-amber-400 hover:bg-slate-700', indigo: active ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-indigo-400 hover:bg-slate-700' }
  return (<div className="flex flex-col items-center gap-1 group"><button onClick={onClick} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xl border border-slate-600/50 backdrop-blur ${styles[color]} ${active ? 'scale-95 ring-2 ring-white/20' : 'hover:scale-105'}`}>{icon}</button><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{label}</span></div>);
};

const UIOverlay: React.FC<any> = ({ gamePhase, currentProblem, isAutoRotate, isMeasuring, measuredDistance, quizState, playerState, onToggleRotation, onToggleMeasure, onOpenFormulas, onOpenShop, onOpenSettings, onUseItem, setQuizAnswer, onQuizSubmit, onResetGame, onNextLevel }) => {
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  const currentStage = currentProblem ? currentProblem.stages[quizState.currentStageIndex] : null;
  const bossProgress = currentProblem ? 1 - (quizState.currentStageIndex / currentProblem.stages.length) : 0;
  const isBoss = currentProblem?.isBoss;
  const inventoryCounts = playerState.inventory.reduce((acc: any, itemId: any) => { acc[itemId] = (acc[itemId] || 0) + 1; return acc; }, {} as Record<string, number>);
  const to3SF = (num: number) => parseFloat(num.toPrecision(3));
  const lootItem = playerState.latestLoot ? SHOP_ITEMS.find(i => i.id === playerState.latestLoot) : null;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none font-sans overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-transparent">
        <div className="flex justify-between items-start">
            <div onClick={onOpenShop} className="pointer-events-auto flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform active:scale-95 group" title="Open Inventory">
                <div className="scale-75 origin-top-left -mr-2 drop-shadow-md group-hover:drop-shadow-xl transition-all"><CharacterAvatar level={playerState.level} avatarId={playerState.avatarId} cosmetics={playerState.cosmetics} /></div>
                <div className="bg-slate-900/60 backdrop-blur px-3 py-1 rounded-full border border-slate-700/50 shadow-sm flex items-center gap-2 text-amber-400 font-bold font-mono text-sm group-hover:border-amber-500/50 transition-colors"><span>🪙 {playerState.gold}</span></div>
            </div>
            <div className="flex-1 max-w-md mx-4 mt-2 flex flex-col items-center gap-2">
                 {gamePhase !== 'intermission' && gamePhase !== 'gameover' && (
                     <>
                        {isBoss && (<div className="w-full animate-in slide-in-from-top-4"><div className={`font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 mb-1 ${currentProblem?.bossType === 'mini' ? 'text-amber-500' : 'text-rose-500'}`}><Skull size={14}/> {currentProblem?.bossType === 'mini' ? 'MINI BOSS' : 'ACT BOSS'}: {currentProblem?.bossName}</div><div className="w-full h-4 bg-slate-800 rounded-full border border-rose-900/50 overflow-hidden relative shadow-lg"><div className={`h-full transition-all duration-500 ease-out ${currentProblem?.bossType === 'mini' ? 'bg-amber-600' : 'bg-rose-600'}`} style={{ width: `${bossProgress * 100}%` }} /></div></div>)}
                        <div className={`flex items-center gap-2 justify-center transition-all ${quizState.timeLeft < 10 ? 'scale-110' : ''}`}><Clock size={16} className={quizState.timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'} /><div className="w-24 h-2 bg-slate-800 rounded-full border border-slate-700 overflow-hidden"><div className={`h-full transition-all duration-1000 ease-linear ${quizState.timeLeft < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(quizState.timeLeft / playerState.stats.baseTime) * 100}%` }} /></div><span className={`font-mono font-bold text-sm ${quizState.timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{quizState.timeLeft}s</span></div>
                     </>
                 )}
            </div>
            <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1 bg-slate-900/60 backdrop-blur px-2 py-1.5 rounded-full border border-slate-700/50 shadow-sm items-center">
                    {[...Array(playerState.maxLives)].map((_, i) => (<Heart key={i} size={20} className={`transition-all duration-300 ${i < playerState.lives ? 'fill-red-500 text-red-600 drop-shadow-md' : 'fill-slate-800 text-slate-900'}`} />))}
                    <div className="w-[1px] h-4 bg-slate-700 mx-2"></div><button onClick={onOpenSettings} className="pointer-events-auto text-slate-400 hover:text-white transition-colors"><Settings size={18} /></button>
                </div>
                {Object.keys(inventoryCounts).length > 0 && (<div className="pointer-events-auto flex gap-1 mt-1 flex-wrap justify-end max-w-[200px] overflow-x-auto scrollbar-hide py-1 pr-1">{Object.entries(inventoryCounts).map(([itemId, rawCount], idx) => { const count = rawCount as number; const itemDef = SHOP_ITEMS.find(i => i.id === itemId); if (!itemDef || itemDef.type !== 'consumable') return null; return (<button key={idx} onClick={() => onUseItem(itemId)} className="relative w-10 h-10 bg-slate-800/80 border border-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-xl shadow-lg shrink-0 group" title={itemDef.name}>{itemDef.icon}{count > 1 && (<div className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-slate-900 shadow-sm z-10 group-hover:scale-110 transition-transform">{count}</div>)}</button>) })}</div>)}
            </div>
        </div>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-20">
            <SideButton onClick={onOpenShop} icon={<ShoppingBag size={20} />} label="Shop" color="indigo" /><SideButton onClick={onOpenFormulas} icon={<BookOpen size={20} />} label="Rules" color="slate" /><div className="h-4" /><SideButton onClick={onToggleMeasure} active={isMeasuring} icon={<Ruler size={20} />} label="Measure" color="amber" />
      </div>
      {gamePhase === 'intermission' && lootItem && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-1 rounded-3xl shadow-2xl animate-in zoom-in duration-300 scale-110">
                  <div className="bg-slate-900 rounded-3xl p-6 text-center max-w-sm"><h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wider animate-bounce">Boss Loot!</h2><div className="text-6xl mb-4 filter drop-shadow-lg">{lootItem.icon}</div><h3 className="text-xl font-bold text-amber-400">{lootItem.name}</h3><p className="text-slate-400 text-sm mb-6">{lootItem.description}</p><button onClick={onOpenShop} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl shadow-lg uppercase tracking-wide">Open Wardrobe</button></div>
              </div>
          </div>
      )}
      <div className={`absolute bottom-0 left-0 right-0 z-30 pointer-events-auto transition-transform duration-300 ease-in-out ${isQuestionCollapsed ? 'translate-y-[calc(100%-60px)]' : 'translate-y-0'}`}>
          <div className="max-w-md mx-auto sm:mr-auto sm:ml-4 sm:mb-4 sm:w-80 w-full">
            <div className={`backdrop-blur-xl border-t sm:border shadow-2xl overflow-hidden flex flex-col text-slate-100 ${isBoss ? 'bg-rose-950/90 border-rose-700' : 'bg-slate-900/95 border-slate-700'} sm:rounded-2xl`}>
                <div onClick={() => setIsQuestionCollapsed(!isQuestionCollapsed)} className="p-3 border-b border-white/10 flex items-center justify-between cursor-pointer active:bg-white/5"><div className="flex items-center gap-2">{isBoss ? (<div className={`w-2 h-2 rounded-full animate-ping ${currentProblem?.bossType === 'mini' ? 'bg-amber-500' : 'bg-rose-500'}`} />) : (<Calculator size={16} className="text-emerald-400" />)}<span className={`font-bold text-xs uppercase tracking-wide ${isBoss ? 'text-rose-400' : 'text-emerald-400'}`}>{gamePhase === 'intermission' ? 'Rest Area' : isBoss ? (currentProblem?.bossType === 'mini' ? 'Mini Boss' : 'Boss Fight') : `Problem #${playerState.level}`}</span></div>{isQuestionCollapsed ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}</div>
                <div className="p-4 pt-2">
                    {gamePhase === 'gameover' ? (
                        <div className="text-center py-4"><h3 className="font-bold text-xl text-white mb-1">Run Ended!</h3><div className="my-4 bg-rose-950/50 border border-rose-900/50 p-3 rounded-xl"><p className="text-xs text-rose-300 uppercase font-bold mb-1">The Correct Answer Was</p><p className="text-3xl font-mono font-black text-rose-400">{to3SF(currentStage?.answer || 0)}<span className="text-sm ml-1 opacity-50">{currentStage?.unit}</span></p></div><button onClick={onResetGame} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2"><RefreshCw size={18}/> New Run</button></div>
                    ) : gamePhase === 'intermission' ? (
                        <div className="text-center py-2 space-y-3"><div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-3"><h3 className="font-bold text-emerald-400">Level Complete!</h3></div><button onClick={onNextLevel} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pulse">Next Level <ArrowRight size={18}/></button></div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">{isBoss && <div className="text-2xl animate-bounce-slow filter drop-shadow-md grayscale-0">{currentProblem?.bossAvatar}</div>}<p className="text-sm font-medium leading-relaxed text-slate-200 pt-1">{currentStage?.question || "Loading..."}</p></div>
                            {isMeasuring && (<div className="bg-amber-950/40 border border-amber-900/50 rounded-lg p-3 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2"><span className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1"><Ruler size={14}/> Measured</span><span className="font-mono font-black text-xl text-amber-400">{measuredDistance !== null ? measuredDistance.toFixed(3) : '--'}<span className="text-xs text-amber-600 ml-1">u</span></span></div>)}
                            <div className="flex gap-2 items-stretch h-12"><div className="relative flex-1"><input type="text" inputMode="decimal" value={quizState.userAnswer} onChange={(e) => setQuizAnswer(e.target.value)} disabled={quizState.feedback === 'correct' || quizState.feedback === 'stage_complete'} className="w-full h-full bg-slate-800 border border-slate-600 rounded-xl px-3 font-mono text-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 text-center" placeholder={playerState.isDeveloperMode ? `${to3SF(currentStage?.answer || 0)}` : "?"} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{currentStage?.unit}</span></div>{quizState.feedback === 'correct' ? (<button onClick={onNextLevel} className="px-6 bg-emerald-500 text-slate-900 font-bold rounded-xl shadow-lg flex items-center gap-2 animate-in zoom-in">Next <Wand2 size={18} /></button>) : quizState.feedback === 'stage_complete' ? (<div className="px-6 bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg flex items-center gap-2 animate-in zoom-in whitespace-nowrap">Wait...</div>) : (<button onClick={onQuizSubmit} disabled={!quizState.userAnswer} className="px-6 bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-colors">Submit</button>)}</div>
                            {quizState.feedback !== 'idle' && (<div className={`text-center font-black text-lg animate-in slide-in-from-bottom-2 ${quizState.feedback === 'correct' || quizState.feedback === 'stage_complete' ? 'text-emerald-400' : quizState.feedback === 'timeout' ? 'text-rose-500 uppercase' : 'text-rose-400'}`}>{quizState.feedback === 'correct' ? 'EXCELLENT!' : quizState.feedback === 'stage_complete' ? 'BOSS DAMAGED!' : quizState.feedback === 'timeout' ? 'TIME UP!' : 'INCORRECT'}</div>)}
                        </div>
                    )}
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<any> = ({ visible, lives, gold, highScore, onStart, onDevUnlock }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<PlayerAvatarId>('elf');
  const [showDevInput, setShowDevInput] = useState(false);
  const [devPass, setDevPass] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(gold > 10000); 
  useEffect(() => { if (gold > 10000) setIsUnlocked(true); }, [gold]);
  const avatars: {id: PlayerAvatarId, name: string, desc: string, perk: string}[] = [
      { id: 'elf', name: 'Apprentice Elf', desc: 'The classic builder.', perk: 'Balanced Stats' },
      { id: 'elf_female', name: 'Scout Elf', desc: 'Sharp eyes for gold.', perk: '+20% Gold Gain' },
      { id: 'snowman', name: 'Frosty', desc: 'Summer vibes only.', perk: '+15s Timer & Chill Music' },
      { id: 'penguin', name: 'Skipper', desc: 'Sliding through danger.', perk: '+1 Max Life' },
  ];
  const currentIndex = avatars.findIndex(a => a.id === selectedAvatar);
  const cycleAvatar = (dir: 1 | -1) => { let newIndex = currentIndex + dir; if (newIndex < 0) newIndex = avatars.length - 1; if (newIndex >= avatars.length) newIndex = 0; setSelectedAvatar(avatars[newIndex].id); };
  const handleDevSubmit = (e: React.FormEvent) => { e.preventDefault(); if (devPass === 'xmas' && onDevUnlock) { onDevUnlock(); setShowDevInput(false); setIsUnlocked(true); } else { setDevPass(''); alert("Wrong password!"); } };
  return (
    <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 select-none bg-slate-950/95 backdrop-blur-xl transition-all duration-500 ease-out transform font-sans ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col items-center w-full max-w-md p-6 relative">
        <div className="absolute top-0 w-full flex justify-between items-center py-4 px-6 opacity-80"><div className="flex gap-4"><div className="flex items-center gap-2 text-rose-400 font-bold bg-rose-950/50 px-3 py-1 rounded-full border border-rose-900/50"><Heart size={16} fill="currentColor" /> {lives}</div><div className="flex items-center gap-2 text-amber-400 font-bold bg-amber-950/50 px-3 py-1 rounded-full border border-amber-900/50"><Coins size={16} fill="currentColor" /> {gold}</div><div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-900/50"><Trophy size={16} fill="currentColor" /> BEST: {highScore > 9999 ? '∞' : highScore}</div></div><button onClick={() => setShowDevInput(!showDevInput)} className="text-slate-600 hover:text-slate-400 transition-colors">{isUnlocked ? <Unlock size={16} className="text-emerald-500" /> : <Lock size={16} />}</button></div>
        {showDevInput && (<div className="absolute top-16 right-6 z-50 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl animate-in slide-in-from-top-2"><form onSubmit={handleDevSubmit} className="flex gap-2"><input type="password" value={devPass} onChange={(e) => setDevPass(e.target.value)} placeholder="Password..." className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs w-24 outline-none focus:ring-1 focus:ring-amber-500"/><button type="submit" className="bg-amber-500 text-slate-900 font-bold px-2 rounded text-xs">OK</button></form></div>)}
        <div className="mt-8 text-center space-y-2 mb-8"><h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-200 tracking-tight drop-shadow-sm">VOXEL<br/>WORKSHOP</h1><p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Santa's Roguelite Math Quest</p></div>
        <div className="w-full relative h-64 flex items-center justify-center mb-8"><div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-75 animate-pulse"></div><button onClick={() => cycleAvatar(-1)} className="absolute left-0 p-4 text-slate-500 hover:text-white transition-all hover:scale-110 z-10"><ChevronLeft size={40} /></button><div className="flex flex-col items-center z-0 scale-125"><div className="w-32 h-32 mb-4 drop-shadow-2xl filter brightness-110"><CharacterAvatar level={1} avatarId={selectedAvatar} cosmetics={{hat:'none', outfit:'none'}} /></div><div className="text-center space-y-1"><h2 className="text-2xl font-bold text-white">{avatars[currentIndex].name}</h2><p className="text-sm text-slate-400">{avatars[currentIndex].desc}</p><div className="inline-block bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/50 mt-1">PASSIVE: {avatars[currentIndex].perk}</div></div></div><button onClick={() => cycleAvatar(1)} className="absolute right-0 p-4 text-slate-500 hover:text-white transition-all hover:scale-110 z-10"><ChevronRight size={40} /></button></div>
        <button onClick={() => onStart(selectedAvatar)} className="group relative w-full max-w-xs py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 active:translate-y-1"><div className="bg-white/20 p-1 rounded-full group-hover:bg-white/30 transition-colors"><Play size={20} fill="currentColor" className="ml-0.5"/></div>START RUN</button>
        <div className="mt-6 text-[10px] text-slate-600 font-medium uppercase tracking-widest">v 7.1.0 • Persistent Progression</div>
      </div>
    </div>
  );
};

// ==========================================
// 8. APP ROOT
// ==========================================

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
    constructor(props: {children: ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
    render() { if (this.state.hasError) return <div className="p-4 bg-red-900 text-white">Critical Error: V1.1 Crash</div>; return this.props.children; }
}

const AppContent = () => {
    const SAVE_KEY = 'voxel_math_save_v8_persistent';
    const loadInit = () => { try { const saved = localStorage.getItem(SAVE_KEY); if (saved) { const parsed = JSON.parse(saved); if (parsed.version !== INITIAL_PLAYER_STATE.version) return initialGameState; if (!parsed.settings) parsed.settings = INITIAL_PLAYER_STATE.settings; return { ...initialGameState, player: parsed }; } } catch(e) {} return initialGameState; };
    const [state, dispatch] = useReducer(gameReducer, loadInit());
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isFormulaOpen, setIsFormulaOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
    const [isAutoRotate, setIsAutoRotate] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<GeometryEngine | null>(null);

    useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(state.player)); }, [state.player]);
    useEffect(() => { const init = async () => { await audio.load(AUDIO_MANIFEST); if (state.phase === 'welcome') audio.playBGM('bgm_workshop'); }; init(); const unlock = () => { audio.resume(); window.removeEventListener('click', unlock); }; window.addEventListener('click', unlock); return () => window.removeEventListener('click', unlock); }, []);
    useEffect(() => { const s = state.player.settings; audio.setVolumes(s.masterVolume, s.bgmVolume, s.sfxVolume); }, [state.player.settings]);
    useEffect(() => { if (!containerRef.current) return; const engine = new GeometryEngine(containerRef.current, (dist) => { setMeasuredDistance(dist); if (dist !== null) audio.playSFX('snap'); }); engineRef.current = engine; const resize = () => engine.handleResize(); window.addEventListener('resize', resize); return () => { window.removeEventListener('resize', resize); engine.cleanup(); }; }, []);
    useEffect(() => { if (state.phase === 'playing' && state.currentProblem && engineRef.current) { engineRef.current.loadScene(state.currentProblem.shapes, state.currentProblem.labels||[], state.currentProblem.angles||[], state.currentProblem.dimensions||[]); let track = 'bgm_workshop'; if (state.currentProblem.isBoss) { const theme = state.currentProblem.bossMusicTheme || 'bgm_boss'; track = theme.startsWith('bgm_') ? theme : `bgm_${theme}`; } else if (state.player.avatarId === 'snowman') { track = 'bgm_summer'; } audio.playBGM(track as any); } else if (state.phase === 'gameover') { audio.playSFX('gameover_sfx'); audio.playBGM('bgm_gameover'); } else if (state.phase === 'welcome') { audio.playBGM('bgm_workshop'); } }, [state.currentProblem, state.phase]);
    useEffect(() => { const timer = setInterval(() => { if (state.phase === 'playing' && state.quiz.timerActive) dispatch({type: 'TICK_TIMER'}); }, 1000); return () => clearInterval(timer); }, [state.phase, state.quiz.timerActive]);
    useEffect(() => { if (state.phase === 'playing' && state.quiz.timerActive && state.quiz.timeLeft <= 10 && state.quiz.timeLeft > 0) { const pitch = 0.8 + ((10 - state.quiz.timeLeft) * 0.05); audio.playSFX('clock_tick', { rate: pitch, volume: 0.5 }); } }, [state.quiz.timeLeft, state.phase]);
    useEffect(() => { if (state.quiz.feedback === 'correct') { const isBossKill = state.phase === 'intermission' && state.currentProblem?.isBoss; audio.playSFX(isBossKill ? 'victory_boss' : 'correct'); } if (state.quiz.feedback === 'incorrect') audio.playSFX('wrong'); if (state.quiz.feedback === 'stage_complete') { audio.playSFX('damage_boss'); setTimeout(() => dispatch({type: 'RESET_FEEDBACK'}), 1500); } if (state.quiz.feedback === 'level_complete' && !state.currentProblem?.isBoss) { audio.playSFX('level_up'); } }, [state.quiz.feedback]);
    const prevLives = useRef(state.player.lives); useEffect(() => { if (state.player.lives < prevLives.current) audio.playSFX('damage_take'); prevLives.current = state.player.lives; }, [state.player.lives]);

    const handleStartGame = (id: any) => { audio.resume(); audio.stopBGM(100); audio.playSFX('ui_click'); setTimeout(() => { dispatch({type: 'START_GAME', avatarId: id}); }, 50); };
    const isSnowman = state.player.avatarId === 'snowman' && state.phase !== 'welcome';

    return (
        <div className={`relative w-full h-screen bg-slate-900 text-white overflow-hidden transition-all duration-1000 ${isSnowman ? 'backdrop-hue-rotate-180 brightness-125 contrast-125' : ''}`}>
            <div ref={containerRef} className="absolute inset-0" />
            <UIOverlay gamePhase={state.phase} currentProblem={state.currentProblem} isAutoRotate={isAutoRotate} isMeasuring={isMeasuring} measuredDistance={measuredDistance} quizState={state.quiz} playerState={state.player} onToggleRotation={() => { setIsAutoRotate(!isAutoRotate); engineRef.current?.setAutoRotate(!isAutoRotate); audio.playSFX('ui_click'); }} onToggleMeasure={() => { setIsMeasuring(!isMeasuring); engineRef.current?.setMeasuringMode(!isMeasuring); audio.playSFX('ui_click'); }} onOpenFormulas={() => { setIsFormulaOpen(true); audio.playSFX('ui_open'); }} onOpenShop={() => { setIsShopOpen(true); audio.playSFX('ui_open'); }} onOpenSettings={() => { setIsSettingsOpen(true); audio.playSFX('ui_open'); }} onUseItem={(id: any) => { audio.playSFX('buy'); dispatch({type: 'USE_ITEM', itemId: id}); }} setQuizAnswer={(v: any) => dispatch({type: 'SET_ANSWER', value: v})} onQuizSubmit={() => dispatch({type: 'SUBMIT_ANSWER'})} onResetGame={() => dispatch({type: 'RESET_GAME'})} onNextLevel={() => dispatch({type: 'NEXT_LEVEL'})} />
            <WelcomeScreen visible={state.phase === 'welcome'} lives={state.player.lives} gold={state.player.gold} highScore={state.player.highScore} onStart={handleStartGame} onDevUnlock={() => dispatch({type: 'DEV_UNLOCK'})} />
            <ShopModal isOpen={isShopOpen} onClose={() => { setIsShopOpen(false); audio.playSFX('ui_close'); }} playerState={state.player} onBuy={(item: any) => { if (item.type === 'cosmetic' && (state.player.cosmetics.hat === item.effectId || state.player.cosmetics.outfit === item.effectId || state.player.inventory.includes(item.id))) { dispatch({type: 'EQUIP_ITEM', item}); audio.playSFX('ui_click'); } else { audio.playSFX('buy'); dispatch({type: 'BUY_ITEM', item}); } }} />
            <FormulaModal isOpen={isFormulaOpen} onClose={() => { setIsFormulaOpen(false); audio.playSFX('ui_close'); }} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => { setIsSettingsOpen(false); audio.playSFX('ui_close'); }} settings={state.player.settings} onUpdate={(c: any, v: any) => dispatch({type: 'SET_VOLUME', category: c, value: v})} />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<ErrorBoundary><AppContent /></ErrorBoundary>);
}