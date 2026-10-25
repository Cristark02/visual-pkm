import { memo, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useReactFlow } from 'reactflow';
import {
  AlignLeft, AlignCenter, AlignRight, Trash2, PaintBucket, Square, RectangleHorizontal, ImagePlus,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { TEXT_FONTS } from '../../lib/textFonts';
import { entityRect } from '../../lib/viewport';
import TextStudio from './TextStudio';
import type { ArrowStyle, ImageShape, NodeData } from '../../types/store';

/**
 * Editor táctil a pantalla completa para textos, fotos y flechas (estilo "historias"):
 *  1. Se oscurece solo el fondo; el elemento que editas sigue a la vista, centrado sobre las opciones.
 *  2. Las opciones van encima del teclado y una barra lateral ajusta el tamaño.
 *  3. "Listo" lo cierra; después se coloca/rota/mueve con los gestos normales y,
 *     al tocar el elemento, se vuelve a abrir este editor.
 */

const PALETTE = ['#ffffff', '#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
const SHAPES: { id: ImageShape; label: string }[] = [
  { id: 'square', label: 'Cuadrada' }, { id: 'rounded', label: 'Redondeada' }, { id: 'circle', label: 'Círculo' },
  { id: 'star', label: 'Estrella' }, { id: 'heart', label: 'Corazón' },
];
const EFFECTS = [
  { id: 'none', label: 'Ninguno' }, { id: 'shadow', label: 'Sombra' }, { id: 'outline', label: 'Contorno' }, { id: 'glow', label: 'Brillo' },
] as const;
const DASHES = [{ id: 'solid', label: 'Continua' }, { id: 'dashed', label: 'Rayas' }, { id: 'dotted', label: 'Puntos' }] as const;
const HEADS = [{ id: 'end', label: 'Punta' }, { id: 'both', label: 'Doble' }, { id: 'none', label: 'Sin punta' }] as const;

/** Altura que ocupa el teclado cuando solo reduce el viewport visual (iOS). En Android el layout ya se reduce. */
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const f = () => setOffset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    f();
    vv.addEventListener('resize', f);
    vv.addEventListener('scroll', f);
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f); };
  }, []);
  return offset;
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1" style={{ touchAction: 'pan-x' }}>{children}</div>
);

