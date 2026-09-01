import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { getTaxonomyRelation, getSmartLabel } from '../../config/taxonomy';
import { useStore } from '../../store/useStore';

const ParallelEdge = ({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const offsetIndex = data?.offsetIndex || 0;
  const isZigZag = data?.isZigZag || false;
  
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

  if (length === 0) {
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    labelX = sourceX;
    labelY = sourceY;
  } else {
    const nx = -dy / length;
    const ny = dx / length;

    const spacing = 35;
    const offsetDistance = offsetIndex * spacing;

    if (isZigZag) {
      const segments = 10;
      let zigZagPath = `M ${sourceX} ${sourceY}`;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const baseX = sourceX + dx * t;
        const baseY = sourceY + dy * t;
        
        const zigFactor = (i % 2 === 0 ? 1 : -1) * 10;
        const px = baseX + nx * (offsetDistance + zigFactor);
        const py = baseY + ny * (offsetDistance + zigFactor);
        
        zigZagPath += ` L ${px} ${py}`;
        
        if (i === 5) {
          labelX = px;
          labelY = py;
        }
      }
      path = zigZagPath;
    } else {
      const baseCurveOffset = offsetIndex === 0 ? 15 : offsetDistance * 2;
      
      const mx = sourceX + dx / 2;
      const my = sourceY + dy / 2;

      const cx = mx + nx * baseCurveOffset;
      const cy = my + ny * baseCurveOffset;

      path = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
      
      labelX = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
      labelY = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
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

  const edgeStyle = {
    ...style,
    stroke: taxRule.color,
    strokeWidth: taxRule.width,
    strokeDasharray: taxRule.dashed ? '6 6' : 'none',
  };

  return (
    <>
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction cursor-pointer"
      />
      <BaseEdge 
        path={path} 
        markerEnd={markerEnd} 
        style={edgeStyle} 
      />
      {!isDuplicateLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
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
