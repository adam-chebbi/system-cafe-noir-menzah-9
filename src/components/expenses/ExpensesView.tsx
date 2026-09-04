import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Expense, ExpenseCategory } from '../../types';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentViewer, AttachmentUpload } from '../common/AttachmentViewer';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import { ExpenseCategoriesModal } from './ExpenseCategoriesModal';
import { formatDT, DEFAULT_TVA_RATE } from '../../utils/currency';
import {
  RECURRENCE_INTERVALS,
  RECURRENCE_INTERVAL_LABELS,
  getRecurrenceGroupKey,
  computeNextOccurrenceDate,
  computeRecurrenceStatuses
} from '../../utils/expenseRecurrence';
import {
  Receipt,
  Plus,
  History,
  Edit2,
  Trash2,
  X,
  Search,
  Tag,
  Repeat,
  RotateCcw,
  StopCircle,
  AlertTriangle
} from 'lucide-react';

const PAYMENT_METHOD_LABELS: Record<Expense['paymentMethod'], string> = {
  bank_transfer: 'Virement Bancaire',
  card: 'Carte Bancaire Pro',
  direct_debit: 'Prélèvement Automatique',
  cash: 'Espèces Caisse'
};

const emptyFormData = (): Partial<Expense> => ({
  title: '',
  category: '',
  amount: 0,
  tvaAmount: 0,
  date: new Date().toISOString().split('T')[0],
  expenseType: 'variable',
  isRecurring: false,
  recurrenceInterval: 'monthly',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'paid',
  description: '',
  attachmentUrl: ''
});

