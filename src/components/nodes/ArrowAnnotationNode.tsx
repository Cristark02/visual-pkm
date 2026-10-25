import { memo, useRef } from 'react';
import type { NodeProps } from 'reactflow';
import { useReactFlow } from 'reactflow';
import { Trash2, Minus, ArrowRight, ArrowLeftRight } from 'lucide-react';
import type { NodeData, ArrowStyle } from '../../types/store';
import { useStore } from '../../store/useStore';
import { useUIMode } from '../../lib/useMedia';
import { arrowGeometry } from '../../lib/arrowGeometry';

/** Altura fija del contenedor del nodo; el dibujo vive centrado en ella. */
const ARROW_BOX_H = 24;
const MIN_LEN = 30;

const DASHES: { id: NonNullable<ArrowStyle['dash']>; label: string }[] = [
  { id: 'solid', label: 'Continua' },
  { id: 'dashed', label: 'Rayas' },
  { id: 'dotted', label: 'Puntos' },
];

const dashArray = (dash: ArrowStyle['dash'], t: number) =>
  dash === 'dashed' ? `${t * 3} ${t * 2}` : dash === 'dotted' ? `0.1 ${t * 2.2}` : undefined;

/**
 * Flecha libre (sticker): no se conecta a ningún nodo. Es 100 % personalizable:
 * longitud y orientación (arrastrando sus extremos), grosor, tipo de trazo,
 * cabezas y color.
 */
