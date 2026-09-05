import { db } from '../db/database.js';
import { SystemAlert } from '../types/index.js';

/** Un même retard de paiement de facture "franchit" ce seuil pour être signalé en amont de l'échéance. */
const INVOICE_DUE_SOON_LEAD_DAYS = 5;

const SEVERITY_ORDER: Record<SystemAlert['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3
};

/**
 * Alertes 100% calculées à la lecture à partir des données actuelles — jamais stockées. Une alerte
 * apparaît et disparaît donc automatiquement avec la condition qui la déclenche (réapprovisionner
 * fait disparaître un "stock bas", régler une facture fait disparaître son "échéance proche", etc.).
 * Seul l'état "traité" (dismiss) est mémorisé, dans AppSettings.dismissedAlertIds.
 */
export class AlertService {
  public static getActiveAlerts(): SystemAlert[] {
    const settings = db.getSettings();
    const dismissed = new Set(settings.dismissedAlertIds || []);
    const alerts: SystemAlert[] = [];

    const push = (
      id: string,
      type: SystemAlert['type'],
      title: string,
      message: string,
      severity: SystemAlert['severity'],
      linkUrl?: string
    ) => {
      alerts.push({ id, type, title, message, severity, read: dismissed.has(id), linkUrl, createdAt: new Date().toISOString() });
    };

    // 1. Stock bas & 2. Rupture / stock négatif
    for (const ing of db.get('ingredients')) {
      if (ing.currentStock < 0) {
        push(
          `negative_stock:${ing.id}`,
          'negative_stock',
          `Stock négatif : ${ing.name}`,
          `Le stock de ${ing.name} est négatif (${ing.currentStock} ${ing.unit}) : vérifiez les derniers mouvements.`,
          'critical',
          '/stock'
        );
      } else if (ing.currentStock === 0) {
        push(
          `negative_stock:${ing.id}`,
          'negative_stock',
          `Rupture de stock : ${ing.name}`,
          `${ing.name} est en rupture de stock.`,
          'critical',
          '/stock'
        );
      } else if (ing.currentStock <= ing.minStockThreshold) {
        push(
          `low_stock:${ing.id}`,
          'low_stock',
          `Seuil de stock bas : ${ing.name}`,
          `Stock actuel : ${ing.currentStock} ${ing.unit} (seuil minimal : ${ing.minStockThreshold} ${ing.unit}).`,
          'warning',
          '/stock'
        );
      }
    }

    // 3. Péremption proche & 4. Produits périmés
    const ingredientsById = new Map(db.get('ingredients').map(ing => [ing.id, ing]));
    for (const lot of db.get('stockLots')) {
      if (lot.status !== 'active' || !lot.expirationDate) continue;
      const ingredient = ingredientsById.get(lot.ingredientId);
      const leadDays = ingredient?.expiryAlertLeadDays ?? settings.defaultExpiryAlertLeadDays;
      const daysUntilExpiry = Math.ceil((new Date(lot.expirationDate).getTime() - Date.now()) / 86400000);
      if (daysUntilExpiry < 0) {
        push(
          `lot_expired:${lot.id}`,
          'lot_expired',
          `Lot périmé : ${lot.ingredientName}`,
          `Le lot ${lot.lotNumber} (${lot.quantity} ${lot.unit}) est périmé depuis le ${lot.expirationDate}.`,
          'critical',
          '/stock'
        );
      } else if (daysUntilExpiry <= leadDays) {
        push(
          `lot_expiring:${lot.id}`,
          'lot_expiring',
          `Péremption proche : ${lot.ingredientName}`,
          `Le lot ${lot.lotNumber} (${lot.quantity} ${lot.unit}) expire le ${lot.expirationDate} (dans ${daysUntilExpiry} j).`,
          'warning',
          '/stock'
        );
      }
    }

    // 5. Factures OCR à vérifier & 6. Échéances fournisseurs
    for (const inv of db.get('supplierInvoices')) {
      if (inv.cancelled) continue;

      if (inv.ocrProcessed && !inv.stockUpdated) {
        push(
          `ocr_review:${inv.id}`,
          'ocr_review',
          `Facture OCR à vérifier : ${inv.supplierName}`,
          `La facture ${inv.invoiceNumber} extraite automatiquement n'a pas encore été validée (stock non mis à jour).`,
          'warning',
          '/suppliers'
        );
      }

      if (inv.paymentStatus !== 'paid') {
        const total = inv.totalTTC || inv.totalAmount;
        const daysUntilDue = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / 86400000);
        if (daysUntilDue < 0) {
          push(
            `invoice_due:${inv.id}`,
            'invoice_due',
            `Facture en retard : ${inv.supplierName}`,
            `Facture ${inv.invoiceNumber} (${total.toFixed(3)} DT) en retard de paiement depuis ${Math.abs(daysUntilDue)} j.`,
            'critical',
            '/suppliers'
          );
        } else if (daysUntilDue <= INVOICE_DUE_SOON_LEAD_DAYS) {
          push(
            `invoice_due:${inv.id}`,
            'invoice_due',
            `Échéance proche : ${inv.supplierName}`,
            `Facture ${inv.invoiceNumber} (${total.toFixed(3)} DT) à payer avant le ${inv.dueDate} (dans ${daysUntilDue} j).`,
            'warning',
            '/suppliers'
          );
        }
      }
    }

    // 7. Écarts d'inventaire significatifs
    for (const audit of db.get('inventoryAudits')) {
      if (audit.status !== 'validated') continue;
      if (Math.abs(audit.totalDifferenceValue) >= settings.significantDiscrepancyThresholdDT) {
        push(
          `inventory_discrepancy:${audit.id}`,
          'inventory_discrepancy',
          `Écart d'inventaire important : ${audit.auditNumber}`,
          `Écart net de ${audit.totalDifferenceValue.toFixed(3)} DT constaté lors de l'inventaire du ${audit.date}.`,
          'warning',
          '/stock'
        );
      }
    }

    // 8. Marges sous l'objectif
    const products = db.get('products');
    for (const recipe of db.get('recipes')) {
      if (recipe.actualMarginPercentage === undefined) continue;
      if (recipe.actualMarginPercentage >= recipe.targetMarginPercentage) continue;
      const product = products.find(p => p.id === recipe.productId);
      if (!product || !product.available) continue;
      push(
        `margin_below_target:${recipe.id}`,
        'margin_below_target',
        `Marge sous l'objectif : ${product.name}`,
        `Marge réelle de ${recipe.actualMarginPercentage.toFixed(1)} % contre un objectif de ${recipe.targetMarginPercentage.toFixed(1)} %.`,
        'warning',
        '/products'
      );
    }

    return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  private static persistDismissed(ids: string[]): void {
    db.setSettings({ dismissedAlertIds: ids.slice(-500) });
  }

  public static dismiss(id: string): void {
    const settings = db.getSettings();
    const ids = new Set(settings.dismissedAlertIds || []);
    ids.add(id);
    this.persistDismissed(Array.from(ids));
  }

  public static dismissAll(): void {
    const currentIds = this.getActiveAlerts().map(a => a.id);
    const settings = db.getSettings();
    const merged = new Set([...(settings.dismissedAlertIds || []), ...currentIds]);
    this.persistDismissed(Array.from(merged));
  }

  public static restore(id: string): void {
    const settings = db.getSettings();
    const ids = (settings.dismissedAlertIds || []).filter(existing => existing !== id);
    this.persistDismissed(ids);
  }
}
