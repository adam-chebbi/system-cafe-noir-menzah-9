import { db } from '../db/database.js';
import { EmployeeScheduleTemplate, RecurringDayRule } from '../types/index.js';

const nowIso = () => new Date().toISOString();
const generateId = () => `sched_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const isValidDays = (days: any): days is RecurringDayRule[] =>
  Array.isArray(days) &&
  days.length === 7 &&
  [0, 1, 2, 3, 4, 5, 6].every(w => days.some((d: RecurringDayRule) => d.weekday === w));

/**
 * Semaines types récurrentes ("EmployeeScheduleTemplate") : chaque employé a une suite de versions
 * ordonnées dans le temps (effectiveFrom/effectiveTo). Un changement "à partir de cette date" ferme la
 * version active et en ouvre une nouvelle, sans jamais réécrire les versions passées — l'historique
 * (et les exceptions déjà posées sur des semaines passées) reste donc toujours cohérent.
 */
export class ScheduleService {
  public static getTemplates(employeeId?: string): EmployeeScheduleTemplate[] {
    const all = db.get('scheduleTemplates') || [];
    const filtered = employeeId ? all.filter(t => t.employeeId === employeeId) : all;
    return [...filtered].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  /** Version active à une date donnée (ou aujourd'hui par défaut). */
  public static getActiveTemplate(employeeId: string, atDate?: string): EmployeeScheduleTemplate | undefined {
    const date = atDate || new Date().toISOString().slice(0, 10);
    const templates = this.getTemplates(employeeId);
    return templates
      .filter(t => t.effectiveFrom <= date && (!t.effectiveTo || t.effectiveTo > date))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  }

  /**
   * Enregistre une nouvelle version du planning récurrent, effective à partir de `effectiveFrom`.
   * La version précédemment active (si elle chevauche cette date) est automatiquement close à cette
   * même date — les semaines déjà passées restent donc résolues avec l'ancienne règle.
   */
  public static saveTemplate(
    employeeId: string,
    employeeName: string,
    days: RecurringDayRule[],
    effectiveFrom: string,
    performedBy: string,
    notes?: string
  ): EmployeeScheduleTemplate {
    if (!employeeId) throw new Error("L'employé est obligatoire.");
    if (!effectiveFrom) throw new Error("La date d'entrée en vigueur est obligatoire.");
    if (!isValidDays(days)) throw new Error('Les 7 jours de la semaine doivent être configurés.');

    const templates = db.get('scheduleTemplates') || [];

    // Ferme toute version qui chevaucherait la nouvelle (même employé, effectiveFrom <= nouvelle date,
    // pas encore close avant cette date).
    for (const t of templates) {
      if (t.employeeId === employeeId && t.effectiveFrom < effectiveFrom && (!t.effectiveTo || t.effectiveTo > effectiveFrom)) {
        t.effectiveTo = effectiveFrom;
        t.updatedAt = nowIso();
      }
    }
    // Supprime toute version future qui commencerait à la même date ou après (elle est remplacée).
    const kept = templates.filter(t => !(t.employeeId === employeeId && t.effectiveFrom >= effectiveFrom));

    const created: EmployeeScheduleTemplate = {
      id: generateId(),
      employeeId,
      employeeName,
      days: [...days].sort((a, b) => a.weekday - b.weekday),
      effectiveFrom,
      notes,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    kept.push(created);
    db.set('scheduleTemplates', kept);

    db.logAudit(
      'Configuration semaine type',
      'hr',
      `Planning récurrent de ${employeeName} mis à jour (effectif à partir du ${effectiveFrom})`,
      performedBy
    );

    return created;
  }

  /** Duplique la version active du planning récurrent d'un employé vers un autre. */
  public static duplicateTemplate(
    fromEmployeeId: string,
    toEmployeeId: string,
    toEmployeeName: string,
    effectiveFrom: string,
    performedBy: string
  ): EmployeeScheduleTemplate {
    const source = this.getActiveTemplate(fromEmployeeId, effectiveFrom) || this.getTemplates(fromEmployeeId).slice(-1)[0];
    if (!source) throw new Error("L'employé source n'a pas de planning récurrent configuré.");
    return this.saveTemplate(
      toEmployeeId,
      toEmployeeName,
      source.days,
      effectiveFrom,
      performedBy,
      `Dupliqué depuis ${source.employeeName}`
    );
  }
}
