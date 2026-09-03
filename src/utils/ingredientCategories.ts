import { Ingredient } from '../types';

export const INGREDIENT_CATEGORY_LABELS: Record<Ingredient['category'], string> = {
  coffee: 'Café',
  milk_dairy: 'Lait & Laitier',
  syrup: 'Sirops & Arômes',
  bakery: 'Boulangerie / Pâtisserie',
  fresh: 'Frais',
  packaging: 'Emballages & Consommables',
  beverage: 'Boissons'
};

export const INGREDIENT_CATEGORIES = Object.keys(INGREDIENT_CATEGORY_LABELS) as Ingredient['category'][];
