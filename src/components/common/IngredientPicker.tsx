import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ingredient } from '../../types';
import { calculateStringSimilarity } from '../../services/ocr/deterministicExtractor';
import { Search, ChevronDown, PlusCircle, Ban } from 'lucide-react';

interface IngredientPickerProps {
  ingredients: Ingredient[];
  value?: string;
  onChange: (ingredientId: string | undefined, ingredient?: Ingredient) => void;
  /** Libellé de référence (ex. texte brut de la facture) utilisé pour classer les suggestions par défaut. */
  contextLabel?: string;
  onCreateNew?: () => void;
  placeholder?: string;
}

const MAX_SUGGESTIONS = 6;
const ESTIMATED_DROPDOWN_HEIGHT = 320;

export const IngredientPicker: React.FC<IngredientPickerProps> = ({
  ingredients,
  value,
  onChange,
  contextLabel,
  onCreateNew,
  placeholder = 'Rechercher un ingrédient...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; width: number; openUpward: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = ingredients.find(i => i.id === value);

  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < ESTIMATED_DROPDOWN_HEIGHT && rect.top > spaceBelow;
    setCoords({
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
      openUpward
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 30);
    // Le picker peut vivre dans un conteneur défilant (liste de lignes de facture) : on recalcule
    // la position à chaque scroll/redimensionnement plutôt que de laisser le menu se faire découper.
    const handle = () => updateCoords();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rankTerm = query.trim() || contextLabel || '';
  const ranked = rankTerm
    ? ingredients
        .map(ing => ({ ing, score: calculateStringSimilarity(ing.name, rankTerm) }))
        .filter(r => query.trim() ? r.ing.name.toLowerCase().includes(query.trim().toLowerCase()) || r.score >= 0.3 : true)
        .sort((a, b) => b.score - a.score)
    : ingredients.map(ing => ({ ing, score: 0 }));

  const results = ranked.slice(0, MAX_SUGGESTIONS);

  const handlePick = (ing: Ingredient | undefined) => {
    onChange(ing?.id, ing);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`w-full p-1.5 flex items-center justify-between gap-1.5 bg-white border rounded-lg font-semibold text-[#252A27] text-left ${
          selected ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-300 bg-amber-50/40'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-[#8A9089] font-normal'}`}>
          {selected ? `${selected.name} (${selected.unit})` : '-- Non rattaché (ne pas impacter le stock) --'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#555D58] shrink-0" />
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: coords.left,
            width: coords.width,
            ...(coords.openUpward ? { bottom: coords.bottom } : { top: coords.top })
          }}
          className="z-[250] bg-white rounded-xl border border-[#C7CDC8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="p-2 border-b border-[#ECEEEA] flex items-center gap-1.5 bg-[#F7F7F5]">
            <Search className="w-3.5 h-3.5 text-[#555D58] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-xs text-[#252A27] focus:outline-none"
              onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false); }}
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handlePick(undefined)}
              className="w-full px-3 py-2 flex items-center gap-2 text-xs text-[#555D58] hover:bg-[#F7F7F5] text-left"
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>Non rattaché (ne pas impacter le stock)</span>
            </button>

            {!query.trim() && contextLabel && (
              <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wide text-[#8A9089]">
                Suggestions pour "{contextLabel}"
              </div>
            )}

            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#555D58]">Aucun ingrédient trouvé.</p>
            ) : (
              results.map(({ ing, score }) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => handlePick(ing)}
                  className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-[#F7F7F5] text-left ${
                    ing.id === value ? 'bg-emerald-50/60' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="font-bold text-[#252A27] block truncate">{ing.name}</span>
                    <span className="text-[10px] text-[#555D58]">
                      Unité {ing.unit} &bull; En stock : {ing.currentStock} {ing.unit}
                    </span>
                  </span>
                  {rankTerm && score >= 0.3 && (
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      score >= 0.7 ? 'bg-emerald-100 text-emerald-800' : 'bg-[#ECEEEA] text-[#555D58]'
                    }`}>
                      {Math.round(score * 100)}%
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {onCreateNew && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onCreateNew(); }}
              className="w-full px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-[#55A9C0] hover:bg-[#F7F7F5] border-t border-[#ECEEEA] text-left"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Créer un nouvel ingrédient</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
