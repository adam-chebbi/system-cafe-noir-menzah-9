import React, { useEffect, useMemo, useState } from 'react';
import { EmployeeRecord, AttendanceRecord, EmployeeScheduleTemplate } from '../../../types';
import { api } from '../../../services/api';
import { DayCell } from './DayCell';
import { PlanningLegend } from './PlanningLegend';
import { DayEditPanel } from './DayEditPanel';
import { EmployeeDetailPanel } from './EmployeeDetailPanel';
import { TemplateEditorModal } from './TemplateEditorModal';
import {
  startOfWeek,
  addDays,
  toDateStr,
  todayStr,
  resolveDay,
  emptyTemplateDays,
  getActiveTemplate,
  findStaffingGaps,
  unconfiguredEmployees
} from '../../../utils/scheduling';
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarClock, Users } from 'lucide-react';

interface PlanningViewProps {
  employees: EmployeeRecord[];
  performedBy: string;
  onDataChanged: () => void;
}

type PanelState = { type: 'employee'; employeeId: string } | { type: 'day'; employeeId: string; date: string } | null;

const formatShortDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export const PlanningView: React.FC<PlanningViewProps> = ({ employees, performedBy, onDataChanged }) => {
  const activeEmployees = useMemo(() => employees.filter(e => e.active), [employees]);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(todayStr()));
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i))), [weekStart]);
  const weekStartStr = weekDates[0];
  const weekEndStr = weekDates[6];

  const [templates, setTemplates] = useState<EmployeeScheduleTemplate[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [panel, setPanel] = useState<PanelState>(null);
  const [templateEditorEmployeeId, setTemplateEditorEmployeeId] = useState<string>('');
  const [showAlerts, setShowAlerts] = useState(false);

  const loadTemplates = async () => {
    try {
      const data = await api.getScheduleTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load schedule templates:', err);
    }
  };

  const loadAttendances = async () => {
    try {
      const data = await api.getAttendances({ start: weekStartStr, end: weekEndStr });
      setAttendances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartStr, weekEndStr]);

  const refreshAll = () => {
    loadTemplates();
    loadAttendances();
    onDataChanged();
  };

  const handleSaved = () => {
    refreshAll();
  };

  const staffingGaps = useMemo(
    () => findStaffingGaps(activeEmployees, weekDates, templates, attendances),
    [activeEmployees, weekDates, templates, attendances]
  );
  const unconfigured = useMemo(
    () => unconfiguredEmployees(activeEmployees, templates, weekStartStr),
    [activeEmployees, templates, weekStartStr]
  );
  const alertCount = staffingGaps.length + unconfigured.length;

  const panelEmployee = panel ? activeEmployees.find(e => e.id === panel.employeeId) || employees.find(e => e.id === panel.employeeId) : undefined;
  const templateEditorEmployee = employees.find(e => e.id === templateEditorEmployeeId);

  const activeTemplateForEditor = templateEditorEmployee
    ? getActiveTemplate(templates, templateEditorEmployee.id, weekStartStr)
    : undefined;

  const activeTemplateForPanel = panelEmployee ? getActiveTemplate(templates, panelEmployee.id, weekStartStr) : undefined;

  const panelEmployeeResolvedWeek = panelEmployee
    ? weekDates.map(date => resolveDay(panelEmployee.id, date, templates, attendances))
    : [];

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-[#D9DDD8] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] transition-colors" title="Semaine précédente">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-[#252A27] min-w-[170px] text-center">
              Semaine du {formatShortDate(addDays(weekStart, 0))} au {formatShortDate(addDays(weekStart, 6))}
            </div>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] transition-colors" title="Semaine suivante">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(todayStr()))}
              className="text-xs font-bold text-[#555D58] hover:text-[#252A27] px-2.5 py-1.5 rounded-lg hover:bg-[#ECEEEA] transition-colors"
            >
              Aujourd'hui
            </button>
          </div>

          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAlerts(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {alertCount} alerte{alertCount > 1 ? 's' : ''}
                </button>
                {showAlerts && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white border border-[#D9DDD8] rounded-xl shadow-xl z-30 p-2.5 space-y-1.5">
                    {staffingGaps.map(gap => (
                      <p key={gap.date} className="text-[11px] text-[#252A27] flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>{gap.date}</strong> — {gap.reason}</span>
                      </p>
                    ))}
                    {unconfigured.map(emp => (
                      <p key={emp.id} className="text-[11px] text-[#252A27] flex items-start gap-1.5">
                        <Users className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>{emp.name}</strong> — planning non configuré</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <select
                value=""
                onChange={e => { if (e.target.value) setTemplateEditorEmployeeId(e.target.value); }}
                className="appearance-none pl-8 pr-3 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold cursor-pointer hover:bg-[#343B37] transition-colors"
              >
                <option value="">Configurer la semaine type</option>
                {activeEmployees.map(e => (
                  <option key={e.id} value={e.id} className="bg-white text-[#252A27]">{e.name}</option>
                ))}
              </select>
              <CalendarClock className="w-3.5 h-3.5 text-[#A4DEC2] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <PlanningLegend />
      </div>

      {/* Grid */}
      {activeEmployees.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D9DDD8] rounded-2xl p-10 text-center text-sm text-[#555D58]">
          Ajoutez un employé actif dans l'onglet Employés pour commencer à planifier.
        </div>
      ) : (
        <div className="bg-white border border-[#D9DDD8] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[#F2F3F0]">
                  <th className="sticky left-0 bg-[#F2F3F0] text-left p-3 font-bold text-[#252A27] border-b border-[#D9DDD8] min-w-[170px]">Employé</th>
                  {weekDates.map(dateStr => {
                    const isToday = dateStr === todayStr();
                    const date = new Date(`${dateStr}T12:00:00`);
                    return (
                      <th key={dateStr} className={`p-2.5 text-center border-b border-[#D9DDD8] min-w-[112px] ${isToday ? 'bg-[#A4DEC2]/20' : ''}`}>
                        <p className="font-bold text-[#252A27]">{date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</p>
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
                      <button
                        onClick={() => setPanel({ type: 'employee', employeeId: employee.id })}
                        className={`text-left group ${panel?.employeeId === employee.id ? 'text-[#252A27]' : ''}`}
                      >
                        <p className="font-bold text-[#252A27] group-hover:underline underline-offset-2">{employee.name}</p>
                        <p className="text-[11px] text-[#555D58]">{employee.position}</p>
                      </button>
                    </td>
                    {weekDates.map(dateStr => {
                      const resolved = resolveDay(employee.id, dateStr, templates, attendances);
                      const isSelected = panel?.type === 'day' && panel.employeeId === employee.id && panel.date === dateStr;
                      return (
                        <td key={dateStr} className="p-1.5 text-center align-top">
                          <DayCell
                            resolved={resolved}
                            isToday={dateStr === todayStr()}
                            isSelected={isSelected}
                            onClick={() => setPanel({ type: 'day', employeeId: employee.id, date: dateStr })}
                          />
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

      {/* Side panel: day quick-edit or employee detail */}
      {panel && panelEmployee && (
        <div className="fixed top-[3.25rem] right-0 bottom-0 w-full sm:w-[400px] bg-white border-l border-[#D9DDD8] shadow-2xl z-40 animate-in slide-in-from-right duration-200">
          {panel.type === 'day' ? (
            <DayEditPanel
              employee={panelEmployee}
              date={panel.date}
              resolved={resolveDay(panelEmployee.id, panel.date, templates, attendances)}
              performedBy={performedBy}
              onClose={() => setPanel(null)}
              onSaved={handleSaved}
              onViewEmployee={() => setPanel({ type: 'employee', employeeId: panelEmployee.id })}
            />
          ) : (
            <EmployeeDetailPanel
              employee={panelEmployee}
              employees={employees}
              resolvedDays={panelEmployeeResolvedWeek}
              activeTemplateDays={activeTemplateForPanel ? activeTemplateForPanel.days : null}
              performedBy={performedBy}
              onClose={() => setPanel(null)}
              onOpenTemplateEditor={() => setTemplateEditorEmployeeId(panelEmployee.id)}
              onDuplicated={refreshAll}
            />
          )}
        </div>
      )}

      {/* Template editor modal */}
      {templateEditorEmployee && (
        <TemplateEditorModal
          employee={templateEditorEmployee}
          initialDays={activeTemplateForEditor ? activeTemplateForEditor.days : emptyTemplateDays()}
          hasExistingTemplate={!!activeTemplateForEditor}
          weekStart={weekStartStr}
          performedBy={performedBy}
          onClose={() => setTemplateEditorEmployeeId('')}
          onSaved={() => {
            setTemplateEditorEmployeeId('');
            refreshAll();
          }}
        />
      )}
    </section>
  );
};
