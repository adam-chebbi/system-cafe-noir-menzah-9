import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Product,
  Category,
  Table,
  Order,
  Sale,
  User
} from '../../types';
import { POSTactileScreen } from './POSTactileScreen';
import { ActiveOrdersManager } from './ActiveOrdersManager';
import { ManualSaleEntry } from './ManualSaleEntry';
import { SalesHistoryView } from './SalesHistoryView';
import { CashRegisterManager } from './CashRegisterManager';
import { QROrdersModal } from './QROrdersModal';
import {
  Calculator,
  Clock,
  FileSpreadsheet,
  History,
  Lock,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  Bell,
  RefreshCw,
  Plus
} from 'lucide-react';

export const POSView: React.FC = () => {
  const {
    refreshAlerts,
    activeRegister,
    refreshRegister,
    globalVersion,
    currentSubTab,
    setCurrentSubTab,
    currentAction
  } = useSystem();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'pos' | 'active_orders' | 'manual' | 'history' | 'register'>('pos');

  // Shared application state
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Cart order pre-load
  const [orderToEditInPOS, setOrderToEditInPOS] = useState<Order | null>(null);

  // QR Modal
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentSubTab === 'pos') setActiveTab('pos');
    else if (currentSubTab === 'active_orders' || currentSubTab === 'orders') setActiveTab('active_orders');
    else if (currentSubTab === 'manual') setActiveTab('manual');
    else if (currentSubTab === 'history') setActiveTab('history');
    else if (currentSubTab === 'register') setActiveTab('register');

    if (currentAction === 'qr_modal') setIsQRModalOpen(true);
  }, [currentSubTab, currentAction]);

  const loadData = async () => {
    try {
      const [cats, prods, tbls, ords, usrs] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getTables(),
        api.getOrders(),
        api.getUsers()
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setTables(Array.isArray(tbls) ? tbls : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalVersion]);

  // Polling for live orders (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ords = await api.getOrders();
        setOrders(Array.isArray(ords) ? ords : []);
      } catch (e) {
        // silent
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = orders.filter(o =>
    o && ['accepted', 'preparing', 'ready', 'served'].includes(o.status)
  );

  const pendingQROrders = orders.filter(o =>
    o && o.status === 'pending_approval' && o.source === 'qr_table'
  );

  const handleOrderLaunched = async (newOrUpdatedOrder: Order) => {
    await loadData();
    refreshAlerts();
  };

  const handleOrderPaid = async (sale: Sale) => {
    await loadData();
    refreshRegister();
    refreshAlerts();
  };

  const handleLoadOrderIntoPOS = (order: Order) => {
    setOrderToEditInPOS(order);
    setActiveTab('pos');
    setCurrentSubTab('pos');
  };

  const handleAcceptQROrder = async (orderId: string) => {
    await api.acceptOrder(orderId, currentUser?.name || 'Caissier');
    await loadData();
    refreshAlerts();
  };

  const handleRejectQROrder = async (orderId: string, reason: string) => {
    await api.rejectOrder(orderId, reason, currentUser?.name || 'Caissier');
    await loadData();
    refreshAlerts();
  };

  return (
    <div className="h-[calc(100vh-3.25rem)] flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Top POS Navigation Bar */}
      <header className="px-4 py-2 bg-white border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-2 shadow-2xs z-20">
        {/* Navigation Tabs */}
        <div className="flex bg-[#ECEEEA] p-0.5 rounded-xl border border-[#D9DDD8] overflow-x-auto no-scrollbar">
          <button
            id="tab-pos-touch"
            onClick={() => {
              setActiveTab('pos');
              setCurrentSubTab('pos');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Caisse Tactile</span>
          </button>

          <button
            id="tab-pos-active-orders"
            onClick={() => {
              setActiveTab('active_orders');
              setCurrentSubTab('active_orders');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'active_orders'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Commandes En Cours</span>
            {activeOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {activeOrders.length}
              </span>
            )}
          </button>

          <button
            id="tab-pos-manual"
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
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Saisie Manuelle</span>
          </button>

          <button
            id="tab-pos-history"
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
            <span>Historique Ventes</span>
          </button>

          <button
            id="tab-pos-register"
            onClick={() => {
              setActiveTab('register');
              setCurrentSubTab('register');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-[#252A27] text-[#A4DEC2] shadow-2xs'
                : 'text-[#555D58] hover:text-[#252A27]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Session & Clôture Z</span>
          </button>
        </div>

        {/* Right Status Actions (QR Notifications & Cash Register Pill) */}
        <div className="flex items-center space-x-2">
          {/* QR Incoming Orders Notification Badge */}
          {pendingQROrders.length > 0 && (
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold animate-bounce shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{pendingQROrders.length} Commande(s) QR</span>
            </button>
          )}

          {/* Cash Register Session Pill */}
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
              activeRegister
                ? 'bg-[#F7F7F5] text-[#252A27] border-[#D9DDD8] hover:bg-[#ECEEEA]'
                : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {activeRegister
                ? `Caisse Active (${activeRegister.totalSalesAmount.toFixed(3)} DT)`
                : 'Caisse Fermée'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'pos' && (
          <POSTactileScreen
            categories={categories}
            products={products}
            tables={tables}
            activeOrders={activeOrders}
            currentUser={currentUser}
            onOrderLaunched={handleOrderLaunched}
            onOrderPaid={handleOrderPaid}
            loadedOrder={orderToEditInPOS}
            onClearLoadedOrder={() => setOrderToEditInPOS(null)}
          />
        )}

        {activeTab === 'active_orders' && (
          <ActiveOrdersManager
            orders={orders}
            tables={tables}
            currentUser={currentUser}
            onRefresh={loadData}
            onLoadOrderIntoPOS={handleLoadOrderIntoPOS}
            onOrderPaid={handleOrderPaid}
          />
        )}

        {activeTab === 'manual' && (
          <ManualSaleEntry
            products={products}
            tables={tables}
            users={users}
            currentUser={currentUser}
            onSaleCreated={handleOrderPaid}
          />
        )}

        {activeTab === 'history' && (
          <SalesHistoryView
            currentUser={currentUser}
            onRefreshTrigger={loadData}
          />
        )}

        {activeTab === 'register' && (
          <CashRegisterManager
            activeRegister={activeRegister}
            currentUser={currentUser}
            onRefresh={async () => {
              await refreshRegister();
              await loadData();
            }}
          />
        )}
      </main>

      {/* QR Incoming Orders Modal */}
      <QROrdersModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        orders={orders}
        onAccept={handleAcceptQROrder}
        onReject={handleRejectQROrder}
      />
    </div>
  );
};
