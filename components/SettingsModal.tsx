
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { X, Volume2, Music, Speaker, Settings } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
      masterVolume: number;
      bgmVolume: number;
      sfxVolume: number;
  };
  onUpdate: (cat: 'master'|'bgm'|'sfx', val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-white">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            {/* Master */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span className="flex items-center gap-2"><Volume2 size={16}/> Master Volume</span>
                    <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input 
                    type="range" min="0" max="1" step="0.05"
                    value={settings.masterVolume}
                    onChange={(e) => onUpdate('master', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
            </div>

            {/* BGM */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span className="flex items-center gap-2"><Music size={16}/> Music</span>
                    <span>{Math.round(settings.bgmVolume * 100)}%</span>
                </div>
                <input 
                    type="range" min="0" max="1" step="0.05"
                    value={settings.bgmVolume}
                    onChange={(e) => onUpdate('bgm', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>

            {/* SFX */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-300">
                    <span className="flex items-center gap-2"><Speaker size={16}/> Sound FX</span>
                    <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input 
                    type="range" min="0" max="1" step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) => onUpdate('sfx', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
            </div>
        </div>
      </div>
    </div>
  );
};
