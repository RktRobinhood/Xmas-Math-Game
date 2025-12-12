
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Problem, ShopItem, ShapeSpec, ShapeType, DimensionSpec, AngleSpec, LabelSpec } from '../types';
import { COLORS } from './voxelConstants';

// --- Shop Definitions ---
export const SHOP_ITEMS: ShopItem[] = [
    // Consumables
    { id: 'cookie', name: 'Gingerbread', description: 'Heal 1 Heart', type: 'consumable', cost: 50, icon: '🍪', effectId: 'heal', rarity: 'common' },
    { id: 'snowglobe', name: 'Snow Globe', description: 'Skip Level (or Hit Boss)', type: 'consumable', cost: 150, icon: '🔮', effectId: 'skip', rarity: 'rare' },
    { id: 'bomb', name: 'Cherry Bomb', description: 'Damage Boss', type: 'consumable', cost: 200, icon: '💣', effectId: 'bomb', rarity: 'rare' },
    
    // Passives (Levelable)
    { id: 'heart_plus', name: 'Heart Container', description: '+1 Max Life', type: 'passive', cost: 150, icon: '❤️', effectId: 'heart_boost', maxLevel: 3, costMultiplier: 2.0 },
    { id: 'pencil', name: 'Sharp Pencil', description: '+Boss Damage', type: 'passive', cost: 120, icon: '✏️', effectId: 'damage_boost', maxLevel: 5, costMultiplier: 1.5 },
    { id: 'stopwatch', name: 'Frosty Watch', description: '+Max Time', type: 'passive', cost: 80, icon: '⏱️', effectId: 'time_boost', maxLevel: 5, costMultiplier: 1.4 },
    { id: 'sack', name: 'Magic Sack', description: '+Gold Gain', type: 'passive', cost: 200, icon: '💰', effectId: 'gold_boost', maxLevel: 5, costMultiplier: 1.6 },

    // Cosmetics (Purchasable)
    { id: 'hat_santa', name: 'Santa Hat', description: 'Classic Red', type: 'cosmetic', cost: 300, icon: '🎅', effectId: 'hat_santa' },
    { id: 'hat_blue', name: 'Frozen Cap', description: 'Icy Blue', type: 'cosmetic', cost: 300, icon: '🧢', effectId: 'hat_blue' },
    { id: 'tunic_green', name: 'Elf Tunic', description: 'Traditional', type: 'cosmetic', cost: 250, icon: '👕', effectId: 'tunic_green' },
    { id: 'tunic_red', name: 'Santa Suit', description: 'Festive Red', type: 'cosmetic', cost: 350, icon: '🧥', effectId: 'tunic_red' },
    { id: 'tunic_blue', name: 'Glacier Tunic', description: 'Icy Cool', type: 'cosmetic', cost: 350, icon: '❄️', effectId: 'tunic_blue' },
];

const BOSS_LOOT: ShopItem[] = [
    { id: 'crown_ice', name: 'Ice Crown', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '👑', effectId: 'hat_ice', rarity: 'legendary' },
    { id: 'antlers', name: 'Reindeer Antlers', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '🦌', effectId: 'hat_antlers', rarity: 'legendary' },
    { id: 'monocle_gold', name: 'Golden Monocle', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '🧐', effectId: 'hat_monocle', rarity: 'rare' },
    { id: 'protractor', name: 'The Protractor', description: 'Boss Drop', type: 'cosmetic', cost: 0, icon: '📐', effectId: 'hat_geo', rarity: 'legendary' }
];

// --- Helpers ---
const createId = () => Math.random().toString(36).substring(7);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toPrecision(3));
const toDeg = (rad: number) => rad * (180 / Math.PI);
const toRad = (deg: number) => deg * (Math.PI / 180);

// --- Generators ---

// 1. Primitives
const SimpleCube = (diff: number): Problem => {
    const s = randInt(3, 6); // Reduced max height from 8+diff
    return {
        id: createId(), title: "Cube Volume", difficulty: diff, goldReward: 10 + diff,
        shapes: [{ id: '1', type: 'cuboid', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:s,height:s,depth:s}, color: COLORS.presents[0] }],
        dimensions: [
            { start: {x:-s/2, y:-s/2, z:s/2}, end: {x:s/2, y:-s/2, z:s/2}, offset: {x:0,y:-1,z:0}, text: `s=${s}` }
        ],
        stages: [{ id: '1', question: "Calculate the volume of the cube.", answer: Math.pow(s,3), unit: 'u³', hint: 'V = s³' }]
    };
};

