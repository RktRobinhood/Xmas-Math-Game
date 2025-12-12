/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Types for Howler.js (since we are using CDN)
declare class Howl {
    constructor(options: any);
    play(id?: number): number;
    stop(id?: number): void;
    fade(from: number, to: number, duration: number, id: number): void;
    volume(vol: number, id?: number): number;
    rate(rate: number, id?: number): void;
    stereo(pan: number, id?: number): void;
    loop(loop: boolean, id?: number): void;
    once(event: string, callback: () => void, id?: number): void;
    state(): string;
    duration(): number;
    playing(id?: number): boolean;
}

declare const Howler: {
    volume(vol: number): void;
    mute(muted: boolean): void;
    autoUnlock: boolean;
    ctx: AudioContext;
};

export interface SoundConfig {
    src: string[];
    volume?: number;
    loop?: boolean;
    html5?: boolean; // Use HTML5 Audio for streaming large files
}

export type AudioManifest = Record<string, SoundConfig>;

class AudioManager {
    private sounds: Map<string, Howl> = new Map();
    private currentMusicId: number | null = null;
    private currentMusicName: string | null = null;
    
    // Queue for music requested before load complete
    private pendingMusic: string | null = null;
    
    // Volume State
    private masterVol: number = 0.6;
    private musicVol: number = 0.8;
    private sfxVol: number = 1.0;
    
    private isMuted: boolean = false;
    private isLoaded: boolean = false;

    constructor() {
        // Howler is global from CDN
        if (typeof Howler !== 'undefined') {
            Howler.autoUnlock = true;
        }
    }
    
