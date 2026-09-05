import { db } from '../db/database.js';
import { Ingredient, StockMovement, StockWaste, InventoryAudit, StockLot, StockZone } from '../types/index.js';
import { CatalogService } from './catalogService.js';
import { summarizeChanges } from '../utils/audit.js';

export const ZONE_LABELS: Record<StockZone, string> = {
  reserve_principale: 'Réserve principale',
  depot: 'Dépôt'
};

const INGREDIENT_TRACKED_FIELDS = [
  { key: 'name', label: 'Nom' },
  { key: 'costPerUnit', label: 'Coût unitaire', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'minStockThreshold', label: 'Seuil minimal' }
];

export const WASTE_REASON_LABELS: Record<StockWaste['reason'], string> = {
  perte: 'Perte',
  casse: 'Casse',
  peremption: 'Péremption',
  consommation_interne: 'Consommation interne',
  produit_offert: 'Produit offert',
  erreur_preparation: 'Erreur de préparation',
  ajustement_inventaire: "Ajustement d'inventaire",
  autre: 'Autre'
};

type AuditScope = {
  scopeType: InventoryAudit['scopeType'];
  scopeCategory?: Ingredient['category'];
  scopeZone?: StockZone;
};

export interface AddStockParams {
  ingredientId: string;
  quantity: number;
  unitCost: number;
  referenceDoc: string;
  reason: string;
  performedBy: string;
  zone?: StockZone;
  comment?: string;
  lotNumber?: string;
  expirationDate?: string;
  supplierId?: string;
  supplierName?: string;
}

export class StockService {
  public static getAllIngredients(): Ingredient[] {
    return db.get('ingredients');
  }

  public static getIngredientById(id: string): Ingredient | undefined {
    return db.get('ingredients').find(ing => ing.id === id);
  }

  private static recomputeTotal(ing: Ingredient): void {
    ing.currentStock = Number((ing.stockByZone.reserve_principale + ing.stockByZone.depot).toFixed(4));
  }

  /**
   * Coût Moyen Pondéré : pondère le coût existant par le stock total détenu (toutes zones), plafonné
   * à 0 pour la pondération (un stock négatif n'a pas de sens comme base de coût), avec la quantité
   * et le coût reçus. Utilisé de façon cohérente pour la valeur de stock, le coût matière et les marges.
   */
  private static computeWeightedAverageCost(totalStockBefore: number, costBefore: number, receivedQty: number, receivedCost: number): number {
    const baseQty = Math.max(0, totalStockBefore);
    const denom = baseQty + receivedQty;
    if (denom <= 0) return receivedCost;
    return (baseQty * costBefore + receivedQty * receivedCost) / denom;
  }

