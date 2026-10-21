import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, useStore as useRFStore } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { getTaxonomyRelation, getSmartLabel } from '../../config/taxonomy';
import { useStore } from '../../store/useStore';

const SPACING = 35;

type CP = { t: number; d: number };
type ControlPoints = [CP, CP];

const ParallelEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerStart,
  markerEnd,
  data,
}: EdgeProps) => {
  const offsetIndex = data?.offsetIndex || 0;
  const isZigZag = data?.isZigZag || false;
  const userCurvature = data?.curvature || 0;
  const filterState: 'dim' | 'highlight' | undefined = data?.filterState;

  const flow = useReactFlow();
  const zoom = useRFStore(st => st.transform[2]);
  const isSelected = useStore(state => state.selectedEntityType === 'edge' && state.selectedEntityId === id);
  
  const rawSemanticType = data?.semanticRelationshipType || 'Conexión';
  const taxRule = getTaxonomyRelation(rawSemanticType);

  const g1 = useStore(state => state.nodes.find(n => n.id === source)?.data?.biographicalAttributes?.gender);
  const g2 = useStore(state => state.nodes.find(n => n.id === target)?.data?.biographicalAttributes?.gender);

  const forceMasculine = data?.forceMasculine || false;
  const semanticType = getSmartLabel(rawSemanticType, forceMasculine ? 'Hombre' : g1, g2);

  let path = '';
  let labelX = 0;
  let labelY = 0;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const nx = length === 0 ? 0 : -dy / length;
  const ny = length === 0 ? 0 : dx / length;
  const offsetDistance = offsetIndex * SPACING;

  // Puntos de control de la Bézier cúbica, en el marco de la cuerda: posición = S + cuerda·t + normal·d.
  // Son libres (t y d sin límites), de modo que la curva se puede doblar a placer.
  // Si el usuario aún no los ha movido, se derivan de la curvatura heredada para no cambiar el dibujo.
  const userCtrl: ControlPoints | undefined = data?.controlPoints;
  const legacyOffset = isZigZag
    ? offsetDistance + userCurvature
    : (offsetIndex === 0 ? 0 : offsetDistance * 2) + userCurvature;
  const legacyD = isZigZag ? legacyOffset : (2 / 3) * legacyOffset; // quad → cúbica
  const ctrl: ControlPoints = userCtrl ?? [{ t: 1 / 3, d: legacyD }, { t: 2 / 3, d: legacyD }];
  const toPoint = (c: CP) => ({ x: sourceX + dx * c.t + nx * c.d, y: sourceY + dy * c.t + ny * c.d });
  const c1 = toPoint(ctrl[0]);
  const c2 = toPoint(ctrl[1]);

  if (length === 0) {
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    labelX = sourceX;
    labelY = sourceY;
  } else {
    if (isZigZag) {
      const segments = 10;
      let zigZagPath = `M ${sourceX} ${sourceY}`;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        let baseX: number, baseY: number, px: number, py: number;
        const zig = (i % 2 === 0 ? 1 : -1) * 10;
        if (userCtrl) {
          // zigzag a lo largo de la cúbica libre
          const u = 1 - t;
          baseX = u * u * u * sourceX + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * targetX;
          baseY = u * u * u * sourceY + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * targetY;
          const tx = 3 * u * u * (c1.x - sourceX) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (targetX - c2.x);
          const ty = 3 * u * u * (c1.y - sourceY) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (targetY - c2.y);
          const tl = Math.hypot(tx, ty) || 1;
          px = baseX + (-ty / tl) * zig;
          py = baseY + (tx / tl) * zig;
        } else {
          baseX = sourceX + dx * t;
          baseY = sourceY + dy * t;
          px = baseX + nx * (legacyOffset + zig);
          py = baseY + ny * (legacyOffset + zig);
        }
        zigZagPath += ` L ${px} ${py}`;
        if (i === 5) {
          labelX = px;
          labelY = py;
        }
      }
      path = zigZagPath;
    } else if (userCtrl) {
      path = `M ${sourceX},${sourceY} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${targetX},${targetY}`;
      labelX = (sourceX + 3 * c1.x + 3 * c2.x + targetX) / 8;
      labelY = (sourceY + 3 * c1.y + 3 * c2.y + targetY) / 8;
    } else {
      const mx = sourceX + dx / 2;
      const my = sourceY + dy / 2;

      if (legacyOffset === 0) {
        path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
        labelX = mx;
        labelY = my;
      } else {
        const cx = mx + nx * legacyOffset;
        const cy = my + ny * legacyOffset;
        path = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
        labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
        labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
      }
    }

    // Lógica inteligente: Si los nodos están muy cerca, empujamos la etiqueta perpendicularmente 
    // para buscar un "hueco" y que no se solape con los nodos ni sus nombres.
    if (length < 240) {
      let pushNx = nx;
      let pushNy = ny;
      if (pushNy > 0.1) {
        pushNx = -pushNx;
        pushNy = -pushNy;
      }
      const pushDistance = (1 - (length / 240)) * 45;
      labelX += pushNx * pushDistance;
      labelY += pushNy * pushDistance;
    }
  }

  // Si hay varios nombres en la misma ruta, los apilamos verticalmente
  if (offsetIndex !== 0) {
    labelY += offsetIndex * 14;
  }

  // Si hay colisión geométrica detectada desde GraphCanvas, aplicamos su offset
  if (data?.collisionOffsetY) {
    labelY += data.collisionOffsetY;
  }

  const isDuplicateLabel = data?.isDuplicateLabel || false;

  const isHighlight = filterState === 'highlight';
  const edgeStyle = {
    ...style,
    stroke: taxRule.color,
    strokeWidth: taxRule.width + (isHighlight ? 1.5 : 0),
    strokeDasharray: taxRule.dashed ? '6 6' : 'none',
  };
  const groupOpacity = filterState === 'dim' ? 0.12 : 1;

  // --- Arrastre de los manejadores de la curva (ratón y táctil) ---
  // Se escucha en `window` en vez de usar pointer capture: al actualizar la curva React
  // puede recrear el elemento del manejador, y la captura se perdería a mitad del gesto.
  const onHandleDown = (index: 0 | 1) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // Geometría congelada al empezar: no depende de re-renders durante el arrastre
    const g = { sx: sourceX, sy: sourceY, dx, dy, nx, ny, len2: dx * dx + dy * dy, ctrl: [{ ...ctrl[0] }, { ...ctrl[1] }] as ControlPoints };
    useStore.getState().pushSnapshot();

    const onMove = (ev: PointerEvent) => {
      if (g.len2 === 0) return;
      const p = flow.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const rx = p.x - g.sx;
      const ry = p.y - g.sy;
      const next: ControlPoints = [{ ...g.ctrl[0] }, { ...g.ctrl[1] }];
      next[index] = {
        t: Math.round(((rx * g.dx + ry * g.dy) / g.len2) * 1000) / 1000,
        d: Math.round((rx * g.nx + ry * g.ny) * 10) / 10,
      };
      g.ctrl = next;
      const edge = useStore.getState().edges.find(x => x.id === id);
      if (!edge) return;
      useStore.getState().updateEdgeData(id, { data: { ...edge.data, controlPoints: next } }, { history: false });
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

  const k = 1 / Math.max(zoom, 0.2);

  return (
    <>
      <g style={{ opacity: groupOpacity, transition: 'opacity 0.25s ease' }}>
        <path
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={20}
          className="react-flow__edge-interaction"
        />
        <BaseEdge 
          path={path} 
          markerStart={markerStart}
          markerEnd={markerEnd} 
          style={edgeStyle} 
        />
      </g>
      {isSelected && length > 0 && (
        <>
          {/* Líneas guía de la Bézier: extremo → manejador */}
          <g data-export-ignore="true" style={{ pointerEvents: 'none' }}>
            <line x1={sourceX} y1={sourceY} x2={c1.x} y2={c1.y} stroke="#4f46e5" strokeOpacity={0.55} strokeWidth={1.5 * k} strokeDasharray={`${4 * k} ${4 * k}`} />
            <line x1={targetX} y1={targetY} x2={c2.x} y2={c2.y} stroke="#4f46e5" strokeOpacity={0.55} strokeWidth={1.5 * k} strokeDasharray={`${4 * k} ${4 * k}`} />
          </g>
          <EdgeLabelRenderer>
            {/* Dos manejadores libres, HTML por encima de la etiqueta para poder agarrarlos siempre */}
            {([c1, c2] as const).map((pt, i) => (
              <div
                key={i}
                data-export-ignore="true"
                className="nodrag nopan"
                onPointerDown={onHandleDown(i as 0 | 1)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${pt.x}px,${pt.y}px) scale(${k})`,
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'all',
                  touchAction: 'none',
                  zIndex: 1100,
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '3px solid #4f46e5', boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }} />
              </div>
            ))}
          </EdgeLabelRenderer>
        </>
      )}
      {!isDuplicateLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
              opacity: groupOpacity,
              transition: 'opacity 0.25s ease',
              color: taxRule.color,
              textShadow: '0px 1px 3px rgba(255,255,255,1), 0px -1px 3px rgba(255,255,255,1), 1px 0px 3px rgba(255,255,255,1), -1px 0px 3px rgba(255,255,255,1)'
            }}
            className="nodrag nopan text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
          >
            {semanticType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(ParallelEdge);
