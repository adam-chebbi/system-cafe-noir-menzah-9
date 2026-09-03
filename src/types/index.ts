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
  reservationDate: string;
  reservationTime: string;
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
  /** Référence à la catégorie parente. Absent = catégorie de premier niveau ; présent = sous-catégorie. */
  parentId?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'kg' | 'ml' | 'cl' | 'L' | 'unit' | 'portion';
  currentStock: number;
  minStockThreshold: number;
  costPerUnit: number;
  supplierId?: string;
  category: 'coffee' | 'milk_dairy' | 'syrup' | 'bakery' | 'fresh' | 'packaging' | 'beverage';
  imageUrl?: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  /**
   * Type de ligne : 'ingredient' (matière première, défaut) ou 'subrecipe' (fiche technique
   * d'un autre produit utilisée comme composant). Absent = 'ingredient' (rétrocompatibilité).
   */
  type?: 'ingredient' | 'subrecipe';
  /** Renseigné uniquement si type === 'subrecipe' : productId de la sous-recette utilisée. */
  subRecipeProductId?: string;
  /** Pour type 'ingredient' : id de l'ingrédient. Pour type 'subrecipe' : non utilisé. */
  ingredientId: string;
  ingredientName: string;
  /**
   * Quantité min saisie dans l'unité RECETTE (ex. 18 pour "≈18 g" ou 100 pour "≈100–120 mL").
   * C'est la valeur unique lorsque quantityMax n'est pas défini.
   */
  quantityMin: number;
  /**
   * Quantité max saisie dans l'unité RECETTE.
   * Non défini → valeur unique ; défini → plage affichée "≈min–max unit".
   */
  quantityMax?: number;
  /**
   * Unité de recette (affichage), indépendante de l'unité de stock.
   * Ex. : "g" alors que le stock est en "kg".
   */
  recipeUnit: string;
  /**
   * Quantité calculée EN UNITÉ STOCK (après conversion), utilisée pour la déduction de stock.
   * Calculée selon le rangeCalcMode actif (max/median/min).
   * Conservé pour rétrocompatibilité et déduction de stock sans modification de logique existante.
   */
  quantity: number;
  /** Unité de stock de l'ingrédient (non modifiable ici, uniquement pour référence). */
  unit: string;
  unitCost: number;
  totalCost: number;
  /**
   * Chaîne d'affichage générée à la volée : ex. "≈18 g" ou "≈100–120 mL".
   * Non persistée en base — recalculée au chargement.
   */
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
  /** Marge cible SAISIE PAR L'UTILISATEUR (objectif). Ne jamais écraser avec la marge calculée. */
  targetMarginPercentage: number;
  /** Marge réelle CALCULÉE automatiquement à partir du prix de vente et du coût matière. Toujours recalculée côté serveur, jamais saisie manuellement. */
  actualMarginPercentage?: number;
  allergens: string[];
  preparationSteps: string[];
  notes?: string;
  updatedAt: string;
}

export interface ProductOptionChoice {
  id: string;
  name: string;
  priceModifier: number;
  ingredientDeduction?: { ingredientId: string; quantity: number };
}

export interface ProductOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  choices: ProductOptionChoice[];
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  subCategoryId?: string;
  description: string;
  price: number;
  tvaRate: number;
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
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  unitCost: number;
  totalValue: number;
  referenceDoc?: string;
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

export interface IngredientConsumptionSummary {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  unitCost: number;
  theoreticalQuantityConsumed: number;
  valueConsumed: number;
  productBreakdown: { productId: string; productName: string; soldQuantity: number; consumedQuantity: number }[];
}

export interface TheoreticalConsumptionReport {
  startDate: string | null;
  endDate: string | null;
  ingredients: IngredientConsumptionSummary[];
  skippedSalesLines: number;
  skippedNoRecipeCount: number;
  skippedNoRecipeProducts: string[];
}

export interface IngredientTheoreticalStock {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  unitCost: number;
  referenceDate: string;
  referenceStock: number;
  referenceSource: 'audit' | 'no_audit_baseline';
  movementsAdjustment: number;
  theoreticalConsumptionSinceReference: number;
  theoreticalStock: number;
  currentLedgerStock: number;
  ledgerDrift: number;
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
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'absent';
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
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
  periodMonth: string;
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
  denomination: number; // valeur en DT (ex: 0.050, 0.100, 0.500, 1.000, 5.000, 10.000, 20.000, 50.000)
  label: string;        // libellé affiché (ex: "50 millimes", "½ DT", "Billet 20 DT")
  type: 'coin' | 'bill';
  count: number;        // quantité physique comptée
  subtotal: number;     // count * denomination
}

export interface MealVoucherCount {
  issuer: string;       // "Sodexo", "Edenred", "Cadhoc", "Autre"
  faceValue: number;    // valeur faciale en DT (ex: 5.000, 7.000, 8.000, 10.000)
  count: number;        // nombre de tickets
  subtotal: number;     // count * faceValue
}

export interface CheckedStockItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedStock: number;
  countedStock: number;
  difference: number;       // counted - expected
  differenceValue: number;  // difference * unitCost
  isApproximate?: boolean;  // true si basé sur des recettes avec plages ≈
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

export type Employee = User;
export type WasteRecord = StockWaste;
export type JournalLog = JournalEntry;

export type ViewMode =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'products'
  | 'categories'
  | 'ingredients'
  | 'recipes'
  | 'csv_import'
  | 'stock'
  | 'stock_movements'
  | 'stock_wastes'
  | 'inventory_audit'
  | 'suppliers'
  | 'purchase_orders'
  | 'supplier_invoices'
  | 'ocr_invoice'
  | 'expenses'
  | 'employees'
  | 'hr'
  | 'attendance'
  | 'planning'
  | 'leaves'
  | 'payroll'
  | 'performance'
  | 'tables'
  | 'reservations'
  | 'reports'
  | 'journal'
  | 'alerts'
  | 'public_site'
  | 'public_website'
  | 'qr_customer_order';
