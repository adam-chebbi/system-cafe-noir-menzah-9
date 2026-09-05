import { db } from '../db/database.js';
import { Supplier, PurchaseOrder, PurchaseOrderReception, PurchaseOrderReceptionItem, SupplierInvoice, SupplierInvoicePayment, StockZone } from '../types/index.js';
import { StockService } from './stockService.js';
import { summarizeChanges } from '../utils/audit.js';

/** Délai (jours) avant échéance à partir duquel une facture est signalée "échéance proche". */
const INVOICE_DUE_SOON_LEAD_DAYS = 5;

const SUPPLIER_TRACKED_FIELDS = [
  { key: 'name', label: 'Nom' },
  { key: 'active', label: 'Actif' },
  { key: 'paymentTerms', label: 'Conditions de paiement' }
];

const PURCHASE_ORDER_TRACKED_FIELDS = [
  { key: 'status', label: 'Statut' },
  { key: 'totalAmount', label: 'Montant', format: (v: number) => `${v.toFixed(3)} DT` }
];

const INVOICE_TRACKED_FIELDS = [
  { key: 'paymentStatus', label: 'Statut de paiement' },
  { key: 'dueDate', label: 'Échéance' },
  { key: 'totalAmount', label: 'Montant', format: (v: number) => `${v.toFixed(3)} DT` }
];

export class SupplierService {
  public static getSuppliers(): Supplier[] {
    return db.get('suppliers');
  }

