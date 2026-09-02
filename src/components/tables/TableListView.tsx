import React, { useState } from 'react';
import { Table, Space, Order, Reservation, TableStatus } from '../../types';
import {
  Search,
  Filter,
  Plus,
  QrCode,
  Edit2,
  Copy,
  Trash2,
  Clock,
  Receipt,
  Users,
  CheckCircle2,
  Coffee,
  Calendar,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface TableListViewProps {
  tables: Table[];
  spaces: Space[];
  orders: Order[];
  reservations: Reservation[];
  onSelectTable: (tableId: string) => void;
  onEditTable: (table: Table) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onOpenQrModal: (table: Table) => void;
  onOpenPosOrder: (table: Table, orderId?: string) => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => Promise<void>;
  onViewHistory: (tableId: string) => void;
  onAddTable: () => void;
}

export const TableListView: React.FC<TableListViewProps> = ({
  tables,
  spaces,
  orders,
  reservations,
  onSelectTable,
  onEditTable,
  onDuplicateTable,
  onDeleteTable,
  onOpenQrModal,
  onOpenPosOrder,
  onUpdateStatus,
  onViewHistory,
  onAddTable
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  const safeTables = Array.isArray(tables) ? tables : [];
  const safeSpaces = Array.isArray(spaces) ? spaces : [];

  const spacesMap = new Map(safeSpaces.map(s => [s.id, s.name]));

  // Filtered tables
  const filteredTables = safeTables.filter(table => {
    const matchesSearch =
      table.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (table.notes && table.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSpace = selectedSpaceId === 'all' || table.spaceId === selectedSpaceId;
    const matchesStatus = selectedStatus === 'all' || table.status === selectedStatus;
    const matchesCapacity = minCapacity === 0 || table.capacity >= minCapacity;

    return matchesSearch && matchesSpace && matchesStatus && matchesCapacity;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Libre</span>;
      case 'occupied':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Occupée</span>;
      case 'billing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">En Paiement</span>;
      case 'reserved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Réservée</span>;
      case 'waiting':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">QR en attente</span>;
      default:
        return null;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] shadow-xs overflow-hidden flex flex-col space-y-4 p-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par numéro, nom, note..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs focus:outline-hidden focus:border-[#252A27]"
          />
        </div>

        {/* Space Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-[11px] font-bold text-[#555D58]">Espace :</label>
          <select
            value={selectedSpaceId}
            onChange={e => setSelectedSpaceId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs text-[#252A27] focus:outline-hidden"
          >
            <option value="all">Tous les espaces ({safeTables.length})</option>
            {safeSpaces.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({safeTables.filter(t => t.spaceId === s.id).length})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <label className="text-[11px] font-bold text-[#555D58]">Statut :</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs text-[#252A27] focus:outline-hidden"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">Libre</option>
            <option value="occupied">Occupée</option>
            <option value="billing">En Paiement</option>
            <option value="reserved">Réservée</option>
            <option value="waiting">QR en attente</option>
          </select>
        </div>

        {/* Add Table Button */}
        <button
          onClick={onAddTable}
          className="px-3.5 py-1.5 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Table</span>
        </button>
      </div>

      {/* Tables Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D9DDD8]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F7F5] border-b border-[#D9DDD8] text-[#555D58] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-3.5">Table</th>
              <th className="py-3 px-3.5">Espace / Zone</th>
              <th className="py-3 px-3.5">Capacité & Forme</th>
              <th className="py-3 px-3.5">Statut Actuel</th>
              <th className="py-3 px-3.5">Commande en Cours</th>
              <th className="py-3 px-3.5">Réservation du jour</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEEA]">
            {filteredTables.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#555D58]">
                  Aucune table ne correspond à vos critères de recherche.
                </td>
              </tr>
            ) : (
              filteredTables.map(table => {
                const activeOrder = orders.find(
                  o => (o.tableId === table.id || o.tableNumber === table.number) &&
                  o.status !== 'completed' && o.status !== 'cancelled'
                );

                const tableRes = reservations.find(
                  r => r.tableId === table.id && r.status === 'confirmed' && r.reservationDate === todayStr
                );

                return (
                  <tr
                    key={table.id}
                    className="hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                    onClick={() => onSelectTable(table.id)}
                  >
                    {/* Table Name & Number */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#252A27] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                          T{table.number}
                        </div>
                        <div>
                          <div className="font-bold text-[#252A27]">{table.name || `Table ${table.number}`}</div>
                          {table.notes && (
                            <p className="text-[10px] text-[#555D58] truncate max-w-[140px] italic">
                              {table.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Space */}
                    <td className="py-3 px-3.5 font-medium text-[#252A27]">
                      {spacesMap.get(table.spaceId) || 'Salle principale'}
                    </td>

                    {/* Capacity & Shape */}
                    <td className="py-3 px-3.5 text-[#555D58]">
                      <div className="flex items-center space-x-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#252A27]" />
                        <span>{table.capacity} pers.</span>
                        <span className="text-[10px] text-[#7E8882]">({table.shape})</span>
                      </div>
                    </td>

                    {/* Status with inline quick switcher */}
                    <td className="py-3 px-3.5" onClick={e => e.stopPropagation()}>
                      <select
                        value={table.status}
                        onChange={e => onUpdateStatus(table.id, e.target.value as TableStatus)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border transition-colors cursor-pointer ${
                          table.status === 'available'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : table.status === 'occupied'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : table.status === 'billing'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : table.status === 'reserved'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        <option value="available">Libre</option>
                        <option value="occupied">Occupée</option>
                        <option value="billing">En Paiement</option>
                        <option value="reserved">Réservée</option>
                        <option value="waiting">QR en attente</option>
                      </select>
                    </td>

                    {/* Active Order */}
                    <td className="py-3 px-3.5">
                      {activeOrder ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1 font-bold text-[#252A27]">
                            <Receipt className="w-3 h-3 text-[#555D58]" />
                            <span>{activeOrder.total.toFixed(3)} DT</span>
                          </div>
                          <p className="text-[10px] text-[#555D58]">
                            {activeOrder.items.length} art. ({activeOrder.status})
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#7E8882] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Reservation */}
                    <td className="py-3 px-3.5">
                      {tableRes ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1 font-bold text-purple-800">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>{tableRes.reservationTime}</span>
                          </div>
                          <p className="text-[10px] text-purple-700 truncate max-w-[120px]">
                            {tableRes.customerName} ({tableRes.guestsCount}p)
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#7E8882] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onOpenQrModal(table)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] transition-colors"
                          title="Chevalet QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenPosOrder(table, activeOrder?.id)}
                          className="p-1.5 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] transition-colors"
                          title="Prendre / Ouvrir commande POS"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditTable(table)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] transition-colors"
                          title="Modifier la Table"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicateTable(table.id)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] transition-colors"
                          title="Dupliquer la Table"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onViewHistory(table.id)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] transition-colors"
                          title="Consulter l'Historique"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteTable(table.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Supprimer la Table"
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
