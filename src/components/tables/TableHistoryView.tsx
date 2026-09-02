import React, { useState, useEffect } from 'react';
import { Table, TableHistoryItem } from '../../types';
import { api } from '../../services/api';
import {
  Clock,
  Filter,
  Search,
  Coffee,
  Receipt,
  QrCode,
  Calendar,
  Move,
  Users,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';

interface TableHistoryViewProps {
  tables: Table[];
  initialSelectedTableId?: string | null;
}

export const TableHistoryView: React.FC<TableHistoryViewProps> = ({
  tables,
  initialSelectedTableId
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>(initialSelectedTableId || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [historyItems, setHistoryItems] = useState<TableHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getTableHistory(selectedTableId === 'all' ? undefined : selectedTableId);
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load table history:', err);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedTableId]);

  const safeTables = Array.isArray(tables) ? tables : [];
  const safeHistoryItems = Array.isArray(historyItems) ? historyItems : [];

  const tableMap = new Map(safeTables.map(t => [t.id, t]));

  // Filter items
  const filteredItems = safeHistoryItems.filter(item => {
    const matchesType = selectedType === 'all' || item.category === selectedType;
    const matchesSearch =
      (item.details && item.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.action && item.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tableNumber && item.tableNumber.includes(searchTerm));

    return matchesType && matchesSearch;
  });

  const getActionIcon = (category: TableHistoryItem['category']) => {
    switch (category) {
      case 'status_change':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'order':
        return <Coffee className="w-4 h-4 text-emerald-600" />;
      case 'qr_order':
        return <QrCode className="w-4 h-4 text-blue-600" />;
      case 'sale':
        return <Receipt className="w-4 h-4 text-purple-600" />;
      case 'reservation':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'movement':
      case 'transfer':
        return <Move className="w-4 h-4 text-[#555D58]" />;
      default:
        return <Clock className="w-4 h-4 text-[#555D58]" />;
    }
  };

  const getActionTypeLabel = (category: TableHistoryItem['category']) => {
    switch (category) {
      case 'status_change':
        return 'Changement de Statut';
      case 'order':
        return 'Commande POS Caisse';
      case 'qr_order':
        return 'Commande QR Client';
      case 'sale':
        return 'Encaissement & Vente';
      case 'reservation':
        return 'Réservation';
      case 'movement':
      case 'transfer':
        return 'Déplacement de Table';
      default:
        return 'Activité';
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDD8] shadow-xs p-4 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F7F7F5] p-3.5 rounded-xl border border-[#D9DDD8]">
        <div>
          <h3 className="font-bold text-sm text-[#252A27]">Historique & Traçabilité des Tables</h3>
          <p className="text-[11px] text-[#555D58] mt-0.5">
            Journal complet consolidé en temps réel : commandes POS, scans QR sans contact, réservations, encaissements et changements de statut.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-[#ECEEEA] hover:bg-[#E3E6E2] text-[#252A27] text-xs font-bold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Table Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-[#555D58]">Table :</label>
          <select
            value={selectedTableId}
            onChange={e => setSelectedTableId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs font-medium text-[#252A27] focus:outline-hidden"
          >
            <option value="all">Toutes les tables ({tables.length})</option>
            {tables.map(t => (
              <option key={t.id} value={t.id}>
                Table {t.number} ({t.name || 'Salle'})
              </option>
            ))}
          </select>
        </div>

        {/* Action Type Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-[#555D58]">Type d'action :</label>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#D9DDD8] bg-white text-xs font-medium text-[#252A27] focus:outline-hidden"
          >
            <option value="all">Toutes les activités</option>
            <option value="status_change">Changements de statut</option>
            <option value="order_created">Commandes POS</option>
            <option value="qr_order">Commandes QR sans contact</option>
            <option value="sale_completed">Encaissements / Ventes</option>
            <option value="reservation">Réservations</option>
            <option value="moved">Déplacements</option>
          </select>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filtrer par serveur, description, montant..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9DDD8] text-xs bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="py-12 text-center text-[#555D58] text-xs flex flex-col items-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#252A27]" />
          <span>Chargement du journal d'activité...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-[#555D58] text-xs bg-[#F7F7F5] rounded-xl border border-[#D9DDD8]">
          Aucun événement trouvé pour ces critères de recherche.
        </div>
      ) : (
        <div className="relative border-l-2 border-[#D9DDD8] ml-4 space-y-4 pl-5 pt-1">
          {filteredItems.map(item => {
            const dateObj = new Date(item.timestamp);
            const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const formattedDate = dateObj.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-9 top-1.5 w-7 h-7 rounded-full bg-white border-2 border-[#D9DDD8] flex items-center justify-center shadow-xs">
                  {getActionIcon(item.category)}
                </div>

                {/* Timeline Item Card */}
                <div className="bg-[#F7F7F5] hover:bg-white rounded-xl p-3.5 border border-[#D9DDD8] transition-all shadow-2xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#252A27] text-[#A4DEC2] text-[10px] font-extrabold tracking-wider">
                        TABLE {item.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-[#252A27]">
                        {getActionTypeLabel(item.category)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#555D58]">
                      <span>{formattedDate} à {formattedTime}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-[#252A27]">Par : {item.performedBy}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#252A27]">{item.details || item.action}</p>

                  {/* Optional amount or metadata */}
                  {item.amount !== undefined && (
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-extrabold text-xs">
                      Montant : {item.amount.toFixed(3)} DT
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