const ArrowAnnotationNode = ({ id, data, selected, xPos, yPos }: NodeProps<NodeData>) => {
  const flow = useReactFlow();
  const dragging = useRef<null | { end: 'tip' | 'tail'; fixedX: number; fixedY: number }>(null);

  const st: ArrowStyle = data.arrowStyle || {};
  const length = Math.max(MIN_LEN, st.length ?? 160);
  const angle = st.angle ?? 0;
  const t = Math.min(40, Math.max(1, st.thickness ?? 4));
  const t1 = Math.min(40, Math.max(1, st.headThickness ?? t));
  const color = st.color || '#475569';
  const head = st.head || 'end';
  const dash = st.dash || 'solid';
  const cy = ARROW_BOX_H / 2;
  const geo = arrowGeometry({ ...st, length, thickness: t, headThickness: t1 }, cy);

  const touchUI = useUIMode() !== 'desktop';
  const patchStyle = (patch: Partial<ArrowStyle>, history = true) => {
    const next = { ...st, ...patch };
    useStore.getState().updateNodeData(id, {
      arrowStyle: next,
      visualDimensions: { width: Math.round(next.length ?? length), height: ARROW_BOX_H },
    }, { history });
  };

  // --- Arrastre de extremos ---
  const down = (end: 'tip' | 'tail') => (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rad = (angle * Math.PI) / 180;
    const tailX = xPos;
    const tailY = yPos + cy;
    dragging.current = {
      end,
      fixedX: end === 'tip' ? tailX : tailX + Math.cos(rad) * length,
      fixedY: end === 'tip' ? tailY : tailY + Math.sin(rad) * length,
    };
    useStore.getState().pushSnapshot();
  };

  const move = (e: React.PointerEvent<SVGCircleElement>) => {
    const d = dragging.current;
    if (!d) return;
    e.stopPropagation();
    const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // vector desde el extremo fijo hacia el que se arrastra
    const vx = d.end === 'tip' ? p.x - d.fixedX : d.fixedX - p.x;
    const vy = d.end === 'tip' ? p.y - d.fixedY : d.fixedY - p.y;
    const newLen = Math.max(MIN_LEN, Math.round(Math.hypot(vx, vy)));
    let deg = (Math.atan2(vy, vx) * 180) / Math.PI;
    const snapped = Math.round(deg / 15) * 15;
    if (Math.abs(deg - snapped) < 4) deg = snapped; // imán a múltiplos de 15°
    deg = Math.round(deg);

    const update: Record<string, unknown> = {
      arrowStyle: { ...st, length: newLen, angle: deg },
      visualDimensions: { width: newLen, height: ARROW_BOX_H },
    };
    if (d.end === 'tail') {
      update.visualPosition = { x: Math.round(p.x), y: Math.round(p.y - cy) };
    }
    useStore.getState().updateNodeData(id, update, { history: false });
  };

  const up = (e: React.PointerEvent<SVGCircleElement>) => {
    dragging.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // --- Arrastre del punto medio (curvatura) ---
  const bending = useRef(false);
  const bendDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    bending.current = true;
    useStore.getState().pushSnapshot();
  };
  const bendMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!bending.current) return;
    e.stopPropagation();
    const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const rad = (angle * Math.PI) / 180;
    const vx = p.x - xPos, vy = p.y - (yPos + cy);
    // coordenada perpendicular a la flecha, en su marco local
    let ly = -vx * Math.sin(rad) + vy * Math.cos(rad);
    if (Math.abs(ly) < 8) ly = 0; // imán a recta
    useStore.getState().updateNodeData(id, { arrowStyle: { ...st, bend: Math.round(ly) } }, { history: false });
  };
  const bendUp = (e: React.PointerEvent<SVGCircleElement>) => {
    bending.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="relative select-none"
      style={{ width: length, height: ARROW_BOX_H }}
    >
      {/* Barra flotante (no rota con la flecha) */}
      {selected && !touchUI && (
        <div className="absolute left-0 bottom-full bg-gray-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl flex flex-wrap items-center gap-x-2 gap-y-1 z-50 text-white nodrag nopan pointer-events-auto w-max max-w-[440px]" style={{ marginBottom: Math.max(0, -geo.bbox.minY) + 20 }}>
          <input
            type="color"
            value={color}
            onChange={e => patchStyle({ color: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
            title="Color"
          />
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-300" title="Grosor en la cola">
            Cola
            <input
              type="range" min={1} max={40} step={1}
              value={t}
              onChange={e => patchStyle({ thickness: parseInt(e.target.value) })}
              className="w-16 accent-indigo-400"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-300" title="Grosor en la cabeza">
            Cabeza
            <input
              type="range" min={1} max={40} step={1}
              value={t1}
              onChange={e => patchStyle({ headThickness: parseInt(e.target.value) })}
              className="w-16 accent-indigo-400"
            />
          </label>
          <div className="flex items-center gap-0.5 border-l border-white/20 pl-2">
            {DASHES.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => patchStyle({ dash: d.id })}
                className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${dash === d.id ? 'bg-white/25' : 'hover:bg-white/10'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 border-l border-white/20 pl-2">
            <button type="button" title="Sin cabeza" onClick={() => patchStyle({ head: 'none' })} className={`p-1 rounded-lg ${head === 'none' ? 'bg-white/25' : 'hover:bg-white/10'}`}><Minus size={14} /></button>
            <button type="button" title="Una cabeza" onClick={() => patchStyle({ head: 'end' })} className={`p-1 rounded-lg ${head === 'end' ? 'bg-white/25' : 'hover:bg-white/10'}`}><ArrowRight size={14} /></button>
            <button type="button" title="Dos cabezas" onClick={() => patchStyle({ head: 'both' })} className={`p-1 rounded-lg ${head === 'both' ? 'bg-white/25' : 'hover:bg-white/10'}`}><ArrowLeftRight size={14} /></button>
          </div>
          <button
            type="button"
            onClick={() => useStore.getState().removeNode(id)}
            className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
            title="Eliminar flecha"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <svg
        width={length}
        height={ARROW_BOX_H}
        viewBox={`0 0 ${length} ${ARROW_BOX_H}`}
        className="absolute left-0 top-0 overflow-visible pointer-events-none"
        style={{ transformOrigin: `0px ${cy}px`, transform: `rotate(${angle}deg)` }}
      >
        {/* Zona de clic: solo el trazo (hitbox estricta, no un rectángulo) */}
        <path
          d={geo.centerPath} fill="none"
          stroke="transparent"
          strokeWidth={Math.max(Math.max(t, t1), 20)}
          strokeLinecap="round"
          style={{ pointerEvents: 'stroke' }}
        />
        {dash === 'solid' ? (
          <path d={geo.bodyPath} fill={color} style={{ pointerEvents: 'none' }} />
        ) : (
          <path
            d={geo.trimmedPath} fill="none" stroke={color}
            strokeWidth={geo.avgThickness}
            strokeLinecap={dash === 'dotted' ? 'round' : 'butt'}
            strokeDasharray={dashArray(dash, geo.avgThickness)}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {geo.heads.map((d, i) => <path key={i} d={d} fill={color} style={{ pointerEvents: 'none' }} />)}

        {selected && (
          <>
            <circle
              cx={length} cy={cy} r={9}
              fill="#ffffff" stroke="#4f46e5" strokeWidth={2.5}
              className="nodrag nopan arrow-handle"
              style={{ pointerEvents: 'all', touchAction: 'none' }}
              onPointerDown={down('tip')} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            />
            <circle
              cx={geo.mid[0]} cy={geo.mid[1]} r={9}
              fill="#4f46e5" stroke="#ffffff" strokeWidth={2.5}
              className="nodrag nopan arrow-handle"
              style={{ pointerEvents: 'all', touchAction: 'none' }}
              onPointerDown={bendDown} onPointerMove={bendMove} onPointerUp={bendUp} onPointerCancel={bendUp}
            />
            <circle
              cx={0} cy={cy} r={9}
              fill="#ffffff" stroke="#4f46e5" strokeWidth={2.5}
              className="nodrag nopan arrow-handle"
              style={{ pointerEvents: 'all', touchAction: 'none' }}
              onPointerDown={down('tail')} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default memo(ArrowAnnotationNode);
