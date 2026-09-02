import React, { useState } from 'react';
import { Table, Space, Order, Reservation, TableStatus } from '../../types';
import { CopyLinkButton } from '../common/CopyLinkButton';
import {
  X,
  Users,
  Coffee,
  Receipt,
  Calendar,
  Clock,
  Edit2,
  Copy,
  Trash2,
  MoveRight,
  QrCode,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Check,
  ChevronRight,
  ArrowRight,
  Printer
} from 'lucide-react';

interface TableInspectorPanelProps {
  table: Table | null;
  space?: Space;
  spaces: Space[];
  orders: Order[];
  reservations: Reservation[];
  onClose: () => void;
  onUpdateStatus: (status: TableStatus) => Promise<void>;
  onUpdateNotes: (notes: string) => Promise<void>;
  onEditTable: () => void;
  onDuplicateTable: () => void;
  onDeleteTable: () => void;
  onOpenQrModal: () => void;
  onTestQrOrder: () => void;
  onOpenPosOrder: (orderId?: string) => void;
  onSeatReservation: (reservationId: string) => Promise<void>;
  onAcceptQrOrder: (orderId: string) => Promise<void>;
  onRejectQrOrder: (orderId: string) => Promise<void>;
  onViewHistory: () => void;
}

export const TableInspectorPanel: React.FC<TableInspectorPanelProps> = ({
  table,
  space,
  spaces,
  orders,
  reservations,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onEditTable,
  onDuplicateTable,
  onDeleteTable,
  onOpenQrModal,
  onTestQrOrder,
  onOpenPosOrder,
  onSeatReservation,
  onAcceptQrOrder,
  onRejectQrOrder,
  onViewHistory
}) => {
  const [notesText, setNotesText] = useState(table?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedFeedback, setNotesSavedFeedback] = useState(false);

  if (!table) {
    return (
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] p-6 text-center text-[#555D58] space-y-3 shadow-xs">
        <Coffee className="w-10 h-10 mx-auto text-[#C7CDC8]" />
        <p className="text-xs font-medium">Sélectionnez une table sur le plan pour inspecter ses détails, commandes et actions rapides.</p>
      </div>
    );
  }

  // Active or pending orders for this table
  const activeOrder = orders.find(
    o => (o.tableId === table.id || o.tableNumber === table.number) &&
    o.status !== 'completed' && o.status !== 'cancelled'
  );

  const pendingQrOrder = orders.find(
    o => (o.tableId === table.id || o.tableNumber === table.number) &&
    o.status === 'pending_approval'
  );

  // Today's active reservation for this table
  const todayStr = new Date().toISOString().split('T')[0];
  const tableReservation = reservations.find(
    r => r.tableId === table.id && r.status === 'confirmed' && r.reservationDate === todayStr
  );

  const handleSaveNotes = async () => {
    try {
      setIsSavingNotes(true);
      await onUpdateNotes(notesText);
      setNotesSavedFeedback(true);
      setTimeout(() => setNotesSavedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Libre</span>;
      case 'occupied':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Occupée</span>;
      case 'billing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">En Paiement</span>;
      case 'reserved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Réservée</span>;
      case 'waiting':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">QR en attente</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col overflow-hidden max-h-[850px]">
      {/* Header */}
      <div className="p-4 border-b border-[#D9DDD8] bg-[#F7F7F5] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#252A27] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            T{table.number}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-[#252A27]">{table.name || `Table ${table.number}`}</h3>
              {getStatusBadge(table.status)}
            </div>
            <p className="text-[11px] text-[#555D58] mt-0.5">
              {space?.name || 'Salle'} &bull; {table.capacity} couverts &bull; Forme {table.shape}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <CopyLinkButton
            view="tables"
            id={table.id}
            iconOnly
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {/* Status Quick Switcher */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
            Changer le Statut en direct
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onUpdateStatus('available')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                table.status === 'available'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-[#F7F7F5] text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Libre</span>
            </button>

            <button
              onClick={() => onUpdateStatus('occupied')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                table.status === 'occupied'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-[#F7F7F5] text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Occupée</span>
            </button>

            <button
              onClick={() => onUpdateStatus('billing')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                table.status === 'billing'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-[#F7F7F5] text-blue-800 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>En Paiement</span>
            </button>

            <button
              onClick={() => onUpdateStatus('reserved')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                table.status === 'reserved'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-[#F7F7F5] text-purple-800 border-purple-200 hover:bg-purple-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Réservée</span>
            </button>
          </div>
        </div>

        {/* Pending QR Order Notification Card */}
        {pendingQrOrder && (
          <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-3.5 space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Commande QR en attente de validation</span>
              </span>
              <span className="text-xs font-extrabold text-amber-900">
                {pendingQrOrder.total.toFixed(3)} DT
              </span>
            </div>

            <div className="text-[11px] text-amber-800 space-y-1 bg-white/70 p-2 rounded-lg border border-amber-200">
              <div className="flex justify-between">
                <span>Client : {pendingQrOrder.customerName || 'Client Table'}</span>
                <span>{pendingQrOrder.items.length} article(s)</span>
              </div>
              <p className="truncate text-[10px] text-[#555D58]">
                {pendingQrOrder.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => onAcceptQrOrder(pendingQrOrder.id)}
                className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Accepter
              </button>
              <button
                onClick={() => onRejectQrOrder(pendingQrOrder.id)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors"
              >
                Refuser
              </button>
            </div>
          </div>
        )}

        {/* Active Order Card */}
        {activeOrder ? (
          <div className="bg-[#F7F7F5] rounded-xl p-3.5 border border-[#D9DDD8] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#555D58] uppercase">Commande active</span>
                <h4 className="text-xs font-bold text-[#252A27]">
                  {activeOrder.orderNumber} &bull; Statut : {activeOrder.status}
                </h4>
              </div>
              <span className="text-sm font-extrabold text-[#252A27]">
                {activeOrder.total.toFixed(3)} DT
              </span>
            </div>

            {/* Items breakdown preview */}
            <div className="bg-white rounded-lg p-2 border border-[#D9DDD8] space-y-1 max-h-32 overflow-y-auto">
              {activeOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-[#252A27]">
                  <span>
                    <strong className="text-[#555D58]">{item.quantity}x</strong> {item.productName}
                  </span>
                  <span className="font-semibold">{(item.unitPrice * item.quantity).toFixed(3)} DT</span>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => onOpenPosOrder(activeOrder.id)}
                className="flex-1 py-2 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ouvrir Caisse / Encaisser</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#F7F7F5] rounded-xl p-3 border border-[#D9DDD8] flex items-center justify-between">
            <span className="text-xs text-[#555D58]">Aucune commande active</span>
            <button
              onClick={() => onOpenPosOrder()}
              className="px-3 py-1.5 rounded-lg bg-[#252A27] text-white text-xs font-bold hover:bg-[#343B37] transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Prendre Commande</span>
            </button>
          </div>
        )}

        {/* Reservation Card if any */}
        {tableReservation && (
          <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>Réservation confirmée</span>
              </span>
              <span className="text-xs font-bold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                {tableReservation.reservationTime}
              </span>
            </div>
            <div className="text-[11px] text-purple-800 space-y-0.5">
              <p><strong>{tableReservation.customerName}</strong> ({tableReservation.guestsCount} pers.)</p>
              {tableReservation.customerPhone && <p>Tél : {tableReservation.customerPhone}</p>}
              {tableReservation.notes && <p className="italic text-purple-700">« {tableReservation.notes} »</p>}
            </div>
            <button
              onClick={() => onSeatReservation(tableReservation.id)}
              className="w-full py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Installer les clients (Seated)
            </button>
          </div>
        )}

        {/* QR Code Quick Actions Stand */}
        <div className="p-3 bg-[#F7F7F5] rounded-xl border border-[#D9DDD8] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#252A27] flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-[#252A27]" />
              <span>Chevalet QR Code</span>
            </span>
            <button
              onClick={onOpenQrModal}
              className="text-[11px] font-bold text-[#252A27] hover:underline flex items-center space-x-1"
            >
              <Printer className="w-3 h-3" />
              <span>Imprimer</span>
            </button>
          </div>
          <button
            onClick={onTestQrOrder}
            className="w-full py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 border border-[#8BCFAE]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Tester Commande Client sans contact</span>
          </button>
        </div>

        {/* Table Internal Notes Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Notes & Consignes Table
            </label>
            {notesSavedFeedback && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-0.5">
                <Check className="w-3 h-3" />
                <span>Enregistré</span>
              </span>
            )}
          </div>
          <textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            placeholder="Ex : Prise électrique proche, table préférée des réguliers, vue fenêtre..."
            rows={2}
            className="w-full p-2.5 rounded-xl border border-[#D9DDD8] text-xs focus:outline-hidden focus:border-[#252A27] bg-[#FBFBFA] resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="w-full py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] text-xs font-bold transition-colors flex items-center justify-center space-x-1 border border-[#D9DDD8]"
          >
            <Save className="w-3 h-3" />
            <span>{isSavingNotes ? 'Enregistrement...' : 'Enregistrer Notes'}</span>
          </button>
        </div>

        {/* Quick Management Actions */}
        <div className="pt-2 border-t border-[#D9DDD8] space-y-1.5">
          <label className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
            Actions d'Administration
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onEditTable}
              className="py-1.5 px-2 rounded-lg bg-[#F7F7F5] hover:bg-[#ECEEEA] text-[#252A27] text-xs font-medium border border-[#D9DDD8] flex items-center justify-center space-x-1 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>

            <button
              onClick={onDuplicateTable}
              className="py-1.5 px-2 rounded-lg bg-[#F7F7F5] hover:bg-[#ECEEEA] text-[#252A27] text-xs font-medium border border-[#D9DDD8] flex items-center justify-center space-x-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Dupliquer</span>
            </button>

            <button
              onClick={onViewHistory}
              className="py-1.5 px-2 rounded-lg bg-[#F7F7F5] hover:bg-[#ECEEEA] text-[#252A27] text-xs font-medium border border-[#D9DDD8] flex items-center justify-center space-x-1 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historique</span>
            </button>

            <button
              onClick={onDeleteTable}
              className="py-1.5 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium border border-red-200 flex items-center justify-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
