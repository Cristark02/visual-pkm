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
