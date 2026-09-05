import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import { generateMonthlyReportPdf } from '../../utils/monthlyReportPdf';
import {
  TrendingUp,
  FileDown,
  History,
  X
} from 'lucide-react';

const currentMonthStr = () => new Date().toISOString().slice(0, 7);

export const RapportsTab: React.FC = () => {
  const {
    globalVersion,
    triggerGlobalRefresh,
    currentSubTab,
    setCurrentSubTab,
    currentAction,
    setCurrentAction,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [periodDays, setPeriodDays] = useState<number>(30);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [reportMonth, setReportMonth] = useState<string>(currentMonthStr());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Retroactive sale modal
  const [isRetroSaleModalOpen, setIsRetroSaleModalOpen] = useState(false);
  const [retroSaleRef, setRetroSaleRef] = useState('');
  const [retroSaleAmount, setRetroSaleAmount] = useState(25.0);
  const [retroSalePaymentMethod, setRetroSalePaymentMethod] = useState<'cash' | 'card' | 'contactless' | 'voucher'>('cash');
  const [retroFields, setRetroFields] = useState<RetroactiveFields>(emptyRetroactiveFields());

  useEffect(() => {
    if (currentSubTab === 'today') setPeriodDays(1);
    else if (currentSubTab === '7days') setPeriodDays(7);
    else if (currentSubTab === '30days') setPeriodDays(30);
    else if (currentSubTab === '90days') setPeriodDays(90);

    if (currentAction === 'retro-sale') {
      openRetroSaleModal();
      setCurrentAction(undefined, { replace: true });
    }
  }, [currentSubTab, currentAction]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const data = await api.getFinancialReport(periodDays);
      setFinancials(data);
    } catch (err) {
      console.error('Failed to load financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancials();
  }, [periodDays, globalVersion]);

  const openRetroSaleModal = () => {
    setRetroSaleRef(`TCK-${Date.now().toString().slice(-4)}`);
    setRetroSaleAmount(25.0);
    setRetroSalePaymentMethod('cash');
    setRetroFields(emptyRetroactiveFields());
    setIsRetroSaleModalOpen(true);
  };

  const handleSaveRetroSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroSaleAmount) return;

    try {
      const finalDocDate = retroFields.documentDate || new Date().toISOString().split('T')[0];
      const tva = Number((retroSaleAmount * 0.1 / 1.1).toFixed(2));
      const subtotal = Number((retroSaleAmount - tva).toFixed(2));

      await api.createManualSale({
        saleNumber: retroSaleRef || `TCK-${Date.now().toString().slice(-4)}`,
        subtotal,
        totalTva: tva,
        tvaBreakdown: [{ rate: 10, base: subtotal, tax: tva }],
        discount: 0,
        totalAmount: Number(retroSaleAmount),
        paymentMethod: retroSalePaymentMethod,
        cashierId: currentUser?.id || 'usr_admin',
        cashierName: currentUser?.name || 'Admin',
        source: 'retroactive',
        isRetroactive: true,
        documentDate: finalDocDate,
        attachmentUrl: retroFields.attachmentUrl || undefined,
        referenceNumber: retroSaleRef,
        notes: retroFields.notes || 'Ticket de caisse historique',
        itemsSummary: [{ name: 'Vente globale récapitulative', quantity: 1, total: Number(retroSaleAmount) }]
      } as any);

      showRouteNotification('Vente historique enregistrée avec succès', 'success');
      setIsRetroSaleModalOpen(false);
      triggerGlobalRefresh();
      loadFinancials();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleGenerateMonthlyPdf = async () => {
    try {
      setGeneratingPdf(true);
      const report = await api.getMonthlyReport(reportMonth);
      generateMonthlyReportPdf(report);
      showRouteNotification('Rapport mensuel PDF généré.', 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur lors de la génération du PDF: ${err.message}`, 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading && !financials) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#252A27] border-t-[#A4DEC2] rounded-full animate-spin" />
      </div>
    );
  }

  const pnl = financials?.pnl || {
    grossRevenueTTC: 0,
    netRevenueHT: 0,
    tvaCollected: 0,
    cogsFoodCost: 0,
    grossMargin: 0,
    grossMarginPercent: 0,
    payrollCosts: 0,
    operatingExpenses: 0,
    wasteLosses: 0,
    netOperatingProfit: 0,
    netMarginPercent: 0
  };

  const periodTabName = periodDays === 1 ? 'today' : periodDays === 7 ? '7days' : periodDays === 30 ? '30days' : '90days';

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#555D58] font-bold mb-1">
            <TrendingUp className="w-4 h-4 text-[#555D58]" />
            <span className="uppercase tracking-wider">Compte de Résultat & Analyse de Gestion</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#252A27]">
            Rentabilité sur la période
          </h2>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <div className="flex bg-[#ECEEEA] p-1 rounded-lg border border-[#D9DDD8]">
            {[
              { days: 1, tab: 'today', label: "Aujourd'hui" },
              { days: 7, tab: '7days', label: '7 jours' },
              { days: 30, tab: '30days', label: '30 jours' },
              { days: 90, tab: '90days', label: 'Trimestre' }
            ].map(p => (
              <button
                key={p.days}
                onClick={() => {
                  setPeriodDays(p.days);
                  setCurrentSubTab(p.tab);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  periodDays === p.days
                    ? 'bg-[#A4DEC2] text-[#252A27] font-bold shadow-xs'
                    : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={openRetroSaleModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-2xs"
            title="Saisir un ticket de caisse ou vente manuelle papier"
          >
            <History className="w-3.5 h-3.5" />
            <span>Saisie Vente Hist.</span>
          </button>

          <CopyLinkButton view="reports" subTab={periodTabName} iconOnly />
        </div>
      </div>

      {/* Monthly PDF report */}
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-[#252A27]">Rapport mensuel PDF</h3>
          <p className="text-xs text-[#555D58] mt-0.5">
            CA, évolution, tickets, achats, dépenses, personnel, marge, stock, pertes, écarts d'inventaire, top produits et alertes du mois.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={reportMonth}
            max={currentMonthStr()}
            onChange={e => setReportMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#D9DDD8] bg-white text-sm font-semibold text-[#252A27]"
          />
          <button
            onClick={handleGenerateMonthlyPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 rounded-xl bg-[#252A27] text-[#A4DEC2] px-4 py-2 text-sm font-bold hover:bg-[#343B37] transition-colors shadow-xs disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{generatingPdf ? 'Génération...' : 'Télécharger le PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs">
          <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
            Chiffre d'Affaires HT
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#252A27] mt-1">
            {pnl.netRevenueHT.toFixed(3)} DT
          </div>
          <p className="text-[11px] text-[#555D58] mt-1">TTC : {pnl.grossRevenueTTC.toFixed(3)} DT</p>
        </div>

        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs">
          <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
            Marge Brute Matières
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#252A27] mt-1">
            {pnl.grossMargin.toFixed(3)} DT
          </div>
          <p className="text-[11px] text-[#555D58] font-bold mt-1">
            {pnl.grossMarginPercent.toFixed(1)} % du CA
          </p>
        </div>

        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs">
          <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
            Charges Exploitation
          </span>
          <div className="text-xl sm:text-2xl font-bold text-[#252A27] mt-1">
            {(pnl.payrollCosts + pnl.operatingExpenses).toFixed(3)} DT
          </div>
          <p className="text-[11px] text-[#555D58] mt-1">Salaires + Frais généraux</p>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${pnl.netOperatingProfit >= 0 ? 'bg-[#A4DEC2]/20 border-[#8BCFAE]' : 'bg-rose-50 border-rose-200'}`}>
          <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
            Résultat Net Exploitation
          </span>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${pnl.netOperatingProfit >= 0 ? 'text-[#252A27]' : 'text-rose-800'}`}>
            {pnl.netOperatingProfit.toFixed(3)} DT
          </div>
          <p className="text-[11px] font-bold mt-1 text-[#252A27]">
            Taux Net : {pnl.netMarginPercent.toFixed(1)} %
          </p>
        </div>
      </div>

      {/* P&L Statement Detailed Table */}
      <div className="bg-[#F2F3F0] p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[#252A27]">
          Compte de Résultat d'Exploitation (P&L)
        </h3>

        <div className="divide-y divide-[#D9DDD8] text-xs">
          <div className="py-2.5 flex justify-between font-bold text-[#252A27]">
            <span>(+) Chiffre d'Affaires Net (HT)</span>
            <span className="font-mono">{pnl.netRevenueHT.toFixed(3)} DT</span>
          </div>

          <div className="py-2 flex justify-between text-[#555D58] pl-3">
            <span>(-) Coût Matières Premières Consommées (Food Cost)</span>
            <span className="font-mono text-rose-700">-{pnl.cogsFoodCost.toFixed(3)} DT</span>
          </div>

          <div className="py-2.5 flex justify-between font-bold bg-[#ECEEEA] px-3 rounded-lg text-[#252A27]">
            <span>(=) Marge Brute Globale</span>
            <span className="font-mono">{pnl.grossMargin.toFixed(3)} DT ({pnl.grossMarginPercent.toFixed(1)}%)</span>
          </div>

          <div className="py-2 flex justify-between text-[#555D58] pl-3">
            <span>(-) Masse Salariale & Charges Équipe</span>
            <span className="font-mono text-rose-700">-{pnl.payrollCosts.toFixed(3)} DT</span>
          </div>

          <div className="py-2 flex justify-between text-[#555D58] pl-3">
            <span>(-) Dépenses d'Exploitation (Loyer, Énergie, Logiciels)</span>
            <span className="font-mono text-rose-700">-{pnl.operatingExpenses.toFixed(3)} DT</span>
          </div>

          <div className="py-2 flex justify-between text-[#555D58] pl-3">
            <span>(-) Pertes, Casses & Démarque</span>
            <span className="font-mono text-rose-700">-{pnl.wasteLosses.toFixed(3)} DT</span>
          </div>

          <div className="py-3 flex justify-between font-black text-sm text-[#252A27] border-t-2 border-[#252A27]">
            <span>(=) RÉSULTAT NET D'EXPLOITATION</span>
            <span className={`font-mono text-base ${pnl.netOperatingProfit >= 0 ? 'text-[#252A27]' : 'text-rose-800'}`}>
              {pnl.netOperatingProfit.toFixed(3)} DT
            </span>
          </div>
        </div>
      </div>

      {/* Top Products & Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#F2F3F0] p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-[#252A27] uppercase tracking-wider">Répartition du CA par Catégorie</h3>
          <div className="space-y-2.5">
            {(financials?.categoryBreakdown || []).length === 0 && (
              <p className="text-xs text-[#555D58]">Aucune vente sur la période.</p>
            )}
            {financials?.categoryBreakdown?.map((cat: any) => {
              const maxCat = Math.max(...financials.categoryBreakdown.map((c: any) => c.revenue), 1);
              const widthPct = Math.max(5, (cat.revenue / maxCat) * 100);
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#252A27]">
                    <span>{cat.name}</span>
                    <span className="font-mono font-bold">{cat.revenue.toFixed(3)} DT</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#ECEEEA] rounded-full overflow-hidden border border-[#D9DDD8]">
                    <div
                      className="h-full bg-[#A4DEC2] rounded-full transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#F2F3F0] p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
          <h3 className="font-bold text-xs text-[#252A27] uppercase tracking-wider">Top 5 Produits en Volume</h3>
          <div className="space-y-2">
            {(financials?.topProducts || []).length === 0 && (
              <p className="text-xs text-[#555D58]">Aucune vente sur la période.</p>
            )}
            {financials?.topProducts?.slice(0, 5).map((prod: any, idx: number) => (
              <div
                key={prod.name}
                className="p-2.5 rounded-xl bg-white border border-[#D9DDD8] flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-md bg-[#ECEEEA] text-[10px] font-bold text-[#252A27] flex items-center justify-center border border-[#D9DDD8]">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#252A27]">{prod.name}</h4>
                    <p className="text-[10px] text-[#555D58]">{prod.quantity} vendus</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-[#252A27]">
                  {prod.revenue.toFixed(3)} DT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RETROACTIVE SALE MODAL */}
      {isRetroSaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <History className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Saisie Ticket / Vente Historique</h3>
                  <p className="text-[11px] text-[#555D58]">Rattrapage d'un ticket papier ou ancien système</p>
                </div>
              </div>
              <button
                onClick={() => setIsRetroSaleModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRetroSale} className="space-y-3">
              <RetroactiveDocumentPanel value={retroFields} onChange={setRetroFields} />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant Total TTC (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retroSaleAmount}
                    onChange={e => setRetroSaleAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Mode de paiement</label>
                  <select
                    value={retroSalePaymentMethod}
                    onChange={e => setRetroSalePaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte Bancaire</option>
                    <option value="contactless">Sans contact</option>
                    <option value="voucher">Ticket Restaurant</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRetroSaleModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Enregistrer la Vente Historique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
