import { db } from '../db/database.js';
import { Supplier, PurchaseOrder, SupplierInvoice } from '../types/index.js';
import { StockService } from './stockService.js';

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
    suppliers[idx] = { ...suppliers[idx], ...updates };
    db.set('suppliers', suppliers);
    db.logAudit('Mise à jour Fournisseur', 'admin', `Modification du fournisseur ${suppliers[idx].name}`, performedBy);
    return suppliers[idx];
  }

  public static deleteSupplier(id: string, performedBy: string): void {
    const suppliers = db.get('suppliers');
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Fournisseur non trouvé');
    const supName = suppliers[idx].name;
    // Soft-delete by setting active: false
    suppliers[idx].active = false;
    db.set('suppliers', suppliers);
    db.logAudit('Désactivation Fournisseur', 'admin', `Désactivation du fournisseur ${supName}`, performedBy);
  }

  // Purchase Orders (Commandes Fournisseurs)
  public static getPurchaseOrders(): PurchaseOrder[] {
    return db.get('purchaseOrders');
  }

  public static createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt'>, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const orderNumber = `BC-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...data,
      id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      orderNumber,
      createdAt: new Date().toISOString()
    };
    orders.unshift(newPO);
    db.set('purchaseOrders', orders);
    db.logAudit('Bon de Commande Fournisseur', 'stock', `Création du bon de commande ${orderNumber} (${data.supplierName} - ${data.totalAmount.toFixed(3)} DT)`, performedBy);
    return newPO;
  }

  public static updatePurchaseOrder(poId: string, updates: Partial<PurchaseOrder>, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    orders[idx] = { ...orders[idx], ...updates };
    db.set('purchaseOrders', orders);
    db.logAudit('Modification Bon de Commande', 'stock', `Modification du bon ${orders[idx].orderNumber}`, performedBy);
    return orders[idx];
  }

  public static cancelPurchaseOrder(poId: string, reason: string, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const po = orders[idx];
    po.status = 'cancelled';
    po.cancelReason = reason;
    po.cancelledAt = new Date().toISOString();
    po.cancelledBy = performedBy;

    orders[idx] = po;
    db.set('purchaseOrders', orders);
    db.logAudit('Annulation Bon de Commande', 'stock', `Annulation du bon ${po.orderNumber} : ${reason}`, performedBy);
    return po;
  }

  public static receivePurchaseOrder(poId: string, performedBy: string): PurchaseOrder {
    const orders = db.get('purchaseOrders');
    const idx = orders.findIndex(p => p.id === poId);
    if (idx === -1) throw new Error('Bon de commande non trouvé');

    const po = orders[idx];
    po.status = 'received';
    po.receivedAt = new Date().toISOString();

    // Auto-replenish stock for mapped ingredients
    const ingredients = db.get('ingredients');
    for (const item of po.items) {
      let targetIngId = item.ingredientId;
      if (!targetIngId) {
        // match by name
        const match = ingredients.find(i => i.name.toLowerCase() === item.itemName.toLowerCase());
        if (match) targetIngId = match.id;
      }

      if (targetIngId) {
        StockService.addStock(
          targetIngId,
          item.quantity,
          item.expectedUnitCost,
          po.orderNumber,
          `Réception commande fournisseur ${po.supplierName}`,
          performedBy
        );
      }
    }

    orders[idx] = po;
    db.set('purchaseOrders', orders);
    db.logAudit('Réception Commande Fournisseur', 'stock', `Réception et mise en stock du bon ${po.orderNumber}`, performedBy);
    return po;
  }

  // Supplier Invoices & OCR
  public static getInvoices(): SupplierInvoice[] {
    return db.get('supplierInvoices');
  }

  public static createInvoice(data: Omit<SupplierInvoice, 'id' | 'createdAt'>, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const invoice: SupplierInvoice = {
      ...data,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };

    // If stock auto-update requested (and not retroactive or explicitly requested)
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

          StockService.addStock(
            ingId,
            qtyToAdd,
            unitCost,
            invoice.invoiceNumber,
            `Facture fournisseur ${invoice.supplierName} (${item.quantity} ${item.unit})`,
            performedBy
          );
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

    invoices[idx] = { ...invoices[idx], ...updates };
    db.set('supplierInvoices', invoices);
    db.logAudit('Modification Facture Fournisseur', 'finance', `Modification de la facture ${invoices[idx].invoiceNumber}`, performedBy);
    return invoices[idx];
  }

  public static cancelInvoice(invoiceId: string, reason: string, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const inv = invoices[idx];
    inv.cancelled = true;
    inv.cancelReason = reason;

    invoices[idx] = inv;
    db.set('supplierInvoices', invoices);
    db.logAudit('Annulation Facture Fournisseur', 'finance', `Annulation de la facture ${inv.invoiceNumber} : ${reason}`, performedBy);
    return inv;
  }

  public static deleteInvoice(invoiceId: string, performedBy: string): void {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');
    const num = invoices[idx].invoiceNumber;
    invoices.splice(idx, 1);
    db.set('supplierInvoices', invoices);
    db.logAudit('Suppression Facture Fournisseur', 'finance', `Suppression de la facture ${num}`, performedBy);
  }

  public static payInvoice(invoiceId: string, paymentMethod: string, performedBy: string): SupplierInvoice {
    const invoices = db.get('supplierInvoices');
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) throw new Error('Facture non trouvée');

    const inv = invoices[idx];
    inv.paymentStatus = 'paid';
    inv.paymentDate = new Date().toISOString().split('T')[0];
    inv.paymentMethod = paymentMethod;

    invoices[idx] = inv;
    db.set('supplierInvoices', invoices);
    db.logAudit('Paiement Facture Fournisseur', 'finance', `Règlement de la facture ${inv.invoiceNumber} (${inv.totalAmount.toFixed(3)} DT) par ${paymentMethod}`, performedBy);
    return inv;
  }
}

