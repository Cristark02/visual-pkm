import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { NodeResizeControl } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { Link2, Unlink, ArrowDownLeft } from 'lucide-react';
import type { NodeData } from '../../types/store';
import { useStore } from '../../store/useStore';

const ClusterNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const updateNodeData = useStore(state => state.updateNodeData);
  const shape = data.biographicalAttributes?.shape || 'square';
  
  const svgPaths: Record<string, string> = {
    circle: '<ellipse cx="50" cy="50" rx="48" ry="48" />',
    square: '<rect x="2" y="2" width="96" height="96" rx="8" />',
    star: '<polygon points="50,2 65,35 98,40 75,65 85,98 50,80 15,98 25,65 2,40 35,35" />',
    heart: '<polygon points="50,98 10,60 2,30 15,2 50,25 85,2 98,30 90,60" />',
    hexagon: '<polygon points="25,2 75,2 98,50 75,98 25,98 2,50" />',
    diamond: '<polygon points="50,2 98,50 50,98 2,50" />',
    triangle: '<polygon points="50,2 98,98 2,98" />',
    pentagon: '<polygon points="50,2 98,38 81,98 19,98 2,38" />',
    octagon: '<polygon points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30" />',
    shield: '<polygon points="2,2 98,2 98,75 50,98 2,75" />'
  };

  const svgInner = svgPaths[shape] || svgPaths.square;

  return (
    <div 
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Botón de Enlace (Lock/Link) - SIEMPRE VISIBLE PERO TRANSLÚCIDO SI NO ESTÁ SELECCIONADO */}
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          updateNodeData(id, { isChainLinked: !data.isChainLinked }); 
        }}
        className={`absolute top-2 right-2 z-50 p-2.5 rounded-full transition-all nodrag nopan cursor-pointer backdrop-blur-sm border ${
          data.isChainLinked 
            ? 'bg-indigo-100/90 text-indigo-700 border-indigo-300 shadow-md scale-105' 
            : 'bg-white/50 text-gray-500 border-gray-200 hover:bg-white/90 shadow-sm'
        } ${selected || isHovered ? 'opacity-100' : 'opacity-30'}`}
        title={data.isChainLinked ? "Arrastre en cadena ACTIVADO (solapamientos se mueven juntos)" : "Arrastre en cadena DESACTIVADO"}
      >
        {data.isChainLinked ? <Link2 size={24} /> : <Unlink size={24} />}
      </button>

      {(selected || isHovered) && (
        <NodeResizeControl 
          minWidth={150} 
          minHeight={150}
          position="bottom-left"
          onResizeEnd={(_, params) => {
            updateNodeData(id, { visualDimensions: { width: params.width, height: params.height } });
          }}
          style={{ background: 'transparent', border: 'none' }}
        >
          <div className="absolute bottom-0 left-0 w-12 h-12 transform translate-y-1/2 -translate-x-1/2 text-indigo-600 bg-white shadow-xl border-2 border-indigo-200 rounded-full flex items-center justify-center hover:bg-indigo-50 active:bg-indigo-100 transition-colors pointer-events-auto cursor-sw-resize z-50 nodrag nopan">
            <ArrowDownLeft size={24} />
          </div>
        </NodeResizeControl>
      )}
      
      <div className="w-full h-full relative z-0">
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          className="absolute inset-0 w-full h-full"
        >
          <g 
            dangerouslySetInnerHTML={{ __html: svgInner }} 
            fill={data.color ? `${data.color}${selected ? '40' : '20'}` : (selected ? 'rgba(224, 231, 255, 0.4)' : 'rgba(238, 242, 255, 0.3)')}
            stroke={data.color || (selected ? '#818cf8' : '#c7d2fe')}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Handle type="target" position={Position.Top} className="opacity-0" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <h3 
            className="text-xl font-black uppercase tracking-widest transition-colors"
            style={{ color: data.color || '#312e81', opacity: data.color ? 0.6 : 0.3 }}
          >
            {data.semanticLabel || 'Grupo'}
          </h3>
          {data.description && (
            <p 
              className="text-sm font-bold mt-2 max-w-[80%] line-clamp-2 transition-colors"
              style={{ color: data.color || '#3730a3', opacity: data.color ? 0.7 : 0.4 }}
            >
              {data.description}
            </p>
          )}
        </div>
        
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    </div>
  );
};

export default memo(ClusterNode);
