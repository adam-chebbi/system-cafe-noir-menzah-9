import { db } from '../db/database.js';
import { Category, Product, TechnicalRecipe, Ingredient } from '../types/index.js';
import { computeIngredientLineCost, formatApproxQuantity, RangeCalcMode } from './unitConversion.js';
import { summarizeChanges } from '../utils/audit.js';

const PRODUCT_TRACKED_FIELDS = [
  { key: 'name', label: 'Nom' },
  { key: 'price', label: 'Prix', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'tvaRate', label: 'TVA', format: (v: number) => `${v}%` },
  { key: 'available', label: 'Disponible' }
];


export class CatalogService {
  // Categories
  public static getCategories(): Category[] {
    return db.get('categories').sort((a, b) => a.order - b.order);
  }

  /** Interdit plus de 2 niveaux (Catégorie → Sous-catégorie) : le parent visé ne doit pas être lui-même une sous-catégorie. */
  private static assertValidParent(categories: Category[], parentId: string | undefined, selfId?: string): void {
    if (!parentId) return;
    if (parentId === selfId) throw new Error('Une catégorie ne peut pas être sa propre catégorie parente.');
    const parent = categories.find(c => c.id === parentId);
    if (!parent) throw new Error('Catégorie parente introuvable.');
    if (parent.parentId) throw new Error('Impossible de créer plus de 2 niveaux : la catégorie parente choisie est déjà une sous-catégorie.');
  }

