import { db } from '../db/database.js';
import { CatalogService } from './catalogService.js';
import { Ingredient, Order, Sale } from '../types/index.js';

/** Une ligne de consommation théorique : un ingrédient consommé par une ligne de vente donnée. */
interface ConsumptionEvent {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;       // quantité consommée (unité stock de l'ingrédient)
  saleDate: string;       // date de la vente source (ISO)
  productId: string;
  productName: string;
  soldQuantity: number;   // quantité du produit vendue sur cette ligne
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
  /** Lignes de vente sans productId identifiable — impossible de les rattacher à une fiche technique, donc ignorées (aucune estimation arbitraire). */
  skippedSalesLines: number;
  /** Produits vendus mais sans fiche technique définie — consommation non comptabilisée pour eux (volontairement, plutôt que d'inventer une valeur). */
  skippedNoRecipeCount: number;
  skippedNoRecipeProducts: string[];
}

export interface IngredientTheoreticalStock {
  ingredientId: string;
  ingredientName: string;
  /** Zone comparée — toujours la Réserve principale, seule zone de consommation. */
  zone: 'reserve_principale';
  unit: string;
  unitCost: number;
  referenceDate: string;
  referenceStock: number;
  /** 'audit' : point de départ fiable (dernier inventaire physique validé). 'no_audit_baseline' : aucun inventaire validé pour cet ingrédient — le stock ledger courant sert de départ, faute de référence vérifiée. */
  referenceSource: 'audit' | 'no_audit_baseline';
  movementsAdjustment: number;
  theoreticalConsumptionSinceReference: number;
  theoreticalStock: number;
  currentLedgerStock: number;
  ledgerDrift: number;
}

