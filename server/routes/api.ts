import { Router } from 'express';
import multer from 'multer';
import { db, AppSettings } from '../db/database.js';

import { StockService } from '../services/stockService.js';
import { CatalogService } from '../services/catalogService.js';
import { TableService } from '../services/tableService.js';
import { OrderService } from '../services/orderService.js';
import { SalesService } from '../services/salesService.js';
import { SupplierService } from '../services/supplierService.js';
import { ProductMappingService } from '../services/productMappingService.js';
import { HRService } from '../services/hrService.js';
import { AlertService } from '../services/alertService.js';
import { ExpenseService } from '../services/expenseService.js';
import { ReportService } from '../services/reportService.js';
import { DeterministicOcrService } from '../services/deterministicOcrService.js';
import { TheoreticalConsumptionService } from '../services/theoreticalConsumptionService.js';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// --- AUTH & USERS ---
router.post('/auth/login-pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'Code PIN requis' });

    const users = db.get('users') || [];
    const user = users.find(u => u && u.pin === String(pin).trim() && u.active);

    if (!user) {
      return res.status(401).json({ error: 'Code PIN incorrect.' });
    }

    db.logAudit('Connexion Utilisateur', 'admin', `Connexion de ${user.name}`, user.name);
    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users', (req, res) => {
  res.json(db.get('users'));
});

