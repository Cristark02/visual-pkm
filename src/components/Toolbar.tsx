import { UserPlus, FolderPlus } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Toolbar() {
  const { addNode } = useStore();

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md px-2 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-2 z-40 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)]">
      <button 
        onClick={() => addNode('individual')}
        className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-600 transition-all cursor-pointer"
      >
        <UserPlus size={18} />
        Añadir Persona
      </button>
      <div className="w-px h-6 bg-gray-200 mx-1"></div>
      <button 
        onClick={() => addNode('cluster')}
        className="flex items-center gap-2 px-4 py-2 hover:bg-purple-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-purple-600 transition-all cursor-pointer"
      >
        <FolderPlus size={18} />
        Añadir Grupo
      </button>
    </div>
  );
}
