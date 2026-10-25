import { memo, useRef, useState } from 'react';
import type { NodeProps } from 'reactflow';
import ResizeHandles from './ResizeHandles';
import { useUI } from '../../store/useUI';
import { Image, Upload, Trash2, Crop, Check, Shapes } from 'lucide-react';
import type { NodeData, ImageShape, ImageStyle } from '../../types/store';
import { useStore } from '../../store/useStore';
import { useUIMode } from '../../lib/useMedia';
import { STAR_CLIP, HEART_PATH } from '../../lib/imageShapes';

/** Orden del ciclo al hacer clic sobre una imagen ya seleccionada. */
const IMAGE_SHAPES: ImageShape[] = ['square', 'rounded', 'circle', 'star', 'heart'];

const SHAPE_LABEL: Record<ImageShape, string> = {
  square: 'Cuadrado',
  rounded: 'Cuadrado redondeado',
  circle: 'Círculo',
  star: 'Estrella',
  heart: 'Corazón',
};

const shapeBoxStyle = (shape: ImageShape, clipId: string): React.CSSProperties => {
  switch (shape) {
    case 'square': return { borderRadius: 0 };
    case 'rounded': return { borderRadius: '18%' };
    case 'circle': return { borderRadius: '50%' };
    case 'star': return { clipPath: STAR_CLIP };
    case 'heart': return { clipPath: `url(#${clipId})` };
  }
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const ImageAnnotationNode = ({ id, data, selected, xPos, yPos }: NodeProps<NodeData>) => {
  const { updateNodeData, removeNode } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropMode, setCropMode] = useState(false);
  // Con el editor táctil abierto, arrastrar la foto la encuadra directamente
  const studioOpen = useUI(st => st.studioId === id);
  const crop = cropMode || studioOpen;
  const panRef = useRef<null | { x: number; y: number; ox: number; oy: number }>(null);

  const imageUrl = data.mediaReferences?.primaryAvatarPath;
  const w = data.visualDimensions?.width || 200;
  const h = data.visualDimensions?.height || 200;

  const style: ImageStyle = data.imageStyle || {};
  const shape: ImageShape = style.shape || 'rounded';
  const zoom = style.zoom ?? 1;
  const offsetX = style.offsetX ?? 0;
  const offsetY = style.offsetY ?? 0;
  const rotation = data.rotation || 0;
  const clipId = `heart-clip-${id}`;
  const keepAspect = shape === 'circle' || shape === 'star' || shape === 'heart';

  const touchUI = useUIMode() !== 'desktop';
  const patchStyle = (patch: Partial<ImageStyle>, history = true) =>
    updateNodeData(id, { imageStyle: { ...style, ...patch } }, { history });

  const cycleShape = () => {
    const next = IMAGE_SHAPES[(IMAGE_SHAPES.indexOf(shape) + 1) % IMAGE_SHAPES.length];
    patchStyle({ shape: next });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateNodeData(id, {
        mediaReferences: { primaryAvatarPath: dataUrl },
        imageStyle: { ...style, zoom: 1, offsetX: 0, offsetY: 0 }
      });
    };
    reader.readAsDataURL(file);
  };

  // --- Recorte no destructivo: arrastrar para encuadrar, deslizador para zoom ---
  const maxOffset = (z: number) => ((z - 1) * 100) / 2;

  const onPanDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!crop) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
    useStore.getState().pushSnapshot();
  };
  const onPanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (!p || !crop) return;
    const m = maxOffset(zoom);
    const nx = clamp(p.ox + ((e.clientX - p.x) / w) * 100, -m, m);
    const ny = clamp(p.oy + ((e.clientY - p.y) / h) * 100, -m, m);
    patchStyle({ offsetX: Math.round(nx * 10) / 10, offsetY: Math.round(ny * 10) / 10 }, false);
  };
  const onPanUp = (e: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const changeZoom = (z: number) => {
    const m = maxOffset(z);
    patchStyle({ zoom: z, offsetX: clamp(offsetX, -m, m), offsetY: clamp(offsetY, -m, m) });
  };

  return (
    <div className="relative group select-none">
    {imageUrl && selected && !touchUI && (
      <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm px-1.5 py-1 rounded-xl nodrag nopan z-50 text-white whitespace-nowrap">
        <button
          type="button"
          onClick={cycleShape}
          className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-white/15 text-[11px] font-bold"
          title="Cambiar forma (también: clic sobre la imagen)"
        >
          <Shapes size={14} /> {SHAPE_LABEL[shape]}
        </button>
        <button
          type="button"
          onClick={() => setCropMode(v => !v)}
          className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] font-bold ${cropMode ? 'bg-indigo-500' : 'hover:bg-white/15'}`}
          title="Recortar / encuadrar"
        >
          {cropMode ? <Check size={14} /> : <Crop size={14} />} {cropMode ? 'Listo' : 'Recortar'}
        </button>
        {cropMode && (
          <input
            type="range" min={1} max={3} step={0.05}
            value={zoom}
            onChange={e => changeZoom(parseFloat(e.target.value))}
            className="w-24 accent-indigo-400"
            title="Zoom"
          />
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1 rounded-lg hover:bg-white/15"
          title="Cambiar imagen"
        >
          <Upload size={14} />
        </button>
        <button
          type="button"
          onClick={() => removeNode(id)}
          className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/10"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    )}
      <div className="relative" style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center' }}>
      <ResizeHandles id={id} xPos={xPos} yPos={yPos} mode={keepAspect ? 'uniform' : 'free'} rotation={rotation} rotatable visible={selected && !crop} minW={60} minH={60} />

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload} 
      />

      {/* Defs del corazón (clipPath en unidades de caja) */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={HEART_PATH} />
          </clipPath>
        </defs>
      </svg>

      {imageUrl ? (
        <>
          {/* La sombra va en el contenedor: el clip-path del hijo recortaría un box-shadow */}
          <div style={{ width: `${w}px`, height: `${h}px`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))' }}>
            <div
              className={`relative w-full h-full overflow-hidden bg-white ${crop ? 'nodrag nopan touch-none' : ''}`}
              style={shapeBoxStyle(shape, clipId)}
              onClick={() => { if (selected && !crop && !touchUI) cycleShape(); }}
              onPointerDown={onPanDown}
              onPointerMove={onPanMove}
              onPointerUp={onPanUp}
              onPointerCancel={onPanUp}
            >
              <img 
                src={imageUrl} 
                alt="Sticker" 
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
                style={{ transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-white/80 backdrop-blur flex flex-col items-center justify-center p-4 text-center transition-all hover:bg-indigo-50/50 shadow-sm"
          style={{ width: `${w}px`, height: `${h}px` }}
        >
          <Image size={32} className="text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" />
          <span className="text-xs font-bold text-gray-600">Subir Imagen / Sticker</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Click para seleccionar</span>
        </div>
      )}
      </div>
    </div>
  );
};

export default memo(ImageAnnotationNode);
