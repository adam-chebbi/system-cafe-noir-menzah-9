import { db } from '../db/database.js';
import { ProductLabelMapping } from '../types/index.js';

/** Normalisation utilisée pour comparer deux libellés de manière fiable (accents, casse, espaces). */
export function normalizeLabel(label: string): string {
  return (label || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ProductMappingService {
  public static getAll(supplierId?: string): ProductLabelMapping[] {
    const mappings = db.get('productLabelMappings');
    return supplierId ? mappings.filter(m => m.supplierId === supplierId) : mappings;
  }

  public static findMapping(supplierId: string, rawLabel: string): ProductLabelMapping | undefined {
    const norm = normalizeLabel(rawLabel);
    return db.get('productLabelMappings').find(m => m.supplierId === supplierId && m.normalizedLabel === norm);
  }

  /**
   * Crée la correspondance si elle n'existe pas encore pour ce fournisseur + libellé, sinon met à
   * jour l'ingrédient ciblé (l'administrateur peut corriger une correspondance mémorisée à tout moment).
   */
  public static upsertMapping(
    data: { supplierId: string; supplierName: string; rawLabel: string; ingredientId: string; ingredientName: string },
    performedBy: string
  ): ProductLabelMapping {
    const mappings = db.get('productLabelMappings');
    const norm = normalizeLabel(data.rawLabel);
    const idx = mappings.findIndex(m => m.supplierId === data.supplierId && m.normalizedLabel === norm);

    if (idx !== -1) {
      mappings[idx] = {
        ...mappings[idx],
        rawLabel: data.rawLabel,
        ingredientId: data.ingredientId,
        ingredientName: data.ingredientName,
        updatedAt: new Date().toISOString()
      };
      db.set('productLabelMappings', mappings);
      db.logAudit('Mise à jour Correspondance Produit', 'stock', `Correspondance "${data.rawLabel}" (${data.supplierName}) → ${data.ingredientName}`, performedBy);
      return mappings[idx];
    }

    const created: ProductLabelMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      rawLabel: data.rawLabel,
      normalizedLabel: norm,
      ingredientId: data.ingredientId,
      ingredientName: data.ingredientName,
      createdBy: performedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timesApplied: 0
    };
    mappings.unshift(created);
    db.set('productLabelMappings', mappings);
    db.logAudit('Création Correspondance Produit', 'stock', `Nouvelle correspondance "${data.rawLabel}" (${data.supplierName}) → ${data.ingredientName}`, performedBy);
    return created;
  }

  public static updateMapping(id: string, updates: { ingredientId: string; ingredientName: string }, performedBy: string): ProductLabelMapping {
    const mappings = db.get('productLabelMappings');
    const idx = mappings.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Correspondance non trouvée');
    mappings[idx] = { ...mappings[idx], ...updates, updatedAt: new Date().toISOString() };
    db.set('productLabelMappings', mappings);
    db.logAudit('Modification Correspondance Produit', 'stock', `Correspondance "${mappings[idx].rawLabel}" réassignée à ${updates.ingredientName}`, performedBy);
    return mappings[idx];
  }

  /** Incrémente le compteur d'usage quand une correspondance mémorisée est appliquée automatiquement. */
  public static recordUsage(id: string): void {
    const mappings = db.get('productLabelMappings');
    const idx = mappings.findIndex(m => m.id === id);
    if (idx === -1) return;
    mappings[idx].timesApplied = (mappings[idx].timesApplied || 0) + 1;
    db.set('productLabelMappings', mappings);
  }

  public static deleteMapping(id: string, performedBy: string): void {
    const mappings = db.get('productLabelMappings');
    const idx = mappings.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Correspondance non trouvée');
    const label = mappings[idx].rawLabel;
    mappings.splice(idx, 1);
    db.set('productLabelMappings', mappings);
    db.logAudit('Suppression Correspondance Produit', 'stock', `Suppression de la correspondance "${label}"`, performedBy);
  }
}
