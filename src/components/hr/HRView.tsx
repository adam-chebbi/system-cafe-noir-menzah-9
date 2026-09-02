import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User as Employee, Shift, AttendanceRecord, PayrollRecord } from '../../types/index';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentViewer, AttachmentUpload } from '../common/AttachmentViewer';
import { SoftDeleteBadge } from '../common/SoftDeleteBadge';
import { RetroactiveDocumentPanel, emptyRetroactiveFields, RetroactiveFields } from '../common/RetroactiveDocumentPanel';
import {
  Users,
  Plus,
  Clock,
  Calendar,
  DollarSign,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  UserCheck,
  X,
  Play,
  Square,
  Search,
  ChevronRight,
  ShieldAlert,
  History,
  Edit2,
  Trash2,
  Ban,
  FileText
} from 'lucide-react';

export const HRView: React.FC = () => {
  const {
    globalVersion,
    triggerGlobalRefresh,
    currentSubTab,
    setCurrentSubTab,
    currentAction,
    setCurrentAction,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const { currentUser } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'shifts' | 'attendance' | 'payroll'>('team');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const hasValidatedIdRef = useRef(false);

  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empFormData, setEmpFormData] = useState<Partial<Employee>>({
    name: '',
    role: 'barista',
    hourlyRate: 14.5,
    pin: '0000',
    email: '',
    phone: '',
    active: true
  });

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftFormData, setShiftFormData] = useState<{
    employeeId: string;
    shiftDate: string;
    startTime: string;
    endTime: string;
    role: string;
    notes: string;
  }>({
    employeeId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '15:30',
    role: 'barista',
    notes: 'Service du matin'
  });

  // Retroactive Payroll Modal
  const [isRetroPayrollModalOpen, setIsRetroPayrollModalOpen] = useState(false);
  const [retroPayrollEmpId, setRetroPayrollEmpId] = useState('');
  const [retroPayrollPeriod, setRetroPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [retroPayrollGross, setRetroPayrollGross] = useState(2200);
  const [retroPayrollNet, setRetroPayrollNet] = useState(1700);
  const [retroFields, setRetroFields] = useState<RetroactiveFields>(emptyRetroactiveFields());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    confirmLabel: string;
    reasonLabel?: string;
    reasonRequired?: boolean;
    onConfirm: (reason?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmLabel: 'Confirmer',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (currentSubTab === 'team') setActiveTab('team');
    else if (currentSubTab === 'shifts') setActiveTab('shifts');
    else if (currentSubTab === 'attendance') setActiveTab('attendance');
    else if (currentSubTab === 'payroll') setActiveTab('payroll');

    if (currentAction === 'new_employee') openCreateEmployeeModal();
    else if (currentAction === 'new_shift') openCreateShiftModal();
    else if (currentAction === 'retro-payroll') openRetroPayrollModal();
  }, [currentSubTab, currentAction]);

  const [loading, setLoading] = useState(false);

  const loadHRData = async () => {
    try {
      setLoading(true);
      const [emps, shfs, atts, pays] = await Promise.all([
        api.getEmployees(),
        api.getShifts(),
        api.getAttendance(),
        api.getPayroll()
      ]);
      setEmployees(emps);
      setShifts(shfs);
      setAttendances(atts);
      setPayrolls(pays);

      // Deep link ID handling
      if (currentRecordId) {
        const foundEmp = emps.find(e => e.id === currentRecordId);
        const foundShf = shfs.find(s => s.id === currentRecordId);
        const foundPay = pays.find(p => p.id === currentRecordId);

        if (foundEmp) {
          setSelectedEmployee(foundEmp);
          setActiveTab('team');
        } else if (foundShf) {
          setSelectedShift(foundShf);
          setActiveTab('shifts');
        } else if (foundPay) {
          setSelectedPayroll(foundPay);
          setActiveTab('payroll');
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`L'employé ou document RH (ID: "${currentRecordId}") est introuvable.`, 'warning');
          if (emps.length > 0) {
            setSelectedEmployee(emps[0]);
            setCurrentRecordId(emps[0].id, { replace: true });
          }
        }
        hasValidatedIdRef.current = true;
      } else {
        if (emps.length > 0 && !selectedEmployee) {
          setSelectedEmployee(emps[0]);
        }
        if (shfs.length > 0 && !selectedShift) {
          setSelectedShift(shfs[0]);
        }
        if (atts.length > 0 && !selectedAttendance) {
          setSelectedAttendance(atts[0]);
        }
        if (pays.length > 0 && !selectedPayroll) {
          setSelectedPayroll(pays[0]);
        }
      }

      if (emps.length > 0 && !shiftFormData.employeeId) {
        setShiftFormData(prev => ({ ...prev, employeeId: emps[0].id }));
      }
    } catch (err) {
      console.error('Failed to load HR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHRData();
  }, [globalVersion]);

  // Employee Handlers
  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    setEmpFormData({
      name: '',
      role: 'barista',
      hourlyRate: 14.5,
      pin: '0000',
      email: '',
      phone: '',
      active: true
    });
    setIsEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpFormData({
      name: emp.name,
      role: emp.role,
      hourlyRate: emp.hourlyRate,
      pin: emp.pin,
      email: emp.email,
      phone: emp.phone,
      active: emp.active
    });
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormData.name || !empFormData.pin) return;

    try {
      if (editingEmployee) {
        const updated = await api.updateEmployee(editingEmployee.id, empFormData, currentUser?.name || 'Admin');
        setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
        if (selectedEmployee?.id === updated.id) setSelectedEmployee(updated);
        showRouteNotification(`Collaborateur "${empFormData.name}" mis à jour`, 'success');
      } else {
        const created = await api.createEmployee({
          name: empFormData.name,
          role: empFormData.role || 'barista',
          hourlyRate: Number(empFormData.hourlyRate) || 14,
          pin: empFormData.pin,
          email: empFormData.email || '',
          phone: empFormData.phone || '',
          active: true
        }, currentUser?.name || 'Admin');
        setEmployees(prev => [created, ...prev]);
        setSelectedEmployee(created);
        showRouteNotification(`Collaborateur "${empFormData.name}" créé avec succès`, 'success');
      }
      setIsEmpModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleDeleteEmployee = (emp: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Désactiver le collaborateur',
      message: `Voulez-vous désactiver le compte de "${emp.name}" ? Il ne pourra plus se connecter sur la caisse tactile.`,
      variant: 'danger',
      confirmLabel: 'Désactiver',
      onConfirm: async () => {
        try {
          await api.deleteEmployee(emp.id, currentUser?.name || 'Admin');
          setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: false } : e));
          showRouteNotification(`Collaborateur "${emp.name}" désactivé`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  // Shift Handlers
  const openCreateShiftModal = () => {
    setEditingShift(null);
    setShiftFormData({
      employeeId: employees.length > 0 ? employees[0].id : '',
      shiftDate: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '15:30',
      role: 'barista',
      notes: 'Service du matin'
    });
    setIsShiftModalOpen(true);
  };

  const openEditShiftModal = (shf: Shift) => {
    setEditingShift(shf);
    setShiftFormData({
      employeeId: shf.employeeId,
      shiftDate: shf.date,
      startTime: shf.startTime,
      endTime: shf.endTime,
      role: shf.role,
      notes: shf.notes || ''
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftFormData.employeeId || !shiftFormData.shiftDate) return;

    try {
      const emp = employees.find(e => e.id === shiftFormData.employeeId);
      const payload: Partial<Shift> = {
        employeeId: shiftFormData.employeeId,
        employeeName: emp ? emp.name : 'Employé',
        date: shiftFormData.shiftDate,
        startTime: shiftFormData.startTime || '08:00',
        endTime: shiftFormData.endTime || '16:00',
        role: (shiftFormData.role || emp?.role || 'barista') as any,
        status: 'scheduled',
        breakMinutes: 30,
        notes: shiftFormData.notes
      };

      if (editingShift) {
        const updated = await api.updateShift(editingShift.id, payload, currentUser?.name || 'Admin');
        setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (selectedShift?.id === updated.id) setSelectedShift(updated);
        showRouteNotification('Shift mis à jour', 'success');
      } else {
        const created = await api.createShift(payload, currentUser?.name || 'Admin');
        setShifts(prev => [created, ...prev]);
        setSelectedShift(created);
        showRouteNotification('Shift planifié', 'success');
      }

      setIsShiftModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleDeleteShift = (shf: Shift) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer le shift',
      message: `Supprimer le shift de ${shf.employeeName} du ${shf.date} (${shf.startTime}-${shf.endTime}) ?`,
      variant: 'danger',
      confirmLabel: 'Supprimer',
      onConfirm: async () => {
        try {
          await api.deleteShift(shf.id, currentUser?.name || 'Admin');
          setShifts(prev => prev.filter(s => s.id !== shf.id));
          if (selectedShift?.id === shf.id) setSelectedShift(null);
          showRouteNotification('Shift supprimé', 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  // Clock In / Clock Out
  const handleClockIn = async (employeeId: string) => {
    try {
      await api.clockIn(employeeId, currentUser?.name || 'Employé');
      showRouteNotification('Prise de poste enregistrée', 'success');
      triggerGlobalRefresh();
      loadHRData();
    } catch (err: any) {
      showRouteNotification(err.message, 'error');
    }
  };

  const handleClockOut = async (attendanceId: string) => {
    try {
      await api.clockOut(attendanceId, 30, 'Fin de service', currentUser?.name || 'Employé');
      showRouteNotification('Fin de poste enregistrée', 'success');
      triggerGlobalRefresh();
      loadHRData();
    } catch (err: any) {
      showRouteNotification(err.message, 'error');
    }
  };

  // Payroll Handlers
  const openRetroPayrollModal = () => {
    setRetroPayrollEmpId(employees.length > 0 ? employees[0].id : '');
    setRetroPayrollPeriod(new Date().toISOString().slice(0, 7));
    setRetroPayrollGross(2200);
    setRetroPayrollNet(1700);
    setRetroFields(emptyRetroactiveFields());
    setIsRetroPayrollModalOpen(true);
  };

  const handleSaveRetroPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroPayrollEmpId || !retroPayrollPeriod) return;

    try {
      const emp = employees.find(e => e.id === retroPayrollEmpId);
      const finalDocDate = retroFields.documentDate || new Date().toISOString().split('T')[0];

      const created = await api.createManualPayroll({
        employeeId: retroPayrollEmpId,
        employeeName: emp ? emp.name : 'Employé',
        role: emp ? emp.role : 'barista',
        periodMonth: retroPayrollPeriod,
        baseHourlyRate: emp?.hourlyRate || 15,
        regularHours: 151.67,
        overtimeHours: 0,
        overtimeRate: (emp?.hourlyRate || 15) * 1.25,
        grossSalary: Number(retroPayrollGross) || 0,
        bonuses: 0,
        advancesDeductions: 0,
        taxDeductions: Number(((retroPayrollGross - retroPayrollNet) * 0.2).toFixed(2)),
        socialContributions: Number(((retroPayrollGross - retroPayrollNet) * 0.8).toFixed(2)),
        netSalary: Number(retroPayrollNet) || 0,
        paymentStatus: 'paid',
        paymentDate: finalDocDate,
        isRetroactive: true,
        documentDate: finalDocDate,
        attachmentUrl: retroFields.attachmentUrl || undefined,
        retroNotes: retroFields.notes || undefined
      }, currentUser?.name || 'Admin');

      setPayrolls(prev => [created, ...prev]);
      setSelectedPayroll(created);
      showRouteNotification('Bulletin historique enregistré', 'success');
      setIsRetroPayrollModalOpen(false);
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      const curMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      if (employees.length > 0) {
        for (const emp of employees) {
          await api.generatePayroll(emp.id, curMonth, 0, 0, currentUser?.name || 'Admin');
        }
      }
      showRouteNotification('Bulletins générés pour tous les employés actifs', 'success');
      triggerGlobalRefresh();
      loadHRData();
    } catch (err: any) {
      showRouteNotification(err.message, 'error');
    }
  };

  const handleCancelPayroll = (pay: PayrollRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Annuler le bulletin de paie',
      message: `Êtes-vous sûr de vouloir annuler le bulletin de ${pay.employeeName} (${pay.periodMonth || (pay as any).period}) ?`,
      variant: 'warning',
      confirmLabel: 'Annuler le bulletin',
      reasonLabel: 'Motif d\'annulation',
      reasonRequired: true,
      onConfirm: async (reason) => {
        try {
          await api.cancelPayroll(pay.id, reason || 'Annulation manuelle', currentUser?.name || 'Admin');
          setPayrolls(prev => prev.map(p => p.id === pay.id ? { ...p, cancelled: true, cancelReason: reason } : p));
          showRouteNotification(`Bulletin de ${pay.employeeName} annulé`, 'success');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          triggerGlobalRefresh();
        } catch (err: any) {
          showRouteNotification(`Erreur: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleMarkPayrollPaid = async (pay: PayrollRecord) => {
    try {
      await api.updatePayroll(pay.id, { paymentStatus: 'paid', paymentDate: new Date().toISOString().split('T')[0] }, currentUser?.name || 'Admin');
      setPayrolls(prev => prev.map(p => p.id === pay.id ? { ...p, paymentStatus: 'paid', paymentDate: new Date().toISOString().split('T')[0] } : p));
      showRouteNotification(`Bulletin de ${pay.employeeName} marqué comme réglé`, 'success');
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    }
  };


  // Filtered lists
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeShifts = Array.isArray(shifts) ? shifts : [];
  const safeAttendances = Array.isArray(attendances) ? attendances : [];
  const safePayrolls = Array.isArray(payrolls) ? payrolls : [];
  const q = (searchQuery || '').toLowerCase();

  const filteredEmployees = safeEmployees.filter(e =>
    (e.name || '').toLowerCase().includes(q) ||
    (e.role || '').toLowerCase().includes(q)
  );

  const filteredShifts = safeShifts.filter(s =>
    (s.employeeName || '').toLowerCase().includes(q) ||
    (s.role || '').toLowerCase().includes(q) ||
    (s.date || '').includes(q)
  );

  const filteredAttendances = safeAttendances.filter(a =>
    (a.employeeName || '').toLowerCase().includes(q) ||
    (a.date || '').includes(q)
  );

  const filteredPayrolls = safePayrolls.filter(p =>
    (p.employeeName || '').toLowerCase().includes(q) ||
    (p.periodMonth || (p as any).period || '').includes(q) ||
    (p.isRetroactive && 'historique'.includes(q))
  );

  const clockedInCount = safeAttendances.filter(a => a.status === 'active' || !(a as any).clockOut).length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#F7F7F5]">
      {/* Top Header & Sub-bar */}
      <div className="bg-[#F2F3F0] border-b border-[#D9DDD8] px-4 py-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif font-black text-base text-[#252A27]">
                  Ressources Humaines & Pointage
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                  {employees.length} collaborateurs &bull; {clockedInCount} en service
                </span>
              </div>
              <p className="text-[11px] text-[#555D58]">
                Planning des shifts, pointage en temps réel et bulletins de paie
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white p-0.5 rounded-xl border border-[#D9DDD8] flex space-x-1">
              <button
                onClick={() => { setActiveTab('team'); setCurrentSubTab('team'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'team' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Équipe ({employees.length})
              </button>
              <button
                onClick={() => { setActiveTab('shifts'); setCurrentSubTab('shifts'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'shifts' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Planning ({shifts.length})
              </button>
              <button
                onClick={() => { setActiveTab('attendance'); setCurrentSubTab('attendance'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'attendance' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Pointage ({attendances.length})
              </button>
              <button
                onClick={() => { setActiveTab('payroll'); setCurrentSubTab('payroll'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'payroll' ? 'bg-[#252A27] text-white shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                Paie ({payrolls.length})
              </button>
            </div>

            {activeTab === 'team' && (
              <button
                onClick={openCreateEmployeeModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter Employé</span>
              </button>
            )}

            {activeTab === 'shifts' && (
              <button
                onClick={openCreateShiftModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Shift</span>
              </button>
            )}

            {activeTab === 'payroll' && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={openRetroPayrollModal}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all border border-amber-300 shadow-2xs"
                  title="Saisir un bulletin de paie historique / papier"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Saisie Historique</span>
                </button>
                <button
                  onClick={handleGeneratePayroll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Calculer Mois</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sub-search bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8]/60">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, rôle, date..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>
        </div>
      </div>

      {/* Master-Detail Split Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Master List */}
        <div className="w-full lg:w-3/5 border-r border-[#D9DDD8] overflow-y-auto bg-white divide-y divide-[#ECEEEA]">
          {activeTab === 'team' && (
            filteredEmployees.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun employé trouvé</div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmployee?.id === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setCurrentRecordId(emp.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center font-bold text-xs text-[#252A27] shrink-0">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27] truncate">{emp.name}</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8] shrink-0 uppercase">
                            {emp.role}
                          </span>
                          {!emp.active && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Désactivé
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5 truncate">
                          Taux: {emp.hourlyRate} DT / h &bull; PIN: **** &bull; {emp.phone || emp.email || 'Sans contact'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEmployeeModal(emp);
                        }}
                        className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                        title="Modifier l'employé"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmployee(emp);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                        title="Désactiver l'employé"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'shifts' && (
            filteredShifts.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun shift planifié</div>
            ) : (
              filteredShifts.map(shf => {
                const isSelected = selectedShift?.id === shf.id;
                return (
                  <div
                    key={shf.id}
                    onClick={() => {
                      setSelectedShift(shf);
                      setCurrentRecordId(shf.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#252A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{shf.employeeName}</h4>
                          <span className="text-[10px] font-bold text-[#555D58]">&bull; {shf.date}</span>
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          {shf.startTime} - {shf.endTime} &bull; Poste: {shf.role} {shf.notes ? `("${shf.notes}")` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditShiftModal(shf);
                        }}
                        className="p-1 rounded-lg hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors"
                        title="Modifier le shift"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShift(shf);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                        title="Supprimer le shift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'attendance' && (
            filteredAttendances.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun pointage enregistré</div>
            ) : (
              filteredAttendances.map(att => {
                const isSelected = selectedAttendance?.id === att.id;
                const isCurrent = att.status === 'active' || !(att as any).clockOutTime;
                return (
                  <div
                    key={att.id}
                    onClick={() => {
                      setSelectedAttendance(att);
                      setCurrentRecordId(att.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isCurrent ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-[#F2F3F0] border-[#D9DDD8] text-[#252A27]'
                      }`}>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{att.employeeName}</h4>
                          <span className="text-[10px] font-bold text-[#555D58]">&bull; {att.date}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                              En service
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          Arrivée: {att.clockInTime?.slice(11, 16) || (att as any).clockIn || '08:00'} &bull; Départ: {att.clockOutTime?.slice(11, 16) || (att as any).clockOut || 'En cours'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-[#252A27] block">
                        {att.totalHoursWorked ? `${att.totalHoursWorked.toFixed(2)} h` : (att as any).totalHours ? `${(att as any).totalHours.toFixed(2)} h` : 'En cours'}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'payroll' && (
            filteredPayrolls.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#555D58]">Aucun bulletin de paie généré</div>
            ) : (
              filteredPayrolls.map(pay => {
                const isSelected = selectedPayroll?.id === pay.id;
                const attach = pay.attachmentUrl;
                const isPaid = pay.paymentStatus === 'paid';
                return (
                  <div
                    key={pay.id}
                    onClick={() => {
                      setSelectedPayroll(pay);
                      setCurrentRecordId(pay.id, { replace: true });
                    }}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F2F3F0] border border-[#D9DDD8] flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4 text-[#252A27]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-[#252A27]">{pay.employeeName}</h4>
                          <span className="text-[10px] font-bold text-[#555D58]">&bull; {pay.periodMonth || (pay as any).period}</span>
                          <SoftDeleteBadge isRetroactive={pay.isRetroactive} cancelled={pay.cancelled} cancelReason={pay.cancelReason} />
                          {attach && <AttachmentViewer url={attach} filename={`bulletin_${pay.employeeName}`} variant="button" />}
                        </div>
                        <p className="text-[11px] text-[#555D58] mt-0.5">
                          Brut: {(pay.grossSalary || 0).toFixed(3)} DT &bull; Heures: {pay.regularHours || (pay as any).totalHoursWorked || 151.67} h
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#252A27] block">
                          {(pay.netSalary || 0).toFixed(3)} DT Net
                        </span>
                        <span className={`text-[9px] font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
                          {isPaid ? 'Réglé' : 'En attente'}
                        </span>
                      </div>

                      {!pay.cancelled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelPayroll(pay);
                          }}
                          className="p-1 rounded-lg hover:bg-rose-100 text-[#555D58] hover:text-rose-700 transition-colors"
                          title="Annuler ce bulletin"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Detail Inspector (Right Side) */}
        <div className="hidden lg:flex w-2/5 flex-col bg-[#F2F3F0] overflow-y-auto p-4 space-y-4">
          {activeTab === 'team' && (
            selectedEmployee ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                      Profil Collaborateur
                    </span>
                    <h3 className="font-serif font-black text-base text-[#252A27]">
                      {selectedEmployee.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditEmployeeModal(selectedEmployee)}
                      className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                      title="Modifier l'employé"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(selectedEmployee)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                      title="Désactiver l'employé"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <CopyLinkButton
                      view="hr"
                      subTab="team"
                      id={selectedEmployee.id}
                      iconOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEEA] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Poste</span>
                    <p className="font-semibold text-[#252A27] mt-0.5 uppercase">{selectedEmployee.role}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Taux Horaire</span>
                    <p className="font-mono font-semibold text-[#252A27] mt-0.5">{selectedEmployee.hourlyRate} DT / h</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Téléphone</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedEmployee.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Code PIN</span>
                    <p className="font-mono font-semibold text-[#252A27] mt-0.5">•••• (Actif)</p>
                  </div>
                </div>

                {selectedEmployee.email && (
                  <div className="pt-2 border-t border-[#ECEEEA] text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Email</span>
                    <p className="font-mono text-[#252A27] mt-0.5">{selectedEmployee.email}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un employé.
              </div>
            )
          )}

          {activeTab === 'shifts' && (
            selectedShift ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                      Détail du Shift
                    </span>
                    <h3 className="font-serif font-black text-base text-[#252A27]">
                      {selectedShift.employeeName}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditShiftModal(selectedShift)}
                      className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                      title="Modifier ce shift"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteShift(selectedShift)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                      title="Supprimer ce shift"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <CopyLinkButton
                      view="hr"
                      subTab="shifts"
                      id={selectedShift.id}
                      iconOnly
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1.5">
                  <p><span className="text-[#555D58]">Date:</span> <strong>{selectedShift.date}</strong></p>
                  <p><span className="text-[#555D58]">Créneau:</span> <strong>{selectedShift.startTime} - {selectedShift.endTime}</strong></p>
                  <p><span className="text-[#555D58]">Poste:</span> <strong>{selectedShift.role}</strong></p>
                  <p><span className="text-[#555D58]">Pause:</span> <strong>{selectedShift.breakMinutes || 30} min</strong></p>
                  {selectedShift.notes && (
                    <p className="text-[11px] text-[#555D58] bg-[#F7F7F5] p-2 rounded-lg border border-[#D9DDD8]">
                      Note : "{selectedShift.notes}"
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un shift.
              </div>
            )
          )}

          {activeTab === 'attendance' && (
            selectedAttendance ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                      Relevé de Pointage
                    </span>
                    <h3 className="font-serif font-black text-base text-[#252A27]">
                      {selectedAttendance.employeeName}
                    </h3>
                  </div>
                  <CopyLinkButton
                    view="hr"
                    subTab="attendance"
                    id={selectedAttendance.id}
                    iconOnly
                  />
                </div>
                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1.5">
                  <p><span className="text-[#555D58]">Date:</span> <strong>{selectedAttendance.date}</strong></p>
                  <p><span className="text-[#555D58]">Arrivée:</span> <strong>{selectedAttendance.clockInTime?.slice(11, 16) || (selectedAttendance as any).clockIn}</strong></p>
                  <p><span className="text-[#555D58]">Départ:</span> <strong>{selectedAttendance.clockOutTime?.slice(11, 16) || (selectedAttendance as any).clockOut || 'En service'}</strong></p>
                  <p><span className="text-[#555D58]">Durée:</span> <strong>{selectedAttendance.totalHoursWorked ? `${selectedAttendance.totalHoursWorked.toFixed(2)} h` : (selectedAttendance as any).totalHours ? `${(selectedAttendance as any).totalHours.toFixed(2)} h` : 'En cours'}</strong></p>
                </div>
                {!(selectedAttendance.clockOutTime || (selectedAttendance as any).clockOut) && (
                  <button
                    onClick={() => handleClockOut(selectedAttendance.id)}
                    className="w-full py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors border border-amber-300"
                  >
                    Clôturer ce pointage (Départ)
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un pointage.
              </div>
            )
          )}

          {activeTab === 'payroll' && (
            selectedPayroll ? (
              <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider">
                        Bulletin Simplifié
                      </span>
                      <SoftDeleteBadge isRetroactive={selectedPayroll.isRetroactive} cancelled={selectedPayroll.cancelled} cancelReason={selectedPayroll.cancelReason} />
                    </div>
                    <h3 className="font-serif font-black text-base text-[#252A27] mt-0.5">
                      {selectedPayroll.employeeName}
                    </h3>
                    <span className="text-xs text-[#555D58]">Période : {selectedPayroll.periodMonth || (selectedPayroll as any).period}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-[#252A27]">
                      {(selectedPayroll.netSalary || 0).toFixed(3)} DT
                    </span>
                    <CopyLinkButton
                      view="hr"
                      subTab="payroll"
                      id={selectedPayroll.id}
                      iconOnly
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-1">
                  <p className="flex justify-between">
                    <span className="text-[#555D58]">Heures:</span>
                    <strong>{selectedPayroll.regularHours || (selectedPayroll as any).totalHoursWorked || 151.67} h</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#555D58]">Salaire Brut:</span>
                    <strong>{(selectedPayroll.grossSalary || 0).toFixed(3)} DT</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-[#555D58]">Cotisations & Déductions:</span>
                    <strong>{((selectedPayroll.grossSalary || 0) - (selectedPayroll.netSalary || 0)).toFixed(3)} DT</strong>
                  </p>
                  <p className="flex justify-between pt-1 border-t border-[#ECEEEA] font-bold text-[#252A27]">
                    <span>Net à Payer:</span>
                    <span>{(selectedPayroll.netSalary || 0).toFixed(3)} DT</span>
                  </p>
                </div>

                {/* Attachment */}
                {selectedPayroll.attachmentUrl && (
                  <div className="pt-2 border-t border-[#ECEEEA] flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Fiche de paie jointe</span>
                    <AttachmentViewer
                      url={selectedPayroll.attachmentUrl}
                      filename={`bulletin_${selectedPayroll.employeeName}`}
                      variant="badge"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-[#ECEEEA] space-y-2">
                  {selectedPayroll.paymentStatus !== 'paid' && !selectedPayroll.cancelled && (
                    <button
                      onClick={() => handleMarkPayrollPaid(selectedPayroll)}
                      className="w-full py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors shadow-2xs border border-[#8BCFAE]"
                    >
                      Marquer comme Réglé
                    </button>
                  )}
                  {!selectedPayroll.cancelled && (
                    <button
                      onClick={() => handleCancelPayroll(selectedPayroll)}
                      className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200"
                    >
                      Annuler ce bulletin
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
                Sélectionnez un bulletin pour le détail.
              </div>
            )
          )}
        </div>
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">
                    {editingEmployee ? "Modifier l'Employé" : "Nouvel Employé"}
                  </h3>
                  <p className="text-[11px] text-[#555D58]">Fiche équipe et identifiants caisse</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmpModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Nom & Prénom</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alexandre Dubois"
                  value={empFormData.name}
                  onChange={e => setEmpFormData({ ...empFormData, name: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-[#252A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Poste & Rôle</label>
                  <select
                    value={empFormData.role}
                    onChange={e => setEmpFormData({ ...empFormData, role: e.target.value as any })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    <option value="barista">Chef Barista</option>
                    <option value="cook">Cuisine / Pâtisserie</option>
                    <option value="server">Service Salle</option>
                    <option value="cashier">Caissier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Code PIN Caisse (4 chiffres)</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={empFormData.pin}
                    onChange={e => setEmpFormData({ ...empFormData, pin: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold font-mono text-center text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Taux Horaire Brut (DT / h)</label>
                <input
                  type="number"
                  step="0.5"
                  value={empFormData.hourlyRate}
                  onChange={e => setEmpFormData({ ...empFormData, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="06 00 00 00 00"
                    value={empFormData.phone}
                    onChange={e => setEmpFormData({ ...empFormData, phone: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Email</label>
                  <input
                    type="email"
                    placeholder="alex@cafenoir.fr"
                    value={empFormData.email}
                    onChange={e => setEmpFormData({ ...empFormData, email: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  {editingEmployee ? 'Mettre à jour' : 'Créer Employé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SHIFT MODAL */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">
                {editingShift ? 'Modifier le Shift' : 'Planifier un Shift'}
              </h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Employé</label>
                <select
                  value={shiftFormData.employeeId}
                  onChange={e => setShiftFormData({ ...shiftFormData, employeeId: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Date du Shift</label>
                  <input
                    type="date"
                    required
                    value={shiftFormData.shiftDate}
                    onChange={e => setShiftFormData({ ...shiftFormData, shiftDate: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Rôle affecté</label>
                  <input
                    type="text"
                    value={shiftFormData.role}
                    onChange={e => setShiftFormData({ ...shiftFormData, role: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.startTime}
                    onChange={e => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.endTime}
                    onChange={e => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-center text-[#252A27]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#252A27]">Notes de consigne</label>
                <input
                  type="text"
                  placeholder="Ex: Ouverture de la terrasse"
                  value={shiftFormData.notes}
                  onChange={e => setShiftFormData({ ...shiftFormData, notes: e.target.value })}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  {editingShift ? 'Mettre à jour' : 'Planifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETROACTIVE PAYROLL MODAL */}
      {isRetroPayrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <History className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">Saisie Bulletin de Paie Historique</h3>
                  <p className="text-[11px] text-[#555D58]">Rattrapage fiche de paie papier ou ancien logiciel</p>
                </div>
              </div>
              <button
                onClick={() => setIsRetroPayrollModalOpen(false)}
                className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRetroPayroll} className="space-y-3">
              <RetroactiveDocumentPanel
                value={retroFields}
                onChange={setRetroFields}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Employé</label>
                  <select
                    value={retroPayrollEmpId}
                    onChange={e => setRetroPayrollEmpId(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Période / Mois</label>
                  <input
                    type="month"
                    required
                    value={retroPayrollPeriod}
                    onChange={e => setRetroPayrollPeriod(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Salaire Brut (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retroPayrollGross}
                    onChange={e => setRetroPayrollGross(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#252A27]">Net à Payer (DT)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retroPayrollNet}
                    onChange={e => setRetroPayrollNet(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRetroPayrollModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs"
                >
                  Enregistrer Bulletin Historique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        reasonLabel={confirmDialog.reasonLabel}
        reasonRequired={confirmDialog.reasonRequired}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
