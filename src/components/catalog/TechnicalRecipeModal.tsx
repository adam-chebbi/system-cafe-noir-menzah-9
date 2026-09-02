import React, { useState, useEffect } from 'react';
import { Product, TechnicalRecipe, Ingredient, RecipeIngredient } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { ItemThumbnail } from '../common/ItemThumbnail';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  formatApproxQuantity,
  getCompatibleRecipeUnits,
  computeIngredientLineCost,
  type RangeCalcMode
} from '../../utils/unitConversion';
import {
  Plus, Trash2, X,
  Settings, Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface TechnicalRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}

const COMMON_ALLERGENS = [
  'Lactose / Lait', 'Gluten', 'Fruits à coque', 'Soja',
  'Arachides', 'Oeufs', 'Graines de sésame', 'Moutarde'
];

const RANGE_MODE_LABELS: Record<RangeCalcMode, string> = {
  max: 'Borne haute (prudent) — recommandé',
  median: 'Médiane (équilibré)',
  min: 'Borne basse (optimiste)'
};

const RANGE_MODE_SHORT: Record<RangeCalcMode, string> = {
  max: 'borne max',
  median: 'médiane',
  min: 'borne min'
};

/** Ligne d'ingrédient en cours de saisie dans le formulaire */
interface IngredientFormRow {
  ingredientId: string;
  ingredientName: string;
  quantityMin: number;
  quantityMax: number | undefined; // undefined = valeur unique
  recipeUnit: string;
  stockUnit: string;
  unitCost: number;
}

/** Convertit une IngredientFormRow vers RecipeIngredient pour l'envoi API */
function rowToRecipeIngredient(row: IngredientFormRow, mode: RangeCalcMode): RecipeIngredient {
  let calcQtyInStockUnit = row.quantityMin;
  let lineCost = row.quantityMin * row.unitCost;

  try {
    ({ calcQtyInStockUnit, lineCost } = computeIngredientLineCost(
      row.quantityMin,
      row.quantityMax,
      row.recipeUnit,
      row.stockUnit,
      row.unitCost,
      mode
    ));
  } catch (_) {
    // fallback : quantityMin brut
  }

  return {
    ingredientId: row.ingredientId,
    ingredientName: row.ingredientName,
    quantityMin: row.quantityMin,
    quantityMax: row.quantityMax,
    recipeUnit: row.recipeUnit,
    quantity: Number(calcQtyInStockUnit.toFixed(6)),
    unit: row.stockUnit,
    unitCost: row.unitCost,
    totalCost: Number(lineCost.toFixed(4)),
    displayQuantity: formatApproxQuantity(row.quantityMin, row.quantityMax, row.recipeUnit)
  };
}

/** Convertit un RecipeIngredient stocké vers la form row pour l'édition */
function recipeIngToRow(item: RecipeIngredient, catalog: Ingredient[]): IngredientFormRow {
  const ing = catalog.find(i => i.id === item.ingredientId);
  const stockUnit = ing?.unit ?? item.unit;
  return {
    ingredientId: item.ingredientId,
    ingredientName: item.ingredientName,
    quantityMin: item.quantityMin ?? item.quantity,
    quantityMax: item.quantityMax,
    recipeUnit: item.recipeUnit ?? stockUnit,
    stockUnit,
    unitCost: item.unitCost
  };
}

