import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, XCircle, Palmtree, BedDouble, Clock, Sunrise, Moon, HelpCircle } from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  EmployeeRecord,
  EmployeeScheduleTemplate,
  RecurringDayRule,
  ShiftType
} from '../types';

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const WEEKDAY_LABELS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const SHIFT_META: Record<ShiftType, { label: string; defaultStart: string; defaultEnd: string; icon: LucideIcon; color: string }> = {
  matin: { label: 'Matin', defaultStart: '07:30', defaultEnd: '15:30', icon: Sunrise, color: 'text-amber-600' },
  soir: { label: 'Soir', defaultStart: '15:30', defaultEnd: '23:00', icon: Moon, color: 'text-indigo-600' }
};

export type ResolvedStatus = AttendanceStatus | 'unconfigured';

export const STATUS_META: Record<ResolvedStatus, { label: string; badge: string; badgeSoft: string; dot: string; icon: LucideIcon }> = {
  present: { label: 'Présent', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', badgeSoft: 'bg-emerald-50/70 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  absent: { label: 'Absent', badge: 'bg-rose-100 text-rose-800 border-rose-300', badgeSoft: 'bg-rose-50/70 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: XCircle },
  leave: { label: 'Congé', badge: 'bg-violet-100 text-violet-800 border-violet-300', badgeSoft: 'bg-violet-50/70 text-violet-700 border-violet-200', dot: 'bg-violet-500', icon: Palmtree },
  rest: { label: 'Repos', badge: 'bg-slate-200 text-slate-700 border-slate-300', badgeSoft: 'bg-slate-100/70 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: BedDouble },
  late: { label: 'Retard', badge: 'bg-amber-100 text-amber-800 border-amber-300', badgeSoft: 'bg-amber-50/70 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  unconfigured: { label: 'Non configuré', badge: 'bg-white text-[#9AA39C] border-dashed border-[#D9DDD8]', badgeSoft: 'bg-white text-[#9AA39C] border-dashed border-[#D9DDD8]', dot: 'bg-[#D9DDD8]', icon: HelpCircle }
};

/** Statuts pouvant être posés comme action rapide sur un jour (tous sauf l'état technique "non configuré"). */
export const QUICK_ACTION_STATUSES: AttendanceStatus[] = ['present', 'absent', 'leave', 'late', 'rest'];

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const toDateStr = (date: Date) => date.toISOString().slice(0, 10);

export const startOfWeek = (dateStr: string): Date => {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = date.getDay(); // 0 = Sunday
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + diffToMonday);
  return date;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addDaysToDateStr = (dateStr: string, days: number): string => toDateStr(addDays(new Date(`${dateStr}T12:00:00`), days));

/** 0 = Lundi ... 6 = Dimanche, aligné sur WEEKDAY_LABELS. */
export const weekdayIndex = (dateStr: string): number => {
  const jsDay = new Date(`${dateStr}T12:00:00`).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
};

export const emptyTemplateDays = (): RecurringDayRule[] =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, worked: weekday < 5, shift: weekday < 5 ? 'matin' : undefined, startTime: weekday < 5 ? SHIFT_META.matin.defaultStart : undefined, endTime: weekday < 5 ? SHIFT_META.matin.defaultEnd : undefined } as RecurringDayRule));

/** Version du planning récurrent active à une date donnée (la plus récente dont effectiveFrom <= date < effectiveTo). */
export const getActiveTemplate = (
  templates: EmployeeScheduleTemplate[],
  employeeId: string,
  date: string
): EmployeeScheduleTemplate | undefined => {
  const candidates = templates.filter(
    t => t.employeeId === employeeId && t.effectiveFrom <= date && (!t.effectiveTo || t.effectiveTo > date)
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, t) => (t.effectiveFrom > latest.effectiveFrom ? t : latest));
};

export interface ResolvedDay {
  date: string;
  employeeId: string;
  /** 'unconfigured' = aucun planning récurrent défini pour ce jour et aucune exception. */
  status: AttendanceStatus | 'unconfigured';
  /** true si un AttendanceRecord existe pour ce jour précis (dérogation ponctuelle au planning récurrent). */
  isException: boolean;
  /** true si le jour est un repos issu de la règle récurrente (pas d'exception). */
  isRecurringRest: boolean;
  shift?: ShiftType;
  startTime?: string;
  endTime?: string;
  actualStartTime?: string;
  lateMinutes?: number;
  notes?: string;
  attendanceRecord?: AttendanceRecord;
  templateRule?: RecurringDayRule;
}

export const computeLateMinutes = (planned?: string, actual?: string): number | undefined => {
  if (!planned || !actual) return undefined;
  const [ph, pm] = planned.split(':').map(Number);
  const [ah, am] = actual.split(':').map(Number);
  if ([ph, pm, ah, am].some(n => Number.isNaN(n))) return undefined;
  const diff = ah * 60 + am - (ph * 60 + pm);
  return diff > 0 ? diff : 0;
};

/** Résout l'état effectif d'un employé pour un jour précis : exception si elle existe, sinon règle récurrente. */
export const resolveDay = (
  employeeId: string,
  date: string,
  templates: EmployeeScheduleTemplate[],
  attendances: AttendanceRecord[]
): ResolvedDay => {
  const exception = attendances.find(a => a.employeeId === employeeId && a.date === date);
  const template = getActiveTemplate(templates, employeeId, date);
  const rule = template?.days.find(d => d.weekday === weekdayIndex(date));

  if (exception) {
    return {
      date,
      employeeId,
      status: exception.status,
      isException: true,
      isRecurringRest: false,
      shift: exception.shift ?? rule?.shift,
      startTime: exception.plannedStartTime ?? (rule?.worked ? rule.startTime : undefined),
      endTime: exception.plannedEndTime ?? (rule?.worked ? rule.endTime : undefined),
      actualStartTime: exception.actualStartTime,
      lateMinutes: exception.status === 'late' ? computeLateMinutes(exception.plannedStartTime ?? rule?.startTime, exception.actualStartTime) : undefined,
      notes: exception.notes,
      attendanceRecord: exception,
      templateRule: rule
    };
  }

  if (!rule) {
    return { date, employeeId, status: 'unconfigured', isException: false, isRecurringRest: false };
  }

  if (!rule.worked) {
    return { date, employeeId, status: 'rest', isException: false, isRecurringRest: true, templateRule: rule };
  }

  return {
    date,
    employeeId,
    status: 'present',
    isException: false,
    isRecurringRest: false,
    shift: rule.shift,
    startTime: rule.startTime,
    endTime: rule.endTime,
    templateRule: rule
  };
};

export const resolveWeek = (
  employeeId: string,
  weekDates: string[],
  templates: EmployeeScheduleTemplate[],
  attendances: AttendanceRecord[]
): ResolvedDay[] => weekDates.map(date => resolveDay(employeeId, date, templates, attendances));

export interface WeeklySummary {
  workedDays: number;
  restDays: number;
  absences: number;
  leaves: number;
  lates: number;
  unconfigured: number;
  plannedHours: number;
}

const durationHours = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0;
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
};

