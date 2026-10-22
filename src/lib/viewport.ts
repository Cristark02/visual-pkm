import type { ReactFlowInstance } from 'reactflow';
import type { NodeModel, EdgeModel } from '../types/store';
import { nodeRect } from './placement';

interface FlowRect { x: number; y: number; w: number; h: number }

/** Rectángulo (coords de flujo) que ocupa una entidad seleccionada. */
export function entityRect(
  id: string,
  type: 'node' | 'edge',
  nodes: NodeModel[],
  edges: EdgeModel[]
): FlowRect | null {
  if (type === 'node') {
    const n = nodes.find(x => x.id === id);
    if (!n) return null;
    if (n.type === 'cluster') {
      const p = n.data.visualPosition || { x: 0, y: 0 };
      return { x: p.x, y: p.y, w: n.data.visualDimensions?.width ?? 800, h: n.data.visualDimensions?.height ?? 800 };
    }
    return nodeRect(n);
  }
  const e = edges.find(x => x.id === id);
  if (!e) return null;
  const s = nodes.find(n => n.id === e.sourceNodeId)?.data.visualPosition;
  const t = nodes.find(n => n.id === e.targetNodeId)?.data.visualPosition;
  if (!s || !t) return null;
  const x1 = Math.min(s.x, t.x) + 40, x2 = Math.max(s.x, t.x) + 40;
  const y1 = Math.min(s.y, t.y) + 40, y2 = Math.max(s.y, t.y) + 40;
  return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
}

/**
 * Si la entidad no cabe en la zona realmente visible (el lienzo menos barras y hojas
 * inferiores marcadas con `data-bottom-ui`), desplaza la vista con animación para
 * centrarla en esa zona. Si ya se ve entera, no hace nada (sin saltos al tocar).
 */
export function revealRect(flow: ReactFlowInstance, r: FlowRect) {
  const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
  if (!pane) return;

  let bottom = pane.bottom;
  document.querySelectorAll('[data-bottom-ui]').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.height > 0 && b.top < bottom && b.top > pane.top) bottom = b.top;
  });

  const margin = 12;
  const region = { l: pane.left + margin, t: pane.top + margin, r: pane.right - margin, b: bottom - margin };
  if (region.b - region.t < 80) return;

  const vp = flow.getViewport();
  const z = vp.zoom || 1;
  const sx = pane.left + vp.x + r.x * z;
  const sy = pane.top + vp.y + r.y * z;
  const sw = r.w * z, sh = r.h * z;

  const inside = sx >= region.l && sy >= region.t && sx + sw <= region.r && sy + sh <= region.b;
  if (inside) return;

  // centrar el centro de la entidad en el centro de la región visible
  const cxFlow = r.x + r.w / 2;
  const cyFlow = r.y + r.h / 2;
  const targetX = (region.l + region.r) / 2 - pane.left - cxFlow * z;
  const targetY = (region.t + region.b) / 2 - pane.top - cyFlow * z;
  flow.setViewport({ x: targetX, y: targetY, zoom: z }, { duration: 350 });
}
