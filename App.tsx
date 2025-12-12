/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VOXEL WORKSHOP - V1.1
 * - GitHub Pages Ready (No AI)
 * - Persistent Roguelite Data
 * - Snowman Summer Mode
*/

import React, { Component, ErrorInfo, useReducer, useEffect, useRef, useState, ReactNode } from 'react';
import { gameReducer, initialGameState, INITIAL_PLAYER_STATE } from './utils/gameReducer';
import { GeometryEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ShopModal } from './components/ShopModal';
import { FormulaModal } from './components/FormulaModal';
import { SettingsModal } from './components/SettingsModal';
import { audio } from './services/AudioManager';
import { AUDIO_MANIFEST } from './utils/soundConfig';

interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

// Fix: Use React.Component to ensure props are correctly typed
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
    render() { 
        if (this.state.hasError) return <div className="p-4 bg-red-900 text-white">Critical Error: V1.1 Crash</div>; 
        return this.props.children; 
    }
}

const AppContent = () => {
    // V1.1 Persistent Key
    const SAVE_KEY = 'voxel_math_save_v8_persistent';
    
    const loadInit = () => {
        try {
            const saved = localStorage.getItem(SAVE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Version Check
                if (parsed.version !== INITIAL_PLAYER_STATE.version) return initialGameState;
                
                if (!parsed.settings) parsed.settings = INITIAL_PLAYER_STATE.settings;
                return { ...initialGameState, player: parsed };
            }
        } catch(e) {}
        return initialGameState;
    };

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

    // Init Audio
    useEffect(() => {
        const init = async () => {
            await audio.load(AUDIO_MANIFEST);
            // Attempt to play welcome music on load if possible
            if (state.phase === 'welcome') {
                audio.playBGM('bgm_workshop');
            }
        };
        init();
        
        // Browser Interaction Unlock
        const unlock = () => { audio.resume(); window.removeEventListener('click', unlock); };
        window.addEventListener('click', unlock);
        return () => window.removeEventListener('click', unlock);
    }, []);

    // Sync Settings
    useEffect(() => {
        const s = state.player.settings;
        audio.setVolumes(s.masterVolume, s.bgmVolume, s.sfxVolume);
    }, [state.player.settings]);

    // Engine Init
    useEffect(() => {
        if (!containerRef.current) return;
        const engine = new GeometryEngine(containerRef.current, (dist) => {
            setMeasuredDistance(dist);
            if (dist !== null) audio.playSFX('snap');
        });
        engineRef.current = engine;
        const resize = () => engine.handleResize();
        window.addEventListener('resize', resize);
        return () => { window.removeEventListener('resize', resize); engine.cleanup(); };
    }, []);

    // Scene Loading & Music Logic
    useEffect(() => {
        if (state.phase === 'playing' && state.currentProblem && engineRef.current) {
            engineRef.current.loadScene(state.currentProblem.shapes, state.currentProblem.labels||[], state.currentProblem.angles||[], state.currentProblem.dimensions||[]);
            
            // Determine track
            let track = 'bgm_workshop';
            if (state.currentProblem.isBoss) {
                const theme = state.currentProblem.bossMusicTheme || 'bgm_boss';
                track = theme.startsWith('bgm_') ? theme : `bgm_${theme}`;
            } else if (state.player.avatarId === 'snowman') {
                track = 'bgm_summer';
            }

            audio.playBGM(track as any);

        } else if (state.phase === 'gameover') {
            audio.playSFX('gameover_sfx');
            audio.playBGM('bgm_gameover');
        } else if (state.phase === 'welcome') {
            audio.playBGM('bgm_workshop');
        }
    }, [state.currentProblem, state.phase]);

    // Timer Loop
    useEffect(() => {
        const timer = setInterval(() => {
            if (state.phase === 'playing' && state.quiz.timerActive) dispatch({type: 'TICK_TIMER'});
        }, 1000);
        return () => clearInterval(timer);
    }, [state.phase, state.quiz.timerActive]);

    // Clock SFX & Panic Mode
    useEffect(() => {
        // Only tick if time is running out (<=10) AND greater than 0
        if (state.phase === 'playing' && state.quiz.timerActive && state.quiz.timeLeft <= 10 && state.quiz.timeLeft > 0) {
            // Lower pitch for standard ticking since we are using a click sound now
            const pitch = 0.8 + ((10 - state.quiz.timeLeft) * 0.05);
            audio.playSFX('clock_tick', { rate: pitch, volume: 0.5 });
        }
    }, [state.quiz.timeLeft, state.phase]);

    // SFX Triggers
    useEffect(() => {
        if (state.quiz.feedback === 'correct') {
            const isBossKill = state.phase === 'intermission' && state.currentProblem?.isBoss;
            audio.playSFX(isBossKill ? 'victory_boss' : 'correct');
        }
        if (state.quiz.feedback === 'incorrect') audio.playSFX('wrong');
        if (state.quiz.feedback === 'stage_complete') {
            audio.playSFX('damage_boss');
            setTimeout(() => dispatch({type: 'RESET_FEEDBACK'}), 1500);
        }
        if (state.quiz.feedback === 'level_complete' && !state.currentProblem?.isBoss) {
            audio.playSFX('level_up');
        }
    }, [state.quiz.feedback]);

    // Health Loss
    const prevLives = useRef(state.player.lives);
    useEffect(() => {
        if (state.player.lives < prevLives.current) audio.playSFX('damage_take');
        prevLives.current = state.player.lives;
    }, [state.player.lives]);

    const handleStartGame = (id: any) => {
        // FORCE AUDIO RESUME AND RESTART BGM
        // This ensures if the browser blocked the initial autoplay, it wakes up now.
        // We stop the current BGM explicitly so playBGM restarts it fresh.
        audio.resume();
        audio.stopBGM(100); 
        audio.playSFX('ui_click');
        
        // Small delay to ensure audio context is ready before game logic
        setTimeout(() => {
             dispatch({type: 'START_GAME', avatarId: id});
        }, 50);
    };
    
    // SNOWMAN FILTER
    const isSnowman = state.player.avatarId === 'snowman' && state.phase !== 'welcome';

    return (
        <div className={`relative w-full h-screen bg-slate-900 text-white overflow-hidden transition-all duration-1000 ${isSnowman ? 'backdrop-hue-rotate-180 brightness-125 contrast-125' : ''}`}>
            <div ref={containerRef} className="absolute inset-0" />
            <UIOverlay 
                gamePhase={state.phase} currentProblem={state.currentProblem}
                isAutoRotate={isAutoRotate} isMeasuring={isMeasuring} measuredDistance={measuredDistance}
                quizState={state.quiz} playerState={state.player}
                onToggleRotation={() => { setIsAutoRotate(!isAutoRotate); engineRef.current?.setAutoRotate(!isAutoRotate); audio.playSFX('ui_click'); }}
                onToggleMeasure={() => { setIsMeasuring(!isMeasuring); engineRef.current?.setMeasuringMode(!isMeasuring); audio.playSFX('ui_click'); }}
                onOpenFormulas={() => { setIsFormulaOpen(true); audio.playSFX('ui_open'); }}
                onOpenShop={() => { setIsShopOpen(true); audio.playSFX('ui_open'); }}
                onOpenSettings={() => { setIsSettingsOpen(true); audio.playSFX('ui_open'); }}
                onUseItem={(id) => { audio.playSFX('buy'); dispatch({type: 'USE_ITEM', itemId: id}); }}
                setQuizAnswer={(v) => dispatch({type: 'SET_ANSWER', value: v})}
                onQuizSubmit={() => dispatch({type: 'SUBMIT_ANSWER'})}
                onResetGame={() => dispatch({type: 'RESET_GAME'})}
                onNextLevel={() => dispatch({type: 'NEXT_LEVEL'})}
            />
            <WelcomeScreen visible={state.phase === 'welcome'} lives={state.player.lives} gold={state.player.gold} highScore={state.player.highScore} onStart={handleStartGame} onDevUnlock={() => dispatch({type: 'DEV_UNLOCK'})} />
            <ShopModal 
                isOpen={isShopOpen} 
                onClose={() => { setIsShopOpen(false); audio.playSFX('ui_close'); }} 
                playerState={state.player} 
                onBuy={(item) => { 
                    if (item.type === 'cosmetic' && (state.player.cosmetics.hat === item.effectId || state.player.cosmetics.outfit === item.effectId || state.player.inventory.includes(item.id))) {
                        dispatch({type: 'EQUIP_ITEM', item});
                        audio.playSFX('ui_click');
                    } else {
                        audio.playSFX('buy'); 
                        dispatch({type: 'BUY_ITEM', item}); 
                    }
                }} 
            />
            <FormulaModal 
                isOpen={isFormulaOpen} 
                onClose={() => { setIsFormulaOpen(false); audio.playSFX('ui_close'); }} 
            />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => { setIsSettingsOpen(false); audio.playSFX('ui_close'); }} 
                settings={state.player.settings} 
                onUpdate={(c, v) => dispatch({type: 'SET_VOLUME', category: c, value: v})} 
            />
        </div>
    );
};

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }