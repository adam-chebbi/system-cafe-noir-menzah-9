import React, { useState, useRef } from 'react';
import { Product, User, Sale, PaymentMethod, ConsumptionType, SaleItem } from '../../types';
import { api } from '../../services/api';
import {
  Plus,
  Minus,
  Trash2,
  Check,
  Eye,
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Receipt,
  Utensils,
  AlertCircle,
  Sunrise,
  Sun,
  Moon,
  Info,
  Sparkles,
  ClipboardCheck,
  PenLine
} from 'lucide-react';

type Shift = 'matin' | 'apres_midi' | 'soir';

const SHIFT_OPTIONS: { value: Shift; label: string; icon: React.ElementType }[] = [
  { value: 'matin', label: 'Matin', icon: Sunrise },
  { value: 'apres_midi', label: 'Après-midi', icon: Sun },
  { value: 'soir', label: 'Soir', icon: Moon }
];

/** Suggère un service par défaut à partir de l'heure saisie, sans jamais forcer le choix de l'utilisateur. */
const suggestShift = (timeStr: string): Shift => {
  const hour = parseInt((timeStr || '').split(':')[0], 10);
  if (isNaN(hour) || hour < 12) return 'matin';
  if (hour < 18) return 'apres_midi';
  return 'soir';
};

interface ManualSaleEntryProps {
  products: Product[];
  currentUser: User | null;
  onSaleCreated: (sale: Sale) => void;
}

interface ManualSaleLine {
  productId?: string;
  productName: string;
  variant?: string;
  unitPrice: number;
  quantity: number;
  tvaRate: number;
  total: number;
}

const emptyLine = (): ManualSaleLine => ({ productName: '', variant: '', unitPrice: 0, quantity: 1, tvaRate: 7, total: 0 });
const isEmptyLine = (l: ManualSaleLine) => !l.productId && !l.productName.trim() && l.unitPrice === 0;

