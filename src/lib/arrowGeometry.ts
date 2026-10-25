import type { ArrowStyle } from '../types/store';

type Pt = [number, number];

/** Pieza dibujable: relleno (`filled`) o trazo (cabeza abierta). */
export interface ArrowPart { d: string; filled: boolean; sw: number }

export interface ArrowGeometry {
  length: number;
  bend: number;
  /** Punto de control de la curva y punto medio (donde vive el tirador de curvatura). */
  control: Pt;
  mid: Pt;
  /** Curva central (SVG path, cuadrática). */
  centerPath: string;
  /** Cuerpo afilado (polígono relleno), de grosor variable cola → cabeza. */
  bodyPath: string;
  /** Trazo central recortado donde empiezan las cabezas (para rayas/puntos). */
  trimmedPath: string;
  heads: ArrowPart[];
  avgThickness: number;
  /** Caja que contiene todo el dibujo (coordenadas locales). */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const headLen = (t: number) => 6 + t * 2.2;
const headHalfW = (t: number) => Math.max(headLen(t) * 0.62, t / 2 + 2);

/**
 * Geometría de la flecha libre en su marco local: cola en (0, cy), punta en (length, cy).
 * El cuerpo es una curva cuadrática (la curvatura `bend` es el desvío del punto medio)
 * cuyo grosor cambia linealmente de la cola a la cabeza.
 */
export function arrowGeometry(st: ArrowStyle, cy: number): ArrowGeometry {
  const L = Math.max(30, st.length ?? 160);
  const t0 = clamp(st.thickness ?? 4, 1, 40);
  const t1 = clamp(st.headThickness ?? t0, 1, 40);
  const bend = clamp(st.bend ?? 0, -L * 1.5, L * 1.5);
  const head = st.head || 'end';

  const P0: Pt = [0, cy];
  const C: Pt = [L / 2, cy + 2 * bend];
  const P2: Pt = [L, cy];
  const at = (t: number): Pt => {
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    return [a * P0[0] + b * C[0] + c * P2[0], a * P0[1] + b * C[1] + c * P2[1]];
  };

  const N = 80;
  const pts: Pt[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= N; i++) {
    pts.push(at(i / N));
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[N] || 1;
  const shape = st.headShape || 'triangle';
  const trimK = shape === 'open' ? 0.15 : shape === 'triangle' ? 0.85 : 0.6;
  const startTrim = head === 'both' ? headLen(t0) * trimK : 0;
  const endTrim = head !== 'none' ? headLen(t1) * trimK : 0;
  const s0 = Math.min(startTrim, total * 0.45);
  const s1 = Math.max(total - endTrim, total * 0.55);

  const pointAtS = (s: number): Pt => {
    let i = 1;
    while (i < N && cum[i] < s) i++;
    const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
  };

  // muestras del cuerpo recortado
  const M = 48;
  const body: { p: Pt; w: number }[] = [];
  for (let i = 0; i <= M; i++) {
    const s = s0 + ((s1 - s0) * i) / M;
    body.push({ p: pointAtS(s), w: t0 + (t1 - t0) * (s / total) });
  }
  const left: Pt[] = [], right: Pt[] = [];
  body.forEach((b, i) => {
    const a = body[Math.max(0, i - 1)].p, c = body[Math.min(M, i + 1)].p;
    const dx = c[0] - a[0], dy = c[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    left.push([b.p[0] + nx * b.w / 2, b.p[1] + ny * b.w / 2]);
    right.push([b.p[0] - nx * b.w / 2, b.p[1] - ny * b.w / 2]);
  });
  const f = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const bodyPath = `M${left.map(f).join('L')}L${right.reverse().map(f).join('L')}Z`;
  const trimmedPath = `M${body.map(b => f(b.p)).join('L')}`;

  const heads: ArrowPart[] = [];
  const mkHead = (tip: Pt, base: Pt, t: number) => {
    const dx = tip[0] - base[0], dy = tip[1] - base[1];
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const hw = headHalfW(t);
    const hl = headLen(t);
    const pt = (a: number, n: number): Pt => [tip[0] - ux * a + nx * n, tip[1] - uy * a + ny * n];
    if (shape === 'round') {
      const r = hw, c = pt(r * 1.7, 0);
      const l = [c[0] + nx * r, c[1] + ny * r], rr = [c[0] - nx * r, c[1] - ny * r];
      heads.push({ filled: true, sw: 0, d: `M${f(l as Pt)}A${r} ${r} 0 1 0 ${f(rr as Pt)}A${r} ${r} 0 1 0 ${f(l as Pt)}Z` });
    } else if (shape === 'diamond') {
      heads.push({ filled: true, sw: 0, d: `M${f(tip)}L${f(pt(hl * 0.55, hw))}L${f(pt(hl * 1.1, 0))}L${f(pt(hl * 0.55, -hw))}Z` });
    } else if (shape === 'open') {
      const sw = Math.max(2, Math.min(t, 14));
      heads.push({ filled: false, sw, d: `M${f(pt(hl * 0.9, hw))}L${f(tip)}L${f(pt(hl * 0.9, -hw))}` });
    } else {
      heads.push({ filled: true, sw: 0, d: `M${f(tip)}L${f(pt(hl, hw))}L${f(pt(hl, -hw))}Z` });
    }
  };
  const baseBack = shape === 'triangle' ? 1 : shape === 'open' ? 0.9 : 1.2;
  if (head !== 'none') mkHead(P2, pointAtS(Math.max(0, total - headLen(t1) * baseBack)), t1);
  if (head === 'both') mkHead(P0, pointAtS(Math.min(total, headLen(t0) * baseBack)), t0);

  const allX = [...left, ...right].map(p => p[0]).concat([0, L]);
  const allY = [...left, ...right].map(p => p[1]).concat([cy]);
  const m = Math.max(headHalfW(t0), headLen(t0), headHalfW(t1), headLen(t1)) + 12;
  return {
    length: L, bend, control: C, mid: at(0.5),
    centerPath: `M${f(P0)}Q${f(C)} ${f(P2)}`,
    bodyPath, trimmedPath, heads,
    avgThickness: (t0 + t1) / 2,
    bbox: { minX: Math.min(...allX) - m, maxX: Math.max(...allX) + m, minY: Math.min(...allY) - m, maxY: Math.max(...allY) + m },
  };
}

export interface ArrowLayer {
  d: string; fill: string; stroke: string; sw: number;
  dash?: string; cap?: 'round' | 'butt'; join?: 'round'; dx: number; dy: number; opacity?: number; blur?: number;
}

export const shade = (hex: string, k: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#334155';
  const n = parseInt(m[1], 16);
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
};

/** Capas ya ordenadas (sombra → 3D → contorno → color) en el marco local de la flecha. */
export function arrowLayers(st: ArrowStyle, cy: number): { geo: ArrowGeometry; layers: ArrowLayer[] } {
  const geo = arrowGeometry(st, cy);
  const color = st.color || '#475569';
  const dash = st.dash || 'solid';
  const ang = ((st.angle ?? 0) * Math.PI) / 180;
  const toLocal = (sx: number, sy: number): [number, number] => [sx * Math.cos(ang) + sy * Math.sin(ang), -sx * Math.sin(ang) + sy * Math.cos(ang)];
  const avg = geo.avgThickness;
  const OUT = 'rgba(0,0,0,0)';
  const DARK = '#1f2937';
  const parts: { d: string; filled: boolean; sw: number; dash?: string; cap?: 'round' | 'butt' }[] = [];
  if (dash === 'solid') parts.push({ d: geo.bodyPath, filled: true, sw: 0 });
  else parts.push({
    d: geo.trimmedPath, filled: false, sw: avg,
    dash: dash === 'dashed' ? `${avg * 3} ${avg * 2}` : `0.1 ${avg * 2.2}`, cap: dash === 'dotted' ? 'round' : 'butt',
  });
  geo.heads.forEach(h => parts.push(h));

  const layers: ArrowLayer[] = [];
  const paint = (fill: string, off: [number, number], outline: boolean) => {
    if (outline) parts.forEach(p => layers.push(p.filled
      ? { d: p.d, fill: DARK, stroke: DARK, sw: 3, join: 'round', dx: off[0], dy: off[1] }
      : { d: p.d, fill: 'none', stroke: DARK, sw: p.sw + 4, cap: 'round', join: 'round', dx: off[0], dy: off[1] }));
    parts.forEach(p => layers.push(p.filled
      ? { d: p.d, fill, stroke: OUT, sw: 0, dx: off[0], dy: off[1] }
      : { d: p.d, fill: 'none', stroke: fill, sw: p.sw, dash: p.dash, cap: p.cap ?? 'round', join: 'round', dx: off[0], dy: off[1] }));
  };
  if (st.shadow) {
    const o = toLocal(0, 6);
    parts.forEach(p => layers.push(p.filled
      ? { d: p.d, fill: '#000', stroke: OUT, sw: 0, dx: o[0], dy: o[1], opacity: 0.3, blur: 3 }
      : { d: p.d, fill: 'none', stroke: '#000', sw: p.sw, dash: p.dash, cap: p.cap ?? 'round', dx: o[0], dy: o[1], opacity: 0.3, blur: 3 }));
  }
  const outline = !!st.outline;
  if (st.depth) paint(shade(color, 0.62), toLocal(0, Math.max(3, Math.min(10, Math.max(avg, 8) * 0.35))), outline);
  paint(color, [0, 0], outline);
  geo.bbox.minX -= 8; geo.bbox.maxX += 8; geo.bbox.minY -= 8; geo.bbox.maxY += 14;
  return { geo, layers };
}
