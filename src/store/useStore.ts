import { create } from 'zustand';
import type { VisualPkmDocument, NodeModel, EdgeModel, DocumentMetadata } from '../types/store';

interface PKMState {
  documentVersion: string;
  metadata: DocumentMetadata | null;
  nodes: NodeModel[];
  edges: EdgeModel[];
  
  selectedEntityId: string | null;
  selectedEntityType: 'node' | 'edge' | null;
  
  // Actions
  loadDocument: (doc: VisualPkmDocument) => void;
  clearDocument: () => void;
  setSelectedEntity: (id: string | null, type: 'node' | 'edge' | null) => void;
  
  addNode: (type: 'individual' | 'cluster') => void;
  addEdge: (source: string, target: string) => void;
  
  updateNodeData: (id: string, data: any) => void;
  updateNode: (id: string, updates: Partial<NodeModel>) => void;
  updateEdgeData: (id: string, data: any) => void;
  
  updateNodeNotes: (id: string, notes: string) => void;
  updateEdgeNotes: (id: string, notes: string) => void;

  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
}

export const useStore = create<PKMState>((set) => ({
  documentVersion: '1.0.0',
  metadata: null,
  nodes: [],
  edges: [],
  selectedEntityId: null,
  selectedEntityType: null,
  
  loadDocument: (doc) => set({
    documentVersion: doc.documentVersion,
    metadata: doc.metadata,
    nodes: doc.nodes,
    edges: doc.edges,
    selectedEntityId: null,
    selectedEntityType: null,
  }),
  
  clearDocument: () => set({
    metadata: null,
    nodes: [],
    edges: [],
    selectedEntityId: null,
    selectedEntityType: null,
  }),
  
  setSelectedEntity: (id, type) => set({
    selectedEntityId: id,
    selectedEntityType: type,
  }),

  addNode: (type) => set((state) => {
    const id = `node-${crypto.randomUUID()}`;
    const isFirst = state.nodes.length === 0;
    
    let visualPosition = undefined;
    
    if (type === 'cluster' && state.nodes.length > 0) {
      let maxY = -Infinity;
      state.nodes.forEach(n => {
        const y = n.data.visualPosition?.y || 0;
        const h = n.data.visualDimensions?.height || (n.type === 'cluster' ? 800 : 80);
        if (y + h > maxY) maxY = y + h;
      });
      if (maxY === -Infinity) maxY = 0;
      visualPosition = { x: 0, y: maxY + 150 };
    }
    
    const newNode: NodeModel = {
      id,
      type,
      data: type === 'individual' 
        ? { identity: { givenName: isFirst ? 'Tú' : 'Nueva', familyName: isFirst ? '' : 'Persona' }, biographicalAttributes: { shape: 'circle' }, historicalNotes: '' }
        : { semanticLabel: 'Nuevo Grupo', historicalNotes: '', visualPosition, visualDimensions: { width: 800, height: 800 } }
    };
    return { nodes: [...state.nodes, newNode], selectedEntityId: id, selectedEntityType: 'node' };
  }),

  addEdge: (source, target) => set((state) => {
    // Permitimos múltiples aristas entre las mismas personas
    const id = `edge-${crypto.randomUUID()}`;
    const newEdge: EdgeModel = {
      id,
      sourceNodeId: source,
      targetNodeId: target,
      semanticRelationshipType: 'Conexión',
      data: { contextualNotes: '' }
    };
    return { edges: [...state.edges, newEdge], selectedEntityId: id, selectedEntityType: 'edge' };
  }),

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

  removeNode: (id) => set((state) => {
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
  }),

  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter(e => e.id !== id),
    selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
    selectedEntityType: state.selectedEntityId === id ? null : state.selectedEntityType
  })),
}));
