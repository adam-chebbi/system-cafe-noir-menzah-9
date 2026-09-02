import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Product,
  Table,
  Sale,
  User
} from '../../types';
import { ManualSaleEntry } from './ManualSaleEntry';
import { SalesHistoryView } from './SalesHistoryView';
import { SalesExcelCsvImport } from './SalesExcelCsvImport';
import {
  Edit3,
  FileSpreadsheet,
  History,
  RefreshCw
} from 'lucide-react';

/**
 * Module Ventes (POSView)
 *
 * ⚠️ Ce module NE CONTIENT PAS de caisse tactile, ni de gestion de commandes
 * actives, ni de QR code. Il est strictement réservé à :
 *   1. Saisie Manuelle d'une vente
 *   2. Import Excel & CSV (en masse)
 *   3. Historique des Ventes avec correction admin et traçabilité
 */
export const POSView: React.FC = () => {
  const {
    refreshAlerts,
    globalVersion,
    currentSubTab,
    setCurrentSubTab
  } = useSystem();
  const { currentUser } = useAuth();

  // Active sub-tab: 'manual' | 'import' | 'history'
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'history'>('manual');

  // Shared data state
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with global sub-tab navigation
  useEffect(() => {
    if (currentSubTab === 'manual') setActiveTab('manual');
    else if (currentSubTab === 'import') setActiveTab('import');
    else if (currentSubTab === 'history') setActiveTab('history');
  }, [currentSubTab]);

  const loadData = async () => {
    try {
      const [prods, tbls, usrs] = await Promise.all([
        api.getProducts(),
        api.getTables(),
        api.getUsers()
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setTables(Array.isArray(tbls) ? tbls : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
    } catch (err) {
      console.error('Failed to load Ventes module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalVersion]);

  const handleSaleCreated = async (sale: Sale) => {
    // Refresh alerts after a new sale
    refreshAlerts();
    // Optionally switch to history
    // setActiveTab('history');
  };

  const handleImportCompleted = async () => {
    refreshAlerts();
    setActiveTab('history');
  };

  return (
    <div className="h-[calc(100vh-3.25rem)] flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Tab Navigation Header */}
      <header className="px-4 py-2.5 bg-white border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-2 shadow-2xs z-20">
        {/* Module Title */}
        <div className="hidden sm:flex items-center space-x-2 text-[#252A27]">
          <div className="w-7 h-7 rounded-lg bg-[#ECEEEA] flex items-center justify-center">
            <Edit3 className="w-4 h-4 text-[#252A27]" />
          </div>
          <div>
            <h2 className="text-xs font-serif font-black text-[#252A27] leading-none">Module Ventes</h2>
            <p className="text-[10px] text-[#555D58]">Saisie &bull; Import &bull; Historique</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#ECEEEA] p-0.5 rounded-xl border border-[#D9DDD8] overflow-x-auto no-scrollbar">
          {/* Saisie Manuelle */}
          <button
            id="tab-ventes-manual"
            onClick={() => {
              setActiveTab('manual');
              setCurrentSubTab('manual');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'manual'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Saisie Manuelle</span>
          </button>

          {/* Import Excel & CSV */}
          <button
            id="tab-ventes-import"
            onClick={() => {
              setActiveTab('import');
              setCurrentSubTab('import');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'import'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel &amp; CSV</span>
          </button>

          {/* Historique des Ventes */}
          <button
            id="tab-ventes-history"
            onClick={() => {
              setActiveTab('history');
              setCurrentSubTab('history');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique des Ventes</span>
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA] transition-colors shadow-2xs"
          title="Rafraîchir les données"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'manual' && (
          <ManualSaleEntry
            products={products}
            tables={tables}
            users={users}
            currentUser={currentUser}
            onSaleCreated={handleSaleCreated}
          />
        )}

        {activeTab === 'import' && (
          <SalesExcelCsvImport
            currentUser={currentUser}
            onImportCompleted={handleImportCompleted}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistoryView
            currentUser={currentUser}
            onRefreshTrigger={loadData}
          />
        )}
      </main>
    </div>
  );
};
