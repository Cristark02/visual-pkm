import { memo } from 'react';
import { BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { getTaxonomyRelation } from '../../config/taxonomy';

const ParallelEdge = ({
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
  
  // Use the taxonomy rule for this edge
  const semanticType = data?.semanticRelationshipType || 'Conexión';
  const taxRule = getTaxonomyRelation(semanticType);

  let path = '';

  if (offsetIndex === 0 && !isZigZag) {
    // Línea recta para la conexión central por defecto
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    // Calcular vector normal para el desplazamiento
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
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
        }
        path = zigZagPath;
      } else {
        const mx = sourceX + dx / 2;
        const my = sourceY + dy / 2;

        const cx = mx + nx * offsetDistance * 2;
        const cy = my + ny * offsetDistance * 2;

        path = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
      }
    }
  }

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
      <BaseEdge path={path} markerEnd={taxRule.arrow ? "url(#arrowhead)" : markerEnd} style={edgeStyle} />
    </>
  );
};

export default memo(ParallelEdge);