export const computeWeeklySummary = (days: ResolvedDay[]): WeeklySummary => {
  const summary: WeeklySummary = { workedDays: 0, restDays: 0, absences: 0, leaves: 0, lates: 0, unconfigured: 0, plannedHours: 0 };
  for (const d of days) {
    if (d.status === 'present' || d.status === 'late') {
      summary.workedDays++;
      summary.plannedHours += durationHours(d.startTime, d.endTime);
    }
    if (d.status === 'rest') summary.restDays++;
    if (d.status === 'absent') summary.absences++;
    if (d.status === 'leave') summary.leaves++;
    if (d.status === 'late') summary.lates++;
    if (d.status === 'unconfigured') summary.unconfigured++;
  }
  return summary;
};

export interface StaffingGap {
  date: string;
  reason: string;
}

/** Anomalies simples et concrètes : aucun employé actif planifié un jour donné (trou de couverture). */
export const findStaffingGaps = (
  employees: EmployeeRecord[],
  weekDates: string[],
  templates: EmployeeScheduleTemplate[],
  attendances: AttendanceRecord[]
): StaffingGap[] => {
  const active = employees.filter(e => e.active);
  const gaps: StaffingGap[] = [];
  for (const date of weekDates) {
    const workingCount = active.filter(e => {
      const resolved = resolveDay(e.id, date, templates, attendances);
      return resolved.status === 'present' || resolved.status === 'late';
    }).length;
    if (active.length > 0 && workingCount === 0) {
      gaps.push({ date, reason: 'Aucun employé prévu ce jour' });
    }
  }
  return gaps;
};

export const unconfiguredEmployees = (
  employees: EmployeeRecord[],
  templates: EmployeeScheduleTemplate[],
  date: string
): EmployeeRecord[] => employees.filter(e => e.active && !getActiveTemplate(templates, e.id, date));
