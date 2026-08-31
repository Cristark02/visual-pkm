export interface TaxonomyRelation {
  id: string;
  color: string;
  width: number;
  dashed: boolean;
  arrow: boolean;
}

export interface TaxonomyCategory {
  name: string;
  relationships: TaxonomyRelation[];
}

export const DEFAULT_TAXONOMY: TaxonomyCategory[] = [
  {
    name: "Nivel 1: Esfera Íntima y Romántica",
    relationships: [
      { id: "Cónyuge (Marido/Mujer)", color: "#E91E63", width: 4, dashed: false, arrow: false },
      { id: "Pareja de hecho", color: "#F06292", width: 4, dashed: false, arrow: false },
      { id: "Novio/a", color: "#EC407A", width: 2, dashed: false, arrow: false },
      { id: "Prometido/a", color: "#D81B60", width: 4, dashed: false, arrow: false },
      { id: "Amante / Relación extramatrimonial", color: "#C2185B", width: 2, dashed: false, arrow: false },
      { id: "Amigo/a con derechos", color: "#AB47BC", width: 2, dashed: false, arrow: false },
      { id: "Situationship", color: "#BA68C8", width: 1, dashed: false, arrow: false },
      { id: "Casi algo", color: "#CE93D8", width: 1, dashed: false, arrow: false },
      { id: "Cita / Conociéndose", color: "#F48FB1", width: 1, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 2: Estructura Familiar Nuclear",
    relationships: [
      { id: "Madre / Padre", color: "#000000", width: 6, dashed: false, arrow: false },
      { id: "Hijo / Hija", color: "#000000", width: 6, dashed: false, arrow: false },
      { id: "Hermano/a", color: "#424242", width: 4, dashed: false, arrow: false },
      { id: "Medio hermano/a", color: "#616161", width: 2, dashed: false, arrow: false },
      { id: "Padrastro / Madrastra", color: "#000000", width: 2, dashed: false, arrow: false },
      { id: "Hermanastro/a", color: "#424242", width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 3: Esfera de Amistad y Confianza",
    relationships: [
      { id: "Mejor amigo/a / Confidente", color: "#1565C0", width: 4, dashed: false, arrow: false },
      { id: "Amigo/a íntimo/a", color: "#1976D2", width: 2, dashed: false, arrow: false },
      { id: "Amigo/a de la infancia", color: "#1E88E5", width: 2, dashed: false, arrow: false },
      { id: "Compañero/a de piso", color: "#42A5F5", width: 2, dashed: false, arrow: false },
      { id: "Amigo/a de grupo / Pandilla", color: "#64B5F6", width: 1, dashed: false, arrow: false },
      { id: "Ciberamigo / Penpal", color: "#90CAF9", width: 1, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 4: Familia Extendida y Política",
    relationships: [
      { id: "Abuelo/a", color: "#212121", width: 2, dashed: false, arrow: false },
      { id: "Nieto/a", color: "#212121", width: 2, dashed: false, arrow: false },
      { id: "Tío/a", color: "#424242", width: 2, dashed: false, arrow: false },
      { id: "Sobrino/a", color: "#424242", width: 2, dashed: false, arrow: false },
      { id: "Primo/a", color: "#757575", width: 2, dashed: false, arrow: false },
      { id: "Padrino / Madrina", color: "#455A64", width: 2, dashed: false, arrow: false },
      { id: "Ahijado/a", color: "#455A64", width: 2, dashed: false, arrow: false },
      { id: "Suegro/a", color: "#607D8B", width: 2, dashed: false, arrow: false },
      { id: "Yerno / Nuera", color: "#607D8B", width: 2, dashed: false, arrow: false },
      { id: "Cuñado/a", color: "#78909C", width: 2, dashed: false, arrow: false },
      { id: "Consuegro/a / Concuñado/a", color: "#90A4AE", width: 1, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 5: Relaciones Pasadas / Archivo Histórico",
    relationships: [
      { id: "Ex-cónyuge", color: "#880E4F", width: 4, dashed: true, arrow: false },
      { id: "Ex-pareja / Ex-novio/a", color: "#880E4F", width: 2, dashed: true, arrow: false },
      { id: "Ex-amigo/a", color: "#0D47A1", width: 2, dashed: true, arrow: false },
      { id: "Amistad fracturada", color: "#002171", width: 2, dashed: true, arrow: false },
      { id: "Amor platónico / Crush histórico", color: "#4A148C", width: 1, dashed: true, arrow: false },
      { id: "Fallecido/a", color: "#000000", width: 2, dashed: true, arrow: false }
    ]
  },
  {
    name: "Nivel 6: Esfera Formativa y Laboral",
    relationships: [
      { id: "Mentor / Maestro", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Socio comercial / Co-fundador", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Jefe / Manager", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Colega / Compañero de trabajo", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Subordinado / Empleado", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Compañero de Universidad / Clase", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Profesor / Catedrático", color: "#9CA3AF", width: 2, dashed: false, arrow: false },
      { id: "Cliente habitual / B2B", color: "#9CA3AF", width: 2, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 7: Esfera Social Periférica",
    relationships: [
      { id: "Vecino/a de confianza", color: "#D1D5DB", width: 2, dashed: false, arrow: false },
      { id: "Vecino/a casual", color: "#D1D5DB", width: 1, dashed: false, arrow: false },
      { id: "Amigo/a de un amigo (Mutual)", color: "#D1D5DB", width: 1, dashed: false, arrow: false },
      { id: "Conocido/a del Hobby / Club", color: "#D1D5DB", width: 1, dashed: false, arrow: false },
      { id: "Conocido/a de fiesta / Ocio nocturno", color: "#D1D5DB", width: 1, dashed: false, arrow: false },
      { id: "Contacto de Networking", color: "#D1D5DB", width: 1, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 8: Esfera Transaccional y de Servicios",
    relationships: [
      { id: "Terapeuta / Psicólogo/a", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Médico de cabecera / Especialista", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Camello / Dealer", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Vendedor 'Gris' / Modder", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Camarero/a habitual", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Peluquero/a / Barbero/a", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Mecánico de confianza", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Casero / Propietario", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Inquilino", color: "#E5E7EB", width: 1, dashed: false, arrow: false },
      { id: "Tendero/a del barrio", color: "#E5E7EB", width: 1, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 9: Esfera Antagónica",
    relationships: [
      { id: "Rival / Competidor", color: "#EF4444", width: 2, dashed: false, arrow: false },
      { id: "Enemigo/a declarado", color: "#B91C1C", width: 4, dashed: false, arrow: false },
      { id: "Bully / Acosador (Pasado o presente)", color: "#7F1D1D", width: 4, dashed: false, arrow: false },
      { id: "Persona Non Grata", color: "#000000", width: 4, dashed: false, arrow: false }
    ]
  },
  {
    name: "Nivel 10: Dinámicas Emocionales y Actitudes",
    relationships: [
      { id: "Se llevan muy bien (Mutuo)", color: "#10B981", width: 2, dashed: false, arrow: false },
      { id: "Se caen bien (Mutuo)", color: "#34D399", width: 1, dashed: false, arrow: false },
      { id: "Quiere a / Ama a (Direccional)", color: "#F59E0B", width: 2, dashed: false, arrow: true },
      { id: "Admira a (Direccional)", color: "#3B82F6", width: 2, dashed: false, arrow: true },
      { id: "Protege a / Cuida de (Direccional)", color: "#8B5CF6", width: 2, dashed: false, arrow: true },
      { id: "Soporta a / Tolera a (Direccional)", color: "#9CA3AF", width: 1, dashed: true, arrow: true },
      { id: "Contacto por compromiso (Mutuo)", color: "#D1D5DB", width: 1, dashed: true, arrow: false },
      { id: "Indiferencia (Direccional)", color: "#E5E7EB", width: 1, dashed: true, arrow: true },
      { id: "Se llevan mal (Mutuo)", color: "#F87171", width: 2, dashed: true, arrow: false },
      { id: "Se odian (Mutuo)", color: "#DC2626", width: 4, dashed: true, arrow: false },
      { id: "Odia a (Direccional)", color: "#991B1B", width: 4, dashed: true, arrow: true },
      { id: "Siente envidia de (Direccional)", color: "#65A30D", width: 2, dashed: true, arrow: true },
      { id: "Le guarda rencor a (Direccional)", color: "#9D174D", width: 2, dashed: true, arrow: true },
      { id: "Teme a / Le intimida (Direccional)", color: "#4B5563", width: 2, dashed: true, arrow: true }
    ]
  }
];

export const getTaxonomyRelation = (id: string, customTaxonomy?: TaxonomyCategory[]): TaxonomyRelation => {
  const taxonomy = customTaxonomy || DEFAULT_TAXONOMY;
  for (const category of taxonomy) {
    const rel = category.relationships.find(r => r.id === id);
    if (rel) return rel;
  }
  return { id, color: "#9CA3AF", width: 2, dashed: false, arrow: false };
};
