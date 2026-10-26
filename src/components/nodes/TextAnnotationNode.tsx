import { memo, useState, useRef, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import ResizeHandles from './ResizeHandles';
import { AlignLeft, AlignCenter, AlignRight, Trash2, PaintBucket, Square, RectangleHorizontal } from 'lucide-react';
import type { NodeData } from '../../types/store';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { useUIMode } from '../../lib/useMedia';
import { TEXT_FONTS, TEXT_EFFECTS } from '../../lib/textFonts';
import TextBlock, { focusEnd } from '../TextBlock';

const ALIGNS = [
  { id: 'left', icon: AlignLeft, title: 'Alinear a la izquierda' },
  { id: 'center', icon: AlignCenter, title: 'Centrar' },
  { id: 'right', icon: AlignRight, title: 'Alinear a la derecha' },
] as const;

const QUICK_COLORS = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

/** Tiempo de gracia para que el ratón viaje del texto a su barra sin que esta desaparezca. */
const HOVER_GRACE_MS = 450;

const TextAnnotationNode = ({ id, data, selected, xPos, yPos }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchUI = useUIMode() !== 'desktop';
  const studioOpen = useUI(st => st.studioId === id);

  const styleConfig = data.styleConfig || {};
  const text = data.description ?? '';
  const fontFamily = styleConfig.fontFamily || 'sans';
  const highlightStyle = styleConfig.highlightStyle || 'pill';
  const textColor = styleConfig.textColor || '#1e293b';
  const bgColor = styleConfig.bgColor || '#ffffff';
  const textAlign = styleConfig.textAlign || 'center';
  const fontSize = styleConfig.fontSize || 20;
  const showBackground = styleConfig.showBackground !== false && highlightStyle !== 'transparent';
  const roundShape = highlightStyle !== 'solid';

  const editing = isEditing;

  useEffect(() => {
    if (!editing) return;
    const t0 = setTimeout(() => focusEnd(textareaRef.current), 30);
    const t = setTimeout(() => { if (document.activeElement !== textareaRef.current) focusEnd(textareaRef.current); }, 280);
    return () => { clearTimeout(t0); clearTimeout(t); };
  }, [editing]);

  // El tamaño del texto lo decide su contenido; se guarda medido (para exportar y colocar sin solapes)
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      const cur = useStore.getState().nodes.find(n => n.id === id)?.data.visualDimensions;
      if (w > 0 && h > 0 && (!cur || Math.abs(cur.width - w) > 1 || Math.abs(cur.height - h) > 1)) {
        useStore.getState().updateNodeData(id, { visualDimensions: { width: w, height: h } }, { history: false });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [id]);

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

  const showToolbar = !touchUI && (selected || hovered || isEditing);
  const isEmpty = text.trim() === '' && !editing;
  const rotation = data.rotation || 0;

  const btn = (active: boolean) =>
    `p-1 rounded-lg transition-colors ${active ? 'bg-white/25' : 'hover:bg-white/15'}`;

  return (
    <div 
      className="relative group select-none"
      onDoubleClick={() => { if (!touchUI) setIsEditing(true); }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >

      {/* Barra de edición. Su contenedor (pb-3 transparente) hace de "puente de seguridad"
          entre el texto y los botones: moverse hacia ella nunca sale del hover. */}
      {showToolbar && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-3 z-50 nodrag nopan">
          <div className="bg-gray-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl flex flex-col items-center gap-1.5 text-white max-w-[460px] animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5">
            {/* Tipografía */}
            <div className="flex items-center gap-0.5">
              {TEXT_FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); patch({ fontFamily: f.id }); }}
                  className={`${btn(fontFamily === f.id)} text-xs font-bold px-1.5 ${f.className}`}
                  style={{ ...f.style, textTransform: 'none', letterSpacing: 'normal' }}
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

            </div>
            <div className="flex items-center gap-1.5">
            {/* Colores libres */}
            <div className="flex items-center gap-1">
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

            </div>
            <div className="flex items-center gap-1.5">
            {/* Efectos y tamaño (mismos que en el editor táctil) */}
            <div className="flex items-center gap-0.5">
              {TEXT_EFFECTS.map(ef => (
                <button
                  key={ef.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); patch({ textEffect: ef.id }); }}
                  className={`${btn((styleConfig.textEffect ?? (showBackground ? 'none' : 'shadow')) === ef.id)} text-[10px] font-bold px-1.5`}
                  title={`Efecto: ${ef.label}`}
                >
                  {ef.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1 border-l border-white/20 pl-1.5 text-[10px] font-bold uppercase text-gray-300" title="Tamaño del texto">
              Tamaño
              <input
                type="range" min={10} max={160} step={1} value={Math.round(fontSize)}
                onChange={(e) => patch({ fontSize: parseInt(e.target.value) })}
                className="w-20 accent-indigo-400"
              />
            </label>

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
        </div>
      )}

      <div className="relative" style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center' }}>
      <ResizeHandles id={id} xPos={xPos} yPos={yPos} mode="font" fontSize={fontSize} rotation={rotation} rotatable visible={selected && !studioOpen && !isEditing} />
      <div
        style={{
          outline: selected && !studioOpen ? '1.5px solid rgba(99,102,241,0.75)' : (isEmpty && hovered ? '2px dashed rgba(99,102,241,0.5)' : undefined),
          outlineOffset: 1,
          borderRadius: 6,
        }}
      >
        <TextBlock
          ref={boxRef}
          text={text}
          sc={styleConfig}
          fontPx={fontSize}
          edit={editing ? {
            editRef: textareaRef,
            onChange: v => updateNodeData(id, { description: v }),
            onBlur: () => setIsEditing(false),
            onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setIsEditing(false); } },
            placeholder: 'Escribe aquí…',
          } : undefined}
        />
      </div>
      </div>
    </div>
  );
};

export default memo(TextAnnotationNode);
