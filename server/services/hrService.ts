import { db } from '../db/database.js';
import { EmployeeRecord, AttendanceRecord, PersonnelFinancialRecord } from '../types/index.js';

const nowIso = () => new Date().toISOString();
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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
    employees[idx] = { ...employees[idx], ...updates, id, updatedAt: nowIso() };
    db.set('employees', employees);
    db.logAudit('Modification employé', 'hr', `Dossier de ${employees[idx].name} modifié`, performedBy);
    return employees[idx];
  }

  public static setEmployeeActive(id: string, active: boolean, performedBy: string): EmployeeRecord {
    const employee = this.updateEmployee(id, { active }, performedBy);
    db.logAudit(active ? 'Réactivation employé' : 'Désactivation employé', 'hr', employee.name, performedBy);
    return employee;
  }

  // --- Planning & présence (100% manuel) ---
  public static getAttendances(filter?: { start?: string; end?: string; employeeId?: string }): AttendanceRecord[] {
    return db.get('attendances').filter(a =>
      (!filter?.start || a.date >= filter.start) &&
      (!filter?.end || a.date <= filter.end) &&
      (!filter?.employeeId || a.employeeId === filter.employeeId)
    );
  }

  /** Une seule entrée par employé et par jour : une nouvelle saisie sur le même jour corrige l'existante. */
  public static saveAttendance(data: Omit<AttendanceRecord, 'id'>, performedBy: string): AttendanceRecord {
    if (!data.employeeId || !data.date) {
      throw new Error("L'employé et la date sont obligatoires.");
    }
    const attendances = db.get('attendances');
    const idx = attendances.findIndex(a => a.employeeId === data.employeeId && a.date === data.date);
    const record: AttendanceRecord = { ...data, id: idx >= 0 ? attendances[idx].id : generateId('presence') };
    if (idx >= 0) {
      attendances[idx] = record;
    } else {
      attendances.unshift(record);
    }
    db.set('attendances', attendances);
    db.logAudit(idx >= 0 ? 'Correction présence' : 'Saisie présence', 'hr', `${record.employeeName} — ${record.date}`, performedBy);
    return record;
  }

  public static deleteAttendance(id: string, performedBy: string): void {
    const attendances = db.get('attendances');
    const record = attendances.find(a => a.id === id);
    db.set('attendances', attendances.filter(a => a.id !== id));
    db.logAudit('Suppression présence', 'hr', record ? `${record.employeeName} — ${record.date}` : id, performedBy);
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
    records[idx] = { ...records[idx], ...updates, id, updatedAt: nowIso() };
    db.set('personnelFinancialRecords', records);
    db.logAudit('Correction suivi financier', 'hr', records[idx].employeeName, performedBy);
    return records[idx];
  }

  public static deleteFinancialRecord(id: string, performedBy: string): void {
    const records = db.get('personnelFinancialRecords');
    const record = records.find(r => r.id === id);
    db.set('personnelFinancialRecords', records.filter(r => r.id !== id));
    db.logAudit('Suppression suivi financier', 'hr', record ? record.employeeName : id, performedBy);
  }
}
