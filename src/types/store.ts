export type NodeType = 'individual' | 'cluster' | 'textAnnotation' | 'imageAnnotation' | 'arrowAnnotation';

export type ImageShape = 'square' | 'rounded' | 'circle' | 'star' | 'heart';

export interface ImageStyle {
  shape?: ImageShape;
  /** Zoom del recorte no destructivo (1 = sin zoom). */
  zoom?: number;
  /** Desplazamiento del recorte, en % del marco (-50..50). */
  offsetX?: number;
  offsetY?: number;
}

export interface ArrowStyle {
  /** Longitud de la flecha en unidades de flujo. */
  length?: number;
  /** Ángulo en grados (0 = hacia la derecha). */
  angle?: number;
  /** Anchura (grosor) del trazo. */
  thickness?: number;
  dash?: 'solid' | 'dashed' | 'dotted';
  head?: 'end' | 'both' | 'none';
  color?: string;
}

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
  imageStyle?: ImageStyle;
  arrowStyle?: ArrowStyle;
  clusterIds?: string[];
  isChainLinked?: boolean;
  color?: string;
  styleConfig?: {
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
    bgColor?: string;
    highlightStyle?: 'solid' | 'pill' | 'transparent';
    /** Si es false el texto no dibuja fondo (equivale a 'transparent'). */
    showBackground?: boolean;
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