const CylinderVol = (diff: number): Problem => {
    const r = randInt(2, 4);
    const h = randInt(4, 8); // Reduced max height
    return {
        id: createId(), title: "Cylinder Volume", difficulty: diff, goldReward: 15 + diff,
        shapes: [{ id: '1', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[1] }],
        dimensions: [
            { start: {x:-r, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `d=${r*2}` },
            { start: {x:r, y:0, z:0}, end: {x:r, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` }
        ],
        stages: [{ id: '1', question: "Calculate the volume.", answer: Math.PI * r * r * h, unit: 'u³', hint: 'V = πr²h' }]
    };
};

const ConeSlant = (diff: number): Problem => {
    const r = randInt(3, 5);
    const h = randInt(4, 7); // Reduced max height
    const l = Math.sqrt(r*r + h*h);
    return {
        id: createId(), title: "Cone Slant Height", difficulty: diff, goldReward: 20,
        shapes: [{ id: '1', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[2] }],
        dimensions: [
            { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:r + 2, y:0, z:0}, text: `h=${h}` },
            { start: {x:0, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `r=${r}` }
        ],
        stages: [{ id: '1', question: "Find the slant height (l).", answer: l, unit: 'u', hint: 'Pythagoras: l² = h² + r²' }]
    };
};

// 2. Composite Shapes
const IceCreamVol = (diff: number): Problem => {
    const r = randInt(3, 4);
    const h_cone = randInt(5, 8); // Reduced
    const vol = (Math.PI * r*r * h_cone)/3 + (2/3 * Math.PI * Math.pow(r,3));
    
    return {
        id: createId(), title: "Ice Cream Volume", difficulty: diff + 1, goldReward: 30,
        shapes: [
            { id: 'cone', type: 'cone', position: {x:0,y:h_cone/2,z:0}, rotation:{x:Math.PI,y:0,z:0}, dims:{radius:r, height:h_cone}, color: COLORS.presents[3] },
            { id: 'hemi', type: 'hemisphere', position: {x:0,y:h_cone,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r}, color: COLORS.presents[4] }
        ],
        dimensions: [
            { start: {x:r, y:0, z:0}, end: {x:r, y:h_cone, z:0}, offset: {x:1,y:0,z:0}, text: `h_cone=${h_cone}` },
            { start: {x:0, y:h_cone, z:0}, end: {x:r, y:h_cone, z:0}, offset: {x:0,y:1,z:0}, text: `r=${r}` }
        ],
        stages: [{ id: '1', question: "Find total volume of the solid.", answer: vol, unit: 'u³', hint: 'V_cone + V_hemisphere' }]
    };
};

const SiloSA = (diff: number): Problem => {
    const r = randInt(3, 4);
    const h_cyl = randInt(4, 7); // Reduced
    const h_cone = randInt(3, 4);
    const l = Math.sqrt(r*r + h_cone*h_cone);
    
    const sa = (2 * Math.PI * r * h_cyl) + (Math.PI * r * l) + (Math.PI * r * r);

    return {
        id: createId(), title: "Silo Surface Area", difficulty: diff + 2, goldReward: 40,
        shapes: [
            { id: 'cyl', type: 'cylinder', position: {x:0,y:h_cyl/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h_cyl}, color: COLORS.presents[1] },
            { id: 'cone', type: 'cone', position: {x:0,y:h_cyl + h_cone/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h_cone}, color: COLORS.presents[0] }
        ],
        dimensions: [
            { start: {x:r, y:0, z:0}, end: {x:r, y:h_cyl, z:0}, offset: {x:1,y:0,z:0}, text: `h_cyl=${h_cyl}` },
            { start: {x:r, y:h_cyl, z:0}, end: {x:r, y:h_cyl+h_cone, z:0}, offset: {x:1,y:0,z:0}, text: `h_cone=${h_cone}` },
            { start: {x:0, y:0, z:r}, end: {x:r, y:0, z:r}, offset: {x:0,y:0,z:1}, text: `r=${r}` }
        ],
        stages: [{ id: '1', question: "Find Total Surface Area.", answer: sa, unit: 'u²', hint: 'Cyl_curved + Cone_curved + Base' }]
    };
};

// 3. Hollow Shapes
const HollowPipeVol = (diff: number): Problem => {
    const R = randInt(4, 5);
    const r = randInt(1, 3);
    const h = randInt(6, 10); // Reduced
    const vol = Math.PI * h * (R*R - r*r);

    return {
        id: createId(), title: "Pipe Volume", difficulty: diff + 1, goldReward: 25,
        shapes: [
            { id: 'outer', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:R, height:h}, color: COLORS.presents[1] },
            { id: 'inner', type: 'cylinder', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h+0.1}, color: 0x0f172a }
        ],
        dimensions: [
            { start: {x:0, y:h, z:0}, end: {x:R, y:h, z:0}, offset: {x:0,y:1,z:0}, text: `R=${R}` },
            { start: {x:0, y:h, z:0}, end: {x:-r, y:h, z:0}, offset: {x:0,y:1,z:0}, text: `r=${r}` },
            { start: {x:R, y:0, z:0}, end: {x:R, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` }
        ],
        stages: [{ id: '1', question: "Find volume of the material.", answer: vol, unit: 'u³', hint: 'V_outer - V_inner' }]
    };
};

const ConeFrustumVol = (diff: number): Problem => {
    const R = randInt(5, 7);
    const r = randInt(2, 4);
    const h = randInt(5, 8); // Reduced
    const vol = (Math.PI * h / 3) * (R*R + R*r + r*r);
    
    // Ghost Height calculation
    const H_total = (h * R) / (R - r);
    const h_missing = H_total - h;

    return {
        id: createId(), title: "Frustum Volume", difficulty: diff + 3, goldReward: 45,
        shapes: [
            { id: 'frustum', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:R, radiusTop:r, height:h}, color: COLORS.presents[2] },
            { id: 'ghost', type: 'cone', position: {x:0,y:h + h_missing/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h_missing}, color: 0xffffff }
        ],
        dimensions: [
            { start: {x:R, y:0, z:0}, end: {x:r, y:h, z:0}, offset: {x:1,y:0,z:0}, text: `h=${h}` },
            { start: {x:0, y:0, z:R}, end: {x:R, y:0, z:R}, offset: {x:0,y:0,z:1}, text: `R=${R}` },
            { start: {x:0, y:h, z:r}, end: {x:r, y:h, z:r}, offset: {x:0,y:0,z:1}, text: `r=${r}` }
        ],
        stages: [{ id: '1', question: "Calculate the volume.", answer: vol, unit: 'u³', hint: 'V = (πh/3)(R² + Rr + r²)' }]
    };
};

// 5. Trigonometry

const TrigFindHeight = (diff: number): Problem => {
    const base = randInt(8, 15); // Reduced base
    const angle = randInt(25, 60);
    const rad = toRad(angle);
    const height = base * Math.tan(rad);
    
    return {
        id: createId(), title: "Trig: Find Height", difficulty: diff, goldReward: 25,
        shapes: [
             { id: 'tri', type: 'pyramid', position: {x:0,y:height/2,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:base, height:height}, color: COLORS.presents[0] }
        ],
        dimensions: [
            { start: {x:0, y:0, z:0}, end: {x:base, y:0, z:0}, offset: {x:0,y:-0.5,z:0}, text: `adj=${base}` }
        ],
        angles: [
            { origin: {x:base, y:0, z:0}, vecA: {x:-1,y:0,z:0}, vecB: {x:-1,y:height/base,z:0}, text: `${angle}°` }
        ],
        stages: [{ id: '1', question: "Find the vertical height (h).", answer: height, unit: 'u', hint: 'tan(θ) = opp/adj' }]
    };
};

const TrigFindSlant = (diff: number): Problem => {
    const h = randInt(8, 12); // Reduced height
    const angle = randInt(30, 60);
    const rad = toRad(angle);
    const l = h / Math.sin(rad);

    return {
        id: createId(), title: "Trig: Slant Height", difficulty: diff, goldReward: 25,
        shapes: [{ id: 'cone', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius: h / Math.tan(rad), height:h}, color: COLORS.presents[3] }],
        dimensions: [
            { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:0}, text: `h=${h}` }
        ],
        angles: [
            { origin: {x:h/Math.tan(rad), y:0, z:0}, vecA: {x:-1,y:0,z:0}, vecB: {x:-1,y:Math.tan(rad),z:0}, text: `${angle}°` }
        ],
        stages: [{ id: '1', question: "Find the slant height (l).", answer: l, unit: 'u', hint: 'sin(θ) = opp/hyp' }]
    };
};

