
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const FORMULAS = [
    {
        name: "Cuboid (Prism)",
        volume: "V = l × w × h",
        sa: "A = 2(lw + lh + wh)"
    },
    {
        name: "Cylinder",
        volume: "V = πr²h",
        sa: "A = 2πrh + 2πr²"
    },
    {
        name: "Cone",
        volume: "V = (1/3)πr²h",
        sa: "A = πr(r + √(h² + r²))"
    },
    {
        name: "Pyramid (Square Based)",
        volume: "V = (1/3)b²h",
        sa: "A = b² + 2b × slant_height"
    },
    {
        name: "Sphere",
        volume: "V = (4/3)πr³",
        sa: "A = 4πr²"
    }
];
