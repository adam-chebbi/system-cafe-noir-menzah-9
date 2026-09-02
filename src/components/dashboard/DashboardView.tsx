import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  DollarSign,
  Coffee,
  CheckCircle2,
  Calendar,
  Layers,
  Percent,
  Truck,
  Boxes,
  CreditCard,
  Banknote,
  Utensils,
  Filter,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { RetroProgressWidget } from '../common/RetroProgressWidget';

export const DashboardView: React.FC = () => {
  const { setCurrentView, refreshAlerts, globalVersion } = useSystem();

  // Period Filter State
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Active ranking tab
  const [rankingTab, setRankingTab] = useState<'top_qty' | 'flop_qty' | 'top_rev' | 'top_margin'>('top_qty');

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardAnalytics({
        period,
        startDate: period === 'custom' ? customStart : undefined,
        endDate: period === 'custom' ? customEnd : undefined
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period, globalVersion]);

  const handleApplyCustomPeriod = () => {
    if (period === 'custom') {
      loadAnalytics();
    } else {
      setPeriod('custom');
    }
  };

  const metrics = analytics?.metrics;
  const rankings = analytics?.rankings;
  const breakdowns = analytics?.breakdowns;
  const charts = analytics?.charts;
  const alerts = analytics?.alerts || [];

  const renderDeltaBadge = (delta: number) => {
    if (delta === undefined || isNaN(delta)) return null;
    const isPositive = delta >= 0;
    return (
      <span
        className={`inline-flex items-center space-x-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
          isPositive
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}
        title={`Variation par rapport à la période précédente (${isPositive ? '+' : ''}${delta}%)`}
      >
        {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-700" /> : <TrendingDown className="w-3 h-3 text-rose-700" />}
        <span>{isPositive ? `+${delta}%` : `${delta}%`}</span>
      </span>
    );
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-[#F7F7F5]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#252A27] border-t-[#A4DEC2] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#555D58]">Chargement du Tableau de bord consolidé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      {/* 1. Header with Period Controls */}
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#555D58] font-medium mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#555D58]" />
            <span>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span>&bull;</span>
            <span className="text-[#58B982] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#58B982] inline-block animate-pulse" />
              Café Noir &bull; Menzah 9
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-serif font-black text-[#252A27]">
            Tableau de Bord &bull; Performance & Ventes
          </h1>
        </div>

        {/* Period Filter Buttons & Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white p-0.5 rounded-xl border border-[#D9DDD8] shadow-2xs">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: 'week', label: 'Semaine' },
              { id: 'month', label: 'Mois' },
              { id: 'custom', label: 'Personnalisé' }
            ].map(p => (
              <button
                key={p.id}
                id={`dash-filter-${p.id}`}
                onClick={() => setPeriod(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p.id
                    ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                    : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-xl border border-[#D9DDD8] text-xs">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="font-bold text-[#252A27] focus:outline-none"
              />
              <span className="text-[#555D58]">&rarr;</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="font-bold text-[#252A27] focus:outline-none"
              />
              <button
                onClick={handleApplyCustomPeriod}
                className="px-2 py-0.5 bg-[#252A27] text-[#A4DEC2] rounded-md text-[11px] font-bold"
              >
                Filtrer
              </button>
            </div>
          )}

          <button
            onClick={loadAnalytics}
            className="p-2 rounded-xl bg-white border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA] transition-colors shadow-2xs"
            title="Rafraîchir les métriques"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid (8 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Chiffre d'Affaires Période + Jour / Mois */}
        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Chiffre d'Affaires
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.totalRevenue?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px]">
              <div className="flex items-center space-x-1 text-[#555D58]">
                <span>Jour: <strong>{metrics?.totalRevenueToday?.toFixed(3)}</strong></span>
                <span>&bull;</span>
                <span>Mois: <strong>{metrics?.totalRevenueMonth?.toFixed(3)}</strong></span>
              </div>
              {renderDeltaBadge(metrics?.revenueDelta)}
            </div>
          </div>
        </div>

        {/* KPI 2: Achats Fournisseurs */}
        <div
          onClick={() => setCurrentView('suppliers')}
          className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs hover:border-[#C7CDC8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Achats Fournisseurs
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.totalPurchases?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px] text-[#555D58]">
              <span>Factures reçues</span>
              {renderDeltaBadge(metrics?.purchasesDelta)}
            </div>
          </div>
        </div>

        {/* KPI 3: Dépenses d'Exploitation */}
        <div
          onClick={() => setCurrentView('expenses')}
          className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs hover:border-[#C7CDC8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Dépenses & Charges
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.totalExpenses?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px] text-[#555D58]">
              <span>Loyer, énergie, frais</span>
              {renderDeltaBadge(metrics?.expensesDelta)}
            </div>
          </div>
        </div>

        {/* KPI 4: Valeur du Stock */}
        <div
          onClick={() => setCurrentView('stock')}
          className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs hover:border-[#C7CDC8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Valeur du Stock
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.stockValuation?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px]">
              <span className="text-[#555D58]">Valorisation réelle</span>
              {metrics?.lowStockCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                  {metrics.lowStockCount} alerte(s)
                </span>
              ) : (
                <span className="text-emerald-700 font-bold text-[10px]">Stock sain</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 5: Coût du Personnel */}
        <div
          onClick={() => setCurrentView('hr')}
          className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs hover:border-[#C7CDC8] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Coût Personnel (RH)
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.totalStaffCost?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px] text-[#555D58]">
              <span>Masse salariale</span>
              <span className="text-[10px] font-bold text-[#252A27]">Équipe active</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Nombre de Tickets */}
        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Nombre de Tickets
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.ticketsCount || 0}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px] text-[#555D58]">
              <span>Transactions</span>
              {renderDeltaBadge(metrics?.ticketsDelta)}
            </div>
          </div>
        </div>

        {/* KPI 7: Panier Moyen */}
        <div className="bg-[#F2F3F0] p-4 rounded-xl border border-[#D9DDD8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#555D58] uppercase tracking-wider">
              Panier Moyen
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#252A27] tracking-tight">
              {metrics?.avgTicket?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8] text-[11px] text-[#555D58]">
              <span>Moyenne par client</span>
              {renderDeltaBadge(metrics?.avgTicketDelta)}
            </div>
          </div>
        </div>

        {/* KPI 8: Marge Estimée (Brute & Nette) */}
        <div className="bg-[#252A27] text-white p-4 rounded-xl border border-[#252A27] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-[#A4DEC2] uppercase tracking-wider">
              Marge Estimée
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#A4DEC2]/20 text-[#A4DEC2] flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-black text-[#A4DEC2] tracking-tight">
              {metrics?.grossMargin?.toFixed(3) || '0.000'} DT
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px] text-white/80">
              <span>Marge brute: <strong>{metrics?.grossMarginPercentage || 0}%</strong></span>
              <span>Nette: <strong>{metrics?.netOperatingProfit?.toFixed(3)} DT</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Retroactive / Historical Migration Progress */}
      <RetroProgressWidget />

      {/* 3. Main Analytics Grid: Time Evolution Chart + Payment & Consumption Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left 2 Cols: Time Evolution Chart */}
        <div className="lg:col-span-2 bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#252A27]">
                Évolution Chronologique des Ventes & Marges
              </h3>
              <p className="text-xs text-[#555D58]">
                {charts?.isHourly ? "Activité heure par heure (07h - 23h)" : "Évolution quotidienne sur la période"}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#252A27] inline-block" />
                <span className="text-[11px] font-semibold text-[#555D58]">CA (DT)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#A4DEC2] inline-block" />
                <span className="text-[11px] font-semibold text-[#555D58]">Marge (DT)</span>
              </div>
            </div>
          </div>

          {/* SVG Bar / Area Chart */}
          <div className="h-44 w-full flex items-end justify-between gap-1 pt-3 pb-2 border-b border-[#D9DDD8]">
            {charts?.timeSeriesData?.map((item: any, idx: number) => {
              const maxAmount = Math.max(...charts.timeSeriesData.map((d: any) => d.revenue), 10);
              const heightPct = Math.max(6, (item.revenue / maxAmount) * 100);
              const marginPct = Math.max(4, (item.margin / maxAmount) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[#252A27] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-xl transition-opacity pointer-events-none whitespace-nowrap z-20">
                    <p className="text-[#A4DEC2]">{item.label} : {item.revenue.toFixed(3)} DT</p>
                    <p className="text-white/80">Marge: {item.margin.toFixed(3)} DT ({item.count} tickets)</p>
                  </div>

                  {/* Revenue Bar */}
                  <div className="w-full max-w-[28px] flex flex-col items-center justify-end relative h-full">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-150 ${
                        item.revenue > 0 ? 'bg-[#252A27] group-hover:bg-[#343B37]' : 'bg-[#D9DDD8]/50'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Inner Margin Bar */}
                      {item.margin > 0 && (
                        <div
                          className="w-full bg-[#A4DEC2] rounded-t-sm"
                          style={{ height: `${(marginPct / heightPct) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between text-[10px] font-bold text-[#555D58] pt-2 overflow-x-hidden">
            {charts?.timeSeriesData
              ?.filter((_: any, i: number, arr: any[]) => i % Math.ceil(arr.length / 8) === 0 || i === arr.length - 1)
              .map((item: any, idx: number) => (
                <span key={idx}>{item.label}</span>
              ))}
          </div>
        </div>

        {/* Right 1 Col: Payment Methods & Consumption Breakdown */}
        <div className="space-y-4">
          {/* Payment Modes */}
          <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#252A27] pb-2 border-b border-[#D9DDD8]">
              Modes de Paiement
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9DDD8]">
                <span className="flex items-center space-x-2 font-bold text-[#252A27]">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>Espèces</span>
                </span>
                <span className="font-serif font-black text-sm text-[#252A27]">
                  {breakdowns?.paymentMethods?.especes?.toFixed(3) || '0.000'} DT
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9DDD8]">
                <span className="flex items-center space-x-2 font-bold text-[#252A27]">
                  <CreditCard className="w-4 h-4 text-blue-700" />
                  <span>TPE (Carte Bancaire)</span>
                </span>
                <span className="font-serif font-black text-sm text-[#252A27]">
                  {breakdowns?.paymentMethods?.tpe?.toFixed(3) || '0.000'} DT
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9DDD8]">
                <span className="flex items-center space-x-2 font-bold text-[#252A27]">
                  <Receipt className="w-4 h-4 text-amber-700" />
                  <span>Ticket restaurant</span>
                </span>
                <span className="font-serif font-black text-sm text-[#252A27]">
                  {breakdowns?.paymentMethods?.ticket_restaurant?.toFixed(3) || '0.000'} DT
                </span>
              </div>
            </div>
          </div>

          {/* Consumption Type: Sur place vs À emporter */}
          <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-[#252A27] pb-2 border-b border-[#D9DDD8]">
              Type de Consommation
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#D9DDD8] text-center space-y-1">
                <Utensils className="w-4 h-4 mx-auto text-[#252A27]" />
                <span className="text-[10px] font-bold text-[#555D58] block">Sur place</span>
                <span className="font-serif font-black text-xs sm:text-sm text-[#252A27] block">
                  {breakdowns?.consumptionTypes?.sur_place?.toFixed(3) || '0.000'} DT
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#D9DDD8] text-center space-y-1">
                <ShoppingBag className="w-4 h-4 mx-auto text-[#252A27]" />
                <span className="text-[10px] font-bold text-[#555D58] block">À emporter</span>
                <span className="font-serif font-black text-xs sm:text-sm text-[#252A27] block">
                  {breakdowns?.consumptionTypes?.a_emporter?.toFixed(3) || '0.000'} DT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Product Rankings: Top / Flop Volume, Top Revenue & Top Margin */}
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DDD8]">
          <div>
            <h3 className="font-serif font-bold text-base text-[#252A27]">
              Analyse du Mix Produit & Rentabilité
            </h3>
            <p className="text-xs text-[#555D58]">
              Classement des articles selon le volume, le chiffre d'affaires et la marge générée
            </p>
          </div>

          <div className="flex bg-white p-0.5 rounded-xl border border-[#D9DDD8]">
            <button
              onClick={() => setRankingTab('top_qty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rankingTab === 'top_qty' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Top Ventes (Qté)
            </button>
            <button
              onClick={() => setRankingTab('flop_qty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rankingTab === 'flop_qty' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Moins Vendus (Flop)
            </button>
            <button
              onClick={() => setRankingTab('top_rev')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rankingTab === 'top_rev' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Top CA (DT)
            </button>
            <button
              onClick={() => setRankingTab('top_margin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rankingTab === 'top_margin' ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
              }`}
            >
              Top Marge (DT)
            </button>
          </div>
        </div>

        {/* Selected Ranking List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {rankingTab === 'top_qty' &&
            rankings?.topSellingProducts?.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-[#D9DDD8] flex flex-col justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-[#A4DEC2] text-[#252A27] font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <p className="font-bold text-xs text-[#252A27] truncate">{item.name}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#ECEEEA] flex justify-between text-xs">
                  <span className="font-bold text-emerald-800">{item.quantity} portions</span>
                  <span className="font-bold text-[#252A27]">{item.revenue.toFixed(3)} DT</span>
                </div>
              </div>
            ))}

          {rankingTab === 'flop_qty' &&
            rankings?.flopSellingProducts?.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-[#D9DDD8] flex flex-col justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <p className="font-bold text-xs text-[#252A27] truncate">{item.name}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#ECEEEA] flex justify-between text-xs">
                  <span className="font-bold text-rose-700">{item.quantity} portions</span>
                  <span className="font-medium text-[#555D58]">{item.revenue.toFixed(3)} DT</span>
                </div>
              </div>
            ))}

          {rankingTab === 'top_rev' &&
            rankings?.topRevenueProducts?.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-[#D9DDD8] flex flex-col justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-[#252A27] text-[#A4DEC2] font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <p className="font-bold text-xs text-[#252A27] truncate">{item.name}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#ECEEEA] flex justify-between text-xs">
                  <span className="font-serif font-black text-sm text-[#252A27]">{item.revenue.toFixed(3)} DT</span>
                  <span className="text-[11px] text-[#555D58]">{item.quantity} vts</span>
                </div>
              </div>
            ))}

          {rankingTab === 'top_margin' &&
            rankings?.topMarginProducts?.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-[#D9DDD8] flex flex-col justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-[#A4DEC2] text-[#252A27] font-black text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <p className="font-bold text-xs text-[#252A27] truncate">{item.name}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#ECEEEA] flex justify-between text-xs">
                  <span className="font-bold text-emerald-800">Marge: {item.margin.toFixed(3)} DT</span>
                  <span className="text-[11px] text-[#555D58]">
                    {item.revenue > 0 ? Math.round((item.margin / item.revenue) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 5. Alerts & Quick Action Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Operational Alerts */}
        <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9DDD8]">
            <h3 className="font-serif font-bold text-sm text-[#252A27] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Alertes Opérationnelles ({alerts.length})</span>
            </h3>
            <button
              onClick={() => setCurrentView('journal')}
              className="text-xs font-bold text-[#252A27] hover:underline"
            >
              Consulter le journal &rarr;
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                <span>Toutes les opérations sont conformes. Aucune alerte active.</span>
              </div>
            ) : (
              alerts.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 bg-white rounded-xl border border-[#D9DDD8] flex items-start space-x-2.5 text-xs"
                >
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[#252A27]">{a.title}</p>
                    <p className="text-[#555D58] text-[11px]">{a.message}</p>
                  </div>
                  <span className="text-[10px] text-[#555D58] whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Station Navigation Card */}
        <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-serif font-bold text-sm text-[#252A27] pb-2 border-b border-[#D9DDD8]">
              Accès Direct aux Postes Opérationnels
            </h3>
            <p className="text-xs text-[#555D58] mt-2">
              Basculez directement vers le module de saisie des ventes, l'inventaire des stocks ou la gestion des achats :
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => setCurrentView('pos')}
              className="p-3 rounded-xl bg-white border border-[#D9DDD8] hover:border-[#252A27] text-left transition-all group"
            >
              <Receipt className="w-5 h-5 text-[#252A27] group-hover:scale-105 transition-transform mb-1" />
              <p className="font-bold text-xs text-[#252A27]">Module Ventes</p>
              <p className="text-[10px] text-[#555D58]">Saisie & Imports</p>
            </button>

            <button
              onClick={() => setCurrentView('stock')}
              className="p-3 rounded-xl bg-white border border-[#D9DDD8] hover:border-[#252A27] text-left transition-all group"
            >
              <Boxes className="w-5 h-5 text-[#252A27] group-hover:scale-105 transition-transform mb-1" />
              <p className="font-bold text-xs text-[#252A27]">Stocks & Pertes</p>
              <p className="text-[10px] text-[#555D58]">Inventaire & Audits</p>
            </button>

            <button
              onClick={() => setCurrentView('suppliers')}
              className="p-3 rounded-xl bg-white border border-[#D9DDD8] hover:border-[#252A27] text-left transition-all group"
            >
              <Truck className="w-5 h-5 text-[#252A27] group-hover:scale-105 transition-transform mb-1" />
              <p className="font-bold text-xs text-[#252A27]">Fournisseurs</p>
              <p className="text-[10px] text-[#555D58]">Factures & Bons</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
