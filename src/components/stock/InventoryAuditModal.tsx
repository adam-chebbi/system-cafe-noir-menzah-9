import React, { useState, useEffect, useMemo } from 'react';
import { Ingredient, InventoryAudit, IngredientTheoreticalStock, StockZone } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { ClipboardCheck, AlertTriangle, X, Save, Info } from 'lucide-react';
import { ZONE_LABELS, STOCK_ZONES } from '../../utils/stockZones';
import { INGREDIENT_CATEGORY_LABELS } from '../../utils/ingredientCategories';

interface InventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onSuccess: () => void;
  editingAudit?: InventoryAudit | null;
}

type ScopeType = InventoryAudit['scopeType'];

const key = (ingredientId: string, zone: StockZone) => `${ingredientId}__${zone}`;

export const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  onSuccess,
  editingAudit = null
}) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [applyMap, setApplyMap] = useState<{ [key: string]: boolean }>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [theoreticalMap, setTheoreticalMap] = useState<Record<string, IngredientTheoreticalStock>>({});

  // Portée de l'inventaire (Complet / Par catégorie / Par zone)
  const [scopeType, setScopeType] = useState<ScopeType>(editingAudit?.scopeType || 'full');
  const [scopeCategory, setScopeCategory] = useState<Ingredient['category'] | ''>(editingAudit?.scopeCategory || '');
  const [scopeZone, setScopeZone] = useState<StockZone | ''>(editingAudit?.scopeZone || '');
  const [scopeConfirmed, setScopeConfirmed] = useState<boolean>(!!editingAudit);

  const availableCategories = useMemo(
    () => Array.from(new Set(ingredients.map(i => i.category))),
    [ingredients]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (editingAudit) {
      setScopeType(editingAudit.scopeType);
      setScopeCategory(editingAudit.scopeCategory || '');
      setScopeZone(editingAudit.scopeZone || '');
      setScopeConfirmed(true);
      const initialCounts: { [key: string]: number } = {};
      const initialApply: { [key: string]: boolean } = {};
      (editingAudit.items || []).forEach(item => {
        const k = key(item.ingredientId, item.zone);
        initialCounts[k] = item.countedStock;
        initialApply[k] = item.applyAdjustment !== false;
      });
      setCounts(initialCounts);
      setApplyMap(initialApply);
      setNotes('');
      return;
    }

    setScopeType('full');
    setScopeCategory('');
    setScopeZone('');
    setScopeConfirmed(false);
    setCounts({});
    setApplyMap({});
    setNotes('');
  }, [isOpen, editingAudit]);

  useEffect(() => {
    if (!isOpen || editingAudit || !scopeConfirmed) return;

    let cancelled = false;
    api.getTheoreticalStock()
      .then(rows => {
        if (cancelled) return;
        const map: Record<string, IngredientTheoreticalStock> = {};
        rows.forEach(r => { map[r.ingredientId] = r; });
        setTheoreticalMap(map);
      })
      .catch(() => { /* Repli silencieux sur le stock ledger si le calcul théorique échoue */ });

    return () => { cancelled = true; };
  }, [isOpen, editingAudit, scopeConfirmed]);

  if (!isOpen) return null;

  const handleUpdateCount = (k: string, val: number) => {
    setCounts(prev => ({ ...prev, [k]: val }));
  };

  const toggleApply = (k: string) => {
    setApplyMap(prev => ({ ...prev, [k]: prev[k] === false ? true : false }));
  };

  // Portée : quels ingrédients et quelles zones sont concernés par ce comptage.
  const scopedIngredients = scopeType === 'category' && scopeCategory
    ? ingredients.filter(i => i.category === scopeCategory)
    : ingredients;
  const scopedZones: StockZone[] = scopeType === 'zone' && scopeZone ? [scopeZone] : STOCK_ZONES;

  const auditItems = editingAudit
    ? (editingAudit.items || []).map(item => {
        const k = key(item.ingredientId, item.zone);
        const ing = ingredients.find(i => i.id === item.ingredientId);
        const actual = counts[k] !== undefined ? counts[k] : item.countedStock;
        const diff = Number((actual - item.expectedStock).toFixed(3));
        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          zone: item.zone,
          expectedStock: item.expectedStock,
          countedStock: actual,
          unit: item.unit,
          unitCost: ing?.costPerUnit ?? item.unitCost,
          difference: diff,
          differenceValue: Number((diff * (ing?.costPerUnit ?? item.unitCost)).toFixed(2)),
          applyAdjustment: applyMap[k] !== false,
          theoretical: undefined as IngredientTheoreticalStock | undefined,
          key: k
        };
      })
    : scopedIngredients.flatMap(ing =>
        scopedZones.map(zone => {
          const k = key(ing.id, zone);
          const theoretical = zone === 'reserve_principale' ? theoreticalMap[ing.id] : undefined;
          const expected = theoretical ? theoretical.theoreticalStock : ing.stockByZone[zone];
          const actual = counts[k] !== undefined ? counts[k] : expected;
          const diff = Number((actual - expected).toFixed(3));
          return {
            ingredientId: ing.id,
            ingredientName: ing.name,
            zone,
            expectedStock: expected,
            countedStock: actual,
            unit: ing.unit,
            unitCost: ing.costPerUnit,
            difference: diff,
            differenceValue: Number((diff * ing.costPerUnit).toFixed(2)),
            applyAdjustment: applyMap[k] !== false,
            theoretical,
            key: k
          };
        })
      );

  const totalVarianceValue = auditItems.reduce((sum, i) => sum + i.differenceValue, 0);
  const itemsForApi = auditItems.map(({ theoretical, key: _k, ...item }) => item);

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      if (editingAudit) {
        await api.updateInventoryAudit(editingAudit.id, { items: itemsForApi, status: 'draft' }, currentUser?.name || 'Manager');
      } else {
        await api.createDraftInventoryAudit(itemsForApi, currentUser?.name || 'Manager', {
          scopeType,
          scopeCategory: scopeCategory || undefined,
          scopeZone: scopeZone || undefined
        });
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
        await api.createInventoryAudit(itemsForApi, currentUser?.name || 'Manager', {
          scopeType,
          scopeCategory: scopeCategory || undefined,
          scopeZone: scopeZone || undefined
        });
      }
      showRouteNotification('Inventaire validé et stock mis à jour selon vos choix ligne par ligne', 'success');
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
                {scopeConfirmed ? 'Saisissez les quantités réelles constatées' : "Choisissez d'abord la portée du comptage"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {!scopeConfirmed ? (
          /* ÉTAPE 1 : PORTÉE DE L'INVENTAIRE */
          <div className="py-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['full', 'category', 'zone'] as ScopeType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setScopeType(t)}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                    scopeType === t
                      ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]'
                      : 'bg-white text-[#252A27] border-[#D9DDD8]'
                  }`}
                >
                  {t === 'full' ? 'Inventaire Complet' : t === 'category' ? 'Par Catégorie' : 'Par Zone'}
                </button>
              ))}
            </div>

            {scopeType === 'category' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Catégorie à auditer</label>
                <select
                  value={scopeCategory}
                  onChange={e => setScopeCategory(e.target.value as Ingredient['category'])}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="">Sélectionner une catégorie...</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{INGREDIENT_CATEGORY_LABELS[c] || c}</option>
                  ))}
                </select>
              </div>
            )}

            {scopeType === 'zone' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Zone à auditer</label>
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_ZONES.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setScopeZone(z)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                        scopeZone === z
                          ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]'
                          : 'bg-white text-[#252A27] border-[#D9DDD8]'
                      }`}
                    >
                      {ZONE_LABELS[z]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setScopeConfirmed(true)}
              disabled={(scopeType === 'category' && !scopeCategory) || (scopeType === 'zone' && !scopeZone)}
              className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] disabled:opacity-40 disabled:cursor-not-allowed text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
            >
              Commencer le Comptage
            </button>
          </div>
        ) : (
          <>
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
                <div key={item.key} className="p-2.5 flex items-center justify-between gap-2.5 text-xs">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <p className="font-bold text-[#252A27]">{item.ingredientName}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                        {ZONE_LABELS[item.zone]}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#555D58]">
                      Stock attendu : {item.expectedStock} {item.unit} &bull; {item.unitCost.toFixed(3)} DT/{item.unit}
                    </p>
                    {item.theoretical && (
                      item.theoretical.referenceSource === 'audit' ? (
                        <p className="text-[9px] text-[#7B8A7F] flex items-center gap-1 mt-0.5">
                          <Info className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            Théorique depuis l'inventaire du {new Date(item.theoretical.referenceDate).toLocaleDateString('fr-FR')} + ventes réelles
                          </span>
                        </p>
                      ) : (
                        <p className="text-[9px] text-amber-700 flex items-center gap-1 mt-0.5">
                          <Info className="w-2.5 h-2.5 shrink-0" />
                          <span>Aucun inventaire validé antérieur — stock ledger utilisé comme référence</span>
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
                      value={item.countedStock}
                      onChange={e => handleUpdateCount(item.key, parseFloat(e.target.value) || 0)}
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

                  {/* Manual choice: adjust to real vs keep theoretical */}
                  <label className="flex items-center space-x-1 shrink-0 cursor-pointer" title="Décoché = garder le stock théorique, ne pas appliquer cet écart">
                    <input
                      type="checkbox"
                      checked={item.applyAdjustment}
                      onChange={() => toggleApply(item.key)}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[9px] font-bold text-[#555D58] w-14 leading-tight">
                      {item.applyAdjustment ? 'Ajuster' : 'Garder théo.'}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-2.5 space-y-2">
              <p className="text-[10px] text-[#7B8A7F] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>L'écart est toujours conservé dans l'historique, même pour les lignes non ajustées.</span>
              </p>
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
          </>
        )}
      </div>
    </div>
  );
};
