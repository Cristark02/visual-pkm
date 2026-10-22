import { useState, useMemo, useRef } from 'react';
import { X, Camera, Search, Trash2, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { saveDocument } from '../lib/fsManager';
import { DEFAULT_TAXONOMY, getTaxonomyRelation } from '../config/taxonomy';
import type { NodeModel, EdgeModel } from '../types/store';

// Helper to calculate age dynamically from birthDate (YYYY-MM-DD)
function calculateAge(birthDateString?: string): number | null {
  if (!birthDateString) return null;
  const parts = birthDateString.split('-');
  if (parts.length < 3) return null;
  const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

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
  const [isPersonalContextOpen, setIsPersonalContextOpen] = useState(false);
  const [isRelationalContextOpen, setIsRelationalContextOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !entity) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateNodeData(entity.id, {
        mediaReferences: {
          ...(entity as NodeModel).data.mediaReferences,
          primaryAvatarPath: dataUrl
        }
      });
      triggerSave();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (!entity) return;
    updateNodeData(entity.id, {
      mediaReferences: {
        ...(entity as NodeModel).data.mediaReferences,
        primaryAvatarPath: undefined
      }
    });
    triggerSave();
  };

  if (!entity) return null;

  const isNode = selectedEntityType === 'node';
  const isIndividual = isNode && (entity as NodeModel).type === 'individual';
  const isCluster = isNode && (entity as NodeModel).type === 'cluster';
  const isEdge = selectedEntityType === 'edge';

  const avatarPath = isIndividual ? (entity as NodeModel).data.mediaReferences?.primaryAvatarPath : undefined;
  const birthDate = isIndividual 
    ? ((entity as NodeModel).data.identity?.birthDate || (entity as NodeModel).data.biographicalAttributes?.birthDate || '')
    : '';
  const calculatedAge = isIndividual ? calculateAge(birthDate) : null;

  return (
    <div className="sidebar-panel h-full w-full bg-white/95 backdrop-blur-xl flex flex-col transform transition-all duration-300">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-transparent shrink-0">
        <h2 className="font-bold text-gray-800 text-base sm:text-lg truncate pr-2">
          {isNode 
            ? ((entity as NodeModel).data.identity?.alias || (entity as NodeModel).data.identity?.givenName || (entity as NodeModel).data.semanticLabel || 'Nodo')
            : `Unión`}
        </h2>
        <button onClick={() => setSelectedEntity(null, null)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all cursor-pointer">
          <X size={16} />
        </button>
      </div>
      
      {/* Scrollable Container with touch-friendly support */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y flex flex-col p-4 sm:p-5 space-y-4">
        {isIndividual && (
          <div className="bg-indigo-50/30 border border-indigo-100/60 rounded-2xl p-4 space-y-3 shrink-0">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Identidad</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={(entity as NodeModel).data.identity?.givenName || ''} 
                onChange={e => handleChange(() => updateNodeData(entity.id, { identity: { ...(entity as NodeModel).data.identity, givenName: e.target.value } }))} 
                onBlur={triggerSave}
                placeholder="Nombre" 
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
              />
              <input 
                type="text" 
                value={(entity as NodeModel).data.identity?.familyName || ''} 
                onChange={e => handleChange(() => updateNodeData(entity.id, { identity: { ...(entity as NodeModel).data.identity, familyName: e.target.value } }))} 
                onBlur={triggerSave}
                placeholder="Apellidos" 
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
              />
            </div>
            <input 
              type="text" 
              value={(entity as NodeModel).data.identity?.alias || ''} 
              onChange={e => handleChange(() => updateNodeData(entity.id, { identity: { ...(entity as NodeModel).data.identity, alias: e.target.value } }))} 
              onBlur={triggerSave}
              placeholder="Alias / Apodo" 
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
            />

            {/* Selector de Foto Nativo */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
            {avatarPath ? (
              <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <img src={avatarPath} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                <div className="flex-1 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex-1 py-1.5 px-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    Cambiar
                  </button>
                  <button 
                    type="button"
                    onClick={handleRemoveImage} 
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors"
                    title="Eliminar Foto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
              >
                <Camera size={16} className="text-indigo-500" /> Asignar Foto
              </button>
            )}

            {/* Fecha de Nacimiento y Edad Dinámica */}
            <div className="pt-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Fecha de Nacimiento {calculatedAge !== null && <span className="text-indigo-600 font-extrabold ml-1">({calculatedAge} años)</span>}
              </label>
              <input 
                type="date"
                value={birthDate}
                onChange={e => {
                  const val = e.target.value;
                  updateNodeData(entity.id, { 
                    identity: { ...(entity as NodeModel).data.identity, birthDate: val },
                    biographicalAttributes: { ...(entity as NodeModel).data.biographicalAttributes, birthDate: val }
                  });
                  triggerSave();
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        )}
        
        {isCluster && (
          <div className="bg-indigo-50/30 border border-indigo-100/60 rounded-2xl p-4 space-y-3 shrink-0">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Propiedades del Grupo</span>
            <input 
              type="text" 
              value={(entity as NodeModel).data.semanticLabel || ''} 
              onChange={e => handleChange(() => updateNodeData(entity.id, { semanticLabel: e.target.value }))} 
              onBlur={triggerSave}
              placeholder="Nombre del Grupo" 
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
            />

            <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={(entity as NodeModel).data.isChainLinked || false}
                onChange={(e) => {
                  updateNodeData(entity.id, { isChainLinked: e.target.checked });
                  triggerSave();
                }}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Vincular Arrastre (Candado)
              </span>
            </label>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Miembros ({nodes.filter(n => n.type === 'individual' && n.data.clusterIds?.includes(entity.id)).length})</label>
              <div className="bg-white border border-gray-200 rounded-xl p-2.5 max-h-32 overflow-y-auto shadow-inner text-xs">
                {nodes.filter(n => n.type === 'individual' && n.data.clusterIds?.includes(entity.id)).length > 0 ? (
                  <ul className="space-y-1.5">
                    {nodes
                      .filter(n => n.type === 'individual' && n.data.clusterIds?.includes(entity.id))
                      .map(member => {
                        const mId = member.data.identity;
                        const mName = mId?.alias || [mId?.givenName, mId?.familyName].filter(Boolean).join(' ') || 'Desconocido';
                        return (
                          <li key={member.id} className="font-medium text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: member.data.color || '#9ca3af' }} />
                            <span className="truncate">{mName}</span>
                          </li>
                        );
                      })
                    }
                  </ul>
                ) : (
                  <p className="text-gray-400 italic text-center py-1">No hay miembros en este grupo.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {(isIndividual || isCluster) && (
          <div className="space-y-3 bg-gray-50/60 p-4 rounded-2xl border border-gray-200/60 shrink-0">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Apariencia</span>
            
            <select 
              value={(entity as NodeModel).data.biographicalAttributes?.shape || 'circle'} 
              onChange={e => {
                updateNodeData(entity.id, { biographicalAttributes: { ...(entity as NodeModel).data.biographicalAttributes, shape: e.target.value } });
                triggerSave();
              }} 
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
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

            {isIndividual && (
              <select 
                value={(entity as NodeModel).data.biographicalAttributes?.gender || ''} 
                onChange={e => {
                  updateNodeData(entity.id, { biographicalAttributes: { ...(entity as NodeModel).data.biographicalAttributes, gender: e.target.value } });
                  triggerSave();
                }} 
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Color de Destaque</label>
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
          </div>
        )}

        {/* Edge Specific Controls: Type, Direction, Curvature */}
        {isEdge && (
          <div className="space-y-4 shrink-0">
            {/* Dirección de la flecha: solo en relaciones que ya llevan flecha por defecto (Mentor, Profesor...) */}
            {getTaxonomyRelation((entity as EdgeModel).semanticRelationshipType).arrow && (
              <div className="bg-indigo-50/30 border border-indigo-100/60 rounded-2xl p-4 space-y-2">
                <label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Sentido de la Flecha</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'forward', label: 'Hacia B', icon: ArrowRight },
                    { id: 'backward', label: 'Hacia A', icon: ArrowLeft },
                    { id: 'mutual', label: 'Ambas', icon: ArrowLeftRight },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const stored = (entity as EdgeModel).data?.arrowDirection;
                    const currentDir = !stored || stored === 'none' ? 'forward' : stored;
                    const isSelected = currentDir === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          updateEdgeData(entity.id, { 
                            data: { ...(entity as EdgeModel).data, arrowDirection: opt.id } 
                          });
                          triggerSave();
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Curvatura: se ajusta arrastrando el punto de la línea en el lienzo (sin slider) */}
            <div className="bg-gray-50/60 border border-gray-200/60 rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500 leading-snug">
                Arrastra los <span className="font-bold text-indigo-600">dos puntos</span> de la línea en el lienzo para doblarla a tu gusto.
              </p>
              <button 
                type="button" 
                disabled={!((entity as EdgeModel).data?.curvature || (entity as EdgeModel).data?.controlPoints)}
                onClick={() => {
                  updateEdgeData(entity.id, { data: { ...(entity as EdgeModel).data, curvature: 0, controlPoints: undefined } });
                  triggerSave();
                }}
                className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enderezar
              </button>
            </div>

            {/* Tipo de Relación */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Tipo de Relación</label>
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

              <div className="h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-inner touch-pan-y">
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
                            // Al cambiar de tipo: las relaciones con flecha arrancan "Hacia B";
                            // las demás no llevan flecha, así que se descarta el sentido guardado.
                            const prevData = (entity as EdgeModel).data || {};
                            const nextData = { ...prevData };
                            if (rel.arrow) {
                              if (!nextData.arrowDirection || nextData.arrowDirection === 'none') nextData.arrowDirection = 'forward';
                            } else {
                              delete nextData.arrowDirection;
                            }
                            updateEdgeData(entity.id, { semanticRelationshipType: rel.id, data: nextData });
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
          </div>
        )}

        {/* Structured Context Sections: Personal Context, Relational Context, and General Notes */}
        {isIndividual && (
          <>
            {/* Contexto Personal */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm shrink-0">
              <button 
                type="button"
                onClick={() => setIsPersonalContextOpen(!isPersonalContextOpen)}
                className="flex items-center justify-between w-full p-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                <span>Contexto Personal (¿Qué hay de su vida?)</span>
                {isPersonalContextOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isPersonalContextOpen && (
                <div className="p-3 border-t border-gray-100">
                  <textarea
                    value={(entity as NodeModel).data?.personalContext || ''}
                    onChange={(e) => updateNodeData(entity.id, { personalContext: e.target.value })}
                    onBlur={triggerSave}
                    rows={4}
                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                    placeholder="¿A qué se dedica? Momento vital actual, intereses, cambios recientes, datos personales..."
                  />
                </div>
              )}
            </div>

            {/* Contexto Relacional */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm shrink-0">
              <button 
                type="button"
                onClick={() => setIsRelationalContextOpen(!isRelationalContextOpen)}
                className="flex items-center justify-between w-full p-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                <span>Contexto Relacional (¿Cómo nos conocimos?)</span>
                {isRelationalContextOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isRelationalContextOpen && (
                <div className="p-3 border-t border-gray-100">
                  <textarea
                    value={(entity as NodeModel).data?.relationalContext || ''}
                    onChange={(e) => updateNodeData(entity.id, { relationalContext: e.target.value })}
                    onBlur={triggerSave}
                    rows={4}
                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                    placeholder="¿Cómo y cuándo os conocisteis? Hitos compartidos, anécdotas, evolución del vínculo..."
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* General Historical Notes */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm shrink-0">
          <button 
            type="button"
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className="flex items-center justify-between w-full p-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider hover:bg-gray-50 transition-colors"
          >
            <span>Notas Generales / Histórico</span>
            {isNotesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {isNotesOpen && (
            <div className="p-3 border-t border-gray-100">
              <textarea
                value={isEdge ? ((entity as EdgeModel).data?.contextualNotes || '') : ((entity as NodeModel).data?.historicalNotes || '')}
                onChange={(e) => {
                  if (isEdge) updateEdgeData(entity.id, { contextualNotes: e.target.value });
                  else updateNodeData(entity.id, { historicalNotes: e.target.value });
                }}
                onBlur={triggerSave}
                rows={4}
                className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all font-mono"
                placeholder="Añade detalles históricos adicionales, referencias o comentarios..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/90 shrink-0">
        <button 
          type="button"
          onClick={() => {
            const typeName = isEdge ? 'vínculo' : (isCluster ? 'grupo' : (isIndividual ? 'persona' : 'elemento'));
            if (window.confirm(`¿Estás seguro de que deseas eliminar este ${typeName}?`)) {
              if (isEdge) useStore.getState().removeEdge(entity.id);
              else useStore.getState().removeNode(entity.id);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Trash2 size={16} /> Eliminar {isEdge ? 'Vínculo' : (isCluster ? 'Grupo' : (isIndividual ? 'Persona' : 'Elemento'))}
        </button>
      </div>
    </div>
  );
}
