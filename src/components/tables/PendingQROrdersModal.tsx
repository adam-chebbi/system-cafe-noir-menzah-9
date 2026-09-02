import React from 'react';
import { Order, Table, Space } from '../../types';
import {
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Coffee,
  QrCode,
  Clock,
  User,
  Check,
  Receipt
} from 'lucide-react';

interface PendingQROrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrders: Order[];
  tables: Table[];
  spaces: Space[];
  onAcceptOrder: (orderId: string) => Promise<void>;
  onRejectOrder: (orderId: string) => Promise<void>;
}

export const PendingQROrdersModal: React.FC<PendingQROrdersModalProps> = ({
  isOpen,
  onClose,
  pendingOrders,
  tables,
  spaces,
  onAcceptOrder,
  onRejectOrder
}) => {
  if (!isOpen) return null;

  const tableMap = new Map<string, Table>(tables.map(t => [t.number, t]));
  const spaceMap = new Map<string, string>(spaces.map(s => [s.id, s.name]));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-[#D9DDD8] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9DDD8] bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">
                Commandes QR Client en Attente de Validation
              </h3>
              <p className="text-[11px] text-[#555D58]">
                {pendingOrders.length} commande(s) passée(s) par les clients via scan de chevalet QR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555D58] hover:text-[#252A27] hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {pendingOrders.length === 0 ? (
            <div className="py-12 text-center text-[#555D58] text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <p className="font-medium">Toutes les commandes QR ont été traitées !</p>
            </div>
          ) : (
            pendingOrders.map(order => {
              const table = tableMap.get(order.tableNumber);
              const spaceName = table ? spaceMap.get(table.spaceId) : '';

              return (
                <div
                  key={order.id}
                  className="bg-[#F7F7F5] rounded-xl p-4 border border-amber-300 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9DDD8] pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-md bg-[#252A27] text-[#A4DEC2] font-extrabold text-xs">
                        TABLE {order.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-[#252A27]">
                        {spaceName ? `Zone : ${spaceName}` : 'Salle'}
                      </span>
                      {order.customerName && (
                        <span className="text-xs text-[#555D58] flex items-center space-x-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{order.customerName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-extrabold text-[#252A27]">
                        Total : {order.total.toFixed(3)} DT
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-white rounded-lg p-2.5 border border-[#D9DDD8] space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-[#252A27]">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-md bg-[#ECEEEA] font-bold text-center leading-5 text-[11px]">
                            {item.quantity}x
                          </span>
                          <span className="font-medium">{item.productName}</span>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <span className="text-[10px] text-[#555D58] italic">
                              ({item.selectedOptions.map(o => o.choiceName).join(', ')})
                            </span>
                          )}
                        </div>
                        <span className="font-bold">{(item.unitPrice * item.quantity).toFixed(3)} DT</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Notes */}
                  {order.notes && (
                    <div className="text-xs text-[#555D58] bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <strong>Remarque client :</strong> {order.notes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      onClick={() => onRejectOrder(order.id)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Refuser Commande</span>
                    </button>

                    <button
                      onClick={() => onAcceptOrder(order.id)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accepter & Envoyer en Préparation</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
