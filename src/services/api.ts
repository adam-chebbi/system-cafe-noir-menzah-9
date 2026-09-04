import {
  User, Space, Table, Reservation, PlanElement, TableHistoryItem, Category, Ingredient, TechnicalRecipe,
  Product, Order, Sale, StockMovement, StockWaste, InventoryAudit, StockLot, StockZone,
  Supplier, PurchaseOrder, SupplierInvoice, SupplierInvoiceWithDueStatus, IngredientPurchaseHistoryEntry, ProductLabelMapping, Expense, ExpenseCategory,
  SystemAlert, JournalEntry, CashRegisterSession, CashMovement,
  TheoreticalConsumptionReport, IngredientTheoreticalStock, EmployeeRecord, AttendanceRecord, AttendanceStatus, PersonnelFinancialRecord
} from '../types/index';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `Erreur HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err.error) errorMsg = err.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // HR V1 — employee records, manually-entered planning/presence and financial tracking.
  getEmployees: () => fetchJson<EmployeeRecord[]>('/api/hr/employees'),
  createEmployee: (data: Partial<EmployeeRecord>, performedBy: string) => fetchJson<EmployeeRecord>('/api/hr/employees', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateEmployee: (id: string, updates: Partial<EmployeeRecord>, performedBy: string) => fetchJson<EmployeeRecord>(`/api/hr/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  setEmployeeActive: (id: string, performedBy: string) => fetchJson<EmployeeRecord>(`/api/hr/employees/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getAttendances: (filter?: { start?: string; end?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (filter?.start) query.set('start', filter.start);
    if (filter?.end) query.set('end', filter.end);
    if (filter?.employeeId) query.set('employeeId', filter.employeeId);
    const qs = query.toString();
    return fetchJson<AttendanceRecord[]>(`/api/hr/presence${qs ? `?${qs}` : ''}`);
  },
  saveAttendance: (data: {
    employeeId: string;
    employeeName: string;
    date: string;
    status: AttendanceStatus;
    plannedStartTime?: string;
    plannedEndTime?: string;
    notes?: string;
  }, performedBy: string) => fetchJson<AttendanceRecord>('/api/hr/presence', {
    method: 'PUT',
    body: JSON.stringify({ ...data, performedBy })
  }),
  deleteAttendance: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/hr/presence/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getPersonnelFinancialRecords: (employeeId?: string) => fetchJson<PersonnelFinancialRecord[]>(`/api/hr/financial-records${employeeId ? `?employeeId=${employeeId}` : ''}`),
  createPersonnelFinancialRecord: (data: Partial<PersonnelFinancialRecord>, performedBy: string) => fetchJson<PersonnelFinancialRecord>('/api/hr/financial-records', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updatePersonnelFinancialRecord: (id: string, updates: Partial<PersonnelFinancialRecord>, performedBy: string) => fetchJson<PersonnelFinancialRecord>(`/api/hr/financial-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deletePersonnelFinancialRecord: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/hr/financial-records/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),

  // Auth
  loginPin: (pin: string) => fetchJson<{ success: boolean; user: User }>('/api/auth/login-pin', {
    method: 'POST',
    body: JSON.stringify({ pin })
  }),
  getUsers: () => fetchJson<User[]>('/api/users'),


  // Metrics & Dashboard Analytics
  getDashboardMetrics: () => fetchJson<any>('/api/dashboard/metrics'),
  getDashboardAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return fetchJson<any>(`/api/dashboard/analytics${qs ? `?${qs}` : ''}`);
  },

  // Spaces & Tables
  getSpaces: () => fetchJson<Space[]>('/api/spaces'),
  createSpace: (data: Partial<Space>, performedBy: string) => fetchJson<Space>('/api/spaces', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateSpace: (id: string, updates: Partial<Space>, performedBy: string) => fetchJson<Space>(`/api/spaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteSpace: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/spaces/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  reorderSpaces: (orderedIds: string[], performedBy: string) => fetchJson<Space[]>('/api/spaces/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedIds, performedBy })
  }),
  getTables: () => fetchJson<Table[]>('/api/tables'),
  createTable: (data: Partial<Table>, performedBy: string) => fetchJson<Table>('/api/tables', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  duplicateTable: (id: string, performedBy: string) => fetchJson<Table>(`/api/tables/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ performedBy })
  }),
  updateTable: (id: string, updates: Partial<Table>, performedBy: string) => fetchJson<Table>(`/api/tables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteTable: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/tables/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  updateTablePositions: (positions: { id: string; posX: number; posY: number; rotation?: number }[], performedBy: string) => fetchJson<{ success: boolean }>('/api/tables/positions', {
    method: 'POST',
    body: JSON.stringify({ positions, performedBy })
  }),
  getTableHistory: (tableId?: string) => {
    const query = tableId ? `?tableId=${encodeURIComponent(tableId)}` : '';
    return fetchJson<TableHistoryItem[]>(`/api/tables/history${query}`);
  },

  // Plan Elements
  getPlanElements: (spaceId?: string) => {
    const query = spaceId ? `?spaceId=${encodeURIComponent(spaceId)}` : '';
    return fetchJson<PlanElement[]>(`/api/plan-elements${query}`);
  },
  createPlanElement: (data: Partial<PlanElement>, performedBy: string) => fetchJson<PlanElement>('/api/plan-elements', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updatePlanElement: (id: string, updates: Partial<PlanElement>, performedBy: string) => fetchJson<PlanElement>(`/api/plan-elements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deletePlanElement: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/plan-elements/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  updatePlanElementPositions: (positions: { id: string; posX: number; posY: number; rotation?: number; width?: number; height?: number }[], performedBy: string) => fetchJson<{ success: boolean }>('/api/plan-elements/positions', {
    method: 'POST',
    body: JSON.stringify({ positions, performedBy })
  }),

  // Reservations
  getReservations: () => fetchJson<Reservation[]>('/api/reservations'),
  checkReservationConflict: (tableId: string, date: string, time: string, excludeId?: string) => {
    const params = new URLSearchParams({ tableId, date, time });
    if (excludeId) params.set('excludeId', excludeId);
    return fetchJson<{ hasConflict: boolean; conflictingReservation?: Reservation }>(`/api/reservations/check-conflict?${params.toString()}`);
  },
  createReservation: (data: Partial<Reservation>, performedBy: string) => fetchJson<Reservation>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateReservation: (id: string, updates: Partial<Reservation>, performedBy: string) => fetchJson<Reservation>(`/api/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteReservation: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/reservations/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),

  // Catalog
  getCategories: () => fetchJson<Category[]>('/api/categories'),
  createCategory: (data: Partial<Category>, performedBy: string) => fetchJson<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateCategory: (id: string, updates: Partial<Category>, performedBy: string) => fetchJson<Category>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteCategory: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/categories/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getProducts: () => fetchJson<Product[]>('/api/products'),
  createProduct: (data: Partial<Product>, performedBy: string) => fetchJson<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateProduct: (id: string, updates: Partial<Product>, performedBy: string) => fetchJson<Product>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteProduct: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/products/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getRecipes: () => fetchJson<TechnicalRecipe[]>('/api/recipes'),
  saveRecipe: (data: Partial<TechnicalRecipe>, performedBy: string) => fetchJson<TechnicalRecipe>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  deleteRecipe: (productId: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/recipes/${productId}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  importProductsCsv: (csvContent: string, performedBy: string) => fetchJson<{ imported: number; errors: string[] }>('/api/products/import/csv', {
    method: 'POST',
    body: JSON.stringify({ csvContent, performedBy })
  }),

  // Orders
  getOrders: (params?: { status?: string; tableId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.tableId) query.set('tableId', params.tableId);
    return fetchJson<Order[]>(`/api/orders?${query.toString()}`);
  },
  getOrderById: (id: string) => fetchJson<Order>(`/api/orders/${id}`),
  createQROrder: (data: any) => fetchJson<Order>('/api/orders/qr', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  createPOSOrder: (data: any) => fetchJson<Order>('/api/orders/pos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  launchOrder: (id: string, performedBy: string) => fetchJson<Order>(`/api/orders/${id}/launch`, {
    method: 'POST',
    body: JSON.stringify({ performedBy })
  }),
  updateOrder: (id: string, updates: any, performedBy: string) => fetchJson<Order>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  transferOrder: (id: string, newTableId: string, performedBy: string) => fetchJson<Order>(`/api/orders/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ newTableId, performedBy })
  }),
  cancelOrder: (id: string, reason: string, performedBy: string) => fetchJson<Order>(`/api/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, performedBy })
  }),
  acceptOrder: (id: string, performedBy: string) => fetchJson<Order>(`/api/orders/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ performedBy })
  }),
  rejectOrder: (id: string, rejectionReason: string, performedBy: string) => fetchJson<Order>(`/api/orders/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason, performedBy })
  }),
  updateItemStatus: (orderId: string, itemId: string, status: string, performedBy: string) => fetchJson<Order>(`/api/orders/${orderId}/items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, performedBy })
  }),
  payOrder: (orderId: string, paymentData: any) => fetchJson<{ order: Order; sale: Sale }>(`/api/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  }),

  // Sales & Cash Register
  getSales: (filter?: { search?: string; paymentMethod?: string; cashierId?: string; startDate?: string; endDate?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (filter?.search) query.set('search', filter.search);
    if (filter?.paymentMethod) query.set('paymentMethod', filter.paymentMethod);
    if (filter?.cashierId) query.set('cashierId', filter.cashierId);
    if (filter?.startDate) query.set('startDate', filter.startDate);
    if (filter?.endDate) query.set('endDate', filter.endDate);
    if (filter?.limit) query.set('limit', String(filter.limit));
    const qs = query.toString();
    return fetchJson<Sale[]>(`/api/sales${qs ? `?${qs}` : ''}`);
  },
  getSaleById: (id: string) => fetchJson<Sale>(`/api/sales/${id}`),
  createManualSale: (data: any) => fetchJson<Sale>('/api/sales/manual', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  importSalesBatch: (sales: any[], performedBy: string) => fetchJson<{ importedCount: number; totalAmount: number; errors: string[] }>('/api/sales/import-batch', {
    method: 'POST',
    body: JSON.stringify({ sales, performedBy })
  }),
  updateSale: (id: string, updates: any, reason: string, performedBy: string) => fetchJson<Sale>(`/api/sales/${id}/edit`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, reason, performedBy })
  }),
  cancelSale: (id: string, reason: string, performedBy: string) => fetchJson<Sale>(`/api/sales/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, performedBy })
  }),
  getActiveRegister: () => fetchJson<CashRegisterSession | null>('/api/cash-register/active'),
  getCashRegisterSessions: () => fetchJson<CashRegisterSession[]>('/api/cash-register/sessions'),
  getRegisterSessions: () => fetchJson<CashRegisterSession[]>('/api/cash-register/sessions'),
  getCashMovements: (sessionId?: string) => {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return fetchJson<CashMovement[]>(`/api/cash-register/movements${query}`);
  },
  openRegister: (cashierId: string, cashierName: string, openingCash: number) => fetchJson<CashRegisterSession>('/api/cash-register/open', {
    method: 'POST',
    body: JSON.stringify({ cashierId, cashierName, openingCash })
  }),
  addCashMovement: (sessionIdOrData: any, optionalData?: any) => {
    let payload: any = {};
    if (typeof sessionIdOrData === 'string') {
      payload = { sessionId: sessionIdOrData, ...optionalData };
    } else {
      payload = sessionIdOrData;
    }
    return fetchJson<{ session: CashRegisterSession; movement: any }>('/api/cash-register/movement', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  closeRegister: (
    id: string,
    actualClosingCash: number,
    notes?: string,
    performedBy?: string,
    payload?: Partial<import('../types').ClosingRegisterPayload>
  ) =>
    fetchJson<CashRegisterSession>(`/api/cash-register/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ actualClosingCash, notes, performedBy, ...payload })
    }),
  updateOrderItems: (id: string, items: any[], discountAmount = 0, discountReason = '', performedBy = 'Caissier') => {
    return fetchJson<Order>(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ items, discountAmount, discountReason, performedBy })
    });
  },

  // Stock
  getIngredients: () => fetchJson<Ingredient[]>('/api/ingredients'),
  createIngredient: (data: Partial<Ingredient>, performedBy: string) => fetchJson<Ingredient>('/api/ingredients', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateIngredient: (id: string, updates: Partial<Ingredient>, performedBy: string) => fetchJson<Ingredient>(`/api/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteIngredient: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/ingredients/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getStockMovements: () => fetchJson<StockMovement[]>('/api/stock/movements'),
  createStockEntry: (data: any) => fetchJson<StockMovement>('/api/stock/manual-entry', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getStockWastes: () => fetchJson<StockWaste[]>('/api/stock/wastes'),
  recordWaste: (data: Partial<StockWaste>, performedBy: string) => fetchJson<StockWaste>('/api/stock/wastes', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  getInventoryAudits: () => fetchJson<InventoryAudit[]>('/api/stock/audits'),
  createInventoryAudit: (items: any[], performedBy: string, scope: { scopeType: InventoryAudit['scopeType']; scopeCategory?: Ingredient['category']; scopeZone?: StockZone }) => fetchJson<InventoryAudit>('/api/stock/audits', {
    method: 'POST',
    body: JSON.stringify({ items, performedBy, ...scope })
  }),
  createDraftInventoryAudit: (items: any[], performedBy: string, scope: { scopeType: InventoryAudit['scopeType']; scopeCategory?: Ingredient['category']; scopeZone?: StockZone }) => fetchJson<InventoryAudit>('/api/stock/audits/draft', {
    method: 'POST',
    body: JSON.stringify({ items, performedBy, ...scope })
  }),
  updateInventoryAudit: (id: string, updates: { items?: any[]; status?: 'draft' | 'validated' }, performedBy: string) => fetchJson<InventoryAudit>(`/api/stock/audits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteInventoryAudit: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/stock/audits/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  correctStockMovement: (id: string, reason: string, performedBy: string) => fetchJson<StockMovement>(`/api/stock/movements/${id}/correct`, {
    method: 'POST',
    body: JSON.stringify({ reason, performedBy })
  }),
  transferStock: (data: { ingredientId: string; fromZone: StockZone; toZone: StockZone; quantity: number; reason: string; comment?: string }, performedBy: string) =>
    fetchJson<{ out: StockMovement; in: StockMovement }>('/api/stock/transfer', {
      method: 'POST',
      body: JSON.stringify({ ...data, performedBy })
    }),
  getStockLots: () => fetchJson<(StockLot & { isExpired: boolean; isExpiringSoon: boolean; daysUntilExpiry: number | null })[]>('/api/stock/lots'),
  createStockLot: (data: Partial<StockLot>, performedBy: string) => fetchJson<StockLot>('/api/stock/lots', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateStockLot: (id: string, updates: Partial<StockLot>, performedBy: string) => fetchJson<StockLot>(`/api/stock/lots/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  getTheoreticalConsumption: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString();
    return fetchJson<TheoreticalConsumptionReport>(`/api/stock/theoretical-consumption${qs ? `?${qs}` : ''}`);
  },
  getTheoreticalStock: () => fetchJson<IngredientTheoreticalStock[]>('/api/stock/theoretical-stock'),

  // Suppliers & OCR
  getSuppliers: () => fetchJson<Supplier[]>('/api/suppliers'),
  createSupplier: (data: Partial<Supplier>, performedBy: string) => fetchJson<Supplier>('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateSupplier: (id: string, updates: Partial<Supplier>, performedBy: string) => fetchJson<Supplier>(`/api/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteSupplier: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/suppliers/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getPurchaseOrders: () => fetchJson<PurchaseOrder[]>('/api/purchase-orders'),
  createPurchaseOrder: (data: Partial<PurchaseOrder>, performedBy: string) => fetchJson<PurchaseOrder>('/api/purchase-orders', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>, performedBy: string) => fetchJson<PurchaseOrder>(`/api/purchase-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  cancelPurchaseOrder: (id: string, reason: string, performedBy: string) => fetchJson<PurchaseOrder>(`/api/purchase-orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, performedBy })
  }),
  sendPurchaseOrder: (id: string, performedBy: string) => fetchJson<PurchaseOrder>(`/api/purchase-orders/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ performedBy })
  }),
  /** Sans `items` : réceptionne d'un coup tout ce qui reste à recevoir. Avec `items` : réception ligne par ligne (partielle ou totale). */
  receivePurchaseOrder: (id: string, performedBy: string, options?: { items?: { itemIndex: number; quantityReceived: number; unitCost?: number }[]; zone?: StockZone; note?: string }) =>
    fetchJson<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ performedBy, ...options })
    }),
  getSupplierInvoices: () => fetchJson<SupplierInvoiceWithDueStatus[]>('/api/supplier-invoices'),
  createSupplierInvoice: (data: Partial<SupplierInvoice>, performedBy: string) => fetchJson<SupplierInvoice>('/api/supplier-invoices', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateSupplierInvoice: (id: string, updates: Partial<SupplierInvoice>, performedBy: string) => fetchJson<SupplierInvoice>(`/api/supplier-invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  cancelSupplierInvoice: (id: string, reason: string, performedBy: string) => fetchJson<SupplierInvoice>(`/api/supplier-invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, performedBy })
  }),
  deleteSupplierInvoice: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/supplier-invoices/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  paySupplierInvoice: (id: string, amount: number, paymentMethod: string, performedBy: string, notes?: string) => fetchJson<SupplierInvoice>(`/api/supplier-invoices/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod, performedBy, notes })
  }),
  // Correspondances Produits (libellé facture fournisseur ↔ ingrédient de stock)
  getProductMappings: (supplierId?: string) => fetchJson<ProductLabelMapping[]>(`/api/product-mappings${supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : ''}`),
  upsertProductMapping: (data: { supplierId: string; supplierName: string; rawLabel: string; ingredientId: string; ingredientName: string }, performedBy: string) =>
    fetchJson<ProductLabelMapping>('/api/product-mappings', {
      method: 'POST',
      body: JSON.stringify({ ...data, performedBy })
    }),
  updateProductMapping: (id: string, updates: { ingredientId: string; ingredientName: string }, performedBy: string) =>
    fetchJson<ProductLabelMapping>(`/api/product-mappings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...updates, performedBy })
    }),
  recordProductMappingUsage: (id: string) => fetchJson<{ success: boolean }>(`/api/product-mappings/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({})
  }),
  deleteProductMapping: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/product-mappings/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  analyzeInvoiceOCR: (payload: { imageBase64?: string; text?: string; mimeType?: string }) => fetchJson<any>('/api/ocr/analyze-invoice', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getIngredientPurchaseHistory: (ingredientId: string) => fetchJson<IngredientPurchaseHistoryEntry[]>(`/api/ingredients/${ingredientId}/purchase-history`),

  // Expenses
  getExpenses: () => fetchJson<Expense[]>('/api/expenses'),
  createExpense: (data: Partial<Expense>, performedBy: string) => fetchJson<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  updateExpense: (id: string, updates: Partial<Expense>, performedBy: string) => fetchJson<Expense>(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteExpense: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/expenses/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),
  getExpenseCategories: () => fetchJson<ExpenseCategory[]>('/api/expense-categories'),
  createExpenseCategory: (name: string, performedBy: string) => fetchJson<ExpenseCategory>('/api/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ name, performedBy })
  }),
  updateExpenseCategory: (id: string, updates: { name?: string; active?: boolean }, performedBy: string) => fetchJson<ExpenseCategory>(`/api/expense-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, performedBy })
  }),
  deleteExpenseCategory: (id: string, performedBy: string) => fetchJson<{ success: boolean }>(`/api/expense-categories/${id}?performedBy=${encodeURIComponent(performedBy)}`, {
    method: 'DELETE'
  }),

  // Reports, Alerts & Journal
  getFinancialReport: (days = 30) => fetchJson<any>(`/api/reports/financial?days=${days}`),
  getAlerts: () => fetchJson<SystemAlert[]>('/api/alerts'),
  markAlertRead: (id: string) => fetchJson<{ success: boolean }>(`/api/alerts/${id}/read`, { method: 'PATCH' }),
  markAllAlertsRead: () => fetchJson<{ success: boolean }>('/api/alerts/read-all', { method: 'POST' }),
  getJournal: () => fetchJson<JournalEntry[]>('/api/journal'),
  getJournalLogs: () => fetchJson<JournalEntry[]>('/api/journal'),

  getOrder: (id: string) => fetchJson<Order>(`/api/orders/${id}`),
  createOrder: (data: any) => fetchJson<Order>('/api/orders/qr', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getWasteRecords: () => fetchJson<StockWaste[]>('/api/stock/wastes'),
  createStockMovement: (data: any, performedBy = 'Admin') => fetchJson<StockMovement>('/api/stock/manual-entry', {
    method: 'POST',
    body: JSON.stringify({ ...data, performedBy })
  }),
  exportProductsCsv: async () => {
    const products = await fetchJson<Product[]>('/api/products');
    const headers = ['Nom', 'Catégorie', 'Prix TTC', 'TVA %', 'Station', 'Disponible'];
    const rows = products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.categoryId}"`,
      p.price.toFixed(2),
      p.tvaRate.toString(),
      p.preparationStation,
      p.available ? '1' : '0'
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  },

  // App Settings
  getSettings: () => fetchJson<{ recipeRangeCalcMode: 'max' | 'median' | 'min'; defaultExpiryAlertLeadDays: number }>('/api/settings'),
  updateSettings: (updates: { recipeRangeCalcMode?: 'max' | 'median' | 'min'; defaultExpiryAlertLeadDays?: number }, performedBy: string) =>
    fetchJson<{ recipeRangeCalcMode: 'max' | 'median' | 'min'; defaultExpiryAlertLeadDays: number }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ ...updates, performedBy })
    })
};
