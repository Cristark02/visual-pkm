import { memo, useRef } from 'react';
import type { NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { Image, Upload, Trash2 } from 'lucide-react';
import type { NodeData } from '../../types/store';
import { useStore } from '../../store/useStore';

const ImageAnnotationNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = data.mediaReferences?.primaryAvatarPath;
  const w = data.visualDimensions?.width || 200;
  const h = data.visualDimensions?.height || 200;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateNodeData(id, {
        mediaReferences: { primaryAvatarPath: dataUrl }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative group cursor-grab active:cursor-grabbing select-none">
      <NodeResizer 
        minWidth={60} 
        minHeight={60}
        isVisible={selected}
        lineClassName="border-indigo-400"
        handleClassName="h-3 w-3 bg-white border-2 border-indigo-600 rounded-sm"
        onResizeEnd={(_, params) => {
          updateNodeData(id, { 
            visualDimensions: { width: Math.round(params.width), height: Math.round(params.height) },
            visualPosition: { x: Math.round(params.x), y: Math.round(params.y) }
          });
        }}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload} 
      />

      {imageUrl ? (
        <div 
          className="relative rounded-2xl overflow-hidden shadow-lg border border-black/5 hover:shadow-xl transition-shadow bg-white"
          style={{ width: `${w}px`, height: `${h}px` }}
        >
          <img 
            src={imageUrl} 
            alt="Sticker" 
            className="w-full h-full object-cover pointer-events-none" 
          />
          {selected && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-xl nodrag nopan">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-white hover:text-indigo-300 transition-colors"
                title="Cambiar Imagen"
              >
                <Upload size={14} />
              </button>
              <button
                type="button"
                onClick={() => removeNode(id)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-white/80 backdrop-blur flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-indigo-50/50 shadow-sm"
          style={{ width: `${w}px`, height: `${h}px` }}
        >
          <Image size={32} className="text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" />
          <span className="text-xs font-bold text-gray-600">Subir Imagen / Sticker</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Click para seleccionar</span>
        </div>
      )}
    </div>
  );
};

export default memo(ImageAnnotationNode);
