import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
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
  
  const semanticType = data?.semanticRelationshipType || 'Conexión';
  const taxRule = getTaxonomyRelation(semanticType);

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
      <BaseEdge 
        path={path} 
        markerEnd={markerEnd} 
        style={edgeStyle} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan bg-white/90 backdrop-blur text-[9px] font-bold text-gray-600 px-2 py-0.5 rounded-full border border-gray-100 shadow-sm uppercase tracking-wider"
        >
          {semanticType}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(ParallelEdge);
