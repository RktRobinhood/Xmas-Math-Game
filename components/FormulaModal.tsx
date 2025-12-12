
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { FORMULAS } from '../utils/formulas';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border-2 border-slate-200 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">
                    IB Formula Booklet
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Math SL Reference
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
            {FORMULAS.map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                    <h3 className="font-bold text-slate-800 mb-2">{f.name}</h3>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="font-semibold text-slate-500 text-xs uppercase">Volume</span>
                            <span className="font-serif italic font-bold text-indigo-700">{f.volume}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="font-semibold text-slate-500 text-xs uppercase">Surface Area</span>
                            <span className="font-serif italic font-bold text-indigo-700">{f.sa}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
