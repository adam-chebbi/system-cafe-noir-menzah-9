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

/** Employee HR record. Never a login account — this application has a single administrator identity (see User). */
export interface EmployeeRecord {
  id: string;
  name: string;
  phone: string;
  position: string;
  entryDate: string; // YYYY-MM-DD
  active: boolean;
  photoUrl?: string;
  baseSalary: number;
  cinNumber: string;
  cinIssueDate: string; // YYYY-MM-DD
  cinCopyUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'rest' | 'late';

/** One manually-entered planning & presence record per employee per day. Attendance is 100% manual: no clock, no biometrics. */
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  plannedStartTime?: string; // HH:mm
  plannedEndTime?: string; // HH:mm
  notes?: string;
}

export interface PersonnelFinancialRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  baseSalary: number;
  advances: number;
  bonuses: number;
  deductions: number;
  amountPaid: number;
  paymentDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  parentId?: string;
}

/** Zones fixes de stockage V1 — aucune autre zone ne peut être créée. */
export type StockZone = 'reserve_principale' | 'depot';

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'kg' | 'ml' | 'cl' | 'L' | 'unit' | 'portion';
  /** Stock détaillé par zone — source de vérité. */
  stockByZone: Record<StockZone, number>;
  /** Total (somme des zones), recalculé à chaque mutation. Conservé pour compat avec dashboard/reports. */
  currentStock: number;
  minStockThreshold: number;
  /** Stock cible (objectif de réapprovisionnement), informatif. */
  targetStock?: number;
  costPerUnit: number; // Coût Moyen Pondéré (CMP), en Dinar Tunisien (DT) par unité
  supplierId?: string;
  category: 'coffee' | 'milk_dairy' | 'syrup' | 'bakery' | 'fresh' | 'packaging' | 'beverage';
  imageUrl?: string;
  /** Gestion des lots/péremptions activable par produit. */
  trackLots?: boolean;
  /** Délai d'alerte péremption (jours) propre à ce produit ; sinon le défaut global s'applique. */
  expiryAlertLeadDays?: number;
  updatedAt: string;
}

export interface RecipeIngredient {
  /** 'ingredient' (défaut) ou 'subrecipe' (fiche technique d'un autre produit utilisée comme composant). */
  type?: 'ingredient' | 'subrecipe';
  /** Renseigné uniquement si type === 'subrecipe' : productId de la sous-recette utilisée. */
  subRecipeProductId?: string;
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
  productName?: string;
  portionYield: number;
  preparationTimeMinutes: number;
  ingredients: RecipeIngredient[];
  totalIngredientsCost: number;
  suggestedSellingPrice: number;
  /** Marge cible SAISIE PAR L'UTILISATEUR (objectif). Ne jamais écraser avec la marge calculée. */
  targetMarginPercentage: number;
  /** Marge réelle CALCULÉE automatiquement (prix de vente vs coût matière). Jamais saisie manuellement. */
  actualMarginPercentage?: number;
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
  subCategoryId?: string;
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
  unitPrice?: number;
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
  /** Legacy imported rows may use this alias; new sales use productName. */
  name?: string;
  productId?: string;
  productName?: string;
  variant?: string;
  quantity: number;
  unitPrice?: number;
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
  consumptionType?: ConsumptionType;
  ticketCount?: number;
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
  type: 'in_reception' | 'out_sale' | 'out_waste' | 'adjustment_inventory' | 'adjustment_manual' | 'transfer';
  /** Zone concernée par CETTE ligne de mouvement (un transfert génère 2 lignes, une par zone). */
  zone: StockZone;
  quantity: number; // positive for addition, negative for deduction
  unit: string;
  previousStock: number; // solde de la zone AVANT ce mouvement
  newStock: number; // solde de la zone APRÈS ce mouvement
  unitCost: number;
  totalValue: number;
  /** D'où vient la quantité (fournisseur, zone source d'un transfert, etc.) */
  origin?: string;
  /** Où va la quantité (zone destination d'un transfert, etc.) */
  destination?: string;
  referenceDoc?: string; // Order #, Invoice #, Inventory #
  reason?: string;
  comment?: string;
  /** Pour un transfert : id du mouvement jumeau (l'autre zone). */
  linkedMovementId?: string;
  /** Lot concerné si la réception a créé/alimenté un lot. */
  lotId?: string;
  /** Fournisseur à l'origine d'une réception — permet l'historique des prix d'achat par fournisseur. */
  supplierId?: string;
  supplierName?: string;
  performedBy: string;
  createdAt: string;
}