  public static createIngredient(data: Omit<Ingredient, 'id' | 'updatedAt'>, performedBy: string): Ingredient {
    const ingredients = db.get('ingredients');
    const stockByZone: Record<StockZone, number> = data.stockByZone && (data.stockByZone.reserve_principale || data.stockByZone.depot)
      ? { reserve_principale: data.stockByZone.reserve_principale || 0, depot: data.stockByZone.depot || 0 }
      : { reserve_principale: data.currentStock || 0, depot: 0 };
    const newIngredient: Ingredient = {
      ...data,
      stockByZone,
      currentStock: Number((stockByZone.reserve_principale + stockByZone.depot).toFixed(4)),
      id: `ing_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString()
    };
    ingredients.push(newIngredient);
    db.set('ingredients', ingredients);

    db.logAudit('Création Ingrédient', 'stock', `Ajout de l'ingrédient ${newIngredient.name} (${newIngredient.currentStock} ${newIngredient.unit})`, performedBy);
    return newIngredient;
  }

  public static updateIngredient(id: string, updates: Partial<Ingredient>, performedBy: string): Ingredient {
    const ingredients = db.get('ingredients');
    const index = ingredients.findIndex(i => i.id === id);
    if (index === -1) throw new Error(`Ingrédient non trouvé: ${id}`);

    const existing = ingredients[index];
    let stockByZone = existing.stockByZone;
    if (updates.stockByZone) {
      stockByZone = { ...existing.stockByZone, ...updates.stockByZone };
    } else if (updates.currentStock !== undefined && updates.currentStock !== existing.currentStock) {
      // Compat : un appelant qui ne connaît pas les zones (ex. anciens flux) ne fixe que `currentStock`.
      // L'écart est appliqué à la Réserve principale par défaut plutôt que d'être silencieusement perdu.
      const delta = updates.currentStock - existing.currentStock;
      stockByZone = { ...existing.stockByZone, reserve_principale: Number((existing.stockByZone.reserve_principale + delta).toFixed(4)) };
    }

    const updated: Ingredient = {
      ...existing,
      ...updates,
      stockByZone,
      updatedAt: new Date().toISOString()
    };
    this.recomputeTotal(updated);
    ingredients[index] = updated;
    db.set('ingredients', ingredients);

    const changes = summarizeChanges(existing, updated, INGREDIENT_TRACKED_FIELDS);
    db.logAudit('Mise à jour Ingrédient', 'stock', `Modification de ${updated.name}`, performedBy, changes);

    if (updated.costPerUnit !== existing.costPerUnit) {
      CatalogService.recalculateRecipesForIngredient(id, performedBy);
    }

    return updated;
  }

  public static deleteIngredient(id: string, performedBy: string): void {
    const ingredients = db.get('ingredients');
    const item = ingredients.find(i => i.id === id);
    if (!item) throw new Error('Ingrédient non trouvé');

    db.set('ingredients', ingredients.filter(i => i.id !== id));
    db.logAudit('Suppression Ingrédient', 'stock', `Suppression de ${item.name}`, performedBy);
  }

  /**
   * Déduit le stock d'après la fiche technique d'un produit vendu. La consommation prélève toujours
   * sur la Réserve principale (zone de travail) — le Dépôt doit être transféré manuellement vers la
   * Réserve principale avant usage. Développe récursivement les sous-recettes (logique partagée avec
   * le calcul de consommation théorique, via CatalogService, pour garantir la cohérence).
   */
  public static deductStockForProduct(productId: string, quantity: number, referenceDoc: string, performedBy: string) {
    const recipes = db.get('recipes');
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');
    const zone: StockZone = 'reserve_principale';

    const recipe = recipes.find(r => r.productId === productId);
    if (!recipe) {
      return; // No technical recipe configured for this product
    }

    const rawConsumption = CatalogService.expandRecipeToRawIngredients(productId, quantity);

    for (const [ingredientId, deductQty] of rawConsumption) {
      const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
      if (ingIndex === -1) continue;

      const ing = ingredients[ingIndex];
      const prevZoneStock = ing.stockByZone[zone];
      const newZoneStock = Number((prevZoneStock - deductQty).toFixed(4));

      ing.stockByZone[zone] = newZoneStock;
      this.recomputeTotal(ing);
      ing.updatedAt = new Date().toISOString();

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        type: 'out_sale',
        zone,
        quantity: -deductQty,
        unit: ing.unit,
        previousStock: prevZoneStock,
        newStock: newZoneStock,
        unitCost: ing.costPerUnit,
        totalValue: Number((deductQty * ing.costPerUnit).toFixed(2)),
        origin: 'Vente POS',
        referenceDoc,
        reason: `Vente produit: ${recipe.productName} (x${quantity})`,
        performedBy,
        createdAt: new Date().toISOString()
      };
      movements.unshift(movement);
    }

    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
  }

  /**
   * Réception de stock (manuelle ou achat), avec Coût Moyen Pondéré et lot optionnel.
   */
  public static addStock(params: AddStockParams): StockMovement {
    const {
      ingredientId,
      quantity,
      unitCost,
      referenceDoc,
      reason,
      performedBy,
      zone = 'reserve_principale',
      comment,
      lotNumber,
      expirationDate,
      supplierId,
      supplierName
    } = params;

    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
    if (ingIndex === -1) throw new Error(`Ingrédient non trouvé: ${ingredientId}`);

    const ing = ingredients[ingIndex];
    const prevZoneStock = ing.stockByZone[zone];
    const prevTotalStock = ing.stockByZone.reserve_principale + ing.stockByZone.depot;
    const prevCost = ing.costPerUnit;
    const newZoneStock = Number((prevZoneStock + quantity).toFixed(4));

    ing.stockByZone[zone] = newZoneStock;
    this.recomputeTotal(ing);

    if (unitCost > 0) {
      ing.costPerUnit = Number(this.computeWeightedAverageCost(prevTotalStock, prevCost, quantity, unitCost).toFixed(4));
    }
    ing.updatedAt = new Date().toISOString();

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'in_reception',
      zone,
      quantity,
      unit: ing.unit,
      previousStock: prevZoneStock,
      newStock: newZoneStock,
      unitCost: unitCost || ing.costPerUnit,
      totalValue: Number((quantity * (unitCost || ing.costPerUnit)).toFixed(2)),
      origin: supplierName || reason || 'Réception fournisseur',
      destination: ZONE_LABELS[zone],
      referenceDoc,
      reason,
      comment,
      supplierId,
      supplierName,
      performedBy,
      createdAt: new Date().toISOString()
    };
    movements.unshift(movement);