const TrigRamp = (diff: number): Problem => {
    const base = randInt(8, 12);
    const height = randInt(5, 8); // Reduced
    const angle = toDeg(Math.atan(height/base));

    return {
        id: createId(), title: "Ramp Angle", difficulty: diff, goldReward: 30,
        shapes: [{ id: 'pyr', type: 'pyramid', position: {x:0,y:height/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:base*2, height:height}, color: COLORS.presents[2] }],
        dimensions: [
            { start: {x:0, y:0, z:0}, end: {x:0, y:0, z:base}, offset: {x:1,y:0,z:0}, text: `adj=${base}` },
            { start: {x:0, y:0, z:0}, end: {x:0, y:height, z:0}, offset: {x:0,y:0,z:-1}, text: `opp=${height}` }
        ],
        angles: [
            { origin: {x:0, y:0, z:base}, vecA: {x:0,y:0,z:-1}, vecB: {x:0,y:height,z:-base}, text: `θ` }
        ],
        stages: [{ id: '1', question: "Find the angle of elevation θ.", answer: angle, unit: '°', hint: 'tan(θ) = opp/adj' }]
    };
};

const TrigConeApex = (diff: number): Problem => {
    const r = randInt(4, 6);
    const h = randInt(6, 10); // Reduced
    const halfAngle = toDeg(Math.atan(r/h));
    const fullAngle = halfAngle * 2;

    return {
        id: createId(), title: "Cone Apex Angle", difficulty: diff + 1, goldReward: 35,
        shapes: [{ id: 'cone', type: 'cone', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:r, height:h}, color: COLORS.presents[4] }],
        dimensions: [
            { start: {x:0, y:h, z:0}, end: {x:r, y:0, z:0}, offset: {x:1,y:1,z:0}, text: `l` },
            { start: {x:-r, y:0, z:0}, end: {x:r, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: `diameter=${r*2}` },
            { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:1}, text: `h=${h}` }
        ],
        angles: [
            { origin: {x:0, y:h, z:0}, vecA: {x:r,y:-h,z:0}, vecB: {x:-r,y:-h,z:0}, text: `θ` }
        ],
        stages: [{ id: '1', question: "Calculate the total apex angle θ.", answer: fullAngle, unit: '°', hint: 'Find half angle first: tan(α) = r/h' }]
    }
}

