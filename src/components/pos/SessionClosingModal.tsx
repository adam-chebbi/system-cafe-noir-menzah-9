import React, { useState, useEffect } from 'react';
import {
  CashRegisterSession,
  CashMovement,
  Ingredient,
  CashDenominationCount,
  MealVoucherCount,
  CheckedStockItem,
  ClosingRegisterPayload
} from '../../types';
import { api } from '../../services/api';
import { formatDT } from '../../utils/currency';
import {
  X, Check, AlertTriangle, ArrowRight, ArrowLeft,
  Banknote, Coins, Receipt, Package, DollarSign,
  Plus, Trash2, ShieldAlert, Sparkles, FileText,
  HelpCircle, Info, Lock
} from 'lucide-react';

interface SessionClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashRegisterSession;
  performedBy: string;
  onClosed: (closedSession: CashRegisterSession) => void;
}

// Coupures tunisiennes standard (excluant 5m, 10m, 20m conformément aux consignes)
const DEFAULT_TUNISIAN_DENOMINATIONS: Omit<CashDenominationCount, 'count' | 'subtotal'>[] = [
  // Pièces (Coins)
  { denomination: 0.050, label: '50 millimes', type: 'coin' },
  { denomination: 0.100, label: '100 millimes', type: 'coin' },
  { denomination: 0.200, label: '200 millimes', type: 'coin' },
  { denomination: 0.500, label: '½ Dinar (500m)', type: 'coin' },
  { denomination: 1.000, label: '1 Dinar', type: 'coin' },
  { denomination: 2.000, label: '2 Dinars', type: 'coin' },
  { denomination: 5.000, label: '5 Dinars (pièce)', type: 'coin' },
  // Billets (Banknotes)
  { denomination: 5.000,  label: 'Billet 5 DT', type: 'bill' },
  { denomination: 10.000, label: 'Billet 10 DT', type: 'bill' },
  { denomination: 20.000, label: 'Billet 20 DT', type: 'bill' },
  { denomination: 50.000, label: 'Billet 50 DT', type: 'bill' }
];

const MEAL_VOUCHER_ISSUERS = ['Sodexo', 'Edenred', 'Cadhoc', 'Proresto', 'Autre'];
const COMMON_VOUCHER_VALUES = [5.000, 7.000, 8.000, 10.000, 12.000, 15.000];
const DISCREPANCY_JUSTIFICATION_THRESHOLD = 5.000; // DT

