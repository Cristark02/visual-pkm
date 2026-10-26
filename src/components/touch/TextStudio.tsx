import { memo, useEffect, useRef, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Square } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { TEXT_FONTS, TEXT_EFFECTS } from '../../lib/textFonts';
import TextBlock, { focusEnd } from '../TextBlock';
import type { NodeData } from '../../types/store';

/**
 * Editor de texto a pantalla completa, con el tacto de las historias de Instagram:
 *  - escenario oscuro y el texto centrado, editable, con su fondo por línea;
 *  - barra fina a la izquierda para el tamaño (se ve en vivo);
 *  - fila de opciones y barra de herramientas justo encima del teclado.
 * El texto se guarda en vivo; "Listo" solo cierra. Luego se coloca, escala y gira en el lienzo.
 */
const PALETTE = ['#ffffff', '#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
const EFFECTS = TEXT_EFFECTS;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Tool = 'font' | 'color' | 'effect';
type SC = NonNullable<NodeData['styleConfig']>;

const TextStudio = ({ id }: { id: string }) => {
  const flow = useReactFlow();
  const closeStudio = useUI(s => s.closeStudio);
  const showToast = useUI(s => s.showToast);
  const node = useStore(s => s.nodes.find(n => n.id === id));
  const updateNodeData = useStore(s => s.updateNodeData);
  const [tool, setTool] = useState<Tool>('font');
  const [colorTarget, setColorTarget] = useState<'text' | 'bg'>('text');
  const [draft, setDraft] = useState('');
  const [ready, setReady] = useState(false);
  const scaleRef = useRef(1); // px de pantalla por unidad de flujo en el escenario
  const maxPx = useRef(320);
  const taRef = useRef<HTMLElement | null>(null);
  const [kb, setKb] = useState(0);
  const [panelH, setPanelH] = useState(150);
  const panelRef = useRef<HTMLDivElement>(null);

  // Apertura: tamaño inicial legible, ancho de línea = ancho de pantalla, texto de relleno fuera
  useEffect(() => {
    const n = useStore.getState().nodes.find(x => x.id === id);
    if (!n) return;
    const sc = n.data.styleConfig || {};
    const zoom = flow.getZoom() || 1;
    const isNew = n.data.description === 'Texto...';
    const fs = isNew ? clamp(30 / zoom, 6, 800) : (sc.fontSize || 20);
    const px0 = clamp(fs * zoom, 26, 72);
    scaleRef.current = px0 / fs;
    maxPx.current = Math.round(window.innerWidth * 0.8);
    const description = isNew ? '' : (n.data.description ?? '');
    setDraft(description);
    updateNodeData(id, {
      ...(isNew ? { description: '' } : {}),
      styleConfig: { ...sc, fontSize: fs, wrapEm: Math.round((maxPx.current / px0) * 100) / 100 },
    }, { history: false });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Teclado (iOS reduce solo el viewport visual) y altura del panel inferior
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const f = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    f();
    vv.addEventListener('resize', f); vv.addEventListener('scroll', f);
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f); };
  }, []);
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    document.documentElement.classList.add('studio-open');
    return () => document.documentElement.classList.remove('studio-open');
  }, []);

  // Foco (y reintento: el toque que abrió el editor puede robarlo justo después)
  useEffect(() => {
    if (!ready) return;
    const t0 = setTimeout(() => focusEnd(taRef.current), 30);
    const t = setTimeout(() => { if (document.activeElement !== taRef.current) focusEnd(taRef.current); }, 280);
    return () => { clearTimeout(t0); clearTimeout(t); };
  }, [ready]);

  if (!node || !ready) return null;
  const data = node.data as NodeData;
  const sc: SC = data.styleConfig || {};
  const fs = sc.fontSize || 20;
  const px = fs * scaleRef.current;
  const showBg = sc.showBackground !== false && (sc.highlightStyle || 'pill') !== 'transparent';
  const round = (sc.highlightStyle || 'pill') !== 'solid';
  const align = sc.textAlign || 'center';

  const patch = (p: Partial<SC>) => updateNodeData(id, { styleConfig: { ...sc, ...p } });
  const setSize = (pxv: number) => patch({ fontSize: Math.round((pxv / scaleRef.current) * 10) / 10, wrapEm: Math.round((maxPx.current / pxv) * 100) / 100 });

  const finish = () => {
    if (!(data.description ?? '').trim()) useStore.getState().removeNode(id);
    closeStudio();
  };
  const remove = () => { useStore.getState().removeNode(id); closeStudio(); showToast('Eliminado', true); };

  const cycleBg = () => {
    // ninguno → fondo redondeado → fondo recto → ninguno
    if (!showBg) patch({ showBackground: true, highlightStyle: 'pill' });
    else if (round) patch({ highlightStyle: 'solid' });
    else patch({ showBackground: false });
  };
  const cycleAlign = () => patch({ textAlign: align === 'center' ? 'left' : align === 'left' ? 'right' : 'center' });
  const AlignIcon = align === 'left' ? AlignLeft : align === 'right' ? AlignRight : AlignCenter;

  const toolBtn = (active: boolean) =>
    `flex-1 min-h-[48px] rounded-xl flex items-center justify-center select-none active:scale-95 transition ${active ? 'bg-white/25' : ''}`;
  const chip = (active: boolean) =>
    `shrink-0 min-h-[40px] px-4 rounded-xl text-[15px] font-semibold whitespace-nowrap select-none active:scale-95 transition border ${active ? 'bg-white text-gray-900 border-white' : 'bg-transparent text-white border-white/45'}`;

  return (
    <div className="fixed inset-0 z-[70] bg-[#2b2b2b] text-white select-none" data-studio data-text-studio style={{ background: 'radial-gradient(120% 90% at 50% 20%, #4a4a48 0%, #2a2a2a 70%)' }}>
      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4" style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
        <button type="button" onClick={remove} aria-label="Eliminar" className="min-w-[44px] min-h-[44px] flex items-center justify-start text-white/70 active:scale-95">
          <Trash2 size={22} />
        </button>
        <button type="button" onClick={finish} className="min-h-[44px] px-2 text-[17px] font-bold active:scale-95">Listo</button>
      </div>

      {/* Tamaño: línea fina con un botón redondo */}
      <input
        type="range" min={12} max={160} step={1} value={Math.round(clamp(px, 12, 160))}
        onChange={e => setSize(Number(e.target.value))}
        aria-label="Tamaño"
        className="ig-range"
        style={{ position: 'absolute', left: 6, top: 96, height: 'min(38vh, 420px)', zIndex: 5 }}
      />

      {/* Escenario: el texto, centrado */}
      <div className="absolute left-0 right-0 flex items-center justify-center overflow-hidden" style={{ top: 56, bottom: kb + panelH }} onPointerDown={(e) => { if (e.target === e.currentTarget) focusEnd(taRef.current); }}>
        <TextBlock
          text={draft}
          sc={sc}
          fontPx={px}
          edit={{
            editRef: taRef,
            onChange: (v) => { setDraft(v); updateNodeData(id, { description: v }); },
            placeholder: 'Escribe aquí…',
          }}
        />
      </div>

      {/* Opciones + herramientas, sobre el teclado */}
      <div ref={panelRef} data-bottom-ui className="absolute left-0 right-0 flex flex-col gap-2 pb-1" style={{ bottom: kb }}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3" style={{ touchAction: 'pan-x', minHeight: 44 }}>
          {tool === 'font' && TEXT_FONTS.map(f => (
            <button key={f.id} type="button" onClick={() => patch({ fontFamily: f.id })} className={`${chip((sc.fontFamily || 'sans') === f.id)} ${f.className}`} style={f.style}>
              {f.id === 'display' ? 'TITULAR' : f.name}
            </button>
          ))}
          {tool === 'color' && (
            <>
              <button type="button" onClick={() => setColorTarget('text')} className={chip(colorTarget === 'text' || !showBg)}>Texto</button>
              {showBg && <button type="button" onClick={() => setColorTarget('bg')} className={chip(colorTarget === 'bg')}>Fondo</button>}
              {PALETTE.map(c => (
                <button
                  key={c} type="button" aria-label={`Color ${c}`}
                  onClick={() => (colorTarget === 'bg' && showBg ? patch({ bgColor: c }) : patch({ textColor: c }))}
                  className="shrink-0 w-9 h-9 rounded-full border-2 border-white/60 active:scale-90 transition"
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="shrink-0 w-9 h-9 rounded-full border-2 border-white/60 overflow-hidden relative" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}>
                <input type="color" className="absolute inset-0 opacity-0 w-full h-full" aria-label="Color personalizado"
                  value={(colorTarget === 'bg' && showBg ? sc.bgColor : sc.textColor) || '#000000'}
                  onChange={e => (colorTarget === 'bg' && showBg ? patch({ bgColor: e.target.value }) : patch({ textColor: e.target.value }))} />
              </label>
            </>
          )}
          {tool === 'effect' && EFFECTS.map(e => (
            <button key={e.id} type="button" onClick={() => patch({ textEffect: e.id })} className={chip((sc.textEffect ?? (showBg ? 'none' : 'shadow')) === e.id)}>{e.label}</button>
          ))}
        </div>

        <div className="mx-2 flex items-center gap-1 rounded-2xl bg-black/45 px-1.5 py-1.5">
          <button type="button" aria-label="Tipografía" onClick={() => setTool('font')} className={toolBtn(tool === 'font')}><span className="text-[22px] font-bold leading-none">Aa</span></button>
          <button type="button" aria-label="Color" onClick={() => setTool('color')} className={toolBtn(tool === 'color')}>
            <span className="w-7 h-7 rounded-full border-2 border-white" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
          </button>
          <button type="button" aria-label="Fondo" onClick={cycleBg} className={toolBtn(false)}>
            <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[15px] font-black ${showBg ? 'bg-white text-gray-900' : 'border-2 border-white text-white'}`} style={{ borderRadius: showBg && !round ? 3 : undefined }}>
              {showBg ? 'A' : <Square size={0} />}{!showBg && 'A'}
            </span>
          </button>
          <button type="button" aria-label="Alinear" onClick={cycleAlign} className={toolBtn(false)}><AlignIcon size={24} /></button>
          <button type="button" aria-label="Efectos" onClick={() => setTool('effect')} className={toolBtn(tool === 'effect')}><span className="text-[20px] font-black leading-none" style={{ textShadow: '0 0 8px #fff' }}>A✦</span></button>
        </div>
      </div>
    </div>
  );
};

export default memo(TextStudio);
