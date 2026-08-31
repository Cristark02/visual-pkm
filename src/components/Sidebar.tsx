import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Edit2, Check, Camera } from 'lucide-react';
import { useStore } from '../store/useStore';
import { saveDocument } from '../lib/fsManager';
import type { NodeModel, EdgeModel } from '../types/store';

export default function Sidebar() {
  const { 
    selectedEntityId, 
    selectedEntityType, 
    nodes, 
    edges, 
    updateNodeNotes, 
    updateEdgeNotes,
    updateNodeData,
    updateEdgeData,
    setSelectedEntity
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  
  // Local state for properties
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [shape, setShape] = useState('');
  const [relationType, setRelationType] = useState('');
  const [label, setLabel] = useState('');
  
  const entity = selectedEntityType === 'node' 
    ? nodes.find(n => n.id === selectedEntityId)
    : edges.find(e => e.id === selectedEntityId);

  const currentNotes = selectedEntityType === 'node'
    ? (entity as NodeModel)?.data?.historicalNotes || ''
    : (entity as EdgeModel)?.data?.contextualNotes || '';

  useEffect(() => {
    setIsEditing(false);
    setDraft(currentNotes);
    if (entity && selectedEntityType === 'node') {
      const node = entity as NodeModel;
      const d = node.data;
      if (node.type === 'individual') {
        setGivenName(d.identity?.givenName || '');
        setFamilyName(d.identity?.familyName || '');
        setShape(d.biographicalAttributes?.shape || 'circle');
      } else {
        setLabel(d.semanticLabel || '');
      }
    } else if (entity && selectedEntityType === 'edge') {
      setRelationType((entity as EdgeModel).semanticRelationshipType || '');
    }
  }, [selectedEntityId, entity]);

  const handleSave = async () => {
    if (!entity || !selectedEntityType) return;
    
    if (selectedEntityType === 'node') {
      const node = entity as NodeModel;
      updateNodeNotes(node.id, draft);
      if (node.type === 'individual') {
        updateNodeData(node.id, {
          identity: { givenName, familyName },
          biographicalAttributes: { shape }
        });
      } else {
        updateNodeData(node.id, { semanticLabel: label });
      }
    } else {
      const edge = entity as EdgeModel;
      updateEdgeNotes(edge.id, draft);
      updateEdgeData(edge.id, { semanticRelationshipType: relationType });
    }
    
    setIsEditing(false);
    
    const state = useStore.getState();
    const doc = {
      documentVersion: state.documentVersion,
      metadata: state.metadata!,
      nodes: state.nodes,
      edges: state.edges
    };
    
    await saveDocument(doc);
  };

  if (!entity) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-100 flex flex-col z-50 transform transition-all duration-300">
      <div className="flex items-center justify-between p-5 border-b border-gray-100/50 bg-transparent">
        <h2 className="font-bold text-gray-800 text-lg truncate pr-2">
          {selectedEntityType === 'node' 
            ? ((entity as NodeModel).data.identity?.givenName || (entity as NodeModel).data.semanticLabel || 'Nodo')
            : `Relación: ${(entity as EdgeModel).semanticRelationshipType}`}
        </h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all cursor-pointer">
              <Edit2 size={16} />
            </button>
          ) : (
            <button onClick={handleSave} className="p-2 text-green-600 hover:text-green-700 rounded-full hover:bg-green-50 transition-all cursor-pointer">
              <Check size={16} />
            </button>
          )}
          <button onClick={() => setSelectedEntity(null, null)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar">
        {isEditing && (
          <div className="p-5 bg-indigo-50/30 border-b border-indigo-100/50 space-y-4">
            {selectedEntityType === 'node' && (entity as NodeModel).type === 'individual' && (
              <>
                <div className="flex gap-3">
                  <input type="text" value={givenName} onChange={e => setGivenName(e.target.value)} placeholder="Nombre" className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm" />
                  <input type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Apellidos" className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm" />
                </div>
                <select value={shape} onChange={e => setShape(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm">
                  <option value="circle">Forma: Círculo</option>
                  <option value="square">Forma: Cuadrado</option>
                  <option value="star">Forma: Estrella</option>
                  <option value="heart">Forma: Corazón</option>
                </select>
                <button onClick={() => alert('Para añadir fotos, ponlas en tu carpeta y nómbralas igual que el ID del nodo en un futuro update, o añádelas al JSON directamente.')} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                  <Camera size={16} className="text-indigo-500" /> Asignar Foto Local
                </button>
              </>
            )}
            
            {selectedEntityType === 'node' && (entity as NodeModel).type === 'cluster' && (
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre del Grupo" className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm" />
            )}
            
            {selectedEntityType === 'edge' && (
              <input type="text" value={relationType} onChange={e => setRelationType(e.target.value)} placeholder="Ej: Amigo, Ex-pareja, Familiar" className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm" />
            )}
          </div>
        )}

        <div className="flex-1 p-6">
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-full min-h-[400px] p-5 bg-white border border-gray-200 rounded-2xl text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm transition-all"
              placeholder="Escribe el diario o notas en Markdown..."
            />
          ) : (
            <div className="prose prose-sm prose-indigo max-w-none text-gray-700">
              {currentNotes ? (
                <ReactMarkdown>{currentNotes}</ReactMarkdown>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-50">
                  <Edit2 size={32} className="mb-3 text-gray-400" />
                  <p className="text-gray-500 italic">No hay notas registradas.<br/>Haz clic en el lápiz para empezar a escribir.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
