import { UserPlus, FolderPlus, DownloadCloud } from 'lucide-react';
import { useStore } from '../store/useStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Toolbar() {
  const { addNode, documentVersion, metadata, nodes, edges } = useStore();

  const handleExportZIP = async () => {
    const zip = new JSZip();
    
    // Add state.json
    const state = { documentVersion, metadata, nodes, edges };
    zip.file("state.json", JSON.stringify(state, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "social-link-backup.zip");
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 z-40">
      <button 
        onClick={() => addNode('individual')}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-full text-sm font-medium text-gray-700 transition-colors"
      >
        <UserPlus size={16} className="text-blue-600" />
        Añadir Persona
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1"></div>
      <button 
        onClick={() => addNode('cluster')}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-full text-sm font-medium text-gray-700 transition-colors"
      >
        <FolderPlus size={16} className="text-purple-600" />
        Añadir Grupo
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1"></div>
      <button 
        onClick={handleExportZIP}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-full text-sm font-medium text-gray-700 transition-colors"
      >
        <DownloadCloud size={16} className="text-green-600" />
        Exportar ZIP
      </button>
    </div>
  );
}
