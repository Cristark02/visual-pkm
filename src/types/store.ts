export type NodeType = 'individual' | 'cluster' | 'textAnnotation' | 'imageAnnotation';

export interface IdentityData {
  givenName: string;
  familyName?: string;
  alias?: string;
  birthDate?: string;
}

export interface NodeData {
  identity?: IdentityData;
  semanticLabel?: string;
  description?: string;
  historicalNotes?: string;
  personalContext?: string;
  relationalContext?: string;
  mediaReferences?: {
    primaryAvatarPath?: string;
  };
  biographicalAttributes?: {
    gender?: string;
    birthDate?: string;
    [key: string]: string | undefined;
  };
  visualPosition?: { x: number, y: number };
  visualDimensions?: { width: number, height: number };
  clusterIds?: string[];
  isChainLinked?: boolean;
  color?: string;
  styleConfig?: {
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
    bgColor?: string;
    highlightStyle?: 'solid' | 'pill' | 'transparent';
    textAlign?: 'left' | 'center' | 'right';
  };
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
  arrowDirection?: 'none' | 'forward' | 'backward' | 'mutual';
  curvature?: number;
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
