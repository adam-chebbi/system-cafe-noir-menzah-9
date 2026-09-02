/**
 * unitConversion.ts
 *
 * Module de conversion d'unités déterministe pour les quantités d'ingrédients en recette.
 * AUCUN appel IA — uniquement des tables d'équivalences métriques fixes et des règles d'arrondi explicites.
 *
 * Règles métier :
 *  - La conversion se fait uniquement à la volée pour les calculs internes.
 *  - L'unité de stockage d'un ingrédient n'est JAMAIS modifiée par cette logique.
 *  - Les quantités d'affichage conservent toujours l'unité recette saisie par l'utilisateur.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangeCalcMode = 'max' | 'median' | 'min';

/** Toutes les unités supportées par le système (unité de stock ET unité de recette) */
export type SupportedUnit = 'g' | 'kg' | 'ml' | 'cl' | 'L' | 'unit' | 'portion';

// ---------------------------------------------------------------------------
// Table d'équivalences — facteurs pour convertir FROM → TO
// Format : CONVERSION_FACTORS[from][to] = facteur multiplicateur
// ---------------------------------------------------------------------------

type ConversionMap = Partial<Record<SupportedUnit, Partial<Record<SupportedUnit, number>>>>;

const CONVERSION_FACTORS: ConversionMap = {
  // ── MASSE ──────────────────────────────────────────────────────────────
  g: {
    g:   1,
    kg:  1 / 1000,        // 1 g = 0.001 kg
  },
  kg: {
    kg:  1,
    g:   1000,            // 1 kg = 1000 g
  },
  // ── VOLUME ─────────────────────────────────────────────────────────────
  ml: {
    ml:  1,
    cl:  1 / 10,          // 1 mL = 0.1 cL
    L:   1 / 1000,        // 1 mL = 0.001 L
  },
  cl: {
    cl:  1,
    ml:  10,              // 1 cL = 10 mL
    L:   1 / 100,         // 1 cL = 0.01 L
  },
  L: {
    L:   1,
    ml:  1000,            // 1 L = 1000 mL
    cl:  100,             // 1 L = 100 cL
  },
  // ── ENTIERS (pas de conversion entre familles différentes) ─────────────
  unit: {
    unit: 1,
  },
  portion: {
    portion: 1,
  },
};

// ---------------------------------------------------------------------------
// Familles dimensionnelles (pour validation de compatibilité)
// ---------------------------------------------------------------------------

const UNIT_FAMILIES: Record<SupportedUnit, 'mass' | 'volume' | 'discrete'> = {
  g:       'mass',
  kg:      'mass',
  ml:      'volume',
  cl:      'volume',
  L:       'volume',
  unit:    'discrete',
  portion: 'discrete',
};

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Vérifie si une conversion entre deux unités est possible (même famille dimensionnelle).
 */
export function canConvert(fromUnit: string, toUnit: string): boolean {
  if (fromUnit === toUnit) return true;
  const from = fromUnit as SupportedUnit;
  const to   = toUnit   as SupportedUnit;
  if (!(from in UNIT_FAMILIES) || !(to in UNIT_FAMILIES)) return false;
  return UNIT_FAMILIES[from] === UNIT_FAMILIES[to];
}

/**
 * Retourne la liste des unités de recette compatibles avec une unité de stock donnée.
 * Utilisé pour peupler le sélecteur d'unité recette dans le formulaire.
 */
export function getCompatibleRecipeUnits(stockUnit: string): SupportedUnit[] {
  const su = stockUnit as SupportedUnit;
  if (!(su in UNIT_FAMILIES)) return [su] as SupportedUnit[];
  const family = UNIT_FAMILIES[su];
  return (Object.keys(UNIT_FAMILIES) as SupportedUnit[]).filter(
    u => UNIT_FAMILIES[u] === family
  );
}

/**
 * Convertit une valeur d'une unité vers une autre.
 * Lève une erreur si la conversion est impossible (familles incompatibles).
 *
 * @param value      - La valeur à convertir (précision interne, pas d'arrondi ici)
 * @param fromUnit   - L'unité source (unité recette)
 * @param toUnit     - L'unité cible (unité stock)
 * @returns          La valeur convertie avec précision maximale (arrondi à l'affichage uniquement)
 */
export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;

  const from = fromUnit as SupportedUnit;
  const to   = toUnit   as SupportedUnit;

  if (!canConvert(from, to)) {
    throw new Error(
      `Conversion impossible : "${from}" et "${to}" n'appartiennent pas à la même famille d'unités.`
    );
  }

  const factor = CONVERSION_FACTORS[from]?.[to];
  if (factor === undefined) {
    throw new Error(
      `Facteur de conversion manquant pour "${from}" → "${to}". Contactez l'administrateur.`
    );
  }

  // Nettoyer les résidus de virgule flottante IEEE 754 (ex. 18 * 0.001 = 0.018000000000000002)
  const raw = value * factor;
  return parseFloat(raw.toFixed(10));
}

