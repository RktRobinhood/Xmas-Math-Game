
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Play, ChevronRight, ChevronLeft, Lock, Unlock, Heart, Coins, Trophy } from 'lucide-react';
import { PlayerAvatarId } from '../types';
import { CharacterAvatar } from './CharacterAvatar';

interface WelcomeScreenProps {
  visible: boolean;
  lives: number;
  gold: number;
  highScore: number;
  onStart: (avatarId: PlayerAvatarId) => void;
  onDevUnlock?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible, lives, gold, highScore, onStart, onDevUnlock }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<PlayerAvatarId>('elf');
  const [showDevInput, setShowDevInput] = useState(false);
  const [devPass, setDevPass] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(gold > 10000); 

  useEffect(() => {
      if (gold > 10000) setIsUnlocked(true);
  }, [gold]);
  
  const avatars: {id: PlayerAvatarId, name: string, desc: string, perk: string}[] = [
      { id: 'elf', name: 'Apprentice Elf', desc: 'The classic builder.', perk: 'Balanced Stats' },
      { id: 'elf_female', name: 'Scout Elf', desc: 'Sharp eyes for gold.', perk: '+20% Gold Gain' },
      { id: 'snowman', name: 'Frosty', desc: 'Summer vibes only.', perk: '+15s Timer & Chill Music' },
      { id: 'penguin', name: 'Skipper', desc: 'Sliding through danger.', perk: '+1 Max Life' },
  ];

  const currentIndex = avatars.findIndex(a => a.id === selectedAvatar);

  const cycleAvatar = (dir: 1 | -1) => {
      let newIndex = currentIndex + dir;
      if (newIndex < 0) newIndex = avatars.length - 1;
      if (newIndex >= avatars.length) newIndex = 0;
      setSelectedAvatar(avatars[newIndex].id);
  };

  const handleDevSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (devPass === 'xmas' && onDevUnlock) {
          onDevUnlock();
          setShowDevInput(false);
          setIsUnlocked(true);
      } else {
          setDevPass('');
          alert("Wrong password!");
      }
  };

  return (
    <div className={`
        absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 select-none
        bg-slate-950/95 backdrop-blur-xl
        transition-all duration-500 ease-out transform font-sans
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <div className="flex flex-col items-center w-full max-w-md p-6 relative">
        
        {/* Header Stats Bar */}
        <div className="absolute top-0 w-full flex justify-between items-center py-4 px-6 opacity-80">
            <div className="flex gap-4">
                 <div className="flex items-center gap-2 text-rose-400 font-bold bg-rose-950/50 px-3 py-1 rounded-full border border-rose-900/50">
                    <Heart size={16} fill="currentColor" /> {lives}
                 </div>
                 <div className="flex items-center gap-2 text-amber-400 font-bold bg-amber-950/50 px-3 py-1 rounded-full border border-amber-900/50">
                    <Coins size={16} fill="currentColor" /> {gold}
                 </div>
                 <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-900/50">
                    <Trophy size={16} fill="currentColor" /> BEST: {highScore > 9999 ? '∞' : highScore}
                 </div>
            </div>
            
            {/* Dev Lock */}
            <button onClick={() => setShowDevInput(!showDevInput)} className="text-slate-600 hover:text-slate-400 transition-colors">
                {isUnlocked ? <Unlock size={16} className="text-emerald-500" /> : <Lock size={16} />}
            </button>
        </div>

        {/* Dev Input Overlay */}
        {showDevInput && (
            <div className="absolute top-16 right-6 z-50 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl animate-in slide-in-from-top-2">
                <form onSubmit={handleDevSubmit} className="flex gap-2">
                    <input 
                        type="password" 
                        value={devPass}
                        onChange={(e) => setDevPass(e.target.value)}
                        placeholder="Password..."
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs w-24 outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button type="submit" className="bg-amber-500 text-slate-900 font-bold px-2 rounded text-xs">OK</button>
                </form>
            </div>
        )}

        {/* Main Content */}
        <div className="mt-8 text-center space-y-2 mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-200 tracking-tight drop-shadow-sm">
                Trig and Geometry<br/>Workshop
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                Santa's Roguelite Math Quest
            </p>
        </div>

        {/* Character Carousel */}
        <div className="w-full relative h-64 flex items-center justify-center mb-8">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-75 animate-pulse"></div>

            <button onClick={() => cycleAvatar(-1)} className="absolute left-0 p-4 text-slate-500 hover:text-white transition-all hover:scale-110 z-10">
                <ChevronLeft size={40} />
            </button>

            <div className="flex flex-col items-center z-0 scale-125">
                 {/* Avatar Render */}
                <div className="w-32 h-32 mb-4 drop-shadow-2xl filter brightness-110">
                     <CharacterAvatar level={1} avatarId={selectedAvatar} cosmetics={{hat:'none', outfit:'none'}} />
                </div>
                
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-white">{avatars[currentIndex].name}</h2>
                    <p className="text-sm text-slate-400">{avatars[currentIndex].desc}</p>
                    <div className="inline-block bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/50 mt-1">
                        PASSIVE: {avatars[currentIndex].perk}
                    </div>
                </div>
            </div>

            <button onClick={() => cycleAvatar(1)} className="absolute right-0 p-4 text-slate-500 hover:text-white transition-all hover:scale-110 z-10">
                <ChevronRight size={40} />
            </button>
        </div>

        {/* Start Button */}
        <button 
            onClick={() => onStart(selectedAvatar)}
            className="group relative w-full max-w-xs py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 active:translate-y-1"
        >
            <div className="bg-white/20 p-1 rounded-full group-hover:bg-white/30 transition-colors">
                <Play size={20} fill="currentColor" className="ml-0.5"/> 
            </div>
            START RUN
        </button>
        
        <div className="mt-6 text-[10px] text-slate-600 font-medium uppercase tracking-widest">
            v 7.1.0 • Persistent Progression
        </div>

      </div>
    </div>
  );
};
