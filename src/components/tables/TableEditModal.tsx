import React, { useState, useEffect } from 'react';
import { Table, Space, TableStatus } from '../../types';
import {
  X,
  Plus,
  Edit2,
  Users,
  Layers,
  Coffee,
  Check,
  AlertCircle
} from 'lucide-react';

interface TableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  initialData?: Partial<Table> | null;
  onSave: (data: Partial<Table>) => Promise<void>;
}

export const TableEditModal: React.FC<TableEditModalProps> = ({
  isOpen,
  onClose,
  spaces,
  initialData,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Table>>({
    number: '',
    name: '',
    spaceId: '',
    capacity: 2,
    shape: 'square',
    status: 'available',
    notes: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        capacity: initialData.capacity || 2,
        shape: initialData.shape || 'square',
        status: initialData.status || 'available',
        spaceId: initialData.spaceId || spaces[0]?.id || ''
      });
    } else {
      setFormData({
        number: '',
        name: '',
        spaceId: spaces[0]?.id || '',
        capacity: 2,
        shape: 'square',
        status: 'available',
        notes: ''
      });
    }
  }, [initialData, spaces]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number?.trim()) {
      setError('Veuillez renseigner le numéro de table.');
      return;
    }
    if (!formData.spaceId) {
      setError('Veuillez assigner un espace.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-md w-full shadow-2xl border border-[#D9DDD8] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D9DDD8] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-white flex items-center justify-center font-bold">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">
                {initialData?.id ? `Modifier Table ${initialData.number}` : 'Créer une Nouvelle Table'}
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Définissez la capacité, l'espace d'implantation et la forme géométrique
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Numéro de Table *</label>
              <input
                type="text"
                required
                value={formData.number || ''}
                onChange={e => setFormData({ ...formData, number: e.target.value })}
                placeholder="Ex : 12"
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs font-bold bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Nom / Libellé</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex : Table Baie Vitrée"
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Espace / Salle *</label>
              <select
                required
                value={formData.spaceId || ''}
                onChange={e => setFormData({ ...formData, spaceId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs font-medium bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              >
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Nombre de Couverts</label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.capacity || 2}
                onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) || 2 })}
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs font-medium bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Forme Géométrique</label>
              <select
                value={formData.shape || 'square'}
                onChange={e => setFormData({ ...formData, shape: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs font-medium bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              >
                <option value="square">Carrée</option>
                <option value="circle">Ronde</option>
                <option value="rectangle">Rectangle</option>
                <option value="oval">Ovale</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Statut Initial</label>
              <select
                value={formData.status || 'available'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-[#D9DDD8] text-xs font-medium bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27]"
              >
                <option value="available">Libre</option>
                <option value="occupied">Occupée</option>
                <option value="billing">En Paiement</option>
                <option value="reserved">Réservée</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#252A27] mb-1">Notes & Consignes Internes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex : Prises à proximité, vue sur cour..."
              rows={2}
              className="w-full p-2 rounded-xl border border-[#D9DDD8] text-xs bg-[#FBFBFA] focus:outline-hidden focus:border-[#252A27] resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#D9DDD8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] text-xs font-bold transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{initialData?.id ? 'Enregistrer Modifications' : 'Créer la Table'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
