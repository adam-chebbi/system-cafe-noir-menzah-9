import React from 'react';
import { Table, Order, Reservation } from '../../types';
import {
  Layers,
  Users,
  CheckCircle2,
  Coffee,
  Receipt,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react';

interface TableSummaryMetricsProps {
  tables: Table[];
  orders: Order[];
  reservations: Reservation[];
  pendingQrOrders: Order[];
  onOpenPendingOrders: () => void;
  onFilterByStatus?: (status: string) => void;
  activeStatusFilter?: string;
}

export const TableSummaryMetrics: React.FC<TableSummaryMetricsProps> = ({
  tables = [],
  orders = [],
  reservations = [],
  pendingQrOrders = [],
  onOpenPendingOrders,
  onFilterByStatus,
  activeStatusFilter
}) => {
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const safePendingQr = Array.isArray(pendingQrOrders) ? pendingQrOrders : [];

  const totalTables = safeTables.length;
  const totalCapacity = safeTables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);

  const availableTables = safeTables.filter(t => t.status === 'available');
  const occupiedTables = safeTables.filter(t => t.status === 'occupied');
  const billingTables = safeTables.filter(t => t.status === 'billing');
  const reservedTables = safeTables.filter(t => t.status === 'reserved');
  const waitingTables = safeTables.filter(t => t.status === 'waiting');

  const occupiedCount = occupiedTables.length + billingTables.length + waitingTables.length;
  const occupancyRate = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReservations = safeReservations.filter(
    r => r.reservationDate === todayStr && r.status !== 'cancelled'
  );

  return (
    <div className="space-y-2.5">
      {/* Live Pending QR Order Alert Banner if any */}
      {safePendingQr.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-900">
                  {pendingQrOrders.length} Commande{pendingQrOrders.length > 1 ? 's' : ''} QR en attente de validation
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  Action requise
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Tables concernées : {Array.from(new Set(pendingQrOrders.map(o => `Table ${o.tableNumber}`))).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPendingOrders}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
          >
            <span>Examiner & Valider</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Tables & Capacity */}
        <div
          onClick={() => onFilterByStatus?.('all')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeStatusFilter === 'all' || !activeStatusFilter
              ? 'bg-[#FFFFFF] border-[#252A27] shadow-xs'
              : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between text-[#555D58] mb-1">
            <span className="text-[11px] font-medium">Total Tables</span>
            <Layers className="w-4 h-4 text-[#252A27]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-[#252A27]">{totalTables}</span>
            <span className="text-[11px] text-[#555D58]">({totalCapacity} couverts)</span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[10px] text-[#555D58]">
            <Users className="w-3 h-3" />
            <span>Capacité globale du café</span>
          </div>
        </div>

        {/* Available / Libre */}
        <div
          onClick={() => onFilterByStatus?.('available')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeStatusFilter === 'available'
              ? 'bg-emerald-50 border-emerald-600 shadow-xs'
              : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-medium">Tables Libres</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-emerald-700">{availableTables.length}</span>
            <span className="text-[11px] text-emerald-700">
              {totalTables > 0 ? Math.round((availableTables.length / totalTables) * 100) : 0}%
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Prêtes à être occupées</span>
          </div>
        </div>

        {/* Occupied / Occupée */}
        <div
          onClick={() => onFilterByStatus?.('occupied')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeStatusFilter === 'occupied'
              ? 'bg-amber-50 border-amber-600 shadow-xs'
              : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-medium">Occupées</span>
            <Coffee className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-amber-700">{occupiedTables.length}</span>
            <span className="text-[11px] text-amber-700">
              {totalTables > 0 ? Math.round((occupiedTables.length / totalTables) * 100) : 0}%
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[10px] text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>Service en cours</span>
          </div>
        </div>

        {/* In Payment / Billing */}
        <div
          onClick={() => onFilterByStatus?.('billing')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeStatusFilter === 'billing'
              ? 'bg-blue-50 border-blue-600 shadow-xs'
              : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-[11px] font-medium">En Paiement</span>
            <Receipt className="w-4 h-4 text-blue-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-blue-700">{billingTables.length}</span>
            <span className="text-[11px] text-blue-700">tables</span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[10px] text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            <span>Addition demandée</span>
          </div>
        </div>

        {/* Reserved */}
        <div
          onClick={() => onFilterByStatus?.('reserved')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeStatusFilter === 'reserved'
              ? 'bg-purple-50 border-purple-600 shadow-xs'
              : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#FFFFFF]'
          }`}
        >
          <div className="flex items-center justify-between text-purple-800 mb-1">
            <span className="text-[11px] font-medium">Réservées</span>
            <Calendar className="w-4 h-4 text-purple-700" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-purple-700">{reservedTables.length}</span>
            <span className="text-[11px] text-purple-700">({todayReservations.length} auj.)</span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[10px] text-purple-700">
            <Clock className="w-3 h-3" />
            <span>Gestion interne</span>
          </div>
        </div>

        {/* Taux d'occupation global */}
        <div className="p-3 rounded-xl border border-[#D9DDD8] bg-[#F7F7F5]">
          <div className="flex items-center justify-between text-[#555D58] mb-1">
            <span className="text-[11px] font-medium">Taux d'Occupation</span>
            <TrendingUp className="w-4 h-4 text-[#252A27]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-[#252A27]">{occupancyRate}%</span>
            <span className="text-[11px] text-[#555D58]">
              {occupiedCount}/{totalTables}
            </span>
          </div>
          <div className="mt-1.5 w-full bg-[#E3E6E2] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                occupancyRate > 80
                  ? 'bg-amber-500'
                  : occupancyRate > 50
                  ? 'bg-emerald-600'
                  : 'bg-[#252A27]'
              }`}
              style={{ width: `${Math.min(100, occupancyRate)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