const Chip = ({ active, onClick, children, style, className = '' }: { active?: boolean; onClick: () => void; children: ReactNode; style?: React.CSSProperties; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    style={style}
    className={`shrink-0 min-h-[40px] px-3.5 rounded-full text-sm font-bold whitespace-nowrap select-none active:scale-95 transition ${active ? 'bg-white text-gray-900' : 'bg-white/15 text-white'} ${className}`}
  >
    {children}
  </button>
);

const Swatches = ({ value, onPick }: { value?: string; onPick: (c: string) => void }) => (
  <>
    {PALETTE.map(c => (
      <button
        key={c}
        type="button"
        aria-label={`Color ${c}`}
        onClick={() => onPick(c)}
        className={`shrink-0 w-9 h-9 rounded-full border-2 active:scale-90 transition ${value?.toLowerCase() === c ? 'border-white ring-2 ring-indigo-400' : 'border-white/40'}`}
        style={{ backgroundColor: c }}
      />
    ))}
    <label className="shrink-0 w-9 h-9 rounded-full border-2 border-white/40 overflow-hidden relative" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
      <input type="color" value={value || '#000000'} onChange={e => onPick(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full" aria-label="Color personalizado" />
    </label>
  </>
);

const Studio = () => {
  const flow = useReactFlow();
  const studioId = useUI(s => s.studioId);
  const closeStudio = useUI(s => s.closeStudio);
  const showToast = useUI(s => s.showToast);
  const node = useStore(s => s.nodes.find(n => n.id === studioId));
  const updateNodeData = useStore(s => s.updateNodeData);
  const kb = useKeyboardOffset();
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [colorTarget, setColorTarget] = useState<'text' | 'bg'>('text');

  // Oscurece el fondo mientras el editor está abierto
  useEffect(() => {
    if (!studioId) return;
    document.documentElement.classList.add('studio-open');
    return () => document.documentElement.classList.remove('studio-open');
  }, [studioId]);

  // Centra el elemento en el hueco visible entre la cabecera y el panel de opciones
  const exists = !!node;
  useEffect(() => {
    if (!studioId || !exists) return;
    const t = setTimeout(() => {
      const st = useStore.getState();
      const r = entityRect(studioId, 'node', st.nodes, st.edges);
      const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!r || !pane || !panel) return;
      const top = pane.top + 56;
      const bottom = panel.top - 12;
      if (bottom - top < 60) return;
      const vp = flow.getViewport();
      const z = vp.zoom || 1;
      flow.setViewport({
        x: (pane.left + pane.right) / 2 - pane.left - (r.x + r.w / 2) * z,
        y: (top + bottom) / 2 - pane.top - (r.y + r.h / 2) * z,
        zoom: z,
      }, { duration: 280 });
    }, 320);
    return () => clearTimeout(t);
  }, [studioId, exists, kb, flow]);

  if (!studioId || !node) return null;
  if (node.type === 'textAnnotation') return <TextStudio key={node.id} id={node.id} />;
  const id = node.id;
  const data = node.data as NodeData;
  const type: string = node.type;

  const patchData = (p: Partial<NodeData>) => updateNodeData(id, p);
  const sc = data.styleConfig || {};
  const patchSC = (p: Partial<NonNullable<NodeData['styleConfig']>>) => patchData({ styleConfig: { ...sc, ...p } });
  const ast: ArrowStyle = data.arrowStyle || {};
  const patchArrow = (p: Partial<ArrowStyle>) => {
    const next = { ...ast, ...p };
    updateNodeData(id, { arrowStyle: next, visualDimensions: { width: Math.round(next.length ?? 160), height: 24 } });
  };
  const ist = data.imageStyle || {};
  const imageUrl = data.mediaReferences?.primaryAvatarPath;
  const dims = { w: data.visualDimensions?.width ?? 200, h: data.visualDimensions?.height ?? 200 };

  const finish = () => {
    if (type === 'textAnnotation' && !(data.description ?? '').trim()) useStore.getState().removeNode(id);
    closeStudio();
  };
  const remove = () => {
    useStore.getState().removeNode(id);
    closeStudio();
    showToast('Eliminado', true);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchData({ mediaReferences: { primaryAvatarPath: reader.result as string }, imageStyle: { ...ist, zoom: 1, offsetX: 0, offsetY: 0 } });
    reader.readAsDataURL(file);
  };

  const showBg = sc.showBackground !== false && (sc.highlightStyle || 'pill') !== 'transparent';
  const roundShape = (sc.highlightStyle || 'pill') !== 'solid';

  // ---- Barra lateral de tamaño ----
  let side: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void } | null = null;
  if (type === 'textAnnotation') {
    side = { label: 'Aa', value: sc.fontSize || 20, min: 10, max: 120, step: 1, onChange: v => patchSC({ fontSize: v }) };
  } else if (type === 'imageAnnotation' && imageUrl) {
    side = {
      label: 'Tam.', value: Math.round(dims.w), min: 60, max: 700, step: 5,
      onChange: v => patchData({ visualDimensions: { width: v, height: Math.round(v * (dims.h / (dims.w || 1))) } }),
    };
  } else if (type === 'arrowAnnotation') {
    side = { label: 'Grosor', value: ast.thickness ?? 4, min: 1, max: 24, step: 1, onChange: v => patchArrow({ thickness: v }) };
  }

  const title = type === 'textAnnotation' ? 'Texto' : type === 'imageAnnotation' ? 'Foto' : 'Flecha';

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none" data-studio>
      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-auto bg-black/55 backdrop-blur-sm" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))', paddingBottom: 6 }}>
        <button type="button" onClick={remove} aria-label="Eliminar" className="min-w-[44px] min-h-[44px] flex items-center justify-start text-white/75 active:scale-95">
          <Trash2 size={22} />
        </button>
        <span className="text-white/80 font-semibold text-sm tracking-wide">{title}</span>
        <button type="button" onClick={finish} className="min-h-[44px] px-2 text-[17px] font-bold text-white active:scale-95">Listo</button>
      </div>

      {/* Barra lateral de tamaño */}
      {side && (
        <input
          type="range" min={side.min} max={side.max} step={side.step} value={side.value}
          onChange={e => side!.onChange(Number(e.target.value))}
          aria-label="Tamaño" className="ig-range pointer-events-auto" data-studio-side
          style={{ position: 'absolute', left: 6, top: 96, height: 'min(32vh, 260px)', zIndex: 5 }}
        />
      )}

      {/* Opciones, encima del teclado */}
      <div
        ref={panelRef}
        data-bottom-ui
        className="absolute left-0 right-0 pointer-events-auto bg-gray-900/92 backdrop-blur-md text-white rounded-t-3xl px-3 pt-3 flex flex-col gap-2 shadow-2xl"
        style={{ bottom: kb, paddingBottom: 'max(12px, env(safe-area-inset-bottom))', backgroundColor: 'rgba(17,24,39,0.94)' }}
      >
        {type === 'textAnnotation' && (
          <>
            <Row>
              {TEXT_FONTS.map(f => (
                <Chip key={f.id} active={(sc.fontFamily || 'sans') === f.id} onClick={() => patchSC({ fontFamily: f.id })} className={f.className} style={f.style}>
                  {f.id === 'display' ? 'TITULAR' : f.name}
                </Chip>
              ))}
            </Row>
            <Row>
              {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                <Chip key={a} active={(sc.textAlign || 'center') === a} onClick={() => patchSC({ textAlign: a })}><Icon size={18} /></Chip>
              ))}
              <span className="w-px h-6 bg-white/25 shrink-0" />
              <Chip
                active={showBg}
                onClick={() => {
                  if (showBg) { patchSC({ showBackground: false }); setColorTarget('text'); }
                  else patchSC({ showBackground: true, highlightStyle: (sc.highlightStyle || 'pill') === 'transparent' ? 'pill' : sc.highlightStyle });
                }}
              >
                <span className="flex items-center gap-1.5"><PaintBucket size={16} /> Fondo</span>
              </Chip>
              {showBg && (
                <Chip onClick={() => patchSC({ highlightStyle: roundShape ? 'solid' : 'pill' })}>
                  {roundShape ? <RectangleHorizontal size={18} /> : <Square size={18} />}
                </Chip>
              )}
              <span className="w-px h-6 bg-white/25 shrink-0" />
              {EFFECTS.map(e => (
                <Chip key={e.id} active={(sc.textEffect ?? (showBg ? 'none' : 'shadow')) === e.id} onClick={() => patchSC({ textEffect: e.id })}>{e.label}</Chip>
              ))}
            </Row>
            <Row>
              <Chip active={colorTarget === 'text'} onClick={() => setColorTarget('text')}>Texto</Chip>
              {showBg && <Chip active={colorTarget === 'bg'} onClick={() => setColorTarget('bg')}>Fondo</Chip>}
              <Swatches
                value={colorTarget === 'bg' && showBg ? (sc.bgColor || '#ffffff') : (sc.textColor || '#1e293b')}
                onPick={c => (colorTarget === 'bg' && showBg ? patchSC({ bgColor: c }) : patchSC({ textColor: c }))}
              />
            </Row>
          </>
        )}

        {type === 'imageAnnotation' && (
          <>
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={onFile} />
            <Row>
              <Chip onClick={() => fileRef.current?.click()} active={!imageUrl}><span className="flex items-center gap-1.5"><ImagePlus size={17} /> {imageUrl ? 'Cambiar foto' : 'Elegir foto'}</span></Chip>
              {SHAPES.map(s => (
                <Chip key={s.id} active={(ist.shape || 'rounded') === s.id} onClick={() => patchData({ imageStyle: { ...ist, shape: s.id } })}>{s.label}</Chip>
              ))}
            </Row>
            {imageUrl && (
              <div className="flex flex-col gap-0 px-1">
                <span className="text-[11px] text-gray-400">Arrastra la foto para elegir el encuadre</span>
              <div className="flex items-center gap-3 min-h-[44px]">
                <span className="text-xs font-bold text-gray-300 w-14">Zoom</span>
                <input
                  type="range" min={1} max={4} step={0.05} value={ist.zoom ?? 1}
                  onChange={e => {
                    const z = Number(e.target.value);
                    const m = ((z - 1) * 100) / 2;
                    patchData({ imageStyle: { ...ist, zoom: z, offsetX: Math.max(-m, Math.min(m, ist.offsetX ?? 0)), offsetY: Math.max(-m, Math.min(m, ist.offsetY ?? 0)) } });
                  }}
                  className="flex-1" style={{ accentColor: '#ffffff', height: 36 }} aria-label="Zoom de la foto"
                />
              </div>
              </div>
            )}
          </>
        )}

        {type === 'arrowAnnotation' && (
          <>
            <Row><Swatches value={ast.color || '#475569'} onPick={c => patchArrow({ color: c })} /></Row>
            <Row>
              {DASHES.map(d => <Chip key={d.id} active={(ast.dash || 'solid') === d.id} onClick={() => patchArrow({ dash: d.id })}>{d.label}</Chip>)}
              <span className="w-px h-6 bg-white/25 shrink-0" />
              {HEADS.map(h => <Chip key={h.id} active={(ast.head || 'end') === h.id} onClick={() => patchArrow({ head: h.id })}>{h.label}</Chip>)}
            </Row>
            <div className="flex items-center gap-3 px-1 min-h-[44px]">
              <span className="text-xs font-bold text-gray-300 w-14">Largo</span>
              <input
                type="range" min={30} max={800} step={5} value={ast.length ?? 160}
                onChange={e => patchArrow({ length: Number(e.target.value) })}
                className="flex-1" style={{ accentColor: '#ffffff', height: 36 }} aria-label="Largo"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(Studio);