    let createdLot: StockLot | undefined;
    if (lotNumber) {
      const lots = db.get('stockLots');
      createdLot = {
        id: `lot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        zone,
        lotNumber,
        expirationDate,
        quantity,
        unit: ing.unit,
        status: 'active',
        receivedBy: performedBy,
        createdAt: new Date().toISOString(),
        sourceMovementId: movement.id
      };
      lots.unshift(createdLot);
      db.set('stockLots', lots);
      movement.lotId = createdLot.id;
    }

    ingredients[ingIndex] = ing;
    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.logAudit('Entrée de Stock', 'stock', `Ajout de ${quantity} ${ing.unit} pour ${ing.name} en ${ZONE_LABELS[zone]} (Réf: ${referenceDoc})`, performedBy);

    if (unitCost > 0 && ing.costPerUnit !== prevCost) {
      CatalogService.recalculateRecipesForIngredient(ingredientId, performedBy);
    }

    return movement;
  }

  /**
   * Retire une quantité de stock sans passer par une réception (ex. annulation/suppression d'une
   * facture fournisseur qui avait déjà alimenté le stock). Ne touche jamais au CMP — c'est un retrait
   * de correction, pas un achat. `quantity` est la quantité à RETIRER (nombre positif).
   */
  public static reverseStock(ingredientId: string, quantity: number, zone: StockZone, referenceDoc: string, reason: string, performedBy: string): StockMovement | null {
    if (quantity <= 0) return null;
    const ingredients = db.get('ingredients');
    const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
    if (ingIndex === -1) return null;

    const ing = ingredients[ingIndex];
    const prevZoneStock = ing.stockByZone[zone];
    const newZoneStock = Number((prevZoneStock - quantity).toFixed(4));
    ing.stockByZone[zone] = newZoneStock;
    this.recomputeTotal(ing);
    ing.updatedAt = new Date().toISOString();

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'adjustment_manual',
      zone,
      quantity: -quantity,
      unit: ing.unit,
      previousStock: prevZoneStock,
      newStock: newZoneStock,
      unitCost: ing.costPerUnit,
      totalValue: Number((quantity * ing.costPerUnit).toFixed(2)),
      referenceDoc,
      reason,
      performedBy,
      createdAt: new Date().toISOString()
    };

    const movements = db.get('stockMovements');
    movements.unshift(movement);
    ingredients[ingIndex] = ing;
    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.logAudit('Retrait de Stock (correction)', 'stock', `Retrait de ${quantity} ${ing.unit} pour ${ing.name} en ${ZONE_LABELS[zone]} : ${reason}`, performedBy);

    return movement;
  }

  /**
   * Historique des prix d'achat d'un ingrédient, toutes réceptions confondues (mouvements
   * `in_reception` du grand livre) — permet de comparer les fournisseurs pour un même produit.
   */
  public static getPurchaseHistoryForIngredient(ingredientId: string): {
    date: string; supplierId?: string; supplierName?: string; quantity: number; unitCost: number; referenceDoc?: string;
  }[] {
    const movements = db.get('stockMovements');
    return movements
      .filter(m => m.ingredientId === ingredientId && m.type === 'in_reception')
      .map(m => ({
        date: m.createdAt,
        supplierId: m.supplierId,
        supplierName: m.supplierName,
        quantity: m.quantity,
        unitCost: m.unitCost,
        referenceDoc: m.referenceDoc
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Transfert entre les deux zones fixes : génère deux mouvements liés (traçabilité automatique).
   */
  public static transferStock(
    ingredientId: string,
    fromZone: StockZone,
    toZone: StockZone,
    quantity: number,
    reason: string,
    comment: string | undefined,
    performedBy: string
  ): { out: StockMovement; in: StockMovement } {
    if (fromZone === toZone) throw new Error('La zone source et la zone destination doivent être différentes.');
    if (!(quantity > 0)) throw new Error('La quantité à transférer doit être positive.');

    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');
    const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
    if (ingIndex === -1) throw new Error(`Ingrédient non trouvé: ${ingredientId}`);

    const ing = ingredients[ingIndex];
    const prevFromStock = ing.stockByZone[fromZone];
    const prevToStock = ing.stockByZone[toZone];
    const newFromStock = Number((prevFromStock - quantity).toFixed(4));
    const newToStock = Number((prevToStock + quantity).toFixed(4));

    ing.stockByZone[fromZone] = newFromStock;
    ing.stockByZone[toZone] = newToStock;
    ing.updatedAt = new Date().toISOString();
    // Le total ne change pas ; le CMP n'est jamais recalculé sur un transfert (déplacement, pas achat).

    const now = new Date().toISOString();
    const outId = `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const inId = `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}i`;

    const outMovement: StockMovement = {
      id: outId,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'transfer',
      zone: fromZone,
      quantity: -quantity,
      unit: ing.unit,
      previousStock: prevFromStock,
      newStock: newFromStock,
      unitCost: ing.costPerUnit,
      totalValue: Number((quantity * ing.costPerUnit).toFixed(2)),
      origin: ZONE_LABELS[fromZone],
      destination: ZONE_LABELS[toZone],
      reason,
      comment,
      linkedMovementId: inId,
      performedBy,
      createdAt: now
    };

    const inMovement: StockMovement = {
      id: inId,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'transfer',
      zone: toZone,
      quantity,
      unit: ing.unit,
      previousStock: prevToStock,
      newStock: newToStock,
      unitCost: ing.costPerUnit,
      totalValue: Number((quantity * ing.costPerUnit).toFixed(2)),
      origin: ZONE_LABELS[fromZone],
      destination: ZONE_LABELS[toZone],
      reason,
      comment,
      linkedMovementId: outId,
      performedBy,
      createdAt: now
    };

    movements.unshift(inMovement, outMovement);
    ingredients[ingIndex] = ing;
    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.logAudit('Transfert de Stock', 'stock', `Transfert de ${quantity} ${ing.unit} de ${ing.name} : ${ZONE_LABELS[fromZone]} → ${ZONE_LABELS[toZone]}`, performedBy);

    return { out: outMovement, in: inMovement };
  }

  /**
   * Déclaration de perte / gaspillage. Le stock négatif est autorisé (avec alerte) plutôt que bloqué.
   */
  public static recordWaste(data: Omit<StockWaste, 'id' | 'createdAt'>, performedBy: string): StockWaste {
    const wastes = db.get('stockWastes');
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    const waste: StockWaste = {
      ...data,
      id: `wst_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    wastes.unshift(waste);

    if (data.ingredientId) {
      const ingIndex = ingredients.findIndex(i => i.id === data.ingredientId);
      if (ingIndex !== -1) {
        const ing = ingredients[ingIndex];
        const zone = data.zone;
        const prevZoneStock = ing.stockByZone[zone];
        const newZoneStock = Number((prevZoneStock - data.quantity).toFixed(4));

        ing.stockByZone[zone] = newZoneStock;
        this.recomputeTotal(ing);
        ing.updatedAt = new Date().toISOString();

        const movement: StockMovement = {
          id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'out_waste',
          zone,
          quantity: -data.quantity,
          unit: ing.unit,
          previousStock: prevZoneStock,
          newStock: newZoneStock,
          unitCost: ing.costPerUnit,
          totalValue: waste.estimatedCost,
          origin: WASTE_REASON_LABELS[waste.reason],
          referenceDoc: waste.id,
          reason: WASTE_REASON_LABELS[waste.reason],
          comment: waste.notes,
          performedBy,
          createdAt: new Date().toISOString()
        };
        movements.unshift(movement);
        db.set('ingredients', ingredients);
        db.set('stockMovements', movements);
      }
    }

    db.set('stockWastes', wastes);
    db.logAudit('Enregistrement Perte', 'stock', `Perte de ${waste.quantity} ${waste.unit} pour ${waste.ingredientName || waste.productName} (Coût: ${waste.estimatedCost.toFixed(3)} DT)`, performedBy);

    return waste;
  }

  /**
   * Applique les ajustements d'un audit à l'ingrédient/mouvements, en respectant le choix manuel
   * par article (`applyAdjustment`). Toujours appelé sur des items déjà chiffrés (écart, valeur).
   */
  private static applyAuditItems(items: InventoryAudit['items'], auditNumber: string, reasonPrefix: string, performedBy: string): void {
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    for (const item of items) {
      if (item.applyAdjustment === false) continue;
      if (item.difference === 0) continue;

      const ingIndex = ingredients.findIndex(i => i.id === item.ingredientId);
      if (ingIndex === -1) continue;

      const ing = ingredients[ingIndex];
      const prev = ing.stockByZone[item.zone];
      ing.stockByZone[item.zone] = item.countedStock;
      this.recomputeTotal(ing);
      ing.updatedAt = new Date().toISOString();

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        type: 'adjustment_inventory',
        zone: item.zone,
        quantity: item.difference,
        unit: ing.unit,
        previousStock: prev,
        newStock: item.countedStock,
        unitCost: item.unitCost,
        totalValue: Math.abs(item.differenceValue),
        referenceDoc: auditNumber,
        reason: `${reasonPrefix} ${auditNumber}`,
        performedBy,
        createdAt: new Date().toISOString()
      };
      movements.unshift(movement);
    }

    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
  }

  private static computeAuditTotals(items: InventoryAudit['items']) {
    let totalExpectedValue = 0;
    let totalCountedValue = 0;
    let totalDifferenceValue = 0;
    for (const item of items) {
      totalExpectedValue += item.expectedStock * item.unitCost;
      totalCountedValue += item.countedStock * item.unitCost;
      totalDifferenceValue += item.differenceValue;
    }
    return {
      totalExpectedValue: Number(totalExpectedValue.toFixed(3)),
      totalCountedValue: Number(totalCountedValue.toFixed(3)),
      totalDifferenceValue: Number(totalDifferenceValue.toFixed(3))
    };
  }

  /**
   * Crée et valide directement un inventaire (comptage complet, par catégorie ou par zone).
   */
  public static createInventoryAudit(items: InventoryAudit['items'], performedBy: string, scope: AuditScope): InventoryAudit {
    const audits = db.get('inventoryAudits');
    const auditNumber = `INV-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;

    this.applyAuditItems(items, auditNumber, 'Ajustement inventaire physique', performedBy);

    const audit: InventoryAudit = {
      id: `aud_${Date.now()}`,
      auditNumber,
      date: new Date().toISOString().split('T')[0],
      performedBy,
      status: 'validated',
      scopeType: scope.scopeType,
      scopeCategory: scope.scopeCategory,
      scopeZone: scope.scopeZone,
      items,
      ...this.computeAuditTotals(items),
      createdAt: new Date().toISOString(),
      validatedAt: new Date().toISOString()
    };

    audits.unshift(audit);
    db.set('inventoryAudits', audits);

    db.logAudit('Inventaire Validé', 'stock', `Validation de l'inventaire ${auditNumber} (Écart net: ${audit.totalDifferenceValue.toFixed(3)} DT)`, performedBy);

    return audit;
  }

  /**
   * Crée un brouillon d'inventaire (sans toucher au stock).
   */
  public static createDraftAudit(items: InventoryAudit['items'], performedBy: string, scope: AuditScope): InventoryAudit {
    const audits = db.get('inventoryAudits');
    const auditNumber = `INV-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;

    const audit: InventoryAudit = {
      id: `aud_${Date.now()}`,
      auditNumber,
      date: new Date().toISOString().split('T')[0],
      performedBy,
      status: 'draft',
      scopeType: scope.scopeType,
      scopeCategory: scope.scopeCategory,
      scopeZone: scope.scopeZone,
      items,
      ...this.computeAuditTotals(items),
      createdAt: new Date().toISOString()
    };

    audits.unshift(audit);
    db.set('inventoryAudits', audits);
    db.logAudit('Brouillon Inventaire', 'stock', `Création du brouillon d'inventaire ${auditNumber}`, performedBy);
    return audit;
  }

  public static updateInventoryAudit(id: string, updates: { items?: InventoryAudit['items']; status?: 'draft' | 'validated' }, performedBy: string): InventoryAudit {
    const audits = db.get('inventoryAudits');
    const idx = audits.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Inventaire non trouvé');

    const audit = audits[idx];
    if (audit.status === 'validated' && updates.status !== 'validated') {
      throw new Error('Un inventaire déjà validé ne peut pas être repassé en brouillon.');
    }

    if (updates.items) {
      audit.items = updates.items;
      Object.assign(audit, this.computeAuditTotals(updates.items));
    }

    if (updates.status === 'validated' && audit.status === 'draft') {
      this.applyAuditItems(audit.items, audit.auditNumber, `Validation inventaire`, performedBy);
      audit.status = 'validated';
      audit.validatedAt = new Date().toISOString();
    }

    audits[idx] = audit;
    db.set('inventoryAudits', audits);
    db.logAudit('Mise à jour Inventaire', 'stock', `Modification inventaire ${audit.auditNumber} (statut: ${audit.status})`, performedBy);
    return audit;
  }

  public static deleteInventoryAudit(id: string, performedBy: string): void {
    const audits = db.get('inventoryAudits');
    const idx = audits.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Inventaire non trouvé');
    if (audits[idx].status === 'validated') {
      throw new Error('Impossible de supprimer un inventaire déjà validé (traçabilité comptable).');
    }
    const num = audits[idx].auditNumber;
    audits.splice(idx, 1);
    db.set('inventoryAudits', audits);
    db.logAudit('Suppression Brouillon Inventaire', 'stock', `Suppression du brouillon ${num}`, performedBy);
  }

  /**
   * Corrige un mouvement de stock erroné en générant une écriture inverse compensatoire (jamais
   * de modification/suppression de l'historique).
   */
  public static correctStockMovement(movementId: string, reason: string, performedBy: string): StockMovement {
    const movements = db.get('stockMovements');
    const ingredients = db.get('ingredients');
    const original = movements.find(m => m.id === movementId);
    if (!original) throw new Error('Mouvement de stock non trouvé');

    const ingIndex = ingredients.findIndex(i => i.id === original.ingredientId);
    if (ingIndex === -1) throw new Error('Ingrédient associé introuvable');

    const ing = ingredients[ingIndex];
    const zone = original.zone;
    const prevZoneStock = ing.stockByZone[zone];
    const inverseQty = -original.quantity;
    const newZoneStock = Number((prevZoneStock + inverseQty).toFixed(4));

    ing.stockByZone[zone] = newZoneStock;
    this.recomputeTotal(ing);
    ing.updatedAt = new Date().toISOString();

    const compensatingMovement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'adjustment_manual',
      zone,
      quantity: inverseQty,
      unit: ing.unit,
      previousStock: prevZoneStock,
      newStock: newZoneStock,
      unitCost: original.unitCost,
      totalValue: Math.abs(inverseQty * original.unitCost),
      referenceDoc: `CORR-${original.id}`,
      reason: `Correction mouvement ${original.id} : ${reason}`,
      performedBy,
      createdAt: new Date().toISOString()
    };

    movements.unshift(compensatingMovement);
    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.logAudit('Correction Mouvement Stock', 'stock', `Écriture correctrice pour ${ing.name} (${inverseQty > 0 ? '+' : ''}${inverseQty} ${ing.unit}, ${ZONE_LABELS[zone]}) : ${reason}`, performedBy);

    return compensatingMovement;
  }

  // ── Lots & péremptions ──

  public static getAllLots(): (StockLot & { isExpired: boolean; isExpiringSoon: boolean; daysUntilExpiry: number | null })[] {
    const lots = db.get('stockLots');
    const ingredients = db.get('ingredients');
    const ingredientById = new Map(ingredients.map(i => [i.id, i]));
    const { defaultExpiryAlertLeadDays } = db.getSettings();

    return lots.map(lot => {
      if (!lot.expirationDate) {
        return { ...lot, isExpired: false, isExpiringSoon: false, daysUntilExpiry: null };
      }
      const leadDays = ingredientById.get(lot.ingredientId)?.expiryAlertLeadDays ?? defaultExpiryAlertLeadDays;
      const daysUntilExpiry = Math.ceil((new Date(lot.expirationDate).getTime() - Date.now()) / 86400000);
      return {
        ...lot,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= leadDays,
        daysUntilExpiry
      };
    });
  }

  /** Enregistrement manuel d'un lot (correction / rattrapage), en dehors du flux de réception. */
  public static createLot(data: Omit<StockLot, 'id' | 'createdAt' | 'status'>, performedBy: string): StockLot {
    const lots = db.get('stockLots');
    const lot: StockLot = {
      ...data,
      id: `lot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    lots.unshift(lot);
    db.set('stockLots', lots);
    db.logAudit('Création Lot', 'stock', `Lot ${lot.lotNumber} créé pour ${lot.ingredientName} (${lot.quantity} ${lot.unit})`, performedBy);

    return lot;
  }

  public static updateLot(id: string, updates: Partial<Pick<StockLot, 'status' | 'notes' | 'expirationDate' | 'quantity' | 'lotNumber'>>, performedBy: string): StockLot {
    const lots = db.get('stockLots');
    const idx = lots.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Lot non trouvé');

    lots[idx] = { ...lots[idx], ...updates };
    db.set('stockLots', lots);
    db.logAudit('Mise à jour Lot', 'stock', `Lot ${lots[idx].lotNumber} modifié`, performedBy);
    return lots[idx];
  }
}
