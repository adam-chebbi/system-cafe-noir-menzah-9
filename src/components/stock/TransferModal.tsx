import React, { useState } from 'react';
import { Ingredient, StockZone } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { ArrowLeftRight, X } from 'lucide-react';
import { ZONE_LABELS, STOCK_ZONES } from '../../utils/stockZones';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onSaved: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, ingredients, onSaved }) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id || '');
  const [fromZone, setFromZone] = useState<StockZone>('depot');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('Réapprovisionnement de la Réserve principale');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedIng = ingredients.find(i => i.id === ingredientId) || ingredients[0];
  const toZone: StockZone = STOCK_ZONES.find(z => z !== fromZone) as StockZone;
  const fromStock = selectedIng?.stockByZone?.[fromZone] ?? 0;
  const toStock = selectedIng?.stockByZone?.[toZone] ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId || quantity <= 0) return;

    try {
      setLoading(true);
      await api.transferStock({
        ingredientId,
        fromZone,
        toZone,
        quantity,
        reason,
        comment: comment || undefined
      }, currentUser?.name || 'Staff');
      showRouteNotification(`Transfert enregistré : ${ZONE_LABELS[fromZone]} → ${ZONE_LABELS[toZone]}`, 'success');
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
            <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">Transfert entre Zones</h3>
              <p className="text-[11px] text-[#555D58]">Mouvement lié automatiquement, sans changer la valeur du stock</p>
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
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <div className="flex-1 text-center p-2.5 rounded-lg bg-white border border-[#D9DDD8]">
              <span className="text-[10px] font-bold text-[#555D58] block">Depuis</span>
              <span className="text-xs font-bold text-[#252A27]">{ZONE_LABELS[fromZone]}</span>
              <span className="block text-[9px] text-[#555D58]">{fromStock} {selectedIng?.unit} disponible</span>
            </div>
            <button
              type="button"
              onClick={() => setFromZone(toZone)}
              className="p-2 rounded-lg bg-[#252A27] text-[#A4DEC2] shrink-0"
              title="Inverser le sens du transfert"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 text-center p-2.5 rounded-lg bg-white border border-[#D9DDD8]">
              <span className="text-[10px] font-bold text-[#555D58] block">Vers</span>
              <span className="text-xs font-bold text-[#252A27]">{ZONE_LABELS[toZone]}</span>
              <span className="block text-[9px] text-[#555D58]">{toStock} {selectedIng?.unit} actuellement</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Quantité à transférer ({selectedIng?.unit})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Motif</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Commentaire (optionnel)</label>
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
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
              className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
            >
              {loading ? 'Transfert...' : 'Confirmer le Transfert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
