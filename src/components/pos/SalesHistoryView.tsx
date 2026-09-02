import React, { useState, useEffect, useRef } from 'react';
import { Sale, User } from '../../types';
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
  Smartphone,
  Tag,
  Percent,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  FileText
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
  const { currentRecordId, setCurrentRecordId, showRouteNotification } = useSystem();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const hasValidatedIdRef = useRef(false);

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

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
          setSelectedSaleForReceipt(found);
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

  // Filter sales
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const filteredSales = sales.filter(s => {
    const saleTime = new Date(s.createdAt).getTime();

    // Date filter
    if (dateFilter === 'today' && saleTime < startOfToday) return false;
    if (dateFilter === '7d' && saleTime < sevenDaysAgo) return false;
    if (dateFilter === '30d' && saleTime < thirtyDaysAgo) return false;

    // Method filter
    if (methodFilter !== 'all' && s.paymentMethod !== methodFilter) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const num = s.saleNumber || '';
      const table = s.tableNumber || '';
      const cashier = s.cashierName || '';
      const itemsMatch = (s.itemsSummary || []).some(i => (i.name || '').toLowerCase().includes(q));
      if (!num.toLowerCase().includes(q) && !table.toLowerCase().includes(q) && !cashier.toLowerCase().includes(q) && !itemsMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate stats
  const validSales = filteredSales.filter(s => !s.cancelled);
  const totalAmount = validSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCount = validSales.length;
  const averageTicket = totalCount > 0 ? totalAmount / totalCount : 0;
  const totalCash = validSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCard = validSales.filter(s => ['card', 'contactless'].includes(s.paymentMethod)).reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const handleCancelSale = async () => {
    if (!cancellingSale) return;
    setActionLoading(true);
    try {
      await api.cancelSale(cancellingSale.id, cancelReason || 'Annulation en caisse', currentUser?.name || 'Admin');
      showRouteNotification(`Vente #${cancellingSale.saleNumber} annulée`, 'success');
      await loadSales();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      showRouteNotification(`Erreur lors de l'annulation: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Banknote className="w-3 h-3" />
            <span>Espèces</span>
          </span>
        );
      case 'card':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <CreditCard className="w-3 h-3" />
            <span>Carte (CB)</span>
          </span>
        );
      case 'contactless':
        return (
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Smartphone className="w-3 h-3" />
            <span>Sans Contact</span>
          </span>
        );
      case 'qr_pay':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Tag className="w-3 h-3" />
            <span>QR Pay</span>
          </span>
        );
      case 'voucher':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center space-x-1 w-fit">
            <Percent className="w-3 h-3" />
            <span>Titre Resto</span>
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
      {/* KPI Header Bar */}
      <div className="p-4 bg-white border-b border-[#D9DDD8] grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            Nombre de Ventes
          </span>
          <span className="text-xl font-serif font-black text-[#252A27]">
            {totalCount}
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
            CB vs Espèces
          </span>
          <span className="text-xs font-bold text-[#252A27] block mt-1">
            CB: {totalCard.toFixed(3)} DT &bull; Esp: {totalCash.toFixed(3)} DT
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-[#F2F3F0] border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher ticket, table, caissier..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
            />
          </div>

          <div className="flex bg-white p-0.5 rounded-lg border border-[#D9DDD8]">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: 'all', label: 'Tout' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  dateFilter === d.id ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
          >
            <option value="all">Tous paiements</option>
            <option value="card">Carte Bancaire</option>
            <option value="cash">Espèces</option>
            <option value="contactless">Sans Contact</option>
            <option value="voucher">Ticket Resto</option>
            <option value="qr_pay">QR Pay</option>
          </select>
        </div>

        <button
          onClick={loadSales}
          className="p-2 rounded-lg bg-white border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA]"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sales Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSales.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#555D58] space-y-2 py-16">
            <FileText className="w-10 h-10 text-[#555D58]" />
            <p className="text-sm font-bold text-[#252A27]">Aucune vente trouvée</p>
            <p className="text-xs text-[#555D58]">Modifiez vos filtres ou effectuez un encaissement</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#D9DDD8] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2F3F0] text-[#555D58] font-bold border-b border-[#D9DDD8]">
                <tr>
                  <th className="p-3">Ticket N°</th>
                  <th className="p-3">Date & Heure</th>
                  <th className="p-3">Table / Origine</th>
                  <th className="p-3">Articles</th>
                  <th className="p-3">Règlement</th>
                  <th className="p-3">Caissier</th>
                  <th className="p-3 text-right">Total TTC</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEEA]">
                {filteredSales.map(sale => (
                  <tr
                    key={sale.id}
                    className={`hover:bg-[#F7F7F5] transition-colors ${
                      sale.cancelled ? 'opacity-50 bg-rose-50/40 line-through' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-[#252A27]">
                      {sale.saleNumber}
                    </td>
                    <td className="p-3 text-[#555D58]">
                      {new Date(sale.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3 font-medium text-[#252A27]">
                      {sale.tableNumber || 'À emporter'}
                    </td>
                    <td className="p-3 text-[#555D58] max-w-[200px] truncate">
                      {(sale.itemsSummary || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="p-3">
                      {renderPaymentBadge(sale.paymentMethod)}
                    </td>
                    <td className="p-3 text-[#555D58] font-medium">
                      {sale.cashierName}
                    </td>
                    <td className="p-3 text-right font-serif font-black text-sm text-[#252A27]">
                      {sale.totalAmount.toFixed(3)} DT
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <CopyLinkButton
                        view="pos"
                        subTab="history"
                        id={sale.id}
                        iconOnly
                      />
                      <button
                        onClick={() => setSelectedSaleForDetails(sale)}
                        className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                        title="Voir détails du ticket"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedSaleForReceipt(sale)}
                        className="p-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] hover:bg-[#343B37] transition-colors"
                        title="Imprimer ticket thermique"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {!sale.cancelled && (
                        <button
                          onClick={() => setCancellingSale(sale)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                          title="Annuler / Rembourser la vente"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">Détails du Ticket {selectedSaleForDetails.saleNumber}</h3>
                <p className="text-[11px] text-[#555D58]">{new Date(selectedSaleForDetails.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3">
              <div className="bg-[#F7F7F5] p-3 rounded-xl border border-[#D9DDD8] space-y-1.5 text-xs">
                {(selectedSaleForDetails.itemsSummary || []).map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.quantity}x {item.name} {item.unitPrice ? `(${item.unitPrice.toFixed(3)} DT)` : ''}</span>
                    <span className="font-bold">{item.total.toFixed(3)} DT</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-[#D9DDD8] space-y-1">
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
                  <div className="flex justify-between font-bold text-sm text-[#252A27] pt-1 border-t border-[#D9DDD8]">
                    <span>TOTAL TTC :</span>
                    <span>{selectedSaleForDetails.totalAmount.toFixed(3)} DT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-[#D9DDD8]">
              <button
                onClick={() => {
                  setSelectedSaleForReceipt(selectedSaleForDetails);
                  setSelectedSaleForDetails(null);
                }}
                className="flex-1 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer le ticket</span>
              </button>
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="px-4 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SALE MODAL */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-rose-900 mb-1">
              Annuler / Rembourser la Vente N° {cancellingSale.saleNumber}
            </h3>
            <p className="text-xs text-[#555D58] mb-3">
              Montant : {cancellingSale.totalAmount.toFixed(3)} DT &bull; Mode : {cancellingSale.paymentMethod}
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-[#252A27]">Motif d'annulation :</label>
              <input
                type="text"
                placeholder="Ex: Erreur de frappe, remboursement client..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setCancellingSale(null)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCancelSale}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors"
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
