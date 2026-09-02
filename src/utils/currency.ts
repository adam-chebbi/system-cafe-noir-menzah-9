/**
 * currency.ts
 *
 * Utilitaires de formatage monétaire en Dinar Tunisien (TND / DT).
 * Le Dinar Tunisien se subdivise en 1 000 millimes (3 décimales).
 */

export const CURRENCY_CODE = 'TND';
export const CURRENCY_SYMBOL = 'DT';

/**
 * Taux de TVA applicables en Tunisie :
 * - 7%  : Taux réduit (restauration, cafés, consommation sur place)
 * - 13% : Taux intermédiaire (prestations, informatique)
 * - 19% : Taux standard (biens généraux, fournitures, matériel)
 */
export const TUNISIA_TVA_RATES = [7, 13, 19] as const;
export const DEFAULT_TVA_RATE = 7;

/**
 * Formate un montant en Dinar Tunisien avec 3 décimales (millimes).
 * Exemple : 16.5 -> "16.500 DT", 0.45 -> "0.450 DT"
 */
export function formatDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.000 DT';
  }
  return `${amount.toFixed(3)} DT`;
}

/**
 * Formate un nombre à 3 décimales sans le symbole DT.
 * Exemple : 16.5 -> "16.500"
 */
export function formatMillimes(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.000';
  }
  return amount.toFixed(3);
}

/**
 * Parse une saisie textuelle de montant en nombre.
 */
export function parseDT(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
