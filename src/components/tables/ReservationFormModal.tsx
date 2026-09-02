import React, { useState, useEffect } from 'react';
import { Reservation, Table, Space } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  AlertCircle,
  Check,
  CheckCircle2
} from 'lucide-react';

interface ReservationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  spaces: Space[];
  initialData?: Partial<Reservation> | null;
  onSave: (data: Partial<Reservation>) => Promise<void>;
}

export const ReservationFormModal: React.FC<ReservationFormModalProps> = ({
  isOpen,
  onClose,
  tables,
  spaces,
  initialData,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Reservation>>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    tableId: '',
    guestsCount: 2,
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '12:30',
    status: 'confirmed',
    notes: ''
  });

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        reservationDate: initialData.reservationDate || new Date().toISOString().split('T')[0],
        reservationTime: initialData.reservationTime || '12:30',
        guestsCount: initialData.guestsCount || 2,
        status: initialData.status || 'confirmed'
      });
    } else {
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        tableId: tables[0]?.id || '',
        guestsCount: 2,
        reservationDate: new Date().toISOString().split('T')[0],
        reservationTime: '12:30',
        status: 'confirmed',
        notes: ''
      });
    }
  }, [initialData, tables]);

  // Check conflicts whenever table, date, or time changes
  useEffect(() => {
    const check = async () => {
      if (!formData.tableId || !formData.reservationDate || !formData.reservationTime) {
        setConflictWarning(null);
        return;
      }
      try {
        const res = await api.checkReservationConflict(
          formData.tableId,
          formData.reservationDate,
          formData.reservationTime,
          initialData?.id
        );
        if (res.hasConflict && res.conflictingReservation) {
          setConflictWarning(
            `Conflit détecté : La Table ${tables.find(t => t.id === formData.tableId)?.number} est déjà réservée à ${res.conflictingReservation.reservationTime} par ${res.conflictingReservation.customerName}.`
          );
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        console.error('Failed to check conflict:', err);
      }
    };
    check();
  }, [formData.tableId, formData.reservationDate, formData.reservationTime, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName?.trim()) {
      setError('Veuillez renseigner le nom du client.');
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

  const spacesMap = new Map(spaces.map(s => [s.id, s.name]));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-lg w-full shadow-2xl border border-[#D9DDD8] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#D9DDD8] bg-[#F7F7F5] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">
                {initialData?.id ? 'Modifier Réservation' : 'Nouvelle Réservation Interne'}
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Enregistrement de réservation avec contrôle de disponibilité
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

          {conflictWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Customer Info */}
          <div className="space-y-3 bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
            <h4 className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Coordonnées Client
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Nom du client *</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.customerName || ''}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Ex : Martin Dupont"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.customerPhone || ''}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="06 12 34 56 78"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Email (optionnel)</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.customerEmail || ''}
                    onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="client@email.com"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Date, Time, Table, Guests */}
          <div className="space-y-3 bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
            <h4 className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Détails de la Réservation
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.reservationDate || ''}
                  onChange={e => setFormData({ ...formData, reservationDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Heure</label>
                <input
                  type="time"
                  required
                  value={formData.reservationTime || '12:30'}
                  onChange={e => setFormData({ ...formData, reservationTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Table assignée</label>
                <select
                  value={formData.tableId || ''}
                  onChange={e => setFormData({ ...formData, tableId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden font-medium"
                >
                  <option value="">Non assignée</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} ({t.capacity}p - {spacesMap.get(t.spaceId) || 'Salle'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#252A27] mb-1">Nombre de couverts</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.guestsCount || 2}
                  onChange={e => setFormData({ ...formData, guestsCount: Number(e.target.value) || 2 })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Statut initial</label>
              <select
                value={formData.status || 'confirmed'}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden font-medium"
              >
                <option value="confirmed">Confirmée</option>
                <option value="pending">En attente de confirmation</option>
                <option value="seated">Installé (Seated)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#252A27] mb-1">Notes / Demandes spécifiques</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex : Anniversaire, chaise haute bébé, table au calme..."
                rows={2}
                className="w-full p-2 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Submit Buttons */}
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
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{initialData?.id ? 'Enregistrer Modifications' : 'Créer la Réservation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
