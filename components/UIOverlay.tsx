
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { Problem, QuizState, PlayerState, ShopItem, GamePhase } from '../types';
import { Ruler, Calculator, Heart, BookOpen, RefreshCw, ShoppingBag, Wand2, ChevronDown, ChevronUp, Clock, Skull, ArrowRight, Settings } from 'lucide-react';
import { CharacterAvatar } from './CharacterAvatar';
import { SHOP_ITEMS } from '../utils/ibQuestions';

interface UIOverlayProps {
  gamePhase: GamePhase;
  currentProblem: Problem | null;
  isAutoRotate: boolean;
  isMeasuring: boolean;
  measuredDistance: number | null;
  
  quizState: QuizState;
  playerState: PlayerState;

  onToggleRotation: () => void;
  onToggleMeasure: () => void;
  onOpenFormulas: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onUseItem: (itemId: string) => void;
  
  setQuizAnswer: (val: string) => void;
  onQuizSubmit: () => void;
  onResetGame: () => void;
  onNextLevel: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gamePhase,
  currentProblem,
  isAutoRotate,
  isMeasuring,
  measuredDistance,
  quizState,
  playerState,
  onToggleRotation,
  onToggleMeasure,
  onOpenFormulas,
  onOpenShop,
  onOpenSettings,
  onUseItem,
  setQuizAnswer,
  onQuizSubmit,
  onResetGame,
  onNextLevel
}) => {
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false);
  
  const currentStage = currentProblem ? currentProblem.stages[quizState.currentStageIndex] : null;
  const bossProgress = currentProblem ? 1 - (quizState.currentStageIndex / currentProblem.stages.length) : 0;
  const isBoss = currentProblem?.isBoss;

  // Group Inventory
  const inventoryCounts = playerState.inventory.reduce((acc, itemId) => {
      acc[itemId] = (acc[itemId] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  const to3SF = (num: number) => parseFloat(num.toPrecision(3));

  // Boss Loot Card Logic
  const lootItem = playerState.latestLoot ? SHOP_ITEMS.find(i => i.id === playerState.latestLoot) : null;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none font-sans overflow-hidden">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-transparent">
        <div className="flex justify-between items-start">
            {/* Avatar & Gold (Clickable to Open Shop/Inventory) */}
            <div 
                onClick={onOpenShop}
                className="pointer-events-auto flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform active:scale-95 group"
                title="Open Inventory"
            >
                <div className="scale-75 origin-top-left -mr-2 drop-shadow-md group-hover:drop-shadow-xl transition-all">
                    <CharacterAvatar level={playerState.level} avatarId={playerState.avatarId} cosmetics={playerState.cosmetics} />
                </div>
                <div className="bg-slate-900/60 backdrop-blur px-3 py-1 rounded-full border border-slate-700/50 shadow-sm flex items-center gap-2 text-amber-400 font-bold font-mono text-sm group-hover:border-amber-500/50 transition-colors">
                    <span>🪙 {playerState.gold}</span>
                </div>
            </div>

            {/* Center: Boss Bar & Timer */}
            <div className="flex-1 max-w-md mx-4 mt-2 flex flex-col items-center gap-2">
                 {gamePhase !== 'intermission' && gamePhase !== 'gameover' && (
                     <>
                        {isBoss && (
                             <div className="w-full animate-in slide-in-from-top-4">
                                 <div className={`font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 mb-1 ${currentProblem?.bossType === 'mini' ? 'text-amber-500' : 'text-rose-500'}`}>
                                     <Skull size={14}/> {currentProblem?.bossType === 'mini' ? 'MINI BOSS' : 'ACT BOSS'}: {currentProblem?.bossName}
                                 </div>
                                 <div className="w-full h-4 bg-slate-800 rounded-full border border-rose-900/50 overflow-hidden relative shadow-lg">
                                     <div 
                                        className={`h-full transition-all duration-500 ease-out ${currentProblem?.bossType === 'mini' ? 'bg-amber-600' : 'bg-rose-600'}`}
                                        style={{ width: `${bossProgress * 100}%` }}
                                     />
                                 </div>
                             </div>
                        )}
                        
                        {/* TIMER */}
                        <div className={`flex items-center gap-2 justify-center transition-all ${quizState.timeLeft < 10 ? 'scale-110' : ''}`}>
                             <Clock size={16} className={quizState.timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'} />
                             <div className="w-24 h-2 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-linear ${quizState.timeLeft < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${(quizState.timeLeft / playerState.stats.baseTime) * 100}%` }}
                                />
                             </div>
                             <span className={`font-mono font-bold text-sm ${quizState.timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                                 {quizState.timeLeft}s
                             </span>
                        </div>
                     </>
                 )}
            </div>

            {/* Right: Lives & Settings */}
            <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1 bg-slate-900/60 backdrop-blur px-2 py-1.5 rounded-full border border-slate-700/50 shadow-sm items-center">
                    {[...Array(playerState.maxLives)].map((_, i) => (
                        <Heart 
                            key={i} 
                            size={20} 
                            className={`transition-all duration-300 ${i < playerState.lives ? 'fill-red-500 text-red-600 drop-shadow-md' : 'fill-slate-800 text-slate-900'}`} 
                        />
                    ))}
                    <div className="w-[1px] h-4 bg-slate-700 mx-2"></div>
                    <button onClick={onOpenSettings} className="pointer-events-auto text-slate-400 hover:text-white transition-colors">
                        <Settings size={18} />
                    </button>
                </div>

                 {/* Inventory (Grouped Consumables Only) */}
                {Object.keys(inventoryCounts).length > 0 && (
                    <div className="pointer-events-auto flex gap-1 mt-1 flex-wrap justify-end max-w-[200px] overflow-x-auto scrollbar-hide py-1 pr-1">
                        {Object.entries(inventoryCounts).map(([itemId, rawCount], idx) => {
                            const count = rawCount as number;
                            const itemDef = SHOP_ITEMS.find(i => i.id === itemId);
                            if (!itemDef || itemDef.type !== 'consumable') return null;
                            
                            return (
                                <button 
                                    key={idx}
                                    onClick={() => onUseItem(itemId)}
                                    className="relative w-10 h-10 bg-slate-800/80 border border-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-xl shadow-lg shrink-0 group"
                                    title={itemDef.name}
                                >
                                    {itemDef.icon}
                                    {count > 1 && (
                                        <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-slate-900 shadow-sm z-10 group-hover:scale-110 transition-transform">
                                            {count}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Right Side Tools */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto z-20">
            <SideButton onClick={onOpenShop} icon={<ShoppingBag size={20} />} label="Shop" color="indigo" />
            <SideButton onClick={onOpenFormulas} icon={<BookOpen size={20} />} label="Rules" color="slate" />
            <div className="h-4" />
            <SideButton onClick={onToggleMeasure} active={isMeasuring} icon={<Ruler size={20} />} label="Measure" color="amber" />
      </div>

      {/* Intermission Loot Card */}
      {gamePhase === 'intermission' && lootItem && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-1 rounded-3xl shadow-2xl animate-in zoom-in duration-300 scale-110">
                  <div className="bg-slate-900 rounded-3xl p-6 text-center max-w-sm">
                      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wider animate-bounce">Boss Loot!</h2>
                      <div className="text-6xl mb-4 filter drop-shadow-lg">{lootItem.icon}</div>
                      <h3 className="text-xl font-bold text-amber-400">{lootItem.name}</h3>
                      <p className="text-slate-400 text-sm mb-6">{lootItem.description}</p>
                      <button onClick={onOpenShop} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl shadow-lg uppercase tracking-wide">
                          Open Wardrobe
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Sheet */}
      <div className={`
        absolute bottom-0 left-0 right-0 z-30 pointer-events-auto transition-transform duration-300 ease-in-out
        ${isQuestionCollapsed ? 'translate-y-[calc(100%-60px)]' : 'translate-y-0'}
      `}>
          <div className="max-w-md mx-auto sm:mr-auto sm:ml-4 sm:mb-4 sm:w-80 w-full">
            <div className={`
                backdrop-blur-xl border-t sm:border shadow-2xl overflow-hidden flex flex-col text-slate-100
                ${isBoss ? 'bg-rose-950/90 border-rose-700' : 'bg-slate-900/95 border-slate-700'}
                sm:rounded-2xl
            `}>
                <div 
                    onClick={() => setIsQuestionCollapsed(!isQuestionCollapsed)}
                    className="p-3 border-b border-white/10 flex items-center justify-between cursor-pointer active:bg-white/5"
                >
                    <div className="flex items-center gap-2">
                        {isBoss ? (
                            <div className={`w-2 h-2 rounded-full animate-ping ${currentProblem?.bossType === 'mini' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        ) : (
                            <Calculator size={16} className="text-emerald-400" />
                        )}
                        <span className={`font-bold text-xs uppercase tracking-wide ${isBoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {gamePhase === 'intermission' ? 'Rest Area' : isBoss ? (currentProblem?.bossType === 'mini' ? 'Mini Boss' : 'Boss Fight') : `Problem #${playerState.level}`}
                        </span>
                    </div>
                    {isQuestionCollapsed ? <ChevronUp size={20} className="text-slate-500"/> : <ChevronDown size={20} className="text-slate-500"/>}
                </div>
                
                <div className="p-4 pt-2">
                    {gamePhase === 'gameover' ? (
                        <div className="text-center py-4">
                            <h3 className="font-bold text-xl text-white mb-1">Run Ended!</h3>
                            
                            {/* Solution Reveal */}
                            <div className="my-4 bg-rose-950/50 border border-rose-900/50 p-3 rounded-xl">
                                <p className="text-xs text-rose-300 uppercase font-bold mb-1">The Correct Answer Was</p>
                                <p className="text-3xl font-mono font-black text-rose-400">
                                    {to3SF(currentStage?.answer || 0)}
                                    <span className="text-sm ml-1 opacity-50">{currentStage?.unit}</span>
                                </p>
                            </div>

                            <button onClick={onResetGame} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2"><RefreshCw size={18}/> New Run</button>
                        </div>
                    ) : gamePhase === 'intermission' ? (
                        <div className="text-center py-2 space-y-3">
                             <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-3">
                                 <h3 className="font-bold text-emerald-400">Level Complete!</h3>
                             </div>
                             <button onClick={onNextLevel} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pulse">Next Level <ArrowRight size={18}/></button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                {isBoss && <div className="text-2xl animate-bounce-slow filter drop-shadow-md grayscale-0">{currentProblem?.bossAvatar}</div>}
                                <p className="text-sm font-medium leading-relaxed text-slate-200 pt-1">{currentStage?.question || "Loading..."}</p>
                            </div>

                            {isMeasuring && (
                                <div className="bg-amber-950/40 border border-amber-900/50 rounded-lg p-3 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                                    <span className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1"><Ruler size={14}/> Measured</span>
                                    <span className="font-mono font-black text-xl text-amber-400">{measuredDistance !== null ? measuredDistance.toFixed(3) : '--'}<span className="text-xs text-amber-600 ml-1">u</span></span>
                                </div>
                            )}
                            <div className="flex gap-2 items-stretch h-12">
                                <div className="relative flex-1">
                                    <input type="text" inputMode="decimal" value={quizState.userAnswer} onChange={(e) => setQuizAnswer(e.target.value)} disabled={quizState.feedback === 'correct' || quizState.feedback === 'stage_complete'} className="w-full h-full bg-slate-800 border border-slate-600 rounded-xl px-3 font-mono text-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 text-center" placeholder={playerState.isDeveloperMode ? `${to3SF(currentStage?.answer || 0)}` : "?"} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{currentStage?.unit}</span>
                                </div>
                                {quizState.feedback === 'correct' ? (
                                    <button onClick={onNextLevel} className="px-6 bg-emerald-500 text-slate-900 font-bold rounded-xl shadow-lg flex items-center gap-2 animate-in zoom-in">Next <Wand2 size={18} /></button>
                                ) : quizState.feedback === 'stage_complete' ? (
                                    <div className="px-6 bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg flex items-center gap-2 animate-in zoom-in whitespace-nowrap">Wait...</div>
                                ) : (
                                    <button onClick={onQuizSubmit} disabled={!quizState.userAnswer} className="px-6 bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-colors">Submit</button>
                                )}
                            </div>
                            {quizState.feedback !== 'idle' && (
                                <div className={`text-center font-black text-lg animate-in slide-in-from-bottom-2 ${quizState.feedback === 'correct' || quizState.feedback === 'stage_complete' ? 'text-emerald-400' : quizState.feedback === 'timeout' ? 'text-rose-500 uppercase' : 'text-rose-400'}`}>
                                    {quizState.feedback === 'correct' ? 'EXCELLENT!' : quizState.feedback === 'stage_complete' ? 'BOSS DAMAGED!' : quizState.feedback === 'timeout' ? 'TIME UP!' : 'INCORRECT'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

const SideButton: React.FC<{ onClick: () => void, active?: boolean, icon: React.ReactNode, label: string, color: 'slate'|'amber'|'indigo' }> = ({ onClick, active, icon, label, color }) => {
  const styles = {
      slate: active ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/80 text-white hover:bg-slate-700',
      amber: active ? 'bg-amber-500 text-slate-900' : 'bg-slate-800/80 text-amber-400 hover:bg-slate-700',
      indigo: active ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-indigo-400 hover:bg-slate-700',
  }
  return (
    <div className="flex flex-col items-center gap-1 group">
        <button onClick={onClick} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-xl border border-slate-600/50 backdrop-blur ${styles[color]} ${active ? 'scale-95 ring-2 ring-white/20' : 'hover:scale-105'}`}>{icon}</button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{label}</span>
    </div>
  );
};
