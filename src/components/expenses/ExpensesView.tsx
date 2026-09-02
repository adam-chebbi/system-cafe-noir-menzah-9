import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Expense } from '../../types';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentViewer, AttachmentUpload } from '../common/AttachmentViewer';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import {
  Receipt,
  Plus,
  History,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Search,
  CheckCircle2,
  FileText,
  Clock
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Loyer Commercial',
  'Électricité, Eau & Gaz',
  'Maintenance Machine Espresso & Moulins',
  'Emballages & Gobelets Écologiques',
  'Assurance & Banque',
  'Logiciels, Réseau & Abonnements',
  'Produits d’Entretien & Hygiène',
  'Autre'
];

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const hasValidatedIdRef = useRef(false);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRetroactiveMode, setIsRetroactiveMode] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Retroactive state
  const [retroFields, setRetroFields] = useState<RetroactiveFields>(emptyRetroactiveFields());

  // Confirm delete dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [formData, setFormData] = useState<Partial<Expense>>({
    title: '',
    category: EXPENSE_CATEGORIES[0] as any,
    amount: 100,
    tvaAmount: 20,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    description: '',
    attachmentUrl: ''
  });

  const [loading, setLoading] = useState(false);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses();
      const safeData = Array.isArray(data) ? data : [];
      setExpenses(safeData);

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
    }
  }, [currentAction]);

  const openCreateModal = (retroactive = false) => {
    setEditingExpense(null);
    setIsRetroactiveMode(retroactive);
    setRetroFields(emptyRetroactiveFields());
    setFormData({
      title: '',
      category: EXPENSE_CATEGORIES[0] as any,
      amount: 100,
      tvaAmount: 20,
      date: retroactive ? '' : new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      description: '',
      attachmentUrl: ''
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
      tvaAmount: exp.tvaAmount || (exp as any).tva || 0,
      date: exp.date,
      paymentMethod: exp.paymentMethod,
      paymentStatus: exp.paymentStatus,
      description: exp.description || '',
      attachmentUrl: exp.attachmentUrl || exp.receiptUrl || ''
    });
    setIsModalOpen(true);
  };

  // Handle Save (Create / Update)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    try {
      const finalDate = isRetroactiveMode
        ? (retroFields.documentDate || formData.date || new Date().toISOString().split('T')[0])
        : (formData.date || new Date().toISOString().split('T')[0]);

      const payload: Partial<Expense> = {
        title: formData.title,
        category: (formData.category as any) || 'other',
        amount: Number(formData.amount) || 0,
        tvaAmount: Number(formData.tvaAmount) || 0,
        date: finalDate,
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
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.isRetroactive && 'historique'.includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalAmount = safeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalTVA = safeExpenses.reduce((sum, e) => sum + (e.tvaAmount || (e as any).tva || 0), 0);
  const retroCount = safeExpenses.filter(e => e.isRetroactive).length;

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
                  Charges & Frais d'Exploitation
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
                Dépenses fixes, achats récurrents et rattrapage documentaire
              </p>
            </div>
          </div>

          {/* Key Summary Stats & Actions */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#D9DDD8]">
              <span className="text-[10px] uppercase font-bold text-[#555D58]">Total Charges</span>
              <span className="font-mono font-bold text-xs text-[#D96B61]">{totalAmount.toFixed(3)} DT</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-[#D9DDD8]">
              <span className="text-[10px] uppercase font-bold text-[#555D58]">TVA Récupérable</span>
              <span className="font-mono font-bold text-xs text-[#252A27]">{totalTVA.toFixed(3)} DT</span>
            </div>

            {/* Retroactive Entry Button */}
            <button
              onClick={() => openCreateModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-2xs"
              title="Saisir une dépense papier ou provenant de votre ancien logiciel"
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
              placeholder="Rechercher intitulé, date..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
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
            {EXPENSE_CATEGORIES.map(cat => {
              const count = safeExpenses.filter(e => e.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#252A27] text-white'
                      : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
                  }`}
                >
                  {cat} ({count})
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
              const tva = exp.tvaAmount || (exp as any).tva || 0;
              const attach = exp.attachmentUrl || exp.receiptUrl;
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
                        {exp.category}
                      </span>
                      <SoftDeleteBadge isRetroactive={exp.isRetroactive} />
                      {attach && <AttachmentViewer url={attach} filename={exp.title} variant="button" />}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-[#555D58] mt-0.5">
                      <span>Date: {exp.date}</span>
                      <span>&bull;</span>
                      <span>Règlement: {exp.paymentMethod}</span>
                      <span>&bull;</span>
                      <span>TVA: {tva.toFixed(3)} DT</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-[#D96B61]">
                        -{exp.amount.toFixed(3)} DT
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-[#555D58]">TTC payé</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(exp);
                      }}
                      className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                      title="Modifier cette charge"
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
                      title="Supprimer cette charge"
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
                    <div className="flex items-center space-x-2">
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
                      -{selectedExpense.amount.toFixed(3)} DT
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
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedExpense.category}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Date Règlement</span>
                    <p className="font-mono font-semibold text-[#252A27] mt-0.5">{selectedExpense.date}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Mode Paiement</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedExpense.paymentMethod}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">TVA Déductible</span>
                    <p className="font-mono font-semibold text-[#252A27] mt-0.5">
                      {(selectedExpense.tvaAmount || (selectedExpense as any).tva || 0).toFixed(3)} DT
                    </p>
                  </div>
                </div>

                {selectedExpense.description && (
                  <div className="pt-2 border-t border-[#ECEEEA]">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Notes</span>
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

              {/* Accounting summary box */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                  Impact Comptable & Bilan
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#ECEEEA]">
                    <span className="text-[#555D58]">Montant Hors Taxes (HT)</span>
                    <span className="font-mono font-bold text-[#252A27]">
                      {(selectedExpense.amount - (selectedExpense.tvaAmount || (selectedExpense as any).tva || 0)).toFixed(3)} DT
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#ECEEEA]">
                    <span className="text-[#555D58]">TVA Déductible</span>
                    <span className="font-mono font-bold text-[#252A27]">
                      {(selectedExpense.tvaAmount || (selectedExpense as any).tva || 0).toFixed(3)} DT
                    </span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-[#252A27]">Total Décaissement TTC</span>
                    <span className="font-mono text-[#D96B61]">
                      {selectedExpense.amount.toFixed(3)} DT
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
                      : 'Saisir une Dépense'}
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
                  showApplyToCash
                  applyToCashLabel="Inclure dans les totaux comptables de la période réelle"
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
                <label className="text-[11px] font-bold text-[#252A27]">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
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
                      const tva = Number((amt * 0.2 / 1.2).toFixed(2));
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
                      <option value="bank_transfer">Virement SEPA</option>
                      <option value="card">Carte Bancaire Pro</option>
                      <option value="direct_debit">Prélèvement Automatique</option>
                      <option value="cash">Espèces Caisse</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Description & Notes</label>
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
                  <label className="text-[11px] font-bold text-[#252A27]">Justificatif / Reçu (Scan ou Photo)</label>
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

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Supprimer la charge"
        message={`Êtes-vous sûr de vouloir supprimer la charge "${expenseToDelete?.title}" (${expenseToDelete?.amount?.toFixed(3)} DT) ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
      />
    </div>
  );
};
