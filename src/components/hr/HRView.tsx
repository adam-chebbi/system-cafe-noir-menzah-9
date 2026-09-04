import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { AttendanceRecord, AttendanceStatus, EmployeeRecord, PersonnelFinancialRecord } from '../../types';
import { AttachmentUpload, fileToDataUrl } from '../common/AttachmentViewer';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Users,
  CalendarDays,
  Wallet,
  Plus,
  Search,
  Edit3,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  IdCard,
  Camera,
  UserCheck,
  UserX
} from 'lucide-react';

type HRTab = 'employees' | 'planning' | 'finance';

type ConfirmTarget =
  | { type: 'toggle-employee'; employee: EmployeeRecord }
  | { type: 'delete-presence'; record: AttendanceRecord }
  | { type: 'delete-finance'; record: PersonnelFinancialRecord };

const STATUS_META: Record<AttendanceStatus, { label: string; badge: string; dot: string }> = {
  present: { label: 'Présent', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  absent: { label: 'Absent', badge: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
  leave: { label: 'Congé', badge: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  rest: { label: 'Repos', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  late: { label: 'Retard', badge: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const money = (value: number) => `${(value || 0).toFixed(3)} DT`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => todayStr().slice(0, 7);
const toDateStr = (date: Date) => date.toISOString().slice(0, 10);

const startOfWeek = (dateStr: string): Date => {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = date.getDay(); // 0 = Sunday
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + diffToMonday);
  return date;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatShortDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const emptyEmployeeForm = (): Partial<EmployeeRecord> => ({
  name: '',
  phone: '',
  position: '',
  entryDate: todayStr(),
  active: true,
  baseSalary: 0,
  cinNumber: '',
  cinIssueDate: '',
  photoUrl: '',
  cinCopyUrl: ''
});

const emptyFinanceForm = (): Partial<PersonnelFinancialRecord> => ({
  employeeId: '',
  date: todayStr(),
  baseSalary: 0,
  advances: 0,
  bonuses: 0,
  deductions: 0,
  amountPaid: 0,
  paymentDate: '',
  notes: ''
});

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const PhotoPicker: React.FC<{ value: string; onChange: (dataUrl: string) => void }> = ({ value, onChange }) => {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(await fileToDataUrl(file));
    e.target.value = '';
  };

  return (
    <label className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center cursor-pointer group">
      {value ? (
        <img src={value} alt="Photo" className="w-full h-full object-cover" />
      ) : (
        <Camera className="w-5 h-5 text-[#555D58]" />
      )}
      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera className="w-4 h-4 text-white" />
      </span>
      <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </label>
  );
};

export const HRView: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentView, currentSubTab, globalVersion, triggerGlobalRefresh, showRouteNotification } = useSystem();
  const performedBy = currentUser?.name || 'Administrateur';

  const [tab, setTab] = useState<HRTab>('employees');

  useEffect(() => {
    if (currentSubTab === 'planning' || currentView === 'planning' || currentView === 'attendance') {
      setTab('planning');
    } else if (currentSubTab === 'finance') {
      setTab('finance');
    } else if (currentSubTab === 'team' || currentView === 'employees') {
      setTab('employees');
    }
  }, [currentView, currentSubTab]);

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [financialRecords, setFinancialRecords] = useState<PersonnelFinancialRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  const [employeeQuery, setEmployeeQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(todayStr()));
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [financeEmployeeFilter, setFinanceEmployeeFilter] = useState('');
  const [financeMonthFilter, setFinanceMonthFilter] = useState(currentMonthStr());

  const [employeeForm, setEmployeeForm] = useState<Partial<EmployeeRecord> | null>(null);
  const [presenceForm, setPresenceForm] = useState<Partial<AttendanceRecord> | null>(null);
  const [financeForm, setFinanceForm] = useState<Partial<PersonnelFinancialRecord> | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  const loadCore = async () => {
    try {
      const [employeesData, financialData] = await Promise.all([
        api.getEmployees(),
        api.getPersonnelFinancialRecords()
      ]);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setFinancialRecords(Array.isArray(financialData) ? financialData : []);
    } catch (err) {
      console.error('Failed to load HR data:', err);
    }
  };

  const loadAttendances = async () => {
    try {
      const data = await api.getAttendances({ start: toDateStr(weekStart), end: toDateStr(addDays(weekStart, 6)) });
      setAttendances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load presence data:', err);
    }
  };

  useEffect(() => {
    loadCore();
  }, [globalVersion]);

  useEffect(() => {
    loadAttendances();
  }, [weekStart, globalVersion]);

  const activeEmployees = employees.filter(e => e.active);
  const visibleEmployees = employees
    .filter(e => showInactive || e.active)
    .filter(e => {
      if (!employeeQuery.trim()) return true;
      const q = employeeQuery.trim().toLowerCase();
      return e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q);
    });

  const totalPersonnelCost = financialRecords.reduce(
    (sum, r) => sum + r.baseSalary + r.advances + r.bonuses - r.deductions,
    0
  );

  // --- Employés ---
  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm) return;
    try {
      if (employeeForm.id) {
        await api.updateEmployee(employeeForm.id, employeeForm, performedBy);
        showRouteNotification('Dossier employé mis à jour.', 'success');
      } else {
        await api.createEmployee(employeeForm, performedBy);
        showRouteNotification('Employé ajouté.', 'success');
      }
      setEmployeeForm(null);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || "Erreur lors de l'enregistrement.", 'error');
    }
  };

  const confirmToggleEmployee = async () => {
    if (!confirmTarget || confirmTarget.type !== 'toggle-employee') return;
    const { employee } = confirmTarget;
    try {
      if (employee.active) {
        await api.setEmployeeActive(employee.id, performedBy);
      } else {
        await api.updateEmployee(employee.id, { active: true }, performedBy);
      }
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  // --- Planning & présence ---
  const openPresenceEntry = (employee: EmployeeRecord, date: string, existing?: AttendanceRecord) => {
    setPresenceForm(
      existing
        ? { ...existing }
        : {
            employeeId: employee.id,
            employeeName: employee.name,
            date,
            status: 'present',
            plannedStartTime: '',
            plannedEndTime: '',
            notes: ''
          }
    );
  };

  const submitPresence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presenceForm?.employeeId || !presenceForm.date || !presenceForm.status) return;
    const employee = employees.find(x => x.id === presenceForm.employeeId);
    try {
      await api.saveAttendance(
        {
          employeeId: presenceForm.employeeId,
          employeeName: employee?.name || presenceForm.employeeName || '',
          date: presenceForm.date,
          status: presenceForm.status as AttendanceStatus,
          plannedStartTime: presenceForm.plannedStartTime || undefined,
          plannedEndTime: presenceForm.plannedEndTime || undefined,
          notes: presenceForm.notes || undefined
        },
        performedBy
      );
      setPresenceForm(null);
      loadAttendances();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  const confirmDeletePresence = async () => {
    if (!confirmTarget || confirmTarget.type !== 'delete-presence') return;
    try {
      await api.deleteAttendance(confirmTarget.record.id, performedBy);
      loadAttendances();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  // --- Suivi financier ---
  const filteredFinance = financialRecords.filter(
    r =>
      (!financeEmployeeFilter || r.employeeId === financeEmployeeFilter) &&
      (!financeMonthFilter || r.date.startsWith(financeMonthFilter))
  );
  const financeSum = (field: 'baseSalary' | 'advances' | 'bonuses' | 'deductions' | 'amountPaid') =>
    filteredFinance.reduce((sum, r) => sum + (r[field] || 0), 0);
  const filteredCost = financeSum('baseSalary') + financeSum('advances') + financeSum('bonuses') - financeSum('deductions');

  const submitFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeForm?.employeeId) return;
    const employee = employees.find(x => x.id === financeForm.employeeId);
    const payload = {
      ...financeForm,
      employeeName: employee?.name || financeForm.employeeName || '',
      date: financeForm.date || todayStr()
    };
    try {
      if (financeForm.id) {
        await api.updatePersonnelFinancialRecord(financeForm.id, payload, performedBy);
      } else {
        await api.createPersonnelFinancialRecord(payload, performedBy);
      }
      setFinanceForm(null);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  const confirmDeleteFinance = async () => {
    if (!confirmTarget || confirmTarget.type !== 'delete-finance') return;
    try {
      await api.deletePersonnelFinancialRecord(confirmTarget.record.id, performedBy);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    } finally {
      setConfirmTarget(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.25rem)] bg-[#F7F7F5] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555D58]">Ressources humaines</p>
            <h1 className="font-serif text-2xl font-black text-[#252A27]">Équipe, planning & suivi financier</h1>
            <p className="text-sm text-[#555D58] mt-1">
              Gestion 100&nbsp;% manuelle : aucun pointage automatique, aucune fiche de paie générée.
            </p>
          </div>
          <div className="bg-white border border-[#D9DDD8] rounded-xl px-4 py-3 shadow-2xs">
            <p className="text-[11px] font-bold text-[#555D58] uppercase tracking-wide">Coût personnel enregistré</p>
            <p className="text-lg font-black text-[#252A27]">{money(totalPersonnelCost)}</p>
          </div>
        </header>

        <nav className="flex gap-1 p-1 bg-[#ECEEEA] rounded-xl w-fit">
          {(
            [
              { id: 'employees', label: 'Employés', icon: Users },
              { id: 'planning', label: 'Planning & présence', icon: CalendarDays },
              { id: 'finance', label: 'Suivi financier', icon: Wallet }
            ] as { id: HRTab; label: string; icon: React.ElementType }[]
          ).map(item => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                  isActive ? 'bg-[#252A27] text-[#A4DEC2] shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {tab === 'employees' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={employeeQuery}
                    onChange={e => setEmployeeQuery(e.target.value)}
                    placeholder="Rechercher un nom ou un poste..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D9DDD8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A4DEC2] focus:border-transparent"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#555D58] whitespace-nowrap">
                  <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                  Inclure les inactifs
                </label>
              </div>
              <button
                onClick={() => setEmployeeForm(emptyEmployeeForm())}
                className="flex items-center gap-2 rounded-xl bg-[#252A27] text-[#A4DEC2] px-4 py-2 text-sm font-bold hover:bg-[#343B37] transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" /> Nouvel employé
              </button>
            </div>

            {visibleEmployees.length === 0 ? (
              <div className="bg-white border border-dashed border-[#D9DDD8] rounded-2xl p-10 text-center text-sm text-[#555D58]">
                {employeeQuery ? 'Aucun employé ne correspond à votre recherche.' : 'Aucun employé enregistré pour le moment.'}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleEmployees.map(employee => (
                  <article
                    key={employee.id}
                    className={`bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs ${employee.active ? '' : 'opacity-70'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center font-bold text-[#252A27]">
                        {employee.photoUrl ? (
                          <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" />
                        ) : (
                          initials(employee.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-bold text-[#252A27] truncate">{employee.name}</h2>
                          <span
                            className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              employee.active
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {employee.active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <p className="text-sm text-[#555D58] truncate">{employee.position}</p>
                        <div className="mt-1.5 space-y-0.5 text-xs text-[#555D58]">
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {employee.phone || 'Non renseigné'}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <IdCard className="w-3 h-3" />
                            CIN {employee.cinNumber || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#ECEEEA]">
                      <div>
                        <p className="text-[10px] font-bold text-[#555D58] uppercase">Salaire de base</p>
                        <p className="font-bold text-[#252A27]">{money(employee.baseSalary)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEmployeeForm({ ...employee })}
                          className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmTarget({ type: 'toggle-employee', employee })}
                          className={`p-2 rounded-lg transition-colors ${
                            employee.active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={employee.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {employee.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'planning' && (
          <section className="space-y-4">
            <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] transition-colors"
                  title="Semaine précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm font-bold text-[#252A27] min-w-[170px] text-center">
                  Semaine du {formatShortDate(weekDates[0])} au {formatShortDate(weekDates[6])}
                </div>
                <button
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] transition-colors"
                  title="Semaine suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWeekStart(startOfWeek(todayStr()))}
                  className="text-xs font-bold text-[#555D58] hover:text-[#252A27] px-2.5 py-1.5 rounded-lg hover:bg-[#ECEEEA] transition-colors"
                >
                  Aujourd'hui
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {(Object.entries(STATUS_META) as [AttendanceStatus, typeof STATUS_META[AttendanceStatus]][]).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F7F7F5] border border-[#D9DDD8] text-[#555D58] font-semibold">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>

            {activeEmployees.length === 0 ? (
              <div className="bg-white border border-dashed border-[#D9DDD8] rounded-2xl p-10 text-center text-sm text-[#555D58]">
                Ajoutez un employé actif dans l'onglet Employés pour commencer à planifier.
              </div>
            ) : (
              <div className="bg-white border border-[#D9DDD8] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-[#F2F3F0]">
                        <th className="sticky left-0 bg-[#F2F3F0] text-left p-3 font-bold text-[#252A27] border-b border-[#D9DDD8] min-w-[170px]">
                          Employé
                        </th>
                        {weekDates.map(date => {
                          const isToday = toDateStr(date) === todayStr();
                          return (
                            <th
                              key={toDateStr(date)}
                              className={`p-2.5 text-center border-b border-[#D9DDD8] min-w-[108px] ${isToday ? 'bg-[#A4DEC2]/20' : ''}`}
                            >
                              <p className="font-bold text-[#252A27]">{WEEKDAY_LABELS[(date.getDay() + 6) % 7]}</p>
                              <p className="text-[11px] text-[#555D58] font-normal">
                                {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
                              </p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map(employee => (
                        <tr key={employee.id} className="border-b border-[#ECEEEA] last:border-0">
                          <td className="sticky left-0 bg-white p-3 align-top">
                            <p className="font-bold text-[#252A27]">{employee.name}</p>
                            <p className="text-[11px] text-[#555D58]">{employee.position}</p>
                          </td>
                          {weekDates.map(date => {
                            const dateStr = toDateStr(date);
                            const record = attendances.find(a => a.employeeId === employee.id && a.date === dateStr);
                            return (
                              <td key={dateStr} className="p-1.5 text-center align-top">
                                <button
                                  onClick={() => openPresenceEntry(employee, dateStr, record)}
                                  className={`w-full rounded-lg border px-1.5 py-1.5 text-[11px] font-bold transition-colors ${
                                    record
                                      ? STATUS_META[record.status].badge
                                      : 'bg-[#F7F7F5] border-dashed border-[#D9DDD8] text-[#9AA39C] hover:border-[#252A27] hover:text-[#252A27]'
                                  }`}
                                >
                                  {record ? STATUS_META[record.status].label : '+ Ajouter'}
                                  {record && (record.plannedStartTime || record.plannedEndTime) && (
                                    <span className="block font-normal text-[10px] mt-0.5 opacity-80">
                                      {record.plannedStartTime || '—'}–{record.plannedEndTime || '—'}
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'finance' && (
          <section className="space-y-4">
            <div className="grid sm:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="bg-[#252A27] text-[#A4DEC2] rounded-2xl p-4 shadow-2xs xl:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Coût total personnel</p>
                <p className="text-xl font-black mt-1">{money(filteredCost)}</p>
              </div>
              <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Salaires de base</p>
                <p className="text-lg font-black text-[#252A27] mt-1">{money(financeSum('baseSalary'))}</p>
              </div>
              <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Avances</p>
                <p className="text-lg font-black text-[#252A27] mt-1">{money(financeSum('advances'))}</p>
              </div>
              <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Primes</p>
                <p className="text-lg font-black text-[#252A27] mt-1">{money(financeSum('bonuses'))}</p>
              </div>
              <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Montant payé</p>
                <p className="text-lg font-black text-[#252A27] mt-1">{money(financeSum('amountPaid'))}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={financeEmployeeFilter}
                  onChange={e => setFinanceEmployeeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D9DDD8] bg-white text-sm font-semibold text-[#252A27]"
                >
                  <option value="">Tous les employés</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={financeMonthFilter}
                  onChange={e => setFinanceMonthFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D9DDD8] bg-white text-sm font-semibold text-[#252A27]"
                />
                {financeMonthFilter && (
                  <button
                    onClick={() => setFinanceMonthFilter('')}
                    className="text-xs font-bold text-[#555D58] hover:text-[#252A27] px-2 py-1.5 rounded-lg hover:bg-[#ECEEEA] transition-colors"
                  >
                    Tous les mois
                  </button>
                )}
              </div>
              <button
                onClick={() => setFinanceForm(emptyFinanceForm())}
                className="flex items-center gap-2 rounded-xl bg-[#252A27] text-[#A4DEC2] px-4 py-2 text-sm font-bold hover:bg-[#343B37] transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" /> Nouvelle saisie
              </button>
            </div>

            <div className="bg-white border border-[#D9DDD8] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F2F3F0] text-left text-[11px] uppercase tracking-wide text-[#555D58]">
                    <tr>
                      <th className="p-3">Employé</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Base</th>
                      <th className="p-3">Avances</th>
                      <th className="p-3">Primes</th>
                      <th className="p-3">Retenues</th>
                      <th className="p-3">Payé</th>
                      <th className="p-3">Paiement</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFinance.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-sm text-[#555D58]">
                          Aucune saisie financière pour cette période.
                        </td>
                      </tr>
                    ) : (
                      filteredFinance.map(record => (
                        <tr key={record.id} className="border-t border-[#ECEEEA]">
                          <td className="p-3 font-bold text-[#252A27]">{record.employeeName}</td>
                          <td className="p-3 text-[#555D58]">{record.date}</td>
                          <td className="p-3">{money(record.baseSalary)}</td>
                          <td className="p-3">{money(record.advances)}</td>
                          <td className="p-3">{money(record.bonuses)}</td>
                          <td className="p-3">{money(record.deductions)}</td>
                          <td className="p-3 font-bold">{money(record.amountPaid)}</td>
                          <td className="p-3 text-[#555D58]">{record.paymentDate || '—'}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setFinanceForm({ ...record })}
                                className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmTarget({ type: 'delete-finance', record })}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                title="Supprimer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* --- Modale : fiche employé --- */}
      {employeeForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">{employeeForm.id ? "Modifier l'employé" : 'Nouvel employé'}</h3>
              <button onClick={() => setEmployeeForm(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={submitEmployee} className="space-y-3">
              <div className="flex items-center gap-3">
                <PhotoPicker value={employeeForm.photoUrl || ''} onChange={url => setEmployeeForm({ ...employeeForm, photoUrl: url })} />
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Nom complet</label>
                  <input
                    required
                    type="text"
                    value={employeeForm.name || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Poste</label>
                  <input
                    required
                    type="text"
                    value={employeeForm.position || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Téléphone</label>
                  <input
                    type="tel"
                    value={employeeForm.phone || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date d'entrée</label>
                  <input
                    type="date"
                    value={employeeForm.entryDate || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, entryDate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Salaire de base (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={employeeForm.baseSalary ?? 0}
                    onChange={e => setEmployeeForm({ ...employeeForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Numéro CIN</label>
                  <input
                    type="text"
                    value={employeeForm.cinNumber || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, cinNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date d'émission CIN</label>
                  <input
                    type="date"
                    value={employeeForm.cinIssueDate || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, cinIssueDate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Copie / photo de la CIN</label>
                <AttachmentUpload
                  value={employeeForm.cinCopyUrl || ''}
                  onChange={url => setEmployeeForm({ ...employeeForm, cinCopyUrl: url })}
                  label="Joindre la copie de la CIN"
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={employeeForm.active !== false}
                  onChange={e => setEmployeeForm({ ...employeeForm, active: e.target.checked })}
                />
                <span className="text-xs font-bold text-[#252A27]">Employé actif</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmployeeForm(null)}
                  className="flex-1 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#555D58] hover:bg-[#ECEEEA] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {employeeForm.id ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modale : saisie / correction de présence --- */}
      {presenceForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div>
                <h3 className="font-bold text-sm text-[#252A27]">{presenceForm.employeeName}</h3>
                <p className="text-[11px] text-[#555D58]">{presenceForm.date}</p>
              </div>
              <button onClick={() => setPresenceForm(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={submitPresence} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Statut</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(STATUS_META) as [AttendanceStatus, typeof STATUS_META[AttendanceStatus]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPresenceForm({ ...presenceForm, status: key })}
                      className={`px-2 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        presenceForm.status === key ? meta.badge : 'bg-white border-[#D9DDD8] text-[#555D58] hover:bg-[#ECEEEA]'
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Heure prévue - début</label>
                  <input
                    type="time"
                    value={presenceForm.plannedStartTime || ''}
                    onChange={e => setPresenceForm({ ...presenceForm, plannedStartTime: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Heure prévue - fin</label>
                  <input
                    type="time"
                    value={presenceForm.plannedEndTime || ''}
                    onChange={e => setPresenceForm({ ...presenceForm, plannedEndTime: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Note (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex : retard signalé, motif d'absence..."
                  value={presenceForm.notes || ''}
                  onChange={e => setPresenceForm({ ...presenceForm, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                {presenceForm.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const record = attendances.find(a => a.id === presenceForm.id);
                      if (record) setConfirmTarget({ type: 'delete-presence', record });
                      setPresenceForm(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                  >
                    Supprimer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPresenceForm(null)}
                  className="flex-1 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#555D58] hover:bg-[#ECEEEA] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modale : suivi financier --- */}
      {financeForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">{financeForm.id ? 'Modifier la saisie' : 'Nouvelle saisie financière'}</h3>
              <button onClick={() => setFinanceForm(null)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={submitFinance} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Employé</label>
                <select
                  required
                  value={financeForm.employeeId || ''}
                  onChange={e => {
                    const employee = employees.find(x => x.id === e.target.value);
                    setFinanceForm({ ...financeForm, employeeId: e.target.value, baseSalary: employee?.baseSalary ?? financeForm.baseSalary });
                  }}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  <option value="" disabled>
                    -- Choisir un employé --
                  </option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date</label>
                  <input
                    type="date"
                    required
                    value={financeForm.date || ''}
                    onChange={e => setFinanceForm({ ...financeForm, date: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Salaire de base (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={financeForm.baseSalary ?? 0}
                    onChange={e => setFinanceForm({ ...financeForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Avances (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={financeForm.advances ?? 0}
                    onChange={e => setFinanceForm({ ...financeForm, advances: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Primes (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={financeForm.bonuses ?? 0}
                    onChange={e => setFinanceForm({ ...financeForm, bonuses: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Retenues (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={financeForm.deductions ?? 0}
                    onChange={e => setFinanceForm({ ...financeForm, deductions: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Montant payé (DT)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={financeForm.amountPaid ?? 0}
                    onChange={e => setFinanceForm({ ...financeForm, amountPaid: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Date de paiement</label>
                <input
                  type="date"
                  value={financeForm.paymentDate || ''}
                  onChange={e => setFinanceForm({ ...financeForm, paymentDate: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Note (optionnel)</label>
                <input
                  type="text"
                  value={financeForm.notes || ''}
                  onChange={e => setFinanceForm({ ...financeForm, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFinanceForm(null)}
                  className="flex-1 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#555D58] hover:bg-[#ECEEEA] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  {financeForm.id ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmTarget}
        title={
          confirmTarget?.type === 'toggle-employee'
            ? confirmTarget.employee.active
              ? "Désactiver l'employé"
              : "Réactiver l'employé"
            : confirmTarget?.type === 'delete-presence'
            ? 'Supprimer la présence'
            : 'Supprimer la saisie financière'
        }
        message={
          confirmTarget?.type === 'toggle-employee'
            ? confirmTarget.employee.active
              ? `${confirmTarget.employee.name} n'apparaîtra plus dans le planning ni dans les nouvelles saisies. Son historique est conservé.`
              : `${confirmTarget.employee.name} redevient actif et réapparaît dans le planning.`
            : confirmTarget?.type === 'delete-presence'
            ? `Supprimer la présence de ${confirmTarget.record.employeeName} du ${confirmTarget.record.date} ?`
            : confirmTarget?.type === 'delete-finance'
            ? `Supprimer la saisie financière de ${confirmTarget.record.employeeName} (${money(confirmTarget.record.amountPaid)}) ?`
            : ''
        }
        confirmLabel={confirmTarget?.type === 'toggle-employee' && !confirmTarget.employee.active ? 'Réactiver' : 'Confirmer'}
        variant={confirmTarget?.type === 'toggle-employee' && !confirmTarget.employee.active ? 'info' : 'danger'}
        onConfirm={() => {
          if (confirmTarget?.type === 'toggle-employee') confirmToggleEmployee();
          else if (confirmTarget?.type === 'delete-presence') confirmDeletePresence();
          else if (confirmTarget?.type === 'delete-finance') confirmDeleteFinance();
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </main>
  );
};
