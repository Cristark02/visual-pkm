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
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-700 truncate pr-2">
          {selectedEntityType === 'node' 
            ? ((entity as NodeModel).data.identity?.givenName || (entity as NodeModel).data.semanticLabel || 'Nodo')
            : `Relación: ${(entity as EdgeModel).semanticRelationshipType}`}
        </h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50 cursor-pointer">
              <Edit2 size={18} />
            </button>
          ) : (
            <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700 rounded hover:bg-green-50 cursor-pointer">
              <Check size={18} />
            </button>
          )}
          <button onClick={() => setSelectedEntity(null, null)} className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer">
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto flex flex-col">
        {isEditing && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
            {selectedEntityType === 'node' && (entity as NodeModel).type === 'individual' && (
              <>
                <div className="flex gap-2">
                  <input type="text" value={givenName} onChange={e => setGivenName(e.target.value)} placeholder="Nombre" className="w-full p-2 text-sm border border-gray-300 rounded" />
                  <input type="text" value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Apellidos" className="w-full p-2 text-sm border border-gray-300 rounded" />
                </div>
                <select value={shape} onChange={e => setShape(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white">
                  <option value="circle">Círculo</option>
                  <option value="square">Cuadrado</option>
                  <option value="star">Estrella</option>
                  <option value="heart">Corazón</option>
                </select>
                <button onClick={() => alert('Para añadir fotos, ponlas en tu carpeta y nómbralas igual que el ID del nodo en un futuro update, o añádelas al JSON directamente.')} className="w-full flex items-center justify-center gap-2 p-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                  <Camera size={14} /> Asignar Foto Local
                </button>
              </>
            )}
            
            {selectedEntityType === 'node' && (entity as NodeModel).type === 'cluster' && (
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre del Grupo" className="w-full p-2 text-sm border border-gray-300 rounded" />
            )}
            
            {selectedEntityType === 'edge' && (
              <input type="text" value={relationType} onChange={e => setRelationType(e.target.value)} placeholder="Ej: Amigo, Ex-pareja, Familiar" className="w-full p-2 text-sm border border-gray-300 rounded" />
            )}
          </div>
        )}

        <div className="flex-1 p-6 bg-white">
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full h-full min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Escribe el diario o notas en Markdown..."
            />
          ) : (
            <div className="prose prose-sm prose-blue max-w-none">
              {currentNotes ? (
                <ReactMarkdown>{currentNotes}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">No hay notas registradas. Haz clic en el lápiz para empezar a escribir.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