export const ManualSaleEntry: React.FC<ManualSaleEntryProps> = ({
  products,
  currentUser,
  onSaleCreated
}) => {
  // Form State
  const [saleDateOnly, setSaleDateOnly] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saleTimeOnly, setSaleTimeOnly] = useState<string>(new Date().toISOString().slice(11, 16));
  const [shift, setShift] = useState<Shift>(() => suggestShift(new Date().toISOString().slice(11, 16)));
  const [tableNumber, setTableNumber] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || 'Administrateur');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [consumptionType, setConsumptionType] = useState<ConsumptionType>('sur_place');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [lines, setLines] = useState<ManualSaleLine[]>([emptyLine()]);

  // Validation step: 'edit' -> 'preview'
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [validationAttempted, setValidationAttempted] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // Calculations
  const rawSubtotal = lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity) / (1 + l.tvaRate / 100), 0);
  const rawTotalTTC = lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);
  const finalTotalTTC = Math.max(0, Number((rawTotalTTC - discount).toFixed(3)));
  const totalTVA = Math.max(0, Number((finalTotalTTC - rawSubtotal).toFixed(3)));
  const itemCount = lines.filter(l => !isEmptyLine(l)).length;

  const isLineInvalid = (l: ManualSaleLine) => !l.productName.trim() || l.unitPrice <= 0;

  const handleAddLine = () => {
    setLines([...lines, emptyLine()]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const updated = [...lines];
    if (prod) {
      const defaultVariant = prod.options && prod.options.length > 0 && prod.options[0].choices.length > 0
        ? prod.options[0].choices[0].name
        : '';
      const priceModifier = prod.options && prod.options.length > 0 && prod.options[0].choices.length > 0
        ? prod.options[0].choices[0].priceModifier || 0
        : 0;

      const finalPrice = prod.price + priceModifier;

      updated[index] = {
        productId: prod.id,
        productName: prod.name,
        variant: defaultVariant,
        unitPrice: finalPrice,
        quantity: updated[index].quantity || 1,
        tvaRate: prod.tvaRate || 7,
        total: Number(((updated[index].quantity || 1) * finalPrice).toFixed(3))
      };
    }
    setLines(updated);
  };

  /** Ajout rapide en un geste depuis les chips catalogue : remplit la ligne vide en cours, ou incrémente si c'est déjà le dernier article ajouté. */
  const handleQuickAddProduct = (product: Product) => {
    const defaultVariant = product.options?.[0]?.choices?.[0]?.name || '';
    const priceModifier = product.options?.[0]?.choices?.[0]?.priceModifier || 0;
    const finalPrice = product.price + priceModifier;

    setLines(prev => {
      const lastIdx = prev.length - 1;
      const last = prev[lastIdx];

      if (last.productId === product.id && (last.variant || '') === defaultVariant) {
        const newQty = last.quantity + 1;
        const updated = [...prev];
        updated[lastIdx] = { ...last, quantity: newQty, total: Number((newQty * last.unitPrice).toFixed(3)) };
        return updated;
      }

      const newLine: ManualSaleLine = {
        productId: product.id,
        productName: product.name,
        variant: defaultVariant,
        unitPrice: finalPrice,
        quantity: 1,
        tvaRate: product.tvaRate || 7,
        total: Number(finalPrice.toFixed(3))
      };

      if (isEmptyLine(last)) {
        return [...prev.slice(0, -1), newLine];
      }
      return [...prev, newLine];
    });
  };

  const handleVariantSelect = (index: number, variantName: string) => {
    const updated = [...lines];
    const line = updated[index];
    line.variant = variantName;

    if (line.productId) {
      const prod = products.find(p => p.id === line.productId);
      if (prod && prod.options) {
        let modifier = 0;
        for (const opt of prod.options) {
          const choice = opt.choices.find(c => c.name === variantName);
          if (choice) {
            modifier = choice.priceModifier || 0;
            break;
          }
        }
        line.unitPrice = prod.price + modifier;
        line.total = Number((line.quantity * line.unitPrice).toFixed(3));
      }
    }
    setLines(updated);
  };

  const handleLineChange = (index: number, field: keyof ManualSaleLine, val: any) => {
    const updated = [...lines];
    if (field === 'quantity') {
      const q = Math.max(1, parseInt(val) || 1);
      updated[index].quantity = q;
      updated[index].total = Number((q * updated[index].unitPrice).toFixed(3));
    } else if (field === 'unitPrice') {
      const p = Math.max(0, parseFloat(val) || 0);
      updated[index].unitPrice = p;
      updated[index].total = Number((updated[index].quantity * p).toFixed(3));
    } else if (field === 'productName') {
      updated[index].productName = val;
    } else if (field === 'variant') {
      updated[index].variant = val;
    } else if (field === 'tvaRate') {
      updated[index].tvaRate = parseFloat(val) || 7;
    }
    setLines(updated);
  };

  const handleGoToPreview = () => {
    setErrorMsg('');
    setValidationAttempted(true);
    const invalidLine = lines.find(isLineInvalid);
    if (invalidLine) {
      setErrorMsg('Veuillez renseigner un article et un prix unitaire strictement positif pour toutes les lignes surlignées en rouge ci-dessous.');
      return;
    }
    if (finalTotalTTC <= 0) {
      setErrorMsg('Le montant total de la vente doit être strictement supérieur à 0 DT.');
      return;
    }
    setStep('preview');
    scrollToTop();
  };

  const handleConfirmAndSave = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        createdAt: new Date(`${saleDateOnly}T${saleTimeOnly}`).toISOString(),
        tableNumber: consumptionType === 'sur_place' ? tableNumber : 'À emporter',
        consumptionType,
        shift,
        paymentMethod,
        ticketCount: Math.max(1, ticketCount),
        items: lines.map(l => ({
          productId: l.productId,
          productName: l.productName,
          variant: l.variant || undefined,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          tvaRate: l.tvaRate
        })),
        discount,
        cashierId: currentUser?.id || 'usr_admin',
        cashierName: cashierName || currentUser?.name || 'Administrateur',
        notes: notes || 'Saisie manuelle enregistrée',
        source: 'manual' as const
      };

      const createdSale = await api.createManualSale(payload);
      onSaleCreated(createdSale);

      setSuccessMsg(`Vente #${createdSale.saleNumber} (${createdSale.totalAmount.toFixed(3)} DT) enregistrée avec succès !`);

      // Reset form
      setLines([emptyLine()]);
      setDiscount(0);
      setNotes('');
      setStep('edit');
      setValidationAttempted(false);
      scrollToTop();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(`Erreur d'enregistrement : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const availableProducts = products.filter(p => p.available);

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full space-y-4">
        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D9DDD8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif font-black text-lg text-[#252A27]">
              Saisie Manuelle d'une Vente
            </h2>
            <p className="text-xs text-[#555D58]">
              Enregistrement comptable avec traçabilité complète des articles, variantes, tickets et modes de règlement
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              step === 'edit' ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <PenLine className="w-3 h-3" />
              <span>1. Saisie</span>
            </div>
            <div className="w-4 h-px bg-[#D9DDD8]" />
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              step === 'preview' ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-[#ECEEEA] text-[#555D58] border-[#D9DDD8]'
            }`}>
              <ClipboardCheck className="w-3 h-3" />
              <span>2. Vérification</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'edit' ? (
          /* STEP 1: FORMULAIRE DE SAISIE */
          <div className="space-y-4 pb-24">
            {/* 1. Métadonnées de la vente */}
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 space-y-4 shadow-2xs">
              <h3 className="font-serif font-bold text-sm text-[#252A27] pb-2 border-b border-[#ECEEEA]">
                1. Paramètres & Contexte de la Vente
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date :</span>
                  </label>
                  <input
                    type="date"
                    value={saleDateOnly}
                    onChange={e => setSaleDateOnly(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  />
                </div>

                {/* Heure */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Heure :</span>
                  </label>
                  <input
                    type="time"
                    value={saleTimeOnly}
                    onChange={e => setSaleTimeOnly(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  />
                </div>

                {/* Mode de Paiement */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center space-x-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Mode de Paiement :</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  >
                    <option value="especes">Espèces (Cash)</option>
                    <option value="tpe">TPE (Carte Bancaire)</option>
                    <option value="ticket_restaurant">Ticket restaurant</option>
                  </select>
                </div>

                {/* Type de Consommation */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center space-x-1">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Consommation :</span>
                  </label>
                  <select
                    value={consumptionType}
                    onChange={e => setConsumptionType(e.target.value as ConsumptionType)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  >
                    <option value="sur_place">Sur place</option>
                    <option value="a_emporter">À emporter</option>
                  </select>
                </div>

                {/* Nombre de Tickets */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center space-x-1">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Nombre de Tickets :</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ticketCount}
                    onChange={e => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-center text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  />
                </div>
              </div>

              {/* Explication : à quoi sert le Nombre de Tickets */}
              <div className="flex items-start space-x-1.5 text-[10.5px] text-[#555D58] bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg px-2.5 py-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#555D58]" />
                <span>
                  <strong className="text-[#252A27]">Nombre de Tickets</strong> : le nombre de tickets de caisse (clients servis séparément) regroupés dans cette saisie. Il sert à calculer le panier moyen et le nombre de couverts dans les rapports — laissez <strong>1</strong> si cette saisie ne représente qu'un seul client/ticket.
                </span>
              </div>

              {/* Service (Shift) */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-[#555D58]">Service :</label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_OPTIONS.map(opt => {
                    const ShiftIcon = opt.icon;
                    const active = shift === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setShift(opt.value)}
                        className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          active
                            ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27] shadow-xs'
                            : 'bg-[#F7F7F5] text-[#555D58] border-[#D9DDD8] hover:bg-white hover:text-[#252A27]'
                        }`}
                      >
                        <ShiftIcon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Table / Emplacement <span className="font-medium text-[#929A95]">(optionnel)</span> :</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Ex: Table 4, Terrasse, Comptoir... (laisser vide si non applicable)"
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Opérateur / Caissier :</label>
                  <select
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:ring-2 focus:ring-[#A4DEC2] focus:outline-none"
                  >
                    <option value={currentUser?.name || 'Administrateur'}>{currentUser?.name || 'Administrateur'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Lignes d'articles et variantes */}
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECEEEA]">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#252A27]">
                    2. Articles, Variantes & Tarification ({itemCount})
                  </h3>
                  <p className="text-[11px] text-[#555D58]">
                    Touchez un article ci-dessous pour l'ajouter instantanément, ou saisissez une ligne libre
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 py-1.5 rounded-xl bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-all flex items-center space-x-1 shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ligne libre</span>
                </button>
              </div>

              {/* Quick-add chips */}
              {availableProducts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#555D58] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#8BCFAE]" />
                    <span>Ajout rapide depuis la carte :</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                    {availableProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleQuickAddProduct(p)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F7F5] border border-[#D9DDD8] hover:border-[#8BCFAE] hover:bg-white active:scale-95 transition-all text-xs font-bold text-[#252A27] whitespace-nowrap cursor-pointer touch-manipulation"
                      >
                        <Plus className="w-3 h-3 text-[#6DBE96]" />
                        <span>{p.name}</span>
                        <span className="text-[#929A95] font-normal">{p.price.toFixed(3)} DT</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {lines.map((line, idx) => {
                  const selectedProd = products.find(p => p.id === line.productId);
                  const availableOptions = selectedProd?.options || [];
                  const invalid = validationAttempted && isLineInvalid(line);
                  const isLast = idx === lines.length - 1;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border grid grid-cols-12 gap-2.5 items-center text-xs transition-colors animate-in fade-in duration-150 ${
                        invalid ? 'bg-rose-50 border-rose-300' : 'bg-[#F7F7F5] border-[#D9DDD8]'
                      }`}
                    >
                      {/* Catalog select */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-[#555D58] block mb-0.5">Produit Catalogue :</label>
                        <select
                          onChange={e => handleProductSelect(idx, e.target.value)}
                          value={line.productId || ''}
                          className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27]"
                        >
                          <option value="">-- Choisir du catalogue (ou libre) --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.price.toFixed(3)} DT)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Designation */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="text-[10px] font-bold text-[#555D58] block mb-0.5">Nom de l'article :</label>
                        <input
                          type="text"
                          placeholder="Ex: Café Espresso, Croissant..."
                          value={line.productName}
                          onChange={e => handleLineChange(idx, 'productName', e.target.value)}
                          className={`w-full p-2 bg-white border rounded-lg text-xs font-bold text-[#252A27] ${invalid && !line.productName.trim() ? 'border-rose-400' : 'border-[#D9DDD8]'}`}
                        />
                      </div>

                      {/* Variant / Option */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-[#555D58] block mb-0.5">Variante :</label>
                        {availableOptions.length > 0 ? (
                          <select
                            value={line.variant || ''}
                            onChange={e => handleVariantSelect(idx, e.target.value)}
                            className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                          >
                            <option value="">Standard</option>
                            {availableOptions.flatMap(opt =>
                              opt.choices.map(c => (
                                <option key={c.id} value={c.name}>
                                  {c.name} {c.priceModifier ? `(+${c.priceModifier.toFixed(3)})` : ''}
                                </option>
                              ))
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Simple, Grand..."
                            value={line.variant || ''}
                            onChange={e => handleLineChange(idx, 'variant', e.target.value)}
                            className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                          />
                        )}
                      </div>

                      {/* Quantité (stepper) */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-[#555D58] block mb-0.5 text-center">Qté :</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLineChange(idx, 'quantity', String(Math.max(1, line.quantity - 1)))}
                            className="w-7 h-7 shrink-0 rounded-lg bg-white border border-[#D9DDD8] flex items-center justify-center text-[#252A27] hover:bg-[#ECEEEA] active:scale-95 transition-all cursor-pointer"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                            className="w-full min-w-0 p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                          />
                          <button
                            type="button"
                            onClick={() => handleLineChange(idx, 'quantity', String(line.quantity + 1))}
                            className="w-7 h-7 shrink-0 rounded-lg bg-white border border-[#D9DDD8] flex items-center justify-center text-[#252A27] hover:bg-[#ECEEEA] active:scale-95 transition-all cursor-pointer"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Prix unitaire */}
                      <div className="col-span-6 sm:col-span-1">
                        <label className="text-[10px] font-bold text-[#555D58] block mb-0.5 text-right">Prix :</label>
                        <input
                          type="number"
                          step="0.1"
                          value={line.unitPrice || ''}
                          onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && isLast) {
                              e.preventDefault();
                              handleAddLine();
                            }
                          }}
                          placeholder="0.000"
                          className={`w-full p-2 bg-white border rounded-lg text-xs font-bold text-right text-[#252A27] ${invalid && line.unitPrice <= 0 ? 'border-rose-400' : 'border-[#D9DDD8]'}`}
                        />
                      </div>

                      {/* Total & Delete */}
                      <div className="col-span-6 sm:col-span-1 flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-1 pt-1 sm:pt-4">
                        <span className="font-serif font-black text-xs text-[#252A27] whitespace-nowrap">
                          {line.total.toFixed(3)} DT
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Remise & Notes */}
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xs">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#555D58]">Remise exceptionnelle (DT) <span className="font-medium text-[#929A95]">(optionnel)</span> :</label>
                <input
                  type="number"
                  step="0.5"
                  value={discount || ''}
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.000"
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27]"
                />

                <label className="text-[11px] font-bold text-[#555D58] pt-1 block">Notes & Justification <span className="font-medium text-[#929A95]">(optionnel)</span> :</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Facturation manuelle, événementiel, accord gérance..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs text-[#252A27]"
                />
              </div>

              {/* Detailed totals box (informational — action is in the sticky bar below) */}
              <div className="bg-[#F7F7F5] rounded-xl p-4 border border-[#D9DDD8] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#555D58]">
                  <span>Sous-total HT :</span>
                  <span>{rawSubtotal.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between text-[#555D58]">
                  <span>TVA (7%) :</span>
                  <span>{totalTVA.toFixed(3)} DT</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Remise déduite :</span>
                    <span>-{discount.toFixed(3)} DT</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-serif font-black text-[#252A27] pt-2 border-t border-[#D9DDD8]">
                  <span>TOTAL TTC :</span>
                  <span>{finalTotalTTC.toFixed(3)} DT</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: ÉCRAN DE DOUBLE VALIDATION & CONFIRMATION */
          <div className="max-w-xl mx-auto w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="bg-white rounded-2xl border-2 border-[#252A27] p-5 space-y-4 shadow-xl">
              <div className="flex items-center space-x-2 text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-300 text-xs">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-700" />
                <span>
                  <strong>Contrôle de validation obligatoire :</strong> Veuillez vérifier les détails du ticket avant enregistrement comptable dans le système Café Noir.
                </span>
              </div>

              {/* Ticket Preview Box */}
              <div className="bg-[#F7F7F5] rounded-xl p-4 border border-[#D9DDD8] font-mono text-xs text-[#252A27] space-y-3">
                <div className="text-center pb-2 border-b border-dashed border-[#C7CDC8]">
                  <h4 className="font-serif font-black text-sm text-[#252A27]">CAFÉ NOIR &bull; MENZAH 9</h4>
                  <p className="text-[10px] text-[#555D58]">
                    {new Date(`${saleDateOnly}T${saleTimeOnly}`).toLocaleString('fr-FR')} &bull; Service {SHIFT_OPTIONS.find(o => o.value === shift)?.label}
                  </p>
                  <p className="text-[10px] text-[#555D58]">
                    {consumptionType === 'sur_place' ? `Sur place${tableNumber ? ` (${tableNumber})` : ''}` : 'À emporter'} &bull; Caissier: {cashierName}
                  </p>
                  <p className="text-[10px] font-bold text-[#252A27] mt-0.5">
                    Nombre de ticket(s) : {ticketCount}
                  </p>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 py-1 border-b border-dashed border-[#C7CDC8]">
                  {lines.map((l, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <span>{l.quantity}x {l.productName}</span>
                        {l.variant && (
                          <span className="text-[10px] text-[#555D58] block ml-3">↳ Variante : {l.variant}</span>
                        )}
                      </div>
                      <span className="font-bold whitespace-nowrap">{l.total.toFixed(3)} DT</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-1 text-xs">
                  <div className="flex justify-between text-[#555D58]">
                    <span>Sous-total HT :</span>
                    <span>{rawSubtotal.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[#555D58]">
                    <span>TVA :</span>
                    <span>{totalTVA.toFixed(3)} DT</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Remise :</span>
                      <span>-{discount.toFixed(3)} DT</span>
                    </div>
                  )}
                  <div className="flex justify-between font-serif font-black text-base text-[#252A27] pt-2 border-t border-[#D9DDD8]">
                    <span>TOTAL TTC :</span>
                    <span>{finalTotalTTC.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#555D58] pt-1">
                    <span>Règlement :</span>
                    <span className="font-bold text-[#252A27] uppercase">
                      {paymentMethod === 'especes' ? 'Espèces' : paymentMethod === 'tpe' ? 'TPE (Carte)' : 'Ticket restaurant'}
                    </span>
                  </div>
                  {notes && (
                    <p className="text-[10px] text-[#555D58] italic pt-1 border-t border-[#ECEEEA]">Note : {notes}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setStep('edit'); scrollToTop(); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-[#D9DDD8] flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifier la saisie</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center justify-center space-x-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Enregistrement...' : 'Confirmer et Enregistrer'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky total & primary action bar — always reachable while scrolling a long ticket */}
      {step === 'edit' && (
        <div className="shrink-0 border-t border-[#D9DDD8] bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wide block">Total TTC ({itemCount} article{itemCount > 1 ? 's' : ''})</span>
              <span className="font-serif font-black text-xl text-[#252A27]">{finalTotalTTC.toFixed(3)} DT</span>
            </div>
            <button
              type="button"
              onClick={handleGoToPreview}
              className="py-2.5 px-5 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Prévisualiser & Vérifier</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
