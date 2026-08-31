import { UserPlus, FolderPlus } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Toolbar() {
  const { addNode } = useStore();

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md px-1 sm:px-2 py-1 sm:py-2 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-1 sm:gap-2 z-40 transition-all">
      <button 
        onClick={() => addNode('individual')}
        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-blue-600 transition-all cursor-pointer whitespace-nowrap"
      >
        <UserPlus size={18} />
        <span className="hidden sm:inline">Añadir Persona</span>
        <span className="sm:hidden">Persona</span>
      </button>
      <div className="w-px h-6 bg-gray-200 mx-0 sm:mx-1"></div>
      <button 
        onClick={() => addNode('cluster')}
        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 hover:bg-purple-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-purple-600 transition-all cursor-pointer whitespace-nowrap"
      >
        <FolderPlus size={18} />
        <span className="hidden sm:inline">Añadir Grupo</span>
        <span className="sm:hidden">Grupo</span>
      </button>
    </div>
  );
}
