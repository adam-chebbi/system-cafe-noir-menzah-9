import React, { useState } from 'react';
import { Ingredient } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface WasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onSaved: () => void;
}

const WASTE_REASONS = [
  'Date limite de consommation dépassée (DLC)',
  'Erreur de préparation / Raté barista',
  'Rupture de chaîne du froid',
  'Casse / Emballage endommagé',
  'Fond de lot invendable'
];

export const WasteModal: React.FC<WasteModalProps> = ({ isOpen, onClose, ingredients, onSaved }) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState(WASTE_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedIng = ingredients.find(i => i.id === ingredientId) || ingredients[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId || quantity <= 0) return;

    try {
      setLoading(true);
      await api.recordWaste({
        ingredientId,
        ingredientName: selectedIng?.name || 'Ingrédient',
        quantity,
        unit: selectedIng?.unit || 'g',
        reason: 'preparation_error',
        notes: `${reason} - ${notes}`,
        recordedBy: currentUser?.name || 'Staff'
      }, currentUser?.name || 'Staff');
      showRouteNotification('Perte enregistrée et stock déduit', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">Déclaration de Perte & Gaspillage</h3>
              <p className="text-[11px] text-[#555D58]">Ajustement immédiat du stock et coût perte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Matière première / Ingrédient</label>
            <select
              value={ingredientId}
              onChange={e => setIngredientId(e.target.value)}
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
            >
              {ingredients.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Stock actuel : {i.currentStock} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#252A27]">Quantité perdue</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />
                <span className="text-xs font-bold text-[#555D58]">{selectedIng?.unit}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#252A27]">Coût estimé</label>
              <div className="p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-rose-800">
                {((selectedIng?.costPerUnit || 0) * quantity).toFixed(3)} DT
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Motif de la perte</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
            >
              {WASTE_REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Commentaire additionnel</label>
            <input
              type="text"
              placeholder="Ex: Température frigo montée à 12°C..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
            />
          </div>

          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              {loading ? 'Enregistrement...' : 'Valider la Perte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
