import React, { useState } from 'react';
import { Order } from '../../types';
import { QrCode, Check, X, Clock, AlertTriangle, Coffee, Utensils } from 'lucide-react';

interface QROrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onAccept: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
}

export const QROrdersModal: React.FC<QROrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  onAccept,
  onReject
}) => {
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingQROrders = orders.filter(o => o.status === 'pending_approval' && o.source === 'qr_table');

  const handleAcceptOrder = async (id: string) => {
    setActionLoading(id);
    try {
      await onAccept(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (id: string) => {
    setActionLoading(id);
    try {
      await onReject(id, rejectReason || 'Table indisponible ou rupture produit');
      setRejectingOrderId(null);
      setRejectReason('');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">
                Commandes QR en Attente ({pendingQROrders.length})
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Validation requise avant transmission au bar et à la cuisine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of pending QR orders */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {pendingQROrders.length === 0 ? (
            <div className="py-12 text-center text-[#555D58] space-y-2">
              <Check className="w-8 h-8 mx-auto text-emerald-600" />
              <p className="text-xs font-bold text-[#252A27]">Toutes les commandes QR ont été traitées</p>
              <p className="text-[11px]">Aucune commande client en attente d'approbation</p>
            </div>
          ) : (
            pendingQROrders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-xl border-2 border-amber-300 p-4 space-y-3 shadow-xs"
              >
                {/* Order Top Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEEEA] pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#252A27] text-[#A4DEC2] text-xs font-black">
                      Table {order.tableNumber || '?'}
                    </span>
                    <span className="text-xs font-bold text-[#252A27]">{order.customerName}</span>
                    <span className="text-[11px] text-[#555D58]">({order.spaceName || 'Salle'})</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-[#555D58] flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    <span className="font-serif font-black text-sm text-[#252A27]">{order.total.toFixed(3)} DT</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pl-1">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold text-[#252A27] mr-1.5">{item.quantity}x</span>
                        <span className="text-[#252A27]">{item.productName}</span>
                        {item.options && item.options.length > 0 && (
                          <span className="text-[10px] text-[#555D58] ml-2">
                            ({item.options.map(o => o.choiceName).join(', ')})
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-amber-800 italic ml-5">"{item.notes}"</p>
                        )}
                      </div>
                      <span className="font-semibold text-[#252A27]">{item.totalPrice.toFixed(3)} DT</span>
                    </div>
                  ))}
                </div>

                {order.specialNotes && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-bold">Note client : </span>
                    {order.specialNotes}
                  </div>
                )}

                {/* Reject Input (if active) */}
                {rejectingOrderId === order.id ? (
                  <div className="p-3 bg-[#F7F7F5] rounded-xl border border-rose-300 space-y-2">
                    <label className="text-[11px] font-bold text-rose-900">
                      Motif du refus de la commande :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Table libérée par erreur, produit épuisé..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                    />
                    <div className="flex space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRejectingOrderId(null)}
                        className="flex-1 py-1.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27]"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmReject(order.id)}
                        disabled={actionLoading === order.id}
                        className="flex-1 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
                      >
                        Confirmer le Refus
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons */
                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingOrderId(order.id);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#ECEEEA] hover:bg-rose-50 text-rose-800 hover:border-rose-300 border border-[#D9DDD8] text-xs font-bold transition-colors"
                    >
                      Refuser
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={actionLoading === order.id}
                      className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {actionLoading === order.id ? 'Lancement...' : 'Accepter & Lancer la Préparation'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#D9DDD8] text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
