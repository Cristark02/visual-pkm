import { memo } from 'react';
import { UserPlus, FolderPlus, Undo2, Redo2, Filter, Type, Image, MoveUpRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { placeNode } from '../lib/placeNode';
import type { NodeType } from '../types/store';

interface ToolbarProps {
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
}

const Toolbar = ({ onToggleFilter, isFilterOpen }: ToolbarProps) => {
  const { undo, redo, past, future, activeFilterCategories } = useStore();
  const filterActive = activeFilterCategories !== null;

  const handleAddNode = (type: NodeType) => placeNode(type);

  return (
    <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-1 sm:gap-1.5 z-30 transition-all max-w-[95vw] overflow-x-auto">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-gray-200">
        <button
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          title="Deshacer (Ctrl+Z)"
          className={`p-2 rounded-xl transition-all ${
            past.length > 0 
              ? 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer active:scale-90' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          title="Rehacer (Ctrl+Y)"
          className={`p-2 rounded-xl transition-all ${
            future.length > 0 
              ? 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer active:scale-90' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Add Persona */}
      <button 
        type="button"
        onClick={() => handleAddNode('individual')}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-blue-600 transition-all cursor-pointer whitespace-nowrap active:scale-95"
      >
        <UserPlus size={16} className="text-blue-500" />
        <span className="hidden sm:inline">Añadir Persona</span>
        <span className="sm:hidden">Persona</span>
      </button>

      {/* Add Grupo */}
      <button 
        type="button"
        onClick={() => handleAddNode('cluster')}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-purple-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-purple-600 transition-all cursor-pointer whitespace-nowrap active:scale-95"
      >
        <FolderPlus size={16} className="text-purple-500" />
        <span className="hidden sm:inline">Añadir Grupo</span>
        <span className="sm:hidden">Grupo</span>
      </button>

      {/* Add Texto (Stories) */}
      <button 
        type="button"
        onClick={() => handleAddNode('textAnnotation')}
        className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-pink-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-pink-600 transition-all cursor-pointer whitespace-nowrap active:scale-95"
        title="Añadir Texto flotante (Estilo Historias)"
      >
        <Type size={16} className="text-pink-500" />
        <span className="hidden sm:inline">Texto</span>
      </button>

      {/* Add Sticker / Foto */}
      <button 
        type="button"
        onClick={() => handleAddNode('imageAnnotation')}
        className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-emerald-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-emerald-600 transition-all cursor-pointer whitespace-nowrap active:scale-95"
        title="Añadir Imagen / Sticker flotante"
      >
        <Image size={16} className="text-emerald-500" />
        <span className="hidden sm:inline">Sticker</span>
      </button>

      {/* Add Flecha libre (sticker) */}
      <button 
        type="button"
        onClick={() => handleAddNode('arrowAnnotation')}
        className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-amber-50 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-amber-600 transition-all cursor-pointer whitespace-nowrap active:scale-95"
        title="Añadir flecha libre (no se conecta a nodos)"
      >
        <MoveUpRight size={16} className="text-amber-500" />
        <span className="hidden sm:inline">Flecha</span>
      </button>

      {/* Filtros Toggle */}
      {onToggleFilter && (
        <div className="pl-1 border-l border-gray-200">
          <button
            type="button"
            onClick={onToggleFilter}
            title="Filtrar por tipo de relación"
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isFilterOpen || filterActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">Filtros</span>
            {filterActive && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(Toolbar);

