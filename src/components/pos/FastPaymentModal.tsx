import React, { useState } from 'react';
import { CreditCard, Banknote, Smartphone, Tag, Percent, X, Check, Calculator, ArrowRight, AlertCircle } from 'lucide-react';
import { Table, User } from '../../types';

interface FastPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  subtotal: number;
  tvaAmount: number;
  discountAmount: number;
  tableNumber?: string;
  orderType: 'dine_in' | 'takeaway';
  currentUser: User | null;
  onConfirmPayment: (paymentData: {
    paymentMethod: 'cash' | 'card' | 'contactless' | 'qr_pay' | 'voucher' | 'split';
    splitDetails?: { method: string; amount: number }[];
    amountReceived?: number;
    changeGiven?: number;
  }) => Promise<void>;
  loading: boolean;
}

export const FastPaymentModal: React.FC<FastPaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  subtotal,
  tvaAmount,
  discountAmount,
  tableNumber,
  orderType,
  currentUser,
  onConfirmPayment,
  loading
}) => {
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cash' | 'contactless' | 'qr_pay' | 'voucher'>('card');
  const [cashTendered, setCashTendered] = useState<string>('');

  // Split payment state
  const [splits, setSplits] = useState<{ method: string; amount: number }[]>([
    { method: 'card', amount: Number((totalAmount / 2).toFixed(2)) },
    { method: 'cash', amount: Number((totalAmount - Number((totalAmount / 2).toFixed(2))).toFixed(2)) }
  ]);

  if (!isOpen) return null;

  const cashReceived = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, Number((cashReceived - totalAmount).toFixed(2)));
  const isCashInsufficient = selectedMethod === 'cash' && cashReceived > 0 && cashReceived < totalAmount;

  // Split calculation
  const totalSplit = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitRemaining = Number((totalAmount - totalSplit).toFixed(2));
  const isSplitValid = Math.abs(splitRemaining) < 0.01;

  const handleQuickCash = (amt: number) => {
    setCashTendered(String(amt));
  };

  const handleExactCash = () => {
    setCashTendered(String(totalAmount.toFixed(2)));
  };

  const handleSubmit = async () => {
    if (paymentMode === 'single') {
      await onConfirmPayment({
        paymentMethod: selectedMethod,
        amountReceived: selectedMethod === 'cash' ? (cashReceived || totalAmount) : totalAmount,
        changeGiven: selectedMethod === 'cash' ? changeDue : 0
      });
    } else {
      if (!isSplitValid) return;
      await onConfirmPayment({
        paymentMethod: 'split',
        splitDetails: splits.map(s => ({ method: s.method, amount: Number(s.amount) })),
        amountReceived: totalAmount,
        changeGiven: 0
      });
    }
  };

  const handleAddSplitLine = () => {
    const remaining = Math.max(0, splitRemaining);
    setSplits([...splits, { method: 'card', amount: remaining }]);
  };

  const handleRemoveSplitLine = (idx: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== idx));
  };

  const handleUpdateSplit = (idx: number, field: 'method' | 'amount', val: any) => {
    const updated = [...splits];
    if (field === 'amount') {
      updated[idx].amount = Math.max(0, parseFloat(val) || 0);
    } else {
      updated[idx].method = val;
    }
    setSplits(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
          <div>
            <h3 className="font-bold text-sm text-[#252A27]">Règlement & Encaissement</h3>
            <p className="text-[11px] text-[#555D58]">
              {orderType === 'dine_in' ? `Table ${tableNumber || 'Salle'}` : 'Vente à emporter'} &bull; Caissier: {currentUser?.name || 'Caissier'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
          {/* Total Display */}
          <div className="bg-[#F7F7F5] p-3.5 rounded-xl border border-[#D9DDD8] text-center">
            <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider">
              Montant Net TTC à Régler
            </span>
            <div className="text-3xl font-serif font-black text-[#252A27] mt-0.5">
              {totalAmount.toFixed(3)} DT
            </div>
            <div className="flex justify-center items-center space-x-3 text-[11px] text-[#555D58] mt-1">
              <span>HT: {subtotal.toFixed(3)} DT</span>
              <span>&bull;</span>
              <span>TVA (7%): {tvaAmount.toFixed(3)} DT</span>
              {discountAmount > 0 && (
                <>
                  <span>&bull;</span>
                  <span className="text-rose-700 font-semibold">Remise: -{discountAmount.toFixed(3)} DT</span>
                </>
              )}
            </div>
          </div>

          {/* Mode Switcher: Règlement Simple vs Multi-Paiement (Split) */}
          <div className="flex bg-[#ECEEEA] p-0.5 rounded-lg border border-[#D9DDD8]">
            <button
              type="button"
              onClick={() => setPaymentMode('single')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                paymentMode === 'single'
                  ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                  : 'text-[#555D58] hover:text-[#252A27]'
              }`}
            >
              Paiement Unique
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('split')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                paymentMode === 'split'
                  ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                  : 'text-[#555D58] hover:text-[#252A27]'
              }`}
            >
              Paiement Multiple / Partagé
            </button>
          </div>

          {/* Single Payment Method Options */}
          {paymentMode === 'single' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'card', label: 'Carte Bancaire', icon: CreditCard },
                  { id: 'contactless', label: 'Sans Contact', icon: Smartphone },
                  { id: 'cash', label: 'Espèces', icon: Banknote },
                  { id: 'qr_pay', label: 'QR Pay Table', icon: Tag },
                  { id: 'voucher', label: 'Ticket Restaurant', icon: Percent }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition-all ${
                        isSelected
                          ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] shadow-2xs'
                          : 'bg-white text-[#252A27] border-[#D9DDD8] hover:bg-[#ECEEEA]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Keypad & Bills */}
              {selectedMethod === 'cash' && (
                <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#252A27]">Montant Reçu (DT) :</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      placeholder={totalAmount.toFixed(2)}
                      className="w-32 p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-right font-bold text-sm text-[#252A27] focus:outline-none focus:border-[#252A27]"
                    />
                  </div>

                  {/* Quick Bills and Exact Amount */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={handleExactCash}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-colors"
                    >
                      Montant Exact ({totalAmount.toFixed(3)} DT)
                    </button>
                    {[5, 10, 20, 50, 100].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickCash(amt)}
                        className="py-1.5 px-3 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#252A27] hover:bg-[#ECEEEA] transition-colors"
                      >
                        {amt} DT
                      </button>
                    ))}
                  </div>

                  {/* Change display */}
                  <div className="pt-2 border-t border-[#D9DDD8] flex items-center justify-between text-xs font-bold">
                    <span className="text-[#555D58]">Rendu Monnaie :</span>
                    <span className={`text-base font-mono font-black ${cashReceived > 0 && cashReceived < totalAmount ? 'text-rose-700' : 'text-[#252A27]'}`}>
                      {cashReceived > 0 && cashReceived < totalAmount
                        ? `Manque ${(totalAmount - cashReceived).toFixed(3)} DT`
                        : `${changeDue.toFixed(3)} DT`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Split Payment Builder */
            <div className="space-y-3">
              <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8] space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#252A27] pb-1 border-b border-[#D9DDD8]">
                  <span>Lignes de paiement</span>
                  <span className={isSplitValid ? 'text-emerald-700' : 'text-rose-700'}>
                    {isSplitValid ? 'Total équilibré' : `Reste à répartir: ${splitRemaining.toFixed(3)} DT`}
                  </span>
                </div>

                {splits.map((split, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <select
                      value={split.method}
                      onChange={e => handleUpdateSplit(idx, 'method', e.target.value)}
                      className="px-2 py-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                    >
                      <option value="card">Carte Bancaire</option>
                      <option value="cash">Espèces</option>
                      <option value="contactless">Sans Contact</option>
                      <option value="voucher">Ticket Restaurant</option>
                      <option value="qr_pay">QR Pay</option>
                    </select>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.5"
                        value={split.amount}
                        onChange={e => handleUpdateSplit(idx, 'amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-right text-[#252A27]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#555D58] pointer-events-none">
                        DT
                      </span>
                    </div>

                    {splits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitLine(idx)}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSplitLine}
                  className="w-full py-1.5 border border-dashed border-[#C7CDC8] rounded-lg text-xs font-bold text-[#252A27] hover:bg-white transition-colors"
                >
                  + Ajouter un mode de règlement
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#D9DDD8] flex space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-[#D9DDD8] transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (paymentMode === 'single' && isCashInsufficient) || (paymentMode === 'split' && !isSplitValid)}
            className="flex-1 py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-all shadow-xs border border-[#8BCFAE] disabled:opacity-40 flex items-center justify-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Validation...' : 'Valider le Règlement & Ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