  public static createSupplier(data: Omit<Supplier, 'id' | 'createdAt'>, performedBy: string): Supplier {
    const suppliers = db.get('suppliers');
    const newSupplier: Supplier = {
      ...data,
      id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    suppliers.push(newSupplier);
    db.set('suppliers', suppliers);
    db.logAudit('Création Fournisseur', 'admin', `Ajout du fournisseur ${newSupplier.name}`, performedBy);
    return newSupplier;
  }

  public static updateSupplier(id: string, updates: Partial<Supplier>, performedBy: string): Supplier {
    const suppliers = db.get('suppliers');
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Fournisseur non trouvé');
    const before = suppliers[idx];
    suppliers[idx] = { ...before, ...updates };
    db.set('suppliers', suppliers);
    const changes = summarizeChanges(before, suppliers[idx], SUPPLIER_TRACKED_FIELDS);
    db.logAudit('Mise à jour Fournisseur', 'admin', `Modification du fournisseur ${suppliers[idx].name}`, performedBy, changes);
    return suppliers[idx];
  }

  public static deleteSupplier(id: string, performedBy: string): void {
    const suppliers = db.get('suppliers');
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Fournisseur non trouvé');
    const supName = suppliers[idx].name;
    // Soft-delete by setting active: false — préserve l'historique des commandes/factures liées.
    suppliers[idx].active = false;
    db.set('suppliers', suppliers);
    db.logAudit('Désactivation Fournisseur', 'admin', `Désactivation du fournisseur ${supName}`, performedBy);
  }

  // ── Purchase Orders (Commandes Fournisseurs) ──

  public static getPurchaseOrders(): PurchaseOrder[] {
    return db.get('purchaseOrders');
  }

  public static createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'receptions'>, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const orderNumber = `BC-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...data,
      items: data.items.map(item => ({ ...item, receivedQuantity: item.receivedQuantity || 0 })),
      status: data.status || 'draft',
      receptions: [],
      id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      orderNumber,
      createdAt: new Date().toISOString()
    };
    orders.unshift(newPO);
    db.set('purchaseOrders', orders);
    db.logAudit('Bon de Commande Fournisseur', 'stock', `Création du bon de commande ${orderNumber} (${data.supplierName} - ${data.totalAmount.toFixed(3)} DT) — statut : ${newPO.status}`, performedBy);
    return newPO;
  }

  public static updatePurchaseOrder(poId: string, updates: Partial<PurchaseOrder>, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const before = orders[idx];
    orders[idx] = { ...before, ...updates };
    db.set('purchaseOrders', orders);
    const changes = summarizeChanges(before, orders[idx], PURCHASE_ORDER_TRACKED_FIELDS);
    db.logAudit('Modification Bon de Commande', 'stock', `Modification du bon ${orders[idx].orderNumber}`, performedBy, changes);
    return orders[idx];
  }

  /** Passe un bon de commande de "Brouillon" à "Commandée" (envoyée au fournisseur). */
  public static sendPurchaseOrder(poId: string, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const po = orders[idx];
    if (po.status !== 'draft') throw new Error('Seul un bon de commande en brouillon peut être envoyé au fournisseur.');
    po.status = 'sent';

    orders[idx] = po;
    db.set('purchaseOrders', orders);
    db.logAudit('Envoi Bon de Commande', 'stock', `Bon ${po.orderNumber} envoyé au fournisseur ${po.supplierName}`, performedBy);
    return po;
  }

  public static cancelPurchaseOrder(poId: string, reason: string, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const po = orders[idx];
    if (po.status === 'received') throw new Error('Impossible d\'annuler un bon de commande déjà entièrement reçu.');
    po.status = 'cancelled';
    po.cancelReason = reason;
    po.cancelledAt = new Date().toISOString();
    po.cancelledBy = performedBy;

    orders[idx] = po;
    db.set('purchaseOrders', orders);
    db.logAudit('Annulation Bon de Commande', 'stock', `Annulation du bon ${po.orderNumber} : ${reason}`, performedBy);
    return po;
  }

  /**
   * Réception partielle ou totale d'un bon de commande : une commande peut être livrée en plusieurs
   * fois, chaque réception incrémente les quantités reçues par ligne et alimente le stock de la zone
   * choisie. Le statut du bon (Partiellement reçue / Reçue) est recalculé automatiquement.
   */
  public static receivePurchaseOrderPartial(
    poId: string,
    receivedItems: { itemIndex: number; quantityReceived: number; unitCost?: number }[],
    zone: StockZone,
    performedBy: string,
    note?: string
  ): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const po = orders[idx];
    if (po.status !== 'sent' && po.status !== 'partially_received') {
      throw new Error(`Impossible de réceptionner un bon de commande au statut "${po.status}".`);
    }

    const ingredients = db.get('ingredients');
    const receptionItems: PurchaseOrderReceptionItem[] = [];

    for (const recv of receivedItems) {
      if (!recv || recv.quantityReceived <= 0) continue;
      const item = po.items[recv.itemIndex];
      if (!item) continue;

      let targetIngId = item.ingredientId;
      if (!targetIngId) {
        const match = ingredients.find(i => i.name.toLowerCase() === item.itemName.toLowerCase());
        if (match) targetIngId = match.id;
      }

      const unitCost = recv.unitCost && recv.unitCost > 0 ? recv.unitCost : item.expectedUnitCost;

      if (targetIngId) {
        StockService.addStock({
          ingredientId: targetIngId,
          quantity: recv.quantityReceived,
          unitCost,
          referenceDoc: po.orderNumber,
          reason: `Réception commande fournisseur ${po.supplierName}`,
          performedBy,
          zone,
          comment: note,
          supplierId: po.supplierId,
          supplierName: po.supplierName
        });
      }

      item.receivedQuantity = Number(((item.receivedQuantity || 0) + recv.quantityReceived).toFixed(4));
      receptionItems.push({
        ingredientId: targetIngId,
        itemName: item.itemName,
        unit: item.unit,
        quantityReceived: recv.quantityReceived,
        unitCost
      });
    }

    if (receptionItems.length === 0) {
      throw new Error('Aucune quantité valide à réceptionner.');
    }

    const reception: PurchaseOrderReception = {
      id: `rcp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: new Date().toISOString().split('T')[0],
      zone,
      items: receptionItems,
      note,
      performedBy,
      createdAt: new Date().toISOString()
    };
    po.receptions = [...(po.receptions || []), reception];

    const fullyReceived = po.items.every(i => (i.receivedQuantity || 0) >= i.quantity);
    const anyReceived = po.items.some(i => (i.receivedQuantity || 0) > 0);
    po.status = fullyReceived ? 'received' : anyReceived ? 'partially_received' : po.status;
    if (fullyReceived) po.receivedAt = new Date().toISOString();

