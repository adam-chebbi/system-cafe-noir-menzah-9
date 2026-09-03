import { db } from '../db/database.js';
import { Ingredient, StockMovement, StockWaste, InventoryAudit } from '../types/index.js';
import { CatalogService } from './catalogService.js';

export class StockService {
  public static getAllIngredients(): Ingredient[] {
    return db.get('ingredients');
  }

  public static getIngredientById(id: string): Ingredient | undefined {
    return db.get('ingredients').find(ing => ing.id === id);
  }

  public static createIngredient(data: Omit<Ingredient, 'id' | 'updatedAt'>, performedBy: string): Ingredient {
    const ingredients = db.get('ingredients');
    const newIngredient: Ingredient = {
      ...data,
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
    const updated: Ingredient = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    ingredients[index] = updated;
    db.set('ingredients', ingredients);

    db.logAudit('Mise à jour Ingrédient', 'stock', `Modification de ${updated.name}`, performedBy);

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
   * Deduct stock based on technical recipe for a product and its options.
   * Développe récursivement les sous-recettes jusqu'aux ingrédients bruts (CatalogService partage
   * cette même logique d'expansion avec le calcul de consommation théorique, pour garantir la cohérence).
   */
  public static deductStockForProduct(productId: string, quantity: number, referenceDoc: string, performedBy: string) {
    const recipes = db.get('recipes');
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    const recipe = recipes.find(r => r.productId === productId);
    if (!recipe) {
      return; // No technical recipe configured for this product
    }

    const rawConsumption = CatalogService.expandRecipeToRawIngredients(productId, quantity);

    for (const [ingredientId, deductQty] of rawConsumption) {
      const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
      if (ingIndex === -1) continue;

      const ing = ingredients[ingIndex];
      const prevStock = ing.currentStock;
      const newStock = Math.max(0, Number((prevStock - deductQty).toFixed(4)));

      ingredients[ingIndex].currentStock = newStock;
      ingredients[ingIndex].updatedAt = new Date().toISOString();

      // Record movement
      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        type: 'out_sale',
        quantity: -deductQty,
        unit: ing.unit,
        previousStock: prevStock,
        newStock,
        unitCost: ing.costPerUnit,
        totalValue: Number((deductQty * ing.costPerUnit).toFixed(2)),
        referenceDoc,
        reason: `Vente produit: ${recipe.productName} (x${quantity})`,
        performedBy,
        createdAt: new Date().toISOString()
      };
      movements.unshift(movement);

      // Check low stock alert
      if (newStock <= ing.minStockThreshold) {
        db.createAlert(
          'low_stock',
          `Seuil de stock bas : ${ing.name}`,
          `Stock actuel: ${newStock} ${ing.unit} (Seuil minimal: ${ing.minStockThreshold} ${ing.unit})`,
          'warning',
          '/stock',
          { ingredientId: ing.id }
        );
      }
    }

    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
  }

  /**
   * Replenish stock manually or via purchase reception
   */
  public static addStock(ingredientId: string, quantity: number, unitCost: number, referenceDoc: string, reason: string, performedBy: string): StockMovement {
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    const ingIndex = ingredients.findIndex(i => i.id === ingredientId);
    if (ingIndex === -1) throw new Error(`Ingrédient non trouvé: ${ingredientId}`);

    const ing = ingredients[ingIndex];
    const prevStock = ing.currentStock;
    const prevCost = ing.costPerUnit;
    const newStock = Number((prevStock + quantity).toFixed(4));

    ingredients[ingIndex].currentStock = newStock;
    if (unitCost > 0) {
      // Weighted average cost or update cost
      ingredients[ingIndex].costPerUnit = unitCost;
    }
    ingredients[ingIndex].updatedAt = new Date().toISOString();

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'in_reception',
      quantity,
      unit: ing.unit,
      previousStock: prevStock,
      newStock,
      unitCost: unitCost || ing.costPerUnit,
      totalValue: Number((quantity * (unitCost || ing.costPerUnit)).toFixed(2)),
      referenceDoc,
      reason,
      performedBy,
      createdAt: new Date().toISOString()
    };
    movements.unshift(movement);

    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.logAudit('Entrée de Stock', 'stock', `Ajout de ${quantity} ${ing.unit} pour ${ing.name} (Réf: ${referenceDoc})`, performedBy);

    if (unitCost > 0 && unitCost !== prevCost) {
      CatalogService.recalculateRecipesForIngredient(ingredientId, performedBy);
    }

    return movement;
  }

