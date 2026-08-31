import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../types/store';

const ClusterNode = ({ data, selected }: NodeProps<NodeData>) => {
  const shape = data.biographicalAttributes?.shape || 'square';
  
  let shapeClasses = `w-full h-full min-w-[200px] min-h-[200px] bg-indigo-50/30 border-2 border-dashed transition-colors relative z-0
    ${selected ? 'border-indigo-400 bg-indigo-100/40' : 'border-indigo-200'}
  `;

  if (shape === 'circle') shapeClasses += ' rounded-full';
  else if (shape === 'square') shapeClasses += ' rounded-2xl';

  const clipPaths: Record<string, string> = {
    star: 'polygon(50% 0%, 65% 35%, 100% 40%, 75% 65%, 85% 100%, 50% 80%, 15% 100%, 25% 65%, 0% 40%, 35% 35%)',
    heart: 'polygon(50% 100%, 10% 60%, 0% 30%, 15% 0%, 50% 25%, 85% 0%, 100% 30%, 90% 60%)',
    hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
    pentagon: 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)',
    octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    shield: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)'
  };

  const clipPathStyle = clipPaths[shape] || 'none';

  return (
    <div 
      className={shapeClasses}
      style={{ clipPath: clipPathStyle }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
        <h3 className="text-xl font-black text-indigo-900/30 uppercase tracking-widest">
          {data.semanticLabel || 'Grupo'}
        </h3>
        {data.description && (
          <p className="text-sm font-bold text-indigo-800/40 mt-2 max-w-[80%] line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

export default memo(ClusterNode);
