import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'barista' | 'server' | 'cashier' | 'cook';
  pin: string;
  phone: string;
  hourlyRate: number;
  active: boolean;
  avatar?: string;
  createdAt: string;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  color: string;
  order: number;
  floor?: string;
  width?: number;
  height?: number;
}

export type TableShape = 'circle' | 'square' | 'rectangle' | 'oval';
export type TableStatus = 'available' | 'occupied' | 'billing' | 'reserved' | 'waiting' | 'inactive';

export interface Table {
  id: string;
  number: string;
  name: string;
  spaceId: string;
  capacity: number;
  status: TableStatus;
  activeSessionId?: string;
  currentOrderId?: string;
  qrCodeUrl?: string;
  posX: number;
  posY: number;
  width?: number;
  height?: number;
  rotation?: number;
  shape: TableShape;
  notes?: string;
}

export interface PlanElement {
  id: string;
  spaceId: string;
  type: 'wall' | 'door' | 'window' | 'plant' | 'counter' | 'bar_station' | 'decor' | 'sofa' | 'divider';
  label?: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  icon?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  tableId: string;
  spaceId?: string;
  guestsCount: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:mm
  status: 'pending' | 'confirmed' | 'cancelled' | 'seated' | 'completed';
  notes?: string;
  createdAt: string;
}

export interface TableHistoryItem {
  id: string;
  tableId: string;
  tableNumber: string;
  action: string;
  category: 'status_change' | 'order' | 'sale' | 'reservation' | 'movement' | 'transfer' | 'qr_order';
  details: string;
  performedBy: string;
  amount?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
  color: string;
  active: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'kg' | 'ml' | 'cl' | 'L' | 'unit' | 'portion';
  currentStock: number;
  minStockThreshold: number;
  costPerUnit: number; // Coût en Dinar Tunisien (DT) par unité
  supplierId?: string;
  category: 'coffee' | 'milk_dairy' | 'syrup' | 'bakery' | 'fresh' | 'packaging' | 'beverage';
  imageUrl?: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  /**
   * Quantité min saisie dans l'unité RECETTE (ex. 18 pour "≈18 g" ou 100 pour "≈100–120 mL").
   */
  quantityMin: number;
  /**
   * Quantité max saisie dans l'unité RECETTE. Non défini = valeur unique.
   */
  quantityMax?: number;
  /**
   * Unité de recette (affichage), indépendante de l'unité de stock.
   */
  recipeUnit: string;
  /**
   * Quantité calculée EN UNITÉ STOCK (après conversion), pour déduction de stock.
   */
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  displayQuantity?: string;
}

export interface TechnicalRecipe {
  id: string;
  productId: string;
  productName: string;
  portionYield: number;
  preparationTimeMinutes: number;
  ingredients: RecipeIngredient[];
  totalIngredientsCost: number;
  suggestedSellingPrice: number;
  targetMarginPercentage: number;
  allergens: string[];
  preparationSteps: string[];
  notes?: string;
  updatedAt: string;
}

export interface ProductOption {
  id: string;
  name: string; // e.g. "Lait", "Taille", "Sirop", "Sucre"
  type: 'single' | 'multiple';
  choices: {
    id: string;
    name: string;
    priceModifier: number;
    ingredientDeduction?: { ingredientId: string; quantity: number };
  }[];
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  tvaRate: number; // e.g. 10 for 10%, 20 for 20%
  imageUrl: string;
  available: boolean;
  isPopular?: boolean;
  isSpecialty?: boolean;
  hasRecipe: boolean;
  options: ProductOption[];
  preparationStation: 'bar' | 'kitchen' | 'counter';
  createdAt: string;
}

export interface OrderItemOption {
  optionName: string;
  choiceName: string;
  priceModifier: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  options: OrderItemOption[];
  notes?: string;
  station: 'bar' | 'kitchen' | 'counter';
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
}