export interface StockWaste {
  id: string;
  ingredientId?: string;
  ingredientName: string;
  productId?: string;
  productName?: string;
  zone: StockZone;
  quantity: number;
  unit: string;
  estimatedCost: number;
  reason: 'perte' | 'casse' | 'peremption' | 'consommation_interne' | 'produit_offert' | 'erreur_preparation' | 'ajustement_inventaire' | 'autre';
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface InventoryItem {
  ingredientId: string;
  ingredientName: string;
  zone: StockZone;
  unit: string;
  expectedStock: number;
  countedStock: number;
  difference: number;
  unitCost: number;
  differenceValue: number;
  /** Choix manuel de l'administrateur pour CETTE ligne : ajuster le stock réel (true) ou garder le théorique (false). */
  applyAdjustment: boolean;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  auditNumber: string;
  date: string;
  performedBy: string;
  status: 'draft' | 'validated';
  scopeType: 'full' | 'category' | 'zone';
  scopeCategory?: Ingredient['category'];
  scopeZone?: StockZone;
  items: InventoryItem[];
  totalExpectedValue: number;
  totalCountedValue: number;
  totalDifferenceValue: number;
  createdAt: string;
  validatedAt?: string;
}

export interface StockLot {
  id: string;
  ingredientId: string;
  ingredientName: string;
  zone: StockZone;
  lotNumber: string;
  /** Optionnelle : certains lots n'ont pas de péremption pertinente. */
  expirationDate?: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  /** Statut manuel (ouverture/fermeture) — le statut "périmé/bientôt périmé" est calculé à la lecture, jamais stocké ici. */
  status: 'active' | 'archived';
  notes?: string;
  receivedBy: string;
  createdAt: string;
  sourceMovementId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  whatsapp?: string;
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
  /** Quantité déjà reçue, cumulée sur toutes les réceptions de ce bon. */
  receivedQuantity?: number;
}

export interface PurchaseOrderReceptionItem {
  ingredientId?: string;
  itemName: string;
  unit: string;
  quantityReceived: number;
  unitCost: number;
}

/** Une commande peut être livrée en plusieurs fois : chaque réception est conservée pour l'historique. */
export interface PurchaseOrderReception {
  id: string;
  date: string;
  zone: StockZone;
  items: PurchaseOrderReceptionItem[];
  note?: string;
  performedBy: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  receptions: PurchaseOrderReception[];
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
  /** Comment l'ingrédient a été associé à cette ligne — trace d'audit, jamais utilisé pour du calcul. */
  matchSource?: 'mapping' | 'similarity' | 'manual' | 'none';
}

/**
 * Correspondance réutilisable entre le libellé exact d'un article tel qu'imprimé sur les factures
 * d'un fournisseur donné et l'un de nos ingrédients de stock. Permet de ne plus jamais avoir à
 * rattacher manuellement le même article à chaque nouvelle facture de ce fournisseur.
 */
export interface ProductLabelMapping {
  id: string;
  supplierId: string;
  supplierName: string;
  /** Libellé exact tel qu'il apparaît sur la facture (affichage, non modifié). */
  rawLabel: string;
  /** Version normalisée (minuscules, sans accents, espaces compactés) utilisée pour la recherche exacte. */
  normalizedLabel: string;
  ingredientId: string;
  ingredientName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Nombre de fois où cette correspondance a été appliquée automatiquement sur une facture. */
  timesApplied: number;
}

export interface SupplierInvoicePayment {
  id: string;
  amount: number;
  method: string;
  date: string;
  performedBy: string;
  notes?: string;
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  /** Facture liée à un bon de commande, ou créée indépendamment si absent. */
  purchaseOrderId?: string;
  invoiceDate: string;
  dueDate: string;
  items: SupplierInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalTTC?: number;
  totalAmount: number;
  /** Montant réglé cumulé (toutes les entrées de `payments`). */
  paidAmount: number;
  payments: SupplierInvoicePayment[];
  paymentStatus: 'unpaid' | 'paid' | 'partially_paid';
  paymentDate?: string;
  paymentMethod?: string;
  /** Zone de stock alimentée si `stockUpdated` — conservée pour pouvoir annuler proprement. */
  stockZone?: StockZone;
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

/** Catégorie de dépense, adaptable par l'administrateur (remplace l'ancienne liste figée). */
export interface ExpenseCategory {
  id: string;
  name: string;
  /** Désactivée = n'apparaît plus au choix pour une nouvelle dépense, mais reste affichée sur l'historique existant. */
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  /** Référence à ExpenseCategory.id. */
  category: string;
  title: string;
  description?: string;
  amount: number;
  tvaAmount: number;
  date: string;
  /** Fixe (loyer, abonnements...) ou variable (entretien ponctuel, achats...). */
  expenseType: 'fixed' | 'variable';
  /** Dépense récurrente (ex. loyer mensuel) — jamais générée automatiquement, toujours renouvelée manuellement. */
  isRecurring?: boolean;
  recurrenceInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  /** Identifiant commun à toutes les occurrences d'une même récurrence (l'originale + ses renouvellements). */
  recurrenceGroupId?: string;
  /** false = récurrence arrêtée par l'administrateur ; ne relance plus d'échéance "à renouveler". */
  recurrenceActive?: boolean;
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

export interface SystemAlert {
  id: string;
  type: 'new_qr_order' | 'low_stock' | 'table_bill_requested' | 'table_help' | 'inventory_discrepancy' | 'invoice_due' | 'system_event' | 'negative_stock' | 'lot_expiring' | 'lot_expired';
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
  employees: EmployeeRecord[];
  personnelFinancialRecords: PersonnelFinancialRecord[];
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
  stockLots: StockLot[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  supplierInvoices: SupplierInvoice[];
  productLabelMappings: ProductLabelMapping[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  attendances: AttendanceRecord[];
  alerts: SystemAlert[];
  journal: JournalEntry[];
  cashRegisters: CashRegisterSession[];
  cashMovements: CashMovement[];
}
