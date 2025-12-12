
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- 8-BIT SYNTHESIZER ENGINE ---
// Generates SNES/NES style audio in real-time. Zero load times.

export type BGMType = 'workshop' | 'battle' | 'boss' | 'miniboss' | 'krampus' | 'nutcracker' | 'mecha' | 'gameover' | 'none';

export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    
    // Mix Channels
    private bgmGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    
    private currentBGM: BGMType = 'none';
    private nextNoteTime = 0;
    private seqIndex = 0;
    private schedulerInterval: number | null = null;
    private currentBPM = 120;
    
    // Settings
    private volMaster = 0.5;
    private volBGM = 0.6;
    private volSFX = 0.8;
    
    private isLowTime = false;

    constructor() {}

    public init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            this.bgmGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            
            this.bgmGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            
            // Compressor to glue the mix
            const comp = this.ctx.createDynamicsCompressor();
            this.masterGain.disconnect();
            this.masterGain.connect(comp);
            comp.connect(this.ctx.destination);

            this.updateVolumes();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    public resume() {
        this.init();
    }

    public setVolumes(master: number, bgm: number, sfx: number) {
        this.volMaster = master;
        this.volBGM = bgm;
        this.volSFX = sfx;
        this.updateVolumes();
    }
    
    private updateVolumes() {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        this.masterGain.gain.setTargetAtTime(this.volMaster, t, 0.1);
        this.bgmGain!.gain.setTargetAtTime(this.volBGM * 0.3, t, 0.1); // BGM lower in mix
        this.sfxGain!.gain.setTargetAtTime(this.volSFX, t, 0.1);
    }

    public setLowTimeMode(enabled: boolean) {
        this.isLowTime = enabled;
        // Don't speed up music pitch, just add tension layers
    }

    // --- SFX API ---

    public playSFX(type: 'correct' | 'wrong' | 'damage_deal' | 'damage_take' | 'damage_boss' | 'heart_lost' | 'level_up' | 'buy' | 'ui_click' | 'snap' | 'clock_tick' | 'victory_boss') {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const dest = this.sfxGain!;

        switch (type) {
            case 'ui_click':
                this.playTone(800, t, 0.05, 'triangle', 0.1, dest);
                break;
            case 'snap':
                this.playTone(1200, t, 0.03, 'sine', 0.2, dest);
                break;
            case 'buy':
                this.playTone(1046, t, 0.1, 'square', 0.1, dest); // C6
                this.playTone(1318, t+0.08, 0.2, 'square', 0.1, dest); // E6
                break;
            case 'clock_tick':
                // Clean woodblock sound
                this.playTone(800, t, 0.05, 'sine', 0.8, dest);
                this.playNoise(t, 0.05, 'highpass', dest);
                break;
            case 'correct':
                // Mario-style coin/success
                this.playTone(659, t, 0.1, 'square', 0.1, dest); // E5
                this.playTone(830, t+0.1, 0.2, 'square', 0.1, dest); // G#5
                break;
            case 'wrong':
                // Buzzer
                this.playTone(150, t, 0.3, 'sawtooth', 0.2, dest);
                this.playTone(145, t, 0.3, 'sawtooth', 0.2, dest);
                break;
            case 'damage_take':
            case 'heart_lost':
                // Crunch
                this.playNoise(t, 0.3, 'lowpass', dest);
                this.playTone(100, t, 0.2, 'sawtooth', 0.3, dest);
                break;
            case 'damage_boss':
                // Metallic Clank
                this.playTone(200, t, 0.2, 'square', 0.2, dest);
                this.playTone(800, t, 0.05, 'sawtooth', 0.1, dest);
                break;
            case 'victory_boss':
                // Final Fantasy Fanfare Intro
                [523, 523, 523, 523, 415, 466, 523, 0, 466, 523].forEach((f, i) => {
                    if(f>0) this.playTone(f, t + i*0.12, 0.1, 'square', 0.2, dest);
                });
                break;
            case 'level_up':
                // Rising triad
                this.playTone(523, t, 0.1, 'triangle', 0.2, dest);
                this.playTone(659, t+0.1, 0.1, 'triangle', 0.2, dest);
                this.playTone(783, t+0.2, 0.3, 'triangle', 0.2, dest);
                break;
        }
    }

    // --- MUSIC SEQUENCER ---

    public playBGM(type: BGMType) {
        if (this.currentBGM === type) return;
        this.currentBGM = type;
        
        if (this.schedulerInterval) clearInterval(this.schedulerInterval);
        this.seqIndex = 0;
        this.nextNoteTime = this.ctx?.currentTime || 0;
        
        // Set BPM
        switch(type) {
            case 'mecha': this.currentBPM = 150; break;
            case 'nutcracker': this.currentBPM = 140; break; // March
            case 'krampus': this.currentBPM = 160; break; // Doom
            case 'miniboss': this.currentBPM = 135; break;
            case 'workshop': this.currentBPM = 110; break;
            case 'gameover': this.currentBPM = 90; break;
            default: this.currentBPM = 120;
        }

        if (type !== 'none') {
            this.schedulerInterval = window.setInterval(() => this.schedule(), 25);
        }
    }

    private schedule() {
        if (!this.ctx) return;
        const lookahead = 0.1; 
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playStep(this.seqIndex, this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.currentBPM;
            this.nextNoteTime += secondsPerBeat / 4; // 16th notes
            this.seqIndex++;
        }
    }

    private playStep(step: number, time: number) {
        const bgm = this.currentBGM;
        
        // --- 24-Style Clock Tension Overlay ---
        if (this.isLowTime && bgm !== 'gameover' && bgm !== 'none') {
             // Play on beats
             if (step % 4 === 0) {
                 // Pitch rises every bar
                 const pitch = 800 + (step % 32) * 50;
                 this.playTone(pitch, time, 0.05, 'sine', 0.3, this.bgmGain!);
             }
        }

        if (bgm === 'workshop') {
            const bar = Math.floor(step / 16);
            const beat = step % 16;
            
            // Bass: Simple Walk
            if (step % 4 === 0) {
                const note = [36, 43, 41, 38][bar % 4] || 36; // C G F D
                this.playTone(this.mtof(note), time, 0.3, 'triangle', 0.3, this.bgmGain!);
            }
            
            // Melody: Jingle Bells-ish
            if (bar % 2 === 0) {
                 // E E E
                 if (beat === 0 || beat === 4 || beat === 8) this.playTone(this.mtof(64), time, 0.2, 'square', 0.1, this.bgmGain!);
            } else {
                 // E G C D E
                 const m = {0:64, 4:67, 8:60, 12:62, 14:64};
                 if (m[beat as keyof typeof m]) this.playTone(this.mtof(m[beat as keyof typeof m]), time, 0.2, 'square', 0.1, this.bgmGain!);
            }
            
            // Hat
            if (step % 2 === 0) this.playNoise(time, 0.03, 'highpass', this.bgmGain!);
        }
        
        else if (bgm === 'nutcracker') {
            // Intense March
            if (step % 4 === 0) this.playNoise(time, 0.1, 'lowpass', this.bgmGain!); // Kick
            if (step % 4 === 2) this.playNoise(time, 0.05, 'highpass', this.bgmGain!); // Snare
            
            // Arp
            const arp = [60, 0, 63, 0, 67, 0, 72, 67];
            const note = arp[step % 8];
            if (note) this.playTone(this.mtof(note), time, 0.1, 'sawtooth', 0.1, this.bgmGain!);
        }

        else if (bgm === 'krampus') {
            // Dark Dissonance
            if (step % 8 === 0) this.playTone(this.mtof(36), time, 0.5, 'sawtooth', 0.4, this.bgmGain!); // Deep C
            if (step % 8 === 4) this.playTone(this.mtof(42), time, 0.5, 'sawtooth', 0.4, this.bgmGain!); // F# (Tritone)
            
            if (step % 2 === 0) this.playNoise(time, 0.02, 'highpass', this.bgmGain!);
        }

        else if (bgm === 'mecha') {
            // Fast Techno
            if (step % 4 === 2) this.playTone(this.mtof(36), time, 0.1, 'square', 0.2, this.bgmGain!); // Offbeat bass
            const mel = [72, 75, 79, 75];
            this.playTone(this.mtof(mel[step%4]), time, 0.05, 'triangle', 0.1, this.bgmGain!);
        }
        
        else if (bgm === 'miniboss') {
            // Standard Battle
            if (step % 4 === 0) this.playTone(this.mtof(36), time, 0.1, 'sawtooth', 0.3, this.bgmGain!);
            if (step % 8 === 0) this.playTone(this.mtof(48), time, 0.1, 'square', 0.2, this.bgmGain!);
            if (step % 2 === 0) this.playNoise(time, 0.05, 'highpass', this.bgmGain!);
        }
    }

    // --- SYNTH UTILS ---

    private playTone(freq: number, time: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(dest);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        
        osc.start(time);
        osc.stop(time + dur);
    }

    private playNoise(time: number, dur: number, filterType: 'highpass'|'lowpass', dest: AudioNode) {
        const bufSize = this.ctx!.sampleRate * dur;
        const buf = this.ctx!.createBuffer(1, bufSize, this.ctx!.sampleRate);
        const data = buf.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random()*2 - 1;
        
        const src = this.ctx!.createBufferSource();
        src.buffer = buf;
        
        const filter = this.ctx!.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterType === 'highpass' ? 5000 : 200;
        
        const gain = this.ctx!.createGain();
        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        
        src.start(time);
    }

    private mtof(note: number) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
}

export const audio = new SoundManager();
export const soundManager = audio;
