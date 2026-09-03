import React, { useState, useEffect } from 'react';
import { Ingredient, InventoryAudit, IngredientTheoreticalStock } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { ClipboardCheck, CheckCircle2, AlertTriangle, X, Save, Info } from 'lucide-react';

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onSuccess: () => void;
  editingAudit?: InventoryAudit | null;
}

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  onSuccess,
  editingAudit = null
}) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [counts, setCounts] = useState<{ [id: string]: number }>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  // Stock théorique (ventes réelles × fiches techniques, reconstruit depuis le dernier inventaire validé)
  // — utilisé comme référence "attendue" au lieu du solde ledger courant, pour un vrai contrôle indépendant.
  const [theoreticalMap, setTheoreticalMap] = useState<Record<string, IngredientTheoreticalStock>>({});

  useEffect(() => {
    if (!isOpen) return;

    const initial: { [id: string]: number } = {};
    if (editingAudit && editingAudit.items) {
      editingAudit.items.forEach(item => {
        initial[item.ingredientId] = item.countedStock;
      });
      setCounts(initial);
      setNotes('');
      return;
    }

    // Nouvel audit : charger le stock théorique indépendant pour servir de référence.
    let cancelled = false;
    api.getTheoreticalStock()
      .then(rows => {
        if (cancelled) return;
        const map: Record<string, IngredientTheoreticalStock> = {};
        rows.forEach(r => { map[r.ingredientId] = r; });
        setTheoreticalMap(map);
        const initialCounts: { [id: string]: number } = {};
        ingredients.forEach(i => {
          initialCounts[i.id] = map[i.id]?.theoreticalStock ?? i.currentStock;
        });
        setCounts(initialCounts);
      })
      .catch(() => {
        // Repli silencieux sur le stock ledger si le calcul théorique échoue — l'audit reste utilisable.
        if (cancelled) return;
        const initialCounts: { [id: string]: number } = {};
        ingredients.forEach(i => { initialCounts[i.id] = i.currentStock; });
        setCounts(initialCounts);
      });
    setNotes('');

    return () => { cancelled = true; };
  }, [isOpen, editingAudit, ingredients]);

  if (!isOpen) return null;

  const handleUpdateCount = (id: string, val: number) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, val) }));
  };

  // Calculate variance summary — référence = stock théorique (si disponible et audit non déjà enregistré), sinon stock ledger courant.
  const auditItems = ingredients.map(ing => {
    const theoretical = !editingAudit ? theoreticalMap[ing.id] : undefined;
    const expected = theoretical ? theoretical.theoreticalStock : ing.currentStock;
    const actual = counts[ing.id] !== undefined ? counts[ing.id] : expected;
    const diff = Number((actual - expected).toFixed(3));
    const varianceVal = Number((diff * ing.costPerUnit).toFixed(2));
    return {
      ingredientId: ing.id,
      ingredientName: ing.name,
      expectedStock: expected,
      countedStock: actual,
      unit: ing.unit,
      unitCost: ing.costPerUnit,
      difference: diff,
      differenceValue: varianceVal,
      theoretical
    };
  });

  const totalVarianceValue = auditItems.reduce((sum, i) => sum + i.differenceValue, 0);
  // Payload envoyé à l'API : sans le détail "theoretical" (usage d'affichage local uniquement).
  const itemsForApi = auditItems.map(({ theoretical, ...item }) => item);

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      if (editingAudit) {
        await api.updateInventoryAudit(editingAudit.id, { items: itemsForApi, status: 'draft' }, currentUser?.name || 'Manager');
      } else {
        await api.createDraftInventoryAudit(itemsForApi, currentUser?.name || 'Manager');
      }
      showRouteNotification('Brouillon d\'inventaire sauvegardé', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateAudit = async () => {
    try {
      setLoading(true);
      if (editingAudit) {
        await api.updateInventoryAudit(editingAudit.id, { items: itemsForApi, status: 'validated' }, currentUser?.name || 'Manager');
      } else {
        await api.createInventoryAudit(itemsForApi, currentUser?.name || 'Manager');
      }
      showRouteNotification('Inventaire validé et stock mis à jour', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base text-[#252A27]">
                {editingAudit ? `Modifier l'Inventaire ${editingAudit.auditNumber}` : "Inventaire Physique & Ajustement de Stock"}
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Saisissez les quantités réelles constatées en réserve
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Financial Summary */}
        <div className="py-2.5 flex items-center justify-between bg-white px-3.5 rounded-xl border border-[#D9DDD8] my-2.5 shadow-2xs">
          <span className="text-xs font-bold text-[#555D58]">
            Écart financier total sur inventaire :
          </span>
          <span
            className={`font-mono font-bold text-xs sm:text-sm ${
              totalVarianceValue < 0 ? 'text-rose-800' : totalVarianceValue > 0 ? 'text-emerald-800' : 'text-[#252A27]'
            }`}
          >
            {totalVarianceValue > 0 ? `+${totalVarianceValue.toFixed(2)}` : totalVarianceValue.toFixed(3)} DT
          </span>
        </div>

        {/* Scrollable Items Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#ECEEEA] border border-[#D9DDD8] rounded-xl bg-white">
          {auditItems.map(item => (
            <div key={item.ingredientId} className="p-2.5 flex items-center justify-between gap-2.5 text-xs">
              <div className="flex-1">
                <p className="font-bold text-[#252A27]">{item.ingredientName}</p>
                <p className="text-[10px] text-[#555D58]">
                  Stock théorique : {item.expectedStock} {item.unit} &bull; {item.unitCost.toFixed(3)} DT/{item.unit}
                </p>
                {item.theoretical && (
                  item.theoretical.referenceSource === 'audit' ? (
                    <p className="text-[9px] text-[#7B8A7F] flex items-center gap-1 mt-0.5">
                      <Info className="w-2.5 h-2.5 shrink-0" />
                      <span>
                        Reconstruit depuis l'inventaire du {new Date(item.theoretical.referenceDate).toLocaleDateString('fr-FR')}
                        {' '}+ ventes réelles (fiches techniques)
                        {Math.abs(item.theoretical.ledgerDrift) > 0.01 && (
                          <> &bull; écart avec le stock ledger : {item.theoretical.ledgerDrift > 0 ? '+' : ''}{item.theoretical.ledgerDrift} {item.unit}</>
                        )}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[9px] text-amber-700 flex items-center gap-1 mt-0.5">
                      <Info className="w-2.5 h-2.5 shrink-0" />
                      <span>Aucun inventaire validé antérieur — stock ledger courant utilisé comme référence</span>
                    </p>
                  )
                )}
              </div>

              {/* Real count input */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-[#555D58]">Réel :</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={item.countedStock}
                  onChange={e => handleUpdateCount(item.ingredientId, parseFloat(e.target.value) || 0)}
                  className="w-16 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-bold text-center text-xs text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
                <span className="text-xs font-bold text-[#555D58] w-6">{item.unit}</span>
              </div>

              {/* Difference / Variance */}
              <div className="w-20 text-right">
                <span
                  className={`font-bold text-xs ${
                    item.difference < 0 ? 'text-rose-800' : item.difference > 0 ? 'text-emerald-800' : 'text-[#555D58]'
                  }`}
                >
                  {item.difference > 0 ? `+${item.difference}` : item.difference} {item.unit}
                </span>
                <p className="text-[9px] text-[#555D58]">{item.differenceValue.toFixed(3)} DT</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2.5 space-y-2">
          <input
            type="text"
            placeholder="Remarques sur cet inventaire..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
          />

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-white hover:bg-[#ECEEEA] text-[#252A27] text-xs font-bold transition-colors border border-[#D9DDD8] flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer Brouillon</span>
            </button>
            <button
              onClick={handleValidateAudit}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
            >
              {loading ? 'Validation...' : 'Valider & Appliquer au Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
