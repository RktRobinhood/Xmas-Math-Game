import { AudioManifest } from '../services/AudioManager';

/**
 * Audio Asset Manifest
 * Using stable, permanent URLs for Retro/SNES RPG Vibe.
 */
export const AUDIO_MANIFEST: AudioManifest = {
    // --- UI & SFX ---
    // Neutral mechanical click
    'ui_click':    { src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.2 },
    // Menu Open (Slide/Whoosh)
    'ui_open':     { src: ['https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'], volume: 0.3 },
    // Menu Close
    'ui_close':    { src: ['https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'], volume: 0.3 },
    'buy':         { src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.5 },
    'snap':        { src: ['https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3'], volume: 0.2 },
    
    // Gameplay - POSITIVE
    'correct':     { src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.5 },
    'level_up':    { src: ['https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'], volume: 0.6 },
    'victory_boss': { src: ['https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3'], volume: 0.7 }, 
    
    // Gameplay - NEGATIVE / STRESS
    // SHORTER, Less Aggressive Error Blip
    'wrong':       { src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], volume: 0.5 },
    // Dedicated Game Over Jingle
    'gameover_sfx':{ src: ['https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'], volume: 0.8 },
    // Heavy impact/crunch for taking damage
    'damage_take': { src: ['https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3'], volume: 0.8 },
    // Metallic hit for damaging boss
    'damage_boss': { src: ['https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'], volume: 0.8 },
    
    // USE SHORT CLICK FOR CLOCK (Prevents overlap/looping issues)
    // Reusing the short mechanical click (2568) but pitched down in code usually
    'clock_tick':  { src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.6 }, 
    
    // --- MUSIC (Kevin MacLeod / Retro RPG Style) ---
    // Use MP3s for maximum compatibility
    
    // Workshop: Dance of the Sugar Plum Fairy (Magical/Mysterious but Holiday)
    'bgm_workshop': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dance%20of%20the%20Sugar%20Plum%20Fairy.mp3'], 
        loop: true, html5: true, volume: 0.6 
    },
    
    // Summer/Snowman: "Island" - Chill Calypso/Reggae
    'bgm_summer': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'], 
        loop: true, html5: true, volume: 0.6 
    },
    
    // Nutcracker: "Crusade" - Heavy, Militaristic, Orchestral March
    'bgm_nutcracker': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crusade.mp3'], 
        loop: true, html5: true, volume: 0.7 
    },
    
    // Krampus: "Volatile Reaction" - Dark, Tense, Driving Synth/Orchestra
    'bgm_krampus': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3'], 
        loop: true, html5: true, volume: 0.8 
    },
    
    // Mecha Santa: "Moorland" - Upbeat, Chiptune-ish, Fast
    'bgm_mecha': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Moorland.mp3'], 
        loop: true, html5: true, volume: 0.7 
    },
    
    // Geometer / Miniboss: "Hitman" - Punchy, Bass-heavy Suspense
    'bgm_miniboss': {
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3'], 
        loop: true, html5: true, volume: 0.7
    },

    // Generic Boss Fallback
    'bgm_boss': {
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3'], 
        loop: true, html5: true, volume: 0.7
    },
    
    // Game Over: Sad Pixel Art Theme
    'bgm_gameover': { 
        src: ['https://incompetech.com/music/royalty-free/mp3-royaltyfree/Virtutes%20Instrumenti.mp3'], 
        loop: true, html5: true, volume: 0.5 
    }
};