export interface Order {
  id: string;
  orderNumber: string;
  source: 'pos' | 'qr_table' | 'takeaway';
  tableId?: string;
  tableNumber?: string;
  spaceName?: string;
  sessionId?: string;
  serverUserId?: string;
  serverUserName?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  tvaAmount: number;
  discountAmount: number;
  discountReason?: string;
  total: number;
  status: 'draft' | 'pending_approval' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'rejected' | 'cancelled';
  rejectionReason?: string;
  paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
  paymentMethod?: 'cash' | 'card' | 'contactless' | 'qr_pay' | 'voucher' | 'split';
  specialNotes?: string;
  stockDeducted: boolean;
  launchedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type PaymentMethod = 'especes' | 'tpe' | 'ticket_restaurant' | 'cash' | 'card' | 'contactless' | 'qr_pay' | 'voucher' | 'split';
export type ConsumptionType = 'sur_place' | 'a_emporter';

export interface SaleItem {
  productId?: string;
  productName: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
  tvaRate?: number;
  total: number;
}

export interface SaleEditRecord {
  id: string;
  modifiedAt: string;
  modifiedBy: string;
  reason: string;
  previousSnapshot: {
    items: SaleItem[];
    subtotal: number;
    totalAmount: number;
    paymentMethod: string;
    consumptionType: ConsumptionType;
    ticketCount?: number;
    notes?: string;
    saleDate?: string;
  };
  newSnapshot: {
    items: SaleItem[];
    subtotal: number;
    totalAmount: number;
    paymentMethod: string;
    consumptionType: ConsumptionType;
    ticketCount?: number;
    notes?: string;
    saleDate?: string;
  };
}

export interface Sale {
  id: string;
  saleNumber: string;
  orderId?: string;
  tableNumber?: string;
  source?: 'pos' | 'manual' | 'import' | 'retroactive';
  subtotal: number;
  tvaBreakdown: { rate: number; base: number; tax: number }[];
  totalTva: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  consumptionType: ConsumptionType;
  ticketCount: number;
  splitDetails?: { method: string; amount: number }[];
  amountReceived?: number;
  changeGiven?: number;
  cashierId: string;
  cashierName: string;
  notes?: string;
  itemsSummary: SaleItem[];
  editHistory?: SaleEditRecord[];
  cancelled?: boolean;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt?: string;
  // Retroactive / historical document fields
  isRetroactive?: boolean;
  documentDate?: string;
  attachmentUrl?: string;
  referenceNumber?: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'in_reception' | 'out_sale' | 'out_waste' | 'adjustment_inventory' | 'adjustment_manual';
  quantity: number; // positive for addition, negative for deduction
  unit: string;
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalValue: number;
  referenceDoc?: string; // Order #, Invoice #, Inventory #
  reason?: string;
  performedBy: string;
  createdAt: string;
}

export interface StockWaste {
  id: string;
  ingredientId?: string;
  ingredientName: string;
  productId?: string;
  productName?: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  reason: 'expired' | 'damaged' | 'spilled' | 'preparation_error' | 'customer_return' | 'other';
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface InventoryItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedStock: number;
  countedStock: number;
  difference: number;
  unitCost: number;
  differenceValue: number;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  auditNumber: string;
  date: string;
  performedBy: string;
  status: 'draft' | 'validated';
  items: InventoryItem[];
  totalExpectedValue: number;
  totalCountedValue: number;
  totalDifferenceValue: number;
  createdAt: string;
  validatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxNumber?: string;
  category: 'coffee_beans' | 'dairy' | 'beverages' | 'bakery' | 'packaging' | 'maintenance' | 'general';
  paymentTerms: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  ingredientId?: string;
  itemName: string;
  unit: string;
  quantity: number;
  expectedUnitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  receivedAt?: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface SupplierInvoiceItem {
  itemName: string;
  ingredientId?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
  totalLinePrice: number;
  packageFactor?: number;
  convertedStockQuantity?: number;
  targetStockUnit?: string;
  unitCostInStockUnit?: number;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  dueDate: string;
  items: SupplierInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalTTC?: number;
  totalAmount: number;
  paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
  paymentDate?: string;
  paymentMethod?: string;
  attachmentUrl?: string;
  ocrProcessed: boolean;
  ocrRawText?: string;
  stockUpdated: boolean;
  cancelled?: boolean;
  cancelReason?: string;
  createdAt: string;
  // Retroactive / historical document fields
  isRetroactive?: boolean;
  documentDate?: string;
  retroNotes?: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: 'rent' | 'utilities' | 'maintenance' | 'supplies' | 'marketing' | 'salaries' | 'insurance' | 'other';
  title: string;
  description?: string;
  amount: number;
  tvaAmount: number;
  date: string;
  paymentMethod: 'bank_transfer' | 'card' | 'cash' | 'direct_debit';
  paymentStatus: 'paid' | 'pending';
  receiptUrl?: string;
  approvedBy: string;
  createdAt: string;
  // Retroactive / historical document fields
  isRetroactive?: boolean;
  documentDate?: string;
  attachmentUrl?: string;
  retroNotes?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'absent';
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // ISO string or HH:mm
  clockOutTime?: string; // ISO string or HH:mm
  breakMinutes: number;
  totalHoursWorked: number;
  status: 'active' | 'completed' | 'modified';
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'paid_leave' | 'sick' | 'unpaid' | 'special';
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  periodMonth: string; // YYYY-MM
  baseHourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  overtimeRate: number;
  grossSalary: number;
  bonuses: number;
  advancesDeductions: number;
  taxDeductions: number;
  socialContributions: number;
  netSalary: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
  // Retroactive / historical document fields
  isRetroactive?: boolean;
  documentDate?: string;
  attachmentUrl?: string;
  retroNotes?: string;
  cancelled?: boolean;
  cancelReason?: string;
}

export interface SystemAlert {
  id: string;
  type: 'new_qr_order' | 'low_stock' | 'table_bill_requested' | 'table_help' | 'inventory_discrepancy' | 'invoice_due' | 'system_event';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  read: boolean;
  linkUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  action: string;
  category: 'sales' | 'orders' | 'stock' | 'tables' | 'hr' | 'finance' | 'admin';
  details: string;
  performedBy: string;
  userId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  sessionId?: string;
  type: 'deposit' | 'withdrawal' | 'expense';
  amount: number;
  reason: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export interface CashDenominationCount {
  denomination: number;
  label: string;
  type: 'coin' | 'bill';
  count: number;
  subtotal: number;
}

export interface MealVoucherCount {
  issuer: string;
  faceValue: number;
  count: number;
  subtotal: number;
}

export interface CheckedStockItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedStock: number;
  countedStock: number;
  difference: number;
  differenceValue: number;
  isApproximate?: boolean;
  notes?: string;
}

export interface CashRegisterSession {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  cashDifference?: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesOther: number;
  totalSalesAmount: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalExpenses?: number;
  movements?: CashMovement[];
  status: 'open' | 'closed';
  notes?: string;
  // Détail de clôture de service tunisien
  cashDenominations?: CashDenominationCount[];
  mealVouchers?: MealVoucherCount[];
  totalVouchersCount?: number;
  totalVouchersAmount?: number;
  checkedStocks?: CheckedStockItem[];
  closingNotes?: string;
  justificationNotes?: string;
}

export interface ClosingRegisterPayload {
  actualClosingCash: number;
  cashDenominations?: CashDenominationCount[];
  mealVouchers?: MealVoucherCount[];
  totalVouchersCount?: number;
  totalVouchersAmount?: number;
  checkedStocks?: CheckedStockItem[];
  closingNotes?: string;
  justificationNotes?: string;
  newExpenses?: { category: string; title: string; amount: number }[];
  performedBy?: string;
}

export interface DatabaseSchema {
  users: User[];
  spaces: Space[];
  tables: Table[];
  planElements: PlanElement[];
  reservations: Reservation[];
  categories: Category[];
  ingredients: Ingredient[];
  recipes: TechnicalRecipe[];
  products: Product[];
  orders: Order[];
  sales: Sale[];
  stockMovements: StockMovement[];
  stockWastes: StockWaste[];
  inventoryAudits: InventoryAudit[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  supplierInvoices: SupplierInvoice[];
  expenses: Expense[];
  shifts: Shift[];
  attendances: AttendanceRecord[];
  leaves: LeaveRequest[];
  payrolls: PayrollRecord[];
  alerts: SystemAlert[];
  journal: JournalEntry[];
  cashRegisters: CashRegisterSession[];
  cashMovements: CashMovement[];
}
