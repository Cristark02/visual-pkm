import { useState, useMemo } from 'react';
import { X, Camera, Search } from 'lucide-react';
import { useStore } from '../store/useStore';
import { saveDocument } from '../lib/fsManager';
import { DEFAULT_TAXONOMY, getTaxonomyRelation } from '../config/taxonomy';
import type { NodeModel, EdgeModel } from '../types/store';

// Helper to render the visual line preview
const LinePreview = ({ id }: { id: string }) => {
  const tax = getTaxonomyRelation(id);
  return (
    <svg width="40" height="10" className="mx-2 shrink-0">
      <line 
        x1="0" y1="5" x2="30" y2="5" 
        stroke={tax.color} 
        strokeWidth={tax.width} 
        strokeDasharray={tax.dashed ? "3 3" : "none"} 
      />
      {tax.arrow && (
        <polygon points="30,1 40,5 30,9" fill={tax.color} />
      )}
    </svg>
  );
};

export default function Sidebar() {
  const { selectedEntityId, selectedEntityType, setSelectedEntity, nodes, edges, updateNodeData, updateEdgeData } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  const entity = useMemo(() => {
    if (selectedEntityType === 'node') return nodes.find(n => n.id === selectedEntityId);
    if (selectedEntityType === 'edge') return edges.find(e => e.id === selectedEntityId);
    return null;
  }, [selectedEntityId, selectedEntityType, nodes, edges]);

  // Handle instant updates to store, while keeping local state fast
  const handleChange = (updater: () => void) => {
    updater();
  };

  // Debounced save to filesystem
  const triggerSave = () => {
    const state = useStore.getState();
    const doc = {
      documentVersion: state.documentVersion,
      metadata: state.metadata!,
      nodes: state.nodes,
      edges: state.edges
    };
    saveDocument(doc).catch(console.error);
  };

  if (!entity) return null;

  const isNode = selectedEntityType === 'node';
  const isIndividual = isNode && (entity as NodeModel).type === 'individual';
  const isCluster = isNode && (entity as NodeModel).type === 'cluster';
  const isEdge = selectedEntityType === 'edge';

  return (
    <div className="absolute top-4 right-4 bottom-4 w-[calc(100%-2rem)] sm:w-96 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-100 flex flex-col z-50 transform transition-all duration-300">
      <div className="flex items-center justify-between p-5 border-b border-gray-100/50 bg-transparent shrink-0">
        <h2 className="font-bold text-gray-800 text-lg truncate pr-2">
          {isNode 
            ? ((entity as NodeModel).data.identity?.givenName || (entity as NodeModel).data.semanticLabel || 'Nodo')
            : `Unión`}
        </h2>
        <button onClick={() => setSelectedEntity(null, null)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all cursor-pointer">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar">
        <div className="p-5 bg-indigo-50/20 border-b border-indigo-100/50 space-y-4 shrink-0">
          {isIndividual && (
            <>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={(entity as NodeModel).data.identity?.givenName || ''} 
                  onChange={e => handleChange(() => updateNodeData(entity.id, { identity: { ...(entity as NodeModel).data.identity, givenName: e.target.value } }))} 
                  onBlur={triggerSave}
                  placeholder="Nombre" 
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
                />
                <input 
                  type="text" 
                  value={(entity as NodeModel).data.identity?.familyName || ''} 
                  onChange={e => handleChange(() => updateNodeData(entity.id, { identity: { ...(entity as NodeModel).data.identity, familyName: e.target.value } }))} 
                  onBlur={triggerSave}
                  placeholder="Apellidos" 
                  className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
                />
              </div>
              <button onClick={() => alert('Próximamente: Selector de archivos nativo.')} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                <Camera size={16} className="text-indigo-500" /> Asignar Foto
              </button>
            </>
          )}
          
          {isCluster && (
            <input 
              type="text" 
              value={(entity as NodeModel).data.semanticLabel || ''} 
              onChange={e => handleChange(() => updateNodeData(entity.id, { semanticLabel: e.target.value }))} 
              onBlur={triggerSave}
              placeholder="Nombre del Grupo" 
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
            />
          )}

          {(isIndividual || isCluster) && (
            <select 
              value={(entity as NodeModel).data.biographicalAttributes?.shape || 'circle'} 
              onChange={e => {
                updateNodeData(entity.id, { biographicalAttributes: { ...(entity as NodeModel).data.biographicalAttributes, shape: e.target.value } });
                triggerSave();
              }} 
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            >
              <option value="circle">Forma: Círculo/Óvalo</option>
              <option value="square">Forma: Rectángulo/Cuadrado</option>
              <option value="star">Forma: Estrella</option>
              <option value="heart">Forma: Corazón</option>
              <option value="hexagon">Forma: Hexágono</option>
              <option value="diamond">Forma: Rombo</option>
              <option value="triangle">Forma: Triángulo</option>
              <option value="pentagon">Forma: Pentágono</option>
              <option value="octagon">Forma: Octágono</option>
              <option value="shield">Forma: Escudo</option>
            </select>
          )}

          {isIndividual && (
            <select 
              value={(entity as NodeModel).data.biographicalAttributes?.gender || ''} 
              onChange={e => {
                updateNodeData(entity.id, { biographicalAttributes: { ...(entity as NodeModel).data.biographicalAttributes, gender: e.target.value } });
                triggerSave();
              }} 
              className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            >
              <option value="">Género: No especificado</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
              <option value="No binario">No binario</option>
              <option value="Fluido">Fluido</option>
              <option value="Otro">Otro</option>
              <option value="Prefiero no decirlo">Prefiero no decirlo</option>
            </select>
          )}

          {(isIndividual || isCluster) && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color de Destaque</label>
              <div className="flex flex-wrap gap-2">
                {[
                  '#818cf8', // Indigo
                  '#fb7185', // Rose
                  '#34d399', // Emerald
                  '#fbbf24', // Amber
                  '#38bdf8', // Sky
                  '#a78bfa', // Violet
                  '#f472b6', // Pink
                  '#94a3b8', // Slate
                ].map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      updateNodeData(entity.id, { color });
                      triggerSave();
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      (entity as NodeModel).data.color === color ? 'border-gray-900 scale-125' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  onClick={() => {
                    updateNodeData(entity.id, { color: undefined });
                    triggerSave();
                  }}
                  className={`w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center transition-transform hover:scale-110 ${
                    !(entity as NodeModel).data.color ? 'border-gray-900 scale-125' : 'bg-white'
                  }`}
                  title="Sin color"
                >
                  <X size={12} className="text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {isIndividual && (entity as NodeModel).data.clusterIds && (entity as NodeModel).data.clusterIds!.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pertenece a:</span>
              <div className="flex flex-wrap gap-1">
                {(entity as NodeModel).data.clusterIds!.map(cId => {
                  const c = nodes.find(n => n.id === cId);
                  if (!c) return null;
                  return (
                    <span key={cId} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      {c.data.semanticLabel || 'Grupo'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {isEdge && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Relación</label>
              
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Buscar relación..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-inner no-scrollbar">
                {DEFAULT_TAXONOMY.map(cat => {
                  const filtered = cat.relationships.filter(r => r.id.toLowerCase().includes(searchTerm.toLowerCase()));
                  if (filtered.length === 0) return null;
                  
                  return (
                    <div key={cat.name} className="border-b border-gray-100 last:border-0">
                      <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                        {cat.name}
                      </div>
                      {filtered.map(rel => (
                        <div 
                          key={rel.id} 
                          onClick={() => {
                            updateEdgeData(entity.id, { semanticRelationshipType: rel.id });
                            triggerSave();
                          }}
                          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors text-sm ${
                            (entity as EdgeModel).semanticRelationshipType === rel.id ? 'bg-indigo-50/50 font-bold text-indigo-700' : 'text-gray-700'
                          }`}
                        >
                          <LinePreview id={rel.id} />
                          <span className="truncate">{rel.id}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col min-h-[250px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas (Markdown)</label>
          <textarea
            value={isEdge ? ((entity as EdgeModel).data?.contextualNotes || '') : ((entity as NodeModel).data?.historicalNotes || '')}
            onChange={(e) => {
              if (isEdge) updateEdgeData(entity.id, { contextualNotes: e.target.value });
              else updateNodeData(entity.id, { historicalNotes: e.target.value });
            }}
            onBlur={triggerSave}
            className="w-full flex-1 p-4 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner transition-all"
            placeholder="Añade contexto histórico, anécdotas..."
          />
        </div>
      </div>
    </div>
  );
}
