import { db } from '../db/database.js';
import { User, Shift, AttendanceRecord, LeaveRequest, PayrollRecord } from '../types/index.js';

export class HRService {
  // Employees
  public static getEmployees(): User[] {
    return db.get('users');
  }

  public static createEmployee(data: Omit<User, 'id' | 'createdAt'>, performedBy: string): User {
    const users = db.get('users');
    const newEmp: User = {
      ...data,
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    users.push(newEmp);
    db.set('users', users);
    db.logAudit('Création Employé', 'hr', `Ajout de ${newEmp.name} (Rôle: ${newEmp.role})`, performedBy);
    return newEmp;
  }

  public static updateEmployee(id: string, updates: Partial<User>, performedBy: string): User {
    const users = db.get('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Employé non trouvé');
    users[idx] = { ...users[idx], ...updates };
    db.set('users', users);
    db.logAudit('Mise à jour Employé', 'hr', `Modification du profil de ${users[idx].name}`, performedBy);
    return users[idx];
  }

  public static deleteEmployee(id: string, performedBy: string): void {
    const users = db.get('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Employé non trouvé');
    const empName = users[idx].name;
    // Soft-delete employee by deactivating
    users[idx].active = false;
    db.set('users', users);
    db.logAudit('Désactivation Employé', 'hr', `Désactivation du compte de ${empName}`, performedBy);
  }

  // Shifts / Planning
  public static getShifts(dateRange?: { start: string; end: string }): Shift[] {
    const shifts = db.get('shifts') || [];
    if (!dateRange) return shifts;
    return shifts.filter(s => s && s.date && s.date >= dateRange.start && s.date <= dateRange.end);
  }

  public static createShift(data: Omit<Shift, 'id'>, performedBy: string): Shift {
    const shifts = db.get('shifts') || [];
    const newShift: Shift = {
      ...data,
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    };
    shifts.push(newShift);
    db.set('shifts', shifts);
    db.logAudit('Création Shift Planning', 'hr', `Shift pour ${newShift.employeeName} le ${newShift.date} (${newShift.startTime}-${newShift.endTime})`, performedBy);
    return newShift;
  }

  public static updateShift(id: string, updates: Partial<Shift>, performedBy: string): Shift {
    const shifts = db.get('shifts') || [];
    const idx = shifts.findIndex(s => s && s.id === id);
    if (idx === -1) throw new Error('Shift non trouvé');
    shifts[idx] = { ...shifts[idx], ...updates };
    db.set('shifts', shifts);
    db.logAudit('Mise à jour Shift', 'hr', `Modification shift ${shifts[idx].employeeName} (${shifts[idx].date})`, performedBy);
    return shifts[idx];
  }

  public static deleteShift(id: string, performedBy: string): void {
    const shifts = db.get('shifts') || [];
    db.set('shifts', shifts.filter(s => s && s.id !== id));
    db.logAudit('Suppression Shift', 'hr', `Suppression du shift ${id}`, performedBy);
  }

  // Attendance Clock-in / Clock-out
  public static getAttendances(date?: string): AttendanceRecord[] {
    const att = db.get('attendances') || [];
    if (date) return att.filter(a => a && a.date === date);
    return att;
  }

  public static clockIn(employeeId: string, performedBy: string): AttendanceRecord {
    const users = db.get('users') || [];
    const attendances = db.get('attendances') || [];

    const emp = users.find(u => u && u.id === employeeId);
    if (!emp) throw new Error('Employé non trouvé');

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = attendances.find(a => a && a.employeeId === employeeId && a.date === todayStr && a.status === 'active');
    if (existing) {
      throw new Error(`${emp.name} est déjà pointé en cours.`);
    }

    const rec: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: todayStr,
      clockInTime: new Date().toISOString(),
      breakMinutes: 0,
      totalHoursWorked: 0,
      status: 'active'
    };

    attendances.unshift(rec);
    db.set('attendances', attendances);
    db.logAudit('Pointage Arrivée', 'hr', `Prise de poste de ${emp.name}`, performedBy);
    return rec;
  }