  public static createCategory(data: Omit<Category, 'id'>, performedBy: string): Category {
    const categories = db.get('categories');
    this.assertValidParent(categories, data.parentId);
    const newCategory: Category = {
      ...data,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    categories.push(newCategory);
    db.set('categories', categories);
    db.logAudit('Création Catégorie', 'admin', `Ajout de la catégorie ${newCategory.name}`, performedBy);
    return newCategory;
  }

  public static updateCategory(id: string, updates: Partial<Category>, performedBy: string): Category {
    const categories = db.get('categories');
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Catégorie non trouvée');
    if ('parentId' in updates) {
      this.assertValidParent(categories, updates.parentId, id);
      const hasChildren = categories.some(c => c.parentId === id);
      if (updates.parentId && hasChildren) {
        throw new Error('Impossible de transformer en sous-catégorie : cette catégorie a déjà des sous-catégories.');
      }
    }
    categories[idx] = { ...categories[idx], ...updates };
    db.set('categories', categories);
    db.logAudit('Mise à jour Catégorie', 'admin', `Modification de la catégorie ${categories[idx].name}`, performedBy);
    return categories[idx];
  }

  public static getSubCategories(categoryId: string): Category[] {
    return (db.get('categories') || [])
      .filter(c => c && c.parentId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  public static deleteCategory(id: string, performedBy: string): void {
    const categories = db.get('categories') || [];
    const cat = categories.find(c => c && c.id === id);
    if (!cat) throw new Error('Catégorie non trouvée');

    const subCategoryCount = categories.filter(c => c && c.parentId === id).length;
    if (subCategoryCount > 0) {
      throw new Error(`Impossible de supprimer : ${subCategoryCount} sous-catégorie(s) sont rattachées à cette catégorie.`);
    }

    // Check if products exist in category (as category or sub-category)
    const products = db.get('products') || [];
    const count = products.filter(p => p && (p.categoryId === id || p.subCategoryId === id)).length;
    if (count > 0) {
      throw new Error(`Impossible de supprimer : ${count} produit(s) sont rattachés à cette catégorie.`);
    }
    db.set('categories', categories.filter(c => c && c.id !== id));
    db.logAudit('Suppression Catégorie', 'admin', `Suppression de la catégorie ${cat.name}`, performedBy);
  }

  // Products
  public static getProducts(): Product[] {
    return db.get('products') || [];
  }

  public static getProductById(id: string): Product | undefined {
    return (db.get('products') || []).find(p => p && p.id === id);
  }

  public static createProduct(data: Omit<Product, 'id' | 'createdAt'>, performedBy: string): Product {
    const products = db.get('products') || [];
    const newProduct: Product = {
      ...data,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    db.set('products', products);
    db.logAudit('Création Produit', 'admin', `Ajout du produit ${newProduct.name} (${newProduct.price.toFixed(3)} DT)`, performedBy);
    return newProduct;
  }

  public static updateProduct(id: string, updates: Partial<Product>, performedBy: string): Product {
    const products = db.get('products') || [];
    const idx = products.findIndex(p => p && p.id === id);
    if (idx === -1) throw new Error('Produit non trouvé');
    const before = products[idx];
    products[idx] = { ...before, ...updates };
    db.set('products', products);
    const changes = summarizeChanges(before, products[idx], PRODUCT_TRACKED_FIELDS);
    db.logAudit('Mise à jour Produit', 'admin', `Modification du produit ${products[idx].name}`, performedBy, changes);
    return products[idx];
  }

  public static deleteProduct(id: string, performedBy: string): void {
    const products = db.get('products') || [];
    const p = products.find(prod => prod && prod.id === id);
    if (!p) throw new Error('Produit non trouvé');

    // Also remove or unlink technical recipe
    const recipes = (db.get('recipes') || []).filter(r => r && r.productId !== id);
    db.set('recipes', recipes);

    db.set('products', products.filter(prod => prod && prod.id !== id));
    db.logAudit('Suppression Produit', 'admin', `Suppression du produit ${p.name}`, performedBy);
  }

  // Technical Recipes ("Fiches Techniques")
  public static getRecipes(): TechnicalRecipe[] {
    return db.get('recipes') || [];
  }

  public static getRecipeByProductId(productId: string): TechnicalRecipe | undefined {
    return db.get('recipes').find(r => r.productId === productId);
  }

  /** Profondeur maximale d'imbrication de sous-recettes autorisée (garde-fou, en plus de la détection de cycle). */
  private static readonly MAX_SUBRECIPE_DEPTH = 6;

  /** Coût par portion d'une fiche technique utilisée comme sous-recette (composant) d'une autre recette. */
  private static subRecipeCostPerPortion(recipe: TechnicalRecipe): number {
    return recipe.portionYield > 0 ? recipe.totalIngredientsCost / recipe.portionYield : 0;
  }

  /**
   * Vérifie qu'une ligne de sous-recette ne crée pas de cycle (direct ou transitif) et ne dépasse
   * pas la profondeur maximale autorisée. Lève une erreur explicite sinon.
   */
  private static assertNoRecipeCycle(
    recipes: TechnicalRecipe[],
    productId: string,
    ingredientLines: TechnicalRecipe['ingredients'],
    depth = 0
  ): void {
    if (depth > this.MAX_SUBRECIPE_DEPTH) {
      throw new Error(`Profondeur de sous-recettes trop importante (maximum ${this.MAX_SUBRECIPE_DEPTH} niveaux).`);
    }
    for (const line of ingredientLines) {
      if (line.type !== 'subrecipe' || !line.subRecipeProductId) continue;
      if (line.subRecipeProductId === productId) {
        throw new Error('Une fiche technique ne peut pas se référencer elle-même comme sous-recette (directement ou via une chaîne).');
      }
      const childRecipe = recipes.find(r => r.productId === line.subRecipeProductId);
      if (childRecipe) {
        this.assertNoRecipeCycle(recipes, productId, childRecipe.ingredients, depth + 1);
      }
    }
  }

  /**
   * Résout récursivement une fiche technique (vendue en quantité `quantitySold`) jusqu'aux
   * ingrédients bruts, en développant les lignes de sous-recette. Retourne une Map
   * ingredientId → quantité totale à déduire (unité stock de l'ingrédient).
   *
   * Logique UNIQUE et partagée entre la déduction de stock en temps réel (StockService) et le
   * calcul indépendant de la consommation théorique, afin de garantir que les deux mécanismes
   * s'accordent toujours sur "combien tel ingrédient est réellement consommé par tel produit".
   */
  public static expandRecipeToRawIngredients(
    productId: string,
    quantitySold: number,
    visited: Set<string> = new Set()
  ): Map<string, number> {
    const result = new Map<string, number>();
    if (quantitySold <= 0 || visited.has(productId)) return result;

    const recipes: TechnicalRecipe[] = db.get('recipes') || [];
    const recipe = recipes.find(r => r.productId === productId);
    if (!recipe) return result;

    const nextVisited = new Set(visited);
    nextVisited.add(productId);

    const portionFactor = quantitySold / (recipe.portionYield || 1);

    for (const item of recipe.ingredients) {
      if (item.type === 'subrecipe' && item.subRecipeProductId) {
        const subPortionsUsed = item.quantity * portionFactor;
        const subMap = this.expandRecipeToRawIngredients(item.subRecipeProductId, subPortionsUsed, nextVisited);
        for (const [ingId, qty] of subMap) {
          result.set(ingId, (result.get(ingId) || 0) + qty);
        }
      } else {
        const deductQty = item.quantity * portionFactor;
        result.set(item.ingredientId, (result.get(item.ingredientId) || 0) + deductQty);
      }
    }

    return result;
  }

  /**
   * Recalcule les lignes d'ingrédients (matières premières ET sous-recettes), le coût matière total
   * et la marge RÉELLE (calculée) d'une fiche technique à partir des coûts ACTUELS. La marge cible
   * (saisie par l'utilisateur) n'est jamais touchée ici — voir saveRecipe.
   */
  private static recalcRecipeIngredients(
    items: TechnicalRecipe['ingredients'],
    sellingPrice: number,
    ingredients: Ingredient[],
    recipes: TechnicalRecipe[],
    mode: RangeCalcMode
  ): { calculatedIngredients: TechnicalRecipe['ingredients']; totalCostRounded: number; actualMargin: number } {
    let totalCost = 0;

    const calculatedIngredients = items.map(item => {
      const isSubRecipe = item.type === 'subrecipe' && !!item.subRecipeProductId;
      const subRecipe = isSubRecipe ? recipes.find(r => r.productId === item.subRecipeProductId) : undefined;
      const ing = !isSubRecipe ? ingredients.find(i => i.id === item.ingredientId) : undefined;

      const unitCost = isSubRecipe
        ? (subRecipe ? this.subRecipeCostPerPortion(subRecipe) : (item.unitCost || 0))
        : (ing ? ing.costPerUnit : (item.unitCost || 0));
      const stockUnit = isSubRecipe ? 'portion' : (ing ? ing.unit : item.unit);

      // Rétrocompatibilité : si quantityMin n'est pas défini (ancienne structure),
      // on utilise quantity directement comme quantityMin et recipeUnit = stockUnit.
      const quantityMin: number = item.quantityMin ?? item.quantity;
      const quantityMax: number | undefined = item.quantityMax;
      // Les lignes de sous-recette sont toujours exprimées en "portion" (pas de conversion d'unité).
      const recipeUnit: string = isSubRecipe ? 'portion' : (item.recipeUnit ?? stockUnit);

      // Calcul interne : conversion vers l'unité stock + coût ligne
      let calcQtyInStockUnit: number;
      let lineCost: number;
      try {
        ({ calcQtyInStockUnit, lineCost } = computeIngredientLineCost(
          quantityMin,
          quantityMax,
          recipeUnit,
          stockUnit,
          unitCost,
          mode
        ));
      } catch (convErr: any) {
        // Si la conversion est impossible (unités incompatibles), on enregistre dans le journal
        // et on utilise quantityMin directement en guise de fallback sécuritaire.
        console.error(`[recalcRecipeIngredients] Conversion échouée pour ${item.ingredientName}: ${convErr.message}`);
        calcQtyInStockUnit = quantityMin;
        lineCost = quantityMin * unitCost;
      }

      const lineCostRounded = Number(lineCost.toFixed(4));
      totalCost += lineCostRounded;

      // Générer la chaîne d'affichage ≈ (non persistée, recalculée au besoin)
      const displayQuantity = formatApproxQuantity(quantityMin, quantityMax, recipeUnit);

      return {
        ...item,
        type: (isSubRecipe ? 'subrecipe' : 'ingredient') as 'ingredient' | 'subrecipe',
        subRecipeProductId: isSubRecipe ? item.subRecipeProductId : undefined,
        quantityMin,
        quantityMax,
        recipeUnit,
        // quantity = valeur EN UNITÉ STOCK ('portion' pour une sous-recette) utilisée pour la déduction
        quantity: Number(calcQtyInStockUnit.toFixed(6)),
        unit: stockUnit,
        unitCost,
        totalCost: lineCostRounded,
        displayQuantity
      };
    });

    const totalCostRounded = Number(totalCost.toFixed(2));
    const actualMargin = sellingPrice > 0 ? Number((((sellingPrice - totalCostRounded) / sellingPrice) * 100).toFixed(1)) : 0;

    return { calculatedIngredients, totalCostRounded, actualMargin };
  }

  /**
   * Recalcule en cascade toutes les fiches qui utilisent, directement ou via une chaîne de
   * sous-recettes, l'un des productId fournis comme composant. Les productId de départ ne sont PAS
   * recalculés eux-mêmes ici (déjà à jour par l'appelant) — seuls leurs parents le sont.
   */
  private static cascadeRecalculateParents(startProductIds: Set<string>, performedBy: string): TechnicalRecipe[] {
    const recipes: TechnicalRecipe[] = db.get('recipes') || [];
    const ingredients = db.get('ingredients') || [];
    const { recipeRangeCalcMode } = db.getSettings();
    const mode: RangeCalcMode = recipeRangeCalcMode;

    const affectedProductIds = new Set<string>();
    let frontier = startProductIds;
    let pass = 0;

    while (frontier.size > 0 && pass < this.MAX_SUBRECIPE_DEPTH + 1) {
      pass++;
      const nextFrontier = new Set<string>();
      for (const targetId of frontier) {
        for (const r of recipes) {
          if (
            r.productId !== targetId &&
            !affectedProductIds.has(r.productId) &&
            !startProductIds.has(r.productId) &&
            r.ingredients.some(item => item.type === 'subrecipe' && item.subRecipeProductId === targetId)
          ) {
            nextFrontier.add(r.productId);
          }
        }
      }

      for (const productId of nextFrontier) {
        const idx = recipes.findIndex(r => r.productId === productId);
        if (idx === -1) continue;
        const recipe = recipes[idx];
        const { calculatedIngredients, totalCostRounded, actualMargin } = this.recalcRecipeIngredients(
          recipe.ingredients, recipe.suggestedSellingPrice || 0, ingredients, recipes, mode
        );
        recipes[idx] = {
          ...recipe,
          ingredients: calculatedIngredients,
          totalIngredientsCost: totalCostRounded,
          actualMarginPercentage: actualMargin,
          updatedAt: new Date().toISOString()
        };
        affectedProductIds.add(productId);
      }

      frontier = nextFrontier;
    }

    const affected = recipes.filter(r => affectedProductIds.has(r.productId));
    if (affected.length > 0) {
      db.set('recipes', recipes);
      db.logAudit(
        'Recalcul Automatique Fiches Techniques (sous-recettes)',
        'admin',
        `${affected.length} fiche(s) technique(s) recalculée(s) en cascade suite à la mise à jour d'une sous-recette (${affected.map(r => r.productName).join(', ')})`,
        performedBy
      );
    }
    return affected;
  }

  /**
   * Recalcule le coût matière et la marge réelle de toutes les fiches techniques utilisant un
   * ingrédient donné — directement, puis en cascade via toute chaîne de sous-recettes. Déclenché
   * automatiquement lorsque le coût de l'ingrédient change (édition manuelle, réception de stock,
   * traitement de facture fournisseur), afin que le coût matière et la marge affichés restent
   * toujours à jour sans intervention manuelle sur chaque fiche.
   */
  public static recalculateRecipesForIngredient(ingredientId: string, performedBy: string): TechnicalRecipe[] {
    const recipes: TechnicalRecipe[] = db.get('recipes') || [];
    const ingredients = db.get('ingredients') || [];
    const { recipeRangeCalcMode } = db.getSettings();
    const mode: RangeCalcMode = recipeRangeCalcMode;

    const directlyAffected: TechnicalRecipe[] = [];
    const directProductIds = new Set<string>();

    const updatedRecipes = recipes.map(recipe => {
      if (!recipe.ingredients.some(item => item.type !== 'subrecipe' && item.ingredientId === ingredientId)) return recipe;

      const { calculatedIngredients, totalCostRounded, actualMargin } = this.recalcRecipeIngredients(
        recipe.ingredients,
        recipe.suggestedSellingPrice || 0,
        ingredients,
        recipes,
        mode
      );

      const updated: TechnicalRecipe = {
        ...recipe,
        ingredients: calculatedIngredients,
        totalIngredientsCost: totalCostRounded,
        actualMarginPercentage: actualMargin,
        updatedAt: new Date().toISOString()
      };
      directlyAffected.push(updated);
      directProductIds.add(updated.productId);
      return updated;
    });

    if (directlyAffected.length > 0) {
      db.set('recipes', updatedRecipes);
      db.logAudit(
        'Recalcul Automatique Fiches Techniques',
        'admin',
        `${directlyAffected.length} fiche(s) technique(s) recalculée(s) suite à un changement de coût d'ingrédient (${directlyAffected.map(r => r.productName).join(', ')})`,
        performedBy
      );
    }

    const cascaded = directProductIds.size > 0 ? this.cascadeRecalculateParents(directProductIds, performedBy) : [];

    return [...directlyAffected, ...cascaded];
  }

  public static saveRecipe(data: Omit<TechnicalRecipe, 'id' | 'updatedAt'>, performedBy: string): TechnicalRecipe {
    const recipes = db.get('recipes');
    const products = db.get('products');
    const ingredients = db.get('ingredients');

    // Validation anti-cycle pour les lignes de sous-recette avant tout calcul
    this.assertNoRecipeCycle(recipes, data.productId, data.ingredients || []);

    // Récupérer le mode de calcul de plage configuré (par défaut : 'max' = prudent)
    const { recipeRangeCalcMode } = db.getSettings();
    const mode: RangeCalcMode = recipeRangeCalcMode;

    const { calculatedIngredients, totalCostRounded, actualMargin } = this.recalcRecipeIngredients(
      data.ingredients,
      data.suggestedSellingPrice || 0,
      ingredients,
      recipes,
      mode
    );

    // Marge CIBLE : uniquement la valeur saisie par l'utilisateur — jamais écrasée par le calcul.
    const existingRecipe = recipes.find(r => r.productId === data.productId);
    const targetMargin = typeof data.targetMarginPercentage === 'number' && !isNaN(data.targetMarginPercentage)
      ? data.targetMarginPercentage
      : (existingRecipe?.targetMarginPercentage ?? 70);

    const existingIdx = recipes.findIndex(r => r.productId === data.productId);
    let recipeResult: TechnicalRecipe;

    if (existingIdx !== -1) {
      recipeResult = {
        ...recipes[existingIdx],
        ...data,
        ingredients: calculatedIngredients,
        totalIngredientsCost: totalCostRounded,
        targetMarginPercentage: targetMargin,
        actualMarginPercentage: actualMargin,
        updatedAt: new Date().toISOString()
      };
      recipes[existingIdx] = recipeResult;
    } else {
      recipeResult = {
        ...data,
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredients: calculatedIngredients,
        totalIngredientsCost: totalCostRounded,
        targetMarginPercentage: targetMargin,
        actualMarginPercentage: actualMargin,
        updatedAt: new Date().toISOString()
      };
      recipes.push(recipeResult);
    }

    // Mettre à jour le flag hasRecipe sur le produit
    const prodIdx = products.findIndex(p => p.id === data.productId);
    if (prodIdx !== -1) {
      products[prodIdx].hasRecipe = true;
      db.set('products', products);
    }

    db.set('recipes', recipes);
    db.logAudit(
      'Enregistrement Fiche Technique',
      'admin',
      `Fiche technique pour ${data.productName} (Coût matière: ${totalCostRounded.toFixed(3)} DT, Marge réelle: ${actualMargin}%, Marge cible: ${targetMargin}%, Mode plage: ${mode})`,
      performedBy
    );

    // Si cette fiche est elle-même utilisée comme sous-recette ailleurs, propager le recalcul aux parents.
    this.cascadeRecalculateParents(new Set([data.productId]), performedBy);

    return recipeResult;
  }

  public static deleteRecipe(productId: string, performedBy: string): void {
    const recipes = db.get('recipes') || [];
    const products = db.get('products') || [];
    const rec = recipes.find(r => r && r.productId === productId);
    if (!rec) throw new Error('Fiche technique non trouvée');

    const dependents = recipes.filter(r => r.productId !== productId && r.ingredients.some(item => item.type === 'subrecipe' && item.subRecipeProductId === productId));
    if (dependents.length > 0) {
      throw new Error(`Impossible de supprimer : cette fiche est utilisée comme sous-recette dans ${dependents.length} autre(s) fiche(s) (${dependents.map(r => r.productName).join(', ')}).`);
    }

    db.set('recipes', recipes.filter(r => r && r.productId !== productId));

    const prodIdx = products.findIndex(p => p && p.id === productId);
    if (prodIdx !== -1) {
      products[prodIdx].hasRecipe = false;
      db.set('products', products);
    }

    db.logAudit('Suppression Fiche Technique', 'admin', `Suppression fiche technique ${rec.productName}`, performedBy);
  }

  // Import / Export CSV functionality
  public static exportProductsCSV(): string {
    const products = db.get('products');
    const categories = db.get('categories');

    const headers = ['ID', 'Nom', 'Categorie', 'SousCategorie', 'Prix', 'TVA', 'Disponible', 'Station', 'Description', 'Image'];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Inconnue';
      const subCat = p.subCategoryId ? (categories.find(c => c.id === p.subCategoryId)?.name || '') : '';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        `"${subCat.replace(/"/g, '""')}"`,
        p.price,
        p.tvaRate,
        p.available ? 'OUI' : 'NON',
        `"${p.preparationStation}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        `"${(p.imageUrl || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  public static importProductsCSV(csvContent: string, performedBy: string): { imported: number; errors: string[] } {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { imported: 0, errors: ['Fichier CSV vide ou sans données'] };
    }

    const categories = db.get('categories');
    const products = db.get('products');
    const errors: string[] = [];
    let count = 0;

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(';').map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 4) {
        errors.push(`Ligne ${i + 1}: format invalide (au moins Nom, Catégorie, Prix requis)`);
        continue;
      }

      // Rétrocompatibilité : l'ancien format (sans colonne SousCategorie) a 9 colonnes utiles au lieu de 10.
      const hasSubCategoryColumn = parts.length >= 10;
      const [idOrName, nameRaw, categoryRaw, subCategoryRaw, priceRaw, tvaRaw, availableRaw, stationRaw, descRaw, imageRaw] = hasSubCategoryColumn
        ? parts
        : [parts[0], parts[1], parts[2], '', parts[3], parts[4], parts[5], parts[6], parts[7], parts[8]];
      const name = nameRaw || idOrName;
      const catName = categoryRaw || 'Cafés Spécialité';
      const subCatName = (subCategoryRaw || '').trim();
      const price = parseFloat(priceRaw) || 0;
      const tva = parseFloat(tvaRaw) || 7;
      const available = availableRaw ? (availableRaw.toUpperCase() === 'OUI' || availableRaw.toUpperCase() === 'TRUE' || availableRaw === '1') : true;
      const station = (stationRaw === 'kitchen' || stationRaw === 'counter' || stationRaw === 'bar') ? stationRaw : 'bar';
      const description = descRaw || '';
      const imageUrl = imageRaw || '';

      if (!name || price <= 0) {
        errors.push(`Ligne ${i + 1}: nom ou prix invalide (${name}, ${price})`);
        continue;
      }

      // Match or create category (catégorie de premier niveau uniquement)
      let category = categories.find(c => !c.parentId && c.name.toLowerCase() === catName.toLowerCase());
      if (!category) {
        category = {
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          icon: 'Coffee',
          order: categories.length + 1,
          color: '#2B422F',
          active: true
        };
        categories.push(category);
      }

      // Match or create sub-category (rattachée à la catégorie ci-dessus), si renseignée
      let subCategory: typeof category | undefined;
      if (subCatName) {
        subCategory = categories.find(c => c.parentId === category!.id && c.name.toLowerCase() === subCatName.toLowerCase());
        if (!subCategory) {
          subCategory = {
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: subCatName,
            slug: subCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            icon: 'Coffee',
            order: categories.filter(c => c.parentId === category!.id).length + 1,
            color: '#2B422F',
            active: true,
            parentId: category.id
          };
          categories.push(subCategory);
        }
      }

      // Check existing product
      const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.price = price;
        existing.tvaRate = tva;
        existing.available = available;
        existing.description = description || existing.description;
        existing.categoryId = category.id;
        existing.subCategoryId = subCategory?.id;
        existing.preparationStation = station as any;
        if (imageUrl) existing.imageUrl = imageUrl;
      } else {
        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name,
          categoryId: category.id,
          subCategoryId: subCategory?.id,
          description,
          price,
          tvaRate: tva,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80',
          available,
          hasRecipe: false,
          options: [],
          preparationStation: station as any,
          createdAt: new Date().toISOString()
        };
        products.push(newProd);
      }
      count++;
    }

    db.set('categories', categories);
    db.set('products', products);
    db.logAudit('Import CSV Produits', 'admin', `Importation réussie de ${count} produits (${errors.length} erreurs)`, performedBy);

    return { imported: count, errors };
  }
}
