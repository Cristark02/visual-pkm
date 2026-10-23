import { memo, useState, useRef, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import ResizeHandles from './ResizeHandles';
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

const TextAnnotationNode = ({ id, data, selected, xPos, yPos }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
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

  // Mientras se escribe, el texto es local (no depende de la ida y vuelta por el store y React Flow,
  // que perdía letras al teclear rápido); se vuelca al documento en cada pulsación.
  const [draft, setDraft] = useState(text);
  const [prevEditing, setPrevEditing] = useState(false);
  if (editing !== prevEditing) { setPrevEditing(editing); if (editing) setDraft(text); }
  const shown = editing ? draft : text;

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

  const activeFont = textFont(fontFamily);
  const showToolbar = !touchUI && (selected || hovered || isEditing);
  const isEmpty = text.trim() === '' && !editing;

  const containerStyle: React.CSSProperties = showBackground
    ? {
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textShadow: effectShadow(textEffect, true),
        borderRadius: roundShape ? '0.9em' : '0.4em',
        padding: roundShape ? '0.5em 0.9em' : '0.6em 0.8em',
      }
    : {
        backgroundColor: 'transparent',
        color: textColor,
        textShadow: effectShadow(textEffect, false),
        padding: '0.4em',
        // Texto vacío sin fondo: solo un contorno tenue mientras se interactúa, para poder encontrarlo
        outline: isEmpty && (selected || hovered) ? '2px dashed rgba(99,102,241,0.5)' : undefined,
        borderRadius: '0.4em',
      };

  const btn = (active: boolean) =>
    `p-1 rounded-lg transition-colors ${active ? 'bg-white/25' : 'hover:bg-white/15'}`;

  return (
    <div 
      className="relative group select-none"
      onDoubleClick={() => { if (!touchUI) setIsEditing(true); }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <ResizeHandles id={id} xPos={xPos} yPos={yPos} mode="font" fontSize={fontSize} visible={selected && !studioOpen && !isEditing} />

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

      {/* Texto: la caja se ajusta al contenido; al editar, el textarea se superpone con el mismo formato */}
      <div
        ref={boxRef}
        style={{ ...containerStyle, fontSize: `${fontSize}px`, lineHeight: 1.3, width: 'max-content', minWidth: '3em', ...activeFont.style }}
        className={`relative transition-[background-color,box-shadow] duration-200 ${activeFont.className}`}
      >
        <div
          className="whitespace-pre font-bold select-none"
          style={{ textAlign, minHeight: '1.3em', visibility: editing ? 'hidden' : 'visible' }}
        >
          {shown}{'\u200b'}
        </div>
        {editing && (
          <>
            {shown === '' && (
              <div className="absolute inset-0 whitespace-pre font-bold opacity-40 pointer-events-none" style={{ padding: 'inherit', textAlign }}>Escribe aquí…</div>
            )}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); updateNodeData(id, { description: e.target.value }); }}
              onBlur={() => { if (!studioOpen) setIsEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !studioOpen) {
                  e.preventDefault();
                  setIsEditing(false);
                }
              }}
              wrap="off"
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none overflow-hidden nodrag nopan whitespace-pre font-bold"
              style={{ padding: 'inherit', textAlign, color: textColor, fontSize: 'inherit', lineHeight: 'inherit', textShadow: 'inherit', fontFamily: 'inherit' }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default memo(TextAnnotationNode);