  public static clockOut(employeeId: string, breakMinutes = 0, notes?: string, performedBy = 'Système'): AttendanceRecord {
    const attendances = db.get('attendances') || [];
    const todayStr = new Date().toISOString().split('T')[0];

    const idx = attendances.findIndex(a => a && a.employeeId === employeeId && a.status === 'active');
    if (idx === -1) throw new Error("Aucun pointage d'arrivée actif trouvé pour cet employé.");

    const rec = attendances[idx];
    const now = new Date();
    const clockIn = new Date(rec.clockInTime);
    const diffMs = now.getTime() - clockIn.getTime();
    const grossHours = diffMs / (1000 * 60 * 60);
    const netHours = Math.max(0, Number((grossHours - (breakMinutes / 60)).toFixed(2)));

    rec.clockOutTime = now.toISOString();
    rec.breakMinutes = breakMinutes;
    rec.totalHoursWorked = netHours;
    rec.status = 'completed';
    rec.notes = notes;

    attendances[idx] = rec;
    db.set('attendances', attendances);
    db.logAudit('Pointage Départ', 'hr', `Fin de poste de ${rec.employeeName} (${netHours} h travaillées)`, performedBy);
    return rec;
  }

  // Leaves
  public static getLeaves(): LeaveRequest[] {
    return db.get('leaves') || [];
  }

