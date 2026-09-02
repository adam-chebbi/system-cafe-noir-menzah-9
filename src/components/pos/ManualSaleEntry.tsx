import React, { useState } from 'react';
import { Product, Table, User, Sale } from '../../types';
import { api } from '../../services/api';
import {
  Plus,
  Trash2,
  Check,
  Eye,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  Percent,
  FileText
} from 'lucide-react';

interface ManualSaleEntryProps {
  products: Product[];
  tables: Table[];
  users: User[];
  currentUser: User | null;
  onSaleCreated: (sale: Sale) => void;
}

interface SaleLine {
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  tvaRate: number;
  total: number;
}

export const ManualSaleEntry: React.FC<ManualSaleEntryProps> = ({
  products,
  tables,
  users,
  currentUser,
  onSaleCreated
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'csv'>('single');

  // Single sale state
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [tableNumber, setTableNumber] = useState<string>('Comptoir');
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || 'Administrateur');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'contactless' | 'qr_pay' | 'voucher'>('card');
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [lines, setLines] = useState<SaleLine[]>([
    { productName: '', unitPrice: 0, quantity: 1, tvaRate: 10, total: 0 }
  ]);

  // Validation step: 'edit' -> 'preview' -> 'confirmed'
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // CSV Import state
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedCsvRows, setParsedCsvRows] = useState<any[]>([]);
  const [csvImportResult, setCsvImportResult] = useState<any>(null);

  // Calculations
  const rawSubtotal = lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity) / (1 + l.tvaRate / 100), 0);
  const rawTotalTTC = lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);
  const finalTotalTTC = Math.max(0, Number((rawTotalTTC - discount).toFixed(2)));
  const totalTVA = Math.max(0, Number((finalTotalTTC - rawSubtotal).toFixed(2)));

  const handleAddLine = () => {
    setLines([...lines, { productName: '', unitPrice: 0, quantity: 1, tvaRate: 10, total: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const updated = [...lines];
    if (prod) {
      updated[index] = {
        productId: prod.id,
        productName: prod.name,
        unitPrice: prod.price,
        quantity: updated[index].quantity || 1,
        tvaRate: prod.tvaRate || 10,
        total: Number(((updated[index].quantity || 1) * prod.price).toFixed(2))
      };
    }
    setLines(updated);
  };

  const handleLineChange = (index: number, field: keyof SaleLine, val: any) => {
    const updated = [...lines];
    if (field === 'quantity') {
      const q = Math.max(1, parseInt(val) || 1);
      updated[index].quantity = q;
      updated[index].total = Number((q * updated[index].unitPrice).toFixed(2));
    } else if (field === 'unitPrice') {
      const p = Math.max(0, parseFloat(val) || 0);
      updated[index].unitPrice = p;
      updated[index].total = Number((updated[index].quantity * p).toFixed(2));
    } else if (field === 'productName') {
      updated[index].productName = val;
    } else if (field === 'tvaRate') {
      updated[index].tvaRate = parseFloat(val) || 10;
    }
    setLines(updated);
  };

  const handleGoToPreview = () => {
    setErrorMsg('');
    const invalidLine = lines.find(l => !l.productName.trim() || l.unitPrice <= 0);
    if (invalidLine) {
      setErrorMsg('Veuillez renseigner un nom et un prix valide (> 0 DT) pour tous les articles.');
      return;
    }
    if (finalTotalTTC <= 0) {
      setErrorMsg('Le total de la vente doit être strictement supérieur à 0 DT.');
      return;
    }
    setStep('preview');
  };

  const handleConfirmAndSave = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        createdAt: new Date(saleDate).toISOString(),
        tableNumber,
        items: lines.map(l => ({
          productId: l.productId,
          productName: l.productName,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          tvaRate: l.tvaRate
        })),
        discount,
        paymentMethod,
        cashierId: currentUser?.id || 'usr_manual',
        cashierName: cashierName || currentUser?.name || 'Administrateur',
        notes: notes || 'Saisie manuelle validée',
        source: 'manual' as const
      };

      const createdSale = await api.createManualSale(payload);
      onSaleCreated(createdSale);

      // Reset form
      setLines([{ productName: '', unitPrice: 0, quantity: 1, tvaRate: 10, total: 0 }]);
      setDiscount(0);
      setNotes('');
      setStep('edit');
    } catch (err: any) {
      setErrorMsg(`Erreur d'enregistrement : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // CSV Parsing
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      parseCsvData(text);
    };
    reader.readAsText(file);
  };

  const parseCsvData = (text: string) => {
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length < 2) {
      setParsedCsvRows([]);
      return;
    }

    const rows: any[] = [];
    // Assume header at line 0
    for (let i = 1; i < rawLines.length; i++) {
      const cols = rawLines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 4) {
        // Date, Table/Ref, Article, Qte, Prix, TVA, Paiement, Caissier
        rows.push({
          date: cols[0] || new Date().toISOString(),
          tableNumber: cols[1] || 'Comptoir',
          productName: cols[2] || 'Article',
          quantity: parseInt(cols[3]) || 1,
          unitPrice: parseFloat(cols[4]) || 0,
          tvaRate: parseFloat(cols[5]) || 10,
          paymentMethod: cols[6] || 'card',
          cashierName: cols[7] || 'Import'
        });
      }
    }
    setParsedCsvRows(rows);
  };

  const handleImportCsvBatch = async () => {
    if (parsedCsvRows.length === 0) return;
    setLoading(true);
    try {
      const formattedBatch = parsedCsvRows.map(r => ({
        date: r.date,
        tableNumber: r.tableNumber,
        items: [
          {
            productName: r.productName,
            unitPrice: r.unitPrice,
            quantity: r.quantity,
            tvaRate: r.tvaRate
          }
        ],
        paymentMethod: r.paymentMethod,
        cashierName: r.cashierName
      }));

      const res = await api.importSalesBatch(formattedBatch, currentUser?.name || 'Admin');
      setCsvImportResult(res);
      setParsedCsvRows([]);
      setCsvContent('');
    } catch (err: any) {
      setErrorMsg(`Erreur lors de l'import: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Tab bar */}
      <div className="px-4 py-2.5 bg-[#F2F3F0] border-b border-[#D9DDD8] flex items-center justify-between">
        <div className="flex bg-white p-0.5 rounded-lg border border-[#D9DDD8]">
          <button
            onClick={() => {
              setActiveTab('single');
              setStep('edit');
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'single' ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs' : 'text-[#555D58]'
            }`}
          >
            Saisie Unitaire (Double Validation)
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'csv' ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs' : 'text-[#555D58]'
            }`}
          >
            Import Fichier CSV Historique
          </button>
        </div>

        <span className="text-[11px] text-[#555D58] font-medium hidden sm:inline">
          Module officiel de régularisation et saisie comptable Café Noir
        </span>
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === 'single' ? (
        step === 'edit' ? (
          /* STEP 1: EDIT FORM */
          <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-4">
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 space-y-4 shadow-2xs">
              <h3 className="font-bold text-sm text-[#252A27] pb-2 border-b border-[#ECEEEA]">
                1. Métadonnées de la Vente
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Date et Heure :</label>
                  <input
                    type="datetime-local"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Table / Destination :</label>
                  <select
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  >
                    <option value="Comptoir">Comptoir / À emporter</option>
                    <option value="Terrasse">Terrasse</option>
                    <option value="Événement">Événement Privé / Traiteur</option>
                    {tables.map(t => (
                      <option key={t.id} value={`Table ${t.number}`}>
                        Table {t.number} ({t.capacity} pers.)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Caissier / Opérateur :</label>
                  <select
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#555D58]">Mode de Paiement :</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  >
                    <option value="card">Carte Bancaire (CB)</option>
                    <option value="cash">Espèces</option>
                    <option value="contactless">Sans Contact</option>
                    <option value="voucher">Ticket Restaurant</option>
                    <option value="qr_pay">QR Pay</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Articles Table */}
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#ECEEEA]">
                <h3 className="font-bold text-sm text-[#252A27]">
                  2. Articles & Lignes de Vente ({lines.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 py-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#D9DDD8] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    {/* Catalog Quick Select */}
                    <div className="col-span-12 md:col-span-4">
                      <select
                        onChange={e => handleProductSelect(idx, e.target.value)}
                        value={line.productId || ''}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27]"
                      >
                        <option value="">Sélectionner un produit du catalogue...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price.toFixed(3)} DT)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Name */}
                    <div className="col-span-12 md:col-span-3">
                      <input
                        type="text"
                        placeholder="Désignation de l'article"
                        value={line.productName}
                        onChange={e => handleLineChange(idx, 'productName', e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-3 md:col-span-1">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={line.quantity}
                        onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-3 md:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Prix Unit"
                          value={line.unitPrice || ''}
                          onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                          className="w-full p-1.5 pr-5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-right text-[#252A27]"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#555D58]">DT</span>
                      </div>
                    </div>

                    {/* Line Total & Remove */}
                    <div className="col-span-6 md:col-span-2 flex items-center justify-between pl-2">
                      <span className="font-bold text-sm text-[#252A27]">
                        {line.total.toFixed(3)} DT
                      </span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Notes */}
            <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-2xs">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#555D58]">Remise exceptionnelle (DT) :</label>
                <input
                  type="number"
                  step="0.5"
                  value={discount || ''}
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />

                <label className="text-[11px] font-bold text-[#555D58] pt-1 block">Notes & Justification :</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Facture manuelle n°104, accord gérance..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              {/* Totals card */}
              <div className="bg-[#F7F7F5] rounded-xl p-4 border border-[#D9DDD8] space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#555D58]">
                    <span>Sous-total HT calculé :</span>
                    <span>{rawSubtotal.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[#555D58]">
                    <span>Total TVA (7%) :</span>
                    <span>{totalTVA.toFixed(3)} DT</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Remise :</span>
                      <span>-{discount.toFixed(3)} DT</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-serif font-black text-[#252A27] pt-2 border-t border-[#D9DDD8]">
                    <span>TOTAL TTC :</span>
                    <span>{finalTotalTTC.toFixed(3)} DT</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoToPreview}
                  className="w-full py-2.5 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Prévisualiser & Vérifier la Vente</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: PREVIEW & DOUBLE VALIDATION SCREEN */
          <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-4">
            <div className="bg-white rounded-2xl border-2 border-[#252A27] p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>Étape de confirmation obligatoire :</strong> Vérifiez attentivement les données de la vente ci-dessous avant l'enregistrement définitif.
                </span>
              </div>

              {/* Receipt Summary Box */}
              <div className="bg-[#F7F7F5] rounded-xl p-4 border border-[#D9DDD8] font-mono text-xs text-[#252A27] space-y-3">
                <div className="text-center pb-2 border-b border-dashed border-[#C7CDC8]">
                  <h4 className="font-serif font-bold text-sm">RÉCAPITULATIF SAISIE MANUELLE</h4>
                  <p className="text-[10px] text-[#555D58]">{new Date(saleDate).toLocaleString('fr-FR')}</p>
                  <p className="text-[10px] text-[#555D58]">Réf : {tableNumber} &bull; Par : {cashierName}</p>
                </div>

                <div className="space-y-1 py-1 border-b border-dashed border-[#C7CDC8]">
                  {lines.map((l, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{l.quantity}x {l.productName} ({l.unitPrice.toFixed(3)} DT)</span>
                      <span className="font-bold">{l.total.toFixed(3)} DT</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-[#555D58]">
                    <span>Sous-total HT :</span>
                    <span>{rawSubtotal.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[#555D58]">
                    <span>TVA :</span>
                    <span>{totalTVA.toFixed(3)} DT</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Remise :</span>
                      <span>-{discount.toFixed(3)} DT</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-[#252A27] pt-2 border-t border-[#D9DDD8]">
                    <span>TOTAL TTC :</span>
                    <span>{finalTotalTTC.toFixed(3)} DT</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#555D58] pt-1">
                    <span>Règlement :</span>
                    <span className="font-bold uppercase">{paymentMethod}</span>
                  </div>
                  {notes && (
                    <p className="text-[10px] text-[#555D58] italic pt-1">Note : {notes}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('edit')}
                  className="flex-1 py-2.5 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8] hover:bg-[#D9DDD8] flex items-center justify-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifier la Saisie</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'Enregistrement...' : 'Confirmer et Enregistrer'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* CSV IMPORT TAB */
        <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-2xl border border-[#D9DDD8] p-5 space-y-4 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">
                Importation par lot de ventes historiques (CSV)
              </h3>
              <p className="text-xs text-[#555D58]">
                Format attendu : Date (AAAA-MM-JJ HH:MM), Table/Ref, Article, Quantité, Prix TTC, TVA %, Mode Règlement, Caissier
              </p>
            </div>

            <div className="border-2 border-dashed border-[#C7CDC8] rounded-xl p-6 text-center space-y-2 hover:bg-[#F7F7F5] transition-colors">
              <Upload className="w-8 h-8 mx-auto text-[#555D58]" />
              <p className="text-xs font-bold text-[#252A27]">
                Déposez votre fichier .csv ou cliquez pour parcourir
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="inline-block px-4 py-2 bg-[#252A27] text-[#A4DEC2] text-xs font-bold rounded-lg cursor-pointer hover:bg-[#343B37] transition-colors shadow-2xs"
              >
                Sélectionner un fichier CSV
              </label>
            </div>

            {parsedCsvRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-[#252A27]">
                    Prévisualisation des lignes ({parsedCsvRows.length} vente(s) détectée(s))
                  </h4>
                  <span className="font-bold text-xs text-[#252A27]">
                    Total estimé :{' '}
                    {parsedCsvRows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0).toFixed(3)} DT
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto border border-[#D9DDD8] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F2F3F0] text-[#555D58] font-bold border-b border-[#D9DDD8]">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Table</th>
                        <th className="p-2">Article</th>
                        <th className="p-2 text-center">Qté</th>
                        <th className="p-2 text-right">Prix</th>
                        <th className="p-2">Paiement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEEEA]">
                      {parsedCsvRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F7F7F5]">
                          <td className="p-2 font-mono text-[11px]">{r.date}</td>
                          <td className="p-2">{r.tableNumber}</td>
                          <td className="p-2 font-bold text-[#252A27]">{r.productName}</td>
                          <td className="p-2 text-center">{r.quantity}</td>
                          <td className="p-2 text-right font-bold">{(r.quantity * r.unitPrice).toFixed(3)} DT</td>
                          <td className="p-2 uppercase text-[10px]">{r.paymentMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleImportCsvBatch}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE]"
                >
                  {loading ? 'Importation en cours...' : `Confirmer et Importer ${parsedCsvRows.length} ventes`}
                </button>
              </div>
            )}

            {csvImportResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importation terminée avec succès !</span>
                </p>
                <p>
                  {csvImportResult.importedCount} ventes enregistrées pour un chiffre d'affaires de{' '}
                  {csvImportResult.totalAmount.toFixed(3)} DT.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
