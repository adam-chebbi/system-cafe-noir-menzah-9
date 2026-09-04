import React, { useState } from 'react';
import { ExpenseCategory, Expense } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { Tag, X, Plus, Edit2, Check, EyeOff, Eye } from 'lucide-react';

interface ExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  expenses: Expense[];
  onChanged: () => void;
}

export const ExpenseCategoriesModal: React.FC<ExpenseCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  expenses,
  onChanged
}) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const performedBy = currentUser?.name || 'Admin';
  const usageCount = (categoryId: string) => expenses.filter(e => e.category === categoryId).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createExpenseCategory(newName.trim(), performedBy);
      setNewName('');
      showRouteNotification(`Catégorie "${newName.trim()}" créée`, 'success');
      onChanged();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  const startRename = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const submitRename = async (cat: ExpenseCategory) => {
    if (!editingName.trim() || editingName.trim() === cat.name) {
      setEditingId(null);
      return;
    }
    try {
      await api.updateExpenseCategory(cat.id, { name: editingName.trim() }, performedBy);
      setEditingId(null);
      showRouteNotification('Catégorie renommée', 'success');
      onChanged();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  const toggleActive = async (cat: ExpenseCategory) => {
    try {
      await api.updateExpenseCategory(cat.id, { active: !cat.active }, performedBy);
      showRouteNotification(cat.active ? `"${cat.name}" désactivée` : `"${cat.name}" réactivée`, 'success');
      onChanged();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  const handleDelete = async (cat: ExpenseCategory) => {
    try {
      await api.deleteExpenseCategory(cat.id, performedBy);
      showRouteNotification(`Catégorie "${cat.name}" supprimée`, 'success');
      onChanged();
    } catch (err: any) {
      showRouteNotification(`Erreur : ${err.message}`, 'error');
    }
  };

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">Catégories de Dépenses</h3>
              <p className="text-[11px] text-[#555D58]">Adaptez la liste à vos besoins</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 mb-3 shrink-0">
          <input
            type="text"
            placeholder="Nouvelle catégorie (ex: Assurance)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] shadow-2xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </form>

        <div className="flex-1 overflow-y-auto divide-y divide-[#ECEEEA] border border-[#D9DDD8] rounded-xl bg-white">
          {sorted.map(cat => {
            const count = usageCount(cat.id);
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className={`p-2.5 flex items-center justify-between gap-2 text-xs ${!cat.active ? 'opacity-60' : ''}`}>
                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(cat); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-semibold text-[#252A27]"
                  />
                ) : (
                  <div className="min-w-0">
                    <span className="font-bold text-[#252A27] block truncate">{cat.name}</span>
                    <span className="text-[10px] text-[#555D58]">
                      {count} dépense(s) {!cat.active ? '• Désactivée' : ''}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <button onClick={() => submitRename(cat)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200" title="Valider">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => startRename(cat)} className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27]" title="Renommer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(cat)}
                    className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27]"
                    title={cat.active ? 'Désactiver (masquer des nouvelles saisies)' : 'Réactiver'}
                  >
                    {cat.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {count === 0 && (
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      title="Supprimer définitivement (aucune dépense ne l'utilise)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-[#555D58] pt-2.5 shrink-0">
          Une catégorie déjà utilisée par une dépense ne peut pas être supprimée — désactivez-la pour la retirer des nouvelles saisies tout en gardant l'historique lisible.
        </p>
      </div>
    </div>
  );
};
