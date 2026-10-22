import { memo } from 'react';
import { Filter, X, Check } from 'lucide-react';
import { DEFAULT_TAXONOMY } from '../config/taxonomy';
import { useStore } from '../store/useStore';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Variante táctil: hoja sobre el dock y filas grandes. */
  touch?: boolean;
}

const FilterPanel = ({ isOpen, onClose, touch = false }: FilterPanelProps) => {
  const { activeFilterCategories, toggleFilterCategory, clearFilterCategories, selectAllFilterCategories, deselectAllFilterCategories, edges } = useStore();
  const selected = activeFilterCategories ?? [];
  const filterOn = activeFilterCategories !== null;

  if (!isOpen) return null;

  // Build taxonomy category map to count how many edges exist in each category
  const categoryStats = DEFAULT_TAXONOMY.map(cat => {
    const relIds = new Set(cat.relationships.map(r => r.id.toLowerCase()));
    const count = edges.filter(e => relIds.has((e.semanticRelationshipType || '').toLowerCase())).length;
    return {
      name: cat.name,
      count,
      color: cat.relationships[0]?.color || '#6366f1'
    };
  });

  return (
    <div
      {...(touch ? { 'data-bottom-ui': true } : {})}
      className={touch
        ? 'absolute inset-x-2 bottom-[92px] bg-white rounded-3xl shadow-2xl border border-gray-200/80 p-4 z-[45] animate-in fade-in slide-in-from-bottom-4 duration-200'
        : 'absolute top-16 right-4 sm:right-6 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/80 p-4 w-72 sm:w-80 z-40 animate-in fade-in slide-in-from-top-4 duration-200'}
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-indigo-600" />
          <h3 className="font-extrabold text-sm text-gray-800">Filtrar Relaciones</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-3">
        <button
          type="button"
          onClick={() => selectAllFilterCategories(DEFAULT_TAXONOMY.map(c => c.name))}
          className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
        >
          Seleccionar todo
        </button>
        <button
          type="button"
          onClick={deselectAllFilterCategories}
          className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Deseleccionar todo
        </button>
      </div>

      <div className={`py-3 space-y-1.5 overflow-y-auto overscroll-contain ${touch ? "max-h-[38vh]" : "max-h-60"}`}>
        {categoryStats.map(cat => {
          const isSelected = selected.includes(cat.name);
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => toggleFilterCategory(cat.name)}
              className={`w-full flex items-center justify-between px-3 ${touch ? 'py-3 min-h-[48px]' : 'py-2'} rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                  : 'hover:bg-gray-50 text-gray-700 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-indigo-200/60 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 font-medium">
          {!filterOn
            ? 'Mostrando todas'
            : selected.length === 0
              ? 'Ninguna seleccionada'
              : `${selected.length} activas`}
        </span>
        {filterOn && (
          <button
            type="button"
            onClick={clearFilterCategories}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Restablecer todo
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(FilterPanel);
