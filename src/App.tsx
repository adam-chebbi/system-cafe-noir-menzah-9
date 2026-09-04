import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SystemProvider, useSystem } from './context/SystemContext';
import { QuickAccessLauncher } from './components/layout/QuickAccessLauncher';
import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { ProductsView } from './components/catalog/ProductsView';
import { StockView } from './components/stock/StockView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { HRView } from './components/hr/HRView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { JournalView } from './components/journal/JournalView';
import { PublicWebsiteView } from './components/public/PublicWebsiteView';

import { AppHeader } from './components/layout/AppHeader';

import {
  X,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';

const AppContent: React.FC = () => {
  useAuth();
  const {
    currentView,
    setCurrentView,
    navigateTo,
    routeNotification,
    clearRouteNotification
  } = useSystem();

  // If customer is viewing the public website or QR order flow
  if (currentView === 'public_website' as any) {
    return (
      <PublicWebsiteView
        onOpenStaffApp={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#252A27] font-sans flex flex-col selection:bg-[#252A27] selection:text-white">
      {/* Route Notification Toast (e.g. invalid ID or deep-link warning) */}
      {routeNotification && (
        <div className="fixed top-14 right-4 z-50 animate-in slide-in-from-top-2 duration-200">
          <div
            className={`p-3 rounded-xl shadow-xl border flex items-center space-x-2.5 text-xs max-w-md ${
              routeNotification.type === 'error' || routeNotification.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : routeNotification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}
          >
            {routeNotification.type === 'error' || routeNotification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            ) : routeNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0" />
            )}
            <span className="font-medium flex-1">{routeNotification.message}</span>
            <button
              onClick={clearRouteNotification}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Application Header: Context-Aware, Sticky, Tablet-Optimized */}
      <AppHeader />

      {/* Navigation Rapide Quick-Access Launcher: ALWAYS available */}
      <QuickAccessLauncher />

      {/* Main View Router */}
      <main className="flex-1 overflow-x-hidden">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'pos' && <POSView />}
        {(currentView === 'products' ||
          currentView === 'categories' ||
          currentView === 'ingredients' ||
          currentView === 'recipes' ||
          currentView === 'csv_import') && <ProductsView />}
        {(currentView === 'stock' ||
          currentView === 'stock_movements' ||
          currentView === 'stock_wastes' ||
          currentView === 'inventory_audit') && <StockView />}
        {(currentView === 'suppliers' ||
          currentView === 'purchase_orders' ||
          currentView === 'supplier_invoices' ||
          currentView === 'ocr_invoice') && <SuppliersView />}
        {(currentView === 'hr' ||
          currentView === 'employees' ||
          currentView === 'attendance' ||
          currentView === 'planning') && <HRView />}
        {currentView === 'expenses' && <ExpensesView />}
        {currentView === 'reports' && <ReportsView />}
        {(currentView === 'journal' || currentView === 'alerts') && <JournalView />}
      </main>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SystemProvider>
        <AppContent />
      </SystemProvider>
    </AuthProvider>
  );
}