  /**
   * Record Waste / Spoilage
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
        const prevStock = ing.currentStock;
        const newStock = Math.max(0, Number((prevStock - data.quantity).toFixed(4)));

        ingredients[ingIndex].currentStock = newStock;
        ingredients[ingIndex].updatedAt = new Date().toISOString();

        const movement: StockMovement = {
          id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'out_waste',
          quantity: -data.quantity,
          unit: ing.unit,
          previousStock: prevStock,
          newStock,
          unitCost: ing.costPerUnit,
          totalValue: waste.estimatedCost,
          referenceDoc: waste.id,
          reason: `Perte / Gaspillage: ${waste.reason} (${waste.notes || ''})`,
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
   * Save and validate physical inventory audit
   */
  public static createInventoryAudit(items: InventoryAudit['items'], performedBy: string): InventoryAudit {
    const audits = db.get('inventoryAudits');
    const ingredients = db.get('ingredients');
    const movements = db.get('stockMovements');

    let totalExpectedValue = 0;
    let totalCountedValue = 0;
    let totalDifferenceValue = 0;

    const auditNumber = `INV-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;

    // Apply adjustments to stock
    for (const item of items) {
      totalExpectedValue += item.expectedStock * item.unitCost;
      totalCountedValue += item.countedStock * item.unitCost;
      totalDifferenceValue += item.differenceValue;

      const ingIndex = ingredients.findIndex(i => i.id === item.ingredientId);
      if (ingIndex !== -1) {
        const ing = ingredients[ingIndex];
        const prev = ing.currentStock;
        ing.currentStock = item.countedStock;
        ing.updatedAt = new Date().toISOString();

        if (item.difference !== 0) {
          const movement: StockMovement = {
            id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ingredientId: ing.id,
            ingredientName: ing.name,
            type: 'adjustment_inventory',
            quantity: item.difference,
            unit: ing.unit,
            previousStock: prev,
            newStock: item.countedStock,
            unitCost: item.unitCost,
            totalValue: Math.abs(item.differenceValue),
            referenceDoc: auditNumber,
            reason: `Ajustement inventaire physique ${auditNumber}`,
            performedBy,
            createdAt: new Date().toISOString()
          };
          movements.unshift(movement);
        }
      }
    }

    const audit: InventoryAudit = {
      id: `aud_${Date.now()}`,
      auditNumber,
      date: new Date().toISOString().split('T')[0],
      performedBy,
      status: 'validated',
      items,
      totalExpectedValue: Number(totalExpectedValue.toFixed(3)),
      totalCountedValue: Number(totalCountedValue.toFixed(3)),
      totalDifferenceValue: Number(totalDifferenceValue.toFixed(3)),
      createdAt: new Date().toISOString(),
      validatedAt: new Date().toISOString()
    };

    audits.unshift(audit);
    db.set('ingredients', ingredients);
    db.set('stockMovements', movements);
    db.set('inventoryAudits', audits);

    db.logAudit('Inventaire Validé', 'stock', `Validation de l'inventaire ${auditNumber} (Écart net: ${audit.totalDifferenceValue.toFixed(3)} DT)`, performedBy);

    return audit;
  }

