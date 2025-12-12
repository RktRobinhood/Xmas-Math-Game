/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { PlayerState, QuizState, GamePhase, Problem, PlayerAvatarId, ShopItem } from '../types';
import { ProblemGenerator } from './ibQuestions';

// Initial States
export const INITIAL_PLAYER_STATE: PlayerState = {
    version: 7,
    isDeveloperMode: false,
    avatarId: 'elf',
    level: 1,
    highScore: 1,
    xp: 0,
    gold: 0,
    lives: 2,
    maxLives: 2,
    streak: 0,
    difficultyRating: 1.0,
    inventory: [],
    activePassives: {},
    cosmetics: { hat: 'none', outfit: 'none' },
    stats: {
        toleranceMultiplier: 1.0,
        measureSnap: 1.0,
        baseTime: 60,
        goldMultiplier: 1.0,
        bossDamageMultiplier: 1.0
    },
    settings: {
        masterVolume: 0.6,
        bgmVolume: 0.8,
        sfxVolume: 1.0
    },
    latestLoot: undefined
};

export const INITIAL_QUIZ_STATE: QuizState = {
    userAnswer: '',
    currentStageIndex: 0,
    feedback: 'idle',
    timeLeft: 60,
    timerActive: false
};

export interface GameState {
    player: PlayerState;
    quiz: QuizState;
    phase: GamePhase;
    currentProblem: Problem | null;
}

export const initialGameState: GameState = {
    player: INITIAL_PLAYER_STATE,
    quiz: INITIAL_QUIZ_STATE,
    phase: 'welcome',
    currentProblem: null
};

// Actions
export type GameAction = 
    | { type: 'LOAD_SAVE'; payload: PlayerState }
    | { type: 'START_GAME'; avatarId: PlayerAvatarId }
    | { type: 'RESET_GAME' }
    | { type: 'TICK_TIMER' }
    | { type: 'SET_ANSWER'; value: string }
    | { type: 'SUBMIT_ANSWER' }
    | { type: 'RESET_FEEDBACK' } 
    | { type: 'NEXT_LEVEL' }
    | { type: 'BUY_ITEM'; item: ShopItem }
    | { type: 'EQUIP_ITEM'; item: ShopItem }
    | { type: 'USE_ITEM'; itemId: string }
    | { type: 'DEV_UNLOCK' }
    | { type: 'SET_VOLUME'; category: 'master' | 'bgm' | 'sfx'; value: number };

// Helper to apply avatar bonuses
const applyAvatarStats = (player: PlayerState, avatarId: PlayerAvatarId): PlayerState => {
    // Clone stats to avoid mutation
    const stats = { ...player.stats };
    let maxLives = player.maxLives;
    
    // Reset temporary avatar buffs (simple approach: assume current stats include previous avatar buffs if we didn't reset, 
    // but in this flow we are mostly additive or fresh start. Ideally we'd recalc from base + items + avatar)
    // For now, we just add the bonus on top of whatever persistent item stats exist.
    
    // 1. Scout Elf: Gold Bonus
    if (avatarId === 'elf_female') {
        stats.goldMultiplier += 0.2;
    }
    
    // 2. Snowman: Time Bonus
    if (avatarId === 'snowman') {
        stats.baseTime += 15;
    }
    
    // 3. Penguin: Health Bonus
    if (avatarId === 'penguin') {
        maxLives += 1;
    }
    
    return { ...player, stats, maxLives, avatarId };
};

