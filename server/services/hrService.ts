import { db } from '../db/database.js';
import { EmployeeRecord, AttendanceRecord, AttendanceStatus, ShiftType, PersonnelFinancialRecord } from '../types/index.js';
import { summarizeChanges } from '../utils/audit.js';
import { ScheduleService } from './scheduleService.js';

const addDaysToDateStr = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const nowIso = () => new Date().toISOString();
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const EMPLOYEE_TRACKED_FIELDS = [
  { key: 'position', label: 'Poste' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'baseSalary', label: 'Salaire de base', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'active', label: 'Actif' }
];

const FINANCIAL_RECORD_TRACKED_FIELDS = [
  { key: 'baseSalary', label: 'Salaire de base', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'advances', label: 'Avances', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'bonuses', label: 'Primes', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'deductions', label: 'Retenues', format: (v: number) => `${v.toFixed(3)} DT` },
  { key: 'amountPaid', label: 'Montant payé', format: (v: number) => `${v.toFixed(3)} DT` }
];

/**
 * HR V1: employee records, manually-entered planning/presence and financial tracking only.
 * No biometric attendance, no clock-in/out, no automated payroll calculation.
 */
export class HRService {
  // --- Employés ---
  public static getEmployees(): EmployeeRecord[] {
    return db.get('employees');
  }

  public static createEmployee(data: Omit<EmployeeRecord, 'id' | 'createdAt' | 'updatedAt'>, performedBy: string): EmployeeRecord {
    if (!data.name?.trim() || !data.position?.trim()) {
      throw new Error('Le nom et le poste sont obligatoires.');
    }
    const employee: EmployeeRecord = { ...data, id: generateId('emp'), createdAt: nowIso(), updatedAt: nowIso() };
    const employees = db.get('employees');
    employees.unshift(employee);
    db.set('employees', employees);
    db.logAudit('Création employé', 'hr', `Dossier de ${employee.name} créé`, performedBy);
    return employee;
  }

  public static updateEmployee(id: string, updates: Partial<EmployeeRecord>, performedBy: string): EmployeeRecord {
    const employees = db.get('employees');
    const idx = employees.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Employé introuvable.');
    const before = employees[idx];
    employees[idx] = { ...before, ...updates, id, updatedAt: nowIso() };
    db.set('employees', employees);
    const changes = summarizeChanges(before, employees[idx], EMPLOYEE_TRACKED_FIELDS);
    db.logAudit('Modification employé', 'hr', `Dossier de ${employees[idx].name} modifié`, performedBy, changes);
    return employees[idx];
  }

  public static setEmployeeActive(id: string, active: boolean, performedBy: string): EmployeeRecord {
    return this.updateEmployee(id, { active }, performedBy);
  }

  // --- Planning & présence (100% manuel) ---
  public static getAttendances(filter?: { start?: string; end?: string; employeeId?: string }): AttendanceRecord[] {
    return db.get('attendances').filter(a =>
      (!filter?.start || a.date >= filter.start) &&
      (!filter?.end || a.date <= filter.end) &&
      (!filter?.employeeId || a.employeeId === filter.employeeId)
    );
  }

  /**
   * Une seule entrée par employé et par jour : une nouvelle saisie sur le même jour corrige l'existante
   * (jamais de doublon). C'est TOUJOURS une exception ponctuelle — la règle récurrente n'est jamais
   * modifiée par cet appel, quel que soit le statut saisi.
   */
  public static saveAttendance(data: Omit<AttendanceRecord, 'id' | 'updatedAt'>, performedBy: string): AttendanceRecord {
    if (!data.employeeId || !data.date) {
      throw new Error("L'employé et la date sont obligatoires.");
    }
    const attendances = db.get('attendances');
    const idx = attendances.findIndex(a => a.employeeId === data.employeeId && a.date === data.date);
    const record: AttendanceRecord = { ...data, id: idx >= 0 ? attendances[idx].id : generateId('presence'), updatedAt: nowIso() };
    if (idx >= 0) {
      attendances[idx] = record;
    } else {
      attendances.unshift(record);
    }
    db.set('attendances', attendances);
    db.logAudit(idx >= 0 ? 'Correction présence' : 'Saisie présence', 'hr', `${record.employeeName} — ${record.date} (${record.status})`, performedBy);
    return record;
  }

  /**
   * Congé (ou tout statut) sur une période de plusieurs jours consécutifs : une exception est créée pour
   * CHAQUE date de la période, reliées par un `leaveGroupId` commun pour permettre une édition/suppression
   * groupée ultérieure. Chaque jour reste un enregistrement indépendant (aucune règle récurrente touchée).
   */
  public static saveAttendanceRange(
    data: {
      employeeId: string;
      employeeName: string;
      startDate: string;
      endDate: string;
      status: AttendanceStatus;
      shift?: ShiftType;
      plannedStartTime?: string;
      plannedEndTime?: string;
      notes?: string;
    },
    performedBy: string
  ): AttendanceRecord[] {
    if (!data.employeeId || !data.startDate || !data.endDate) {
      throw new Error("L'employé et la période sont obligatoires.");
    }
    if (data.endDate < data.startDate) {
      throw new Error('La date de fin doit être postérieure ou égale à la date de début.');
    }
    const leaveGroupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created: AttendanceRecord[] = [];
    let cursor = data.startDate;
    let guard = 0;
    while (cursor <= data.endDate && guard < 366) {
      created.push(
        this.saveAttendance(
          {
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            date: cursor,
            status: data.status,
            shift: data.shift,
            plannedStartTime: data.plannedStartTime,
            plannedEndTime: data.plannedEndTime,
            notes: data.notes,
            leaveGroupId
          },
          performedBy
        )
      );
      cursor = addDaysToDateStr(cursor, 1);
      guard++;
    }
    db.logAudit(
      'Saisie période',
      'hr',
      `${data.employeeName} — ${data.status} du ${data.startDate} au ${data.endDate} (${created.length} jour(s))`,
      performedBy
    );
    return created;
  }

