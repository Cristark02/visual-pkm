import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Edit2, Check, FileDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { saveDocument, exportDocumentBlob } from '../lib/fsManager';

export default function Sidebar() {
  const { 
    selectedEntityId, 
    selectedEntityType, 
    nodes, 
    edges, 
    updateNodeNotes, 
    updateEdgeNotes,
    setSelectedEntity
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  
  // Encontrar la entidad seleccionada
  const entity = selectedEntityType === 'node' 
    ? nodes.find(n => n.id === selectedEntityId)
    : edges.find(e => e.id === selectedEntityId);

  // Extraer el texto actual
  const currentNotes = selectedEntityType === 'node'
    ? (entity as any)?.data?.historicalNotes || ''
    : (entity as any)?.data?.contextualNotes || '';

  // Cuando cambia la selección, salir de modo edición y cargar el borrador
  useEffect(() => {
    setIsEditing(false);
    setDraft(currentNotes);
  }, [selectedEntityId, currentNotes]);

  // Debounce para autoguardado si lo hacemos on-the-fly, pero usaremos un botón explícito 
  // o guardado al salir del modo edición para cumplir el flujo.
  const handleSave = async () => {
    if (!entity || !selectedEntityType) return;
    
    if (selectedEntityType === 'node') {
      updateNodeNotes(entity.id, draft);
    } else {
      updateEdgeNotes(entity.id, draft);
    }
    
    setIsEditing(false);
    
    // Serializar inverso a disco físico
    const state = useStore.getState();
    const doc = {
      documentVersion: state.documentVersion,
      metadata: state.metadata!,
      nodes: state.nodes,
      edges: state.edges
    };
    
    await saveDocument(doc);
  };

  const handleExportFallback = () => {
    const state = useStore.getState();
    const doc = {
      documentVersion: state.documentVersion,
      metadata: state.metadata!,
      nodes: state.nodes,
      edges: state.edges
    };
    exportDocumentBlob(doc);
  };

  if (!entity) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-700 truncate pr-2">
          {selectedEntityType === 'node' 
            ? ((entity as any).data.identity?.givenName || (entity as any).data.semanticLabel || 'Nodo')
            : `Relación: ${(entity as any).semanticRelationshipType}`}
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
      
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full h-full min-h-[300px] p-4 bg-gray-50 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Escribe en Markdown..."
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

      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <span>UUID: <span className="font-mono">{entity.id.split('-')[0]}...</span></span>
        <button onClick={handleExportFallback} className="flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
          <FileDown size={14} /> Exportar JSON
        </button>
      </div>
    </div>
  );
}
