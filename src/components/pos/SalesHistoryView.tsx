import React, { useState, useEffect, useRef } from 'react';
import { Sale, User, SaleItem, PaymentMethod, ConsumptionType } from '../../types';
import { api } from '../../services/api';
import { useSystem } from '../../context/SystemContext';
import { CopyLinkButton } from '../common/CopyLinkButton';
import {
  Search,
  Printer,
  Ban,
  Calendar,
  CreditCard,
  Banknote,
  Percent,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  FileText,
  Edit3,
  History,
  Check,
  Utensils,
  ShoppingBag,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

interface SalesHistoryViewProps {
  currentUser: User | null;
  onRefreshTrigger?: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  currentUser,
  onRefreshTrigger
}) => {
  const { currentRecordId, showRouteNotification } = useSystem();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('today');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [consumptionFilter, setConsumptionFilter] = useState<string>('all');
  const hasValidatedIdRef = useRef(false);

  // Modals state
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [selectedSaleForHistory, setSelectedSaleForHistory] = useState<Sale | null>(null);

  // Editing state (Admin correction)
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editLines, setEditLines] = useState<SaleItem[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('especes');
  const [editConsumptionType, setEditConsumptionType] = useState<ConsumptionType>('sur_place');
  const [editTicketCount, setEditTicketCount] = useState<number>(1);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editTableNumber, setEditTableNumber] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Cancelling state
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.getSales();
      const safeData = Array.isArray(data) ? data : [];
      setSales(safeData);

      // Deep-link check
      if (currentRecordId) {
        const found = safeData.find(s => s.id === currentRecordId || s.saleNumber === currentRecordId);
        if (found) {
          setSelectedSaleForDetails(found);
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`La vente / ticket (ID: "${currentRecordId}") est introuvable.`, 'warning');
        }
        hasValidatedIdRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Filter calculations
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const normalizeMethod = (m?: string) => {
    const s = (m || '').toLowerCase();
    if (s === 'especes' || s === 'cash' || s === 'espèces') return 'especes';
    if (s === 'tpe' || s === 'card' || s === 'carte' || s === 'contactless' || s === 'cb') return 'tpe';
    if (s === 'ticket_restaurant' || s === 'voucher' || s === 'ticket restaurant') return 'ticket_restaurant';
    return s;
  };

  const filteredSales = sales.filter(s => {
    const saleTime = new Date(s.createdAt).getTime();

    // Date filter
    if (dateFilter === 'today' && saleTime < startOfToday) return false;
    if (dateFilter === 'yesterday' && (saleTime < startOfYesterday || saleTime >= startOfToday)) return false;
    if (dateFilter === '7d' && saleTime < sevenDaysAgo) return false;
    if (dateFilter === '30d' && saleTime < thirtyDaysAgo) return false;

    // Method filter
    if (methodFilter !== 'all' && normalizeMethod(s.paymentMethod) !== methodFilter) return false;

    // Consumption filter
    if (consumptionFilter !== 'all' && (s.consumptionType || 'sur_place') !== consumptionFilter) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const num = s.saleNumber || '';
      const table = s.tableNumber || '';
      const cashier = s.cashierName || '';
      const itemsMatch = (s.itemsSummary || []).some(
        i => (i.productName || (i as any).name || '').toLowerCase().includes(q) || (i.variant || '').toLowerCase().includes(q)
      );
      if (!num.toLowerCase().includes(q) && !table.toLowerCase().includes(q) && !cashier.toLowerCase().includes(q) && !itemsMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics for the active filter view
  const activeValidSales = filteredSales.filter(s => !s.cancelled);
  const totalAmount = activeValidSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalTickets = activeValidSales.reduce((sum, s) => sum + (s.ticketCount || 1), 0);
  const averageTicket = totalTickets > 0 ? totalAmount / totalTickets : 0;
  const totalCash = activeValidSales.filter(s => normalizeMethod(s.paymentMethod) === 'especes').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalTpe = activeValidSales.filter(s => normalizeMethod(s.paymentMethod) === 'tpe').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalVoucher = activeValidSales.filter(s => normalizeMethod(s.paymentMethod) === 'ticket_restaurant').reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  // Open Edit Modal
  const handleOpenEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditReason('');
    setEditLines(
      JSON.parse(
        JSON.stringify(
          (sale.itemsSummary || []).map(i => ({
            productId: i.productId,
            productName: i.productName || (i as any).name || 'Article',
            variant: i.variant || '',
            unitPrice: i.unitPrice || 0,
            quantity: i.quantity || 1,
            tvaRate: i.tvaRate || 7,
            total: i.total || (i.unitPrice || 0) * (i.quantity || 1)
          }))
        )
      )
    );
    setEditPaymentMethod(normalizeMethod(sale.paymentMethod) as PaymentMethod);
    setEditConsumptionType(sale.consumptionType || 'sur_place');
    setEditTicketCount(sale.ticketCount || 1);
    setEditDiscount(sale.discount || 0);
    setEditTableNumber(sale.tableNumber || '');
    setEditDate(sale.createdAt ? new Date(sale.createdAt).toISOString().slice(0, 16) : '');
  };

  // Submit Edit / Correction
  const handleSaveEdit = async () => {
    if (!editingSale) return;
    if (!editReason.trim()) {
      showRouteNotification('Le motif de modification est obligatoire pour assurer la traçabilité.', 'warning');
      return;
    }
    if (editLines.length === 0 || editLines.some(l => !l.productName.trim() || l.unitPrice <= 0)) {
      showRouteNotification('Veuillez renseigner des articles et prix valides pour toutes les lignes.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await api.updateSale(
        editingSale.id,
        {
          items: editLines,
          discount: editDiscount,
          paymentMethod: editPaymentMethod,
          consumptionType: editConsumptionType,
          ticketCount: editTicketCount,
          tableNumber: editTableNumber,
          createdAt: editDate ? new Date(editDate).toISOString() : undefined
        },
        editReason,
        currentUser?.name || 'Administrateur'
      );

      showRouteNotification(`Vente #${editingSale.saleNumber} corrigée avec succès.`, 'success');
      setEditingSale(null);
      await loadSales();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      showRouteNotification(`Erreur de modification : ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Cancellation
  const handleCancelSale = async () => {
    if (!cancellingSale) return;
    if (!cancelReason.trim()) {
      showRouteNotification('Veuillez préciser le motif d\'annulation de la vente.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await api.cancelSale(cancellingSale.id, cancelReason, currentUser?.name || 'Administrateur');
      showRouteNotification(`Vente #${cancellingSale.saleNumber} marquée comme annulée.`, 'success');
      setCancellingSale(null);
      await loadSales();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      showRouteNotification(`Erreur lors de l'annulation : ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderPaymentBadge = (method: string) => {
    const norm = normalizeMethod(method);
    switch (norm) {
      case 'especes':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Banknote className="w-3 h-3" />
            <span>Espèces</span>
          </span>
        );
      case 'tpe':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <CreditCard className="w-3 h-3" />
            <span>TPE (CB)</span>
          </span>
        );
      case 'ticket_restaurant':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Percent className="w-3 h-3" />
            <span>Ticket resto</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-300 text-[10px] font-bold w-fit">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* 1. KPI Header Bar */}
      <div className="p-4 bg-white border-b border-[#D9DDD8] grid grid-cols-2 sm:grid-cols-4 gap-3 shadow-2xs">
        <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
          <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
            Chiffre d'Affaires
          </span>
          <span className="text-xl font-serif font-black text-[#252A27]">
            {totalAmount.toFixed(3)} DT
          </span>
        </div>

        <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
          <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
            Tickets Encaissés
          </span>
          <span className="text-xl font-serif font-black text-[#252A27]">
            {totalTickets}
          </span>
        </div>

        <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
          <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
            Panier Moyen
          </span>
          <span className="text-xl font-serif font-black text-[#252A27]">
            {averageTicket.toFixed(3)} DT
          </span>
        </div>

        <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8]">
          <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
            Espèces &bull; TPE &bull; Tickets
          </span>
          <span className="text-xs font-bold text-[#252A27] block mt-1">
            Esp: {totalCash.toFixed(3)} &bull; TPE: {totalTpe.toFixed(3)} &bull; TR: {totalVoucher.toFixed(3)} DT
          </span>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="p-3 bg-[#F2F3F0] border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher ticket, produit, caissier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D9DDD8] rounded-xl text-xs text-[#252A27] focus:outline-none focus:ring-2 focus:ring-[#A4DEC2]"
            />
          </div>

          {/* Date quick filter */}
          <div className="flex bg-white p-0.5 rounded-xl border border-[#D9DDD8]">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: 'all', label: 'Tout' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  dateFilter === d.id ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Payment Method filter */}
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:outline-none"
          >
            <option value="all">Tous règlements</option>
            <option value="especes">Espèces</option>
            <option value="tpe">TPE (Carte)</option>
            <option value="ticket_restaurant">Ticket restaurant</option>
          </select>

          {/* Consumption filter */}
          <select
            value={consumptionFilter}
            onChange={e => setConsumptionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:outline-none"
          >
            <option value="all">Tous types</option>
            <option value="sur_place">Sur place</option>
            <option value="a_emporter">À emporter</option>
          </select>
        </div>

        <button
          onClick={loadSales}
          className="p-2 rounded-xl bg-white border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA] shadow-2xs transition-colors"
          title="Actualiser la liste des ventes"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. Sales Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSales.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#555D58] space-y-2 py-16">
            <FileText className="w-10 h-10 text-[#555D58] opacity-50" />
            <p className="text-sm font-bold text-[#252A27]">Aucune vente enregistrée pour ces critères</p>
            <p className="text-xs text-[#555D58]">Effectuez une saisie manuelle ou un import Excel/CSV</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2F3F0] text-[#555D58] font-bold border-b border-[#D9DDD8]">
                <tr>
                  <th className="p-3">Ticket N°</th>
                  <th className="p-3">Date & Heure</th>
                  <th className="p-3">Articles & Variantes</th>
                  <th className="p-3 text-center">Tickets</th>
                  <th className="p-3">Consommation</th>
                  <th className="p-3">Règlement</th>
                  <th className="p-3">Opérateur</th>
                  <th className="p-3 text-right">Montant TTC</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEEA]">
                {filteredSales.map(sale => {
                  const hasEdits = sale.editHistory && sale.editHistory.length > 0;

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-[#F7F7F5] transition-colors ${
                        sale.cancelled ? 'bg-rose-50/40 text-rose-900 line-through opacity-60' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-[#252A27]">
                        <div className="flex items-center space-x-1.5">
                          <span>{sale.saleNumber}</span>
                          {hasEdits && (
                            <span
                              onClick={() => setSelectedSaleForHistory(sale)}
                              className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black cursor-pointer hover:bg-amber-200"
                              title={`${sale.editHistory?.length} modification(s) enregistrée(s)`}
                            >
                              Modifié
                            </span>
                          )}
                          {sale.cancelled && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black not-italic">
                              Annulée
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-[#555D58] whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="p-3 text-[#252A27] max-w-[240px]">
                        <div className="space-y-0.5">
                          {(sale.itemsSummary || []).slice(0, 2).map((item, idx) => (
                            <div key={idx} className="truncate">
                              <span className="font-bold">{item.quantity}x</span> {item.productName || (item as any).name}
                              {item.variant && <span className="text-[10px] text-[#555D58] ml-1">({item.variant})</span>}
                            </div>
                          ))}
                          {(sale.itemsSummary || []).length > 2 && (
                            <span className="text-[10px] text-[#555D58] italic block">
                              + {(sale.itemsSummary || []).length - 2} autre(s) article(s)...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-[#252A27]">
                        {sale.ticketCount || 1}
                      </td>

                      <td className="p-3">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#ECEEEA] text-[#252A27] text-[10px] font-bold">
                          {sale.consumptionType === 'a_emporter' ? (
                            <>
                              <ShoppingBag className="w-3 h-3 text-[#555D58]" />
                              <span>À emporter</span>
                            </>
                          ) : (
                            <>
                              <Utensils className="w-3 h-3 text-[#555D58]" />
                              <span>Sur place</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        {renderPaymentBadge(sale.paymentMethod)}
                      </td>

                      <td className="p-3 text-[#555D58] font-medium">
                        {sale.cashierName}
                      </td>

                      <td className="p-3 text-right font-serif font-black text-sm text-[#252A27] whitespace-nowrap">
                        {sale.totalAmount.toFixed(3)} DT
                      </td>

                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {/* Details */}
                        <button
                          onClick={() => setSelectedSaleForDetails(sale)}
                          className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                          title="Consulter le détail du ticket"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Thermal Receipt Print */}
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] hover:bg-[#343B37] transition-colors"
                          title="Imprimer ticket de caisse"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin Edit (Allowed unless cancelled) */}
                        {!sale.cancelled && (
                          <button
                            onClick={() => handleOpenEdit(sale)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors"
                            title="Corriger cette vente (Admin)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Revision History */}
                        {hasEdits && (
                          <button
                            onClick={() => setSelectedSaleForHistory(sale)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 transition-colors"
                            title="Voir l'historique des modifications"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel Sale (Marks as cancelled, never deleted) */}
                        {!sale.cancelled && (
                          <button
                            onClick={() => {
                              setCancellingSale(sale);
                              setCancelReason('');
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors"
                            title="Annuler la vente (avec motif)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: DETAILS DU TICKET */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#252A27]">
                  Détails du Ticket #{selectedSaleForDetails.saleNumber}
                </h3>
                <p className="text-[11px] text-[#555D58]">
                  {new Date(selectedSaleForDetails.createdAt).toLocaleString('fr-FR')} &bull; Par: {selectedSaleForDetails.cashierName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:bg-[#D9DDD8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] space-y-2.5 text-xs font-mono">
              <div className="pb-2 border-b border-[#ECEEEA] space-y-1">
                {(selectedSaleForDetails.itemsSummary || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <span>{item.quantity}x {item.productName || (item as any).name}</span>
                      {item.variant && <span className="text-[10px] text-[#555D58] block ml-2">↳ {item.variant}</span>}
                    </div>
                    <span className="font-bold">{item.total.toFixed(3)} DT</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#555D58]">
                  <span>Sous-total HT :</span>
                  <span>{selectedSaleForDetails.subtotal.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between text-[#555D58]">
                  <span>TVA :</span>
                  <span>{selectedSaleForDetails.totalTva.toFixed(3)} DT</span>
                </div>
                {selectedSaleForDetails.discount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Remise :</span>
                    <span>-{selectedSaleForDetails.discount.toFixed(3)} DT</span>
                  </div>
                )}
                <div className="flex justify-between font-serif font-black text-base text-[#252A27] pt-2 border-t border-[#D9DDD8]">
                  <span>TOTAL TTC :</span>
                  <span>{selectedSaleForDetails.totalAmount.toFixed(3)} DT</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#ECEEEA] text-[11px] text-[#555D58] space-y-1">
                <div className="flex justify-between">
                  <span>Mode de paiement :</span>
                  <span className="font-bold text-[#252A27] uppercase">{selectedSaleForDetails.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type de consommation :</span>
                  <span className="font-bold text-[#252A27]">
                    {selectedSaleForDetails.consumptionType === 'a_emporter' ? 'À emporter' : 'Sur place'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nombre de tickets :</span>
                  <span className="font-bold text-[#252A27]">{selectedSaleForDetails.ticketCount || 1}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  setSelectedSaleForReceipt(selectedSaleForDetails);
                  setSelectedSaleForDetails(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#252A27] text-[#A4DEC2] text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer ticket</span>
              </button>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="px-4 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: CORRECTION ADMINISTRATIVE D'UNE VENTE */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full shadow-2xl border-2 border-amber-400 animate-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-serif font-black text-base text-[#252A27] flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span>Correction Administrative &bull; Vente #{editingSale.saleNumber}</span>
                </h3>
                <p className="text-xs text-[#555D58]">
                  Toute modification sera tracée et horodatée dans l'historique immuable
                </p>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#555D58]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mandatory Reason Input */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1">
              <label className="text-xs font-bold text-amber-900 block">
                Motif obligatoire de la correction / rectification :
              </label>
              <input
                type="text"
                placeholder="Ex: Erreur de frappe caissier, ajustement quantité, changement mode de paiement..."
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-[#252A27] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Editable items */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#252A27]">Lignes d'articles :</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditLines([
                      ...editLines,
                      { productName: '', variant: '', unitPrice: 0, quantity: 1, tvaRate: 7, total: 0 }
                    ])
                  }
                  className="text-xs text-[#252A27] font-bold flex items-center space-x-1 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un article</span>
                </button>
              </div>

              <div className="space-y-2">
                {editLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F7F7F5] border border-[#D9DDD8] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Nom article"
                        value={line.productName}
                        onChange={e => {
                          const upd = [...editLines];
                          upd[idx].productName = e.target.value;
                          setEditLines(upd);
                        }}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <input
                        type="text"
                        placeholder="Variante"
                        value={line.variant || ''}
                        onChange={e => {
                          const upd = [...editLines];
                          upd[idx].variant = e.target.value;
                          setEditLines(upd);
                        }}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-[#252A27]"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={line.quantity}
                        onChange={e => {
                          const upd = [...editLines];
                          const q = Math.max(1, parseInt(e.target.value) || 1);
                          upd[idx].quantity = q;
                          upd[idx].total = Number((q * upd[idx].unitPrice).toFixed(3));
                          setEditLines(upd);
                        }}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-center font-bold text-[#252A27]"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2 flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Prix"
                        value={line.unitPrice || ''}
                        onChange={e => {
                          const upd = [...editLines];
                          const p = Math.max(0, parseFloat(e.target.value) || 0);
                          upd[idx].unitPrice = p;
                          upd[idx].total = Number((upd[idx].quantity * p).toFixed(3));
                          setEditLines(upd);
                        }}
                        className="w-full p-1.5 bg-white border border-[#D9DDD8] rounded-lg text-right font-bold text-[#252A27]"
                      />
                      {editLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditLines(editLines.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-700 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#ECEEEA]">
              <div>
                <label className="font-bold text-[#555D58] block mb-1">Mode de paiement :</label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                >
                  <option value="especes">Espèces</option>
                  <option value="tpe">TPE (Carte)</option>
                  <option value="ticket_restaurant">Ticket restaurant</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#555D58] block mb-1">Consommation :</label>
                <select
                  value={editConsumptionType}
                  onChange={e => setEditConsumptionType(e.target.value as ConsumptionType)}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-bold text-[#252A27]"
                >
                  <option value="sur_place">Sur place</option>
                  <option value="a_emporter">À emporter</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#555D58] block mb-1">Nombre de tickets :</label>
                <input
                  type="number"
                  min="1"
                  value={editTicketCount}
                  onChange={e => setEditTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-bold text-center text-[#252A27]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-3 border-t border-[#D9DDD8]">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-black transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{actionLoading ? 'Enregistrement...' : 'Valider la Correction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: HISTORIQUE DES REVISIONS D'UN TICKET */}
      {selectedSaleForHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#252A27] flex items-center space-x-2">
                  <History className="w-4 h-4 text-indigo-700" />
                  <span>Traçabilité & Historique &bull; Vente #{selectedSaleForHistory.saleNumber}</span>
                </h3>
                <p className="text-xs text-[#555D58]">
                  Journal immuable de toutes les modifications apportées à cette vente
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleForHistory(null)}
                className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#555D58]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {(!selectedSaleForHistory.editHistory || selectedSaleForHistory.editHistory.length === 0) ? (
                <div className="p-4 bg-white rounded-xl border border-[#D9DDD8] text-center text-[#555D58]">
                  Aucune modification apportée à cette vente depuis sa création initiale.
                </div>
              ) : (
                selectedSaleForHistory.editHistory.map((rec, i) => (
                  <div key={rec.id || i} className="p-3 bg-white rounded-xl border border-[#D9DDD8] space-y-2">
                    <div className="flex justify-between items-center pb-1 border-b border-[#ECEEEA]">
                      <span className="font-bold text-indigo-900">Modification #{i + 1}</span>
                      <span className="text-[10px] text-[#555D58]">
                        {new Date(rec.modifiedAt).toLocaleString('fr-FR')} par <strong>{rec.modifiedBy}</strong>
                      </span>
                    </div>

                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                      <strong>Motif :</strong> {rec.reason}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded bg-rose-50 border border-rose-200">
                        <span className="font-bold text-rose-900 block mb-0.5">Avant :</span>
                        <p>Total : {rec.previousSnapshot.totalAmount.toFixed(3)} DT</p>
                        <p>Règlement : {rec.previousSnapshot.paymentMethod}</p>
                        <p>Tickets : {rec.previousSnapshot.ticketCount || 1}</p>
                      </div>

                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                        <span className="font-bold text-emerald-900 block mb-0.5">Après :</span>
                        <p>Total : {rec.newSnapshot.totalAmount.toFixed(3)} DT</p>
                        <p>Règlement : {rec.newSnapshot.paymentMethod}</p>
                        <p>Tickets : {rec.newSnapshot.ticketCount || 1}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedSaleForHistory(null)}
              className="w-full py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* 7. MODAL: ANNULATION DE VENTE AVEC MOTIF (NON-SUPPRIMÉE) */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border-2 border-rose-400 animate-in zoom-in-95 duration-150 space-y-4">
            <h3 className="font-serif font-black text-sm text-rose-900">
              Annuler la Vente #{cancellingSale.saleNumber}
            </h3>
            <p className="text-xs text-[#555D58]">
              Montant : <strong>{cancellingSale.totalAmount.toFixed(3)} DT</strong>. Conformément aux règles, la vente sera marquée comme annulée et restera tracée sans être supprimée.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#252A27]">Motif d'annulation obligatoire :</label>
              <input
                type="text"
                placeholder="Ex: Erreur de saisie, doublon, remboursement client..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-xl text-xs font-bold text-[#252A27] focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingSale(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCancelSale}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black transition-all shadow-xs"
              >
                {actionLoading ? 'Annulation...' : 'Confirmer l\'Annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
      />
    </div>
  );
};
