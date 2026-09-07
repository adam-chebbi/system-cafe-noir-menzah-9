import React, { useState } from 'react';
import { EmployeeRecord, RecurringDayRule } from '../../../types';
import { api } from '../../../services/api';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import {
  ResolvedDay,
  WEEKDAY_LABELS_FULL,
  SHIFT_META,
  computeWeeklySummary,
  todayStr
} from '../../../utils/scheduling';
import { CalendarClock, Copy, X, AlertTriangle, BedDouble } from 'lucide-react';

interface EmployeeDetailPanelProps {
  employee: EmployeeRecord;
  employees: EmployeeRecord[];
  resolvedDays: ResolvedDay[];
  activeTemplateDays: RecurringDayRule[] | null;
  performedBy: string;
  onClose: () => void;
  onOpenTemplateEditor: () => void;
  onDuplicated: () => void;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  employees,
  resolvedDays,
  activeTemplateDays,
  performedBy,
  onClose,
  onOpenTemplateEditor,
  onDuplicated
}) => {
  const [duplicateTarget, setDuplicateTarget] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState('');

  const summary = computeWeeklySummary(resolvedDays);
  const otherEmployees = employees.filter(e => e.id !== employee.id && e.active);
  const targetEmployee = employees.find(e => e.id === duplicateTarget);

  const handleDuplicate = async () => {
    if (!targetEmployee) return;
    setDuplicating(true);
    setError('');
    try {
      await api.duplicateScheduleTemplate(
        { fromEmployeeId: employee.id, toEmployeeId: targetEmployee.id, toEmployeeName: targetEmployee.name, effectiveFrom: todayStr() },
        performedBy
      );
      setConfirmDuplicate(false);
      setDuplicateTarget('');
      onDuplicated();
    } catch (err: any) {
      setError(err.message || 'Erreur.');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[#D9DDD8]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center font-bold text-sm text-[#252A27]">
            {employee.photoUrl ? <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" /> : initials(employee.name)}
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#252A27]">{employee.name}</h3>
            <p className="text-[11px] text-[#555D58]">{employee.position}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] hover:bg-[#D9DDD8] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {!activeTemplateDays && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Aucun planning récurrent configuré pour cet employé. Les jours de la grille sont marqués "Non configuré" tant qu'une semaine type n'est pas définie.
          </div>
        )}

        {/* Weekly summary */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58] mb-1.5">Résumé de la semaine affichée</p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
              <p className="text-base font-black text-emerald-800">{summary.workedDays}</p>
              <p className="text-[9.5px] font-bold text-emerald-700">Travaillés</p>
            </div>
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-center">
              <p className="text-base font-black text-slate-700">{summary.restDays}</p>
              <p className="text-[9.5px] font-bold text-slate-600">Repos</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-center">
              <p className="text-base font-black text-rose-800">{summary.absences}</p>
              <p className="text-[9.5px] font-bold text-rose-700">Absences</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-2 text-center">
              <p className="text-base font-black text-violet-800">{summary.leaves}</p>
              <p className="text-[9.5px] font-bold text-violet-700">Congés</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
              <p className="text-base font-black text-amber-800">{summary.lates}</p>
              <p className="text-[9.5px] font-bold text-amber-700">Retards</p>
            </div>
            <div className="bg-[#252A27] rounded-lg p-2 text-center">
              <p className="text-base font-black text-[#A4DEC2]">{summary.plannedHours.toFixed(1)}h</p>
              <p className="text-[9.5px] font-bold text-[#A4DEC2]/80">Prévues</p>
            </div>
          </div>
        </div>

        {/* Recurring template */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Planning récurrent actuel</p>
          </div>
          {activeTemplateDays ? (
            <div className="space-y-1">
              {activeTemplateDays
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map(day => {
                  const ShiftIcon = day.shift ? SHIFT_META[day.shift].icon : BedDouble;
                  return (
                    <div key={day.weekday} className="flex items-center justify-between bg-white border border-[#D9DDD8] rounded-lg px-2.5 py-1.5 text-[11px]">
                      <span className="font-bold text-[#252A27] w-16 shrink-0">{WEEKDAY_LABELS_FULL[day.weekday].slice(0, 3)}</span>
                      {day.worked ? (
                        <span className="flex items-center gap-1.5 text-[#555D58]">
                          <ShiftIcon className={`w-3.5 h-3.5 ${day.shift ? SHIFT_META[day.shift].color : ''}`} />
                          {day.shift ? SHIFT_META[day.shift].label : ''} &bull; {day.startTime}–{day.endTime}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#929A95] italic">
                          <BedDouble className="w-3.5 h-3.5" />
                          Repos récurrent
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="bg-[#F7F7F5] border border-dashed border-[#D9DDD8] rounded-lg p-3 text-center text-[11px] text-[#929A95]">
              Non configuré
            </div>
          )}
        </div>

        {/* Duplicate */}
        {otherEmployees.length > 0 && (
          <div className="bg-white border border-[#D9DDD8] rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-bold text-[#252A27] flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              Dupliquer ce planning vers...
            </p>
            <div className="flex gap-1.5">
              <select
                value={duplicateTarget}
                onChange={e => setDuplicateTarget(e.target.value)}
                disabled={duplicating}
                className="flex-1 min-w-0 p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27] disabled:opacity-60"
              >
                <option value="">-- Choisir un employé --</option>
                {otherEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!duplicateTarget || !activeTemplateDays || duplicating}
                onClick={() => setConfirmDuplicate(true)}
                className="px-3 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#343B37] transition-colors shrink-0"
              >
                {duplicating ? '...' : 'Dupliquer'}
              </button>
            </div>
            {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-[#D9DDD8] p-3">
        <button
          onClick={onOpenTemplateEditor}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-colors shadow-2xs"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Configurer la semaine type
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmDuplicate}
        title="Dupliquer le planning récurrent"
        message={`Le planning type de ${employee.name} sera copié vers ${targetEmployee?.name || ''}, à partir d'aujourd'hui. Son planning récurrent actuel sera remplacé pour les semaines futures (l'historique déjà posé reste inchangé).`}
        confirmLabel="Dupliquer"
        variant="warning"
        onConfirm={handleDuplicate}
        onCancel={() => setConfirmDuplicate(false)}
      />
    </div>
  );
};
