/** Geometrías de las imágenes flotantes, compartidas por el lienzo y el exportador PDF. */

// Estrella en porcentajes (0..100)
export const STAR_POINTS: [number, number][] = [
  [50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]
];
export const STAR_CLIP = `polygon(${STAR_POINTS.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;

// Corazón en unidades de caja (0..1): sirve con clipPathUnits="objectBoundingBox"
export const HEART_PATH =
  'M0.5,0.95 C0.1,0.65 0,0.45 0,0.28 C0,0.12 0.12,0 0.27,0 C0.37,0 0.46,0.06 0.5,0.15 C0.54,0.06 0.63,0 0.73,0 C0.88,0 1,0.12 1,0.28 C1,0.45 0.9,0.65 0.5,0.95 Z';
