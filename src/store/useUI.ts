import { create } from 'zustand';

/**
 * Estado de interfaz (no forma parte del documento ni del historial):
 * herramientas táctiles, hojas inferiores, modo conectar y avisos.
 */
export type SheetState = 'closed' | 'half' | 'full';

interface Toast {
  id: number;
  message: string;
  canUndo: boolean;
}

interface UIState {
  /** Selección múltiple táctil: el dedo dibuja caja y los toques suman/restan. */
  multiSelect: boolean;
  setMultiSelect: (v: boolean) => void;

  /** Ids de los nodos seleccionados en el lienzo (selección de React Flow). */
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  /** Modo "Conectar": id de la persona de origen, a la espera de tocar el destino. */
  connectFrom: string | null;
  setConnectFrom: (id: string | null) => void;

  /** Hoja de propiedades (solo móvil). */
  sheet: SheetState;
  setSheet: (s: SheetState) => void;

  addSheetOpen: boolean;
  setAddSheetOpen: (v: boolean) => void;

  /** Editor táctil a pantalla completa (texto / foto / flecha): id del nodo que se edita. */
  studioId: string | null;
  openStudio: (id: string) => void;
  closeStudio: () => void;

  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;

  toast: Toast | null;
  showToast: (message: string, canUndo?: boolean) => void;
  hideToast: () => void;
}

let toastSeq = 0;

export const useUI = create<UIState>((set) => ({
  multiSelect: false,
  setMultiSelect: (v) => set({ multiSelect: v }),

  selectedIds: [],
  setSelectedIds: (ids) => set((s) => (s.selectedIds.length === ids.length && s.selectedIds.every((x, i) => x === ids[i]) ? s : { selectedIds: ids })),

  connectFrom: null,
  setConnectFrom: (id) => set({ connectFrom: id }),

  sheet: 'closed',
  setSheet: (s) => set({ sheet: s }),

  studioId: null,
  openStudio: (id) => set({ studioId: id, addSheetOpen: false, connectFrom: null, sheet: 'closed' }),
  closeStudio: () => set({ studioId: null }),

  addSheetOpen: false,
  setAddSheetOpen: (v) => set({ addSheetOpen: v }),

  menuOpen: false,
  setMenuOpen: (v) => set({ menuOpen: v }),

  toast: null,
  showToast: (message, canUndo = false) => {
    const id = ++toastSeq;
    set({ toast: { id, message, canUndo } });
    setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, 4500);
  },
  hideToast: () => set({ toast: null }),
}));
