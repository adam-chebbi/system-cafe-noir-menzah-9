import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import {
  TrendingUp,
  Receipt,
  Users,
  ShoppingBag,
  Clock,
  AlertTriangle,
  QrCode,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Coffee,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Order } from '../../types';
import { RetroProgressWidget } from '../common/RetroProgressWidget';

export const DashboardView: React.FC = () => {
  const { setCurrentView, refreshAlerts, globalVersion } = useSystem();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [m, o, f] = await Promise.all([
          api.getDashboardMetrics(),
          api.getOrders(),
          api.getFinancialReport(30)
        ]);
        setMetrics(m);
        setRecentOrders(o.slice(0, 6));
        setFinancials(f);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [globalVersion]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#252A27] border-t-[#A4DEC2] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#555D58]">Chargement du centre de commande...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      {/* Top Command Banner: Date & Fast Operational Station Launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#555D58] font-medium mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#555D58]" />
            <span>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span>&bull;</span>
            <span className="text-[#58B982] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#58B982] inline-block" />
              Service actif en salle & comptoir
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#252A27]">
            Poste de Commandement &bull; Café Noir
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="dash-btn-pos"
            onClick={() => setCurrentView('pos')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] active:bg-[#6DBE96] text-[#252A27] text-xs font-bold transition-all shadow-xs border border-[#8BCFAE]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ouvrir la Caisse POS</span>
          </button>
          <button
            id="dash-btn-kds"
            onClick={() => setCurrentView('orders')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#252A27] border border-[#D9DDD8] text-xs font-bold transition-all shadow-xs"
          >
            <Clock className="w-4 h-4 text-[#555D58]" />
            <span>KDS Commandes</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Untitled UI Card pattern) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. CA du Jour */}
        <div className="bg-[#F2F3F0] p-4 sm:p-4.5 rounded-xl border border-[#D9DDD8] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
              Chiffre d'Affaires
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#58B982]/15 text-[#58B982] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#252A27] tracking-tight">
            {metrics?.totalRevenueToday?.toFixed(3) || '0.000'} DT
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-[#58B982] font-semibold mt-1.5">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics?.ticketsCount || 0} encaissements</span>
          </div>
        </div>

        {/* 2. Panier Moyen */}
        <div className="bg-[#F2F3F0] p-4 sm:p-4.5 rounded-xl border border-[#D9DDD8] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
              Panier Moyen
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#55A9C0]/15 text-[#55A9C0] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#252A27] tracking-tight">
            {metrics?.avgTicket?.toFixed(3) || '0.000'} DT
          </div>
          <p className="text-[11px] text-[#555D58] font-medium mt-1.5">
            Moyenne par client encaissé
          </p>
        </div>

        {/* 3. Occupation des Tables */}
        <div
          onClick={() => setCurrentView('tables')}
          className="bg-[#F2F3F0] p-4 sm:p-4.5 rounded-xl border border-[#D9DDD8] shadow-xs hover:border-[#C7CDC8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#555D58] uppercase tracking-wider">
              Occupation Salle
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#9A8064]/15 text-[#9A8064] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#252A27] tracking-tight">
            {metrics?.tableOccupancyRate || 0} %
          </div>
          <p className="text-[11px] text-[#555D58] font-medium mt-1.5">
            {metrics?.occupiedTables || 0} sur {metrics?.totalTables || 0} tables occupées
          </p>
        </div>

        {/* 4. Commandes en attente QR */}
        <div
          onClick={() => setCurrentView('orders')}
          className={`p-4 sm:p-4.5 rounded-xl border transition-all cursor-pointer group ${
            metrics?.pendingOrdersCount > 0
              ? 'bg-[#E5AD3E]/20 text-[#252A27] border-[#E5AD3E] shadow-sm'
              : 'bg-[#F2F3F0] border-[#D9DDD8] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555D58]">
              File Commandes QR
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                metrics?.pendingOrdersCount > 0
                  ? 'bg-[#E5AD3E] text-white'
                  : 'bg-[#ECEEEA] text-[#555D58]'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[#252A27]">
            {metrics?.pendingOrdersCount || 0}
          </div>
          <p className="text-[11px] font-medium mt-1.5 text-[#555D58]">
            {metrics?.activeOrdersCount || 0} préparations en cours
          </p>
        </div>
      </div>

      {/* Historical Data Digitalization Tracker */}
      <RetroProgressWidget />

      {/* Main Grid: Hourly Activity Chart + Live Order Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* Left 2 Cols: Sales Volume & Top Items */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Hourly Sales Bar Chart */}
          <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-xl border border-[#D9DDD8] shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Activité des Ventes par Heure</h3>
                <p className="text-xs text-[#555D58]">Répartition du chiffre d'affaires aujourd'hui (08h00 - 22h00)</p>
              </div>
              <button
                onClick={() => setCurrentView('reports')}
                className="text-xs font-semibold text-[#252A27] bg-[#ECEEEA] hover:bg-[#E3E7E3] px-2.5 py-1 rounded-md border border-[#D9DDD8] flex items-center space-x-1 transition-colors"
              >
                <span>Rapports</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#555D58]" />
              </button>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-40 w-full flex items-end justify-between gap-1.5 pt-3 pb-2 border-b border-[#D9DDD8]">
              {financials?.hourlySales?.map((item: any) => {
                const max = Math.max(...financials.hourlySales.map((h: any) => h.amount), 50);
                const heightPct = Math.max(8, (item.amount / max) * 100);
                return (
                  <div key={item.hour} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#252A27] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {item.amount.toFixed(3)} DT ({item.count} vts)
                    </div>
                    {/* Bar */}
                    <div
                      className={`w-full max-w-[26px] rounded-t-sm transition-all duration-200 ${
                        item.amount > 0 ? 'bg-[#A4DEC2] group-hover:bg-[#8BCFAE]' : 'bg-[#ECEEEA]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[10px] font-semibold text-[#555D58] pt-2">
              <span>08h</span>
              <span>10h</span>
              <span>12h</span>
              <span>14h</span>
              <span>16h</span>
              <span>18h</span>
              <span>20h</span>
              <span>22h</span>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-xl border border-[#D9DDD8] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Top Ventes & Spécialités</h3>
                <p className="text-xs text-[#555D58]">Articles les plus demandés</p>
              </div>
              <button
                onClick={() => setCurrentView('products')}
                className="text-xs font-semibold text-[#252A27] hover:underline"
              >
                Gérer la carte
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {financials?.topProducts?.slice(0, 4).map((p: any, idx: number) => (
                <div
                  key={p.name}
                  className="p-3 rounded-lg bg-[#F7F7F5] border border-[#D9DDD8] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#ECEEEA] border border-[#D9DDD8] text-xs font-bold text-[#252A27] flex items-center justify-center shadow-2xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#252A27]">{p.name}</p>
                      <p className="text-[11px] text-[#555D58]">{p.quantity} portions vendues</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#252A27]">
                    {p.revenue.toFixed(3)} DT
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Orders Stream & Quick Actions */}
        <div className="space-y-4 sm:space-y-5">
          {/* Live Recent Orders */}
          <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-xl border border-[#D9DDD8] shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#58B982] animate-pulse" />
                <h3 className="font-bold text-sm text-[#252A27]">Commandes Récentes</h3>
              </div>
              <button
                onClick={() => setCurrentView('orders')}
                className="text-xs font-semibold text-[#252A27] hover:underline"
              >
                Voir tout ({recentOrders.length})
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#929A95]">
                  Aucune commande récente
                </div>
              ) : (
                recentOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setCurrentView('orders')}
                    className="p-3 rounded-lg bg-[#F7F7F5] hover:bg-[#ECEEEA] border border-[#D9DDD8] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[#252A27]">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                            order.status === 'pending_approval'
                              ? 'bg-[#E5AD3E]/20 text-[#252A27] border border-[#E5AD3E] animate-pulse'
                              : order.status === 'accepted'
                              ? 'bg-[#55A9C0]/20 text-[#252A27] border border-[#55A9C0]'
                              : order.status === 'ready'
                              ? 'bg-[#58B982]/20 text-[#252A27] border border-[#58B982]'
                              : 'bg-[#ECEEEA] text-[#555D58]'
                          }`}
                        >
                          {order.status === 'pending_approval'
                            ? 'Attente QR'
                            : order.status === 'accepted'
                            ? 'En prépa'
                            : order.status === 'ready'
                            ? 'Prêt'
                            : order.status === 'completed'
                            ? 'Payé'
                            : order.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#252A27]">
                        {order.total.toFixed(3)} DT
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#555D58]">
                      <span>
                        {order.tableNumber ? `Table ${order.tableNumber}` : 'À emporter'} &bull; {order.customerName}
                      </span>
                      <span>{order.items.length} art.</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick shortcuts widget */}
            <div className="mt-3.5 pt-3 border-t border-[#D9DDD8] space-y-2">
              <button
                onClick={() => setCurrentView('tables')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#252A27] text-xs font-semibold transition-colors border border-[#D9DDD8]"
              >
                <span>Consulter le plan de salle</span>
                <ChevronRight className="w-4 h-4 text-[#555D58]" />
              </button>
              <button
                onClick={() => setCurrentView('stock')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#252A27] text-xs font-semibold transition-colors border border-[#D9DDD8]"
              >
                <span>Vérifier les alertes de stock</span>
                <ChevronRight className="w-4 h-4 text-[#555D58]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
