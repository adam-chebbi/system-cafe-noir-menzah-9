import { StockZone } from '../types';

export const STOCK_ZONES: StockZone[] = ['reserve_principale', 'depot'];

export const ZONE_LABELS: Record<StockZone, string> = {
  reserve_principale: 'Réserve principale',
  depot: 'Dépôt'
};

export const WASTE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'perte', label: 'Perte' },
  { value: 'casse', label: 'Casse' },
  { value: 'peremption', label: 'Péremption' },
  { value: 'consommation_interne', label: 'Consommation interne' },
  { value: 'produit_offert', label: 'Produit offert' },
  { value: 'erreur_preparation', label: 'Erreur de préparation' },
  { value: 'ajustement_inventaire', label: "Ajustement d'inventaire" },
  { value: 'autre', label: 'Autre' }
];

export const WASTE_REASON_LABELS: Record<string, string> = Object.fromEntries(
  WASTE_REASON_OPTIONS.map(o => [o.value, o.label])
);
