import React, { useState } from 'react';
import { ProductLabelMapping, Supplier, Ingredient } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { IngredientPicker } from '../common/IngredientPicker';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Link2, Search, Trash2, Repeat } from 'lucide-react';

interface ProductMappingsPanelProps {
  mappings: ProductLabelMapping[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  onUpdated: () => void;
}

export const ProductMappingsPanel: React.FC<ProductMappingsPanelProps> = ({ mappings, suppliers, ingredients, onUpdated }) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProductLabelMapping | null>(null);

  const q = searchQuery.toLowerCase();
  const filtered = mappings.filter(m =>
    (!supplierFilter || m.supplierId === supplierFilter) &&
    (!q || m.rawLabel.toLowerCase().includes(q) || m.ingredientName.toLowerCase().includes(q) || m.supplierName.toLowerCase().includes(q))
  );

  const grouped = new Map<string, ProductLabelMapping[]>();
  for (const m of filtered) {
    const list = grouped.get(m.supplierName) || [];
    list.push(m);
    grouped.set(m.supplierName, list);
  }
  const groupNames = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  const handleReassign = async (mapping: ProductLabelMapping, ingredientId: string | undefined, ingredient?: Ingredient) => {
    if (!ingredientId || !ingredient) return;
    try {
      await api.updateProductMapping(mapping.id, { ingredientId, ingredientName: ingredient.name }, currentUser?.name || 'Admin');
      showRouteNotification(`Correspondance "${mapping.rawLabel}" réassignée à "${ingredient.name}"`, 'success');
      onUpdated();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteProductMapping(deleteTarget.id, currentUser?.name || 'Admin');
      showRouteNotification(`Correspondance "${deleteTarget.rawLabel}" supprimée`, 'success');
      setDeleteTarget(null);
      onUpdated();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#55A9C0]/15 text-[#55A9C0] flex items-center justify-center shrink-0 border border-[#55A9C0]/30">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-black text-sm text-[#252A27]">Correspondances Produits</h3>
            <p className="text-[11px] text-[#555D58]">
              Quand un libellé d'article sur une facture ne correspond pas exactement à un ingrédient, l'administrateur peut mémoriser la correspondance
              lors de la vérification OCR ("Mémoriser cette correspondance"). Elle est ensuite appliquée automatiquement — mais toujours affichée clairement — sur les prochaines factures du même fournisseur. Vous pouvez les corriger ou les supprimer ici à tout moment.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par libellé, ingrédient ou fournisseur..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
          >
            <option value="">Tous les fournisseurs</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9DDD8] p-10 text-center text-xs text-[#555D58]">
          {mappings.length === 0
            ? "Aucune correspondance mémorisée pour l'instant. Elles apparaîtront ici dès qu'une sera enregistrée pendant la vérification d'une facture scannée (OCR)."
            : 'Aucune correspondance ne correspond à votre recherche.'}
        </div>
      ) : (
        <div className="space-y-4">
          {groupNames.map(supplierName => (
            <div key={supplierName} className="bg-white rounded-xl border border-[#D9DDD8] overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-[#F2F3F0] border-b border-[#D9DDD8] text-[11px] font-bold text-[#252A27] uppercase tracking-wide">
                {supplierName} ({grouped.get(supplierName)!.length})
              </div>
              <div className="divide-y divide-[#ECEEEA]">
                {grouped.get(supplierName)!.map(mapping => (
                  <div key={mapping.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#252A27] block truncate" title={mapping.rawLabel}>
                        "{mapping.rawLabel}"
                      </span>
                      <span className="text-[10px] text-[#555D58]">
                        Utilisée {mapping.timesApplied} fois &bull; Créée le {new Date(mapping.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Repeat className="w-3.5 h-3.5 text-[#8A9089]" />
                      <div className="w-56">
                        <IngredientPicker
                          ingredients={ingredients}
                          value={mapping.ingredientId}
                          contextLabel={mapping.rawLabel}
                          onChange={(id, ing) => handleReassign(mapping, id, ing)}
                        />
                      </div>
                      <button
                        onClick={() => setDeleteTarget(mapping)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        title="Supprimer cette correspondance"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Supprimer la correspondance"
        message={deleteTarget ? `Voulez-vous supprimer la correspondance "${deleteTarget.rawLabel}" → "${deleteTarget.ingredientName}" ? Les prochaines factures de ${deleteTarget.supplierName} avec ce libellé devront être rattachées à nouveau manuellement.` : ''}
        variant="danger"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
