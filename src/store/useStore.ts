import { create } from 'zustand';
import type { VisualPkmDocument, NodeModel, EdgeModel, DocumentMetadata, NodeType } from '../types/store';

export interface UpdateOpts {
  history?: boolean;
}

const MAX_HISTORY = 50;
const COALESCE_MS = 1000;
let lastCoalesceKey: string | null = null;
let lastCoalesceAt = 0;
const resetCoalescing = () => { lastCoalesceKey = null; lastCoalesceAt = 0; };

interface HistorySnapshot {
  nodes: NodeModel[];
  edges: EdgeModel[];
}

interface PKMState {
  documentVersion: string;
  metadata: DocumentMetadata | null;
  nodes: NodeModel[];
  edges: EdgeModel[];
  
  selectedEntityId: string | null;
  selectedEntityType: 'node' | 'edge' | null;

  // History (Undo / Redo)
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  /**
   * Guarda el estado actual en el historial. Con `coalesceKey`, llamadas consecutivas
   * con la misma clave dentro de COALESCE_MS se funden en un único paso (p. ej. teclear).
   */
  pushSnapshot: (coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  
  // Filter state
  /** null = filtro apagado (todo visible). [] = filtro activo sin categorías (todo atenuado). */
  activeFilterCategories: string[] | null;
  setActiveFilterCategories: (cats: string[] | null) => void;
  toggleFilterCategory: (cat: string) => void;
  selectAllFilterCategories: (allCats: string[]) => void;
  deselectAllFilterCategories: () => void;
  clearFilterCategories: () => void;

  // Actions
  loadDocument: (doc: VisualPkmDocument) => void;
  clearDocument: () => void;
  setSelectedEntity: (id: string | null, type: 'node' | 'edge' | null) => void;
  
  addNode: (type: NodeType, position?: { x: number, y: number }) => void;
  addEdge: (source: string, target: string) => void;
  
  /** `opts.history: false` evita registrar historial (arrastres en curso, recálculos automáticos). */
  updateNodeData: (id: string, data: any, opts?: UpdateOpts) => void;
  updateNode: (id: string, updates: Partial<NodeModel>) => void;
  updateEdgeData: (id: string, data: any, opts?: UpdateOpts) => void;
  
  updateNodeNotes: (id: string, notes: string) => void;
  updateEdgeNotes: (id: string, notes: string) => void;

  removeNode: (id: string) => void;
  /** Borra varios nodos en un único paso de historial. */
  removeNodes: (ids: string[]) => void;
  removeEdge: (id: string) => void;
}

export const useStore = create<PKMState>((set, get) => ({
  documentVersion: '1.0.0',
  metadata: null,
  nodes: [],
  edges: [],
  selectedEntityId: null,
  selectedEntityType: null,

  past: [],
  future: [],

  activeFilterCategories: null,
  setActiveFilterCategories: (cats) => set({ activeFilterCategories: cats }),
  toggleFilterCategory: (cat) => set((state) => {
    const current = state.activeFilterCategories ?? [];
    const exists = current.includes(cat);
    return {
      activeFilterCategories: exists ? current.filter(c => c !== cat) : [...current, cat]
    };
  }),
  selectAllFilterCategories: (allCats) => set({ activeFilterCategories: [...allCats] }),
  deselectAllFilterCategories: () => set({ activeFilterCategories: [] }),
  clearFilterCategories: () => set({ activeFilterCategories: null }),

  pushSnapshot: (coalesceKey) => {
    const now = Date.now();
    if (coalesceKey) {
      const sameBurst = coalesceKey === lastCoalesceKey && now - lastCoalesceAt < COALESCE_MS;
      lastCoalesceKey = coalesceKey;
      lastCoalesceAt = now;
      if (sameBurst) return; // ya hay un snapshot previo a esta ráfaga de cambios
    } else {
      resetCoalescing();
    }
    const { nodes, edges, past } = get();
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), snapshot],
      future: []
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    resetCoalescing();
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const current: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: [current, ...future],
      selectedEntityId: null,
      selectedEntityType: null
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    resetCoalescing();
    const next = future[0];
    const newFuture = future.slice(1);
    const current: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, current],
      future: newFuture,
      selectedEntityId: null,
      selectedEntityType: null
    });
  },
  
  loadDocument: (doc) => { resetCoalescing(); set({
    documentVersion: doc.documentVersion,
    metadata: doc.metadata,
    nodes: doc.nodes,
    edges: doc.edges,
    selectedEntityId: null,
    selectedEntityType: null,
    past: [],
    future: [],
    activeFilterCategories: null
  }); },
  
  clearDocument: () => { resetCoalescing(); set({
    metadata: null,
    nodes: [],
    edges: [],
    selectedEntityId: null,
    selectedEntityType: null,
    past: [],
    future: [],
    activeFilterCategories: null
  }); },
  
  setSelectedEntity: (id, type) => set({
    selectedEntityId: id,
    selectedEntityType: type,
  }),

  addNode: (type, position) => {
    get().pushSnapshot();
    set((state) => {
      const id = `node-${crypto.randomUUID()}`;
      const isFirst = state.nodes.length === 0;
      
      let visualPosition: { x: number, y: number } | undefined = undefined;
      
      if (position) {
        if (type === 'cluster') {
          visualPosition = { x: Math.round(position.x - 400), y: Math.round(position.y - 400) };
        } else if (type === 'textAnnotation') {
          visualPosition = { x: Math.round(position.x - 70), y: Math.round(position.y - 25) };
        } else if (type === 'imageAnnotation') {
          visualPosition = { x: Math.round(position.x - 100), y: Math.round(position.y - 100) };
        } else if (type === 'arrowAnnotation') {
          visualPosition = { x: Math.round(position.x - 80), y: Math.round(position.y) };
        } else {
          visualPosition = { x: Math.round(position.x - 40), y: Math.round(position.y - 40) };
        }
      } else if (type === 'cluster' && state.nodes.length > 0) {
        let maxY = -Infinity;
        state.nodes.forEach(n => {
          const y = n.data.visualPosition?.y || 0;
          const h = n.data.visualDimensions?.height || (n.type === 'cluster' ? 800 : 80);
          if (y + h > maxY) maxY = y + h;
        });
        if (maxY === -Infinity) maxY = 0;
        visualPosition = { x: 0, y: maxY + 150 };
      }
      
      let nodeData: any;
      if (type === 'textAnnotation') {
        nodeData = {
          description: 'Texto...',
          visualPosition,
          styleConfig: { fontFamily: 'sans', highlightStyle: 'pill', bgColor: '#ffffff', textColor: '#1e293b', textAlign: 'center' }
        };
      } else if (type === 'imageAnnotation') {
        nodeData = {
          visualPosition,
          visualDimensions: { width: 200, height: 200 },
          imageStyle: { shape: 'rounded', zoom: 1, offsetX: 0, offsetY: 0 }
        };
      } else if (type === 'arrowAnnotation') {
        nodeData = {
          visualPosition,
          visualDimensions: { width: 160, height: 24 },
          arrowStyle: { length: 160, angle: 0, thickness: 4, dash: 'solid', head: 'end', color: '#475569' }
        };
      } else if (type === 'cluster') {
        nodeData = {
          semanticLabel: 'Nuevo Grupo',
          historicalNotes: '',
          visualPosition,
          visualDimensions: { width: 800, height: 800 }
        };
      } else {
        nodeData = {
          identity: { givenName: isFirst ? 'Tú' : 'Nueva', familyName: isFirst ? '' : 'Persona' },
          biographicalAttributes: { shape: 'circle' },
          historicalNotes: '',
          visualPosition
        };
      }

      const newNode: NodeModel = {
        id,
        type,
        data: nodeData
      };
      return { nodes: [...state.nodes, newNode], selectedEntityId: id, selectedEntityType: 'node' };
    });
  },

  addEdge: (source, target) => {
    get().pushSnapshot();
    set((state) => {
      const id = `edge-${crypto.randomUUID()}`;
      const newEdge: EdgeModel = {
        id,
        sourceNodeId: source,
        targetNodeId: target,
        semanticRelationshipType: 'Conexión',
        data: { contextualNotes: '' }
      };
      return { edges: [...state.edges, newEdge], selectedEntityId: id, selectedEntityType: 'edge' };
    });
  },

  updateNodeData: (id, data, opts) => {
    if (opts?.history !== false) get().pushSnapshot(`node:${id}`);
    set((state) => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
    }));
  },

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates, data: { ...n.data, ...(updates.data || {}) } } : n)
  })),

  updateEdgeData: (id, data, opts) => {
    if (opts?.history !== false) get().pushSnapshot(`edge:${id}`);
    set((state) => ({
      edges: state.edges.map(e => e.id === id ? { ...e, ...data } : e)
    }));
  },
  
  updateNodeNotes: (id, notes) => {
    get().pushSnapshot(`node:${id}`);
    set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === id ? { ...n, data: { ...n.data, historicalNotes: notes } } : n
      )
    }));
  },
  
  updateEdgeNotes: (id, notes) => {
    get().pushSnapshot(`edge:${id}`);
    set((state) => ({
      edges: state.edges.map(e => 
        e.id === id ? { ...e, data: { ...e.data, contextualNotes: notes } } : e
      )
    }));
  },

  removeNode: (id) => {
    get().pushSnapshot();
    set((state) => {
      const nodeToRemove = state.nodes.find(n => n.id === id);
      const isCluster = nodeToRemove?.type === 'cluster';
      
      let remainingNodes = state.nodes.filter(n => n.id !== id);
      if (isCluster) {
        remainingNodes = remainingNodes.map(n => {
           if (n.data.clusterIds?.includes(id)) {
             return { ...n, data: { ...n.data, clusterIds: n.data.clusterIds.filter(c => c !== id) } };
           }
           return n;
        });
      }
      
      const remainingEdges = state.edges.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id);
      
      return { 
        nodes: remainingNodes, 
        edges: remainingEdges,
        selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
        selectedEntityType: state.selectedEntityId === id ? null : state.selectedEntityType
      };
    });
  },

  removeNodes: (ids) => {
    if (ids.length === 0) return;
    get().pushSnapshot();
    const gone = new Set(ids);
    set((state) => ({
      nodes: state.nodes
        .filter(n => !gone.has(n.id))
        .map(n => (n.data.clusterIds?.some(c => gone.has(c))
          ? { ...n, data: { ...n.data, clusterIds: n.data.clusterIds!.filter(c => !gone.has(c)) } }
          : n)),
      edges: state.edges.filter(e => !gone.has(e.sourceNodeId) && !gone.has(e.targetNodeId)),
      selectedEntityId: state.selectedEntityId && gone.has(state.selectedEntityId) ? null : state.selectedEntityId,
      selectedEntityType: state.selectedEntityId && gone.has(state.selectedEntityId) ? null : state.selectedEntityType,
    }));
  },

  removeEdge: (id) => {
    get().pushSnapshot();
    set((state) => ({
      edges: state.edges.filter(e => e.id !== id),
      selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
      selectedEntityType: state.selectedEntityId === id ? null : state.selectedEntityType
    }));
  },
}));
