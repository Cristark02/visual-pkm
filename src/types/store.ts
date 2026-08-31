export type NodeType = 'individual' | 'cluster';

export interface IdentityData {
  givenName: string;
  familyName?: string;
}

export interface NodeData {
  identity?: IdentityData;
  semanticLabel?: string;
  description?: string;
  historicalNotes?: string;
  mediaReferences?: {
    primaryAvatarPath?: string;
  };
  biographicalAttributes?: Record<string, string>;
  visualPosition?: { x: number, y: number };
  clusterIds?: string[];
}

export interface NodeModel {
  id: string;
  type: NodeType;
  data: NodeData;
}

export interface EdgeData {
  temporalBounds?: {
    startDate?: string;
    endDate?: string | null;
  };
  contextualNotes?: string;
}

export interface EdgeModel {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  semanticRelationshipType: string;
  data?: EdgeData;
}

export interface DocumentMetadata {
  creationTimestamp: string;
  lastModifiedTimestamp: string;
  vaultOwner: string;
  encryptionStatus: string;
}

export interface VisualPkmDocument {
  documentVersion: string;
  metadata: DocumentMetadata;
  nodes: NodeModel[];
  edges: EdgeModel[];
}