export class TheoreticalConsumptionService {
  /**
   * Construit la liste à plat des événements de consommation théorique en développant, pour
   * chaque produit RÉELLEMENT vendu (commandes payées + ventes manuelles non liées à une commande),
   * sa fiche technique actuelle (avec sous-recettes) jusqu'aux ingrédients bruts.
   * Ne fabrique aucune estimation : un produit sans fiche technique, ou une ligne de vente sans
   * productId, est ignoré et comptabilisé séparément pour rester transparent sur les limites du calcul.
   */
  private static buildConsumptionEvents(startDate?: string, endDate?: string): {
    events: ConsumptionEvent[];
    skippedSalesLines: number;
    skippedNoRecipeProducts: Map<string, string>;
  } {
    const orders: Order[] = db.get('orders') || [];
    const sales: Sale[] = db.get('sales') || [];
    const ingredients: Ingredient[] = db.get('ingredients') || [];
    const ingredientById = new Map(ingredients.map(i => [i.id, i]));

    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d.getTime(); })() : null;

    const inRange = (iso: string | undefined): boolean => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (isNaN(t)) return false;
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;
      return true;
    };

    const events: ConsumptionEvent[] = [];
    let skippedSalesLines = 0;
    const skippedNoRecipeProducts = new Map<string, string>();

    const addEvent = (productId: string | undefined, productName: string, soldQuantity: number, saleDate: string) => {
      if (soldQuantity <= 0) return;
      if (!productId) { skippedSalesLines++; return; }
      const rawMap = CatalogService.expandRecipeToRawIngredients(productId, soldQuantity);
      if (rawMap.size === 0) {
        // Pas de fiche technique (ou fiche vide) pour ce produit : signalé, jamais estimé arbitrairement.
        skippedNoRecipeProducts.set(productId, productName);
        return;
      }
      for (const [ingredientId, quantity] of rawMap) {
        const ing = ingredientById.get(ingredientId);
        events.push({
          ingredientId,
          ingredientName: ing?.name || ingredientId,
          unit: ing?.unit || '',
          quantity,
          saleDate,
          productId,
          productName,
          soldQuantity
        });
      }
    };

    // 1. Commandes payées (canal POS/QR principal) — productId toujours fiable.
    for (const order of orders) {
      if (order.paymentStatus !== 'paid') continue;
      const saleDate = order.completedAt || order.updatedAt || order.createdAt;
      if (!inRange(saleDate)) continue;
      for (const item of order.items) {
        addEvent(item.productId, item.productName, item.quantity, saleDate);
      }
    }

    // 2. Ventes manuelles / importées / rétroactives SANS commande liée — pour ne jamais compter
    //    deux fois une vente POS déjà couverte par sa commande ci-dessus.
    for (const sale of sales) {
      if (sale.orderId) continue;
      if (sale.cancelled) continue;
      if (!inRange(sale.createdAt)) continue;
      for (const item of sale.itemsSummary || []) {
        addEvent(item.productId, item.productName, item.quantity, sale.createdAt);
      }
    }

    return { events, skippedSalesLines, skippedNoRecipeProducts };
  }

  /**
   * Rapport de consommation théorique sur une période : Ventes réelles × fiches techniques actuelles
   * (avec sous-recettes) → quantité théorique consommée par ingrédient, avec détail par produit.
   */
  public static computeTheoreticalConsumption(startDate?: string, endDate?: string): TheoreticalConsumptionReport {
    const ingredients: Ingredient[] = db.get('ingredients') || [];
    const ingredientById = new Map(ingredients.map(i => [i.id, i]));
    const { events, skippedSalesLines, skippedNoRecipeProducts } = this.buildConsumptionEvents(startDate, endDate);

    const byIngredient = new Map<string, IngredientConsumptionSummary>();

    for (const ev of events) {
      let entry = byIngredient.get(ev.ingredientId);
      if (!entry) {
        entry = {
          ingredientId: ev.ingredientId,
          ingredientName: ev.ingredientName,
          unit: ev.unit,
          unitCost: ingredientById.get(ev.ingredientId)?.costPerUnit || 0,
          theoreticalQuantityConsumed: 0,
          valueConsumed: 0,
          productBreakdown: []
        };
        byIngredient.set(ev.ingredientId, entry);
      }
      entry.theoreticalQuantityConsumed += ev.quantity;

      let prod = entry.productBreakdown.find(p => p.productId === ev.productId);
      if (!prod) {
        prod = { productId: ev.productId, productName: ev.productName, soldQuantity: 0, consumedQuantity: 0 };
        entry.productBreakdown.push(prod);
      }
      prod.soldQuantity += ev.soldQuantity;
      prod.consumedQuantity += ev.quantity;
    }

    const ingredientsSummary = Array.from(byIngredient.values())
      .map(e => ({
        ...e,
        theoreticalQuantityConsumed: Number(e.theoreticalQuantityConsumed.toFixed(4)),
        valueConsumed: Number((e.theoreticalQuantityConsumed * e.unitCost).toFixed(3)),
        productBreakdown: e.productBreakdown
          .map(p => ({
            ...p,
            soldQuantity: Number(p.soldQuantity.toFixed(3)),
            consumedQuantity: Number(p.consumedQuantity.toFixed(4))
          }))
          .sort((a, b) => b.consumedQuantity - a.consumedQuantity)
      }))
      .sort((a, b) => b.valueConsumed - a.valueConsumed);

    return {
      startDate: startDate || null,
      endDate: endDate || null,
      ingredients: ingredientsSummary,
      skippedSalesLines,
      skippedNoRecipeCount: skippedNoRecipeProducts.size,
      skippedNoRecipeProducts: Array.from(skippedNoRecipeProducts.values())
    };
  }

  /**
   * Pour chaque ingrédient : reconstruit un stock théorique INDÉPENDANT du solde ledger courant
   * (`currentStock`), à partir du dernier inventaire physique VALIDÉ comme point de départ connu,
   * puis des mouvements de réception / perte / correction manuelle enregistrés depuis cette date,
   * et de la consommation théorique (ventes × fiches techniques) RECALCULÉE DEPUIS ZÉRO sur cette
   * période — et non des mouvements "out_sale" déjà enregistrés par la déduction en temps réel —
   * afin de vraiment vérifier la fiabilité de cette dernière plutôt que de comparer le ledger à lui-même.
   *
   * Si aucun inventaire validé n'existe encore pour un ingrédient, aucune référence fiable n'est
   * disponible : le stock ledger courant sert alors de point de départ, et la source est signalée
   * explicitement comme 'no_audit_baseline' (jamais présentée comme une valeur vérifiée).
   */
  public static computeTheoreticalStock(): IngredientTheoreticalStock[] {
    const ingredients: Ingredient[] = db.get('ingredients') || [];
    const audits = (db.get('inventoryAudits') || []).filter(a => a.status === 'validated');
    const movements = db.get('stockMovements') || [];

    // Dernier audit validé par ingrédient, sur la zone Réserve principale uniquement (seule zone
    // de consommation) — comparer au total mélangerait les transferts avec la vraie dérive de vente.
    const lastAuditFor = new Map<string, { date: string; stock: number }>();
    for (const audit of audits) {
      const refDate = audit.validatedAt || audit.date;
      for (const item of audit.items) {
        if (item.zone !== 'reserve_principale') continue;
        const existing = lastAuditFor.get(item.ingredientId);
        if (!existing || new Date(refDate).getTime() > new Date(existing.date).getTime()) {
          lastAuditFor.set(item.ingredientId, { date: refDate, stock: item.countedStock });
        }
      }
    }

    // Historique complet des ventes une seule fois ; filtré par ingrédient + date de référence ci-dessous.
    const { events } = this.buildConsumptionEvents(undefined, undefined);

    return ingredients.map(ing => {
      const ref = lastAuditFor.get(ing.id);
      const referenceSource: 'audit' | 'no_audit_baseline' = ref ? 'audit' : 'no_audit_baseline';
      const referenceDate = ref ? ref.date : (ing.updatedAt || new Date(0).toISOString());
      const referenceStock = ref ? ref.stock : ing.stockByZone.reserve_principale;
      const refTime = new Date(referenceDate).getTime();

      let movementsAdjustment = 0;
      for (const m of movements) {
        if (m.ingredientId !== ing.id) continue;
        if (m.zone !== 'reserve_principale') continue;
        if (m.type !== 'in_reception' && m.type !== 'adjustment_manual' && m.type !== 'out_waste') continue;
        if (new Date(m.createdAt).getTime() <= refTime) continue;
        movementsAdjustment += m.quantity;
      }

      let theoreticalConsumptionSinceReference = 0;
      if (referenceSource === 'audit') {
        for (const ev of events) {
          if (ev.ingredientId !== ing.id) continue;
          if (new Date(ev.saleDate).getTime() <= refTime) continue;
          theoreticalConsumptionSinceReference += ev.quantity;
        }
      }
      // Sans audit de référence, le stock courant sert déjà de point de départ (il intègre les ventes
      // passées via la déduction temps réel) : recompter la consommation ici doublerait le calcul.

      const theoreticalStock = referenceStock + movementsAdjustment - theoreticalConsumptionSinceReference;

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        zone: 'reserve_principale',
        unit: ing.unit,
        unitCost: ing.costPerUnit,
        referenceDate,
        referenceStock: Number(referenceStock.toFixed(4)),
        referenceSource,
        movementsAdjustment: Number(movementsAdjustment.toFixed(4)),
        theoreticalConsumptionSinceReference: Number(theoreticalConsumptionSinceReference.toFixed(4)),
        // Le stock négatif étant désormais autorisé, on ne plafonne plus la valeur théorique à 0.
        theoreticalStock: Number(theoreticalStock.toFixed(4)),
        currentLedgerStock: ing.stockByZone.reserve_principale,
        ledgerDrift: Number((ing.stockByZone.reserve_principale - theoreticalStock).toFixed(4))
      };
    });
  }
}
