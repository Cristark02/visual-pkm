export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  isZigZag?: boolean;
}

export function getEdgeStyle(semanticRelationshipType: string): EdgeStyle {
  const t = semanticRelationshipType.toLowerCase();

  // Esfera Romántica
  if (t.includes('partner') && !t.includes('ex')) return { stroke: '#E91E63', strokeWidth: 4 }; // Vigente
  if (t.includes('ex-partner')) return { stroke: '#9C27B0', strokeWidth: 3, strokeDasharray: '10 10' };
  if (t.includes('ephemeral')) return { stroke: '#F48FB1', strokeWidth: 2, strokeDasharray: '2 4' };
  if (t.includes('platonic')) return { stroke: '#BA68C8', strokeWidth: 2, strokeDasharray: '20 10' };

  // Estructura Familiar Nuclear
  if (t.includes('parent') || t.includes('child')) return { stroke: '#000000', strokeWidth: 4 };
  if (t === 'sibling') return { stroke: '#424242', strokeWidth: 3 };
  if (t === 'half-sibling') return { stroke: '#616161', strokeWidth: 3, strokeDasharray: '5 5' };

  // Familia Política y Extendida
  if (t === 'step-parent') return { stroke: '#000000', strokeWidth: 3, strokeDasharray: '1 3' };
  if (t === 'step-sibling') return { stroke: '#757575', strokeWidth: 2, strokeDasharray: '1 3' };
  if (t === 'grandparent') return { stroke: '#212121', strokeWidth: 3 };
  if (t === 'uncle' || t === 'aunt') return { stroke: '#424242', strokeWidth: 2 };
  if (t === 'cousin') return { stroke: '#9E9E9E', strokeWidth: 2 };
  if (t === 'in-law') return { stroke: '#607D8B', strokeWidth: 2, strokeDasharray: '10 10' };

  // Esfera de Amistad
  if (t === 'best-friend') return { stroke: '#1976D2', strokeWidth: 4 };
  if (t === 'close-friend') return { stroke: '#2196F3', strokeWidth: 3 };
  if (t === 'acquaintance') return { stroke: '#64B5F6', strokeWidth: 2 };
  if (t === 'faded-friend') return { stroke: '#BBDEFB', strokeWidth: 2, strokeDasharray: '10 10' };
  if (t === 'fractured') return { stroke: '#FF5722', strokeWidth: 3, isZigZag: true }; // Zig-zag será manejado en el renderer custom

  // Esfera Formativa y Laboral
  if (t === 'mentor') return { stroke: '#388E3C', strokeWidth: 3 };
  if (t === 'boss') return { stroke: '#1B5E20', strokeWidth: 3 };
  if (t === 'colleague') return { stroke: '#4CAF50', strokeWidth: 2 };
  if (t === 'subordinate') return { stroke: '#81C784', strokeWidth: 2 };

  // Fallback genérico
  return { stroke: '#9ca3af', strokeWidth: 2 };
}
