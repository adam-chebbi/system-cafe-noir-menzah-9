import { Router } from 'express';
import multer from 'multer';
import { db, AppSettings } from '../db/database.js';

import { StockService } from '../services/stockService.js';
import { CatalogService } from '../services/catalogService.js';
import { TableService } from '../services/tableService.js';
import { OrderService } from '../services/orderService.js';
import { SalesService } from '../services/salesService.js';
import { SupplierService } from '../services/supplierService.js';
import { HRService } from '../services/hrService.js';
import { ExpenseService } from '../services/expenseService.js';
import { ReportService } from '../services/reportService.js';
import { DeterministicOcrService } from '../services/deterministicOcrService.js';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// --- AUTH & USERS ---
router.post('/auth/login-pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN requis' });

    const users = db.get('users') || [];
    let user = users.find(u => u && u.pin === String(pin).trim() && u.active);
    
    // Master fallback for common default demo PINs
    if (!user) {
      if (pin === '1234' || pin === '0000') {
        user = users.find(u => u && u.role === 'admin' && u.active) || users[0];
      } else if (pin === '2025') {
        user = users.find(u => u && u.role === 'manager' && u.active);
      } else if (pin === '5678' || pin === '1111') {
        user = users.find(u => u && u.role === 'barista' && u.active);
      } else if (pin === '4321') {
        user = users.find(u => u && (u.role === 'cook' || u.role === 'server') && u.active);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Code PIN incorrect ou compte désactivé' });
    }

    db.logAudit('Connexion Utilisateur', 'admin', `Connexion de ${user.name} (${user.role})`, user.name);
    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users', (req, res) => {
  res.json(db.get('users'));
});

router.post('/users', (req, res) => {
  try {
    const user = HRService.createEmployee(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/users/:id', (req, res) => {
  try {
    const user = HRService.updateEmployee(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    HRService.deleteEmployee(req.params.id, (req.query.performedBy as string) || 'Admin');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
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

router.get('/stock/movements', (req, res) => {
  res.json(db.get('stockMovements'));
});

router.post('/stock/manual-entry', (req, res) => {
  try {
    const { ingredientId, quantity, unitCost, referenceDoc, reason, performedBy } = req.body;
    const movement = StockService.addStock(ingredientId, parseFloat(quantity), parseFloat(unitCost) || 0, referenceDoc, reason, performedBy || 'Admin');
    res.status(201).json(movement);
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
    const audit = StockService.createInventoryAudit(req.body.items, req.body.performedBy || 'Manager');
    res.status(201).json(audit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stock/audits/draft', (req, res) => {
  try {
    const audit = StockService.createDraftAudit(req.body.items, req.body.performedBy || 'Manager');
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

router.post('/purchase-orders/:id/receive', (req, res) => {
  try {
    const po = SupplierService.receivePurchaseOrder(req.params.id, req.body.performedBy || 'Staff');
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
    const invoice = SupplierService.payInvoice(req.params.id, req.body.paymentMethod || 'Virement', req.body.performedBy || 'Admin');
    res.json(invoice);
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

// --- HR, SHIFTS, ATTENDANCE, PAYROLL ---
router.get('/hr/shifts', (req, res) => {
  const start = req.query.start as string;
  const end = req.query.end as string;
  res.json(HRService.getShifts(start && end ? { start, end } : undefined));
});

router.post('/hr/shifts', (req, res) => {
  try {
    const shift = HRService.createShift(req.body, req.body.performedBy || 'Manager');
    res.status(201).json(shift);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/hr/shifts/:id', (req, res) => {
  try {
    const shift = HRService.updateShift(req.params.id, req.body, req.body.performedBy || 'Manager');
    res.json(shift);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/shifts/:id', (req, res) => {
  try {
    HRService.deleteShift(req.params.id, (req.query.performedBy as string) || 'Manager');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/attendances', (req, res) => {
  res.json(HRService.getAttendances(req.query.date as string));
});

router.post('/hr/attendance/clock-in', (req, res) => {
  try {
    const { employeeId, performedBy } = req.body;
    const rec = HRService.clockIn(employeeId, performedBy || 'Employé');
    res.status(201).json(rec);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/hr/attendance/clock-out', (req, res) => {
  try {
    const { employeeId, breakMinutes, notes, performedBy } = req.body;
    const rec = HRService.clockOut(employeeId, parseInt(breakMinutes) || 0, notes, performedBy || 'Employé');
    res.json(rec);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/leaves', (req, res) => {
  res.json(HRService.getLeaves());
});

router.post('/hr/leaves', (req, res) => {
  try {
    const leave = HRService.createLeave(req.body, req.body.performedBy || 'Employé');
    res.status(201).json(leave);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/hr/leaves/:id', (req, res) => {
  try {
    const leave = HRService.updateLeaveStatus(req.params.id, req.body.status, req.body.reviewedBy || 'Manager');
    res.json(leave);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/hr/leaves/:id', (req, res) => {
  try {
    HRService.deleteLeave(req.params.id, (req.query.performedBy as string) || 'Manager');
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/payrolls', (req, res) => {
  res.json(HRService.getPayrolls());
});

router.post('/hr/payrolls/generate', (req, res) => {
  try {
    const { employeeId, periodMonth, bonuses, deductions, performedBy } = req.body;
    const payroll = HRService.generatePayroll(employeeId, periodMonth, parseFloat(bonuses) || 0, parseFloat(deductions) || 0, performedBy || 'Admin');
    res.status(201).json(payroll);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/hr/payrolls/manual', (req, res) => {
  try {
    const payroll = HRService.createManualPayroll(req.body, req.body.performedBy || 'Admin');
    res.status(201).json(payroll);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/hr/payrolls/:id', (req, res) => {
  try {
    const payroll = HRService.updatePayroll(req.params.id, req.body, req.body.performedBy || 'Admin');
    res.json(payroll);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/hr/payrolls/:id/cancel', (req, res) => {
  try {
    const { reason, performedBy } = req.body;
    const payroll = HRService.cancelPayroll(req.params.id, reason || 'Annulation manuelle', performedBy || 'Admin');
    res.json(payroll);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/hr/performance', (req, res) => {
  res.json(HRService.getStaffPerformance());
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

// --- ALERTS & JOURNAL ---
router.get('/alerts', (req, res) => {
  res.json(db.get('alerts'));
});

router.patch('/alerts/:id/read', (req, res) => {
  const alerts = db.get('alerts');
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) {
    alert.read = true;
    db.set('alerts', alerts);
  }
  res.json({ success: true });
});

router.post('/alerts/read-all', (req, res) => {
  const alerts = db.get('alerts');
  alerts.forEach(a => a.read = true);
  db.set('alerts', alerts);
  res.json({ success: true });
});

router.get('/journal', (req, res) => {
  res.json(db.get('journal'));
});

// --- APP SETTINGS ---
router.get('/settings', (_req, res) => {
  res.json(db.getSettings());
});

router.patch('/settings', (req, res) => {
  try {
    const allowed: (keyof AppSettings)[] = ['recipeRangeCalcMode'];
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