const TrigPyramidEdge = (diff: number): Problem => {
    const base = randInt(8, 12); // Reduced
    const h = randInt(6, 10); // Reduced
    const diag = Math.sqrt(base*base + base*base);
    const halfDiag = diag / 2;
    const angle = toDeg(Math.atan(h / halfDiag));

    return {
        id: createId(), title: "Pyramid Edge Angle", difficulty: diff + 2, goldReward: 40,
        shapes: [{ id: 'pyr', type: 'pyramid', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:halfDiag*1.4, height:h}, color: COLORS.presents[0] }], 
        dimensions: [
            { start: {x:-base/2, y:0, z:base/2}, end: {x:base/2, y:0, z:base/2}, offset: {x:0,y:0,z:1}, text: `w=${base}` },
            { start: {x:0, y:0, z:0}, end: {x:0, y:h, z:0}, offset: {x:0,y:0,z:-1}, text: `h=${h}` }
        ],
        angles: [
             { origin: {x:base/2, y:0, z:base/2}, vecA: {x:-1,y:0,z:-1}, vecB: {x:-base/2,y:h,z:-base/2}, text: `θ` }
        ],
        stages: [{ id: '1', question: "Find angle between the slant edge and the base.", answer: angle, unit: '°', hint: '1. Find diagonal. 2. Use tan(θ) = h / (diag/2)' }]
    }
}

const TrigCuboidSpace = (diff: number): Problem => {
    const w = randInt(5, 8);
    const d = randInt(5, 8);
    const h = randInt(4, 7); // Reduced
    const floorDiag = Math.sqrt(w*w + d*d);
    const angle = toDeg(Math.atan(h / floorDiag));

    return {
        id: createId(), title: "Space Diagonal", difficulty: diff + 3, goldReward: 50,
        shapes: [{ id: 'box', type: 'cuboid', position: {x:0,y:h/2,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:w, height:h, depth:d}, color: 0x94a3b8 }],
        dimensions: [
             { start: {x:-w/2, y:0, z:d/2}, end: {x:w/2, y:0, z:d/2}, offset: {x:0,y:0,z:1}, text: `w=${w}` },
             { start: {x:w/2, y:0, z:d/2}, end: {x:w/2, y:0, z:-d/2}, offset: {x:1,y:0,z:0}, text: `d=${d}` },
             { start: {x:w/2, y:0, z:-d/2}, end: {x:w/2, y:h, z:-d/2}, offset: {x:1,y:0,z:0}, text: `h=${h}` }
        ],
        angles: [
            { origin: {x:-w/2, y:0, z:d/2}, vecA: {x:w,y:0,z:-d}, vecB: {x:w,y:h,z:-d}, text: `θ` }
        ],
        stages: [{ id: '1', question: "Find the angle between the 3D diagonal and the base.", answer: angle, unit: '°', hint: '1. Find floor diagonal. 2. tan(θ) = h/floor_diag' }]
    }
}


// --- MAIN BOSSES ---

const BossNutcracker = (level: number): Problem => {
    return {
        id: createId(), title: "General Nutcracker", difficulty: 5, goldReward: 200, isBoss: true, bossName: "Nutcracker", bossAvatar: "💂", bossType: 'main', bossMusicTheme: 'nutcracker', bossHP: 100,
        dropTable: [BOSS_LOOT[0]], 
        shapes: [
            { id: 'body', type: 'cuboid', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:8, height:12, depth:5}, color: COLORS.presents[0] },
            { id: 'head', type: 'cuboid', position: {x:0,y:17,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:6, height:6, depth:6}, color: COLORS.presents[4] }
        ],
        stages: [
            { id: '1', question: "Calculate volume of the BODY (Red Prism).", answer: 8*12*5, unit: 'u³' },
            { id: '2', question: "Calculate surface area of HEAD (White Cube).", answer: 6*(6*6), unit: 'u²' },
            { id: '3', question: "The Hat (not shown) is a cone with r=3, h=4. Find its Volume.", answer: (Math.PI*9*4)/3, unit: 'u³' },
            { id: '4', question: "Find the Slant Height of that Hat.", answer: 5, unit: 'u' },
            { id: '5', question: "Total Height of Body + Head.", answer: 12 + 6, unit: 'u' }
        ],
        dimensions: [
             { start: {x:-4, y:2, z:2.5}, end: {x:4, y:2, z:2.5}, offset: {x:0,y:-1,z:0}, text: 'w=8' },
             { start: {x:4, y:2, z:2.5}, end: {x:4, y:14, z:2.5}, offset: {x:1,y:0,z:0}, text: 'h_body=12' }
        ]
    };
}

