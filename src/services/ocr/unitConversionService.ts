/**
 * Unit Conversion Engine (Deterministic, No AI)
 * Handles conversion between invoice purchase units and stock inventory units.
 */

export interface UnitConversionResult {
  convertedQuantity: number;
  multiplier: number;
  isCompatible: boolean;
  explanation: string;
}

export const STANDARD_UNITS = [
  { value: 'kg', label: 'Kilogramme (kg)', type: 'weight' },
  { value: 'g', label: 'Gramme (g)', type: 'weight' },
  { value: 'L', label: 'Litre (L)', type: 'volume' },
  { value: 'cl', label: 'Centilitre (cl)', type: 'volume' },
  { value: 'ml', label: 'Millilitre (ml)', type: 'volume' },
  { value: 'unit', label: 'Unité / Pièce', type: 'count' },
  { value: 'portion', label: 'Portion', type: 'count' },
  { value: 'carton', label: 'Carton (colis)', type: 'package' },
  { value: 'sac', label: 'Sac', type: 'package' },
  { value: 'sachet', label: 'Sachet', type: 'package' },
  { value: 'bouteille', label: 'Bouteille', type: 'package' },
  { value: 'pack', label: 'Pack', type: 'package' },
  { value: 'boîte', label: 'Boîte / Boite', type: 'package' },
  { value: 'bidon', label: 'Bidon', type: 'package' }
] as const;

export type StandardUnit = typeof STANDARD_UNITS[number]['value'];

/**
 * Normalizes unit string representations
 */
export function normalizeUnit(unitStr: string = ''): string {
  const raw = unitStr.toLowerCase().trim().replace(/s$/, ''); // Remove trailing s
  if (['kg', 'kilo', 'kilogramme', 'kilogram'].includes(raw)) return 'kg';
  if (['g', 'gr', 'gramme', 'gram'].includes(raw)) return 'g';
  if (['l', 'litre', 'liter', 'litres', 'liters'].includes(raw)) return 'L';
  if (['cl', 'centilitre', 'centiliter'].includes(raw)) return 'cl';
  if (['ml', 'millilitre', 'milliliter'].includes(raw)) return 'ml';
  if (['u', 'unite', 'unité', 'piece', 'pièce', 'unit', 'pc', 'pcs'].includes(raw)) return 'unit';
  if (['portion', 'dose', 'service'].includes(raw)) return 'portion';
  if (['carton', 'colis', 'ctn', 'crt', 'box', 'caisse'].includes(raw)) return 'carton';
  if (['sac', 'bag'].includes(raw)) return 'sac';
  if (['sachet', 'pouch'].includes(raw)) return 'sachet';
  if (['bouteille', 'btl', 'bot', 'flacon'].includes(raw)) return 'bouteille';
  if (['pack', 'pck'].includes(raw)) return 'pack';
  if (['boite', 'boîte', 'can', 'conserves'].includes(raw)) return 'boîte';
  if (['bidon', 'jar'].includes(raw)) return 'bidon';
  return unitStr.trim() || 'unit';
}

/**
 * Deterministic conversion of quantity from invoice unit to stock unit.
 * Never modifies the ingredient stock unit.
 */
export function convertUnitQuantity(
  invoiceQty: number,
  invoiceUnit: string,
  stockUnit: string,
  customPackageFactor: number = 1
): UnitConversionResult {
  const normInv = normalizeUnit(invoiceUnit);
  const normStock = normalizeUnit(stockUnit);
  const factor = customPackageFactor > 0 ? customPackageFactor : 1;

  if (invoiceQty <= 0) {
    return {
      convertedQuantity: 0,
      multiplier: 1,
      isCompatible: true,
      explanation: 'Quantité nulle'
    };
  }

  // Same unit: 1:1
  if (normInv === normStock) {
    return {
      convertedQuantity: invoiceQty,
      multiplier: 1,
      isCompatible: true,
      explanation: `1 ${normInv} = 1 ${normStock}`
    };
  }

  // Weight conversions: kg <-> g
  if (normInv === 'kg' && normStock === 'g') {
    return {
      convertedQuantity: Number((invoiceQty * 1000).toFixed(4)),
      multiplier: 1000,
      isCompatible: true,
      explanation: '1 kg = 1 000 g'
    };
  }
  if (normInv === 'g' && normStock === 'kg') {
    return {
      convertedQuantity: Number((invoiceQty / 1000).toFixed(4)),
      multiplier: 0.001,
      isCompatible: true,
      explanation: '1 000 g = 1 kg'
    };
  }

  // Volume conversions: L <-> cl <-> ml
  if (normInv === 'L' && normStock === 'cl') {
    return {
      convertedQuantity: Number((invoiceQty * 100).toFixed(4)),
      multiplier: 100,
      isCompatible: true,
      explanation: '1 L = 100 cl'
    };
  }
  if (normInv === 'L' && normStock === 'ml') {
    return {
      convertedQuantity: Number((invoiceQty * 1000).toFixed(4)),
      multiplier: 1000,
      isCompatible: true,
      explanation: '1 L = 1 000 ml'
    };
  }
  if (normInv === 'cl' && normStock === 'L') {
    return {
      convertedQuantity: Number((invoiceQty / 100).toFixed(4)),
      multiplier: 0.01,
      isCompatible: true,
      explanation: '100 cl = 1 L'
    };
  }
  if (normInv === 'cl' && normStock === 'ml') {
    return {
      convertedQuantity: Number((invoiceQty * 10).toFixed(4)),
      multiplier: 10,
      isCompatible: true,
      explanation: '1 cl = 10 ml'
    };
  }
  if (normInv === 'ml' && normStock === 'L') {
    return {
      convertedQuantity: Number((invoiceQty / 1000).toFixed(4)),
      multiplier: 0.001,
      isCompatible: true,
      explanation: '1 000 ml = 1 L'
    };
  }
  if (normInv === 'ml' && normStock === 'cl') {
    return {
      convertedQuantity: Number((invoiceQty / 10).toFixed(4)),
      multiplier: 0.1,
      isCompatible: true,
      explanation: '10 ml = 1 cl'
    };
  }

  // Package units (carton, sac, sachet, pack, bouteille, bidon) -> to stock unit using user-defined factor
  const packageUnits = ['carton', 'sac', 'sachet', 'bouteille', 'pack', 'boîte', 'bidon'];
  if (packageUnits.includes(normInv)) {
    const converted = Number((invoiceQty * factor).toFixed(4));
    return {
      convertedQuantity: converted,
      multiplier: factor,
      isCompatible: true,
      explanation: `1 ${normInv} = ${factor} ${normStock}`
    };
  }

  // Count to portion or unit
  if ((normInv === 'unit' && normStock === 'portion') || (normInv === 'portion' && normStock === 'unit')) {
    const converted = Number((invoiceQty * factor).toFixed(4));
    return {
      convertedQuantity: converted,
      multiplier: factor,
      isCompatible: true,
      explanation: `1 ${normInv} = ${factor} ${normStock}`
    };
  }

  // Fallback: If units are different and not in standard conversion table, apply factor
  const fallbackConverted = Number((invoiceQty * factor).toFixed(4));
  return {
    convertedQuantity: fallbackConverted,
    multiplier: factor,
    isCompatible: factor !== 1,
    explanation: factor !== 1 ? `1 ${normInv} = ${factor} ${normStock} (défini par l'utilisateur)` : `Conversion directe: 1 ${normInv} vers ${normStock}`
  };
}
