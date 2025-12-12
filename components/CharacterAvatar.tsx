
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { PlayerAvatarId } from '../types';

interface Props {
    level?: number;
    avatarId: PlayerAvatarId;
    cosmetics: { hat: string; outfit: string; };
}

export const CharacterAvatar: React.FC<Props> = ({ level = 1, avatarId, cosmetics }) => {
    
    // Tunic Colors
    const getTunicColor = (base: string) => {
        if (cosmetics.outfit === 'tunic_red') return '#dc2626';
        if (cosmetics.outfit === 'tunic_blue') return '#2563eb';
        if (cosmetics.outfit === 'tunic_green') return '#15803d';
        return base; // Default
    };

    const renderHat = (yOffset: number) => {
        if (cosmetics.hat === 'hat_santa') {
            return (
                <g transform={`translate(0, ${yOffset})`}>
                    <path d="M20 25 C20 15 30 5 50 5 C70 5 80 15 80 25 L80 35 L20 35 Z" fill="#dc2626" />
                    <circle cx="80" cy="35" r="8" fill="white" />
                    <rect x="20" y="30" width="60" height="10" rx="5" fill="white" />
                </g>
            );
        }
        if (cosmetics.hat === 'hat_blue') {
            return (
                <g transform={`translate(0, ${yOffset})`}>
                    <path d="M25 25 C25 10 75 10 75 25 L75 35 L25 35 Z" fill="#3b82f6" />
                    <circle cx="50" cy="8" r="8" fill="#93c5fd" />
                    <rect x="25" y="30" width="50" height="8" rx="2" fill="#1d4ed8" />
                </g>
            );
        }
        return null;
    };

    // --- CHARACTER RENDERERS ---

    const renderElfMale = () => (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
            {/* Body */}
            <path d="M30 60 L70 60 L80 110 L20 110 Z" fill={getTunicColor('#166534')} />
            <path d="M50 60 L50 110" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
            {/* Belt */}
            <rect x="25" y="85" width="50" height="8" fill="#451a03" />
            {/* Belt Buckle (Level Upgrades) */}
            <rect x="45" y="84" width="10" height="10" fill={level >= 5 ? "#fbbf24" : "#f59e0b"} stroke={level >= 10 ? "#fff" : "none"} strokeWidth="1"/>
            
            {/* Head */}
            <circle cx="50" cy="40" r="22" fill="#fecaca" />
            {/* Ears */}
            <path d="M28 40 L15 35 L28 45 Z" fill="#fecaca" />
            <path d="M72 40 L85 35 L72 45 Z" fill="#fecaca" />
            {/* Face */}
            <circle cx="42" cy="38" r="3" fill="#1e293b" />
            <circle cx="58" cy="38" r="3" fill="#1e293b" />
            <path d="M45 50 Q50 55 55 50" stroke="#1e293b" strokeWidth="2" fill="none" />
            
            {/* Hat (Default Green if no cosmetic) */}
            {cosmetics.hat === 'none' && <path d="M25 30 L50 5 L75 30 Z" fill={level >= 20 ? "#ca8a04" : "#166534"} />}
            {renderHat(0)}

            {/* Level 10 Collar */}
            {level >= 10 && <path d="M35 60 Q50 75 65 60" fill="none" stroke="#fbbf24" strokeWidth="3" />}
        </svg>
    );

    const renderElfFemale = () => (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
            {/* Hair (Back) */}
            <path d="M25 40 Q20 80 30 90 L70 90 Q80 80 75 40" fill="#fcd34d" />
            {/* Body - Default Teal (#0d9488) to distinct from male */}
            <path d="M35 60 L65 60 L75 110 L25 110 Z" fill={getTunicColor('#0d9488')} />
            {/* Belt */}
            <rect x="30" y="80" width="40" height="6" fill="#f59e0b" />
            {/* Head */}
            <circle cx="50" cy="40" r="20" fill="#fecaca" />
            {/* Ears (Pointier/Higher) */}
            <path d="M30 35 L20 25 L32 40 Z" fill="#fecaca" />
            <path d="M70 35 L80 25 L68 40 Z" fill="#fecaca" />
            {/* Face (Lashes) */}
            <path d="M38 38 Q42 35 45 38" stroke="#1e293b" strokeWidth="2" fill="none" />
            <path d="M37 38 L35 36" stroke="#1e293b" strokeWidth="1" />
            <path d="M55 38 Q58 35 62 38" stroke="#1e293b" strokeWidth="2" fill="none" />
            <path d="M63 38 L65 36" stroke="#1e293b" strokeWidth="1" />
            {/* Smile */}
            <path d="M45 48 Q50 52 55 48" stroke="#be123c" strokeWidth="2" fill="none" />
            {/* Braids (Thick and Visible) */}
            <rect x="25" y="50" width="10" height="30" rx="5" fill="#fcd34d" />
            <rect x="65" y="50" width="10" height="30" rx="5" fill="#fcd34d" />
             {/* Hat */}
             {cosmetics.hat === 'none' && <path d="M30 30 L50 2 L70 30 Z" fill={level >= 20 ? "#ca8a04" : "#0d9488"} />}
             {renderHat(-5)}

             {/* Level 5 Brooch */}
             {level >= 5 && <circle cx="50" cy="65" r="4" fill="#fbbf24" stroke="#fff" strokeWidth="1" />}
        </svg>
    );

    const renderSnowman = () => (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
            {/* Bottom */}
            <circle cx="50" cy="90" r="25" fill="white" stroke="#e2e8f0" strokeWidth="2" />
            {/* Middle */}
            <circle cx="50" cy="55" r="20" fill="white" stroke="#e2e8f0" strokeWidth="2" />
            {/* Head */}
            <circle cx="50" cy="25" r="15" fill="white" stroke="#e2e8f0" strokeWidth="2" />
            {/* Eyes */}
            <circle cx="45" cy="22" r="2" fill="black" />
            <circle cx="55" cy="22" r="2" fill="black" />
            {/* Nose */}
            <path d="M50 25 L65 28 L50 31 Z" fill="#f97316" />
            {/* Buttons */}
            <circle cx="50" cy="50" r="2" fill={level >= 10 ? "#facc15" : "#1e293b"} />
            <circle cx="50" cy="60" r="2" fill={level >= 10 ? "#facc15" : "#1e293b"} />
            
            {/* Level 5 Scarf */}
            {level >= 5 && <path d="M35 45 Q50 55 65 45" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />}
            
            {/* Level 10 Monocle */}
            {level >= 10 && <circle cx="55" cy="22" r="4" fill="none" stroke="#facc15" strokeWidth="1" />}

            {renderHat(-15)}
        </svg>
    );

    const renderPenguin = () => (
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
            {/* Body */}
            <ellipse cx="50" cy="65" rx="30" ry="40" fill="#1e293b" />
            {/* Belly */}
            <ellipse cx="50" cy="70" rx="20" ry="30" fill="white" />
            {/* Eyes */}
            <circle cx="40" cy="50" r="4" fill="white" />
            <circle cx="40" cy="50" r="1.5" fill="black" />
            <circle cx="60" cy="50" r="4" fill="white" />
            <circle cx="60" cy="50" r="1.5" fill="black" />
            
            {/* Level 10 Shades */}
            {level >= 10 && (
                <g>
                    <rect x="35" y="46" width="12" height="6" fill="black" />
                    <rect x="53" y="46" width="12" height="6" fill="black" />
                    <line x1="47" y1="49" x2="53" y2="49" stroke="black" strokeWidth="2" />
                </g>
            )}

            {/* Beak */}
            <path d="M45 55 L55 55 L50 65 Z" fill="#f59e0b" />
            {/* Feet */}
            <path d="M30 100 Q20 100 25 90 L35 95 Z" fill="#f59e0b" />
            <path d="M70 100 Q80 100 75 90 L65 95 Z" fill="#f59e0b" />
            
            {/* Level 5 Bowtie */}
            {level >= 5 && <path d="M40 75 L60 75 L40 85 L60 85 Z" fill="#ef4444" />}
            
            {renderHat(15)}
        </svg>
    );

    return (
        <div className="w-16 h-16 relative hover:scale-110 transition-transform cursor-pointer">
            {avatarId === 'elf' && renderElfMale()}
            {avatarId === 'elf_female' && renderElfFemale()}
            {avatarId === 'snowman' && renderSnowman()}
            {avatarId === 'penguin' && renderPenguin()}
            
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm">
                {level}
            </div>
        </div>
    );
};
