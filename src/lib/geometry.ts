/**
 * Utilidades geométricas compartidas por el lienzo (pertenencia a grupos, hitbox,
 * colocación de nodos nuevos). Todo son funciones puras para poder testearlas.
 */

export type Pt = [number, number];

export const POLYGON_SHAPES: Record<string, Pt[]> = {
  star: [[50,2],[65,35],[98,40],[75,65],[85,98],[50,80],[15,98],[25,65],[2,40],[35,35]],
  heart: [[50,98],[10,60],[2,30],[15,2],[50,25],[85,2],[98,30],[90,60]],
  hexagon: [[25,2],[75,2],[98,50],[75,98],[25,98],[2,50]],
  diamond: [[50,2],[98,50],[50,98],[2,50]],
  triangle: [[50,2],[98,98],[2,98]],
  pentagon: [[50,2],[98,38],[81,98],[19,98],[2,38]],
  octagon: [[30,2],[70,2],[98,30],[98,70],[70,98],[30,98],[2,70],[2,30]],
  shield: [[2,2],[98,2],[98,75],[50,98],[2,75]]
};

export function isPointInPolygon(px: number, py: number, vertices: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface ClusterGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: string;
}

/** ¿Está el punto dentro de la forma REAL del grupo (no de su rectángulo)? */
export function isPointInCluster(px: number, py: number, c: ClusterGeometry): boolean {
  const { x, y, width: w, height: h } = c;
  if (px < x || px > x + w || py < y || py > y + h) return false;

  const shape = c.shape || 'square';
  if (shape === 'circle') {
    const rx = w / 2;
    const ry = h / 2;
    const n = Math.pow((px - (x + rx)) / rx, 2) + Math.pow((py - (y + ry)) / ry, 2);
    return n <= 1;
  }
  if (POLYGON_SHAPES[shape]) {
    const abs: Pt[] = POLYGON_SHAPES[shape].map(([vx, vy]) => [x + (vx / 100) * w, y + (vy / 100) * h]);
    return isPointInPolygon(px, py, abs);
  }
  return true;
}

export interface Rect { x: number; y: number; w: number; h: number }

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** ¿El segmento a-b corta el rectángulo? (Liang–Barsky) */
export function segmentIntersectsRect(ax: number, ay: number, bx: number, by: number, r: Rect): boolean {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const p = [-dx, dx, -dy, dy];
  const q = [ax - r.x, r.x + r.w - ax, ay - r.y, r.y + r.h - ay];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}