// --- DASHBOARD & METRICS ---
router.get('/dashboard/metrics', (req, res) => {
  try {
    const metrics = ReportService.getDashboardMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard/analytics', (req, res) => {
  try {
    const analytics = ReportService.getDashboardAnalytics({
      period: req.query.period as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    });
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SPACES & TABLES ---
router.get('/spaces', (req, res) => {
  res.json(TableService.getSpaces());
});

router.post('/spaces', (req, res) => {
  try {
    const space = TableService.createSpace(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(space);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/spaces/:id', (req, res) => {
  try {
    const space = TableService.updateSpace(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(space);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/spaces/:id', (req, res) => {
  try {
    TableService.deleteSpace(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/spaces/reorder', (req, res) => {
  try {
    const spaces = TableService.reorderSpaces(req.body.orderedIds, req.body.performedBy || 'Admin');
    res.json(spaces);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/tables', async (req, res) => {
  try {
    const tables = await TableService.getTables();
    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tables', async (req, res) => {
  try {
    const table = await TableService.createTable(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(table);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/tables/:id/duplicate', async (req, res) => {
  try {
    const table = await TableService.duplicateTable(req.params.id, req.body.performedBy || 'Admin');
    res.status(201).json(table);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/tables/:id', (req, res) => {
  try {
    const table = TableService.updateTable(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(table);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/tables/:id', (req, res) => {
  try {
    TableService.deleteTable(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/tables/positions', (req, res) => {
  try {
    TableService.updatePositions(req.body.positions, req.body.performedBy || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/tables/history', (req, res) => {
  try {
    const history = TableService.getTableHistory((req.query.tableId as string) || undefined);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tables/:id/history', (req, res) => {
  try {
    const history = TableService.getTableHistory(req.params.id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PLAN ELEMENTS ---
router.get('/plan-elements', (req, res) => {
  try {
    const elements = TableService.getPlanElements((req.query.spaceId as string) || undefined);
    res.json(elements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/plan-elements', (req, res) => {
  try {
    const element = TableService.createPlanElement(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(element);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/plan-elements/:id', (req, res) => {
  try {
    const element = TableService.updatePlanElement(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(element);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/plan-elements/:id', (req, res) => {
  try {
    TableService.deletePlanElement(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/plan-elements/positions', (req, res) => {
  try {
    TableService.updatePlanElementPositions(req.body.positions, req.body.performedBy || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- RESERVATIONS ---
router.get('/reservations', (req, res) => {
  res.json(TableService.getReservations());
});

router.get('/reservations/check-conflict', (req, res) => {
  try {
    const { tableId, date, time, excludeId } = req.query as { tableId: string; date: string; time: string; excludeId?: string };
    const result = TableService.checkConflict(tableId, date, time, excludeId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reservations', (req, res) => {
  try {
    const reservation = TableService.createReservation(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/reservations/:id', (req, res) => {
  try {
    const updated = TableService.updateReservation(req.params.id, req.body, req.body.performedBy || 'Staff');
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/reservations/:id', (req, res) => {
  try {
    TableService.deleteReservation(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- CATALOG, PRODUCTS, RECIPES ---
router.get('/categories', (req, res) => {
  res.json(CatalogService.getCategories());
});

router.post('/categories', (req, res) => {
  try {
    const cat = CatalogService.createCategory(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/categories/:id', (req, res) => {
  try {
    const cat = CatalogService.updateCategory(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(cat);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    CatalogService.deleteCategory(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/products', (req, res) => {
  res.json(CatalogService.getProducts());
});

router.post('/products', (req, res) => {
  try {
    const product = CatalogService.createProduct(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/products/:id', (req, res) => {
  try {
    const product = CatalogService.updateProduct(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    CatalogService.deleteProduct(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/recipes', (req, res) => {
  res.json(CatalogService.getRecipes());
});

router.post('/recipes', (req, res) => {
  try {
    const recipe = CatalogService.saveRecipe(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(recipe);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/recipes/:productId', (req, res) => {
  try {
    CatalogService.deleteRecipe(req.params.productId, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/products/export/csv', (req, res) => {
  const csv = CatalogService.exportProductsCSV();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cafe_noir_produits.csv"');
  res.send(csv);
});

router.post('/products/import/csv', (req, res) => {
  try {
    const { csvContent, performedBy } = req.body;
    if (!csvContent) return res.status(400).json({ error: 'Contenu CSV manquant' });
    const result = CatalogService.importProductsCSV(csvContent, performedBy || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- ORDERS & QR WORKFLOW ---
router.get('/orders', (req, res) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status as string;
  if (req.query.tableId) filter.tableId = req.query.tableId as string;
  res.json(OrderService.getOrders(filter));
});

router.get('/orders/:id', (req, res) => {
  const order = OrderService.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
  res.json(order);
});

// Customer submits QR order from table
router.post('/orders/qr', (req, res) => {
  try {
    const order = OrderService.createQROrder(req.body);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Staff creates POS order
router.post('/orders/pos', (req, res) => {
  try {
    const order = OrderService.createPOSOrder(req.body);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Launch order (send to bar/kitchen & start timer)
router.post('/orders/:id/launch', (req, res) => {
  try {
    const order = OrderService.launchOrder(req.params.id, req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update order (items, quantities, discount, notes)
router.patch('/orders/:id', (req, res) => {
  try {
    const order = OrderService.updateOrder(req.params.id, req.body, req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Transfer order to another table
router.post('/orders/:id/transfer', (req, res) => {
  try {
    const order = OrderService.transferOrder(req.params.id, req.body.newTableId, req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel active order
router.post('/orders/:id/cancel', (req, res) => {
  try {
    const order = OrderService.cancelOrder(req.params.id, req.body.reason || 'Annulation par le serveur', req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Staff accepts QR order
router.post('/orders/:id/accept', (req, res) => {
  try {
    const order = OrderService.acceptOrder(req.params.id, req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Staff rejects QR order
router.post('/orders/:id/reject', (req, res) => {
  try {
    const order = OrderService.rejectOrder(req.params.id, req.body.rejectionReason, req.body.performedBy || 'Staff');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// KDS / Kitchen item status update
router.patch('/orders/:id/items/:itemId/status', (req, res) => {
  try {
    const order = OrderService.updateItemStatus(req.params.id, req.params.itemId, req.body.status, req.body.performedBy || 'Cuisine');
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Process payment & complete sale
router.post('/orders/:id/pay', (req, res) => {
  try {
    const result = OrderService.processPayment(req.params.id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SALES & REGISTER ---
router.get('/sales', (req, res) => {
  const filter = {
    search: req.query.search as string,
    paymentMethod: req.query.paymentMethod as string,
    cashierId: req.query.cashierId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  };
  res.json(SalesService.getSales(filter));
});

router.get('/sales/:id', (req, res) => {
  const sale = SalesService.getSaleById(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Vente non trouvée' });
  res.json(sale);
});

// Manual sale entry (double validated from client)
router.post('/sales/manual', (req, res) => {
  try {
    const sale = SalesService.createManualSale(req.body);
    res.status(201).json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Import sales batch
router.post('/sales/import-batch', (req, res) => {
  try {
    const { sales, performedBy } = req.body;
    const result = SalesService.importSalesBatch(sales, performedBy || 'Admin');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update / Correct sale (Admin correction with audit tracking)
router.patch('/sales/:id/edit', (req, res) => {
  try {
    const { reason, performedBy, ...updates } = req.body;
    const sale = SalesService.updateSale(req.params.id, updates, reason || 'Correction administrative', performedBy || 'Admin');
    res.json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/sales/:id', (req, res) => {
  try {
    const { reason, performedBy, ...updates } = req.body;
    const sale = SalesService.updateSale(req.params.id, updates, reason || 'Correction administrative', performedBy || 'Admin');
    res.json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel sale
router.post('/sales/:id/cancel', (req, res) => {
  try {
    const { reason, performedBy } = req.body;
    const sale = SalesService.cancelSale(req.params.id, reason || 'Annulation manuelle', performedBy || 'Admin');
    res.json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cash register endpoints
router.get('/cash-register/active', (req, res) => {
  res.json(SalesService.getActiveRegister() || null);
});

router.get('/cash-register/sessions', (req, res) => {
  res.json(SalesService.getAllSessions());
});

router.get('/cash-register/movements', (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  const movements = db.get('cashMovements') || [];
  if (sessionId) {
    return res.json(movements.filter((m: any) => m && m.sessionId === sessionId));
  }
  res.json(movements);
});

router.post('/cash-register/open', (req, res) => {
  try {
    const { cashierId, cashierName, openingCash } = req.body;
    const session = SalesService.openRegister(cashierId, cashierName, parseFloat(openingCash) || 0);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cash-register/movement', (req, res) => {
  try {
    const { sessionId, type, amount, reason, performedBy, notes } = req.body;
    const result = SalesService.addCashMovement(sessionId, {
      type,
      amount: parseFloat(amount),
      reason,
      performedBy: performedBy || 'Caissier',
      notes
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cash-register/:id/close', (req, res) => {
  try {
    const { actualClosingCash, notes, performedBy } = req.body;
    const session = SalesService.closeRegister(
      req.params.id,
      parseFloat(actualClosingCash) || 0,
      notes,
      performedBy,
      req.body
    );
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- STOCK & INVENTORIES ---
router.get('/ingredients', (req, res) => {
  res.json(StockService.getAllIngredients());
});

router.post('/ingredients', (req, res) => {
  try {
    const ing = StockService.createIngredient(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(ing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/ingredients/:id', (req, res) => {
  try {
    const ing = StockService.updateIngredient(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(ing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/ingredients/:id', (req, res) => {
  try {
    StockService.deleteIngredient(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ingredients/:id/purchase-history', (req, res) => {
  res.json(StockService.getPurchaseHistoryForIngredient(req.params.id));
});

router.get('/stock/movements', (req, res) => {
  res.json(db.get('stockMovements'));
});

router.post('/stock/manual-entry', (req, res) => {
  try {
    const { ingredientId, quantity, unitCost, referenceDoc, reason, performedBy, zone, comment, lotNumber, expirationDate } = req.body;
    const movement = StockService.addStock({
      ingredientId,
      quantity: parseFloat(quantity),
      unitCost: parseFloat(unitCost) || 0,
      referenceDoc,
      reason,
      performedBy: performedBy || 'Admin',
      zone: zone || 'reserve_principale',
      comment,
      lotNumber,
      expirationDate
    });
    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stock/transfer', (req, res) => {
  try {
    const { ingredientId, fromZone, toZone, quantity, reason, comment, performedBy } = req.body;
    const result = StockService.transferStock(
      ingredientId,
      fromZone,
      toZone,
      parseFloat(quantity),
      reason || 'Transfert entre zones',
      comment,
      performedBy || 'Admin'
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stock/wastes', (req, res) => {
  res.json(db.get('stockWastes'));
});

router.post('/stock/wastes', (req, res) => {
  try {
    const waste = StockService.recordWaste(req.body, req.body.performedBy || 'Staff');
    res.status(201).json(waste);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stock/audits', (req, res) => {
  res.json(db.get('inventoryAudits'));
});

router.post('/stock/audits', (req, res) => {
  try {
    const { items, performedBy, scopeType, scopeCategory, scopeZone } = req.body;
    const audit = StockService.createInventoryAudit(items, performedBy || 'Manager', {
      scopeType: scopeType || 'full',
      scopeCategory,
      scopeZone
    });
    res.status(201).json(audit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stock/audits/draft', (req, res) => {
  try {
    const { items, performedBy, scopeType, scopeCategory, scopeZone } = req.body;
    const audit = StockService.createDraftAudit(items, performedBy || 'Manager', {
      scopeType: scopeType || 'full',
      scopeCategory,
      scopeZone
    });
    res.status(201).json(audit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/stock/audits/:id', (req, res) => {
  try {
    const audit = StockService.updateInventoryAudit(req.params.id, req.body, req.body.performedBy || 'Manager');
    res.json(audit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/stock/audits/:id', (req, res) => {
  try {
    StockService.deleteInventoryAudit(req.params.id, (req.query.performedBy as string) || 'Manager');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stock/theoretical-consumption', (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    res.json(TheoreticalConsumptionService.computeTheoreticalConsumption(startDate, endDate));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stock/theoretical-stock', (req, res) => {
  try {
    res.json(TheoreticalConsumptionService.computeTheoreticalStock());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/stock/lots', (req, res) => {
  res.json(StockService.getAllLots());
});

router.post('/stock/lots', (req, res) => {
  try {
    const lot = StockService.createLot(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(lot);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/stock/lots/:id', (req, res) => {
  try {
    const lot = StockService.updateLot(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(lot);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stock/movements/:id/correct', (req, res) => {
  try {
    const { reason, performedBy } = req.body;
    const movement = StockService.correctStockMovement(req.params.id, reason || 'Correction manuelle', performedBy || 'Admin');
    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- SUPPLIERS & INVOICES & OCR ---
router.get('/suppliers', (req, res) => {
  res.json(SupplierService.getSuppliers());
});

router.post('/suppliers', (req, res) => {
  try {
    const supplier = SupplierService.createSupplier(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/suppliers/:id', (req, res) => {
  try {
    const supplier = SupplierService.updateSupplier(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/suppliers/:id', (req, res) => {
  try {
    SupplierService.deleteSupplier(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/purchase-orders', (req, res) => {
  res.json(SupplierService.getPurchaseOrders());
});

router.post('/purchase-orders', (req, res) => {
  try {
    const po = SupplierService.createPurchaseOrder(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/purchase-orders/:id', (req, res) => {
  try {
    const po = SupplierService.updatePurchaseOrder(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/purchase-orders/:id/cancel', (req, res) => {
  try {
    const { reason, performedBy } = req.body;
    const po = SupplierService.cancelPurchaseOrder(req.params.id, reason || 'Annulation manuelle', performedBy || 'Admin');
    res.json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/purchase-orders/:id/send', (req, res) => {
  try {
    const po = SupplierService.sendPurchaseOrder(req.params.id, req.body.performedBy || 'Admin');
    res.json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Réception d'un bon de commande : `items` (liste {itemIndex, quantityReceived, unitCost?}) pour une
// réception partielle/ligne par ligne ; sans `items`, réceptionne d'un coup tout ce qui reste à recevoir.
router.post('/purchase-orders/:id/receive', (req, res) => {
  try {
    const { items, zone, note, performedBy } = req.body;
    const po = Array.isArray(items) && items.length > 0
      ? SupplierService.receivePurchaseOrderPartial(req.params.id, items, zone || 'reserve_principale', performedBy || 'Staff', note)
      : SupplierService.receivePurchaseOrder(req.params.id, performedBy || 'Staff', zone || 'reserve_principale');
    res.json(po);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/supplier-invoices', (req, res) => {
  res.json(SupplierService.getInvoices());
});

router.post('/supplier-invoices', (req, res) => {
  try {
    const invoice = SupplierService.createInvoice(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/supplier-invoices/:id', (req, res) => {
  try {
    const invoice = SupplierService.updateInvoice(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/supplier-invoices/:id/cancel', (req, res) => {
  try {
    const { reason, performedBy } = req.body;
    const invoice = SupplierService.cancelInvoice(req.params.id, reason || 'Annulation manuelle', performedBy || 'Admin');
    res.json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/supplier-invoices/:id', (req, res) => {
  try {
    SupplierService.deleteInvoice(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/supplier-invoices/:id/pay', (req, res) => {
  try {
    const { amount, paymentMethod, performedBy, notes } = req.body;
    const invoice = SupplierService.recordInvoicePayment(req.params.id, parseFloat(amount), paymentMethod || 'Virement', performedBy || 'Admin', notes);
    res.json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- PRODUCT LABEL MAPPINGS (correspondances réutilisables libellé facture → ingrédient) ---
router.get('/product-mappings', (req, res) => {
  res.json(ProductMappingService.getAll(req.query.supplierId as string | undefined));
});

router.post('/product-mappings', (req, res) => {
  try {
    const { supplierId, supplierName, rawLabel, ingredientId, ingredientName, performedBy } = req.body;
    const mapping = ProductMappingService.upsertMapping({ supplierId, supplierName, rawLabel, ingredientId, ingredientName }, performedBy || 'Admin');
    res.status(201).json(mapping);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/product-mappings/:id', (req, res) => {
  try {
    const { ingredientId, ingredientName, performedBy } = req.body;
    const mapping = ProductMappingService.updateMapping(req.params.id, { ingredientId, ingredientName }, performedBy || 'Admin');
    res.json(mapping);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/product-mappings/:id/apply', (req, res) => {
  ProductMappingService.recordUsage(req.params.id);
  res.json({ success: true });
});

router.delete('/product-mappings/:id', (req, res) => {
  try {
    ProductMappingService.deleteMapping(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Deterministic Local OCR Analysis for Invoices (100% Local, No AI)
router.post('/ocr/analyze-invoice', upload.single('invoiceFile'), async (req, res) => {
  try {
    let rawPayload: any = {};

    if (req.file) {
      rawPayload = {
        buffer: req.file.buffer,
        mimeType: req.file.mimetype
      };
    } else if (req.body.imageBase64) {
      rawPayload = {
        base64: req.body.imageBase64,
        mimeType: req.body.mimeType || 'image/jpeg'
      };
    } else if (req.body.text) {
      rawPayload = {
        text: req.body.text
      };
    } else {
      return res.status(400).json({ error: 'Fichier image, PDF, DOCX ou texte requis pour analyse déterministe' });
    }

    const result = await DeterministicOcrService.analyzeInvoice(rawPayload);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPENSES ---
router.get('/expenses', (req, res) => {
  res.json(ExpenseService.getExpenses());
});

router.post('/expenses', (req, res) => {
  try {
    const expense = ExpenseService.createExpense(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/expenses/:id', (req, res) => {
  try {
    const expense = ExpenseService.updateExpense(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(expense);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  try {
    ExpenseService.deleteExpense(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- EXPENSE CATEGORIES (adaptables par l'administrateur) ---
router.get('/expense-categories', (req, res) => {
  res.json(ExpenseService.getExpenseCategories());
});

router.post('/expense-categories', (req, res) => {
  try {
    const category = ExpenseService.createExpenseCategory(req.body.name, req.body.performedBy || 'Admin');
    res.status(201).json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/expense-categories/:id', (req, res) => {
  try {
    const { name, active, performedBy } = req.body;
    const category = ExpenseService.updateExpenseCategory(req.params.id, { name, active }, performedBy || 'Admin');
    res.json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/expense-categories/:id', (req, res) => {
  try {
    ExpenseService.deleteExpenseCategory(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- HR V1: employee files, manual planning/presence and financial tracking ---
router.get('/hr/employees', (_req, res) => {
  res.json(HRService.getEmployees());
});

router.post('/hr/employees', (req, res) => {
  try {
    const employee = HRService.createEmployee(req.body, req.body.performedBy || 'Administrateur');
    res.status(201).json(employee);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/hr/employees/:id', (req, res) => {
  try {
    const employee = HRService.updateEmployee(req.params.id, req.body, req.body.performedBy || 'Administrateur');
    res.json(employee);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/employees/:id', (req, res) => {
  try {
    const employee = HRService.setEmployeeActive(req.params.id, false, (req.query.performedBy as string) || 'Administrateur');
    res.json(employee);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/presence', (req, res) => {
  res.json(HRService.getAttendances({
    start: req.query.start as string,
    end: req.query.end as string,
    employeeId: req.query.employeeId as string
  }));
});

router.put('/hr/presence', (req, res) => {
  try {
    const record = HRService.saveAttendance(req.body, req.body.performedBy || 'Administrateur');
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/presence/:id', (req, res) => {
  try {
    HRService.deleteAttendance(req.params.id, (req.query.performedBy as string) || 'Administrateur');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/financial-records', (req, res) => {
  res.json(HRService.getFinancialRecords(req.query.employeeId as string));
});

router.post('/hr/financial-records', (req, res) => {
  try {
    const record = HRService.createFinancialRecord(req.body, req.body.performedBy || 'Administrateur');
    res.status(201).json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/hr/financial-records/:id', (req, res) => {
  try {
    const record = HRService.updateFinancialRecord(req.params.id, req.body, req.body.performedBy || 'Administrateur');
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/financial-records/:id', (req, res) => {
  try {
    HRService.deleteFinancialRecord(req.params.id, (req.query.performedBy as string) || 'Administrateur');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- REPORTS & FINANCIALS ---
router.get('/reports/financial', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const report = ReportService.getFinancialReport(days);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/monthly', (req, res) => {
  try {
    const month = (req.query.month as string) || undefined;
    const report = ReportService.getMonthlyReport(month);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- ALERTS (calculées à la lecture) & JOURNAL (lecture seule) ---
router.get('/alerts', (_req, res) => {
  res.json(AlertService.getActiveAlerts());
});

router.patch('/alerts/:id/read', (req, res) => {
  AlertService.dismiss(req.params.id);
  res.json({ success: true });
});

router.post('/alerts/:id/restore', (req, res) => {
  AlertService.restore(req.params.id);
  res.json({ success: true });
});

router.post('/alerts/read-all', (req, res) => {
  AlertService.dismissAll();
  res.json({ success: true });
});

// Journal d'activité : aucune route PATCH/DELETE n'existe — la traçabilité est immuable.
router.get('/journal', (req, res) => {
  res.json(db.get('journal'));
});

// --- APP SETTINGS ---
router.get('/settings', (_req, res) => {
  res.json(db.getSettings());
});

router.patch('/settings', (req, res) => {
  try {
    const allowed: (keyof AppSettings)[] = ['recipeRangeCalcMode', 'defaultExpiryAlertLeadDays', 'significantDiscrepancyThresholdDT'];
    const updates: Partial<AppSettings> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (updates as any)[key] = req.body[key];
      }
    }
    const updated = db.setSettings(updates);
    db.logAudit('Mise à jour Paramètres', 'admin', `Paramètres app modifiés: ${JSON.stringify(updates)}`, req.body.performedBy || 'Admin');
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
