import { db } from '../db/database.js';
import { Category, Product, TechnicalRecipe, Ingredient } from '../types/index.js';
import { computeIngredientLineCost, formatApproxQuantity, RangeCalcMode } from './unitConversion.js';


export class CatalogService {
  // Categories
  public static getCategories(): Category[] {
    return db.get('categories').sort((a, b) => a.order - b.order);
  }

  public static createCategory(data: Omit<Category, 'id'>, performedBy: string): Category {
    const categories = db.get('categories');
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
    categories[idx] = { ...categories[idx], ...updates };
    db.set('categories', categories);
    db.logAudit('Mise à jour Catégorie', 'admin', `Modification de la catégorie ${categories[idx].name}`, performedBy);
    return categories[idx];
  }

  public static deleteCategory(id: string, performedBy: string): void {
    const categories = db.get('categories') || [];
    const cat = categories.find(c => c && c.id === id);
    if (!cat) throw new Error('Catégorie non trouvée');
    // Check if products exist in category
    const products = db.get('products') || [];
    const count = products.filter(p => p && p.categoryId === id).length;
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
    products[idx] = { ...products[idx], ...updates };
    db.set('products', products);
    db.logAudit('Mise à jour Produit', 'admin', `Modification du produit ${products[idx].name}`, performedBy);
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

  public static saveRecipe(data: Omit<TechnicalRecipe, 'id' | 'updatedAt'>, performedBy: string): TechnicalRecipe {
    const recipes = db.get('recipes');
    const products = db.get('products');
    const ingredients = db.get('ingredients');

    // Récupérer le mode de calcul de plage configuré (par défaut : 'max' = prudent)
    const { recipeRangeCalcMode } = db.getSettings();
    const mode: RangeCalcMode = recipeRangeCalcMode;

    let totalCost = 0;

    const calculatedIngredients = data.ingredients.map(item => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      const unitCost = ing ? ing.costPerUnit : (item.unitCost || 0);
      const stockUnit = ing ? ing.unit : item.unit;

      // Rétrocompatibilité : si quantityMin n'est pas défini (ancienne structure),
      // on utilise quantity directement comme quantityMin et recipeUnit = stockUnit.
      const quantityMin: number = item.quantityMin ?? item.quantity;
      const quantityMax: number | undefined = item.quantityMax;
      const recipeUnit: string = item.recipeUnit ?? stockUnit;

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
        console.error(`[saveRecipe] Conversion échouée pour ${item.ingredientName}: ${convErr.message}`);
        calcQtyInStockUnit = quantityMin;
        lineCost = quantityMin * unitCost;
      }

      const lineCostRounded = Number(lineCost.toFixed(4));
      totalCost += lineCostRounded;

      // Générer la chaîne d'affichage ≈ (non persistée, recalculée au besoin)
      const displayQuantity = formatApproxQuantity(quantityMin, quantityMax, recipeUnit);

      return {
        ...item,
        quantityMin,
        quantityMax,
        recipeUnit,
        // quantity = valeur EN UNITÉ STOCK utilisée pour la déduction (rétrocompat)
        quantity: Number(calcQtyInStockUnit.toFixed(6)),
        unit: stockUnit,
        unitCost,
        totalCost: lineCostRounded,
        displayQuantity
      };
    });

    const totalCostRounded = Number(totalCost.toFixed(2));
    const sellingPrice = data.suggestedSellingPrice || 0;
    const margin = sellingPrice > 0 ? Number((((sellingPrice - totalCostRounded) / sellingPrice) * 100).toFixed(1)) : 0;

    const existingIdx = recipes.findIndex(r => r.productId === data.productId);
    let recipeResult: TechnicalRecipe;

    if (existingIdx !== -1) {
      recipeResult = {
        ...recipes[existingIdx],
        ...data,
        ingredients: calculatedIngredients,
        totalIngredientsCost: totalCostRounded,
        targetMarginPercentage: margin,
        updatedAt: new Date().toISOString()
      };
      recipes[existingIdx] = recipeResult;
    } else {
      recipeResult = {
        ...data,
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        ingredients: calculatedIngredients,
        totalIngredientsCost: totalCostRounded,
        targetMarginPercentage: margin,
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
      `Fiche technique pour ${data.productName} (Coût matière: ${totalCostRounded.toFixed(3)} DT, Marge: ${margin}%, Mode plage: ${mode})`,
      performedBy
    );
    return recipeResult;
  }

  public static deleteRecipe(productId: string, performedBy: string): void {
    const recipes = db.get('recipes') || [];
    const products = db.get('products') || [];
    const rec = recipes.find(r => r && r.productId === productId);
    if (!rec) throw new Error('Fiche technique non trouvée');

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

    const headers = ['ID', 'Nom', 'Categorie', 'Prix', 'TVA', 'Disponible', 'Station', 'Description', 'Image'];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Inconnue';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
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

      const [idOrName, nameRaw, categoryRaw, priceRaw, tvaRaw, availableRaw, stationRaw, descRaw, imageRaw] = parts;
      const name = nameRaw || idOrName;
      const catName = categoryRaw || 'Cafés Spécialité';
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

      // Match or create category
      let category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
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

      // Check existing product
      const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.price = price;
        existing.tvaRate = tva;
        existing.available = available;
        existing.description = description || existing.description;
        existing.categoryId = category.id;
        existing.preparationStation = station as any;
        if (imageUrl) existing.imageUrl = imageUrl;
      } else {
        const newProd: Product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name,
          categoryId: category.id,
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
