export interface ChangeField {
  key: string;
  label: string;
  format?: (value: any) => string;
}

const defaultFormat = (value: any): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
};

/**
 * Compares two versions of a record on a fixed set of "important" fields and produces a compact,
 * human-readable summary of only what actually changed — used to populate the activity log's
 * previousValue/newValue columns. Returns {} when none of the tracked fields changed.
 */
export function summarizeChanges(
  before: Record<string, any>,
  after: Record<string, any>,
  fields: ChangeField[]
): { previousValue?: string; newValue?: string } {
  const previousParts: string[] = [];
  const newParts: string[] = [];

  for (const field of fields) {
    const beforeValue = before?.[field.key];
    const afterValue = after?.[field.key];
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;

    const format = field.format || defaultFormat;
    previousParts.push(`${field.label} : ${format(beforeValue)}`);
    newParts.push(`${field.label} : ${format(afterValue)}`);
  }

  if (previousParts.length === 0) return {};
  return { previousValue: previousParts.join(' · '), newValue: newParts.join(' · ') };
}
