import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, useStore as useRFStore } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { getTaxonomyRelation, getSmartLabel } from '../../config/taxonomy';
import { useStore } from '../../store/useStore';

const SPACING = 35;

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
  // Manejador de curvatura: punto medio real de la curva y datos para invertir el arrastre
  let handleX = (sourceX + targetX) / 2;
  let handleY = (sourceY + targetY) / 2;
  let chordMidX = handleX;
  let chordMidY = handleY;
  let normalX = 0;
  let normalY = 0;
  let baseOffset = 0; // desplazamiento que NO viene del usuario (separación de paralelas)
  let curveScale = 2; // quad: offset_control = 2 * distancia_del_punto_medio ; zigzag: 1

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    labelX = sourceX;
    labelY = sourceY;
  } else {
    const nx = -dy / length;
    const ny = dx / length;

    const spacing = SPACING;
    const offsetDistance = offsetIndex * spacing;
    normalX = nx;
    normalY = ny;
    chordMidX = sourceX + dx / 2;
    chordMidY = sourceY + dy / 2;

    if (isZigZag) {
      const segments = 10;
      let zigZagPath = `M ${sourceX} ${sourceY}`;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const baseX = sourceX + dx * t;
        const baseY = sourceY + dy * t;
        
        const zigFactor = (i % 2 === 0 ? 1 : -1) * 10;
        const px = baseX + nx * (offsetDistance + userCurvature + zigFactor);
        const py = baseY + ny * (offsetDistance + userCurvature + zigFactor);
        
        zigZagPath += ` L ${px} ${py}`;
        
        if (i === 5) {
          labelX = px;
          labelY = py;
        }
      }
      path = zigZagPath;
      curveScale = 1;
      baseOffset = offsetDistance;
      handleX = sourceX + dx / 2 + nx * (offsetDistance + userCurvature);
      handleY = sourceY + dy / 2 + ny * (offsetDistance + userCurvature);
    } else {
      baseOffset = offsetIndex === 0 ? 0 : offsetDistance * 2;
      const baseCurveOffset = baseOffset + userCurvature;
      
      const mx = sourceX + dx / 2;
      const my = sourceY + dy / 2;

      if (baseCurveOffset === 0) {
        path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
        labelX = mx;
        labelY = my;
        handleX = mx;
        handleY = my;
      } else {
        const cx = mx + nx * baseCurveOffset;
        const cy = my + ny * baseCurveOffset;

        path = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
        
        labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
        labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
        handleX = labelX;
        handleY = labelY;
      }
    }

    // Lógica inteligente: Si los nodos están muy cerca, empujamos la etiqueta perpendicularmente 
    // para buscar un "hueco" y que no se solape con los nodos ni sus nombres.
    if (length < 240) {
      let pushNx = nx;
      let pushNy = ny;
      
      // Preferimos empujar hacia "arriba" (Y negativo) para evitar los nombres de los nodos que cuelgan hacia abajo.
      // O si es una línea muy vertical, empujamos hacia la derecha o izquierda.
      if (pushNy > 0.1) {
        pushNx = -pushNx;
        pushNy = -pushNy;
      }

      // Cuanto más cerca estén los nodos, más empujamos la etiqueta hacia afuera (hasta 45px)
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

  // --- Arrastre del manejador de curvatura (ratón y táctil) ---
  // Se escucha en `window` en vez de usar pointer capture: al actualizar la curvatura React
  // puede recrear el elemento del manejador, y la captura se perdería a mitad del gesto.
  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    // Geometría congelada al empezar: no depende de re-renders durante el arrastre
    const g = { midX: chordMidX, midY: chordMidY, nx: normalX, ny: normalY, scale: curveScale, base: baseOffset };
    useStore.getState().pushSnapshot();

    const onMove = (ev: PointerEvent) => {
      const p = flow.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const d = (p.x - g.midX) * g.nx + (p.y - g.midY) * g.ny;
      let curvature = Math.round(d * g.scale - g.base);
      if (Math.abs(curvature) < 8) curvature = 0; // imán a "recta"
      const edge = useStore.getState().edges.find(x => x.id === id);
      if (!edge) return;
      useStore.getState().updateEdgeData(id, { data: { ...edge.data, curvature } }, { history: false });
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
        <EdgeLabelRenderer>
          {/* Manejador de curvatura: HTML por encima de la etiqueta para poder agarrarlo siempre */}
          <div
            data-export-ignore="true"
            className="nodrag nopan"
            onPointerDown={onHandleDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${handleX}px,${handleY}px) scale(${k})`,
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
        </EdgeLabelRenderer>
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
