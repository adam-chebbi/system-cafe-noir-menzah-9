import { db } from '../db/database.js';
import { AlertService } from './alertService.js';

export class ReportService {
  /**
   * Helper: Calculate start and end date ranges for current and previous period
   */
  private static getDateRanges(period: 'today' | 'yesterday' | 'week' | 'month' | 'specific_month' | 'custom', customStart?: string, customEnd?: string) {
    const now = new Date();
    let curStart: Date;
    let curEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;

    if (period === 'today') {
      curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      curEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStart = new Date(curStart.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(curEnd.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === 'yesterday') {
      curStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      curEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      prevStart = new Date(curStart.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(curEnd.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === 'week') {
      curStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      curEnd = new Date(now.getTime());
      prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      curStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      curEnd = new Date(now.getTime());
      // Previous month
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'specific_month') {
      // customStart carries "YYYY-MM" — used by the monthly report to compare a given calendar
      // month (past or in progress) against the calendar month immediately preceding it.
      const [yearStr, monthStr] = (customStart || '').split('-');
      const year = parseInt(yearStr, 10) || now.getFullYear();
      const monthIndex = (parseInt(monthStr, 10) || now.getMonth() + 1) - 1;
      curStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      const fullMonthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
      curEnd = fullMonthEnd.getTime() > now.getTime() ? now : fullMonthEnd;
      prevStart = new Date(year, monthIndex - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(year, monthIndex, 0, 23, 59, 59, 999);
    } else {
      // Custom
      curStart = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      curStart.setHours(0, 0, 0, 0);
      curEnd = customEnd ? new Date(customEnd) : new Date(now.getTime());
      curEnd.setHours(23, 59, 59, 999);
      const duration = curEnd.getTime() - curStart.getTime();
      prevStart = new Date(curStart.getTime() - duration);
      prevEnd = new Date(curStart.getTime() - 1);
    }

    return { curStart, curEnd, prevStart, prevEnd };
  }

  /**
   * Helper: Calculate percentage difference between current and previous
   */
  private static calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  /**
   * Get comprehensive dashboard analytics
   */
  public static getDashboardAnalytics(params?: {
    period?: 'today' | 'yesterday' | 'week' | 'month' | 'specific_month' | 'custom';
    startDate?: string;
    endDate?: string;
  }) {
    const period = params?.period || 'today';
    const { curStart, curEnd, prevStart, prevEnd } = this.getDateRanges(period, params?.startDate, params?.endDate);

    const sales = (db.get('sales') || []).filter((s: any) => !s.cancelled);
    const expenses = db.get('expenses') || [];
    const supplierInvoices = (db.get('supplierInvoices') || []).filter((inv: any) => !inv.cancelled);
    const ingredients = db.get('ingredients') || [];
    const personnelFinancialRecords = db.get('personnelFinancialRecords') || [];
    const recipes = db.get('recipes') || [];
    const products = db.get('products') || [];
    const categories = db.get('categories') || [];
    const wastes = db.get('stockWastes') || [];
    const inventoryAudits = db.get('inventoryAudits') || [];

    const now = new Date();
    const todayStartStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Chiffre d'affaires du jour et du mois
    const todaySales = sales.filter((s: any) => s.createdAt && s.createdAt >= todayStartStr);
    const totalRevenueToday = todaySales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const todayTicketsCount = todaySales.reduce((sum: number, s: any) => sum + (s.ticketCount || 1), 0);

    const monthSales = sales.filter((s: any) => s.createdAt && s.createdAt >= monthStartStr);
    const totalRevenueMonth = monthSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const monthTicketsCount = monthSales.reduce((sum: number, s: any) => sum + (s.ticketCount || 1), 0);

    // 2. Filtrer les ventes pour la période courante et précédente
    const curSales = sales.filter((s: any) => {
      const t = new Date(s.createdAt).getTime();
      return t >= curStart.getTime() && t <= curEnd.getTime();
    });

    const prevSales = sales.filter((s: any) => {
      const t = new Date(s.createdAt).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });

    // CA période & tickets
    const totalRevenue = curSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const prevTotalRevenue = prevSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const revenueDelta = this.calculateDelta(totalRevenue, prevTotalRevenue);

    const ticketsCount = curSales.reduce((sum: number, s: any) => sum + (s.ticketCount || 1), 0);
    const prevTicketsCount = prevSales.reduce((sum: number, s: any) => sum + (s.ticketCount || 1), 0);
    const ticketsDelta = this.calculateDelta(ticketsCount, prevTicketsCount);

    const avgTicket = ticketsCount > 0 ? Number((totalRevenue / ticketsCount).toFixed(3)) : 0;
    const prevAvgTicket = prevTicketsCount > 0 ? Number((prevTotalRevenue / prevTicketsCount).toFixed(3)) : 0;
    const avgTicketDelta = this.calculateDelta(avgTicket, prevAvgTicket);

    // 3. Achats (Factures fournisseurs sur la période)
    const curPurchases = supplierInvoices.filter((inv: any) => {
      const d = new Date(inv.invoiceDate || inv.createdAt).getTime();
      return d >= curStart.getTime() && d <= curEnd.getTime();
    });
    const prevPurchases = supplierInvoices.filter((inv: any) => {
      const d = new Date(inv.invoiceDate || inv.createdAt).getTime();
      return d >= prevStart.getTime() && d <= prevEnd.getTime();
    });
    const totalPurchases = curPurchases.reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.totalTTC || 0), 0);
    const prevTotalPurchases = prevPurchases.reduce((sum: number, inv: any) => sum + (inv.totalAmount || inv.totalTTC || 0), 0);
    const purchasesDelta = this.calculateDelta(totalPurchases, prevTotalPurchases);

    // 4. Dépenses d'exploitation
    const curExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date || e.createdAt).getTime();
      return d >= curStart.getTime() && d <= curEnd.getTime();
    });
    const prevExpenses = expenses.filter((e: any) => {
      const d = new Date(e.date || e.createdAt).getTime();
      return d >= prevStart.getTime() && d <= prevEnd.getTime();
    });
    const totalExpenses = curExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const prevTotalExpenses = prevExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const expensesDelta = this.calculateDelta(totalExpenses, prevTotalExpenses);

    // 5. Valeur du stock actuelle (Somme currentStock * costPerUnit)
    let stockValuation = 0;
    let lowStockCount = 0;
    for (const ing of ingredients) {
      const stock = Math.max(0, ing.currentStock || 0);
      const cost = ing.costPerUnit || 0;
      stockValuation += stock * cost;
      if (stock <= (ing.minStockThreshold || 0)) {
        lowStockCount++;
      }
    }

    // 6. Coût du personnel (suivi financier RH saisi manuellement sur la période)
    const periodFinancialRecords = personnelFinancialRecords.filter((r: any) => {
      const d = new Date(r.date).getTime();
      return d >= curStart.getTime() && d <= curEnd.getTime();
    });
    const totalStaffCost = periodFinancialRecords.reduce(
      (sum: number, r: any) => sum + (r.baseSalary || 0) + (r.advances || 0) + (r.bonuses || 0) - (r.deductions || 0),
      0
    );

    // 7. Marge estimée (Brute et Nette)
    const totalTva = curSales.reduce((sum: number, s: any) => sum + (s.totalTva || 0), 0);
    const netRevenueHT = Math.max(0, totalRevenue - totalTva);

    let totalCogs = 0;
    for (const sale of curSales) {
      const items = Array.isArray(sale.itemsSummary) ? sale.itemsSummary : [];
      for (const item of items) {
        if (!item) continue;
        const prod = products.find((p: any) => p && (p.id === item.productId || p.name === item.productName || p.name === item.name));
        if (prod) {
          const rec = recipes.find((r: any) => r && r.productId === prod.id);
          if (rec && rec.totalIngredientsCost) {
            totalCogs += rec.totalIngredientsCost * (item.quantity || 1);
          } else {
            // Default 22% food cost fallback
            totalCogs += (item.total || item.unitPrice * item.quantity || 0) * 0.22;
          }
        } else {
          totalCogs += (item.total || 0) * 0.22;
        }
      }
    }

    const curWastes = wastes.filter((w: any) => {
      const d = new Date(w.createdAt).getTime();
      return d >= curStart.getTime() && d <= curEnd.getTime();
    });
    const wasteCost = curWastes.reduce((sum: number, w: any) => sum + (w.estimatedCost || 0), 0);

    // 7bis. Écarts d'inventaire constatés sur la période (audits validés uniquement)
    const periodInventoryAudits = inventoryAudits.filter((a: any) => {
      if (a.status !== 'validated') return false;
      const d = new Date(a.validatedAt || a.date).getTime();
      return d >= curStart.getTime() && d <= curEnd.getTime();
    });
    const inventoryDiscrepancies = periodInventoryAudits.map((a: any) => ({
      auditNumber: a.auditNumber,
      date: a.date,
      totalDifferenceValue: Number(a.totalDifferenceValue.toFixed(3))
    }));
    const totalInventoryDiscrepancyValue = Number(
      periodInventoryAudits.reduce((sum: number, a: any) => sum + a.totalDifferenceValue, 0).toFixed(3)
    );

    const grossMargin = Math.max(0, netRevenueHT - totalCogs);
    const grossMarginPercentage = netRevenueHT > 0 ? Number(((grossMargin / netRevenueHT) * 100).toFixed(1)) : 0;
    const netOperatingProfit = Number((grossMargin - totalExpenses - totalStaffCost - wasteCost).toFixed(3));
    const netMarginPercentage = totalRevenue > 0 ? Number(((netOperatingProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // 8. Top & Flop produits par quantité, CA et Marge
    const productStatsMap: Record<string, {
      name: string;
      category?: string;
      quantity: number;
      revenue: number;
      cogs: number;
      margin: number;
    }> = {};

    // Initialize with known products
    for (const p of products) {
      const cat = categories.find((c: any) => c.id === p.categoryId);
      productStatsMap[p.name] = {
        name: p.name,
        category: cat ? cat.name : 'Autre',
        quantity: 0,
        revenue: 0,
        cogs: 0,
        margin: 0
      };
    }

    for (const sale of curSales) {
      const items = Array.isArray(sale.itemsSummary) ? sale.itemsSummary : [];
      for (const item of items) {
        if (!item) continue;
        const itemName = item.productName || item.name || 'Article';
        if (!productStatsMap[itemName]) {
          productStatsMap[itemName] = {
            name: itemName,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            margin: 0
          };
        }
        const qty = item.quantity || 1;
        const rev = item.total || (item.unitPrice || 0) * qty;

        const prod = products.find((p: any) => p && (p.name === itemName || p.id === item.productId));
        const rec = prod ? recipes.find((r: any) => r && r.productId === prod.id) : null;
        const unitCogs = rec?.totalIngredientsCost || (rev / qty) * 0.22;
        const lineCogs = unitCogs * qty;

        productStatsMap[itemName].quantity += qty;
        productStatsMap[itemName].revenue += rev;
        productStatsMap[itemName].cogs += lineCogs;
        productStatsMap[itemName].margin += (rev - lineCogs);
      }
    }

    const allProductStats = Object.values(productStatsMap);
    const activeSoldProducts = allProductStats.filter(p => p.quantity > 0);

    const topSellingProducts = [...activeSoldProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const flopSellingProducts = [...allProductStats].sort((a, b) => a.quantity - b.quantity).slice(0, 5);
    const topRevenueProducts = [...activeSoldProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topMarginProducts = [...activeSoldProducts].sort((a, b) => b.margin - a.margin).slice(0, 5);

    // 8bis. Produits à faible marge : marge réelle de la fiche technique sous l'objectif fixé par l'administrateur
    const recipesByProductId = new Map(recipes.map((r: any) => [r.productId, r]));
    const lowMarginProducts = products
      .filter((p: any) => p.available)
      .map((p: any) => {
        const recipe = recipesByProductId.get(p.id);
        if (!recipe || recipe.actualMarginPercentage === undefined) return null;
        return {
          name: p.name,
          targetMarginPercentage: recipe.targetMarginPercentage,
          actualMarginPercentage: recipe.actualMarginPercentage,
          gap: Number((recipe.targetMarginPercentage - recipe.actualMarginPercentage).toFixed(1))
        };
      })
      .filter((p: any): p is NonNullable<typeof p> => !!p && p.gap > 0)
      .sort((a: any, b: any) => b.gap - a.gap)
      .slice(0, 5);

    // 9. Répartition par Mode de Paiement (Espèces, TPE, Ticket restaurant)
    const normalizeMethod = (m?: string) => {
      const s = (m || '').toLowerCase();
      if (s === 'especes' || s === 'cash' || s === 'espèces') return 'Espèces';
      if (s === 'tpe' || s === 'card' || s === 'carte' || s === 'contactless' || s === 'cb') return 'TPE';
      if (s === 'ticket_restaurant' || s === 'voucher' || s === 'ticket restaurant') return 'Ticket restaurant';
      return 'Espèces';
    };

    const paymentMethods = {
      especes: curSales.filter((s: any) => normalizeMethod(s.paymentMethod) === 'Espèces').reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0),
      tpe: curSales.filter((s: any) => normalizeMethod(s.paymentMethod) === 'TPE').reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0),
      ticket_restaurant: curSales.filter((s: any) => normalizeMethod(s.paymentMethod) === 'Ticket restaurant').reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
    };

    // 10. Répartition par Type de Consommation (Sur place vs À emporter)
    const consumptionTypes = {
      sur_place: curSales.filter((s: any) => (s.consumptionType || 'sur_place') === 'sur_place').reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0),
      a_emporter: curSales.filter((s: any) => s.consumptionType === 'a_emporter').reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0)
    };

    // 11. Timeline Chart Data
    const isHourly = period === 'today' || period === 'yesterday';
    const timeSeriesData: { label: string; revenue: number; costs: number; margin: number; count: number }[] = [];

    if (isHourly) {
      for (let h = 7; h <= 23; h++) {
        const hourStr = `${String(h).padStart(2, '0')}h`;
        const hourSales = curSales.filter((s: any) => {
          const d = new Date(s.createdAt);
          return d.getHours() === h;
        });
        const rev = hourSales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
        const estCogs = rev * 0.22;
        timeSeriesData.push({
          label: hourStr,
          revenue: Number(rev.toFixed(3)),
          costs: Number(estCogs.toFixed(3)),
          margin: Number((rev - estCogs).toFixed(3)),
          count: hourSales.length
        });
      }
    } else {
      // Daily breakdown
      const daysCount = Math.max(1, Math.ceil((curEnd.getTime() - curStart.getTime()) / (24 * 60 * 60 * 1000)));
      for (let i = 0; i < daysCount; i++) {
        const d = new Date(curStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dayStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        const daySales = curSales.filter((s: any) => {
          const sd = new Date(s.createdAt);
          return sd.toDateString() === d.toDateString();
        });
        const rev = daySales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
        const estCogs = rev * 0.22;
        timeSeriesData.push({
          label: dayStr,
          revenue: Number(rev.toFixed(3)),
          costs: Number(estCogs.toFixed(3)),
          margin: Number((rev - estCogs).toFixed(3)),
          count: daySales.length
        });
      }
    }

    // 12. Alertes actives non traitées (calculées à la lecture, jamais stockées)
    const activeAlerts = AlertService.getActiveAlerts().filter(a => !a.read);

    // Répartition du CA de la période par catégorie de produit
    const categoryBreakdown = Object.values(
      activeSoldProducts.reduce((acc: Record<string, { name: string; revenue: number }>, p) => {
        const cat = p.category || 'Autre';
        if (!acc[cat]) acc[cat] = { name: cat, revenue: 0 };
        acc[cat].revenue += p.revenue;
        return acc;
      }, {})
    ).sort((a: any, b: any) => b.revenue - a.revenue);

    return {
      period,
      startDate: curStart.toISOString(),
      endDate: curEnd.toISOString(),
      metrics: {
        totalRevenueToday: Number(totalRevenueToday.toFixed(3)),
        totalRevenueMonth: Number(totalRevenueMonth.toFixed(3)),
        todayTicketsCount,
        monthTicketsCount,
        totalRevenue: Number(totalRevenue.toFixed(3)),
        revenueDelta,
        totalPurchases: Number(totalPurchases.toFixed(3)),
        purchasesDelta,
        totalExpenses: Number(totalExpenses.toFixed(3)),
        expensesDelta,
        stockValuation: Number(stockValuation.toFixed(3)),
        lowStockCount,
        totalStaffCost: Number(totalStaffCost.toFixed(3)),
        ticketsCount,
        ticketsDelta,
        avgTicket,
        avgTicketDelta,
        grossMargin: Number(grossMargin.toFixed(3)),
        grossMarginPercentage,
        netOperatingProfit,
        netMarginPercentage,
        totalTva: Number(totalTva.toFixed(3)),
        totalCogs: Number(totalCogs.toFixed(3)),
        wasteLosses: Number(wasteCost.toFixed(3)),
        totalInventoryDiscrepancyValue
      },
      rankings: {
        topSellingProducts,
        flopSellingProducts,
        topRevenueProducts,
        topMarginProducts,
        lowMarginProducts
      },
      breakdowns: {
        paymentMethods,
        consumptionTypes
      },
      charts: {
        isHourly,
        timeSeriesData
      },
      inventoryDiscrepancies,
      alerts: activeAlerts,
      // Champs à plat, alignés sur la maquette du compte de résultat et des exports.
      pnl: {
        grossRevenueTTC: Number(totalRevenue.toFixed(3)),
        netRevenueHT: Number(netRevenueHT.toFixed(3)),
        tvaCollected: Number(totalTva.toFixed(3)),
        cogsFoodCost: Number(totalCogs.toFixed(3)),
        grossMargin: Number(grossMargin.toFixed(3)),
        grossMarginPercent: grossMarginPercentage,
        payrollCosts: Number(totalStaffCost.toFixed(3)),
        operatingExpenses: Number(totalExpenses.toFixed(3)),
        wasteLosses: Number(wasteCost.toFixed(3)),
        netOperatingProfit,
        netMarginPercent: netMarginPercentage
      },
      categoryBreakdown,
      topProducts: topSellingProducts,
      lowMarginProducts
    };
  }

  /**
   * Backward compatible helper
   */
  public static getDashboardMetrics() {
    const analytics = this.getDashboardAnalytics({ period: 'today' });
    return {
      totalRevenueToday: analytics.metrics.totalRevenueToday,
      ticketsCount: analytics.metrics.todayTicketsCount,
      avgTicket: analytics.metrics.avgTicket,
      pendingOrdersCount: (db.get('orders') || []).filter((o: any) => o && o.status === 'pending_approval').length,
      activeOrdersCount: (db.get('orders') || []).filter((o: any) => o && ['accepted', 'preparing', 'ready'].includes(o.status)).length,
      occupiedTables: (db.get('tables') || []).filter((t: any) => t && t.status === 'occupied').length,
      totalTables: (db.get('tables') || []).length,
      tableOccupancyRate: 0,
      unreadAlerts: analytics.alerts.length,
      totalWasteCost: 0
    };
  }

  public static getFinancialReport(periodDays = 30) {
    return this.getDashboardAnalytics({
      period: 'custom',
      startDate: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    });
  }

  /**
   * Assemble le rapport mensuel complet (CA, évolution, tickets, achats, dépenses, personnel,
   * marge, valeur de stock, pertes, écarts d'inventaire, top produits, produits à faible marge et
   * alertes principales) pour un mois donné (par défaut le mois en cours).
   */
  public static getMonthlyReport(monthStr?: string) {
    const now = new Date();
    const resolvedMonth = monthStr && /^\d{4}-\d{2}$/.test(monthStr)
      ? monthStr
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const analytics = this.getDashboardAnalytics({ period: 'specific_month', startDate: resolvedMonth });

    const [year, month] = resolvedMonth.split('-').map(Number);
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return { ...analytics, month: resolvedMonth, monthLabel };
  }
}