    /**
     * Force resume AudioContext.
     * Call this on user interaction.
     */
    public resume() {
        if (typeof Howler !== 'undefined' && Howler.ctx) {
            if (Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    this.checkMusicHealth();
                });
            } else {
                this.checkMusicHealth();
            }
        }
    }
    
    /**
     * Checks if the music that is SUPPOSED to be playing is ACTUALLY playing.
     * If not, it restarts it. This fixes the "first run silence" bug.
     */
    private checkMusicHealth() {
        if (this.currentMusicName && this.currentMusicId !== null) {
            const sound = this.sounds.get(this.currentMusicName);
            if (sound && !sound.playing(this.currentMusicId)) {
                console.log("AudioContext resumed, restarting stalled BGM:", this.currentMusicName);
                const vol = this.musicVol * this.masterVol;
                
                // Retrigger
                this.currentMusicId = sound.play();
                sound.volume(vol, this.currentMusicId);
                sound.loop(true, this.currentMusicId);
            }
        }
    }

    /**
     * Preloads all sounds defined in the manifest.
     */
    public async load(manifest: AudioManifest): Promise<void> {
        if (typeof Howl === 'undefined') {
            console.warn("Howler.js not loaded. Audio disabled.");
            return;
        }

        const promises = Object.entries(manifest).map(([key, config]) => {
            return new Promise<void>((resolve) => {
                const sound = new Howl({
                    src: config.src,
                    volume: config.volume ?? 1.0,
                    loop: config.loop ?? false,
                    html5: config.html5 ?? false,
                    preload: true,
                    onload: () => resolve(),
                    onloaderror: (id: any, err: any) => {
                        console.warn(`Failed to load sound: ${key}`, err);
                        // Resolve anyway so the game doesn't hang on a missing asset
                        resolve(); 
                    }
                });
                this.sounds.set(key, sound);
            });
        });

        await Promise.all(promises);
        this.isLoaded = true;
        console.log("Audio System Loaded");
        
        // If music was requested while loading, play it now
        if (this.pendingMusic) {
            this.playBGM(this.pendingMusic);
            this.pendingMusic = null;
        }
    }

    /**
     * Plays a Sound Effect (SFX).
     * Supports variance for pitch/rate to prevent "machine gun" effect.
     */
    public playSFX(name: string, options?: { volume?: number, rate?: number, pan?: number, variance?: number }) {
        if (this.isMuted) return;
        
        // If not loaded yet, ignore SFX (gameplay shouldn't block)
        if (!this.isLoaded) return;
        
        const sound = this.sounds.get(name);
        if (!sound) {
            return;
        }

        const id = sound.play();
        
        // Calculate effective volume
        const vol = (options?.volume ?? 1.0) * this.sfxVol * this.masterVol;
        sound.volume(vol, id);

        if (options?.pan) sound.stereo(options.pan, id);

        // Apply Variance
        let rate = options?.rate ?? 1.0;
        if (options?.variance) {
            // e.g. variance 0.1 => random between 0.9 and 1.1
            rate += (Math.random() * options.variance * 2) - options.variance;
        }
        sound.rate(rate, id);
    }

    /**
     * Plays Background Music (BGM) with crossfading.
     */
    public playBGM(name: string, fadeDuration: number = 1500) {
        this.resume(); // Ensure context is alive

        if (!this.isLoaded) {
            this.pendingMusic = name;
            return;
        }
        
        // Block check: If we think we are playing this track, but Howler says no (blocked),
        // we must fall through to restart it.
        if (this.currentMusicName === name) {
            const currentSound = this.sounds.get(name);
            if (currentSound && this.currentMusicId !== null && currentSound.playing(this.currentMusicId)) {
                return; // Everything is fine, already playing.
            }
            // If we are here, it means we thought we were playing 'name', but we aren't.
            // Proceed to restart.
            console.log("Restarting BGM that was blocked/stopped:", name);
        }

        // 1. Fade out current track (if it's different or if we are restarting)
        if (this.currentMusicName && this.currentMusicName !== name) {
            const oldSound = this.sounds.get(this.currentMusicName);
            const oldId = this.currentMusicId;
            if (oldSound && oldId !== null && oldSound.playing(oldId)) {
                oldSound.fade(oldSound.volume(oldId), 0, fadeDuration, oldId);
                oldSound.once('fade', () => {
                    oldSound.stop(oldId);
                }, oldId);
            }
        }

        // 2. Start new track
        const newSound = this.sounds.get(name);
        if (!newSound) {
            console.warn(`Music track not found: ${name}`);
            this.currentMusicName = null;
            return;
        }

        this.currentMusicName = name;
        const targetVol = this.musicVol * this.masterVol;
        
        // Start silent, then fade in
        this.currentMusicId = newSound.play();
        newSound.volume(0, this.currentMusicId);
        newSound.loop(true, this.currentMusicId);
        newSound.fade(0, targetVol, fadeDuration, this.currentMusicId);
    }

    /**
     * Stops the BGM.
     */
    public stopBGM(fadeDuration: number = 500) {
        if (!this.currentMusicName || this.currentMusicId === null) return;
        
        const sound = this.sounds.get(this.currentMusicName);
        if (sound) {
            sound.fade(sound.volume(this.currentMusicId), 0, fadeDuration, this.currentMusicId);
            sound.once('fade', () => {
                sound.stop(this.currentMusicId!);
            }, this.currentMusicId);
        }
        this.currentMusicName = null;
        this.currentMusicId = null;
        this.pendingMusic = null;
    }

    /**
     * Update global volume settings.
     */
    public setVolumes(master: number, music: number, sfx: number) {
        this.masterVol = master;
        this.musicVol = music;
        this.sfxVol = sfx;
        
        // Update global Master
        if (typeof Howler !== 'undefined') {
            Howler.volume(this.masterVol);
        }

        // Update currently playing music immediately
        if (this.currentMusicName && this.currentMusicId !== null) {
            const sound = this.sounds.get(this.currentMusicName);
            if (sound) {
                sound.volume(this.musicVol * this.masterVol, this.currentMusicId);
            }
        }
    }

    public mute(muted: boolean) {
        this.isMuted = muted;
        if (typeof Howler !== 'undefined') {
            Howler.mute(muted);
        }
    }
}

export const audio = new AudioManager();