  public static deleteAttendance(id: string, performedBy: string): void {
    const attendances = db.get('attendances');
    const record = attendances.find(a => a.id === id);
    db.set('attendances', attendances.filter(a => a.id !== id));
    db.logAudit('Suppression présence', 'hr', record ? `${record.employeeName} — ${record.date}` : id, performedBy);
  }

  /** Supprime tous les jours d'une même période de congé (retour automatique au planning récurrent). */
  public static deleteAttendanceGroup(leaveGroupId: string, performedBy: string): number {
    const attendances = db.get('attendances');
    const group = attendances.filter(a => a.leaveGroupId === leaveGroupId);
    if (group.length === 0) return 0;
    db.set('attendances', attendances.filter(a => a.leaveGroupId !== leaveGroupId));
    db.logAudit(
      'Suppression période',
      'hr',
      `${group[0].employeeName} — période du ${group[0].date} supprimée (${group.length} jour(s)), retour au planning récurrent`,
      performedBy
    );
    return group.length;
  }

  /**
   * Portée "cette semaine uniquement" d'un changement de semaine type : applique les règles fournies
   * comme exceptions sur les 7 jours de la semaine indiquée, SANS modifier le planning récurrent. Seuls
   * les jours qui diffèrent réellement de la règle récurrente actuelle génèrent une exception — un jour
   * inchangé n'est pas touché, pour ne pas polluer l'historique de données inutilement.
   */
  public static applyWeekOverride(
    employeeId: string,
    employeeName: string,
    weekStart: string,
    days: { weekday: number; worked: boolean; shift?: ShiftType; startTime?: string; endTime?: string }[],
    performedBy: string
  ): AttendanceRecord[] {
    const applied: AttendanceRecord[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDaysToDateStr(weekStart, i);
      const rule = days.find(d => d.weekday === i);
      if (!rule) continue;

      const activeTemplate = ScheduleService.getActiveTemplate(employeeId, date);
      const templateRule = activeTemplate?.days.find(d => d.weekday === i);

      const sameAsTemplate =
        !!templateRule &&
        templateRule.worked === rule.worked &&
        templateRule.shift === rule.shift &&
        templateRule.startTime === rule.startTime &&
        templateRule.endTime === rule.endTime;
      if (sameAsTemplate) continue;

      const record = this.saveAttendance(
        {
          employeeId,
          employeeName,
          date,
          status: rule.worked ? 'present' : 'rest',
          shift: rule.worked ? rule.shift : undefined,
          plannedStartTime: rule.worked ? rule.startTime : undefined,
          plannedEndTime: rule.worked ? rule.endTime : undefined,
          notes: 'Exception "cette semaine uniquement"'
        },
        performedBy
      );
      applied.push(record);
    }
    db.logAudit(
      'Semaine exceptionnelle',
      'hr',
      `${employeeName} — planning modifié pour la semaine du ${weekStart} uniquement (${applied.length} jour(s))`,
      performedBy
    );
    return applied;
  }

  // --- Suivi financier ---
  public static getFinancialRecords(employeeId?: string): PersonnelFinancialRecord[] {
    const records = db.get('personnelFinancialRecords');
    return employeeId ? records.filter(r => r.employeeId === employeeId) : records;
  }

  public static createFinancialRecord(data: Omit<PersonnelFinancialRecord, 'id' | 'createdAt' | 'updatedAt'>, performedBy: string): PersonnelFinancialRecord {
    if (!data.employeeId) throw new Error("L'employé est obligatoire.");
    const record: PersonnelFinancialRecord = { ...data, id: generateId('fin'), createdAt: nowIso(), updatedAt: nowIso() };
    const records = db.get('personnelFinancialRecords');
    records.unshift(record);
    db.set('personnelFinancialRecords', records);
    db.logAudit('Suivi financier personnel', 'hr', `${record.employeeName} — ${record.amountPaid.toFixed(3)} DT`, performedBy);
    return record;
  }

  public static updateFinancialRecord(id: string, updates: Partial<PersonnelFinancialRecord>, performedBy: string): PersonnelFinancialRecord {
    const records = db.get('personnelFinancialRecords');
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Suivi financier introuvable.');
    const before = records[idx];
    records[idx] = { ...before, ...updates, id, updatedAt: nowIso() };
    db.set('personnelFinancialRecords', records);
    const changes = summarizeChanges(before, records[idx], FINANCIAL_RECORD_TRACKED_FIELDS);
    db.logAudit('Correction suivi financier', 'hr', records[idx].employeeName, performedBy, changes);
    return records[idx];
  }

  public static deleteFinancialRecord(id: string, performedBy: string): void {
    const records = db.get('personnelFinancialRecords');
    const record = records.find(r => r.id === id);
    db.set('personnelFinancialRecords', records.filter(r => r.id !== id));
    db.logAudit('Suppression suivi financier', 'hr', record ? record.employeeName : id, performedBy);
  }
}