// Reducer
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'LOAD_SAVE':
            const loaded = { ...INITIAL_PLAYER_STATE, ...action.payload };
            if (!loaded.settings) loaded.settings = INITIAL_PLAYER_STATE.settings;
            if (!loaded.highScore) loaded.highScore = 1;
            return { ...state, player: loaded };
            
        case 'RESET_GAME':
            // PERSISTENT PROGRESSION:
            // We KEEP: Gold, Inventory, Active Passives, Cosmetics, Stats (upgrades), Settings, HighScore
            // We RESET: Level, XP, Lives (to max), Streak, Current Loot
            const retainedPlayerState: PlayerState = {
                ...state.player,
                level: 1,
                xp: 0,
                difficultyRating: 1.0,
                lives: state.player.maxLives, // Heal to full
                streak: 0,
                latestLoot: undefined,
                // These are implicitly kept: gold, inventory, cosmetics, passives
            };
            
            return {
                ...initialGameState,
                player: retainedPlayerState,
                phase: 'welcome'
            };
            
        case 'START_GAME': {
            // Apply Avatar Bonuses
            let startPlayer = applyAvatarStats(state.player, action.avatarId);
            startPlayer.lives = startPlayer.maxLives; // Ensure full health start
            
            const isDev = state.player.isDeveloperMode;
            if (isDev && startPlayer.gold < 100000) startPlayer.gold = 100000;
            
            const prob = ProblemGenerator.generate(1, 1);
            
            return {
                ...state,
                phase: 'playing',
                player: startPlayer,
                currentProblem: prob,
                quiz: { ...INITIAL_QUIZ_STATE, timerActive: true, timeLeft: startPlayer.stats.baseTime }
            };
        }
        
        case 'SET_VOLUME': {
            const newSettings = { ...state.player.settings };
            if (action.category === 'master') newSettings.masterVolume = action.value;
            if (action.category === 'bgm') newSettings.bgmVolume = action.value;
            if (action.category === 'sfx') newSettings.sfxVolume = action.value;
            return { ...state, player: { ...state.player, settings: newSettings } };
        }
        
        case 'DEV_UNLOCK':
            return { ...state, player: { ...state.player, isDeveloperMode: true, gold: 100000 } };

        case 'TICK_TIMER': {
            if (state.phase !== 'playing' || !state.quiz.timerActive) return state;
            const newTime = state.quiz.timeLeft - 1;
            if (newTime <= 0) {
                 const lives = state.player.lives - 1;
                 if (lives <= 0) {
                     const isNewRecord = state.player.level > state.player.highScore;
                     return { 
                         ...state, 
                         phase: 'gameover', 
                         player: {
                             ...state.player, 
                             lives: 0,
                             highScore: isNewRecord ? state.player.level : state.player.highScore
                         }, 
                         quiz: {...state.quiz, timeLeft: 0, feedback: 'timeout'} 
                     };
                 }
                 return { ...state, player: {...state.player, lives}, quiz: {...state.quiz, timeLeft: state.player.stats.baseTime, feedback: 'timeout'} };
            }
            return { ...state, quiz: { ...state.quiz, timeLeft: newTime } };
        }

        case 'SET_ANSWER':
            return { ...state, quiz: { ...state.quiz, userAnswer: action.value } };

        case 'RESET_FEEDBACK':
             return { ...state, quiz: { ...state.quiz, feedback: 'idle' } };

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
                         if (roll < 0.4 && !state.player.inventory.includes(item.id)) { 
                             lootDrop = item.id;
                         }
                     }
                     
                     let newInv = state.player.inventory;
                     if (lootDrop) newInv = [...newInv, lootDrop];

                     return {
                         ...state,
                         phase: 'intermission',
                         player: { 
                             ...state.player, 
                             gold: state.player.gold + reward, 
                             streak: state.player.streak + 1,
                             xp: state.player.xp + 10,
                             latestLoot: lootDrop,
                             inventory: newInv
                         },
                         quiz: { ...state.quiz, feedback: 'correct', timerActive: false }
                     };
                 }
                 return { ...state, quiz: { ...state.quiz, feedback: 'stage_complete', currentStageIndex: state.quiz.currentStageIndex + 1, userAnswer: '' } };
            } else {
                 const lives = state.player.lives - 1;
                 if (lives <= 0) {
                     const isNewRecord = state.player.level > state.player.highScore;
                     return { 
                         ...state, 
                         phase: 'gameover', 
                         player: {
                             ...state.player, 
                             lives: 0,
                             highScore: isNewRecord ? state.player.level : state.player.highScore
                         }, 
                         quiz: { ...state.quiz, feedback: 'incorrect' } 
                     };
                 }
                 return { ...state, player: {...state.player, lives}, quiz: { ...state.quiz, feedback: 'incorrect', timeLeft: state.player.stats.baseTime } };
            }
        }

        case 'NEXT_LEVEL': {
            const nextLvl = state.player.level + 1;
            const diff = state.player.difficultyRating + 0.2;
            const prob = ProblemGenerator.generate(nextLvl, diff);
            
            return {
                ...state,
                phase: 'playing',
                player: { ...state.player, level: nextLvl, difficultyRating: diff, latestLoot: undefined },
                currentProblem: prob,
                quiz: { ...INITIAL_QUIZ_STATE, timerActive: true, timeLeft: state.player.stats.baseTime } 
            };
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
            if (item.type === 'passive' && item.costMultiplier && currentLevel > 0) {
                 cost = Math.floor(item.cost * Math.pow(item.costMultiplier, currentLevel));
            }

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
                    if (item.effectId === 'heart_boost') {
                        newPlayer.maxLives = 2 + newLevel;
                        newPlayer.lives = newPlayer.lives + 1;
                    }
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
            // Removed strict boss blocking for Snow Globe. Now it damages boss (skips stage).
            
            const idx = state.player.inventory.indexOf(itemId);
            const newInv = [...state.player.inventory];
            newInv.splice(idx, 1);
            
            let newPlayer = { ...state.player, inventory: newInv };
            let newQuiz = { ...state.quiz };

            if (itemId === 'cookie') {
                newPlayer.lives = Math.min(newPlayer.lives + 1, newPlayer.maxLives);
            } else if (itemId === 'snowglobe') {
                 // If Boss: Damage Boss (Next Stage). If Normal: Skip Level.
                 if (state.currentProblem?.isBoss) {
                     // Check if last stage
                     const isLast = state.quiz.currentStageIndex >= (state.currentProblem.stages.length - 1);
                     if (isLast) {
                        // Kill boss immediately if on last stage
                        return {
                            ...state,
                            phase: 'intermission',
                            player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) },
                            quiz: { ...newQuiz, feedback: 'correct', timerActive: false }
                        };
                     } else {
                         // Advance stage
                         return { 
                             ...state, 
                             player: newPlayer, 
                             quiz: { 
                                 ...state.quiz, 
                                 feedback: 'stage_complete', 
                                 currentStageIndex: state.quiz.currentStageIndex + 1, 
                                 userAnswer: '' 
                             } 
                         };
                     }
                 } else {
                     // Normal Skip
                     return {
                         ...state,
                         phase: 'intermission',
                         player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) },
                         quiz: { ...newQuiz, feedback: 'correct', timerActive: false }
                     };
                 }
            } else if (itemId === 'bomb') {
                // Damage boss
                if (state.currentProblem?.isBoss) {
                     const isLast = state.quiz.currentStageIndex >= (state.currentProblem.stages.length - 1);
                     if (isLast) {
                         return {
                             ...state,
                             phase: 'intermission',
                             player: { ...newPlayer, gold: newPlayer.gold + (state.currentProblem?.goldReward || 0) },
                             quiz: { ...newQuiz, feedback: 'correct', timerActive: false }
                         };
                     }
                     return { ...state, player: newPlayer, quiz: { ...state.quiz, feedback: 'stage_complete', currentStageIndex: state.quiz.currentStageIndex + 1, userAnswer: '' } };
                }
            }

            return { ...state, player: newPlayer, quiz: newQuiz };
        }

        default:
            return state;
    }
}