/**
 * Résout la valeur de calcul à utiliser pour une plage min–max, selon le mode configuré.
 * Cette valeur est utilisée pour les calculs de coût matière et de consommation de stock.
 *
 * Modes :
 *  - 'max'    : borne haute (prudent — recommandé par défaut)
 *  - 'median' : valeur moyenne de la plage (équilibré)
 *  - 'min'    : borne basse (optimiste)
 *
 * Si quantityMax n'est pas défini (valeur unique), retourne quantityMin quel que soit le mode.
 */
export function resolveCalcQuantity(
  quantityMin: number,
  quantityMax: number | undefined,
  mode: RangeCalcMode
): number {
  if (quantityMax === undefined || quantityMax === quantityMin) {
    return quantityMin;
  }
  // Sécurité : s'assurer que min ≤ max
  const lo = Math.min(quantityMin, quantityMax);
  const hi = Math.max(quantityMin, quantityMax);

  switch (mode) {
    case 'max':    return hi;
    case 'min':    return lo;
    case 'median': return (lo + hi) / 2;
    default:       return hi; // fallback prudent
  }
}

/**
 * Formate la quantité d'affichage recette avec le symbole ≈.
 *
 * Exemples :
 *  formatApproxQuantity(18, undefined, 'g')   → "≈18 g"
 *  formatApproxQuantity(100, 120, 'ml')        → "≈100–120 mL"
 *  formatApproxQuantity(0.5, 0.5, 'unit')      → "≈0.5 unité"
 *
 * Règles :
 *  - Jamais de conversion de l'unité recette en unité stock dans cet affichage.
 *  - Les plages ne sont JAMAIS réduites à une valeur unique.
 *  - L'unité "ml" est normalisée en "mL" pour l'affichage (convention typographique).
 */
export function formatApproxQuantity(
  quantityMin: number,
  quantityMax: number | undefined,
  recipeUnit: string
): string {
  const displayUnit = normalizeUnitForDisplay(recipeUnit);

  // Formater les nombres : supprimer les zéros décimaux inutiles, max 3 décimales
  const fmtNum = (n: number): string => {
    if (Number.isInteger(n)) return n.toString();
    const fixed = parseFloat(n.toFixed(3));
    return fixed.toString();
  };

  if (quantityMax === undefined || quantityMax === quantityMin) {
    return `≈${fmtNum(quantityMin)} ${displayUnit}`;
  }

  const lo = Math.min(quantityMin, quantityMax);
  const hi = Math.max(quantityMin, quantityMax);
  return `≈${fmtNum(lo)}–${fmtNum(hi)} ${displayUnit}`;
}

/**
 * Normalise l'unité pour l'affichage utilisateur (conventions typographiques).
 */
export function normalizeUnitForDisplay(unit: string): string {
  const map: Record<string, string> = {
    ml:      'mL',
    ML:      'mL',
    cl:      'cL',
    CL:      'cL',
    l:       'L',
    kg:      'kg',
    KG:      'kg',
    g:       'g',
    G:       'g',
    unit:    'unité',
    portion: 'portion',
  };
  return map[unit] ?? unit;
}

/**
 * Calcule le coût matière d'une ligne d'ingrédient en recette.
 * La conversion d'unité est effectuée en interne ; le résultat est exprimé en devise courante.
 *
 * @param quantityMin    - Quantité min saisie en unité recette
 * @param quantityMax    - Quantité max saisie en unité recette (optionnel)
 * @param recipeUnit     - Unité de recette (ex. "g")
 * @param stockUnit      - Unité de stockage de l'ingrédient (ex. "kg")
 * @param costPerUnit    - Coût par unité de stock
 * @param mode           - Mode de calcul pour les plages
 * @returns              { calcQtyInStockUnit, lineCost } — avec précision interne
 */
export function computeIngredientLineCost(
  quantityMin: number,
  quantityMax: number | undefined,
  recipeUnit: string,
  stockUnit: string,
  costPerUnit: number,
  mode: RangeCalcMode
): { calcQtyInStockUnit: number; lineCost: number } {
  // 1. Résoudre la valeur de calcul (selon le mode de plage)
  const calcQtyInRecipeUnit = resolveCalcQuantity(quantityMin, quantityMax, mode);

  // 2. Convertir vers l'unité stock (à la volée, sans modifier la fiche ingrédient)
  const calcQtyInStockUnit = convertUnit(calcQtyInRecipeUnit, recipeUnit, stockUnit);

  // 3. Calculer le coût avec précision interne (arrondi uniquement à l'affichage final)
  const lineCost = parseFloat((calcQtyInStockUnit * costPerUnit).toFixed(6));

  return { calcQtyInStockUnit, lineCost };
}
