import React, { useState } from 'react';
import { Space, Table } from '../../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  MoveUp,
  MoveDown,
  Layers,
  AlertCircle
} from 'lucide-react';

interface SpaceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  tables: Table[];
  onCreateSpace: (name: string) => Promise<void>;
  onUpdateSpace: (id: string, name: string) => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
  onReorderSpaces: (orderedIds: string[]) => Promise<void>;
}

export const SpaceManagerModal: React.FC<SpaceManagerModalProps> = ({
  isOpen,
  onClose,
  spaces,
  tables,
  onCreateSpace,
  onUpdateSpace,
  onDeleteSpace,
  onReorderSpaces
}) => {
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onCreateSpace(newSpaceName.trim());
      setNewSpaceName('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onUpdateSpace(id, editingName.trim());
      setEditingSpaceId(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const safeTables = Array.isArray(tables) ? tables : [];
  const safeSpaces = Array.isArray(spaces) ? spaces : [];

  const handleDelete = async (id: string) => {
    const spaceTables = safeTables.filter(t => t.spaceId === id);
    if (spaceTables.length > 0) {
      setError(`Impossible de supprimer cet espace : il contient ${spaceTables.length} table(s). Déplacez-les d'abord.`);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onDeleteSpace(id);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeSpaces.length) return;

    const newOrder = [...safeSpaces];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    try {
      await onReorderSpaces(newOrder.map(s => s.id));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du réordonnancement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-lg w-full shadow-2xl border border-[#D9DDD8] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D9DDD8] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-white flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">Gestion des Espaces & Salles</h3>
              <p className="text-[11px] text-[#555D58]">Organisez les différentes zones de service de votre café</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Space Form */}
          <form onSubmit={handleCreate} className="flex items-center space-x-2">
            <input
              type="text"
              value={newSpaceName}
              onChange={e => setNewSpaceName(e.target.value)}
              placeholder="Nom du nouvel espace (ex : Rooftop, Lounge, Mezzanine...)"
              className="flex-1 px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
            />
            <button
              type="submit"
              disabled={loading || !newSpaceName.trim()}
              className="px-4 py-2 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </form>

          {/* Spaces List */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Espaces existants ({safeSpaces.length})
            </label>

            <div className="space-y-1.5">
              {safeSpaces.map((sp, idx) => {
                const count = safeTables.filter(t => t.spaceId === sp.id).length;
                const isEditing = editingSpaceId === sp.id;

                return (
                  <div
                    key={sp.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#D9DDD8]"
                  >
                    {isEditing ? (
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg border border-[#252A27] text-xs bg-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(sp.id)}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSpaceId(null)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-[#252A27]">{sp.name}</span>
                        <span className="text-[10px] text-[#555D58] bg-[#ECEEEA] px-2 py-0.5 rounded-md">
                          {count} table{count > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      {/* Reorder Up/Down */}
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#555D58] hover:text-[#252A27] disabled:opacity-30"
                        title="Monter"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === spaces.length - 1}
                        className="p-1 rounded text-[#555D58] hover:text-[#252A27] disabled:opacity-30"
                        title="Descendre"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {!isEditing && (
                        <>
                          <button
                            onClick={() => {
                              setEditingSpaceId(sp.id);
                              setEditingName(sp.name);
                            }}
                            className="p-1 rounded text-[#555D58] hover:text-[#252A27]"
                            title="Renommer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(sp.id)}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
