export interface TaxonomyRule {
  id: string;
  color: string;
  width: number;
  dashed: boolean;
  arrow: boolean; // Si es true, renderiza flecha (para relaciones direccionales)
}

export const DEFAULT_TAXONOMY: { name: string, relationships: TaxonomyRule[] }[] = [
  {
    name: 'Nivel 1: Esfera Íntima / Nuclear',
    relationships: [
      { id: 'Cónyuge', color: '#E91E63', width: 5, dashed: false, arrow: false },
      { id: 'Pareja', color: '#EC407A', width: 4, dashed: false, arrow: false },
      { id: 'Amante', color: '#F06292', width: 3, dashed: false, arrow: false },
      { id: 'Padre', color: '#212121', width: 5, dashed: false, arrow: false },
      { id: 'Madre', color: '#212121', width: 5, dashed: false, arrow: false },
      { id: 'Hijo', color: '#424242', width: 4, dashed: false, arrow: false },
      { id: 'Hermano', color: '#616161', width: 4, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 2: Familia Extendida Cercana',
    relationships: [
      { id: 'Abuelo', color: '#757575', width: 3, dashed: false, arrow: false },
      { id: 'Nieto', color: '#9E9E9E', width: 3, dashed: false, arrow: false },
      { id: 'Tío', color: '#BDBDBD', width: 3, dashed: false, arrow: false },
      { id: 'Sobrino', color: '#BDBDBD', width: 3, dashed: false, arrow: false },
      { id: 'Primo', color: '#E0E0E0', width: 3, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 3: Familia Extendida Lejana',
    relationships: [
      { id: 'Tío Abuelo', color: '#EEEEEE', width: 2, dashed: false, arrow: false },
      { id: 'Sobrino Nieto', color: '#EEEEEE', width: 2, dashed: false, arrow: false },
      { id: 'Primo Segundo', color: '#F5F5F5', width: 2, dashed: false, arrow: false },
      { id: 'Familiar Político', color: '#B0BEC5', width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 4: Amistad y Vínculos Elegidos',
    relationships: [
      { id: 'Mejor Amigo', color: '#1565C0', width: 4, dashed: false, arrow: false },
      { id: 'Amigo Íntimo', color: '#1976D2', width: 3, dashed: false, arrow: false },
      { id: 'Amigo', color: '#2196F3', width: 3, dashed: false, arrow: false },
      { id: 'Conocido', color: '#64B5F6', width: 2, dashed: false, arrow: false },
      { id: 'Compañero', color: '#90CAF9', width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 5: Relaciones Pasadas (Históricas)',
    relationships: [
      { id: 'Ex-cónyuge', color: '#C2185B', width: 4, dashed: true, arrow: false },
      { id: 'Ex-pareja', color: '#D81B60', width: 3, dashed: true, arrow: false },
      { id: 'Ex-amigo', color: '#0D47A1', width: 3, dashed: true, arrow: false },
      { id: 'Amistad Distanciada', color: '#1976D2', width: 2, dashed: true, arrow: false },
      { id: 'Fallecido', color: '#000000', width: 3, dashed: true, arrow: false }
    ]
  },
  {
    name: 'Nivel 6: Vínculos Profesionales',
    relationships: [
      { id: 'Jefe', color: '#FF8F00', width: 3, dashed: false, arrow: false },
      { id: 'Empleado', color: '#FFA000', width: 3, dashed: false, arrow: false },
      { id: 'Colega', color: '#FFB300', width: 2, dashed: false, arrow: false },
      { id: 'Socio', color: '#FFC107', width: 4, dashed: false, arrow: false },
      { id: 'Mentor', color: '#FFD54F', width: 3, dashed: false, arrow: true },
      { id: 'Pupilo', color: '#FFE082', width: 3, dashed: false, arrow: true }
    ]
  },
  {
    name: 'Nivel 7: Vínculos Educativos',
    relationships: [
      { id: 'Profesor', color: '#00695C', width: 3, dashed: false, arrow: true },
      { id: 'Alumno', color: '#00796B', width: 3, dashed: false, arrow: true },
      { id: 'Compañero de Clase', color: '#00897B', width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 8: Vínculos Comunitarios',
    relationships: [
      { id: 'Vecino', color: '#689F38', width: 2, dashed: false, arrow: false },
      { id: 'Compañero de Club', color: '#7CB342', width: 2, dashed: false, arrow: false },
      { id: 'Líder Comunitario', color: '#8BC34A', width: 3, dashed: false, arrow: true },
      { id: 'Miembro', color: '#9CCC65', width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: 'Nivel 9: Vínculos Comerciales',
    relationships: [
      { id: 'Cliente', color: '#5E35B1', width: 2, dashed: false, arrow: true },
      { id: 'Proveedor', color: '#673AB7', width: 2, dashed: false, arrow: true },
      { id: 'Inversor', color: '#7E57C2', width: 3, dashed: false, arrow: true }
    ]
  },
  {
    name: 'Nivel 10: Vínculos Emocionales',
    relationships: [
      { id: 'Ama a', color: '#E91E63', width: 3, dashed: false, arrow: true },
      { id: 'Odia a', color: '#D32F2F', width: 3, dashed: false, arrow: true },
      { id: 'Admira a', color: '#00BCD4', width: 3, dashed: false, arrow: true },
      { id: 'Desprecia a', color: '#795548', width: 3, dashed: false, arrow: true },
      { id: 'Tiene Envidia', color: '#CDDC39', width: 2, dashed: false, arrow: true },
      { id: 'Siente Culpa', color: '#607D8B', width: 2, dashed: false, arrow: true },
      { id: 'Confía', color: '#4CAF50', width: 3, dashed: false, arrow: true },
      { id: 'Desconfía', color: '#FF5722', width: 3, dashed: false, arrow: true },
      { id: 'Protege', color: '#3F51B5', width: 4, dashed: false, arrow: true },
      { id: 'Abusa', color: '#000000', width: 4, dashed: false, arrow: true },
      { id: 'Depende', color: '#9C27B0', width: 3, dashed: false, arrow: true }
    ]
  }
];

export const getTaxonomyRelation = (id: string): TaxonomyRule => {
  for (const group of DEFAULT_TAXONOMY) {
    const found = group.relationships.find(r => r.id === id);
    if (found) return found;
  }
  return { id: 'Desconocido', color: '#9ca3af', width: 2, dashed: false, arrow: false };
};