const BossKrampus = (level: number): Problem => {
    return {
        id: createId(), title: "Krampus Lair", difficulty: 7, goldReward: 400, isBoss: true, bossName: "Krampus", bossAvatar: "👹", bossType: 'main', bossMusicTheme: 'krampus', bossHP: 200,
        dropTable: [BOSS_LOOT[1]], 
        shapes: [
            { id: 'cage', type: 'cylinder', position: {x:0,y:6,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:5, height:12}, color: 0x334155 },
            { id: 'horn', type: 'cone', position: {x:4,y:14,z:0}, rotation:{x:0,y:0,z:-0.5}, dims:{radius:2, height:8}, color: 0x9f1239 }
        ],
        stages: [
            { id: '1', question: "Volume of the Cage (Cylinder).", answer: Math.PI*25*12, unit: 'u³' },
            { id: '2', question: "Curved Surface Area of the Cage.", answer: 2*Math.PI*5*12, unit: 'u²' },
            { id: '3', question: "Volume of the Horn (Cone).", answer: (Math.PI*4*8)/3, unit: 'u³' },
            { id: '4', question: "Slant height of the Horn.", answer: Math.sqrt(64+4), unit: 'u' },
            { id: '5', question: "Distance from Cage base center to Horn tip (approx coords).", answer: Math.sqrt(4*4 + 14*14), unit: 'u', hint: '3D Pythagoras' }
        ],
        dimensions: [
            { start: {x:-5, y:0, z:0}, end: {x:5, y:0, z:0}, offset: {x:0,y:-1,z:0}, text: 'd=10' },
            { start: {x:5, y:0, z:0}, end: {x:5, y:12, z:0}, offset: {x:1,y:0,z:0}, text: 'h=12' }
        ]
    };
}

const BossMechaSanta = (level: number): Problem => {
    return {
        id: createId(), title: "Mecha-Santa Protocol", difficulty: 9, goldReward: 600, isBoss: true, bossName: "Mecha-Santa", bossAvatar: "🤖", bossType: 'main', bossMusicTheme: 'mecha', bossHP: 300,
        dropTable: [BOSS_LOOT[2]], 
        shapes: [
            { id: 'torso', type: 'cuboid', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:10, height:12, depth:6}, color: 0x94a3b8 },
            { id: 'core', type: 'sphere', position: {x:0,y:8,z:3}, rotation:{x:0,y:0,z:0}, dims:{radius:2}, color: 0xef4444 }
        ],
        stages: [
            { id: '1', question: "Volume of Torso (Cuboid).", answer: 10*12*6, unit: 'u³' },
            { id: '2', question: "Volume of Reactor Core (Sphere).", answer: (4/3)*Math.PI*8, unit: 'u³' },
            { id: '3', question: "Surface Area of Reactor Core.", answer: 4*Math.PI*4, unit: 'u²' },
            { id: '4', question: "Space remaining in torso if Core was inside.", answer: (10*12*6) - ((4/3)*Math.PI*8), unit: 'u³' },
            { id: '5', question: "Diagonal of the Torso.", answer: Math.sqrt(10*10 + 12*12 + 6*6), unit: 'u' }
        ],
        dimensions: [
             { start: {x:-5, y:2, z:3}, end: {x:5, y:2, z:3}, offset: {x:0,y:-1,z:0}, text: 'w=10' },
             { start: {x:5, y:2, z:3}, end: {x:5, y:14, z:3}, offset: {x:1,y:0,z:0}, text: 'h=12' }
        ]
    };
}

const BossYeti = (level: number): Problem => {
     return {
        id: createId(), title: "Yeti King", difficulty: 6, goldReward: 250, isBoss: true, bossName: "Yeti King", bossAvatar: "🦍", bossType: 'main', bossMusicTheme: 'boss', bossHP: 150,
        dropTable: [BOSS_LOOT[0]],
        shapes: [
            { id: 'body', type: 'hemisphere', position: {x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:6}, color: 0xffffff },
            { id: 'head', type: 'cuboid', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:5,height:5,depth:5}, color: 0xbae6fd }
        ],
        stages: [
            { id: '1', question: "Volume of Body (Hemisphere, r=6).", answer: (2/3)*Math.PI*216, unit: 'u³' },
            { id: '2', question: "Surface Area of the Body (Curved + Base).", answer: 3*Math.PI*36, unit: 'u²' },
            { id: '3', question: "Volume of Head (Cube, s=5).", answer: 125, unit: 'u³' },
            { id: '4', question: "Total Volume.", answer: ((2/3)*Math.PI*216) + 125, unit: 'u³' }
        ]
     }
}