  /**
   * Create a draft audit (without modifying stock yet)
   */
  public static createDraftAudit(items: InventoryAudit['items'], performedBy: string): InventoryAudit {
    const audits = db.get('inventoryAudits');
    const auditNumber = `INV-${new Date().getFullYear()}-${String(audits.length + 1).padStart(3, '0')}`;

    let totalExpectedValue = 0;
    let totalCountedValue = 0;
    let totalDifferenceValue = 0;

    for (const item of items) {
      totalExpectedValue += item.expectedStock * item.unitCost;
      totalCountedValue += item.countedStock * item.unitCost;
      totalDifferenceValue += item.differenceValue;
    }

    const audit: InventoryAudit = {
      id: `aud_${Date.now()}`,
      auditNumber,
      date: new Date().toISOString().split('T')[0],
      performedBy,
      status: 'draft',
      items,
      totalExpectedValue: Number(totalExpectedValue.toFixed(2)),
      totalCountedValue: Number(totalCountedValue.toFixed(2)),
      totalDifferenceValue: Number(totalDifferenceValue.toFixed(2)),
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
      let totalExpectedValue = 0;
      let totalCountedValue = 0;
      let totalDifferenceValue = 0;
      for (const item of updates.items) {
        totalExpectedValue += item.expectedStock * item.unitCost;
        totalCountedValue += item.countedStock * item.unitCost;
        totalDifferenceValue += item.differenceValue;
      }
      audit.totalExpectedValue = Number(totalExpectedValue.toFixed(2));
      audit.totalCountedValue = Number(totalCountedValue.toFixed(2));
      audit.totalDifferenceValue = Number(totalDifferenceValue.toFixed(2));
    }

    if (updates.status === 'validated' && audit.status === 'draft') {
      // Validate and apply to actual stock
      const ingredients = db.get('ingredients');
      const movements = db.get('stockMovements');

      for (const item of audit.items) {
        const ingIndex = ingredients.findIndex(i => i.id === item.ingredientId);
        if (ingIndex !== -1) {
          const ing = ingredients[ingIndex];
          const prev = ing.currentStock;
          ing.currentStock = item.countedStock;
          ing.updatedAt = new Date().toISOString();

          if (item.difference !== 0) {
            const movement: StockMovement = {
              id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              ingredientId: ing.id,
              ingredientName: ing.name,
              type: 'adjustment_inventory',
              quantity: item.difference,
              unit: ing.unit,
              previousStock: prev,
              newStock: item.countedStock,
              unitCost: item.unitCost,
              totalValue: Math.abs(item.differenceValue),
              referenceDoc: audit.auditNumber,
              reason: `Validation inventaire ${audit.auditNumber}`,
              performedBy,
              createdAt: new Date().toISOString()
            };
            movements.unshift(movement);
          }
        }
      }
      audit.status = 'validated';
      audit.validatedAt = new Date().toISOString();
      db.set('ingredients', ingredients);
      db.set('stockMovements', movements);
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
   * Correct a faulty stock movement by applying an inverse compensating entry
   */
  public static correctStockMovement(movementId: string, reason: string, performedBy: string): StockMovement {
    const movements = db.get('stockMovements');
    const ingredients = db.get('ingredients');
    const original = movements.find(m => m.id === movementId);
    if (!original) throw new Error('Mouvement de stock non trouvé');

    const ingIndex = ingredients.findIndex(i => i.id === original.ingredientId);
    if (ingIndex === -1) throw new Error('Ingrédient associé introuvable');

    const ing = ingredients[ingIndex];
    const prevStock = ing.currentStock;
    // Inverse quantity
    const inverseQty = -original.quantity;
    const newStock = Math.max(0, Number((prevStock + inverseQty).toFixed(4)));

    ing.currentStock = newStock;
    ing.updatedAt = new Date().toISOString();

    const compensatingMovement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'adjustment_manual',
      quantity: inverseQty,
      unit: ing.unit,
      previousStock: prevStock,
      newStock,
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
    db.logAudit('Correction Mouvement Stock', 'stock', `Écriture correctrice pour ${ing.name} (${inverseQty > 0 ? '+' : ''}${inverseQty} ${ing.unit}) : ${reason}`, performedBy);

    return compensatingMovement;
  }
}

