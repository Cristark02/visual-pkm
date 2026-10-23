import { memo } from 'react';
import { useReactFlow } from 'reactflow';
import { useStore } from '../../store/useStore';

/**
 * Tiradores de tamaño propios (sustituyen a NodeResizer): 100 % fiables con el dedo.
 *  - 'free'    : 8 tiradores, cada borde/esquina cambia el tamaño libremente (grupos, fotos libres).
 *  - 'uniform' : 4 esquinas, conserva la proporción (fotos con forma fija).
 *  - 'font'    : 4 esquinas; escala el conjunto del texto (tamaño de letra + caja), con vista previa en vivo.
 * El tamaño en pantalla es constante (--rf-zoom) y el dedo nunca "salta": la geometría se congela al empezar.
 */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const CORNERS: HandleId[] = ['nw', 'ne', 'se', 'sw'];
const ALL: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const POS: Record<HandleId, [number, number]> = {
  nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50],
};

interface Props {
  id: string;
  xPos: number;
  yPos: number;
  mode: 'free' | 'uniform' | 'font';
  visible: boolean;
  minW?: number;
  minH?: number;
  /** Tamaño de letra actual (modo 'font'). */
  fontSize?: number;
}

const ResizeHandles = ({ id, xPos, yPos, mode, visible, minW = 60, minH = 60, fontSize = 20 }: Props) => {
  const flow = useReactFlow();
  if (!visible) return null;
  const handles = mode === 'free' ? ALL : CORNERS;

  const onDown = (h: HandleId) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = (e.currentTarget.closest('.react-flow__node') as HTMLElement | null);
    if (!el) return;
    const g = { x0: xPos, y0: yPos, w0: el.offsetWidth || 1, h0: el.offsetHeight || 1, fs0: fontSize };
    useStore.getState().pushSnapshot();

    const west = h.includes('w'), east = h.includes('e'), north = h.includes('n'), south = h.includes('s');
    // ancla: el punto opuesto, que no se mueve
    const ax = west ? g.x0 + g.w0 : east ? g.x0 : g.x0 + g.w0 / 2;
    const ay = north ? g.y0 + g.h0 : south ? g.y0 : g.y0 + g.h0 / 2;
    // esquina original que se arrastra
    const cx = west ? g.x0 : east ? g.x0 + g.w0 : g.x0 + g.w0 / 2;
    const cy = north ? g.y0 : south ? g.y0 + g.h0 : g.y0 + g.h0 / 2;

    const onMove = (ev: PointerEvent) => {
      const p = flow.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const upd = useStore.getState().updateNodeData;

      if (mode === 'free') {
        let x = g.x0, y = g.y0, w = g.w0, hh = g.h0;
        if (east) w = Math.max(minW, p.x - g.x0);
        if (west) { const right = g.x0 + g.w0; w = Math.max(minW, right - p.x); x = right - w; }
        if (south) hh = Math.max(minH, p.y - g.y0);
        if (north) { const bottom = g.y0 + g.h0; hh = Math.max(minH, bottom - p.y); y = bottom - hh; }
        upd(id, {
          visualPosition: { x: Math.round(x), y: Math.round(y) },
          visualDimensions: { width: Math.round(w), height: Math.round(hh) },
        }, { history: false });
        return;
      }

      // 'uniform' y 'font': escala uniforme alrededor del ancla, proyectando el dedo sobre la diagonal
      const dx = cx - ax, dy = cy - ay;
      const len2 = dx * dx + dy * dy || 1;
      let s = ((p.x - ax) * dx + (p.y - ay) * dy) / len2;
      const sMin = mode === 'font' ? 8 / g.fs0 : Math.max(minW / g.w0, minH / g.h0);
      s = Math.max(sMin, mode === 'font' ? Math.min(s, 400 / g.fs0) : s);
      const nx = Math.round(ax + (g.x0 - ax) * s);
      const ny = Math.round(ay + (g.y0 - ay) * s);
      if (mode === 'font') {
        const cur = useStore.getState().nodes.find(n => n.id === id);
        upd(id, {
          visualPosition: { x: nx, y: ny },
          styleConfig: { ...(cur?.data.styleConfig || {}), fontSize: Math.round(g.fs0 * s * 10) / 10 },
        }, { history: false });
      } else {
        upd(id, {
          visualPosition: { x: nx, y: ny },
          visualDimensions: { width: Math.round(g.w0 * s), height: Math.round(g.h0 * s) },
        }, { history: false });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <>
      {handles.map(h => (
        <div
          key={h}
          data-h={h}
          data-export-ignore="true"
          className="rz-handle nodrag nopan"
          onPointerDown={onDown(h)}
          onClick={(e) => e.stopPropagation()}
          style={{ left: `${POS[h][0]}%`, top: `${POS[h][1]}%` }}
        >
          <span className="rz-dot" />
        </div>
      ))}
    </>
  );
};

export default memo(ResizeHandles);