const BossDarkElf = (level: number): Problem => {
     return {
        id: createId(), title: "Dark Elf Sorcerer", difficulty: 8, goldReward: 350, isBoss: true, bossName: "Malekith", bossAvatar: "🧝", bossType: 'main', bossMusicTheme: 'boss', bossHP: 200,
        dropTable: [BOSS_LOOT[2]],
        shapes: [
            { id: 'tower', type: 'hex_prism', position: {x:0,y:7,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:5, height:14}, color: 0x4c1d95 }
        ],
        stages: [
            { id: '1', question: "Area of Hexagon Base (s=5).", answer: (3*Math.sqrt(3)/2)*25, unit: 'u²', hint: 'Area = (3√3 / 2) * s²' },
            { id: '2', question: "Volume of Tower (Area * h).", answer: ((3*Math.sqrt(3)/2)*25) * 14, unit: 'u³' },
            { id: '3', question: "Lateral Surface Area (6 rectangles).", answer: 6 * 5 * 14, unit: 'u²' }
        ],
        dimensions: [
            { start: {x:0,y:0,z:0}, end: {x:5,y:0,z:0}, offset: {x:0,y:0,z:1}, text: 's=5' },
            { start: {x:5,y:0,z:0}, end: {x:5,y:14,z:0}, offset: {x:1,y:0,z:0}, text: 'h=14' }
        ]
     }
}

const BossGeometer = (level: number): Problem => {
    // Pure Abstract Shapes - TRIG BOSS
    const base = 16;
    const h = 16;
    const diag = Math.sqrt(16*16 + 16*16 + 16*16);
    const angle = toDeg(Math.atan(16 / Math.sqrt(512)));
    
    return {
        id: createId(), title: "The Geometer", difficulty: 10, goldReward: 500, isBoss: true, bossName: "The Geometer", bossAvatar: "📐", bossType: 'main', bossMusicTheme: 'mecha', bossHP: 250,
        dropTable: [BOSS_LOOT[3]],
        shapes: [
            { id: 'cube', type: 'cuboid', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:16,height:16,depth:16}, color: 0x64748b },
            { id: 'pyr', type: 'pyramid', position: {x:0,y:8,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:16, height:16}, color: 0xfacc15 }
        ],
        stages: [
            { id: '1', question: "Find Space Diagonal of the Cube (s=16).", answer: diag, unit: 'u' },
            { id: '2', question: "Angle between Space Diagonal and Floor.", answer: angle, unit: '°' },
            { id: '3', question: "Volume of the internal Pyramid.", answer: (256*16)/3, unit: 'u³' },
            { id: '4', question: "Surface Area of the Cube.", answer: 6*256, unit: 'u²' },
            { id: '5', question: "Angle of Elevation of Pyramid Edge.", answer: toDeg(Math.atan(16 / (Math.sqrt(512)/2))), unit: '°' }
        ],
        dimensions: [
            { start: {x:-8,y:0,z:8}, end: {x:8,y:0,z:8}, offset: {x:0,y:-1,z:0}, text: 's=16' },
            { start: {x:8,y:0,z:8}, end: {x:8,y:16,z:8}, offset: {x:1,y:0,z:0}, text: 'h=16' }
        ]
    }
}


// --- MINI BOSSES (Lvl 5, 15, 25...) ---
const MiniBossSled = (level: number): Problem => {
    return {
        id: createId(), title: "Grinch Sled", difficulty: 4, goldReward: 100, isBoss: true, bossName: "The Grinch", bossAvatar: "🛷", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 50,
        shapes: [
            { id: 'base', type: 'cuboid', position: {x:0,y:2,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:10, height:4, depth:6}, color: COLORS.presents[2] },
            { id: 'seat', type: 'cuboid', position: {x:-2,y:5,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:4, height:4, depth:4}, color: COLORS.presents[0] }
        ],
        stages: [
             { id: '1', question: "Volume of the base.", answer: 10*4*6, unit: 'u³' },
             { id: '2', question: "Volume of the seat.", answer: 4*4*4, unit: 'u³' },
             { id: '3', question: "Total Volume.", answer: (10*4*6) + (4*4*4), unit: 'u³' }
        ],
        dimensions: [
             { start: {x:-5, y:0, z:3}, end: {x:5, y:0, z:3}, offset: {x:0,y:0,z:1}, text: 'L=10' },
             { start: {x:5, y:0, z:3}, end: {x:5, y:0, z:-3}, offset: {x:1,y:0,z:0}, text: 'W=6' }
        ]
    };
}

