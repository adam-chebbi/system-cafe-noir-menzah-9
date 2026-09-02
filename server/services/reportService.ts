import { db } from '../db/database.js';

export class ReportService {
  public static getDashboardMetrics() {
    const sales = db.get('sales') || [];
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];
    const alerts = db.get('alerts') || [];
    const wastes = db.get('stockWastes') || [];

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s && s.createdAt && s.createdAt.startsWith(todayStr));

    const totalRevenueToday = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const ticketsCount = todaySales.length;
    const avgTicket = ticketsCount > 0 ? Number((totalRevenueToday / ticketsCount).toFixed(2)) : 0;

    const pendingOrdersCount = orders.filter(o => o && o.status === 'pending_approval').length;
    const activeOrdersCount = orders.filter(o => o && (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready')).length;

    const occupiedTables = tables.filter(t => t && t.status === 'occupied').length;
    const totalTables = tables.length;
    const tableOccupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    const unreadAlerts = alerts.filter(a => a && !a.read).length;
    const totalWasteCost = wastes.reduce((sum, w) => sum + (w.estimatedCost || 0), 0);

    return {
      totalRevenueToday: Number(totalRevenueToday.toFixed(2)),
      ticketsCount,
      avgTicket,
      pendingOrdersCount,
      activeOrdersCount,
      occupiedTables,
      totalTables,
      tableOccupancyRate,
      unreadAlerts,
      totalWasteCost: Number(totalWasteCost.toFixed(2))
    };
  }

  public static getFinancialReport(periodDays = 30) {
    const sales = db.get('sales') || [];
    const expenses = db.get('expenses') || [];
    const wastes = db.get('stockWastes') || [];
    const recipes = db.get('recipes') || [];
    const products = db.get('products') || [];

    const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const cutoffDateStr = cutoffDate.split('T')[0];
    const periodSales = sales.filter(s => s && s.createdAt && s.createdAt >= cutoffDate);
    const periodExpenses = expenses.filter(e => e && e.date && e.date >= cutoffDateStr);
    const periodWastes = wastes.filter(w => w && w.createdAt && w.createdAt >= cutoffDate);

    const totalRevenue = periodSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalTva = periodSales.reduce((sum, s) => sum + (s.totalTva || 0), 0);
    const netRevenueHT = totalRevenue - totalTva;

    // Estimate COGS (Cost of Goods Sold) based on technical recipes
    let totalCogs = 0;
    for (const sale of periodSales) {
      const items = Array.isArray(sale.itemsSummary) ? sale.itemsSummary : [];
      for (const item of items) {
        if (!item) continue;
        const prod = products.find(p => p && p.name === item.name);
        if (prod) {
          const rec = recipes.find(r => r && r.productId === prod.id);
          if (rec) {
            totalCogs += ((rec.totalIngredientsCost || 0) * (item.quantity || 1));
          } else {
            // Default ~20% food cost if no recipe mapped
            totalCogs += ((item.total || 0) * 0.20);
          }
        }
      }
    }

    const wastageCost = periodWastes.reduce((sum, w) => sum + (w.estimatedCost || 0), 0);
    const grossMargin = netRevenueHT - totalCogs;
    const grossMarginPercentage = netRevenueHT > 0 ? Number(((grossMargin / netRevenueHT) * 100).toFixed(1)) : 0;

    const totalOperatingExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netOperatingProfit = grossMargin - totalOperatingExpenses - wastageCost;

    // Breakdown by payment method
    const paymentMethods = {
      cash: periodSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      card: periodSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      contactless: periodSales.filter(s => s.paymentMethod === 'contactless').reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      qr_pay: periodSales.filter(s => s.paymentMethod === 'qr_pay').reduce((sum, s) => sum + (s.totalAmount || 0), 0),
      other: periodSales.filter(s => s.paymentMethod === 'voucher' || s.paymentMethod === 'split').reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    };

    // Sales by hour
    const hourlySales: { hour: string; amount: number; count: number }[] = [];
    for (let h = 7; h <= 22; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      hourlySales.push({ hour: hourStr, amount: 0, count: 0 });
    }

    for (const sale of periodSales) {
      if (!sale.createdAt) continue;
      const d = new Date(sale.createdAt);
      const h = d.getHours();
      const target = hourlySales.find(hs => parseInt(hs.hour) === h);
      if (target) {
        target.amount = Number((target.amount + (sale.totalAmount || 0)).toFixed(2));
        target.count += 1;
      }
    }

    // Top products
    const productCountMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of periodSales) {
      const items = Array.isArray(sale.itemsSummary) ? sale.itemsSummary : [];
      for (const item of items) {
        if (!item || !item.name) continue;
        if (!productCountMap[item.name]) {
          productCountMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productCountMap[item.name].quantity += (item.quantity || 1);
        productCountMap[item.name].revenue += (item.total || 0);
      }
    }
    const topProducts = Object.values(productCountMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    return {
      periodDays,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      netRevenueHT: Number(netRevenueHT.toFixed(2)),
      totalTva: Number(totalTva.toFixed(2)),
      totalCogs: Number(totalCogs.toFixed(2)),
      grossMargin: Number(grossMargin.toFixed(2)),
      grossMarginPercentage,
      totalOperatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
      wastageCost: Number(wastageCost.toFixed(2)),
      netOperatingProfit: Number(netOperatingProfit.toFixed(2)),
      salesCount: periodSales.length,
      avgTicket: periodSales.length > 0 ? Number((totalRevenue / periodSales.length).toFixed(2)) : 0,
      paymentMethods,
      hourlySales,
      topProducts
    };
  }
}