export const TechnicalRecipeModal: React.FC<TechnicalRecipeModalProps> = ({
  isOpen, onClose, product, onSaved
}) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();

  const [ingredientsCatalog, setIngredientsCatalog] = useState<Ingredient[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rangeCalcMode, setRangeCalcMode] = useState<RangeCalcMode>('max');
  const [savingMode, setSavingMode] = useState(false);

  const [recipe, setRecipe] = useState<Partial<TechnicalRecipe>>({
    portionYield: 1,
    preparationTimeMinutes: 3,
    ingredients: [],
    suggestedSellingPrice: 0,
    allergens: [],
    preparationSteps: [''],
    notes: ''
  });

  // Lignes du formulaire (état éditable)
  const [rows, setRows] = useState<IngredientFormRow[]>([]);

  useEffect(() => {
    if (!isOpen || !product) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [ings, recipes, settings] = await Promise.all([
          api.getIngredients(),
          api.getRecipes(),
          api.getSettings()
        ]);
        setIngredientsCatalog(ings);
        setRangeCalcMode(settings.recipeRangeCalcMode || 'max');

        const existing = recipes.find(r => r.productId === product.id);
        if (existing) {
          setRecipe(existing);
          setRows(existing.ingredients.map(item => recipeIngToRow(item, ings)));
        } else {
          setRecipe({
            productId: product.id,
            productName: product.name,
            portionYield: 1,
            preparationTimeMinutes: 3,
            ingredients: [],
            suggestedSellingPrice: product.price,
            allergens: [],
            preparationSteps: [''],
            notes: ''
          });
          setRows([]);
        }
      } catch (err) {
        console.error('Failed to load recipe data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // ── Gestion des lignes d'ingrédients ──────────────────────────────────

  const handleAddIngredient = () => {
    if (ingredientsCatalog.length === 0) return;
    const defaultIng = ingredientsCatalog[0];
    setRows(prev => [...prev, {
      ingredientId: defaultIng.id,
      ingredientName: defaultIng.name,
      quantityMin: 1,
      quantityMax: undefined,
      recipeUnit: defaultIng.unit,
      stockUnit: defaultIng.unit,
      unitCost: defaultIng.costPerUnit
    }]);
  };

  const handleChangeIngredient = (idx: number, ingId: string) => {
    const ing = ingredientsCatalog.find(i => i.id === ingId);
    if (!ing) return;
    setRows(prev => prev.map((r, i) => i !== idx ? r : {
      ...r,
      ingredientId: ing.id,
      ingredientName: ing.name,
      stockUnit: ing.unit,
      recipeUnit: ing.unit, // reset to stock unit on ingredient change
      unitCost: ing.costPerUnit,
      quantityMin: r.quantityMin,
      quantityMax: r.quantityMax
    }));
  };

  const handleChangeRecipeUnit = (idx: number, unit: string) => {
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, recipeUnit: unit }));
  };

  const handleChangeMin = (idx: number, val: number) => {
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, quantityMin: val }));
  };

  const handleChangeMax = (idx: number, val: string) => {
    const parsed = val === '' ? undefined : parseFloat(val) || undefined;
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, quantityMax: parsed }));
  };

  const handleRemove = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Calcul KPIs ────────────────────────────────────────────────────────

  const totalIngredientsCost = rows.reduce((sum, row) => {
    try {
      const { lineCost } = computeIngredientLineCost(
        row.quantityMin, row.quantityMax, row.recipeUnit, row.stockUnit, row.unitCost, rangeCalcMode
      );
      return sum + lineCost;
    } catch {
      return sum + row.quantityMin * row.unitCost;
    }
  }, 0);

  const sellingPrice = recipe.suggestedSellingPrice || product.price || 1;
  const grossMargin = sellingPrice - totalIngredientsCost;
  const marginPercentage = Number(((grossMargin / sellingPrice) * 100).toFixed(1));
  const foodCostRatio = Number(((totalIngredientsCost / sellingPrice) * 100).toFixed(1));

  // ── Allergens ──────────────────────────────────────────────────────────

  const handleToggleAllergen = (allergen: string) => {
    const current = recipe.allergens || [];
    setRecipe({
      ...recipe,
      allergens: current.includes(allergen)
        ? current.filter(a => a !== allergen)
        : [...current, allergen]
    });
  };

  // ── Mode de calcul ─────────────────────────────────────────────────────

  const handleSaveMode = async (newMode: RangeCalcMode) => {
    setSavingMode(true);
    try {
      await api.updateSettings({ recipeRangeCalcMode: newMode }, currentUser?.name || 'Admin');
      setRangeCalcMode(newMode);
      showRouteNotification(`Mode de calcul mis à jour : ${RANGE_MODE_SHORT[newMode]}`, 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setSavingMode(false);
    }
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const recipeIngredients = rows.map(row => rowToRecipeIngredient(row, rangeCalcMode));
      await api.saveRecipe({
        ...recipe,
        productId: product.id,
        productName: product.name,
        suggestedSellingPrice: sellingPrice,
        totalIngredientsCost: Number(totalIngredientsCost.toFixed(2)),
        targetMarginPercentage: marginPercentage,
        ingredients: recipeIngredients
      } as any, currentUser?.name || 'Admin');

      showRouteNotification('Fiche technique enregistrée avec succès', 'success');
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
      <div className="bg-[#F2F3F0] rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
          <div className="flex items-center space-x-2.5">
            <ItemThumbnail
              src={product.imageUrl} alt={product.name}
              category={product.categoryId} size="lg" rounded="xl"
            />
            <div>
              <h3 className="font-serif font-black text-base text-[#252A27]">
                Fiche Technique : {product.name}
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Quantités ≈ par portion · Conversion unités automatique · Sans IA
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-[#D9DDD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#555D58] uppercase">Coût Matière</span>
              <p className="text-sm sm:text-base font-mono font-bold text-[#252A27] mt-0.5">
                {totalIngredientsCost.toFixed(3)} DT
              </p>
              <span className="text-[10px] text-[#555D58]">{foodCostRatio}% du PV · {RANGE_MODE_SHORT[rangeCalcMode]}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#D9DDD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#555D58] uppercase">Prix Vente TTC</span>
              <p className="text-sm sm:text-base font-mono font-bold text-[#252A27] mt-0.5">
                {sellingPrice.toFixed(3)} DT
              </p>
              <span className="text-[10px] text-[#555D58]">Marge: {grossMargin.toFixed(3)} DT</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[#D9DDD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#555D58] uppercase">Taux Marge</span>
              <p className={`text-sm sm:text-base font-mono font-bold mt-0.5 ${marginPercentage >= 70 ? 'text-emerald-800' : 'text-amber-800'}`}>
                {marginPercentage} %
              </p>
              <span className="text-[10px] text-[#555D58]">Cible: ≥70%</span>
            </div>
          </div>

          {/* Mode de calcul — panneau paramètre */}
          <div className="rounded-xl border border-[#D9DDD8] bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSettings(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[#252A27] hover:bg-[#F7F7F5] transition-colors"
            >
              <span className="flex items-center space-x-1.5">
                <Settings className="w-3.5 h-3.5 text-[#555D58]" />
                <span>Mode de calcul pour les plages : <span className="text-emerald-700">{RANGE_MODE_SHORT[rangeCalcMode]}</span></span>
              </span>
              {showSettings ? <ChevronUp className="w-3.5 h-3.5 text-[#555D58]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#555D58]" />}
            </button>

            {showSettings && (
              <div className="px-3 pb-3 space-y-2 border-t border-[#ECEEEA] pt-2">
                <p className="text-[10px] text-[#555D58]">
                  <Info className="w-3 h-3 inline mr-1" />
                  Lorsqu'une plage (min–max) est saisie, quelle valeur est utilisée pour les calculs de coût et de déduction de stock ?
                </p>
                {(['max', 'median', 'min'] as RangeCalcMode[]).map(m => (
                  <label key={m} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio" name="rangeMode" value={m}
                      checked={rangeCalcMode === m}
                      onChange={() => handleSaveMode(m)}
                      disabled={savingMode}
                      className="accent-[#252A27]"
                    />
                    <span className={`text-xs ${rangeCalcMode === m ? 'font-bold text-[#252A27]' : 'text-[#555D58]'}`}>
                      {RANGE_MODE_LABELS[m]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Ingrédients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#252A27] uppercase tracking-wide">
                Ingrédients &amp; Dosages par Portion
              </label>
              <button
                type="button" onClick={handleAddIngredient}
                className="flex items-center space-x-1 text-xs font-bold text-[#252A27] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter ingrédient</span>
              </button>
            </div>

            <div className="border border-[#D9DDD8] rounded-xl overflow-hidden divide-y divide-[#ECEEEA] bg-white">
              {rows.length === 0 ? (
                <div className="p-5 text-center text-xs text-[#555D58]">
                  Aucun ingrédient configuré. Cliquez sur "Ajouter ingrédient" pour lier les matières premières.
                </div>
              ) : (
                rows.map((row, idx) => {
                  const selectedIng = ingredientsCatalog.find(i => i.id === row.ingredientId);
                  const compatibleUnits = getCompatibleRecipeUnits(row.stockUnit);
                  const displayStr = formatApproxQuantity(row.quantityMin, row.quantityMax, row.recipeUnit);
                  const isRange = row.quantityMax !== undefined && row.quantityMax !== row.quantityMin;

                  let lineCostDisplay = '—';
                  try {
                    const { lineCost } = computeIngredientLineCost(
                      row.quantityMin, row.quantityMax, row.recipeUnit,
                      row.stockUnit, row.unitCost, rangeCalcMode
                    );
                    lineCostDisplay = lineCost.toFixed(3) + ' DT';
                  } catch (_) {}

                  return (
                    <div key={idx} className="p-2.5 space-y-2">
                      {/* Row 1: ingredient selector + remove */}
                      <div className="flex items-center space-x-2">
                        <ItemThumbnail
                          src={selectedIng?.imageUrl} alt={row.ingredientName}
                          category={selectedIng?.category} type="ingredient" size="sm" rounded="lg"
                        />
                        <select
                          value={row.ingredientId}
                          onChange={e => handleChangeIngredient(idx, e.target.value)}
                          className="flex-1 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                        >
                          {ingredientsCatalog.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.costPerUnit.toFixed(3)} DT / {ing.unit})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button" onClick={() => handleRemove(idx)}
                          className="p-1 text-[#555D58] hover:text-rose-700 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Row 2: quantité min / max / unité recette */}
                      <div className="flex items-center gap-2 pl-8">
                        {/* Symbole ≈ */}
                        <span className="text-sm font-bold text-[#555D58]">≈</span>

                        {/* Min */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number" step="0.1" min="0.01"
                            value={row.quantityMin}
                            onChange={e => handleChangeMin(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                            title="Valeur unique ou borne basse de la plage"
                          />
                          <span className="text-[9px] text-[#888] mt-0.5">{isRange ? 'min' : 'valeur'}</span>
                        </div>

                        {/* Séparateur */}
                        <span className="text-xs text-[#AAAAAA]">–</span>

                        {/* Max (optionnel) */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number" step="0.1" min="0.01"
                            value={row.quantityMax ?? ''}
                            placeholder="max"
                            onChange={e => handleChangeMax(idx, e.target.value)}
                            className="w-16 p-1.5 bg-[#F7F7F5] border border-dashed border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#555D58] placeholder:text-[#CCC]"
                            title="Optionnel : borne haute de la plage"
                          />
                          <span className="text-[9px] text-[#888] mt-0.5">max (opt.)</span>
                        </div>

                        {/* Unité recette */}
                        <select
                          value={row.recipeUnit}
                          onChange={e => handleChangeRecipeUnit(idx, e.target.value)}
                          className="p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                          title="Unité d'affichage en recette (indépendante de l'unité stock)"
                        >
                          {compatibleUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>

                        {/* Affichage ≈ résultant + coût */}
                        <div className="flex-1 flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#2B6245] text-[10px] font-bold border border-[#C5E8D5]">
                            {displayStr}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#252A27] ml-2">
                            {lineCostDisplay}
                          </span>
                        </div>
                      </div>

                      {/* Info stock conversion si unité différente */}
                      {row.recipeUnit !== row.stockUnit && (
                        <div className="pl-8">
                          <p className="text-[10px] text-[#7B8A7F] italic">
                            Stock en <strong>{row.stockUnit}</strong> — calcul interne en {row.stockUnit} · affiché toujours en {row.recipeUnit}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Allergènes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#252A27] uppercase tracking-wide">
              Allergènes Présents
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ALLERGENS.map(all => {
                const isSelected = (recipe.allergens || []).includes(all);
                return (
                  <button
                    key={all} type="button" onClick={() => handleToggleAllergen(all)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#252A27] text-white border-[#252A27]'
                        : 'bg-white text-[#555D58] border-[#D9DDD8] hover:bg-[#ECEEEA]'
                    }`}
                  >
                    {all}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27] uppercase tracking-wide">
              Instructions de Préparation &amp; Standard Barista
            </label>
            <textarea
              rows={2}
              value={recipe.notes || ''}
              onChange={e => setRecipe({ ...recipe, notes: e.target.value })}
              placeholder="Ex: Extraction espresso 25s (≈18g in, ≈36g out), texturer le lait à 65°C..."
              className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#D9DDD8] flex space-x-2">
            {product.hasRecipe && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200"
              >
                Supprimer Fiche
              </button>
            )}
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
            >
              {loading ? 'Enregistrement...' : 'Valider la Fiche'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Supprimer la fiche technique"
        message={`Voulez-vous supprimer définitivement la fiche technique pour "${product.name}" ? Le produit restera dans le catalogue mais n'aura plus de déduction automatique de stock.`}
        variant="danger"
        confirmLabel="Supprimer la fiche"
        onConfirm={async () => {
          try {
            await api.deleteRecipe(product.id, currentUser?.name || 'Admin');
            showRouteNotification(`Fiche technique de "${product.name}" supprimée`, 'success');
            setDeleteConfirmOpen(false);
            onSaved();
            onClose();
          } catch (err: any) {
            showRouteNotification(`Erreur: ${err.message}`, 'error');
          }
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
