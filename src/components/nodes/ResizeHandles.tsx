import { memo } from 'react';
import { useReactFlow } from 'reactflow';
import { useStore } from '../../store/useStore';

/**
 * Tiradores de tamaño y giro propios (sustituyen a NodeResizer): fiables con el dedo.
 *  - 'free'    : 8 tiradores, cada borde/esquina cambia el tamaño libremente (grupos, fotos libres).
 *  - 'uniform' : 4 esquinas, conserva la proporción (fotos con forma fija).
 *  - 'font'    : 4 esquinas; escala el conjunto del texto (tamaño de letra + caja), con vista previa en vivo.
 * `rotatable` añade el botón de giro (semielipse con dos flechas) bajo el elemento.
 * El tamaño en pantalla es constante (--rf-zoom) y el dedo nunca "salta": la geometría se congela al empezar.
 * Todo el cálculo se hace en el marco local del elemento, así que funciona también con el elemento girado.
 */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const CORNERS: HandleId[] = ['nw', 'ne', 'se', 'sw'];
const ALL: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const POS: Record<HandleId, [number, number]> = {
  nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50],
};

const rot = (x: number, y: number, a: number) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

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
  /** Giro actual en grados. */
  rotation?: number;
  rotatable?: boolean;
}

const ResizeHandles = ({ id, xPos, yPos, mode, visible, minW = 60, minH = 60, fontSize = 20, rotation = 0, rotatable = false }: Props) => {
  const flow = useReactFlow();
  if (!visible) return null;
  const handles = mode === 'free' ? ALL : CORNERS;
  const theta = (rotation * Math.PI) / 180;

  const listen = (onMove: (ev: PointerEvent) => void) => {
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onDown = (h: HandleId) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = (e.currentTarget.closest('.react-flow__node') as HTMLElement | null);
    if (!el) return;
    const g = { x0: xPos, y0: yPos, w0: el.offsetWidth || 1, h0: el.offsetHeight || 1, fs0: fontSize, th: theta };
    useStore.getState().pushSnapshot();

    const west = h.includes('w'), east = h.includes('e'), north = h.includes('n'), south = h.includes('s');
    // El ancla es el punto opuesto al tirador, en coordenadas locales relativas al centro
    const sx = west ? 1 : east ? -1 : 0;
    const sy = north ? 1 : south ? -1 : 0;
    const c0 = { x: g.x0 + g.w0 / 2, y: g.y0 + g.h0 / 2 };
    const aOff = rot(sx * g.w0 / 2, sy * g.h0 / 2, g.th);
    const A = { x: c0.x + aOff.x, y: c0.y + aOff.y }; // ancla en el mundo (fija)

    onMoveFactory();
    function onMoveFactory() {
      listen((ev: PointerEvent) => {
        const p = flow.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        const d = rot(p.x - A.x, p.y - A.y, -g.th); // vector ancla → dedo, en el marco local
        const upd = useStore.getState().updateNodeData;

        let w = g.w0, hh = g.h0, s = 1;
        if (mode === 'free') {
          if (east) w = Math.max(minW, d.x);
          if (west) w = Math.max(minW, -d.x);
          if (south) hh = Math.max(minH, d.y);
          if (north) hh = Math.max(minH, -d.y);
        } else {
          // escala uniforme: proyección del dedo sobre la diagonal del tirador
          const dx = -sx * g.w0, dy = -sy * g.h0;
          const len2 = dx * dx + dy * dy || 1;
          s = (d.x * dx + d.y * dy) / len2;
          const sMin = mode === 'font' ? 8 / g.fs0 : Math.max(minW / g.w0, minH / g.h0);
          s = Math.max(sMin, mode === 'font' ? Math.min(s, 400 / g.fs0) : s);
          w = g.w0 * s;
          hh = g.h0 * s;
        }

        // nuevo centro: el ancla sigue en su sitio
        const off = rot(sx * w / 2, sy * hh / 2, g.th);
        const cx = A.x - off.x, cy = A.y - off.y;
        const visualPosition = { x: Math.round(cx - w / 2), y: Math.round(cy - hh / 2) };

        if (mode === 'font') {
          const cur = useStore.getState().nodes.find(n => n.id === id);
          upd(id, { visualPosition, styleConfig: { ...(cur?.data.styleConfig || {}), fontSize: Math.round(g.fs0 * s * 10) / 10 } }, { history: false });
        } else {
          upd(id, { visualPosition, visualDimensions: { width: Math.round(w), height: Math.round(hh) } }, { history: false });
        }
      });
    }
  };

  const onRotateDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = (e.currentTarget.closest('.react-flow__node') as HTMLElement | null);
    if (!el) return;
    const w0 = el.offsetWidth || 1, h0 = el.offsetHeight || 1;
    const c = { x: xPos + w0 / 2, y: yPos + h0 / 2 };
    const start = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const a0 = Math.atan2(start.y - c.y, start.x - c.x);
    const r0 = rotation;
    useStore.getState().pushSnapshot();
    listen((ev: PointerEvent) => {
      const p = flow.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      let deg = r0 + ((Math.atan2(p.y - c.y, p.x - c.x) - a0) * 180) / Math.PI;
      deg = ((deg % 360) + 540) % 360 - 180; // -180..180
      const snapped = Math.round(deg / 15) * 15;
      if (Math.abs(deg - snapped) < 4) deg = snapped; // imán a múltiplos de 15°
      useStore.getState().updateNodeData(id, { rotation: Math.round(deg) }, { history: false });
    });
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
      {rotatable && (
        <div
          data-export-ignore="true"
          data-h="rotate"
          aria-label="Girar"
          className="rz-handle rz-rotate nodrag nopan"
          onPointerDown={onRotateDown}
          onClick={(e) => e.stopPropagation()}
          style={{ left: '50%', top: '100%' }}
        >
          <span className="rz-rotate-btn">
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="#4f46e5" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 11.5c3.4 4.6 9.6 4.6 13 0" fill="none" />
              <path d="M2.6 7.6 8 9.2 5 13.2z" strokeWidth="1" />
              <path d="M21.4 7.6 16 9.2 19 13.2z" strokeWidth="1" />
            </svg>
          </span>
        </div>
      )}
    </>
  );
};

export default memo(ResizeHandles);