  public static createLeave(data: Omit<LeaveRequest, 'id' | 'createdAt'>, performedBy: string): LeaveRequest {
    const leaves = db.get('leaves') || [];
    const leave: LeaveRequest = {
      ...data,
      id: `lv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    leaves.unshift(leave);
    db.set('leaves', leaves);
    db.logAudit('Demande de Congé', 'hr', `Demande de congé pour ${leave.employeeName} (${leave.daysCount} jours)`, performedBy);
    return leave;
  }

  public static updateLeaveStatus(id: string, status: LeaveRequest['status'], reviewedBy: string): LeaveRequest {
    const leaves = db.get('leaves') || [];
    const idx = leaves.findIndex(l => l && l.id === id);
    if (idx === -1) throw new Error('Demande non trouvée');

    leaves[idx].status = status;
    leaves[idx].reviewedBy = reviewedBy;
    db.set('leaves', leaves);
    db.logAudit('Décision Congé', 'hr', `Statut congé ${leaves[idx].employeeName} -> ${status}`, reviewedBy);
    return leaves[idx];
  }

  public static deleteLeave(id: string, performedBy: string): void {
    const leaves = db.get('leaves') || [];
    db.set('leaves', leaves.filter(l => l && l.id !== id));
    db.logAudit('Suppression Congé', 'hr', `Suppression de la demande de congé ${id}`, performedBy);
  }

  // Payroll
  public static getPayrolls(): PayrollRecord[] {
    return db.get('payrolls') || [];
  }

  public static generatePayroll(employeeId: string, periodMonth: string, bonuses = 0, deductions = 0, performedBy: string): PayrollRecord {
    const users = db.get('users') || [];
    const attendances = db.get('attendances') || [];
    const payrolls = db.get('payrolls') || [];

    const emp = users.find(u => u && u.id === employeeId);
    if (!emp) throw new Error('Employé non trouvé');

    // Calculate total hours worked in that month
    const monthRecords = attendances.filter(a => a && a.employeeId === employeeId && a.date && a.date.startsWith(periodMonth) && a.status === 'completed');
    const totalHours = monthRecords.reduce((sum, r) => sum + (r.totalHoursWorked || 0), 0);

    const standardMonthlyHours = 151.67; // French legal standard or actual worked
    const regularHours = Math.min(totalHours > 0 ? totalHours : standardMonthlyHours, standardMonthlyHours);
    const overtimeHours = Math.max(0, totalHours - standardMonthlyHours);

    const baseRate = emp.hourlyRate || 15.5;
    const overtimeRate = baseRate * 1.25;

    const baseGross = Number((regularHours * baseRate).toFixed(2));
    const overtimeGross = Number((overtimeHours * overtimeRate).toFixed(2));
    const grossSalary = Number((baseGross + overtimeGross + bonuses).toFixed(2));

    const socialContributions = Number((grossSalary * 0.22).toFixed(2)); // ~22% employee charges
    const taxDeductions = Number((grossSalary * 0.05).toFixed(2)); // Withholding tax estimate
    const netSalary = Number((grossSalary - socialContributions - taxDeductions - deductions).toFixed(2));

    const payroll: PayrollRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      periodMonth,
      baseHourlyRate: baseRate,
      regularHours: Number(regularHours.toFixed(1)),
      overtimeHours: Number(overtimeHours.toFixed(1)),
      overtimeRate: Number(overtimeRate.toFixed(2)),
      grossSalary,
      bonuses,
      advancesDeductions: deductions,
      taxDeductions,
      socialContributions,
      netSalary,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    payrolls.unshift(payroll);
    db.set('payrolls', payrolls);
    db.logAudit('Génération Bulletin de Paie', 'hr', `Fiche de paie générée pour ${emp.name} (${periodMonth}) : Net = ${netSalary.toFixed(3)} DT`, performedBy);
    return payroll;
  }

  public static createManualPayroll(data: Partial<PayrollRecord>, performedBy: string): PayrollRecord {
    const payrolls = db.get('payrolls') || [];
    const payroll: PayrollRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      employeeId: data.employeeId || '',
      employeeName: data.employeeName || '',
      role: data.role || 'Employé',
      periodMonth: data.periodMonth || new Date().toISOString().slice(0, 7),
      baseHourlyRate: data.baseHourlyRate || 6.5,
      regularHours: data.regularHours || 151.67,
      overtimeHours: data.overtimeHours || 0,
      overtimeRate: data.overtimeRate || 8.125,
      grossSalary: data.grossSalary || 0,
      bonuses: data.bonuses || 0,
      advancesDeductions: data.advancesDeductions || 0,
      taxDeductions: data.taxDeductions || 0,
      socialContributions: data.socialContributions || 0,
      netSalary: data.netSalary || 0,
      paymentStatus: data.paymentStatus || 'paid',
      paymentDate: data.paymentDate || data.documentDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      isRetroactive: data.isRetroactive ?? true,
      documentDate: data.documentDate,
      attachmentUrl: data.attachmentUrl,
      retroNotes: data.retroNotes
    };

    payrolls.unshift(payroll);
    db.set('payrolls', payrolls);
    db.logAudit('Saisie Bulletin de Paie Historique', 'hr', `Bulletin rétroactif pour ${payroll.employeeName} (${payroll.periodMonth}) : Net = ${payroll.netSalary.toFixed(3)} DT`, performedBy);
    return payroll;
  }

  public static updatePayroll(id: string, updates: Partial<PayrollRecord>, performedBy: string): PayrollRecord {
    const payrolls = db.get('payrolls') || [];
    const idx = payrolls.findIndex(p => p && p.id === id);
    if (idx === -1) throw new Error('Bulletin de paie non trouvé');

    payrolls[idx] = { ...payrolls[idx], ...updates };
    db.set('payrolls', payrolls);
    db.logAudit('Modification Bulletin de Paie', 'hr', `Modification bulletin ${payrolls[idx].employeeName} (${payrolls[idx].periodMonth})`, performedBy);
    return payrolls[idx];
  }

  public static cancelPayroll(id: string, reason: string, performedBy: string): PayrollRecord {
    const payrolls = db.get('payrolls') || [];
    const idx = payrolls.findIndex(p => p && p.id === id);
    if (idx === -1) throw new Error('Bulletin de paie non trouvé');

    payrolls[idx].cancelled = true;
    payrolls[idx].cancelReason = reason;
    payrolls[idx].paymentStatus = 'cancelled';

    db.set('payrolls', payrolls);
    db.logAudit('Annulation Bulletin de Paie', 'hr', `Annulation bulletin ${payrolls[idx].employeeName} (${payrolls[idx].periodMonth}) : ${reason}`, performedBy);
    return payrolls[idx];
  }

  // Performance breakdown
  public static getStaffPerformance() {
    const users = db.get('users') || [];
    const sales = db.get('sales') || [];
    const orders = db.get('orders') || [];
    const attendances = db.get('attendances') || [];

    return users.map(user => {
      const userSales = sales.filter(s => s && s.cashierId === user.id);
      const userOrders = orders.filter(o => o && o.serverUserId === user.id);
      const userAttendances = attendances.filter(a => a && a.employeeId === user.id);

      const totalSalesRevenue = userSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalHours = userAttendances.reduce((sum, a) => sum + (a.totalHoursWorked || 0), 0);

      return {
        employeeId: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        salesCount: userSales.length,
        salesRevenue: Number(totalSalesRevenue.toFixed(2)),
        ordersHandled: userOrders.length,
        hoursWorked: Number(totalHours.toFixed(1)),
        avgTicket: userSales.length > 0 ? Number((totalSalesRevenue / userSales.length).toFixed(2)) : 0
      };
    });
  }
}