const MiniBossHouse = (level: number): Problem => {
    const s = 8;
    const h_roof = 5;
    return {
        id: createId(), title: "Gingerbread House", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Cookie Monster", bossAvatar: "🏠", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60,
        shapes: [
            { id: 'base', type: 'cuboid', position: {x:0,y:4,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:s, height:s, depth:s}, color: 0xcd853f },
            { id: 'roof', type: 'pyramid', position: {x:0,y:8 + h_roof/2,z:0}, rotation:{x:0,y:Math.PI/4,z:0}, dims:{radius:s, height:h_roof}, color: 0xffffff }
        ],
        stages: [
            { id: '1', question: "Volume of the base (Cube).", answer: 512, unit: 'u³' },
            { id: '2', question: "Volume of the roof (Pyramid).", answer: (64*5)/3, unit: 'u³' },
            { id: '3', question: "Slant height of the roof.", answer: Math.sqrt(16 + 25), unit: 'u', hint: 'l² = (w/2)² + h²' }
        ],
        dimensions: [
            { start: {x:-4, y:0, z:4}, end: {x:4, y:0, z:4}, offset: {x:0,y:-1,z:0}, text: 's=8' },
            { start: {x:4, y:8, z:4}, end: {x:4, y:13, z:4}, offset: {x:1,y:0,z:0}, text: 'h=5' }
        ]
    }
}

const MiniBossSnowman = (level: number): Problem => {
    return {
        id: createId(), title: "Snow Golem", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Frosty Guard", bossAvatar: "⛄", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60,
        shapes: [
            { id: 'bot', type: 'sphere', position: {x:0,y:4,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:4}, color: 0xffffff },
            { id: 'mid', type: 'sphere', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:3}, color: 0xffffff },
            { id: 'top', type: 'sphere', position: {x:0,y:15,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:2}, color: 0xffffff }
        ],
        stages: [
            { id: '1', question: "Volume of Bottom Sphere (r=4).", answer: (4/3)*Math.PI*64, unit: 'u³' },
            { id: '2', question: "Volume of Head (r=2).", answer: (4/3)*Math.PI*8, unit: 'u³' },
            { id: '3', question: "Total Height.", answer: 4+4 + 3+3 + 2+2, unit: 'u' }
        ],
        dimensions: [
            { start: {x:-4, y:4, z:0}, end: {x:4, y:4, z:0}, offset: {x:0,y:0,z:1}, text: 'd=8' },
            { start: {x:-2, y:15, z:0}, end: {x:2, y:15, z:0}, offset: {x:0,y:0,z:1}, text: 'd=4' }
        ]
    }
}

const MiniBossTrain = (level: number): Problem => {
    return {
        id: createId(), title: "Polar Express", difficulty: 6, goldReward: 140, isBoss: true, bossName: "Engine 25", bossAvatar: "🚂", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 70,
        shapes: [
            { id: 'boiler', type: 'cylinder', position: {x:0,y:3,z:-2}, rotation:{x:Math.PI/2,y:0,z:0}, dims:{radius:3, height:10}, color: 0xef4444 },
            { id: 'cab', type: 'cuboid', position: {x:0,y:5,z:4}, rotation:{x:0,y:0,z:0}, dims:{width:6, height:8, depth:4}, color: 0x1e293b }
        ],
        stages: [
            { id: '1', question: "Volume of Boiler (Cylinder, r=3, h=10).", answer: Math.PI*9*10, unit: 'u³' },
            { id: '2', question: "Volume of Cab (6x8x4).", answer: 6*8*4, unit: 'u³' },
            { id: '3', question: "Total Volume.", answer: (Math.PI*90) + 192, unit: 'u³' }
        ],
        dimensions: [
            { start: {x:-3, y:3, z:-7}, end: {x:3, y:3, z:-7}, offset: {x:0,y:-1,z:0}, text: 'd=6' },
            { start: {x:3, y:3, z:-7}, end: {x:3, y:3, z:3}, offset: {x:1,y:0,z:0}, text: 'len=10' }
        ]
    }
}

const MiniBossTree = (level: number): Problem => {
    return {
        id: createId(), title: "Evergreen Sentinel", difficulty: 5, goldReward: 120, isBoss: true, bossName: "Timber", bossAvatar: "🌲", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 60,
        shapes: [
            { id: 'trunk', type: 'cylinder', position: {x:0,y:2,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:2, height:4}, color: 0x451a03 },
            { id: 'leaves', type: 'cone', position: {x:0,y:10,z:0}, rotation:{x:0,y:0,z:0}, dims:{radius:6, height:12}, color: 0x15803d }
        ],
        stages: [
            { id: '1', question: "Volume of Trunk (Cylinder).", answer: Math.PI*4*4, unit: 'u³' },
            { id: '2', question: "Volume of Leaves (Cone).", answer: (Math.PI*36*12)/3, unit: 'u³' },
            { id: '3', question: "Slant height of Leaves.", answer: Math.sqrt(6*6 + 12*12), unit: 'u' }
        ],
        dimensions: [
             { start: {x:-2, y:0, z:2}, end: {x:2, y:0, z:2}, offset: {x:0,y:0,z:0}, text: 'd_trunk=4' },
             { start: {x:-6, y:4, z:0}, end: {x:6, y:4, z:0}, offset: {x:0,y:0,z:1}, text: 'd_cone=12' },
             { start: {x:6, y:4, z:0}, end: {x:6, y:16, z:0}, offset: {x:1,y:0,z:0}, text: 'h_cone=12' }
        ]
    }
}

