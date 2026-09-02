import React, { useState } from 'react';
import { Reservation, Table, Space } from '../../types';
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Coffee,
  Check,
  Filter,
  UserCheck
} from 'lucide-react';

interface TableReservationsViewProps {
  reservations: Reservation[];
  tables: Table[];
  spaces: Space[];
  onCreateReservation: () => void;
  onEditReservation: (reservation: Reservation) => void;
  onUpdateStatus: (reservationId: string, status: Reservation['status']) => Promise<void>;
  onDeleteReservation: (reservationId: string) => Promise<void>;
  onSeatReservation: (reservationId: string) => Promise<void>;
}

export const TableReservationsView: React.FC<TableReservationsViewProps> = ({
  reservations,
  tables,
  spaces,
  onCreateReservation,
  onEditReservation,
  onUpdateStatus,
  onDeleteReservation,
  onSeatReservation
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'week' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeSpaces = Array.isArray(spaces) ? spaces : [];

  const tableMap = new Map<string, Table>(safeTables.map(t => [t.id, t]));
  const spaceMap = new Map<string, string>(safeSpaces.map(s => [s.id, s.name]));

  // Filter reservations
  const filteredReservations = safeReservations.filter(res => {
    // Date filter
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = res.reservationDate === todayStr;
    } else if (dateFilter === 'tomorrow') {
      matchesDate = res.reservationDate === tomorrowStr;
    } else if (dateFilter === 'custom') {
      matchesDate = res.reservationDate === customDate;
    }

    // Status filter
    const matchesStatus = statusFilter === 'all' || res.status === statusFilter;

    // Search filter
    const matchesSearch =
      res.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.customerPhone && res.customerPhone.includes(searchTerm)) ||
      (res.notes && res.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesDate && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Confirmée</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">En attente</span>;
      case 'seated':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Installé</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#ECEEEA] text-[#555D58]">Terminée</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">Annulée</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] shadow-xs p-4 space-y-4">
      {/* Top Banner explaining internal reservation management */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F7F7F5] p-3.5 rounded-xl border border-[#D9DDD8]">
        <div>
          <h3 className="font-bold text-sm text-[#252A27]">Gestion Interne des Réservations</h3>
          <p className="text-[11px] text-[#555D58] mt-0.5">
            Module réservé au personnel du café pour enregistrer les réservations téléphoniques & sur place avec détection automatique des conflits.
          </p>
        </div>

        <button
          onClick={onCreateReservation}
          className="px-4 py-2 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Réservation</span>
        </button>
      </div>

      {/* Date & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date pills */}
        <div className="flex items-center space-x-1.5 bg-[#F7F7F5] p-1 rounded-xl border border-[#D9DDD8]">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              dateFilter === 'today' ? 'bg-[#252A27] text-white shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setDateFilter('tomorrow')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              dateFilter === 'tomorrow' ? 'bg-[#252A27] text-white shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            Demain
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              dateFilter === 'all' ? 'bg-[#252A27] text-white shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              dateFilter === 'custom' ? 'bg-[#252A27] text-white shadow-2xs' : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            Date précise
          </button>
        </div>

        {dateFilter === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="px-3 py-1 rounded-xl border border-[#D9DDD8] text-xs font-medium bg-white focus:outline-hidden"
          />
        )}

        {/* Search & Status select */}
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher client, téléphone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs font-medium text-[#252A27] focus:outline-hidden"
          >
            <option value="all">Tous les statuts</option>
            <option value="confirmed">Confirmée</option>
            <option value="pending">En attente</option>
            <option value="seated">Installé (Seated)</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D9DDD8]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F7F5] border-b border-[#D9DDD8] text-[#555D58] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-3.5">Heure & Date</th>
              <th className="py-3 px-3.5">Client</th>
              <th className="py-3 px-3.5">Couverts</th>
              <th className="py-3 px-3.5">Table & Zone</th>
              <th className="py-3 px-3.5">Statut</th>
              <th className="py-3 px-3.5">Notes</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEEA]">
            {filteredReservations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#555D58]">
                  Aucune réservation trouvée pour cette période.
                </td>
              </tr>
            ) : (
              filteredReservations.map(res => {
                const table = res.tableId ? tableMap.get(res.tableId) : null;
                const spaceName = table ? spaceMap.get(table.spaceId) : '';

                return (
                  <tr key={res.id} className="hover:bg-[#FBFBFA] transition-colors">
                    {/* Time & Date */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-[#252A27]">{res.reservationTime}</div>
                          <div className="text-[10px] text-[#555D58]">{res.reservationDate}</div>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-[#252A27]">{res.customerName}</div>
                      <div className="flex items-center space-x-2 text-[10px] text-[#555D58] mt-0.5">
                        {res.customerPhone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-[#7E8882]" />
                            <span>{res.customerPhone}</span>
                          </span>
                        )}
                        {res.customerEmail && (
                          <span className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-[#7E8882]" />
                            <span>{res.customerEmail}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Guests */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-1 font-bold text-[#252A27]">
                        <Users className="w-3.5 h-3.5 text-[#555D58]" />
                        <span>{res.guestsCount} pers.</span>
                      </div>
                    </td>

                    {/* Table */}
                    <td className="py-3 px-3.5">
                      {table ? (
                        <div>
                          <span className="font-bold text-[#252A27]">Table {table.number}</span>
                          <p className="text-[10px] text-[#555D58]">{spaceName || 'Salle'}</p>
                        </div>
                      ) : (
                        <span className="text-[#7E8882] italic">Non assignée</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      {getStatusBadge(res.status)}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-3.5 text-[#555D58] max-w-[160px]">
                      <p className="truncate text-[11px]">{res.notes || '—'}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {res.status === 'confirmed' && (
                          <button
                            onClick={() => onSeatReservation(res.id)}
                            className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center space-x-1 shadow-2xs"
                            title="Installer les clients"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Installer</span>
                          </button>
                        )}

                        <button
                          onClick={() => onEditReservation(res)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27]"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {res.status !== 'completed' && res.status !== 'cancelled' && (
                          <button
                            onClick={() => onUpdateStatus(res.id, 'completed')}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            title="Marquer comme Terminée"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {res.status !== 'cancelled' && (
                          <button
                            onClick={() => onUpdateStatus(res.id, 'cancelled')}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700"
                            title="Annuler Réservation"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteReservation(res.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
