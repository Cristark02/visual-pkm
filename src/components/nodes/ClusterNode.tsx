import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../types/store';

const ClusterNode = ({ data, selected }: NodeProps<NodeData>) => {
  return (
    <div className={`w-full h-full min-w-[200px] min-h-[200px] bg-gray-100/30 border-2 border-dashed rounded-2xl transition-colors
      ${selected ? 'border-blue-400 bg-blue-50/20' : 'border-gray-300'}
    `}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div className="p-3">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
          {data.semanticLabel || 'Grupo'}
        </h3>
        {data.description && (
          <p className="text-xs text-gray-500 mt-1 max-w-[80%] line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

export default memo(ClusterNode);
