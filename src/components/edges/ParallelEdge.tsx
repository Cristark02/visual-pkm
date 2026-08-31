import { memo } from 'react';
import { BaseEdge, getBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const ParallelEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const offsetIndex = data?.offsetIndex || 0;
  const isZigZag = data?.isZigZag || false;

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
      // Vector perpendicular (normalizado)
      const nx = -dy / length;
      const ny = dx / length;

      // Desplazamiento fijo por índice
      const spacing = 35; // Pixeles de separación entre aristas paralelas
      const offsetDistance = offsetIndex * spacing;

      if (isZigZag) {
        // Generar un patrón zig-zag a lo largo de la línea base desplazada
        // Para simplificar, dividimos la línea en segmentos
        const segments = 10;
        let zigZagPath = `M ${sourceX} ${sourceY}`;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const baseX = sourceX + dx * t;
          const baseY = sourceY + dy * t;
          
          // Alternar arriba y abajo de la línea base
          const zigFactor = (i % 2 === 0 ? 1 : -1) * 10;
          const px = baseX + nx * (offsetDistance + zigFactor);
          const py = baseY + ny * (offsetDistance + zigFactor);
          
          zigZagPath += ` L ${px} ${py}`;
        }
        path = zigZagPath;
      } else {
        // Curva Cuadrática (Q) desplazada en el medio
        const mx = sourceX + dx / 2;
        const my = sourceY + dy / 2;

        const cx = mx + nx * offsetDistance * 2; // Multiplicamos por 2 para exagerar el punto de control
        const cy = my + ny * offsetDistance * 2;

        path = `M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`;
      }
    }
  }

  // Encapsulamos la trayectoria visible dentro de un "sendero transparente" más grueso
  // para facilitar los eventos táctiles (como estipula el PDD)
  return (
    <>
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20} // Hitbox transparente ancho
        className="react-flow__edge-interaction"
      />
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
    </>
  );
};

export default memo(ParallelEdge);
