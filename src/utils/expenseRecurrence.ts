import { Expense } from '../types';

export type RecurrenceInterval = NonNullable<Expense['recurrenceInterval']>;

export const RECURRENCE_INTERVALS: RecurrenceInterval[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export const RECURRENCE_INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  yearly: 'Annuelle'
};

/** Toutes les occurrences d'une même récurrence (originale + renouvellements) partagent cette clé. */
export function getRecurrenceGroupKey(exp: Expense): string {
  return exp.recurrenceGroupId || exp.id;
}

export function computeNextOccurrenceDate(lastDate: string, interval: RecurrenceInterval): string {
  const d = new Date(lastDate);
  if (isNaN(d.getTime())) return lastDate;
  switch (interval) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export interface RecurrenceStatus {
  /** L'occurrence la plus récente encore active de ce groupe — seule celle-ci propose "Renouveler". */
  latest: Expense;
  nextDate: string;
  isDue: boolean;
}

/**
 * Calcule, pour chaque récurrence encore active, la prochaine échéance attendue à partir de sa
 * dernière occurrence enregistrée. Un pur calcul de lecture (jamais stocké, jamais généré
 * automatiquement) — l'administrateur reste seul décideur de créer ou non l'occurrence suivante.
 */
export function computeRecurrenceStatuses(expenses: Expense[]): Map<string, RecurrenceStatus> {
  const groups = new Map<string, Expense[]>();
  for (const exp of expenses) {
    if (!exp.isRecurring || exp.recurrenceActive === false || !exp.recurrenceInterval) continue;
    const key = getRecurrenceGroupKey(exp);
    const list = groups.get(key) || [];
    list.push(exp);
    groups.set(key, list);
  }

  const today = new Date().toISOString().split('T')[0];
  const statuses = new Map<string, RecurrenceStatus>();
  for (const [key, group] of groups) {
    const latest = group.reduce((a, b) => (a.date > b.date ? a : b));
    const nextDate = computeNextOccurrenceDate(latest.date, latest.recurrenceInterval!);
    statuses.set(key, { latest, nextDate, isDue: nextDate <= today });
  }
  return statuses;
}
