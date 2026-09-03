import { db } from '../db/database.js';
import { Order, OrderItem, Sale } from '../types/index.js';
import { StockService } from './stockService.js';

export class OrderService {
  public static getOrders(filter?: { status?: string; tableId?: string }): Order[] {
    let orders = db.get('orders') || [];
    if (filter?.status) {
      orders = orders.filter(o => o && o.status === filter.status);
    }
    if (filter?.tableId) {
      orders = orders.filter(o => o && o.tableId === filter.tableId);
    }
    return orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  public static getOrderById(id: string): Order | undefined {
    return (db.get('orders') || []).find(o => o && o.id === id);
  }

  /**
   * QR Customer submits an order from Table QR session
   */
  public static createQROrder(data: {
    tableId: string;
    customerName: string;
    customerPhone?: string;
    items: { productId: string; quantity: number; options?: { optionName: string; choiceName: string; priceModifier: number }[]; notes?: string }[];
    specialNotes?: string;
  }): Order {
    const tables = db.get('tables') || [];
    const products = db.get('products') || [];
    const spaces = db.get('spaces') || [];
    const orders = db.get('orders') || [];

    const table = tables.find(t => t.id === data.tableId);
    if (!table) throw new Error('Table invalide ou introuvable.');

    const space = spaces.find(s => s.id === table.spaceId);

    let subtotal = 0;
    let totalTva = 0;
    const orderItems: OrderItem[] = [];

    for (const itemInput of data.items) {
      const prod = products.find(p => p.id === itemInput.productId);
      if (!prod) throw new Error(`Produit introuvable: ${itemInput.productId}`);
      if (!prod.available) throw new Error(`Le produit ${prod.name} n'est pas disponible.`);

      let unitPrice = prod.price;
      const appliedOptions = itemInput.options || [];
      for (const opt of appliedOptions) {
        unitPrice += (opt.priceModifier || 0);
      }
      unitPrice = Number(unitPrice.toFixed(2));
      const lineTotal = Number((unitPrice * itemInput.quantity).toFixed(2));

      const itemBase = lineTotal / (1 + (prod.tvaRate / 100));
      const itemTax = lineTotal - itemBase;

      subtotal += itemBase;
      totalTva += itemTax;

      orderItems.push({
        id: `itm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: prod.id,
        productName: prod.name,
        unitPrice,
        quantity: itemInput.quantity,
        options: appliedOptions,
        notes: itemInput.notes,
        station: prod.preparationStation,
        totalPrice: lineTotal,
        status: 'pending'
      });
    }

    const orderNumber = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const total = Number((subtotal + totalTva).toFixed(2));

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      orderNumber,
      source: 'qr_table',
      tableId: table.id,
      tableNumber: table.number,
      spaceName: space?.name || '',
      sessionId: `sess_${table.id}_${Date.now()}`,
      customerName: data.customerName || `Client Table ${table.number}`,
      customerPhone: data.customerPhone,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      tvaAmount: Number(totalTva.toFixed(2)),
      discountAmount: 0,
      total,
      status: 'pending_approval',
      paymentStatus: 'unpaid',
      specialNotes: data.specialNotes,
      stockDeducted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    db.set('orders', orders);

    db.createAlert(
      'new_qr_order',
      `Nouvelle Commande QR - Table ${table.number}`,
      `${orderItems.length} article(s) pour un total de ${total.toFixed(3)} DT (${space?.name || 'Salle'})`,
      'warning',
      '/pos',
      { orderId: newOrder.id, tableId: table.id, tableNumber: table.number }
    );

    db.logAudit(
      'Commande QR Créée',
      'orders',
      `Commande ${orderNumber} (${total.toFixed(3)} DT) créée pour Table ${table.number} par ${newOrder.customerName}`,
      'Client QR',
      { orderId: newOrder.id }
    );

    return newOrder;
  }

  /**
   * Create POS / Manual Order by Staff
   */
  public static createPOSOrder(data: {
    tableId?: string;
    customerName?: string;
    customerPhone?: string;
    serverUserId: string;
    serverUserName: string;
    source: 'pos' | 'takeaway';
    items: { productId: string; quantity: number; options?: { optionName: string; choiceName: string; priceModifier: number }[]; notes?: string }[];
    discountAmount?: number;
    discountReason?: string;
    specialNotes?: string;
    launchImmediately?: boolean;
  }): Order {
    const tables = db.get('tables') || [];
    const products = db.get('products') || [];
    const spaces = db.get('spaces') || [];
    const orders = db.get('orders') || [];

    let table: any = null;
    let spaceName = '';
    if (data.tableId) {
      table = tables.find(t => t.id === data.tableId);
      if (table) {
        const space = spaces.find(s => s.id === table.spaceId);
        spaceName = space?.name || '';
      }
    }

    let subtotal = 0;
    let totalTva = 0;
    const orderItems: OrderItem[] = [];

    for (const itemInput of data.items) {
      const prod = products.find(p => p.id === itemInput.productId);
      if (!prod) throw new Error(`Produit introuvable: ${itemInput.productId}`);

      let unitPrice = prod.price;
      const appliedOptions = itemInput.options || [];
      for (const opt of appliedOptions) {
        unitPrice += (opt.priceModifier || 0);
      }
      unitPrice = Number(unitPrice.toFixed(2));
      const lineTotal = Number((unitPrice * itemInput.quantity).toFixed(2));

      const itemBase = lineTotal / (1 + (prod.tvaRate / 100));
      const itemTax = lineTotal - itemBase;

      subtotal += itemBase;
      totalTva += itemTax;

      orderItems.push({
        id: `itm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productId: prod.id,
        productName: prod.name,
        unitPrice,
        quantity: itemInput.quantity,
        options: appliedOptions,
        notes: itemInput.notes,
        station: prod.preparationStation,
        totalPrice: lineTotal,
        status: data.launchImmediately !== false ? 'preparing' : 'pending'
      });
    }

    const discount = data.discountAmount || 0;
    const total = Math.max(0, Number((subtotal + totalTva - discount).toFixed(2)));
    const orderNumber = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      orderNumber,
      source: data.source,
      tableId: table?.id,
      tableNumber: table?.number,
      spaceName,
      serverUserId: data.serverUserId,
      serverUserName: data.serverUserName,
      customerName: data.customerName || (table ? `Table ${table.number}` : 'Vente à emporter'),
      customerPhone: data.customerPhone,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      tvaAmount: Number(totalTva.toFixed(2)),
      discountAmount: discount,
      discountReason: data.discountReason,
      total,
      status: data.launchImmediately !== false ? 'accepted' : 'draft',
      launchedAt: data.launchImmediately !== false ? nowIso : undefined,
      paymentStatus: 'unpaid',
      specialNotes: data.specialNotes,
      stockDeducted: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    orders.unshift(newOrder);

    // Update table status to occupied if table order
    if (table && data.launchImmediately !== false) {
      const tIdx = tables.findIndex(t => t.id === table.id);
      if (tIdx !== -1) {
        tables[tIdx].status = 'occupied';
        tables[tIdx].currentOrderId = newOrder.id;
        db.set('tables', tables);
      }
    }

    db.set('orders', orders);
    db.logAudit(
      'Commande Caisse Créée',
      'orders',
      `Commande ${orderNumber} (${total.toFixed(3)} DT) créée par ${data.serverUserName} (${data.source === 'takeaway' ? 'À emporter' : `Table ${table?.number || ''}`})`,
      data.serverUserName
    );

    return newOrder;
  }

  /**
   * Launch an existing or draft order (Starts timer, marks table occupied, sets status to accepted)
   */
  public static launchOrder(orderId: string, performedBy: string): Order {
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    order.status = 'accepted';
    order.launchedAt = order.launchedAt || new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    order.items.forEach(item => {
      if (item.status === 'pending') item.status = 'preparing';
    });

    if (order.tableId) {
      const tIdx = tables.findIndex(t => t.id === order.tableId);
      if (tIdx !== -1) {
        tables[tIdx].status = 'occupied';
        tables[tIdx].currentOrderId = order.id;
        db.set('tables', tables);
      }
    }

    orders[idx] = order;
    db.set('orders', orders);

    db.logAudit(
      'Lancement Commande',
      'orders',
      `Commande ${order.orderNumber} lancée par ${performedBy} (${order.tableNumber ? `Table ${order.tableNumber}` : 'À emporter'})`,
      performedBy
    );

    return order;
  }

  /**
   * Update active order (add/modify items, discounts, notes, customer name)
   */
  public static updateOrder(
    orderId: string,
    updates: {
      items?: { productId: string; quantity: number; options?: { optionName: string; choiceName: string; priceModifier: number }[]; notes?: string }[];
      discountAmount?: number;
      discountReason?: string;
      specialNotes?: string;
      customerName?: string;
      customerPhone?: string;
    },
    performedBy: string
  ): Order {
    const orders = db.get('orders') || [];
    const products = db.get('products') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];

    if (updates.items) {
      let subtotal = 0;
      let totalTva = 0;
      const orderItems: OrderItem[] = [];

      for (const itemInput of updates.items) {
        const prod = products.find(p => p.id === itemInput.productId);
        if (!prod) continue;

        let unitPrice = prod.price;
        const appliedOptions = itemInput.options || [];
        for (const opt of appliedOptions) {
          unitPrice += (opt.priceModifier || 0);
        }
        unitPrice = Number(unitPrice.toFixed(2));
        const lineTotal = Number((unitPrice * itemInput.quantity).toFixed(2));

        const itemBase = lineTotal / (1 + (prod.tvaRate / 100));
        const itemTax = lineTotal - itemBase;

        subtotal += itemBase;
        totalTva += itemTax;

        orderItems.push({
          id: `itm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: prod.id,
          productName: prod.name,
          unitPrice,
          quantity: itemInput.quantity,
          options: appliedOptions,
          notes: itemInput.notes,
          station: prod.preparationStation,
          totalPrice: lineTotal,
          status: 'preparing'
        });
      }

      order.items = orderItems;
      order.subtotal = Number(subtotal.toFixed(2));
      order.tvaAmount = Number(totalTva.toFixed(2));
    }

    if (updates.discountAmount !== undefined) {
      order.discountAmount = updates.discountAmount;
      order.discountReason = updates.discountReason;
    }

    if (updates.specialNotes !== undefined) order.specialNotes = updates.specialNotes;
    if (updates.customerName) order.customerName = updates.customerName;
    if (updates.customerPhone) order.customerPhone = updates.customerPhone;

    const discount = order.discountAmount || 0;
    order.total = Math.max(0, Number((order.subtotal + order.tvaAmount - discount).toFixed(2)));
    order.updatedAt = new Date().toISOString();

    orders[idx] = order;
    db.set('orders', orders);

    db.logAudit(
      'Modification Commande',
      'orders',
      `Commande ${order.orderNumber} mise à jour par ${performedBy} (Total: ${order.total.toFixed(3)} DT)`,
      performedBy
    );

    return order;
  }

  /**
   * Transfer order to another table
   */
  public static transferOrder(orderId: string, newTableId: string, performedBy: string): Order {
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];
    const spaces = db.get('spaces') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const targetTable = tables.find(t => t.id === newTableId);
    if (!targetTable) throw new Error('Table cible non trouvée.');

    const order = orders[idx];
    const oldTableId = order.tableId;
    const oldTableNumber = order.tableNumber;

    const space = spaces.find(s => s.id === targetTable.spaceId);

    // Free old table if no other active order on it
    if (oldTableId) {
      const remainingOrders = orders.filter(
        o => o.id !== order.id && o.tableId === oldTableId &&
          (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served')
      );
      if (remainingOrders.length === 0) {
        const oldTIdx = tables.findIndex(t => t.id === oldTableId);
        if (oldTIdx !== -1) {
          tables[oldTIdx].status = 'available';
          tables[oldTIdx].currentOrderId = undefined;
        }
      }
    }

    // Occupy new table
    const newTIdx = tables.findIndex(t => t.id === targetTable.id);
    if (newTIdx !== -1) {
      tables[newTIdx].status = 'occupied';
      tables[newTIdx].currentOrderId = order.id;
    }

    order.tableId = targetTable.id;
    order.tableNumber = targetTable.number;
    order.spaceName = space?.name || '';
    order.updatedAt = new Date().toISOString();

    orders[idx] = order;
    db.set('tables', tables);
    db.set('orders', orders);

    db.logAudit(
      'Transfert de Table',
      'orders',
      `Commande ${order.orderNumber} transférée de la Table ${oldTableNumber || 'Comptoir'} vers la Table ${targetTable.number} par ${performedBy}`,
      performedBy
    );

    return order;
  }

  /**
   * Cancel an active order
   */
  public static cancelOrder(orderId: string, reason: string, performedBy: string): Order {
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    order.status = 'cancelled';
    order.rejectionReason = reason;
    order.updatedAt = new Date().toISOString();

    if (order.tableId) {
      const activeOtherOrders = orders.filter(
        o => o.tableId === order.tableId && o.id !== order.id &&
          (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served')
      );
      if (activeOtherOrders.length === 0) {
        const tIdx = tables.findIndex(t => t.id === order.tableId);
        if (tIdx !== -1) {
          tables[tIdx].status = 'available';
          tables[tIdx].currentOrderId = undefined;
          db.set('tables', tables);
        }
      }
    }

    orders[idx] = order;
    db.set('orders', orders);

    db.logAudit(
      'Annulation Commande',
      'orders',
      `Commande ${order.orderNumber} annulée par ${performedBy}. Motif: ${reason}`,
      performedBy
    );

    return order;
  }

  /**
   * Staff ACCEPTS a QR Order
   */
  public static acceptOrder(orderId: string, performedBy: string): Order {
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    if (order.status !== 'pending_approval') {
      throw new Error(`La commande est déjà dans l'état: ${order.status}`);
    }

    order.status = 'accepted';
    order.launchedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    order.items.forEach(i => {
      if (i.status === 'pending') i.status = 'preparing';
    });

    if (order.tableId) {
      const tIdx = tables.findIndex(t => t.id === order.tableId);
      if (tIdx !== -1) {
        tables[tIdx].status = 'occupied';
        tables[tIdx].currentOrderId = order.id;
        db.set('tables', tables);
      }
    }

    orders[idx] = order;
    db.set('orders', orders);

    db.logAudit('Validation Commande QR', 'orders', `Commande ${order.orderNumber} (Table ${order.tableNumber}) acceptée par ${performedBy}`, performedBy);

    return order;
  }

  /**
   * Staff REJECTS a QR Order
   */
  public static rejectOrder(orderId: string, rejectionReason: string, performedBy: string): Order {
    const orders = db.get('orders') || [];
    const tables = db.get('tables') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    order.status = 'rejected';
    order.rejectionReason = rejectionReason || 'Rupture de produit ou table non occupée';
    order.updatedAt = new Date().toISOString();

    if (order.tableId) {
      const activeOtherOrders = (orders || []).filter(
        o => o && o.tableId === order.tableId && o.id !== order.id &&
          (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served')
      );
      if (activeOtherOrders.length === 0) {
        const tIdx = tables.findIndex(t => t.id === order.tableId);
        if (tIdx !== -1 && tables[tIdx].status === 'occupied') {
          tables[tIdx].status = 'available';
          tables[tIdx].currentOrderId = undefined;
          db.set('tables', tables);
        }
      }
    }

    orders[idx] = order;
    db.set('orders', orders);

    db.logAudit('Rejet Commande QR', 'orders', `Commande ${order.orderNumber} (Table ${order.tableNumber}) rejetée par ${performedBy}. Motif: ${order.rejectionReason}`, performedBy);

    return order;
  }

  /**
   * Update item status in KDS / Bar station
   */
  public static updateItemStatus(orderId: string, itemId: string, status: OrderItem['status'], performedBy: string): Order {
    const orders = db.get('orders') || [];
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    const item = order.items.find(i => i.id === itemId);
    if (!item) throw new Error('Article non trouvé dans la commande.');

    item.status = status;

    const allReady = order.items.every(i => i.status === 'ready' || i.status === 'served');
    const allServed = order.items.every(i => i.status === 'served');

    if (allServed) {
      order.status = 'served';
    } else if (allReady) {
      order.status = 'ready';
    } else {
      order.status = 'preparing';
    }
    order.updatedAt = new Date().toISOString();

    orders[idx] = order;
    db.set('orders', orders);

    return order;
  }

  /**
   * Complete payment for an order -> Records sale, updates register, deducts stock
   */
  public static processPayment(orderId: string, paymentData: {
    paymentMethod: 'cash' | 'card' | 'contactless' | 'qr_pay' | 'voucher' | 'split';
    splitDetails?: { method: string; amount: number }[];
    amountReceived?: number;
    changeGiven?: number;
    cashierId: string;
    cashierName: string;
  }): { order: Order; sale: Sale } {
    const orders = db.get('orders') || [];
    const sales = db.get('sales') || [];
    const tables = db.get('tables') || [];
    const registers = db.get('cashRegisters') || [];

    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Commande non trouvée.');

    const order = orders[idx];
    order.paymentStatus = 'paid';
    order.paymentMethod = paymentData.paymentMethod;
    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    // Deduct stock if not yet deducted
    if (!order.stockDeducted) {
      for (const item of order.items) {
        StockService.deductStockForProduct(item.productId, item.quantity, order.orderNumber, paymentData.cashierName);
      }
      order.stockDeducted = true;
    }

    // Create Sale record
    const saleNumber = `VNT-${new Date().getFullYear()}-${String(sales.length + 1).padStart(4, '0')}`;
    const sale: Sale = {
      id: `sal_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      saleNumber,
      orderId: order.id,
      tableNumber: order.tableNumber || 'Comptoir',
      source: 'pos',
      subtotal: order.subtotal,
      tvaBreakdown: [
        { rate: 7, base: order.subtotal, tax: order.tvaAmount }
      ],
      totalTva: order.tvaAmount,
      discount: order.discountAmount,
      totalAmount: order.total,
      paymentMethod: paymentData.paymentMethod,
      splitDetails: paymentData.splitDetails,
      amountReceived: paymentData.amountReceived,
      changeGiven: paymentData.changeGiven,
      cashierId: paymentData.cashierId,
      cashierName: paymentData.cashierName,
      itemsSummary: order.items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.totalPrice })),
      createdAt: new Date().toISOString()
    };
    sales.unshift(sale);

    // Update active cash register
    const activeRegister = registers.find(r => r.status === 'open');
    if (activeRegister) {
      if (paymentData.paymentMethod === 'cash') {
        activeRegister.totalSalesCash += order.total;
        activeRegister.expectedClosingCash += order.total;
      } else if (paymentData.paymentMethod === 'card' || paymentData.paymentMethod === 'contactless') {
        activeRegister.totalSalesCard += order.total;
      } else if (paymentData.paymentMethod === 'split' && paymentData.splitDetails) {
        for (const split of paymentData.splitDetails) {
          if (split.method === 'cash') {
            activeRegister.totalSalesCash += split.amount;
            activeRegister.expectedClosingCash += split.amount;
          } else if (split.method === 'card' || split.method === 'contactless') {
            activeRegister.totalSalesCard += split.amount;
          } else {
            activeRegister.totalSalesOther += split.amount;
          }
        }
      } else {
        activeRegister.totalSalesOther += order.total;
      }
      activeRegister.totalSalesAmount += order.total;
      db.set('cashRegisters', registers);
    }

    // Free table if occupied
    if (order.tableId) {
      const remainingOrders = orders.filter(
        o => o.id !== order.id && o.tableId === order.tableId &&
          (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served')
      );
      if (remainingOrders.length === 0) {
        const tIdx = tables.findIndex(t => t.id === order.tableId);
        if (tIdx !== -1) {
          tables[tIdx].status = 'available';
          tables[tIdx].currentOrderId = undefined;
          db.set('tables', tables);
        }
      }
    }

    orders[idx] = order;
    db.set('orders', orders);
    db.set('sales', sales);

    db.logAudit('Encaissement Vente', 'sales', `Vente ${saleNumber} (${order.total.toFixed(3)} DT) encaissée par ${paymentData.cashierName} via ${paymentData.paymentMethod}`, paymentData.cashierName);

    return { order, sale };
  }
}