export const ExpensesView: React.FC = () => {
  const {
    globalVersion,
    triggerGlobalRefresh,
    currentRecordId,
    setCurrentRecordId,
    currentAction,
    setCurrentAction,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'fixed' | 'variable'>('all');
  const [onlyDue, setOnlyDue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const hasValidatedIdRef = useRef(false);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRetroactiveMode, setIsRetroactiveMode] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Retroactive state
  const [retroFields, setRetroFields] = useState<RetroactiveFields>(emptyRetroactiveFields());

  // Confirm delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [stopRecurrenceTarget, setStopRecurrenceTarget] = useState<Expense | null>(null);

  const [formData, setFormData] = useState<Partial<Expense>>(emptyFormData());

  const [loading, setLoading] = useState(false);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [expData, catData] = await Promise.all([api.getExpenses(), api.getExpenseCategories()]);
      const safeData = Array.isArray(expData) ? expData : [];
      const safeCats = Array.isArray(catData) ? catData : [];
      setExpenses(safeData);
      setCategories(safeCats);

      if (currentRecordId) {
        const found = safeData.find(e => e.id === currentRecordId);
        if (found) {
          setSelectedExpense(found);
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`La dépense (ID: "${currentRecordId}") est introuvable.`, 'warning');
          if (safeData.length > 0) setSelectedExpense(safeData[0]);
        }
        hasValidatedIdRef.current = true;
      } else {
        if (safeData.length > 0 && !selectedExpense) {
          setSelectedExpense(safeData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [globalVersion]);

  // Deep-linking action trigger
  useEffect(() => {
    if (currentAction === 'retro-expense') {
      openCreateModal(true);
      setCurrentAction(undefined, { replace: true });
    } else if (currentAction === 'new_expense') {
      openCreateModal(false);
      setCurrentAction(undefined, { replace: true });
    } else if (currentAction === 'category_modal') {
      setIsCategoriesModalOpen(true);
      setCurrentAction(undefined, { replace: true });
    }
  }, [currentAction]);

  const activeCategories = categories.filter(c => c.active);
  const categoryMap = new Map<string, ExpenseCategory>(categories.map(c => [c.id, c]));
  const categoryName = (id: string) => categoryMap.get(id)?.name || 'Catégorie inconnue';
  const recurrenceStatuses = computeRecurrenceStatuses(expenses);

  const openCreateModal = (retroactive = false, prefill?: Partial<Expense>) => {
    setEditingExpense(null);
    setIsRetroactiveMode(retroactive);
    setRetroFields(emptyRetroactiveFields());
    setFormData({
      ...emptyFormData(),
      category: activeCategories[0]?.id || '',
      date: retroactive ? '' : new Date().toISOString().split('T')[0],
      ...prefill
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setIsRetroactiveMode(!!exp.isRetroactive);
    setRetroFields({
      documentDate: exp.documentDate || exp.date || '',
      referenceNumber: exp.expenseNumber || '',
      attachmentUrl: exp.attachmentUrl || exp.receiptUrl || '',
      applyToStock: false,
      applyToCash: false,
      notes: exp.retroNotes || ''
    });
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      tvaAmount: exp.tvaAmount || 0,
      date: exp.date,
      expenseType: exp.expenseType || 'variable',
      isRecurring: !!exp.isRecurring,
      recurrenceInterval: exp.recurrenceInterval || 'monthly',
      recurrenceGroupId: exp.recurrenceGroupId,
      recurrenceActive: exp.recurrenceActive,
      paymentMethod: exp.paymentMethod,
      paymentStatus: exp.paymentStatus,
      description: exp.description || '',
      attachmentUrl: exp.attachmentUrl || exp.receiptUrl || ''
    });
    setIsModalOpen(true);
  };

  /** Renouvellement manuel d'une récurrence : pré-remplit une NOUVELLE dépense, jamais générée seule. */
  const handleRenew = (exp: Expense) => {
    const status = recurrenceStatuses.get(getRecurrenceGroupKey(exp));
    const nextDate = status ? status.nextDate : computeNextOccurrenceDate(exp.date, exp.recurrenceInterval || 'monthly');
    openCreateModal(false, {
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      tvaAmount: exp.tvaAmount,
      date: nextDate,
      expenseType: exp.expenseType,
      isRecurring: true,
      recurrenceInterval: exp.recurrenceInterval,
      recurrenceGroupId: getRecurrenceGroupKey(exp),
      paymentMethod: exp.paymentMethod,
      paymentStatus: exp.paymentStatus,
      description: exp.description
    });
    showRouteNotification('Renouvellement pré-rempli — vérifiez puis enregistrez', 'info');
  };

  const handleStopRecurrence = async () => {
    if (!stopRecurrenceTarget) return;
    try {
      const updated = await api.updateExpense(stopRecurrenceTarget.id, { recurrenceActive: false }, currentUser?.name || 'Admin');
      setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      if (selectedExpense?.id === updated.id) setSelectedExpense(updated);
      showRouteNotification('Récurrence arrêtée — aucune prochaine échéance ne sera plus signalée', 'success');
      setStopRecurrenceTarget(null);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Handle Save (Create / Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category) return;

    try {
      const finalDate = isRetroactiveMode
        ? (retroFields.documentDate || formData.date || new Date().toISOString().split('T')[0])
        : (formData.date || new Date().toISOString().split('T')[0]);

      const payload: Partial<Expense> = {
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount) || 0,
        tvaAmount: Number(formData.tvaAmount) || 0,
        date: finalDate,
        expenseType: formData.expenseType || 'variable',
        isRecurring: !!formData.isRecurring,
        recurrenceInterval: formData.isRecurring ? (formData.recurrenceInterval || 'monthly') : undefined,
        recurrenceGroupId: formData.isRecurring ? formData.recurrenceGroupId : undefined,
        paymentMethod: formData.paymentMethod || 'bank_transfer',
        paymentStatus: formData.paymentStatus || 'paid',
        description: formData.description || '',
        attachmentUrl: isRetroactiveMode ? retroFields.attachmentUrl : formData.attachmentUrl,
        isRetroactive: isRetroactiveMode,
        documentDate: isRetroactiveMode ? retroFields.documentDate : undefined,
        retroNotes: isRetroactiveMode ? retroFields.notes : undefined
      };

      if (editingExpense) {
        const updated = await api.updateExpense(editingExpense.id, payload, currentUser?.name || 'Admin');
        setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
        if (selectedExpense?.id === updated.id) setSelectedExpense(updated);
        showRouteNotification('Dépense mise à jour avec succès', 'success');
      } else {
        const created = await api.createExpense(payload, currentUser?.name || 'Admin');
        setExpenses(prev => [created, ...prev]);
        setSelectedExpense(created);
        showRouteNotification(isRetroactiveMode ? 'Dépense historique enregistrée' : 'Dépense créée avec succès', 'success');
      }

      setIsModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Handle Delete
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await api.deleteExpense(expenseToDelete.id, currentUser?.name || 'Admin');
      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
      showRouteNotification(`Dépense "${expenseToDelete.title}" supprimée`, 'success');
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
      if (selectedExpense?.id === expenseToDelete.id) {
        setSelectedExpense(null);
      }
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Filter expenses
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const filteredExpenses = safeExpenses.filter(exp => {
    const matchesCat = selectedCategory === 'all' || exp.category === selectedCategory;
    const matchesType = selectedType === 'all' || exp.expenseType === selectedType;
    const matchesDue = !onlyDue || recurrenceStatuses.get(getRecurrenceGroupKey(exp))?.latest.id === exp.id && recurrenceStatuses.get(getRecurrenceGroupKey(exp))?.isDue;
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.isRetroactive && 'historique'.includes(searchQuery.toLowerCase()));
    return matchesCat && matchesType && matchesDue && matchesSearch;
  });

  const totalAmount = safeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalTVA = safeExpenses.reduce((sum, e) => sum + (e.tvaAmount || 0), 0);
  const totalFixed = safeExpenses.filter(e => e.expenseType === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalVariable = safeExpenses.filter(e => e.expenseType === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);
  const retroCount = safeExpenses.filter(e => e.isRetroactive).length;
  const dueCount = Array.from(recurrenceStatuses.values()).filter(s => s.isDue).length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#F7F7F5]">
      {/* Top Header & Compact Metrics */}
      <div className="bg-[#F2F3F0] border-b border-[#D9DDD8] px-4 py-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif font-black text-base text-[#252A27]">
                  Dépenses
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                  {expenses.length} dépenses
                </span>
                {retroCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                    <History className="w-2.5 h-2.5" />
                    <span>{retroCount} hist.</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#555D58]">
                Charges fixes et variables, récurrences et justificatifs
              </p>
            </div>
          </div>

          {/* Key Summary Stats & Actions */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#D9DDD8]">
              <span className="text-[10px] uppercase font-bold text-[#555D58]">Total</span>
              <span className="font-mono font-bold text-xs text-[#D96B61]">{formatDT(totalAmount)}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#D9DDD8]">
              <span className="text-[10px] uppercase font-bold text-[#555D58]">Fixes</span>
              <span className="font-mono font-bold text-xs text-[#252A27]">{formatDT(totalFixed)}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#D9DDD8]">
              <span className="text-[10px] uppercase font-bold text-[#555D58]">Variables</span>
              <span className="font-mono font-bold text-xs text-[#252A27]">{formatDT(totalVariable)}</span>
            </div>
            {dueCount > 0 && (
              <button
                onClick={() => setOnlyDue(v => !v)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                  onlyDue ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                }`}
                title="Récurrences dont la prochaine échéance est due"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{dueCount} à renouveler</span>
              </button>
            )}

            {/* Categories management */}
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#ECEEEA] text-[#252A27] text-xs font-bold transition-all border border-[#D9DDD8] shadow-2xs"
              title="Ajouter, renommer ou désactiver des catégories"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Catégories</span>
            </button>

            {/* Retroactive Entry Button */}
            <button
              onClick={() => openCreateModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-2xs"
              title="Saisir une dépense papier ou provenant de votre ancien système"
            >
              <History className="w-3.5 h-3.5" />
              <span>Saisie Historique</span>
            </button>

            {/* Standard New Expense Button */}
            <button
              id="btn-add-expense"
              onClick={() => openCreateModal(false)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-2xs border border-[#8BCFAE]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Dépense</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-[#D9DDD8]/60 overflow-x-auto no-scrollbar">
          <div className="relative w-48 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher intitulé, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>

          <div className="flex items-center space-x-1 shrink-0 border-r border-[#D9DDD8] pr-2 mr-1">
            {(['all', 'fixed', 'variable'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedType === t ? 'bg-[#252A27] text-white' : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
                }`}
              >
                {t === 'all' ? 'Tous types' : t === 'fixed' ? 'Fixes' : 'Variables'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#252A27] text-white'
                  : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
              }`}
            >
              Toutes ({safeExpenses.length})
            </button>
            {categories.map(cat => {
              const count = safeExpenses.filter(e => e.category === cat.id).length;
              if (count === 0 && !cat.active) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-[#252A27] text-white'
                      : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Master-Detail Split Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Master List */}
        <div className="w-full lg:w-3/5 border-r border-[#D9DDD8] overflow-y-auto bg-white divide-y divide-[#ECEEEA]">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#555D58]">
              Aucune dépense ne correspond aux critères.
            </div>
          ) : (
            filteredExpenses.map(exp => {
              const isSelected = selectedExpense?.id === exp.id;
              const attach = exp.attachmentUrl || exp.receiptUrl;
              const groupKey = getRecurrenceGroupKey(exp);
              const status = recurrenceStatuses.get(groupKey);
              const isLatestOfGroup = status?.latest.id === exp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => {
                    setSelectedExpense(exp);
                    setCurrentRecordId(exp.id, { replace: true });
                  }}
                  className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h4 className="font-bold text-xs text-[#252A27] truncate">{exp.title}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#F2F3F0] text-[#555D58] border border-[#D9DDD8] shrink-0">
                        {categoryName(exp.category)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${
                        exp.expenseType === 'fixed' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-violet-50 text-violet-800 border-violet-200'
                      }`}>
                        {exp.expenseType === 'fixed' ? 'Fixe' : 'Variable'}
                      </span>
                      {exp.isRecurring && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8] shrink-0 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" />
                          <span>{RECURRENCE_INTERVAL_LABELS[exp.recurrenceInterval || 'monthly']}</span>
                        </span>
                      )}
                      {isLatestOfGroup && status?.isDue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>À renouveler</span>
                        </span>
                      )}
                      <SoftDeleteBadge isRetroactive={exp.isRetroactive} />
                      {attach && <AttachmentViewer url={attach} filename={exp.title} variant="button" />}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-[#555D58] mt-0.5">
                      <span>Date: {exp.date}</span>
                      <span>&bull;</span>
                      <span>Règlement: {PAYMENT_METHOD_LABELS[exp.paymentMethod]}</span>
                      <span>&bull;</span>
                      <span>TVA: {formatDT(exp.tvaAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-[#D96B61]">
                        -{formatDT(exp.amount)}
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-[#555D58]">TTC payé</span>
                    </div>
                    {isLatestOfGroup && status?.isDue && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenew(exp); }}
                        className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors"
                        title="Renouveler cette dépense récurrente"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(exp);
                      }}
                      className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                      title="Modifier cette dépense"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpenseToDelete(exp);
                        setDeleteConfirmOpen(true);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                      title="Supprimer cette dépense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Inspector (Right Side) */}
        <div className="hidden lg:flex w-2/5 flex-col bg-[#F2F3F0] overflow-y-auto p-4 space-y-4">
          {selectedExpense ? (
            <>
              {/* Header card */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider">
                        Fiche Dépense
                      </span>
                      <SoftDeleteBadge isRetroactive={selectedExpense.isRetroactive} />
                    </div>
                    <h3 className="font-serif font-black text-base text-[#252A27] mt-0.5">
                      {selectedExpense.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-lg text-[#D96B61]">
                      -{formatDT(selectedExpense.amount)}
                    </span>
                    <CopyLinkButton
                      view="expenses"
                      id={selectedExpense.id}
                      iconOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEEA] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Catégorie</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{categoryName(selectedExpense.category)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Type</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedExpense.expenseType === 'fixed' ? 'Fixe' : 'Variable'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Date Règlement</span>
                    <p className="font-mono font-semibold text-[#252A27] mt-0.5">{selectedExpense.date}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Mode Paiement</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{PAYMENT_METHOD_LABELS[selectedExpense.paymentMethod]}</p>
                  </div>
                </div>

                {selectedExpense.description && (
                  <div className="pt-2 border-t border-[#ECEEEA]">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Commentaire</span>
                    <p className="text-xs text-[#252A27] mt-0.5 italic">{selectedExpense.description}</p>
                  </div>
                )}

                {/* Attachment Section */}
                {(selectedExpense.attachmentUrl || selectedExpense.receiptUrl) && (
                  <div className="pt-2 border-t border-[#ECEEEA] flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Justificatif joint</span>
                    <AttachmentViewer
                      url={selectedExpense.attachmentUrl || selectedExpense.receiptUrl}
                      filename={`justificatif_${selectedExpense.title}`}
                      variant="badge"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-[#ECEEEA] flex space-x-2">
                  <button
                    onClick={() => openEditModal(selectedExpense)}
                    className="flex-1 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => {
                      setExpenseToDelete(selectedExpense);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>

              {/* Recurrence panel */}
              {selectedExpense.isRecurring && (() => {
                const groupKey = getRecurrenceGroupKey(selectedExpense);
                const status = recurrenceStatuses.get(groupKey);
                const isLatest = status?.latest.id === selectedExpense.id;
                const isStopped = selectedExpense.recurrenceActive === false;
                return (
                  <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider flex items-center gap-1.5">
                      <Repeat className="w-3 h-3" />
                      <span>Récurrence — {RECURRENCE_INTERVAL_LABELS[selectedExpense.recurrenceInterval || 'monthly']}</span>
                    </span>
                    {isStopped ? (
                      <p className="text-xs text-[#555D58]">Cette récurrence a été arrêtée manuellement — aucune prochaine échéance n'est plus signalée.</p>
                    ) : status ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#555D58]">Prochaine échéance :</span>
                        <span className={`font-mono font-bold ${status.isDue ? 'text-amber-800' : 'text-[#252A27]'}`}>
                          {status.nextDate}{status.isDue ? ' (due)' : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#555D58]">Cette occurrence fait partie d'une récurrence dont une occurrence plus récente existe déjà.</p>
                    )}
                    {isLatest && !isStopped && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleRenew(selectedExpense)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Renouveler</span>
                        </button>
                        <button
                          onClick={() => setStopRecurrenceTarget(selectedExpense)}
                          className="flex-1 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#555D58] border border-[#D9DDD8] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          <span>Arrêter</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Accounting summary box */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                  Détail Comptable
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#ECEEEA]">
                    <span className="text-[#555D58]">Montant Hors Taxes (HT)</span>
                    <span className="font-mono font-bold text-[#252A27]">
                      {formatDT(selectedExpense.amount - (selectedExpense.tvaAmount || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ECEEEA]">
                    <span className="text-[#555D58]">TVA Déductible</span>
                    <span className="font-mono font-bold text-[#252A27]">
                      {formatDT(selectedExpense.tvaAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-[#252A27]">Total Décaissement TTC</span>
                    <span className="font-mono text-[#D96B61]">
                      {formatDT(selectedExpense.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
              Sélectionnez une dépense pour afficher le détail comptable.
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  {isRetroactiveMode ? <History className="w-4 h-4 text-amber-800" /> : <Receipt className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">
                    {editingExpense
                      ? 'Modifier la Dépense'
                      : isRetroactiveMode
                      ? 'Saisir une Dépense Historique'
                      : 'Nouvelle Dépense'}
                  </h3>
                  <p className="text-[11px] text-[#555D58]">
                    {isRetroactiveMode ? 'Rattrapage document papier / ancien système' : 'Frais généraux et charges'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              {/* Retroactive Panel if in historical mode */}
              {isRetroactiveMode && (
                <RetroactiveDocumentPanel
                  value={retroFields}
                  onChange={setRetroFields}
                />
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Intitulé de la dépense</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Révision annuelle machine espresso"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#252A27]">Catégorie</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoriesModalOpen(true)}
                    className="text-[10px] font-bold text-[#55A9C0] hover:underline"
                  >
                    Gérer les catégories
                  </button>
                </div>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="" disabled>-- Choisir une catégorie --</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant TTC (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => {
                      const amt = parseFloat(e.target.value) || 0;
                      const tva = Number((amt * DEFAULT_TVA_RATE / (100 + DEFAULT_TVA_RATE)).toFixed(2));
                      setFormData({ ...formData, amount: amt, tvaAmount: tva });
                    }}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Dont TVA (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tvaAmount}
                    onChange={e => setFormData({ ...formData, tvaAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Type de dépense</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expenseType: 'fixed' })}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                      formData.expenseType === 'fixed' ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-white text-[#252A27] border-[#D9DDD8]'
                    }`}
                  >
                    Fixe
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expenseType: 'variable' })}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                      formData.expenseType === 'variable' ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-white text-[#252A27] border-[#D9DDD8]'
                    }`}
                  >
                    Variable
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-[#D9DDD8] space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.isRecurring}
                    onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-bold text-[#252A27] flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    <span>Dépense récurrente (ex. loyer, abonnement)</span>
                  </span>
                </label>
                {formData.isRecurring && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#555D58]">Fréquence</label>
                    <select
                      value={formData.recurrenceInterval}
                      onChange={e => setFormData({ ...formData, recurrenceInterval: e.target.value as any })}
                      className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                    >
                      {RECURRENCE_INTERVALS.map(i => (
                        <option key={i} value={i}>{RECURRENCE_INTERVAL_LABELS[i]}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-[#555D58]">
                      Aucune génération automatique : vous serez simplement averti quand la prochaine échéance sera due, avec un bouton "Renouveler" à un clic.
                    </p>
                  </div>
                )}
              </div>

              {!isRetroactiveMode && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#252A27]">Date de paiement</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#252A27]">Mode de règlement</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                      className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                    >
                      <option value="bank_transfer">Virement Bancaire</option>
                      <option value="card">Carte Bancaire Pro</option>
                      <option value="direct_debit">Prélèvement Automatique</option>
                      <option value="cash">Espèces Caisse</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Commentaire</label>
                <input
                  type="text"
                  placeholder="Optionnel..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              {!isRetroactiveMode && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Justificatif (Photo ou PDF)</label>
                  <AttachmentUpload
                    value={formData.attachmentUrl || ''}
                    onChange={url => setFormData({ ...formData, attachmentUrl: url })}
                    label="Joindre un reçu / ticket"
                  />
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  {editingExpense ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORIES MANAGEMENT MODAL */}
      <ExpenseCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        expenses={expenses}
        onChanged={loadExpenses}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Supprimer la dépense"
        message={`Êtes-vous sûr de vouloir supprimer la dépense "${expenseToDelete?.title}" (${expenseToDelete ? formatDT(expenseToDelete.amount) : ''}) ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
      />

      {/* CONFIRM STOP RECURRENCE DIALOG */}
      <ConfirmDialog
        isOpen={!!stopRecurrenceTarget}
        title="Arrêter la récurrence"
        message={`Voulez-vous arrêter la récurrence de "${stopRecurrenceTarget?.title}" ? L'historique est conservé, mais aucune prochaine échéance ne sera plus signalée pour cette dépense.`}
        confirmLabel="Arrêter"
        cancelLabel="Annuler"
        variant="warning"
        onConfirm={handleStopRecurrence}
        onCancel={() => setStopRecurrenceTarget(null)}
      />
    </div>
  );
};
