import type { NodeModel, EdgeModel } from '../types/store';
import { isPointInCluster, rectsOverlap, segmentIntersectsRect } from './geometry';
import type { Rect } from './geometry';

export const PERSON_SIZE = 80;
const GAP = 24;
const RING_STEP = 110;
const MAX_RINGS = 14;

/** Caja aproximada (coordenadas de flujo) que ocupa un nodo que no es grupo. */
export function nodeRect(n: NodeModel): Rect | null {
  if (n.type === 'cluster') return null;
  const pos = n.data.visualPosition || { x: 0, y: 0 };
  if (n.type === 'individual') {
    // 80x80 + nombre colgando debajo
    return { x: pos.x - 20, y: pos.y, w: PERSON_SIZE + 40, h: PERSON_SIZE + 40 };
  }
  if (n.type === 'arrowAnnotation') {
    const s = n.data.arrowStyle || {};
    const len = s.length ?? 160;
    const a = ((s.angle ?? 0) * Math.PI) / 180;
    const ex = pos.x + Math.cos(a) * len;
    const ey = pos.y + Math.sin(a) * len;
    const pad = (s.thickness ?? 4) + 8;
    return { x: Math.min(pos.x, ex) - pad, y: Math.min(pos.y, ey) - pad, w: Math.abs(ex - pos.x) + pad * 2, h: Math.abs(ey - pos.y) + pad * 2 };
  }
  const dims = n.data.visualDimensions || { width: 200, height: n.type === 'textAnnotation' ? 60 : 200 };
  return { x: pos.x, y: pos.y, w: dims.width, h: dims.height };
}

/**
 * Busca el hueco libre más cercano a `center` donde cabe una caja de `size`x`size`.
 * "Libre" = sin nodos, sin aristas cruzándola y fuera de cualquier grupo.
 * Devuelve el propio centro si ya está libre (moved = false).
 */
export function findFreeSpot(
  center: { x: number; y: number },
  nodes: NodeModel[],
  edges: EdgeModel[],
  size: number = PERSON_SIZE
): { x: number; y: number; moved: boolean } {
  const rects: Rect[] = [];
  nodes.forEach(n => { const r = nodeRect(n); if (r) rects.push(r); });

  const clusters = nodes.filter(n => n.type === 'cluster').map(n => ({
    x: n.data.visualPosition?.x ?? 0,
    y: n.data.visualPosition?.y ?? 0,
    width: n.data.visualDimensions?.width ?? 800,
    height: n.data.visualDimensions?.height ?? 800,
    shape: n.data.biographicalAttributes?.shape as string | undefined
  }));

  const byId = new Map(nodes.map(n => [n.id, n]));
  const segments: [number, number, number, number][] = [];
  edges.forEach(e => {
    const s = byId.get(e.sourceNodeId);
    const t = byId.get(e.targetNodeId);
    if (!s || !t) return;
    const sp = s.data.visualPosition || { x: 0, y: 0 };
    const tp = t.data.visualPosition || { x: 0, y: 0 };
    segments.push([sp.x + PERSON_SIZE / 2, sp.y + PERSON_SIZE / 2, tp.x + PERSON_SIZE / 2, tp.y + PERSON_SIZE / 2]);
  });

  const isFree = (cx: number, cy: number) => {
    const half = size / 2;
    const box: Rect = { x: cx - half - GAP, y: cy - half - GAP, w: size + GAP * 2, h: size + GAP * 2 };
    if (rects.some(r => rectsOverlap(box, r))) return false;
    if (segments.some(([ax, ay, bx, by]) => segmentIntersectsRect(ax, ay, bx, by, box))) return false;
    const corners: [number, number][] = [[cx, cy], [cx - half, cy - half], [cx + half, cy - half], [cx - half, cy + half], [cx + half, cy + half]];
    if (clusters.some(c => corners.some(([px, py]) => isPointInCluster(px, py, c)))) return false;
    return true;
  };

  if (isFree(center.x, center.y)) return { x: center.x, y: center.y, moved: false };

  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    const radius = ring * RING_STEP;
    const steps = ring * 8;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      if (isFree(x, y)) return { x: Math.round(x), y: Math.round(y), moved: true };
    }
  }
  return { x: center.x, y: center.y, moved: false };
}