export const SessionClosingModal: React.FC<SessionClosingModalProps> = ({
  isOpen,
  onClose,
  session,
  performedBy,
  onClosed
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Step 1 : Comptage des espèces ──────────────────────────────────
  const [denominations, setDenominations] = useState<CashDenominationCount[]>(
    DEFAULT_TUNISIAN_DENOMINATIONS.map(d => ({
      ...d,
      count: 0,
      subtotal: 0
    }))
  );

  // ── Step 2 : Tickets Restaurant ────────────────────────────────────
  const [mealVouchers, setMealVouchers] = useState<MealVoucherCount[]>([
    { issuer: 'Sodexo', faceValue: 8.000, count: 0, subtotal: 0 },
    { issuer: 'Edenred', faceValue: 8.000, count: 0, subtotal: 0 }
  ]);

  // ── Step 3 : Dépenses directes ajoutées ─────────────────────────────
  const [newExpenses, setNewExpenses] = useState<{ category: string; title: string; amount: number }[]>([]);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('supplies');

  // ── Step 4 : Contrôle Stocks sensibles ─────────────────────────────
  const [catalogIngredients, setCatalogIngredients] = useState<Ingredient[]>([]);
  const [checkedStocks, setCheckedStocks] = useState<CheckedStockItem[]>([]);
  const [selectedIngIdToAdd, setSelectedIngIdToAdd] = useState<string>('');

  // ── Step 5 / Remarques ─────────────────────────────────────────────
  const [closingNotes, setClosingNotes] = useState('');
  const [justificationNotes, setJustificationNotes] = useState('');

  // Charger le catalogue des ingrédients
  useEffect(() => {
    if (!isOpen) return;
    const loadIngredients = async () => {
      try {
        const ings = await api.getIngredients();
        setCatalogIngredients(ings);

        // Présélectionner les ingrédients sensibles courants (café, laits, sirops)
        const sensitive = ings.filter(i =>
          i.category === 'coffee' || i.category === 'milk_dairy' || i.category === 'syrup'
        );
        setCheckedStocks(
          sensitive.map(ing => ({
            ingredientId: ing.id,
            ingredientName: ing.name,
            unit: ing.unit,
            expectedStock: ing.currentStock,
            countedStock: ing.currentStock, // pré-rempli avec stock attendu pour faciliter
            difference: 0,
            differenceValue: 0,
            isApproximate: ing.category === 'coffee' || ing.category === 'milk_dairy',
            notes: ''
          }))
        );
      } catch (err) {
        console.error('Failed to load ingredients for session closing:', err);
      }
    };
    loadIngredients();
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Calculs dynamiques ─────────────────────────────────────────────

  // Total espèces comptées
  const totalCashCounted = denominations.reduce((sum, d) => sum + d.subtotal, 0);

  // Total tickets restaurant comptés
  const totalVouchersCount = mealVouchers.reduce((sum, v) => sum + v.count, 0);
  const totalVouchersAmount = mealVouchers.reduce((sum, v) => sum + v.subtotal, 0);

  // Dépenses ajoutées à la volée pendant la clôture
  const totalNewExpenses = newExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Espèces théoriques attendues (ajustées des nouvelles dépenses saisies)
  const adjustedExpectedCash = Math.max(0, session.expectedClosingCash - totalNewExpenses);

  // Écart de caisse sur les espèces
  const cashDiscrepancy = Number((totalCashCounted - adjustedExpectedCash).toFixed(3));
  const requiresJustification = Math.abs(cashDiscrepancy) >= DISCREPANCY_JUSTIFICATION_THRESHOLD;

  // ── Handlers Coupures ──────────────────────────────────────────────
  const handleCountChange = (index: number, valStr: string) => {
    const count = Math.max(0, parseInt(valStr, 10) || 0);
    setDenominations(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        count,
        subtotal: Number((count * copy[index].denomination).toFixed(3))
      };
      return copy;
    });
  };

  // ── Handlers Tickets Restaurant ────────────────────────────────────
  const handleVoucherChange = (index: number, field: 'issuer' | 'faceValue' | 'count', val: any) => {
    setMealVouchers(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      if (field === 'issuer') item.issuer = val;
      if (field === 'faceValue') item.faceValue = Math.max(0, parseFloat(val) || 0);
      if (field === 'count') item.count = Math.max(0, parseInt(val, 10) || 0);
      item.subtotal = Number((item.count * item.faceValue).toFixed(3));
      copy[index] = item;
      return copy;
    });
  };

  const handleAddVoucherRow = () => {
    setMealVouchers(prev => [
      ...prev,
      { issuer: 'Sodexo', faceValue: 8.000, count: 0, subtotal: 0 }
    ]);
  };

  const handleRemoveVoucherRow = (index: number) => {
    setMealVouchers(prev => prev.filter((_, i) => i !== index));
  };

  // ── Handlers Dépenses ──────────────────────────────────────────────
  const handleAddNewExpense = () => {
    const amount = parseFloat(expAmount);
    if (!expTitle || isNaN(amount) || amount <= 0) return;
    setNewExpenses(prev => [...prev, { category: expCategory, title: expTitle, amount }]);
    setExpTitle('');
    setExpAmount('');
  };

  const handleRemoveExpense = (index: number) => {
    setNewExpenses(prev => prev.filter((_, i) => i !== index));
  };

  // ── Handlers Stocks ────────────────────────────────────────────────
  const handleCountedStockChange = (index: number, valStr: string) => {
    const countedStock = parseFloat(valStr) || 0;
    setCheckedStocks(prev => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const ing = catalogIngredients.find(i => i.id === item.ingredientId);
      const unitCost = ing?.costPerUnit || 0;
      const difference = Number((countedStock - item.expectedStock).toFixed(3));
      item.countedStock = countedStock;
      item.difference = difference;
      item.differenceValue = Number((difference * unitCost).toFixed(3));
      copy[index] = item;
      return copy;
    });
  };

  const handleStockNoteChange = (index: number, notes: string) => {
    setCheckedStocks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes };
      return copy;
    });
  };

  const handleAddStockToCheck = (ingId: string) => {
    const ing = catalogIngredients.find(i => i.id === ingId);
    if (!ing || checkedStocks.some(s => s.ingredientId === ingId)) return;
    setCheckedStocks(prev => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        unit: ing.unit,
        expectedStock: ing.currentStock,
        countedStock: ing.currentStock,
        difference: 0,
        differenceValue: 0,
        isApproximate: ing.category === 'coffee' || ing.category === 'milk_dairy',
        notes: ''
      }
    ]);
    setSelectedIngIdToAdd('');
  };

  const handleRemoveStockRow = (index: number) => {
    setCheckedStocks(prev => prev.filter((_, i) => i !== index));
  };

  // ── Soumission définitive ──────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (requiresJustification && !justificationNotes.trim()) {
      setErrorMsg(`Un écart de ${formatDT(cashDiscrepancy)} nécessite obligatoirement une justification.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: Partial<ClosingRegisterPayload> = {
        actualClosingCash: totalCashCounted,
        cashDenominations: denominations.filter(d => d.count > 0),
        mealVouchers: mealVouchers.filter(v => v.count > 0),
        totalVouchersCount,
        totalVouchersAmount,
        checkedStocks: checkedStocks,
        newExpenses,
        closingNotes,
        justificationNotes: requiresJustification ? justificationNotes : undefined,
        performedBy
      };

      const closed = await api.closeRegister(
        session.id,
        totalCashCounted,
        closingNotes,
        performedBy,
        payload
      );

      onClosed(closed);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Erreur lors de l'enregistrement de la clôture: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#F2F3F0] rounded-2xl max-w-3xl w-full shadow-2xl border border-[#C7CDC8] max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">

        {/* ── HEADER ── */}
        <div className="p-4 bg-white border-b border-[#D9DDD8] rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base text-[#252A27]">
                Clôture de Caisse &amp; Fin de Service (Ticket Z)
              </h3>
              <p className="text-[11px] text-[#555D58]">
                Caissier : <strong>{session.cashierName}</strong> &bull; Ouverte à {new Date(session.openedAt).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border border-[#D9DDD8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEPPER NAVIGATION ── */}
        <div className="bg-[#ECEEEA] px-4 py-2 border-b border-[#D9DDD8] flex items-center justify-between text-xs overflow-x-auto gap-2">
          {[
            { id: 1, label: '1. Espèces (Coupures)', icon: Coins },
            { id: 2, label: '2. Tickets Resto', icon: Receipt },
            { id: 3, label: '3. Dépenses Flux', icon: DollarSign },
            { id: 4, label: '4. Contrôle Stocks', icon: Package },
            { id: 5, label: '5. Récapitulatif Z', icon: FileText }
          ].map(s => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                    : isDone
                    ? 'bg-white text-[#252A27] border border-[#D9DDD8]'
                    : 'text-[#555D58] hover:bg-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── ERROR BANNER ── */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── BODY (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ============================================================
              ÉTAPE 1 : COMPTAGE DES ESPÈCES PAR COUPURE TUNISIENNE
             ============================================================ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#252A27] uppercase tracking-wide">
                    Comptage Physique des Espèces
                  </h4>
                  <p className="text-[11px] text-[#555D58]">
                    Saisissez la quantité de chaque coupure présente dans le tiroir-caisse.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#555D58] block font-bold uppercase">Total Espèces Compté</span>
                  <span className="font-mono font-black text-lg text-emerald-800">
                    {formatDT(totalCashCounted)}
                  </span>
                </div>
              </div>

              {/* Billets */}
              <div className="bg-white p-3 rounded-xl border border-[#D9DDD8] space-y-2.5">
                <div className="flex items-center space-x-1.5 pb-2 border-b border-[#ECEEEA] text-xs font-bold text-[#252A27]">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>Billets de Banque</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {denominations.filter(d => d.type === 'bill').map((d) => {
                    const realIdx = denominations.findIndex(item => item === d);
                    return (
                      <div key={d.label} className="flex items-center justify-between p-2 bg-[#F7F7F5] rounded-lg border border-[#D9DDD8]">
                        <div>
                          <span className="font-bold text-xs text-[#252A27]">{d.label}</span>
                          <span className="text-[10px] text-[#555D58] block">({formatDT(d.denomination)})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={d.count || ''}
                            placeholder="0"
                            onChange={e => handleCountChange(realIdx, e.target.value)}
                            className="w-16 p-1.5 bg-white border border-[#D9DDD8] rounded-md text-center font-mono font-bold text-xs text-[#252A27]"
                          />
                          <span className="font-mono font-bold text-xs text-[#252A27] w-20 text-right">
                            {formatDT(d.subtotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pièces */}
              <div className="bg-white p-3 rounded-xl border border-[#D9DDD8] space-y-2.5">
                <div className="flex items-center space-x-1.5 pb-2 border-b border-[#ECEEEA] text-xs font-bold text-[#252A27]">
                  <Coins className="w-4 h-4 text-amber-700" />
                  <span>Pièces de Monnaie (50 millimes à 5 Dinars)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {denominations.filter(d => d.type === 'coin').map((d) => {
                    const realIdx = denominations.findIndex(item => item === d);
                    return (
                      <div key={d.label} className="flex items-center justify-between p-2 bg-[#F7F7F5] rounded-lg border border-[#D9DDD8]">
                        <div>
                          <span className="font-bold text-xs text-[#252A27]">{d.label}</span>
                          <span className="text-[10px] text-[#555D58] block">({formatDT(d.denomination)})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={d.count || ''}
                            placeholder="0"
                            onChange={e => handleCountChange(realIdx, e.target.value)}
                            className="w-16 p-1.5 bg-white border border-[#D9DDD8] rounded-md text-center font-mono font-bold text-xs text-[#252A27]"
                          />
                          <span className="font-mono font-bold text-xs text-[#252A27] w-20 text-right">
                            {formatDT(d.subtotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              ÉTAPE 2 : COMPTAGE DES TICKETS RESTAURANT
             ============================================================ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#252A27] uppercase tracking-wide">
                    Tickets Restaurant &amp; Chèques Déjeuner
                  </h4>
                  <p className="text-[11px] text-[#555D58]">
                    Ventilez les tickets par émetteur (Sodexo, Edenred, Cadhoc) et valeur faciale.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#555D58] block font-bold uppercase">
                    Total Tickets ({totalVouchersCount})
                  </span>
                  <span className="font-mono font-black text-lg text-emerald-800">
                    {formatDT(totalVouchersAmount)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#252A27]">Lignes de comptage</span>
                  <button
                    type="button"
                    onClick={handleAddVoucherRow}
                    className="flex items-center space-x-1 text-xs font-bold text-[#252A27] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une coupure ticket</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {mealVouchers.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 bg-[#F7F7F5] rounded-lg border border-[#D9DDD8]">
                      {/* Émetteur */}
                      <select
                        value={row.issuer}
                        onChange={e => handleVoucherChange(idx, 'issuer', e.target.value)}
                        className="p-1.5 bg-white border border-[#D9DDD8] rounded-md text-xs font-bold text-[#252A27]"
                      >
                        {MEAL_VOUCHER_ISSUERS.map(iss => (
                          <option key={iss} value={iss}>{iss}</option>
                        ))}
                      </select>

                      {/* Valeur faciale */}
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-[#555D58]">Valeur :</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={row.faceValue || ''}
                          onChange={e => handleVoucherChange(idx, 'faceValue', e.target.value)}
                          className="w-20 p-1.5 bg-white border border-[#D9DDD8] rounded-md text-xs font-bold text-center text-[#252A27]"
                        />
                        <span className="text-xs text-[#555D58]">DT</span>
                      </div>

                      {/* Quantité de tickets */}
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-[#555D58]">Nb :</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={row.count || ''}
                          onChange={e => handleVoucherChange(idx, 'count', e.target.value)}
                          className="w-16 p-1.5 bg-white border border-[#D9DDD8] rounded-md text-xs font-bold text-center text-[#252A27]"
                        />
                      </div>

                      {/* Sous-total */}
                      <div className="flex-1 text-right font-mono font-bold text-xs text-[#252A27]">
                        {formatDT(row.subtotal)}
                      </div>

                      {/* Supprimer */}
                      {mealVouchers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVoucherRow(idx)}
                          className="p-1 text-[#555D58] hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              ÉTAPE 3 : DÉPENSES DIRECTES & FLUX DE SERVICE
             ============================================================ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8]">
                <h4 className="font-bold text-xs text-[#252A27] uppercase tracking-wide">
                  Récapitulatif des Mouvements &amp; Dépenses Caisse
                </h4>
                <p className="text-[11px] text-[#555D58]">
                  Vérifiez les dépenses réglées en espèces pendant le service ou ajoutez une dépense non enregistrée.
                </p>
              </div>

              {/* Formulaire d'ajout rapide de dépense */}
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] space-y-2.5">
                <span className="text-xs font-bold text-[#252A27] flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer une dépense directe de caisse avant clôture</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27] font-semibold"
                  >
                    <option value="supplies">Fournitures d'urgence</option>
                    <option value="cleaning">Entretien &amp; Nettoyage</option>
                    <option value="delivery">Livraison / Transport</option>
                    <option value="other">Autre dépense diverse</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Motif (ex: Achat lait de dépannage)"
                    value={expTitle}
                    onChange={e => setExpTitle(e.target.value)}
                    className="sm:col-span-2 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      step="0.100"
                      min="0.100"
                      placeholder="Montant DT"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      className="w-full p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-right text-[#252A27]"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewExpense}
                      className="px-3 py-1.5 bg-[#252A27] text-[#A4DEC2] text-xs font-bold rounded-lg hover:bg-[#343B37] shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste des dépenses ajoutées */}
              {newExpenses.length > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] space-y-2">
                  <span className="text-xs font-bold text-emerald-800">Dépenses ajoutées à cette clôture</span>
                  <div className="divide-y divide-[#ECEEEA]">
                    {newExpenses.map((exp, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#252A27]">{exp.title}</span>
                          <span className="text-[10px] text-[#555D58] block">({exp.category})</span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono font-bold text-rose-700">
                          <span>-{formatDT(exp.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(idx)}
                            className="text-[#555D58] hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mouvements existants du shift */}
              {session.movements && session.movements.length > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] space-y-2">
                  <span className="text-xs font-bold text-[#252A27]">Mouvements déjà enregistrés pendant le service</span>
                  <div className="divide-y divide-[#ECEEEA]">
                    {session.movements.map((m, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-[#252A27]">{m.reason}</span>
                          <span className="text-[10px] text-[#555D58] block">{m.type} par {m.performedBy}</span>
                        </div>
                        <span className={`font-mono font-bold ${m.type === 'deposit' ? 'text-emerald-800' : 'text-rose-700'}`}>
                          {m.type === 'deposit' ? `+${formatDT(m.amount)}` : `-${formatDT(m.amount)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              ÉTAPE 4 : CONTRÔLE DES STOCKS SENSIBLES
             ============================================================ */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#252A27] uppercase tracking-wide">
                    Contrôle des Stocks Sensibles (Fin de Service)
                  </h4>
                  <p className="text-[11px] text-[#555D58]">
                    Vérifiez les matières premières clés (café, laits, sirops) dans leur unité d'origine. Les consommations de recettes comportant des plages sont indiquées avec <strong className="text-emerald-700">≈</strong>.
                  </p>
                </div>
              </div>

              {/* Sélecteur d'ingrédient supplémentaire */}
              <div className="bg-white p-3 rounded-xl border border-[#D9DDD8] flex items-center space-x-2">
                <select
                  value={selectedIngIdToAdd}
                  onChange={e => setSelectedIngIdToAdd(e.target.value)}
                  className="flex-1 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="">-- Ajouter un ingrédient à contrôler --</option>
                  {catalogIngredients
                    .filter(i => !checkedStocks.some(s => s.ingredientId === i.id))
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Stock actuel: {i.currentStock} {i.unit})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedIngIdToAdd}
                  onClick={() => handleAddStockToCheck(selectedIngIdToAdd)}
                  className="px-3 py-1.5 bg-[#252A27] disabled:opacity-50 text-[#A4DEC2] text-xs font-bold rounded-lg"
                >
                  Ajouter au contrôle
                </button>
              </div>

              {/* Liste des stocks contrôlés */}
              <div className="border border-[#D9DDD8] rounded-xl overflow-hidden divide-y divide-[#ECEEEA] bg-white">
                {checkedStocks.length === 0 ? (
                  <div className="p-5 text-center text-xs text-[#555D58]">
                    Aucun ingrédient en contrôle. Vous pouvez clôturer sans inventaire partiel ou ajouter des ingrédients ci-dessus.
                  </div>
                ) : (
                  checkedStocks.map((item, idx) => {
                    const hasDiff = item.difference !== 0;
                    return (
                      <div key={idx} className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-[#252A27]">{item.ingredientName}</span>
                            {item.isApproximate && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[#E8F5EE] text-[#2B6245] text-[9px] font-bold border border-[#C5E8D5]" title="Consommation théorique basée sur des recettes approximatives">
                                ≈ Recette
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStockRow(idx)}
                            className="text-[#555D58] hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center text-xs">
                          <div className="p-2 bg-[#F7F7F5] rounded-lg border border-[#D9DDD8]">
                            <span className="text-[10px] text-[#555D58] block">Stock Théorique</span>
                            <span className="font-mono font-bold text-[#252A27]">
                              {item.isApproximate ? '≈' : ''}{item.expectedStock} {item.unit}
                            </span>
                          </div>

                          <div className="p-2 bg-[#F7F7F5] rounded-lg border border-[#D9DDD8]">
                            <span className="text-[10px] text-[#555D58] block">Stock Physique Compté</span>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.countedStock}
                                onChange={e => handleCountedStockChange(idx, e.target.value)}
                                className="w-full p-1 bg-white border border-[#D9DDD8] rounded font-mono font-bold text-center text-xs text-[#252A27]"
                              />
                              <span className="text-[11px] font-bold text-[#555D58]">{item.unit}</span>
                            </div>
                          </div>

                          <div className={`p-2 rounded-lg border ${
                            item.difference === 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : item.difference < 0
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}>
                            <span className="text-[10px] block">Écart ({item.unit})</span>
                            <span className="font-mono font-bold">
                              {item.difference > 0 ? `+${item.difference}` : item.difference} {item.unit}
                              {hasDiff && ` (${item.differenceValue > 0 ? '+' : ''}${formatDT(item.differenceValue)})`}
                            </span>
                          </div>
                        </div>

                        {/* Motif d'écart si différent de 0 */}
                        {hasDiff && (
                          <input
                            type="text"
                            placeholder="Motif de l'écart (ex: casse, calibration barista, offert client...)"
                            value={item.notes || ''}
                            onChange={e => handleStockNoteChange(idx, e.target.value)}
                            className="w-full p-1.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] placeholder:text-[#D97706]/60"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              ÉTAPE 5 : RÉCAPITULATIF FINAL & PRÉVISUALISATION Z
             ============================================================ */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8]">
                <h4 className="font-bold text-xs text-[#252A27] uppercase tracking-wide">
                  Prévisualisation du Rapport Z de Clôture
                </h4>
                <p className="text-[11px] text-[#555D58]">
                  Vérifiez tous les éléments avant validation irréversible. Vous pouvez revenir modifier à tout moment.
                </p>
              </div>

              {/* Ticket Z Synthétique */}
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] font-mono text-xs text-[#252A27] space-y-3 shadow-2xs">
                <div className="text-center pb-2 border-b border-dashed border-[#C7CDC8]">
                  <h4 className="font-bold text-sm font-serif">CAFÉ NOIR — MENZAH 9</h4>
                  <p className="text-[10px] text-[#555D58]">RÉCAPITULATIF OFFICIEL DE CLÔTURE DE SERVICE</p>
                  <p className="text-[10px] text-[#555D58]">
                    Service du {new Date(session.openedAt).toLocaleDateString('fr-FR')} &bull; Caissier: {session.cashierName}
                  </p>
                </div>

                {/* Flux financiers */}
                <div className="space-y-1.5 pb-2 border-b border-dashed border-[#C7CDC8]">
                  <div className="flex justify-between">
                    <span className="text-[#555D58]">Fond de caisse initial :</span>
                    <span className="font-bold">{formatDT(session.openingCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#555D58]">Ventes Espèces encaissées :</span>
                    <span className="font-bold">{formatDT(session.totalSalesCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#555D58]">Ventes Cartes Bancaires :</span>
                    <span className="font-bold">{formatDT(session.totalSalesCard)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#555D58]">Ventes Tickets Restaurant ({totalVouchersCount} tkts) :</span>
                    <span className="font-bold">{formatDT(totalVouchersAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#555D58]">Ventes Autres / QR :</span>
                    <span className="font-bold">{formatDT(session.totalSalesOther)}</span>
                  </div>
                  {totalNewExpenses > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Dépenses directes saisies :</span>
                      <span className="font-bold">-{formatDT(totalNewExpenses)}</span>
                    </div>
                  )}
                </div>

                {/* Comparatif Espèces Attendues vs Comptées */}
                <div className="space-y-1.5 pb-2 border-b border-dashed border-[#C7CDC8] bg-[#F7F7F5] p-2.5 rounded-lg">
                  <div className="flex justify-between">
                    <span>Espèces théoriques attendues :</span>
                    <span className="font-bold">{formatDT(adjustedExpectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Espèces physiques comptées :</span>
                    <span className="font-black text-emerald-800">{formatDT(totalCashCounted)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-[#D9DDD8]">
                    <span>Écart de caisse :</span>
                    <span className={cashDiscrepancy === 0 ? 'text-emerald-800' : cashDiscrepancy > 0 ? 'text-blue-800' : 'text-rose-800'}>
                      {cashDiscrepancy === 0
                        ? '0.000 DT (Parfait)'
                        : `${cashDiscrepancy > 0 ? '+' : ''}${formatDT(cashDiscrepancy)}`}
                    </span>
                  </div>
                </div>

                {/* Alerte justification obligatoire */}
                {requiresJustification && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-1 font-sans">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Justification d'écart obligatoire (&gt; 5.000 DT)</span>
                    </div>
                    <textarea
                      rows={2}
                      value={justificationNotes}
                      onChange={e => setJustificationNotes(e.target.value)}
                      placeholder="Expliquez la cause de cet écart (ex: erreur de rendu monnaie, billet abîmé...)"
                      className="w-full p-2 bg-white border border-amber-300 rounded text-xs text-[#252A27]"
                    />
                  </div>
                )}

                {/* Synthèse stocks vérifiés */}
                {checkedStocks.length > 0 && (
                  <div className="space-y-1 font-sans text-xs">
                    <span className="font-bold text-[#555D58] uppercase text-[10px] block">
                      Stocks sensibles contrôlés ({checkedStocks.length})
                    </span>
                    <div className="divide-y divide-[#ECEEEA] bg-[#F7F7F5] p-2 rounded-lg">
                      {checkedStocks.map((s, idx) => (
                        <div key={idx} className="py-1 flex justify-between">
                          <span>{s.ingredientName} : {s.countedStock} {s.unit}</span>
                          <span className={s.difference === 0 ? 'text-emerald-700' : 'text-rose-700 font-bold'}>
                            {s.difference === 0 ? 'Conforme' : `${s.difference > 0 ? '+' : ''}${s.difference} ${s.unit}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarques générales */}
                <div className="font-sans space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Remarques de clôture (optionnel) :</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    placeholder="Remarques sur le déroulement du service..."
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 bg-white border-t border-[#D9DDD8] rounded-b-2xl flex items-center justify-between space-x-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] flex items-center space-x-1.5 hover:bg-[#D9DDD8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Annuler
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as any)}
              className="px-5 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold flex items-center space-x-1.5 hover:bg-[#343B37] transition-colors"
            >
              <span>Étape suivante</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="px-6 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-black flex items-center space-x-2 transition-all shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{submitting ? 'Clôture en cours...' : 'Confirmer & Clôturer Définitivement (Z)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
