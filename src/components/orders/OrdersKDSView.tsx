import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Order, OrderItem } from '../../types';
import { CopyLinkButton } from '../common/CopyLinkButton';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  UtensilsCrossed,
  Filter,
  Check,
  X,
  AlertTriangle,
  QrCode,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Bell,
  ChefHat
} from 'lucide-react';

export const OrdersKDSView: React.FC = () => {
  const {
    refreshAlerts,
    globalVersion,
    currentSubTab,
    setCurrentSubTab,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStation, setSelectedStation] = useState<'all' | 'bar' | 'kitchen'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'pending_qr' | 'history'>('active');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const hasValidatedIdRef = useRef(false);

  useEffect(() => {
    if (currentSubTab === 'pending_qr' || currentSubTab === 'pending') {
      setActiveTab('pending_qr');
    } else if (currentSubTab === 'active' || currentSubTab === 'in_prep') {
      setActiveTab('active');
    } else if (currentSubTab === 'history') {
      setActiveTab('history');
    }
  }, [currentSubTab]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data);

      // Deep link ID handling
      if (currentRecordId) {
        const found = data.find(o => o.id === currentRecordId || o.orderNumber === currentRecordId);
        if (found) {
          if (found.status === 'pending_approval') setActiveTab('pending_qr');
          else if (['completed', 'rejected', 'cancelled'].includes(found.status)) setActiveTab('history');
          else setActiveTab('active');
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`La commande demandée (ID: "${currentRecordId}") est introuvable.`, 'warning');
        }
        hasValidatedIdRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [globalVersion]);

  // Accept QR Order
  const handleAccept = async (orderId: string) => {
    try {
      await api.acceptOrder(orderId, currentUser?.name || 'Staff');
      showRouteNotification('Commande QR acceptée et envoyée en préparation', 'success');
      loadOrders();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Reject QR Order
  const handleRejectConfirm = async () => {
    if (!rejectingOrderId) return;
    try {
      await api.rejectOrder(rejectingOrderId, rejectionReason || 'Rupture de produit', currentUser?.name || 'Staff');
      setRejectingOrderId(null);
      setRejectionReason('');
      showRouteNotification('Commande QR refusée', 'info');
      loadOrders();
      refreshAlerts();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  // Check off item in Kitchen / Bar
  const handleToggleItemStatus = async (orderId: string, itemId: string, currentStatus: OrderItem['status']) => {
    const nextStatus: OrderItem['status'] =
      currentStatus === 'pending'
        ? 'preparing'
        : currentStatus === 'preparing'
        ? 'ready'
        : currentStatus === 'ready'
        ? 'served'
        : 'served';

    try {
      await api.updateItemStatus(orderId, itemId, nextStatus, currentUser?.name || 'Cuisine');
      loadOrders();
    } catch (err: any) {
      console.error('Failed to update item status:', err);
    }
  };

  // Filter orders by tab & station
  const safeOrders = Array.isArray(orders) ? orders : [];
  const pendingQrOrders = safeOrders.filter(o => o.status === 'pending_approval');
  const activeOrders = safeOrders.filter(
    o => o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served'
  );
  const historyOrders = safeOrders.filter(o => o.status === 'completed' || o.status === 'rejected' || o.status === 'cancelled');

  const displayedOrders =
    activeTab === 'pending_qr'
      ? pendingQrOrders
      : activeTab === 'active'
      ? activeOrders
      : historyOrders;

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* Top Header & Tab Controls */}
      <div className="bg-[#F2F3F0] p-3.5 sm:p-4 rounded-2xl border border-[#D9DDD8] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] text-[#555D58] font-bold uppercase tracking-wider mb-0.5">
            <ChefHat className="w-3.5 h-3.5 text-[#252A27]" />
            <span>KITCHEN & BAR DISPLAY SYSTEM (KDS)</span>
          </div>
          <h1 className="text-lg sm:text-xl font-serif font-black text-[#252A27]">
            File de Production & Bons de Préparation
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#ECEEEA] p-0.5 rounded-xl border border-[#D9DDD8]">
            <button
              onClick={() => {
                setActiveTab('active');
                setCurrentSubTab('active');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'active'
                  ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                  : 'text-[#555D58] hover:text-[#252A27]'
              }`}
            >
              En Cours ({activeOrders.length})
            </button>

            <button
              onClick={() => {
                setActiveTab('pending_qr');
                setCurrentSubTab('pending_qr');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeTab === 'pending_qr'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-[#555D58] hover:text-[#252A27]'
              }`}
            >
              En Attente QR ({pendingQrOrders.length})
              {pendingQrOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                setCurrentSubTab('history');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                  : 'text-[#555D58] hover:text-[#252A27]'
              }`}
            >
              Historique
            </button>
          </div>

          <button
            onClick={loadOrders}
            className="p-2 rounded-lg bg-white hover:bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] transition-colors shadow-2xs"
            title="Rafraîchir les bons"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Station Filters (All, Bar, Kitchen) */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-bold text-[#555D58]">Poste :</span>
        {[
          { id: 'all', label: 'Tous les Postes', icon: Filter },
          { id: 'bar', label: 'Bar & Torréfaction', icon: Coffee },
          { id: 'kitchen', label: 'Cuisine & Brunch', icon: UtensilsCrossed }
        ].map(st => {
          const Icon = st.icon;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStation(st.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                selectedStation === st.id
                  ? 'bg-[#252A27] text-[#A4DEC2]'
                  : 'bg-white text-[#252A27] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Orders Grid (Large Tablet Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {displayedOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-[#D9DDD8] space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#A4DEC2]/30 border border-[#A4DEC2] text-[#252A27] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#252A27]">Aucun bon dans cette file</h3>
            <p className="text-xs text-[#555D58]">
              Toutes les préparations sont à jour ou en attente d'une nouvelle commande.
            </p>
          </div>
        ) : (
          displayedOrders.map(order => {
            const isPendingQR = order.status === 'pending_approval';
            const elapsedMinutes = Math.floor(
              (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)
            );

            // Filter items by selected station if not 'all'
            const filteredItems = (order.items || []).filter(
              i => selectedStation === 'all' || i.station === selectedStation || (!i.station && selectedStation === 'bar')
            );

            if (filteredItems.length === 0 && selectedStation !== 'all') {
              return null;
            }

            return (
              <div
                key={order.id}
                onClick={() => setCurrentRecordId(order.id, { replace: true })}
                className={`bg-white rounded-2xl border p-4 flex flex-col justify-between transition-all shadow-2xs ${
                  isPendingQR
                    ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                    : order.status === 'ready'
                    ? 'border-[#A4DEC2] bg-[#A4DEC2]/10'
                    : 'border-[#D9DDD8]'
                }`}
              >
                {/* Card Top: Order Number, Table & Elapsed Time */}
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#ECEEEA] mb-2.5">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-black text-sm text-[#252A27]">
                          {order.orderNumber}
                        </span>
                        {order.source === 'qr_table' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center space-x-1">
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </span>
                        )}
                        <CopyLinkButton
                          view="orders"
                          id={order.id}
                          iconOnly
                        />
                      </div>
                      <p className="text-xs text-[#555D58] font-semibold mt-0.5">
                        {order.tableNumber ? `Table ${order.tableNumber} (${order.spaceName || 'Salle'})` : 'À Emporter'} &bull; {order.customerName}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#252A27] block">
                        {order.total.toFixed(3)} DT
                      </span>
                      <span
                        className={`text-[11px] font-bold flex items-center space-x-1 justify-end ${
                          elapsedMinutes > 15 ? 'text-rose-700' : 'text-[#555D58]'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsedMinutes} min</span>
                      </span>
                    </div>
                  </div>

                  {/* Items list with touch checkoffs */}
                  <div className="space-y-1.5 mb-3">
                    {filteredItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => !isPendingQR && handleToggleItemStatus(order.id, item.id, item.status)}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          item.status === 'served'
                            ? 'bg-[#ECEEEA] border-[#D9DDD8] text-[#555D58] line-through opacity-70'
                            : item.status === 'ready'
                            ? 'bg-[#A4DEC2]/20 border-[#A4DEC2] text-[#252A27] font-bold'
                            : item.status === 'preparing'
                            ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                            : 'bg-[#F7F7F5] border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA]'
                        } ${!isPendingQR ? 'cursor-pointer active:scale-[0.99]' : ''}`}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-[#252A27]">
                              {item.quantity}x
                            </span>
                            <span className="font-bold">{item.productName}</span>
                          </div>
                          {item.options?.length > 0 && (
                            <p className="text-[10px] text-[#555D58] ml-4 font-medium">
                              {item.options.map(o => o.choiceName).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-amber-800 font-bold italic ml-4">
                              "{item.notes}"
                            </p>
                          )}
                        </div>

                        {/* Status badge / tap trigger */}
                        <div className="flex items-center space-x-1 pl-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider">
                            {item.status === 'pending'
                              ? 'En attente'
                              : item.status === 'preparing'
                              ? 'En cours'
                              : item.status === 'ready'
                              ? 'Prêt'
                              : 'Servi'}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center ${
                              item.status === 'ready' || item.status === 'served'
                                ? 'bg-[#252A27] text-[#A4DEC2]'
                                : 'bg-[#D9DDD8] text-[#555D58]'
                            }`}
                          >
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.specialNotes && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 mb-2.5 font-medium">
                      <span className="font-bold">Instructions :</span> {order.specialNotes}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Actions depending on state */}
                <div className="pt-2.5 border-t border-[#ECEEEA]">
                  {isPendingQR ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRejectingOrderId(order.id)}
                        className="py-2 rounded-lg bg-[#ECEEEA] hover:bg-rose-50 text-rose-800 text-xs font-bold border border-[#D9DDD8] transition-colors"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => handleAccept(order.id)}
                        className="py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-2xs border border-[#8BCFAE]"
                      >
                        Accepter Commande
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          order.status === 'ready'
                            ? 'bg-[#A4DEC2] text-[#252A27]'
                            : order.status === 'served'
                            ? 'bg-[#ECEEEA] text-[#555D58]'
                            : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {order.status === 'preparing'
                          ? 'En préparation'
                          : order.status === 'ready'
                          ? 'Prêt pour le service !'
                          : order.status === 'served'
                          ? 'Servi à table'
                          : order.status}
                      </span>
                      <span className="text-[11px] font-bold text-[#555D58]">
                        {order.paymentStatus === 'paid' ? 'Payé' : 'Non payé'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REJECT ORDER MODAL */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5 mb-3.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Refuser la commande QR</h3>
                <p className="text-[11px] text-[#555D58]">Un motif sera transmis au client</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-[11px] font-bold text-[#252A27]">Motif du refus</label>
              <div className="space-y-1">
                {[
                  'Rupture de produit sur la sélection',
                  'Table non occupée physiquement',
                  'Fermeture imminente de la cuisine',
                  'Erreur de commande ou doublon'
                ].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRejectionReason(m)}
                    className={`w-full p-2 rounded-lg border text-xs font-bold text-left transition-all ${
                      rejectionReason === m
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-white border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ou motif personnalisé..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full mt-1.5 p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setRejectingOrderId(null)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
