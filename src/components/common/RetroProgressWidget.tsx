import React, { useEffect, useState } from 'react';
import { History, FileText, Receipt, ShoppingCart, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { useSystem } from '../../context/SystemContext';

interface RetroStats {
  invoicesCount: number;
  expensesCount: number;
  salesCount: number;
  payrollsCount: number;
  total: number;
}

export const RetroProgressWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { navigateTo } = useSystem();
  const [stats, setStats] = useState<RetroStats>({
    invoicesCount: 0,
    expensesCount: 0,
    salesCount: 0,
    payrollsCount: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [invoices, expenses, sales, payrolls] = await Promise.all([
          api.getSupplierInvoices().catch(() => []),
          api.getExpenses().catch(() => []),
          api.getSales().catch(() => []),
          api.getPayroll().catch(() => []),
        ]);

        const invRetro = invoices.filter((i: any) => i.isRetroactive).length;
        const expRetro = expenses.filter((e: any) => e.isRetroactive).length;
        const salRetro = sales.filter((s: any) => s.isRetroactive || s.source === 'retroactive').length;
        const payRetro = payrolls.filter((p: any) => p.isRetroactive).length;

        setStats({
          invoicesCount: invRetro,
          expensesCount: expRetro,
          salesCount: salRetro,
          payrollsCount: payRetro,
          total: invRetro + expRetro + salRetro + payRetro,
        });
      } catch (err) {
        console.error('Failed to load retro stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (compact) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        <History className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="font-bold">{stats.total}</span>
        <span className="text-[11px] text-amber-800">docs historiques saisis</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200/80 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
            <History className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">
              Rattrapage & Coexistence Ancien Système
            </h4>
            <p className="text-[10px] text-[#555D58]">
              Reprise progressive des factures, tickets et pièces papier
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300/80 text-amber-900 font-mono font-bold text-xs">
          {stats.total} {stats.total <= 1 ? 'document' : 'documents'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => navigateTo('suppliers', { subTab: 'invoices', action: 'retro-invoice' })}
          className="p-2.5 rounded-xl bg-white border border-amber-200/70 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#555D58] mb-1">
            <span className="text-[10px] font-bold uppercase">Factures</span>
            <FileText className="w-3 h-3 text-amber-700" />
          </div>
          <p className="font-mono font-bold text-sm text-[#252A27]">{stats.invoicesCount}</p>
          <span className="text-[9px] text-amber-800 font-semibold group-hover:underline flex items-center mt-1">
            Saisir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigateTo('expenses', { action: 'retro-expense' })}
          className="p-2.5 rounded-xl bg-white border border-amber-200/70 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#555D58] mb-1">
            <span className="text-[10px] font-bold uppercase">Dépenses</span>
            <Receipt className="w-3 h-3 text-amber-700" />
          </div>
          <p className="font-mono font-bold text-sm text-[#252A27]">{stats.expensesCount}</p>
          <span className="text-[9px] text-amber-800 font-semibold group-hover:underline flex items-center mt-1">
            Saisir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigateTo('reports', { subTab: 'sales', action: 'retro-sale' })}
          className="p-2.5 rounded-xl bg-white border border-amber-200/70 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#555D58] mb-1">
            <span className="text-[10px] font-bold uppercase">Ventes/Tickets</span>
            <ShoppingCart className="w-3 h-3 text-amber-700" />
          </div>
          <p className="font-mono font-bold text-sm text-[#252A27]">{stats.salesCount}</p>
          <span className="text-[9px] text-amber-800 font-semibold group-hover:underline flex items-center mt-1">
            Saisir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </span>
        </button>

        <button
          onClick={() => navigateTo('hr', { subTab: 'payroll', action: 'retro-payroll' })}
          className="p-2.5 rounded-xl bg-white border border-amber-200/70 hover:border-amber-400 text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-[#555D58] mb-1">
            <span className="text-[10px] font-bold uppercase">Paies</span>
            <Users className="w-3 h-3 text-amber-700" />
          </div>
          <p className="font-mono font-bold text-sm text-[#252A27]">{stats.payrollsCount}</p>
          <span className="text-[9px] text-amber-800 font-semibold group-hover:underline flex items-center mt-1">
            Saisir <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[10px] text-amber-900">
        <span className="flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Saisie manuelle permanente &bull; N'altère pas les flux temps réel</span>
        </span>
      </div>
    </div>
  );
};