const MiniBossMimic = (level: number): Problem => {
    return {
        id: createId(), title: "Surprise Gift", difficulty: 7, goldReward: 160, isBoss: true, bossName: "Mimic", bossAvatar: "🎁", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 80,
        shapes: [
             { id: 'box', type: 'cuboid', position: {x:0,y:4,z:0}, rotation:{x:0,y:0,z:0}, dims:{width:8,height:8,depth:8}, color: COLORS.presents[3] }
        ],
        stages: [
            { id: '1', question: "Surface Area of the Cube (s=8).", answer: 384, unit: 'u²' },
            { id: '2', question: "Space Diagonal length.", answer: Math.sqrt(192), unit: 'u' }
        ],
        dimensions: [
            { start: {x:-4,y:0,z:4}, end: {x:4,y:0,z:4}, offset: {x:0,y:-1,z:0}, text: 's=8' }
        ]
    }
}

const MiniBossReindeer = (level: number): Problem => {
    return {
        id: createId(), title: "Robo-Rudolph", difficulty: 6, goldReward: 150, isBoss: true, bossName: "R-3000", bossAvatar: "🦌", bossType: 'mini', bossMusicTheme: 'miniboss', bossHP: 70,
        shapes: [
            { id: 'body', type: 'cylinder', position: {x:0,y:5,z:0}, rotation:{x:Math.PI/2,y:0,z:0}, dims:{radius:4, height:10}, color: 0x78350f },
            { id: 'legs', type: 'cuboid', position: {x:0,y:2,z:-4}, rotation:{x:0,y:0,z:0}, dims:{width:2, height:4, depth:2}, color: 0x000000 }
        ],
        stages: [
            { id: '1', question: "Volume of Body (Cylinder, r=4, h=10).", answer: Math.PI*16*10, unit: 'u³' },
            { id: '2', question: "Surface Area of Body.", answer: (2*Math.PI*4*10) + (2*Math.PI*16), unit: 'u²' }
        ]
    }
}

// Global state to avoid duplicate question types (in-memory per session)
let lastQuestionType: string = '';

// --- MAIN GENERATOR ACCESS ---
export const ProblemGenerator = {
    generate: (level: number, diff: number): Problem => {
        // Boss Logic
        if (level % 10 === 0) {
            const bosses = level >= 15 
                ? [BossNutcracker, BossKrampus, BossMechaSanta, BossYeti, BossDarkElf, BossGeometer]
                : [BossNutcracker, BossKrampus, BossMechaSanta, BossYeti, BossDarkElf];
                
            const pick = bosses[Math.floor(Math.random() * bosses.length)];
            return pick(level);
        }
        
        if (level % 5 === 0) {
            const minis = [MiniBossSled, MiniBossHouse, MiniBossSnowman, MiniBossTrain, MiniBossTree, MiniBossMimic, MiniBossReindeer];
            const pick = minis[Math.floor(Math.random() * minis.length)];
            return pick(level);
        }
        
        // --- SMART MIXING LOGIC ---
        // Weights: Primitives (30%), Composites (20%), Hollow (10%), Frustum (10%), Trig (30%)
        
        const generators = [
            // Primitives
            { fn: SimpleCube, type: 'vol_basic', weight: 0.1 },
            { fn: CylinderVol, type: 'vol_cyl', weight: 0.1 },
            { fn: ConeSlant, type: 'slant', weight: 0.1 },
            
            // Composites
            { fn: IceCreamVol, type: 'comp_vol', weight: 0.1 },
            { fn: SiloSA, type: 'comp_sa', weight: 0.1 },
            
            // Advanced
            { fn: HollowPipeVol, type: 'hollow', weight: 0.1 },
            { fn: ConeFrustumVol, type: 'frustum', weight: 0.1 },
            
            // Trig (Unlock after lvl 3)
            { fn: TrigFindHeight, type: 'trig_basic', weight: 0.06 },
            { fn: TrigFindSlant, type: 'trig_slant', weight: 0.06 },
            { fn: TrigRamp, type: 'trig_ramp', weight: 0.06 },
            { fn: TrigConeApex, type: 'trig_apex', weight: 0.06 },
            { fn: TrigPyramidEdge, type: 'trig_pyr', weight: 0.06 },
            { fn: TrigCuboidSpace, type: 'trig_3d', weight: 0.06 }
        ];

        // Filter out too-advanced logic for low levels
        const validGens = generators.filter(g => {
            if (level < 3 && g.type.startsWith('trig')) return false;
            return true;
        });
        
        // Filter out same type as last time to ensure mix
        let pool = validGens.filter(g => g.type !== lastQuestionType);
        
        // Safety Fallback if pool is empty
        if (pool.length === 0) pool = validGens;

        // Weighted Random Pick
        const totalWeight = pool.reduce((sum, g) => sum + g.weight, 0);
        let r = Math.random() * totalWeight;
        let selected = pool[0];
        
        for (const g of pool) {
            r -= g.weight;
            if (r <= 0) {
                selected = g;
                break;
            }
        }
        
        lastQuestionType = selected.type;
        return selected.fn(diff);
    }
};
