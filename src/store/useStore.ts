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
  updateEdgeData: (id: string, data: any) => void;
  
  updateNodeNotes: (id: string, notes: string) => void;
  updateEdgeNotes: (id: string, notes: string) => void;
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
    
    const newNode: NodeModel = {
      id,
      type,
      data: type === 'individual' 
        ? { identity: { givenName: isFirst ? 'Tú' : 'Nueva', familyName: isFirst ? '' : 'Persona' }, biographicalAttributes: { shape: 'circle' }, historicalNotes: '' }
        : { semanticLabel: 'Nuevo Grupo', historicalNotes: '' }
    };
    return { nodes: [...state.nodes, newNode], selectedEntityId: id, selectedEntityType: 'node' };
  }),

  addEdge: (source, target) => set((state) => {
    // Evitar aristas duplicadas
    if (state.edges.some(e => e.sourceNodeId === source && e.targetNodeId === target)) return state;
    
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
}));
