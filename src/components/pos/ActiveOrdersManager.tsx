import React, { useState, useEffect } from 'react';
import { Order, Table, User } from '../../types';
import { api } from '../../services/api';
import {
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  ArrowRightLeft,
  XCircle,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { FastPaymentModal } from './FastPaymentModal';
import { useSystem } from '../../context/SystemContext';

interface ActiveOrdersManagerProps {
  orders: Order[];
  tables: Table[];
  currentUser: User | null;
  onRefresh: () => Promise<void>;
  onLoadOrderIntoPOS: (order: Order) => void;
  onOrderPaid: (sale: any) => void;
}

export const ActiveOrdersManager: React.FC<ActiveOrdersManagerProps> = ({
  orders,
  tables,
  currentUser,
  onRefresh,
  onLoadOrderIntoPOS,
  onOrderPaid
}) => {
  const { showRouteNotification } = useSystem();
  const [now, setNow] = useState<Date>(new Date());
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null);
  const [transferringOrder, setTransferringOrder] = useState<Order | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine_in' | 'takeaway'>('all');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter(o =>
    o && ['accepted', 'preparing', 'ready', 'served'].includes(o.status)
  );

  const filteredOrders = activeOrders.filter(o => {
    const matchesSearch =
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (o.items && o.items.some(i => i.productName.toLowerCase().includes(searchFilter.toLowerCase())));

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'dine_in' && o.source !== 'takeaway') ||
      (typeFilter === 'takeaway' && o.source === 'takeaway');

    return matchesSearch && matchesType;
  });

  const calculateElapsedTime = (startTimeStr?: string) => {
    if (!startTimeStr) return { formatted: '00:00', minutes: 0 };
    const start = new Date(startTimeStr).getTime();
    const current = now.getTime();
    const diffSeconds = Math.max(0, Math.floor((current - start) / 1000));
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    return {
      formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      minutes
    };
  };

  const handleTransferTable = async () => {
    if (!transferringOrder || !targetTableId) return;
    setActionLoading(true);
    try {
      await api.transferOrder(transferringOrder.id, targetTableId, currentUser?.name || 'Staff');
      setTransferringOrder(null);
      setTargetTableId('');
      showRouteNotification('Commande transférée sur la nouvelle table', 'success');
      await onRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur de transfert: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);
    try {
      await api.cancelOrder(cancellingOrder.id, cancelReason || 'Annulée en caisse', currentUser?.name || 'Staff');
      setCancellingOrder(null);
      setCancelReason('');
      showRouteNotification(`Commande #${cancellingOrder.orderNumber} annulée`, 'success');
      await onRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur d'annulation: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayment = async (paymentData: any) => {
    if (!selectedOrderForPay) return;
    setActionLoading(true);
    try {
      const result = await api.payOrder(selectedOrderForPay.id, {
        ...paymentData,
        cashierId: currentUser?.id || 'usr_staff',
        cashierName: currentUser?.name || 'Caissier'
      });
      setSelectedOrderForPay(null);
      showRouteNotification(`Commande #${selectedOrderForPay.orderNumber} encaissée avec succès`, 'success');
      onOrderPaid(result.sale);
      await onRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur lors du règlement: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Top filter bar */}
      <div className="p-3.5 bg-[#F2F3F0] border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher table, numéro, client..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>

          <div className="flex bg-white p-0.5 rounded-lg border border-[#D9DDD8]">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                typeFilter === 'all' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Toutes ({activeOrders.length})
            </button>
            <button
              onClick={() => setTypeFilter('dine_in')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                typeFilter === 'dine_in' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Sur Place ({activeOrders.filter(o => o.source !== 'takeaway').length})
            </button>
            <button
              onClick={() => setTypeFilter('takeaway')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                typeFilter === 'takeaway' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              À Emporter ({activeOrders.filter(o => o.source === 'takeaway').length})
            </button>
          </div>
        </div>

        <button
          onClick={() => onRefresh()}
          className="p-2 rounded-lg bg-white border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA] transition-colors"
          title="Actualiser les commandes"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of active orders */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#555D58] space-y-2 py-16">
            <div className="w-12 h-12 rounded-xl bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <p className="text-sm font-bold text-[#252A27]">Aucune commande active en cours</p>
            <p className="text-xs text-[#555D58]">
              Toutes les commandes ont été encaissées ou aucune table n'est occupée
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredOrders.map(order => {
              const elapsed = calculateElapsedTime(order.launchedAt || order.createdAt);
              const isTakeaway = order.source === 'takeaway';
              const timerColor =
                elapsed.minutes > 20
                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                  : elapsed.minutes > 10
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-[#D9DDD8] hover:border-[#252A27] p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#ECEEEA]">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-black">
                          {isTakeaway ? 'À Emporter' : `Table ${order.tableNumber || '?'}`}
                        </span>
                        {!isTakeaway && order.spaceName && (
                          <span className="text-[11px] text-[#555D58] font-medium">
                            {order.spaceName}
                          </span>
                        )}
                      </div>

                      {/* Live Timer Pill */}
                      <div
                        className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${timerColor}`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsed.formatted}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[#555D58] mt-1.5">
                      <span>N° {order.orderNumber}</span>
                      <span>Client : <strong className="text-[#252A27]">{order.customerName}</strong></span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-[#F7F7F5] rounded-lg p-2.5 space-y-1.5 max-h-36 overflow-y-auto border border-[#ECEEEA]">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs items-start">
                        <div className="pr-2 flex-1">
                          <span className="font-bold text-[#252A27] mr-1">{item.quantity}x</span>
                          <span className="text-[#252A27]">{item.productName}</span>
                          {item.options && item.options.length > 0 && (
                            <span className="text-[10px] text-[#555D58] ml-1">
                              ({item.options.map(o => o.choiceName).join(', ')})
                            </span>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-amber-800 italic">"{item.notes}"</p>
                          )}
                        </div>
                        <span className="font-semibold text-[#252A27]">
                          {item.totalPrice.toFixed(3)} DT
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-rose-700 font-semibold px-1">
                      <span>Remise appliquée :</span>
                      <span>-{order.discountAmount.toFixed(3)} DT</span>
                    </div>
                  )}

                  {/* Total & Action Buttons */}
                  <div className="pt-2 border-t border-[#ECEEEA] space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-[#555D58]">Total TTC :</span>
                      <span className="text-lg font-serif font-black text-[#252A27]">
                        {order.total.toFixed(3)} DT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onLoadOrderIntoPOS(order)}
                        className="py-2 px-2.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] text-xs font-bold transition-colors border border-[#D9DDD8] flex items-center justify-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier / Compléter</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForPay(order)}
                        className="py-2 px-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center justify-center space-x-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Encaisser</span>
                      </button>
                    </div>

                    {/* Secondary Actions (Transfer & Cancel) */}
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      {!isTakeaway && (
                        <button
                          type="button"
                          onClick={() => setTransferringOrder(order)}
                          className="text-[#555D58] hover:text-[#252A27] flex items-center space-x-1 font-semibold"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Changer de table</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingOrder(order);
                          setCancelReason('');
                        }}
                        className="text-rose-700 hover:text-rose-900 flex items-center space-x-1 font-semibold ml-auto"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Annuler</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Transfer Table */}
      {transferringOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#252A27] mb-1">
              Transférer la commande (Table {transferringOrder.tableNumber})
            </h3>
            <p className="text-xs text-[#555D58] mb-4">
              Choisissez la nouvelle table de destination pour cette commande.
            </p>

            <div className="space-y-3 mb-4">
              <label className="text-xs font-bold text-[#252A27]">Table de destination :</label>
              <select
                value={targetTableId}
                onChange={e => setTargetTableId(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
              >
                <option value="">Sélectionner une table...</option>
                {tables
                  .filter(t => t.id !== transferringOrder.tableId)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} ({t.capacity} pers. - {t.status === 'occupied' ? 'Occupée' : 'Libre'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setTransferringOrder(null)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleTransferTable}
                disabled={!targetTableId || actionLoading}
                className="flex-1 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] disabled:opacity-40 transition-colors"
              >
                {actionLoading ? 'Transfert...' : 'Confirmer le Transfert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Order */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-rose-900 mb-1">
              Annuler la Commande N° {cancellingOrder.orderNumber}
            </h3>
            <p className="text-xs text-[#555D58] mb-3">
              Cette action libérera la table et annulera la préparation en cuisine.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-[#252A27]">Motif de l'annulation :</label>
              <input
                type="text"
                placeholder="Ex: Client parti, erreur de saisie..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
              >
                {actionLoading ? 'Annulation...' : 'Confirmer l\'Annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Payment Modal */}
      {selectedOrderForPay && (
        <FastPaymentModal
          isOpen={true}
          onClose={() => setSelectedOrderForPay(null)}
          totalAmount={selectedOrderForPay.total}
          subtotal={selectedOrderForPay.subtotal}
          tvaAmount={selectedOrderForPay.tvaAmount}
          discountAmount={selectedOrderForPay.discountAmount}
          tableNumber={selectedOrderForPay.tableNumber}
          orderType={selectedOrderForPay.source === 'takeaway' ? 'takeaway' : 'dine_in'}
          currentUser={currentUser}
          onConfirmPayment={handleProcessPayment}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
