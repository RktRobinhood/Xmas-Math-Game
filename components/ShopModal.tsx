
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { X, ShoppingBag, Lock, Check, Filter } from 'lucide-react';
import { SHOP_ITEMS } from '../utils/ibQuestions';
import { PlayerState, ShopItem } from '../types';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onBuy: (item: ShopItem) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, playerState, onBuy }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'consumable' | 'passive' | 'cosmetic'>('all');

  if (!isOpen) return null;

  const filteredItems = SHOP_ITEMS.filter(item => 
    activeTab === 'all' ? true : item.type === activeTab
  );

  const tabs = [
      { id: 'all', label: 'All' },
      { id: 'consumable', label: 'Items' },
      { id: 'passive', label: 'Perks' },
      { id: 'cosmetic', label: 'Style' },
  ] as const;
  
  // Inventory Counts for Badge
  const inventoryCounts = playerState.inventory.reduce((acc, itemId) => {
      acc[itemId] = (acc[itemId] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-lg font-extrabold text-white leading-tight">
                    Supply Depot
                </h2>
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm">
                    <span>🪙 {playerState.gold}</span>
                    {playerState.isDeveloperMode && <span className="text-xs bg-rose-500 text-white px-2 rounded">DEV</span>}
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 overflow-x-auto shrink-0 border-b border-slate-700/50 scrollbar-hide">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-slate-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'}
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* List */}
        <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
            {filteredItems.map((item) => {
                // Calculation Logic
                const currentLevel = playerState.activePassives[item.id] || 0;
                const maxLevel = item.maxLevel || 1;
                const ownedCount = inventoryCounts[item.id] || 0;
                
                let cost = item.cost;
                // If passive, cost scales
                if (item.type === 'passive' && item.costMultiplier && currentLevel > 0) {
                     cost = Math.floor(item.cost * Math.pow(item.costMultiplier, currentLevel));
                }

                if (playerState.isDeveloperMode) cost = 0;
                
                const canAfford = playerState.gold >= cost;
                
                // Logic for "Owned" vs "Maxed"
                const isMaxed = currentLevel >= maxLevel;
                
                // For cosmetics, owned means level > 0
                const isCosmeticOwned = item.type === 'cosmetic' && (
                     playerState.cosmetics.hat === item.effectId || 
                     playerState.cosmetics.outfit === item.effectId ||
                     (playerState.inventory.includes(item.id)) 
                );

                const isDisabled = isMaxed || (isCosmeticOwned) || !canAfford;

                return (
                    <div key={item.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-700 flex items-center gap-3 hover:bg-slate-700/60 transition-colors">
                        {/* Icon */}
                        <div className="relative w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-2xl shrink-0 border border-slate-600/50">
                            {item.icon}
                            {item.type === 'passive' && (
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-[10px] px-1 rounded border border-slate-600 font-mono text-slate-300">
                                    {currentLevel}/{maxLevel}
                                </div>
                            )}
                            {ownedCount > 0 && item.type === 'consumable' && (
                                <div className="absolute -top-1 -left-1 bg-indigo-500 text-white text-[9px] font-bold px-1 rounded-full border border-slate-800">
                                    {ownedCount}
                                </div>
                            )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-slate-100 font-bold text-sm truncate">{item.name}</h3>
                            <p className="text-slate-400 text-xs truncate">{item.description}</p>
                        </div>
                        
                        {/* Button */}
                        <button 
                            onClick={() => onBuy(item)}
                            disabled={isDisabled}
                            className={`
                                h-9 px-3 min-w-[80px] rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0
                                ${isMaxed || isCosmeticOwned
                                    ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-900/50 cursor-default' 
                                    : canAfford 
                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/10' 
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                            `}
                        >
                            {isMaxed || isCosmeticOwned ? (
                                <Check size={14} strokeWidth={3} />
                            ) : (
                                <>
                                    {!canAfford && <Lock size={12} />}
                                    {cost}
                                </>
                            )}
                        </button>
                    </div>
                );
            })}
            
            {filteredItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm italic">
                    No items in this category.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
