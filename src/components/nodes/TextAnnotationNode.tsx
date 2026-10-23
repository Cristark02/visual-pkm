import { memo, useState, useRef, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { AlignLeft, AlignCenter, AlignRight, Trash2, PaintBucket, Square, RectangleHorizontal } from 'lucide-react';
import type { NodeData } from '../../types/store';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { useUIMode } from '../../lib/useMedia';
import { TEXT_FONTS, textFont, effectShadow } from '../../lib/textFonts';

const ALIGNS = [
  { id: 'left', icon: AlignLeft, title: 'Alinear a la izquierda' },
  { id: 'center', icon: AlignCenter, title: 'Centrar' },
  { id: 'right', icon: AlignRight, title: 'Alinear a la derecha' },
] as const;

const QUICK_COLORS = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

/** Tiempo de gracia para que el ratón viaje del texto a su barra sin que esta desaparezca. */
const HOVER_GRACE_MS = 450;

const TextAnnotationNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const touchUI = useUIMode() !== 'desktop';
  // En táctil el editor a pantalla completa (Studio) manda: mientras está abierto se escribe en el propio texto
  const studioOpen = useUI(st => st.studioId === id);

  const styleConfig = data.styleConfig || {};
  const text = data.description ?? '';
  const fontFamily = styleConfig.fontFamily || 'sans';
  const highlightStyle = styleConfig.highlightStyle || 'pill';
  const textColor = styleConfig.textColor || '#1e293b';
  const bgColor = styleConfig.bgColor || '#ffffff';
  const textAlign = styleConfig.textAlign || 'center';
  const fontSize = styleConfig.fontSize || 20;
  const textEffect = styleConfig.textEffect;
  const showBackground = styleConfig.showBackground !== false && highlightStyle !== 'transparent';
  const roundShape = highlightStyle !== 'solid';

  const editing = isEditing || studioOpen;

  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.select();
    // El toque que abrió el editor puede mover el foco justo después: se reintenta una vez
    const t = setTimeout(() => {
      if (document.activeElement !== textareaRef.current) textareaRef.current?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [editing]);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const patch = (p: Partial<NonNullable<NodeData['styleConfig']>>) =>
    updateNodeData(id, { styleConfig: { ...styleConfig, ...p } });

  const onEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const onLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(false), HOVER_GRACE_MS);
  };

  const activeFont = textFont(fontFamily);
  const showToolbar = !touchUI && (selected || hovered || isEditing);
  const isEmpty = text.trim() === '' && !editing;

  const containerStyle: React.CSSProperties = showBackground
    ? {
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textShadow: effectShadow(textEffect, true),
        borderRadius: roundShape ? '20px' : '8px',
        padding: roundShape ? '10px 18px' : '12px 16px',
      }
    : {
        backgroundColor: 'transparent',
        color: textColor,
        textShadow: effectShadow(textEffect, false),
        padding: '8px',
        // Texto vacío sin fondo: solo un contorno tenue mientras se interactúa, para poder encontrarlo
        outline: isEmpty && (selected || hovered) ? '2px dashed rgba(99,102,241,0.5)' : undefined,
        borderRadius: '8px',
      };

  const btn = (active: boolean) =>
    `p-1 rounded-lg transition-colors ${active ? 'bg-white/25' : 'hover:bg-white/15'}`;

  return (
    <div 
      className="relative group min-w-[120px] select-none"
      onDoubleClick={() => { if (!touchUI) setIsEditing(true); }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <NodeResizer 
        minWidth={80} 
        minHeight={40}
        isVisible={selected && !studioOpen}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ width: 16, height: 16, background: '#ffffff', border: '3px solid #4f46e5', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', pointerEvents: 'auto' }}
        handleClassName="pointer-events-auto"
        onResizeEnd={(_, params) => {
          updateNodeData(id, { 
            visualDimensions: { width: Math.round(params.width), height: Math.round(params.height) },
            visualPosition: { x: Math.round(params.x), y: Math.round(params.y) }
          });
        }}
      />

      {/* Barra de edición. Su contenedor (pb-3 transparente) hace de "puente de seguridad"
          entre el texto y los botones: moverse hacia ella nunca sale del hover. */}
      {showToolbar && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-3 z-50 nodrag nopan">
          <div className="bg-gray-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-center gap-1.5 text-white max-w-[340px] animate-in fade-in duration-150">
            {/* Tipografía */}
            <div className="flex items-center gap-0.5">
              {TEXT_FONTS.slice(0, 3).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); patch({ fontFamily: f.id }); }}
                  className={`${btn(fontFamily === f.id)} text-xs font-bold px-1.5 ${f.className}`}
                  title={`Tipografía: ${f.name}`}
                >
                  Aa
                </button>
              ))}
            </div>

            {/* Alineación */}
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-1.5">
              {ALIGNS.map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); patch({ textAlign: a.id }); }}
                    className={btn(textAlign === a.id)}
                    title={a.title}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            {/* Fondo opcional */}
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (showBackground) patch({ showBackground: false });
                  else patch({ showBackground: true, highlightStyle: highlightStyle === 'transparent' ? 'pill' : highlightStyle });
                }}
                className={btn(showBackground)}
                title={showBackground ? 'Quitar fondo' : 'Poner fondo'}
              >
                <PaintBucket size={14} />
              </button>
              {showBackground && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); patch({ highlightStyle: roundShape ? 'solid' : 'pill' }); }}
                  className={btn(false)}
                  title={roundShape ? 'Esquinas rectas' : 'Esquinas redondeadas'}
                >
                  {roundShape ? <RectangleHorizontal size={14} /> : <Square size={14} />}
                </button>
              )}
            </div>

            {/* Colores libres */}
            <div className="flex items-center gap-1 border-l border-white/20 pl-1.5">
              <label className="flex items-center gap-1 text-[10px] font-bold text-gray-300" title="Color del texto">
                A
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => patch({ textColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                />
              </label>
              {showBackground && (
                <label className="flex items-center gap-1 text-[10px] font-bold text-gray-300" title="Color de fondo">
                  <PaintBucket size={11} />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => patch({ bgColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </label>
              )}
            </div>

            {/* Atajos de color (fondo + texto contrastado) */}
            <div className="flex items-center gap-1 border-l border-white/20 pl-1.5">
              {QUICK_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    patch({ bgColor: col, textColor: col === '#ffffff' ? '#000000' : '#ffffff', showBackground: true, highlightStyle: highlightStyle === 'transparent' ? 'pill' : highlightStyle });
                  }}
                  className="w-3.5 h-3.5 rounded-full border border-white/40 hover:scale-125 transition-transform"
                  style={{ backgroundColor: col }}
                  title="Aplicar color"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeNode(id); }}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
              title="Eliminar texto"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Texto o editor */}
      <div 
        style={containerStyle}
        className={`transition-all duration-200 min-h-[2.5rem] ${activeFont.className}`}
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={data.description || ''}
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
            onBlur={() => { if (!studioOpen) setIsEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !studioOpen) {
                e.preventDefault();
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent outline-none resize-none overflow-hidden nodrag nopan"
            style={{ fontSize: `${fontSize}px`, textAlign, color: textColor, ...activeFont.style }}
            rows={2}
            placeholder="Escribe aquí…"
          />
        ) : (
          <div 
            className="whitespace-pre-wrap select-none leading-relaxed font-bold break-words"
            style={{ fontSize: `${fontSize}px`, textAlign, minHeight: '1.5em', ...activeFont.style }}
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TextAnnotationNode);
