import React from 'react';
import { Sale, Order } from '../../types';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { Printer, Check, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  order?: Order | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, order }) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9DDD8] no-print">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#A4DEC2] text-[#252A27] flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-[#252A27]">Ticket de Caisse Finalisé</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <CopyLinkButton
              view="pos"
              subTab="history"
              id={sale.id}
              iconOnly
            />
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt (80mm styling) */}
        <div className="receipt-print font-mono text-xs text-[#252A27] bg-[#F7F7F5] p-5 rounded-xl border border-[#D9DDD8]">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-[#C7CDC8]">
            <h2 className="font-serif font-bold text-base tracking-wider text-[#252A27]">
              CAFÉ NOIR
            </h2>
            <p className="text-[10px] text-[#555D58]">Torréfaction Artisanale & Table</p>
            <p className="text-[10px] text-[#555D58]">14 Rue du Faubourg Saint-Honoré, Paris</p>
            <p className="text-[10px] text-[#555D58]">Tél: 01 42 68 00 00 &bull; SIRET: 893 452 109 00012</p>
          </div>

          {/* Ticket metadata */}
          <div className="py-2.5 border-b border-dashed border-[#C7CDC8] text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>Ticket N°:</span>
              <span className="font-bold">{sale.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(sale.createdAt).toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span>Table / Réf:</span>
              <span className="font-bold">{sale.tableNumber || 'Comptoir'}</span>
            </div>
            <div className="flex justify-between">
              <span>Caissier:</span>
              <span>{sale.cashierName}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-[#C7CDC8] space-y-2">
            {sale.itemsSummary.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <div className="flex-1 pr-2">
                  <span className="font-bold">{item.quantity}x</span> {item.name}
                </div>
                <span className="font-bold">{item.total.toFixed(3)} DT</span>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="py-3 border-b border-dashed border-[#C7CDC8] space-y-1 text-[11px]">
            <div className="flex justify-between text-[#555D58]">
              <span>Sous-total HT:</span>
              <span>{sale.subtotal.toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between text-[#555D58]">
              <span>TVA (7%):</span>
              <span>{sale.totalTva.toFixed(3)} DT</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>Remise:</span>
                <span>-{sale.discount.toFixed(3)} DT</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-[#252A27] pt-1">
              <span>TOTAL TTC:</span>
              <span>{sale.totalAmount.toFixed(3)} DT</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="py-2.5 border-b border-dashed border-[#C7CDC8] text-[11px] space-y-0.5">
            <div className="flex justify-between">
              <span>Mode de règlement:</span>
              <span className="font-bold capitalize">
                {sale.paymentMethod === 'cash'
                  ? 'Espèces'
                  : sale.paymentMethod === 'card'
                  ? 'Carte Bancaire'
                  : sale.paymentMethod === 'contactless'
                  ? 'Sans Contact'
                  : sale.paymentMethod === 'qr_pay'
                  ? 'Paiement QR Table'
                  : sale.paymentMethod}
              </span>
            </div>
            {sale.amountReceived && (
              <div className="flex justify-between">
                <span>Montant reçu:</span>
                <span>{sale.amountReceived.toFixed(3)} DT</span>
              </div>
            )}
            {sale.changeGiven && (
              <div className="flex justify-between font-bold">
                <span>Rendu monnaie:</span>
                <span>{sale.changeGiven.toFixed(3)} DT</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 text-[10px] text-[#555D58] space-y-0.5">
            <p className="font-semibold text-[#252A27]">Merci de votre visite et à bientôt !</p>
            <p>Café torréfié artisanalement &bull; www.cafenoirstudio.fr</p>
          </div>
        </div>

        {/* Bottom Close (hidden in print) */}
        <div className="mt-3.5 text-center no-print">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] transition-colors border border-[#C7CDC8]"
          >
            Fermer et Retour à la Caisse
          </button>
        </div>
      </div>
    </div>
  );
};
