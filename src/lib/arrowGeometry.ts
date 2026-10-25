import type { ArrowStyle } from '../types/store';

type Pt = [number, number];

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
  heads: string[];
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
  const startTrim = head === 'both' ? headLen(t0) * 0.85 : 0;
  const endTrim = head !== 'none' ? headLen(t1) * 0.85 : 0;
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

  const heads: string[] = [];
  const mkHead = (tip: Pt, base: Pt, t: number) => {
    const dx = tip[0] - base[0], dy = tip[1] - base[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const hw = headHalfW(t);
    // la base se retrasa un poco para que no queden huecos con el cuerpo
    heads.push(`M${f(tip)}L${f([base[0] + nx * hw, base[1] + ny * hw])}L${f([base[0] - nx * hw, base[1] - ny * hw])}Z`);
  };
  if (head !== 'none') mkHead(P2, pointAtS(Math.max(0, total - headLen(t1))), t1);
  if (head === 'both') mkHead(P0, pointAtS(Math.min(total, headLen(t0))), t0);

  const allX = [...left, ...right].map(p => p[0]).concat([0, L]);
  const allY = [...left, ...right].map(p => p[1]).concat([cy]);
  const m = Math.max(headHalfW(t0), headHalfW(t1)) + 2;
  return {
    length: L, bend, control: C, mid: at(0.5),
    centerPath: `M${f(P0)}Q${f(C)} ${f(P2)}`,
    bodyPath, trimmedPath, heads,
    avgThickness: (t0 + t1) / 2,
    bbox: { minX: Math.min(...allX) - m, maxX: Math.max(...allX) + m, minY: Math.min(...allY) - m, maxY: Math.max(...allY) + m },
  };
}
