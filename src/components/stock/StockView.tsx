import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ingredient, StockMovement, StockWaste as WasteRecord, InventoryAudit } from '../../types/index';
import { WasteModal } from './WasteModal';
import { InventoryAuditModal } from './InventoryAuditModal';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ItemThumbnail } from '../common/ItemThumbnail';
import { ImageInputControl } from '../common/ImageInputControl';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ClipboardCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Search,
  CheckCircle2,
  X,
  History,
  DollarSign,
  Edit2,
  RefreshCw,
  Clock,
  FileText
} from 'lucide-react';

export const StockView: React.FC = () => {
  const {
    globalVersion,
    refreshAlerts,
    triggerGlobalRefresh,
    currentSubTab,
    setCurrentSubTab,
    currentAction,
    setCurrentAction,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [wastes, setWastes] = useState<WasteRecord[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'wastes' | 'audits'>('inventory');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  const hasValidatedIdRef = useRef(false);

  // Modals
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<InventoryAudit | null>(null);

  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState<Partial<Ingredient>>({
    name: '',
    category: 'coffee',
    currentStock: 10,
    unit: 'kg',
    minStockThreshold: 3,
    costPerUnit: 15.0,
    supplierId: '',
    imageUrl: ''
  });

  // Quick manual adjustment
  const [quickMovementIng, setQuickMovementIng] = useState<Ingredient | null>(null);
  const [quickMovementQty, setQuickMovementQty] = useState<number>(1);
  const [quickMovementType, setQuickMovementType] = useState<'in' | 'out'>('in');
  const [loading, setLoading] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmLabel: string;
    reasonLabel?: string;
    reasonRequired?: boolean;
    onConfirm: (reason?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirmer',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (currentSubTab === 'inventory') setActiveTab('inventory');
    else if (currentSubTab === 'movements') setActiveTab('movements');
    else if (currentSubTab === 'wastes') setActiveTab('wastes');
    else if (currentSubTab === 'audits') setActiveTab('audits');

    if (currentAction === 'audit_modal') {
      setEditingAudit(null);
      setIsAuditModalOpen(true);
    } else if (currentAction === 'waste_modal') {
      setIsWasteModalOpen(true);
    } else if (currentAction === 'new_ingredient') {
      openCreateIngredientModal();
    }
  }, [currentSubTab, currentAction]);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const [ings, movs, wst, auds] = await Promise.all([
        api.getIngredients(),
        api.getStockMovements(),
        api.getStockWastes(),
        api.getInventoryAudits()
      ]);
      setIngredients(ings);
      setMovements(movs);
      setWastes(wst);
      setAudits(auds);

      // Deep link ID handling
      if (currentRecordId) {
        const foundIng = ings.find(i => i.id === currentRecordId);
        if (foundIng) {
          setActiveTab('inventory');
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`L'ingrédient demandé (ID: "${currentRecordId}") est introuvable.`, 'warning');
        }
        hasValidatedIdRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, [globalVersion]);

  // Ingredient Form Handlers
  const openCreateIngredientModal = () => {
    setEditingIngredient(null);
    setIngredientForm({
      name: '',
      category: 'coffee',
      currentStock: 10,
      unit: 'kg',
      minStockThreshold: 3,
      costPerUnit: 15.0,
      supplierId: '',
      imageUrl: ''
    });
    setIsIngredientModalOpen(true);
  };

  const openEditIngredientModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setIngredientForm({
      name: ing.name,
      category: ing.category,
      currentStock: ing.currentStock,
      unit: ing.unit,
      minStockThreshold: ing.minStockThreshold || (ing as any).minThreshold || 1,
      costPerUnit: ing.costPerUnit,
      supplierId: ing.supplierId || '',
      imageUrl: ing.imageUrl || ''
    });
    setIsIngredientModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientForm.name) return;

    try {
      const payload: Partial<Ingredient> = {
        name: ingredientForm.name,
        category: (ingredientForm.category as any) || 'coffee',
        currentStock: Number(ingredientForm.currentStock) || 0,
        unit: (ingredientForm.unit as any) || 'kg',
        minStockThreshold: Number(ingredientForm.minStockThreshold) || 1,
        costPerUnit: Number(ingredientForm.costPerUnit) || 1,
        supplierId: ingredientForm.supplierId,
        imageUrl: ingredientForm.imageUrl
      };

      if (editingIngredient) {
        const updated = await api.updateIngredient(editingIngredient.id, payload, currentUser?.name || 'Admin');
        setIngredients(prev => prev.map(i => i.id === updated.id ? updated : i));
        showRouteNotification(`Matière première "${ingredientForm.name}" mise à jour`, 'success');
      } else {
        const created = await api.createIngredient(payload, currentUser?.name || 'Admin');
        setIngredients(prev => [created, ...prev]);
        showRouteNotification(`Matière première "${ingredientForm.name}" créée`, 'success');
      }

      setIsIngredientModalOpen(false);
      triggerGlobalRefresh();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleDeleteIngredient = (ing: Ingredient) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la matière première',
      message: `Êtes-vous sûr de vouloir supprimer "${ing.name}" ? Vérifiez qu'aucune fiche recette active ne dépend de cet ingrédient.`,
      variant: 'danger',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try {
          await api.deleteIngredient(ing.id, currentUser?.name || 'Admin');
          setIngredients(prev => prev.filter(i => i.id !== ing.id));
          showRouteNotification(`Matière "${ing.name}" supprimée`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  // Stock Movement Handlers
  const handleQuickMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMovementIng) return;

    try {
      const delta = quickMovementType === 'in' ? quickMovementQty : -quickMovementQty;
      await api.createStockEntry({
        ingredientId: quickMovementIng.id,
        quantity: delta,
        unitCost: quickMovementIng.costPerUnit,
        reason: quickMovementType === 'in' ? 'Réapprovisionnement manuel' : 'Sortie manuelle',
        performedBy: currentUser?.name || 'Staff'
      });
      setIngredients(prev => prev.map(i => i.id === quickMovementIng.id ? { ...i, currentStock: Math.max(0, i.currentStock + delta) } : i));
      setQuickMovementIng(null);
      showRouteNotification('Mouvement de stock enregistré', 'success');
      triggerGlobalRefresh();
      loadStockData();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleCorrectMovement = (mov: StockMovement) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Corriger ce mouvement de stock',
      message: `Une écriture de correction opposée (${mov.quantity > 0 ? '-' : '+'}${Math.abs(mov.quantity)} ${mov.unit}) sera générée pour rétablir la justesse du stock de "${mov.ingredientName}".`,
      variant: 'warning',
      confirmLabel: 'Générer la correction',
      reasonLabel: 'Motif de la correction',
      reasonRequired: true,
      onConfirm: async (reason) => {
        try {
          await api.correctStockMovement(mov.id, reason || 'Erreur de saisie', currentUser?.name || 'Admin');
          showRouteNotification('Mouvement correcteur appliqué au stock', 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
          loadStockData();
          refreshAlerts();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  // Audits Handlers
  const handleDeleteDraftAudit = (audit: InventoryAudit) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer le brouillon d'inventaire",
      message: `Voulez-vous supprimer le brouillon d'inventaire ${audit.auditNumber} ? Le stock actuel ne sera pas modifié.`,
      variant: 'danger',
      confirmLabel: 'Supprimer le brouillon',
      onConfirm: async () => {
        try {
          await api.deleteInventoryAudit(audit.id, currentUser?.name || 'Manager');
          setAudits(prev => prev.filter(a => a.id !== audit.id));
          showRouteNotification(`Brouillon ${audit.auditNumber} supprimé`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };


  // Filtered ingredients
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const q = (searchQuery || '').toLowerCase();
  const filteredIngredients = safeIngredients.filter(ing => {
    const matchesSearch = (ing.name || '').toLowerCase().includes(q) ||
      (ing.category || '').toLowerCase().includes(q);
    const minThresh = ing.minStockThreshold || (ing as any).minThreshold || 0;
    const isLow = ing.currentStock <= minThresh;
    return matchesSearch && (!onlyLowStock || isLow);
  });

  const lowStockCount = safeIngredients.filter(i => {
    const minThresh = i.minStockThreshold || (i as any).minThreshold || 0;
    return i.currentStock <= minThresh;
  }).length;
  const totalStockValue = safeIngredients.reduce((sum, i) => sum + (i.currentStock || 0) * (i.costPerUnit || 0), 0);

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="bg-[#F2F3F0] p-3.5 sm:p-4 rounded-2xl border border-[#D9DDD8] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] text-[#555D58] font-bold uppercase tracking-wider mb-0.5">
            <Boxes className="w-3.5 h-3.5 text-[#252A27]" />
            <span>GESTION DU STOCK & MATIÈRES PREMIÈRES</span>
          </div>
          <h1 className="text-lg sm:text-xl font-serif font-black text-[#252A27]">
            Inventaire, Alertes & Pertes
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWasteModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors border border-rose-200 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Déclarer Perte</span>
          </button>

          <button
            onClick={() => {
              setEditingAudit(null);
              setIsAuditModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#ECEEEA] text-[#252A27] text-xs font-bold transition-colors border border-[#D9DDD8] shadow-2xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Faire l'Inventaire</span>
          </button>

          <button
            onClick={openCreateIngredientModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter Matière</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#D9DDD8] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#555D58]">Valeur Totale Stock</span>
          <p className="text-xl sm:text-2xl font-mono font-bold text-[#252A27] mt-0.5">
            {totalStockValue.toFixed(3)} DT
          </p>
          <span className="text-[10px] text-[#555D58]">{ingredients.length} matières référencées</span>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            onlyLowStock
              ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-[#D9DDD8] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#555D58]">Alertes Seuil Bas</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600 animate-pulse' : 'text-[#555D58]'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-mono font-bold text-amber-800 mt-0.5">
            {lowStockCount}
          </p>
          <span className="text-[10px] text-amber-900 font-semibold">
            {onlyLowStock ? 'Filtre actif (cliquez pour tout voir)' : 'Cliquez pour filtrer les urgences'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#D9DDD8] shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#555D58]">Pertes du mois</span>
          <p className="text-xl sm:text-2xl font-mono font-bold text-rose-800 mt-0.5">
            {wastes.reduce((sum, w) => sum + (w.estimatedCost || (w as any).cost || 0), 0).toFixed(3)} DT
          </p>
          <span className="text-[10px] text-[#555D58]">{wastes.length} déclarations de perte</span>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center space-x-1 border-b border-[#D9DDD8] pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setActiveTab('inventory'); setCurrentSubTab('inventory'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'inventory'
              ? 'bg-[#252A27] text-white shadow-xs'
              : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
          }`}
        >
          État des Stocks ({ingredients.length})
        </button>
        <button
          onClick={() => { setActiveTab('movements'); setCurrentSubTab('movements'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'movements'
              ? 'bg-[#252A27] text-white shadow-xs'
              : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
          }`}
        >
          Historique Mouvements ({movements.length})
        </button>
        <button
          onClick={() => { setActiveTab('audits'); setCurrentSubTab('audits'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audits'
              ? 'bg-[#252A27] text-white shadow-xs'
              : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
          }`}
        >
          Audits & Inventaires ({audits.length})
        </button>
        <button
          onClick={() => { setActiveTab('wastes'); setCurrentSubTab('wastes'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'wastes'
              ? 'bg-[#252A27] text-white shadow-xs'
              : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
          }`}
        >
          Registre des Pertes ({wastes.length})
        </button>
      </div>

      {activeTab === 'inventory' ? (
        /* INVENTORY TABLE */
        <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-[#ECEEEA] flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer matière première..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] placeholder:text-[#555D58]"
              />
            </div>
            {onlyLowStock && (
              <button
                onClick={() => setOnlyLowStock(false)}
                className="text-xs font-bold text-[#252A27] hover:underline"
              >
                Réinitialiser le filtre d'alerte
              </button>
            )}
          </div>

          <div className="divide-y divide-[#ECEEEA]">
            {filteredIngredients.map(ing => {
              const minThresh = ing.minStockThreshold || (ing as any).minThreshold || 0;
              const isLow = ing.currentStock <= minThresh;
              return (
                <div
                  key={ing.id}
                  onClick={() => setCurrentRecordId(ing.id, { replace: true })}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F7F7F5] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <ItemThumbnail
                      src={ing.imageUrl}
                      alt={ing.name}
                      category={ing.category}
                      type="ingredient"
                      size="md"
                      rounded="xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{ing.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                          {ing.category}
                        </span>
                        {isLow && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center space-x-1 border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Seuil bas (&le; {minThresh} {ing.unit})</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#555D58] mt-0.5 font-medium">
                        Coût unitaire : {ing.costPerUnit.toFixed(3)} DT / {ing.unit} &bull; Valeur totale : {(ing.currentStock * ing.costPerUnit).toFixed(3)} DT
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right mr-2">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isLow ? 'text-amber-800' : 'text-[#252A27]'
                        }`}
                      >
                        {ing.currentStock.toFixed(2)} {ing.unit}
                      </span>
                      <span className="block text-[9px] text-[#555D58]">en réserve</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickMovementIng(ing);
                        setQuickMovementQty(1);
                        setQuickMovementType('in');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] transition-colors"
                    >
                      Ajuster Stock
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditIngredientModal(ing);
                      }}
                      className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                      title="Modifier cette matière"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIngredient(ing);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                      title="Supprimer cette matière"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <CopyLinkButton
                      view="stock"
                      subTab="inventory"
                      id={ing.id}
                      iconOnly
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'movements' ? (
        /* MOVEMENTS STREAM */
        <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs divide-y divide-[#ECEEEA]">
          {movements.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#555D58]">
              Aucun mouvement de stock enregistré
            </div>
          ) : (
            movements.map(m => (
              <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      m.type === 'in_reception' || m.type === ('in' as any)
                        ? 'bg-[#A4DEC2]/30 text-[#252A27] border border-[#A4DEC2]'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {m.quantity >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="font-bold text-[#252A27]">{m.ingredientName}</p>
                    <p className="text-[10px] text-[#555D58]">
                      {m.reason} &bull; Par {m.performedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        m.quantity >= 0 ? 'text-[#252A27]' : 'text-amber-800'
                      }`}
                    >
                      {m.quantity >= 0 ? `+${m.quantity}` : `${m.quantity}`} {m.unit}
                    </span>
                    <span className="block text-[9px] text-[#555D58]">
                      {new Date(m.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCorrectMovement(m)}
                    className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                    title="Générer une écriture de correction opposée"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'audits' ? (
        /* AUDITS TAB */
        <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs divide-y divide-[#ECEEEA]">
          {audits.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#555D58]">
              Aucun audit physique enregistré. Cliquez sur "Faire l'Inventaire" pour démarrer.
            </div>
          ) : (
            audits.map(aud => {
              const isDraft = aud.status === 'draft';
              return (
                <div key={aud.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4 text-[#252A27]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-[#252A27]">{aud.auditNumber}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          isDraft ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {isDraft ? 'Brouillon en cours' : 'Validé'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555D58] mt-0.5">
                        Date: {aud.date} &bull; Par {aud.performedBy} &bull; {aud.items?.length || 0} articles audités
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${
                        aud.totalDifferenceValue < 0 ? 'text-rose-800' : aud.totalDifferenceValue > 0 ? 'text-emerald-800' : 'text-[#252A27]'
                      }`}>
                        {aud.totalDifferenceValue > 0 ? `+${aud.totalDifferenceValue.toFixed(2)}` : aud.totalDifferenceValue?.toFixed(3)} DT
                      </span>
                      <span className="block text-[9px] text-[#555D58]">écart net</span>
                    </div>

                    {isDraft && (
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingAudit(aud);
                            setIsAuditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors"
                        >
                          Reprendre
                        </button>
                        <button
                          onClick={() => handleDeleteDraftAudit(aud)}
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                          title="Supprimer le brouillon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* WASTES LIST */
        <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs divide-y divide-[#ECEEEA]">
          {wastes.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#555D58]">
              Aucune perte déclarée sur la période
            </div>
          ) : (
            wastes.map(w => (
              <div key={w.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#252A27]">{w.ingredientName || w.productName}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                      {w.reason}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#555D58] mt-0.5">
                    Déclaré par {w.recordedBy || (w as any).reportedBy} le {new Date(w.createdAt).toLocaleDateString('fr-FR')} {w.notes ? `("${w.notes}")` : ''}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-rose-800 text-xs sm:text-sm">
                    -{(w.estimatedCost || (w as any).cost || 0).toFixed(3)} DT
                  </span>
                  <span className="block text-[9px] text-[#555D58]">
                    {w.quantity} {w.unit}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QUICK MOVEMENT MODAL */}
      {quickMovementIng && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Ajuster le Stock</h3>
                <p className="text-xs text-[#555D58]">{quickMovementIng.name}</p>
              </div>
              <button onClick={() => setQuickMovementIng(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleQuickMovement} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickMovementType('in')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                    quickMovementType === 'in'
                      ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] shadow-2xs'
                      : 'bg-white text-[#252A27] border-[#D9DDD8]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Entrée / Réappro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickMovementType('out')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                    quickMovementType === 'out'
                      ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] shadow-2xs'
                      : 'bg-white text-[#252A27] border-[#D9DDD8]'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Sortie / Déduction</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">
                  Quantité ({quickMovementIng.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={quickMovementQty}
                  onChange={e => setQuickMovementQty(parseFloat(e.target.value) || 1)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickMovementIng(null)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                >
                  Confirmer Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT INGREDIENT MODAL */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">
                {editingIngredient ? 'Modifier la Matière Première' : 'Nouvelle Matière Première'}
              </h3>
              <button onClick={() => setIsIngredientModalOpen(false)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Nom de l'ingrédient</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sirop de Vanille Madagascar"
                  value={ingredientForm.name}
                  onChange={e => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              {/* Image with live preview and presets */}
              <ImageInputControl
                value={ingredientForm.imageUrl || ''}
                onChange={url => setIngredientForm({ ...ingredientForm, imageUrl: url })}
                category={ingredientForm.category}
                type="ingredient"
                label="Photo de la Matière Première"
                helperText="Affichée dans la liste stock, les fiches recettes et les bons de commande"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Catégorie</label>
                  <input
                    type="text"
                    value={ingredientForm.category}
                    onChange={e => setIngredientForm({ ...ingredientForm, category: e.target.value as any })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Unité</label>
                  <select
                    value={ingredientForm.unit}
                    onChange={e => setIngredientForm({ ...ingredientForm, unit: e.target.value as any })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="kg">kg (Kilogrammes)</option>
                    <option value="g">g (Grammes)</option>
                    <option value="L">L (Litres)</option>
                    <option value="ml">ml (Millilitres)</option>
                    <option value="portion">portion / pièce</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Stock Actuel</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingredientForm.currentStock}
                    onChange={e => setIngredientForm({ ...ingredientForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Seuil Minimum</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingredientForm.minStockThreshold}
                    onChange={e => setIngredientForm({ ...ingredientForm, minStockThreshold: parseFloat(e.target.value) || 1 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Coût unitaire (DT / unité)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ingredientForm.costPerUnit}
                  onChange={e => setIngredientForm({ ...ingredientForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIngredientModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                >
                  {editingIngredient ? 'Mettre à jour' : 'Créer Matière'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WASTE MODAL */}
      <WasteModal
        isOpen={isWasteModalOpen}
        onClose={() => setIsWasteModalOpen(false)}
        ingredients={ingredients}
        onSuccess={() => {
          loadStockData();
          triggerGlobalRefresh();
          refreshAlerts();
        }}
      />

      {/* AUDIT MODAL */}
      <InventoryAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setEditingAudit(null);
        }}
        ingredients={ingredients}
        editingAudit={editingAudit}
        onSuccess={() => {
          loadStockData();
          triggerGlobalRefresh();
          refreshAlerts();
        }}
      />

      {/* GLOBAL CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        reasonLabel={confirmDialog.reasonLabel}
        reasonRequired={confirmDialog.reasonRequired}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
