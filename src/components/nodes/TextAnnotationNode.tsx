import { memo, useState, useRef, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import type { NodeData } from '../../types/store';
import { useStore } from '../../store/useStore';

const FONTS = [
  { id: 'sans', name: 'Sans', fontClass: 'font-sans' },
  { id: 'serif', name: 'Serif', fontClass: 'font-serif italic' },
  { id: 'mono', name: 'Mono', fontClass: 'font-mono' },
];

const HIGHLIGHT_STYLES = ['pill', 'solid', 'transparent'] as const;

const COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#ec4899',
];

const TextAnnotationNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const styleConfig = data.styleConfig || {};
  const text = data.description || 'Escribe algo aquí...';
  const fontFamily = styleConfig.fontFamily || 'sans';
  const highlightStyle = styleConfig.highlightStyle || 'pill';
  const textColor = styleConfig.textColor || '#1e293b';
  const bgColor = styleConfig.bgColor || '#ffffff';
  const textAlign = styleConfig.textAlign || 'center';
  const fontSize = styleConfig.fontSize || 20;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const activeFont = FONTS.find(f => f.id === fontFamily) || FONTS[0];

  const getContainerStyles = () => {
    if (highlightStyle === 'pill') {
      return {
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        borderRadius: '20px',
        padding: '10px 18px',
      };
    }
    if (highlightStyle === 'solid') {
      return {
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        padding: '12px 16px',
      };
    }
    return {
      backgroundColor: 'transparent',
      color: textColor,
      textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      padding: '8px',
    };
  };

  return (
    <div 
      className="relative group min-w-[120px] cursor-grab active:cursor-grabbing select-none"
      onDoubleClick={() => setIsEditing(true)}
      onClick={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      <NodeResizer 
        minWidth={80} 
        minHeight={40}
        isVisible={selected}
        lineClassName="border-indigo-400"
        handleClassName="h-2.5 w-2.5 bg-white border-2 border-indigo-600 rounded-sm"
        onResizeEnd={(_, params) => {
          updateNodeData(id, { 
            visualDimensions: { width: Math.round(params.width), height: Math.round(params.height) },
            visualPosition: { x: Math.round(params.x), y: Math.round(params.y) }
          });
        }}
      />

      {/* Floating Instagram-Style Editor Toolbar */}
      {(selected || showToolbar) && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md px-2 py-1 rounded-2xl shadow-xl flex items-center gap-1.5 z-50 text-white animate-in fade-in duration-150 nodrag nopan">
          {/* Font Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextIndex = (FONTS.findIndex(f => f.id === fontFamily) + 1) % FONTS.length;
              updateNodeData(id, { styleConfig: { ...styleConfig, fontFamily: FONTS[nextIndex].id } });
            }}
            className="p-1 hover:bg-white/20 rounded-lg text-xs font-bold uppercase transition-colors"
            title="Cambiar Tipografía"
          >
            <Type size={14} />
          </button>

          {/* Highlight Style Toggle (Pill / Solid / Transparent) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextIndex = (HIGHLIGHT_STYLES.indexOf(highlightStyle) + 1) % HIGHLIGHT_STYLES.length;
              updateNodeData(id, { styleConfig: { ...styleConfig, highlightStyle: HIGHLIGHT_STYLES[nextIndex] } });
            }}
            className="p-1 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
            title="Estilo de Fondo (Historias)"
          >
            <Palette size={14} />
          </button>

          {/* Text Alignment Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const aligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
              const nextIndex = (aligns.indexOf(textAlign) + 1) % aligns.length;
              updateNodeData(id, { styleConfig: { ...styleConfig, textAlign: aligns[nextIndex] } });
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Alineación"
          >
            {textAlign === 'left' && <AlignLeft size={14} />}
            {textAlign === 'center' && <AlignCenter size={14} />}
            {textAlign === 'right' && <AlignRight size={14} />}
          </button>

          {/* Quick Color Swatches */}
          <div className="flex items-center gap-1 px-1 border-l border-white/20">
            {COLORS.slice(0, 5).map(col => (
              <button
                key={col}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateNodeData(id, { styleConfig: { ...styleConfig, bgColor: col, textColor: col === '#ffffff' ? '#000000' : '#ffffff' } });
                }}
                className="w-3.5 h-3.5 rounded-full border border-white/40 hover:scale-125 transition-transform"
                style={{ backgroundColor: col }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors ml-0.5"
            title="Eliminar Texto"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Render text or editing input */}
      <div 
        style={getContainerStyles()}
        className={`transition-all duration-200 ${activeFont.fontClass}`}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={data.description || ''}
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent outline-none resize-none overflow-hidden nodrag nopan text-center"
            style={{ fontSize: `${fontSize}px`, textAlign, color: textColor }}
            rows={2}
          />
        ) : (
          <div 
            className="whitespace-pre-wrap select-none leading-relaxed font-bold break-words"
            style={{ fontSize: `${fontSize}px`, textAlign }}
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TextAnnotationNode);
