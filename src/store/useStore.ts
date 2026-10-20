import { create } from 'zustand';
import type { VisualPkmDocument, NodeModel, EdgeModel, DocumentMetadata } from '../types/store';

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
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // Filter state
  activeFilterCategories: string[];
  setActiveFilterCategories: (cats: string[]) => void;
  toggleFilterCategory: (cat: string) => void;
  clearFilterCategories: () => void;

  // Actions
  loadDocument: (doc: VisualPkmDocument) => void;
  clearDocument: () => void;
  setSelectedEntity: (id: string | null, type: 'node' | 'edge' | null) => void;
  
  addNode: (type: 'individual' | 'cluster' | 'textAnnotation' | 'imageAnnotation', position?: { x: number, y: number }) => void;
  addEdge: (source: string, target: string) => void;
  
  updateNodeData: (id: string, data: any) => void;
  updateNode: (id: string, updates: Partial<NodeModel>) => void;
  updateEdgeData: (id: string, data: any) => void;
  
  updateNodeNotes: (id: string, notes: string) => void;
  updateEdgeNotes: (id: string, notes: string) => void;

  removeNode: (id: string) => void;
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

  activeFilterCategories: [],
  setActiveFilterCategories: (cats) => set({ activeFilterCategories: cats }),
  toggleFilterCategory: (cat) => set((state) => {
    const exists = state.activeFilterCategories.includes(cat);
    return {
      activeFilterCategories: exists
        ? state.activeFilterCategories.filter(c => c !== cat)
        : [...state.activeFilterCategories, cat]
    };
  }),
  clearFilterCategories: () => set({ activeFilterCategories: [] }),

  pushSnapshot: () => {
    const { nodes, edges, past } = get();
    // Guardar copia limpia en el historial (máximo 30 pasos)
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    set({
      past: [...past.slice(-29), snapshot],
      future: []
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
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
  
  loadDocument: (doc) => set({
    documentVersion: doc.documentVersion,
    metadata: doc.metadata,
    nodes: doc.nodes,
    edges: doc.edges,
    selectedEntityId: null,
    selectedEntityType: null,
    past: [],
    future: [],
    activeFilterCategories: []
  }),
  
  clearDocument: () => set({
    metadata: null,
    nodes: [],
    edges: [],
    selectedEntityId: null,
    selectedEntityType: null,
    past: [],
    future: [],
    activeFilterCategories: []
  }),
  
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
          visualDimensions: { width: 200, height: 200 }
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
        data: { contextualNotes: '', arrowDirection: 'none' }
      };
      return { edges: [...state.edges, newEdge], selectedEntityId: id, selectedEntityType: 'edge' };
    });
  },

  updateNodeData: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
  })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates, data: { ...n.data, ...(updates.data || {}) } } : n)
  })),

  updateEdgeData: (id, data) => set((state) => ({
    edges: state.edges.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  
  updateNodeNotes: (id, notes) => set((state) => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, data: { ...n.data, historicalNotes: notes } } : n
    )
  })),
  
  updateEdgeNotes: (id, notes) => set((state) => ({
    edges: state.edges.map(e => 
      e.id === id ? { ...e, data: { ...e.data, contextualNotes: notes } } : e
    )
  })),

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

  removeEdge: (id) => {
    get().pushSnapshot();
    set((state) => ({
      edges: state.edges.filter(e => e.id !== id),
      selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
      selectedEntityType: state.selectedEntityId === id ? null : state.selectedEntityType
    }));
  },
}));
