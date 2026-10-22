import { memo, useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import {
  Plus, Filter, BoxSelect, Maximize, UserPlus, FolderPlus, Type, Image as ImageIcon, MoveUpRight,
  Link2, Pencil, Trash2, X, Check, Minus,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { placeNode } from '../../lib/placeNode';
import type { NodeType } from '../../types/store';
import type { UIMode } from '../../lib/useMedia';

interface DockProps {
  mode: Exclude<UIMode, 'desktop'>;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
}

const ADD_TILES: { type: NodeType; label: string; icon: typeof Plus; color: string }[] = [
  { type: 'individual', label: 'Persona', icon: UserPlus, color: 'bg-blue-50 text-blue-600' },
  { type: 'cluster', label: 'Grupo', icon: FolderPlus, color: 'bg-purple-50 text-purple-600' },
  { type: 'textAnnotation', label: 'Texto', icon: Type, color: 'bg-pink-50 text-pink-600' },
  { type: 'imageAnnotation', label: 'Imagen', icon: ImageIcon, color: 'bg-emerald-50 text-emerald-600' },
  { type: 'arrowAnnotation', label: 'Flecha', icon: MoveUpRight, color: 'bg-amber-50 text-amber-600' },
];

const TYPE_LABEL: Record<string, string> = {
  individual: 'Persona', cluster: 'Grupo', textAnnotation: 'Texto', imageAnnotation: 'Imagen', arrowAnnotation: 'Flecha',
};

const actionBtn =
  'min-h-[44px] px-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform select-none';

/**
 * Barra inferior táctil (móvil y tablet), inspirada en los editores móviles tipo Canva:
 *  - dock fijo con las herramientas principales,
 *  - barra contextual sobre el dock con las acciones del elemento seleccionado,
 *  - hoja "Añadir" con mosaicos grandes,
 *  - avisos con "Deshacer".
 */
const Dock = ({ mode, isFilterOpen, onToggleFilter }: DockProps) => {
  const flow = useReactFlow();
  const { nodes, edges, selectedEntityId, selectedEntityType } = useStore();
  const {
    multiSelect, setMultiSelect, connectFrom, setConnectFrom, sheet, setSheet,
    addSheetOpen, setAddSheetOpen, selectedIds, toast, hideToast, showToast,
  } = useUI();

  const entity = useMemo(() => {
    if (!selectedEntityId) return null;
    if (selectedEntityType === 'edge') return edges.find(e => e.id === selectedEntityId) ?? null;
    return nodes.find(n => n.id === selectedEntityId) ?? null;
  }, [selectedEntityId, selectedEntityType, nodes, edges]);

  const isEdge = selectedEntityType === 'edge';
  const node = !isEdge ? (entity as typeof nodes[number] | null) : null;
  const isIndividual = node?.type === 'individual';
  const edgeData = isEdge ? (entity as typeof edges[number] | null)?.data : undefined;
  const isCurved = !!(edgeData?.controlPoints || edgeData?.curvature);

  const personName = (n?: typeof nodes[number] | null) =>
    n ? (n.data.identity?.alias || n.data.identity?.givenName || n.data.semanticLabel || 'Persona') : '';

  const label = isEdge
    ? 'Vínculo'
    : node ? (node.type === 'individual' ? personName(node) : (node.type === 'cluster' ? (node.data.semanticLabel || 'Grupo') : TYPE_LABEL[node.type])) : '';
  const kind = isEdge ? 'Relación' : node ? TYPE_LABEL[node.type] : '';

  const deleteSelected = () => {
    if (!selectedEntityId) return;
    if (isEdge) useStore.getState().removeEdge(selectedEntityId);
    else useStore.getState().removeNode(selectedEntityId);
    setSheet('closed');
    showToast('Eliminado', true);
  };

  const deleteMany = () => {
    const n = selectedIds.length;
    useStore.getState().removeNodes(selectedIds);
    setMultiSelect(false);
    showToast(`${n} elementos eliminados`, true);
  };

  const startConnect = () => {
    if (!node) return;
    setSheet('closed');
    setConnectFrom(node.id);
  };

  const straighten = () => {
    if (!selectedEntityId || !edgeData) return;
    useStore.getState().updateEdgeData(selectedEntityId, { data: { ...edgeData, curvature: 0, controlPoints: undefined } });
  };

  const connectSource = connectFrom ? nodes.find(n => n.id === connectFrom) : null;

  // ---- Barra contextual ----
  let context: React.ReactNode = null;
  if (connectFrom) {
    context = (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Conectar</div>
          <div className="text-sm font-bold text-gray-800 leading-tight">Toca a la persona que quieres unir con {personName(connectSource)}</div>
        </div>
        <button type="button" onClick={() => setConnectFrom(null)} className={`${actionBtn} bg-gray-100 text-gray-700`}>
          <X size={18} /> Cancelar
        </button>
      </div>
    );
  } else if (multiSelect) {
    context = (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Selección múltiple</div>
          <div className="text-sm font-bold text-gray-800 leading-tight">
            {selectedIds.length === 0 ? 'Toca nodos o arrastra para encuadrarlos' : `${selectedIds.length} seleccionado${selectedIds.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {selectedIds.length > 0 && (
          <button type="button" onClick={deleteMany} className={`${actionBtn} bg-red-50 text-red-600`} aria-label="Eliminar selección">
            <Trash2 size={18} />
          </button>
        )}
        <button type="button" onClick={() => setMultiSelect(false)} className={`${actionBtn} bg-indigo-600 text-white`}>
          <Check size={18} /> Listo
        </button>
      </div>
    );
  } else if (entity) {
    context = (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 pr-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">{kind}</div>
          <div className="text-sm font-bold text-gray-800 truncate">{label}</div>
        </div>
        {mode === 'phone' && (node?.type === 'individual' || node?.type === 'cluster' || isEdge) && (
          <button type="button" onClick={() => setSheet(sheet === 'closed' ? 'half' : 'closed')} className={`${actionBtn} bg-indigo-600 text-white`}>
            <Pencil size={17} /> Editar
          </button>
        )}
        {isIndividual && (
          <button type="button" onClick={startConnect} className={`${actionBtn} bg-indigo-50 text-indigo-700`}>
            <Link2 size={17} /> Conectar
          </button>
        )}
        {isEdge && isCurved && (
          <button type="button" onClick={straighten} className={`${actionBtn} bg-gray-100 text-gray-700`}>
            <Minus size={17} /> Enderezar
          </button>
        )}
        <button type="button" onClick={deleteSelected} className={`${actionBtn} bg-red-50 text-red-600 px-3`} aria-label="Eliminar">
          <Trash2 size={18} />
        </button>
        <button type="button" onClick={() => { useStore.getState().setSelectedEntity(null, null); setSheet('closed'); }} className={`${actionBtn} text-gray-400 px-2`} aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>
    );
  }

  const dockItem = (active: boolean) =>
    `flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold select-none active:scale-95 transition-all ${
      active ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600'
    }`;

  return (
    <>
      {/* Fondo para cerrar la hoja "Añadir" */}
      {addSheetOpen && <div className="absolute inset-0 z-40" onClick={() => setAddSheetOpen(false)} />}

      <div
        data-bottom-ui
        className="absolute left-0 right-0 bottom-0 z-50 flex flex-col items-stretch gap-2 px-2 pointer-events-none"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {/* Aviso con Deshacer */}
        {toast && (
          <div className="self-center pointer-events-auto bg-gray-900 text-white rounded-2xl pl-4 pr-1 py-1 flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="text-sm font-semibold">{toast.message}</span>
            {toast.canUndo && (
              <button
                type="button"
                onClick={() => { useStore.getState().undo(); hideToast(); }}
                className="min-h-[44px] px-3 text-sm font-bold text-indigo-300 active:scale-95"
              >
                Deshacer
              </button>
            )}
          </div>
        )}

        {/* Hoja "Añadir" */}
        {addSheetOpen && (
          <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 pb-2">Añadir al lienzo</div>
            <div className="grid grid-cols-5 gap-2">
              {ADD_TILES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => { placeNode(t.type); setAddSheetOpen(false); setMultiSelect(false); }}
                    className="flex flex-col items-center gap-1.5 py-2 rounded-2xl active:scale-95 transition-transform select-none"
                  >
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${t.color}`}><Icon size={26} /></span>
                    <span className="text-[11px] font-bold text-gray-700">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra contextual */}
        {context && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100 px-3 py-2">
            {context}
          </div>
        )}

        {/* Dock */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100 p-1.5 flex items-stretch gap-1">
          <button
            type="button"
            onClick={() => setAddSheetOpen(!addSheetOpen)}
            className="flex-[1.25] min-h-[56px] flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-indigo-600 text-white text-[11px] font-bold shadow-md active:scale-95 transition-transform select-none"
            aria-label="Añadir"
          >
            <Plus size={22} strokeWidth={2.5} />
            Añadir
          </button>
          <button type="button" onClick={onToggleFilter} className={dockItem(isFilterOpen)} aria-label="Filtros">
            <Filter size={20} />
            Filtros
          </button>
          <button
            type="button"
            onClick={() => { setMultiSelect(!multiSelect); setConnectFrom(null); setAddSheetOpen(false); }}
            className={dockItem(multiSelect)}
            aria-label="Selección múltiple"
          >
            <BoxSelect size={20} />
            Varios
          </button>
          <button type="button" onClick={() => flow.fitView({ duration: 350, padding: 0.2 })} className={dockItem(false)} aria-label="Ajustar vista">
            <Maximize size={20} />
            Vista
          </button>
        </div>
      </div>
    </>
  );
};

export default memo(Dock);