    orders[idx] = po;
    db.set('purchaseOrders', orders);
    db.logAudit('Réception Commande Fournisseur', 'stock', `Réception du bon ${po.orderNumber} (${receptionItems.length} ligne(s), zone : ${zone}) — statut : ${po.status}`, performedBy);
    return po;
  }

  /** Réceptionne en une fois tout ce qui reste à recevoir sur le bon (raccourci pratique). */
  public static receivePurchaseOrder(poId: string, performedBy: string, zone: StockZone = 'reserve_principale'): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const po = orders.find(p => p.id === poId);
    if (!po) throw new Error('Bon de commande non trouvé');

    const receivedItems = po.items
      .map((item, itemIndex) => ({
        itemIndex,
        quantityReceived: Number((item.quantity - (item.receivedQuantity || 0)).toFixed(4))
      }))
      .filter(r => r.quantityReceived > 0);

    return this.receivePurchaseOrderPartial(poId, receivedItems, zone, performedBy);
  }

  // ── Supplier Invoices ──

  private static invoiceTotal(invoice: SupplierInvoice): number {
    return invoice.totalTTC || invoice.totalAmount;
  }


  /**
   * Retourne les factures avec un état d'échéance calculé à la lecture (jamais stocké) : le
   * "retard"/"échéance proche" doit toujours refléter la date du jour, pas celle de la dernière
   * modification de la facture.
   */
  public static getInvoices(): (SupplierInvoice & { daysUntilDue: number; isOverdue: boolean; isDueSoon: boolean })[] {
    const invoices = db.get('supplierInvoices');
    return invoices.map(inv => {
      const daysUntilDue = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86400000);
      const unpaid = inv.paymentStatus !== 'paid' && !inv.cancelled;
      return {
        ...inv,
        daysUntilDue,
        isOverdue: unpaid && daysUntilDue < 0,
        isDueSoon: unpaid && daysUntilDue >= 0 && daysUntilDue <= INVOICE_DUE_SOON_LEAD_DAYS
      };
    });
  }

  public static createInvoice(data: Omit<SupplierInvoice, 'id' | 'createdAt' | 'paidAmount' | 'payments'>, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const zone: StockZone = data.stockZone || 'reserve_principale';
    const invoice: SupplierInvoice = {
      ...data,
      stockZone: data.stockUpdated ? zone : data.stockZone,
      paidAmount: 0,
      payments: [],
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };

    // Mise à jour du stock si demandé (facultatif — décoché pour une facture purement comptable)
    if (data.stockUpdated) {
      const ingredients = db.get('ingredients');
      for (const item of data.items) {
        let ingId = item.ingredientId;
        if (!ingId) {
          const match = ingredients.find(i => i.name.toLowerCase() === item.itemName.toLowerCase());
          if (match) ingId = match.id;
        }
        if (ingId) {
          const qtyToAdd = item.convertedStockQuantity !== undefined && item.convertedStockQuantity > 0
            ? item.convertedStockQuantity
            : item.quantity;
          const unitCost = item.unitCostInStockUnit !== undefined && item.unitCostInStockUnit > 0
            ? item.unitCostInStockUnit
            : (item.quantity > 0 && qtyToAdd > 0 ? (item.totalLinePrice / qtyToAdd) : item.unitPrice);

          StockService.addStock({
            ingredientId: ingId,
            quantity: qtyToAdd,
            unitCost,
            referenceDoc: invoice.invoiceNumber,
            reason: `Facture fournisseur ${invoice.supplierName} (${item.quantity} ${item.unit})`,
            performedBy,
            zone,
            supplierId: invoice.supplierId,
            supplierName: invoice.supplierName
          });
        }
      }
    }

    invoices.unshift(invoice);
    db.set('supplierInvoices', invoices);
    db.logAudit('Enregistrement Facture Fournisseur', 'finance', `Facture ${invoice.invoiceNumber} (${invoice.supplierName} - ${invoice.totalAmount.toFixed(3)} DT)${data.isRetroactive ? ' [Historique]' : ''}`, performedBy);

    return invoice;
  }

  public static updateInvoice(invoiceId: string, updates: Partial<SupplierInvoice>, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const before = invoices[idx];
    invoices[idx] = { ...before, ...updates };
    db.set('supplierInvoices', invoices);
    const changes = summarizeChanges(before, invoices[idx], INVOICE_TRACKED_FIELDS);
    db.logAudit('Modification Facture Fournisseur', 'finance', `Modification de la facture ${invoices[idx].invoiceNumber}`, performedBy, changes);
    return invoices[idx];
  }

  /** Retire du stock ce qu'une facture avait apporté, avant annulation/suppression (jamais de désynchronisation silencieuse). */
  private static reverseInvoiceStock(invoice: SupplierInvoice, performedBy: string, contextLabel: string): void {
    if (!invoice.stockUpdated) return;
    const ingredients = db.get('ingredients');
    const zone: StockZone = invoice.stockZone || 'reserve_principale';

    for (const item of invoice.items) {
      let ingId = item.ingredientId;
      if (!ingId) {
        const match = ingredients.find(i => i.name.toLowerCase() === item.itemName.toLowerCase());
        if (match) ingId = match.id;
      }
      if (!ingId) continue;

      const qty = item.convertedStockQuantity !== undefined && item.convertedStockQuantity > 0
        ? item.convertedStockQuantity
        : item.quantity;
      if (qty <= 0) continue;

      StockService.reverseStock(ingId, qty, zone, invoice.invoiceNumber, `${contextLabel} de la facture ${invoice.invoiceNumber}`, performedBy);
    }
  }

  public static cancelInvoice(invoiceId: string, reason: string, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const inv = invoices[idx];
    if (inv.cancelled) throw new Error('Cette facture est déjà annulée.');

    this.reverseInvoiceStock(inv, performedBy, 'Annulation');

    inv.cancelled = true;
    inv.cancelReason = reason;

    invoices[idx] = inv;
    db.set('supplierInvoices', invoices);
    db.logAudit('Annulation Facture Fournisseur', 'finance', `Annulation de la facture ${inv.invoiceNumber} : ${reason}${inv.stockUpdated ? ' (stock réajusté en conséquence)' : ''}`, performedBy);
    return inv;
  }

  public static deleteInvoice(invoiceId: string, performedBy: string): void {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const inv = invoices[idx];
    this.reverseInvoiceStock(inv, performedBy, 'Suppression');

    const num = inv.invoiceNumber;
    invoices.splice(idx, 1);
    db.set('supplierInvoices', invoices);
    db.logAudit('Suppression Facture Fournisseur', 'finance', `Suppression de la facture ${num}`, performedBy);
  }

  /**
   * Enregistre un règlement (total ou partiel) sur une facture. Le statut (Non payée / Partiellement
   * payée / Payée) est recalculé automatiquement à partir du montant cumulé réglé. Chaque règlement
   * est conservé dans l'historique de la facture.
   */
  public static recordInvoicePayment(invoiceId: string, amount: number, method: string, performedBy: string, notes?: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const inv = invoices[idx];
    if (inv.cancelled) throw new Error('Impossible d\'enregistrer un paiement sur une facture annulée.');
    if (!(amount > 0)) throw new Error('Le montant du paiement doit être positif.');

    const total = this.invoiceTotal(inv);
    const payment: SupplierInvoicePayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      amount,
      method,
      date: new Date().toISOString().split('T')[0],
      performedBy,
      notes
    };

    inv.payments = [...(inv.payments || []), payment];
    inv.paidAmount = Number(((inv.paidAmount || 0) + amount).toFixed(3));
    inv.paymentMethod = method;
    inv.paymentDate = payment.date;
    inv.paymentStatus = inv.paidAmount >= total ? 'paid' : inv.paidAmount > 0 ? 'partially_paid' : 'unpaid';

    invoices[idx] = inv;
    db.set('supplierInvoices', invoices);
    db.logAudit('Paiement Facture Fournisseur', 'finance', `Paiement de ${amount.toFixed(3)} DT sur la facture ${inv.invoiceNumber} par ${method} (statut : ${inv.paymentStatus}, réglé ${inv.paidAmount.toFixed(3)} / ${total.toFixed(3)} DT)`, performedBy);
    return inv;
  }
}
