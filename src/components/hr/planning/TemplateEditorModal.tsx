import React, { useState } from 'react';
import { EmployeeRecord, RecurringDayRule, ShiftType } from '../../../types';
import { api } from '../../../services/api';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { WEEKDAY_LABELS_FULL, SHIFT_META } from '../../../utils/scheduling';
import { CalendarClock, CalendarDays, Check, Sparkles, X } from 'lucide-react';

interface TemplateEditorModalProps {
  employee: EmployeeRecord;
  initialDays: RecurringDayRule[];
  hasExistingTemplate: boolean;
  weekStart: string; // YYYY-MM-DD (Monday) of the currently displayed week
  performedBy: string;
  onClose: () => void;
  onSaved: () => void;
}

type Scope = 'from-date' | 'this-week-only';

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  employee,
  initialDays,
  hasExistingTemplate,
  weekStart,
  performedBy,
  onClose,
  onSaved
}) => {
  const [days, setDays] = useState<RecurringDayRule[]>(() => initialDays.map(d => ({ ...d })));
  const [scope, setScope] = useState<Scope>('from-date');
  const [effectiveFrom, setEffectiveFrom] = useState(weekStart);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateDay = (weekday: number, patch: Partial<RecurringDayRule>) => {
    setDays(prev => prev.map(d => (d.weekday === weekday ? { ...d, ...patch } : d)));
  };

  const toggleWorked = (weekday: number, worked: boolean) => {
    if (worked) {
      const shift: ShiftType = 'matin';
      updateDay(weekday, { worked: true, shift, startTime: SHIFT_META[shift].defaultStart, endTime: SHIFT_META[shift].defaultEnd });
    } else {
      updateDay(weekday, { worked: false, shift: undefined, startTime: undefined, endTime: undefined });
    }
  };

  const setShift = (weekday: number, shift: ShiftType) => {
    updateDay(weekday, { shift, startTime: SHIFT_META[shift].defaultStart, endTime: SHIFT_META[shift].defaultEnd });
  };

  const applyMondayToAll = () => {
    const monday = days.find(d => d.weekday === 0);
    if (!monday) return;
    setDays(prev => prev.map(d => (d.weekday === 0 || d.weekday >= 5 ? d : { ...d, worked: monday.worked, shift: monday.shift, startTime: monday.startTime, endTime: monday.endTime })));
  };

  const requiresConfirm = scope === 'this-week-only' || hasExistingTemplate;

  const doSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (scope === 'this-week-only') {
        await api.applyScheduleWeekOverride({ employeeId: employee.id, employeeName: employee.name, weekStart, days }, performedBy);
      } else {
        await api.saveScheduleTemplate({ employeeId: employee.id, employeeName: employee.name, days, effectiveFrom }, performedBy);
      }
      setConfirmOpen(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresConfirm) {
      setConfirmOpen(true);
    } else {
      doSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-2xl w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1 pb-2.5 border-b border-[#D9DDD8]">
          <div>
            <h3 className="font-bold text-sm text-[#252A27] flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              Configurer la semaine type
            </h3>
            <p className="text-[11px] text-[#555D58]">{employee.name} &bull; {employee.position}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <button
            type="button"
            onClick={applyMondayToAll}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#555D58] hover:text-[#252A27] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8BCFAE]" />
            Copier la règle du lundi sur les jours de semaine (lun-ven)
          </button>

          <div className="space-y-1.5">
            {days
              .slice()
              .sort((a, b) => a.weekday - b.weekday)
              .map(day => (
                <div key={day.weekday} className="bg-white border border-[#D9DDD8] rounded-xl p-2.5 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-2 font-bold text-xs text-[#252A27]">{WEEKDAY_LABELS_FULL[day.weekday]}</div>

                  <div className="col-span-6 sm:col-span-2">
                    <div className="grid grid-cols-2 gap-1 bg-[#F7F7F5] rounded-lg p-0.5 border border-[#D9DDD8]">
                      <button
                        type="button"
                        onClick={() => toggleWorked(day.weekday, true)}
                        className={`py-1.5 rounded-md text-[10px] font-bold transition-colors ${day.worked ? 'bg-[#252A27] text-[#A4DEC2]' : 'text-[#555D58] hover:bg-white'}`}
                      >
                        Travaille
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWorked(day.weekday, false)}
                        className={`py-1.5 rounded-md text-[10px] font-bold transition-colors ${!day.worked ? 'bg-slate-600 text-white' : 'text-[#555D58] hover:bg-white'}`}
                      >
                        Repos
                      </button>
                    </div>
                  </div>

                  {day.worked ? (
                    <>
                      <div className="col-span-6 sm:col-span-3 flex gap-1">
                        {(Object.entries(SHIFT_META) as [ShiftType, typeof SHIFT_META[ShiftType]][]).map(([key, meta]) => {
                          const Icon = meta.icon;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setShift(day.weekday, key)}
                              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold border transition-colors ${
                                day.shift === key ? 'bg-[#A4DEC2]/30 border-[#8BCFAE] text-[#252A27]' : 'bg-white border-[#D9DDD8] text-[#555D58] hover:bg-[#ECEEEA]'
                              }`}
                            >
                              <Icon className={`w-3 h-3 ${day.shift === key ? '' : meta.color}`} />
                              {meta.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="col-span-6 sm:col-span-3 grid grid-cols-2 gap-1">
                        <input
                          type="time"
                          value={day.startTime || ''}
                          onChange={e => updateDay(day.weekday, { startTime: e.target.value })}
                          className="p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-md text-[10.5px] font-semibold text-[#252A27]"
                        />
                        <input
                          type="time"
                          value={day.endTime || ''}
                          onChange={e => updateDay(day.weekday, { endTime: e.target.value })}
                          className="p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-md text-[10.5px] font-semibold text-[#252A27]"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-12 sm:col-span-6 text-[11px] text-[#929A95] italic">Repos récurrent chaque semaine</div>
                  )}
                </div>
              ))}
          </div>

          <div className="bg-white border border-[#D9DDD8] rounded-xl p-3 space-y-2.5">
            <label className="text-[11px] font-bold text-[#252A27] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Portée du changement
            </label>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" checked={scope === 'from-date'} onChange={() => setScope('from-date')} className="mt-0.5" />
                <span className="text-xs text-[#252A27]">
                  <span className="font-bold">À partir de cette date</span>
                  <span className="block text-[11px] text-[#555D58]">Devient la nouvelle règle permanente ; les semaines déjà passées ne sont pas modifiées.</span>
                  {scope === 'from-date' && (
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={e => setEffectiveFrom(e.target.value)}
                      className="mt-1.5 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-md text-xs font-semibold text-[#252A27]"
                    />
                  )}
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" checked={scope === 'this-week-only'} onChange={() => setScope('this-week-only')} className="mt-0.5" />
                <span className="text-xs text-[#252A27]">
                  <span className="font-bold">Cette semaine uniquement</span>
                  <span className="block text-[11px] text-[#555D58]">Exception ponctuelle sur la semaine affichée ; la règle récurrente reste inchangée pour les semaines suivantes.</span>
                </span>
              </label>
            </div>
          </div>

          {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#555D58] hover:bg-[#ECEEEA] transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={scope === 'this-week-only' ? 'Appliquer uniquement à cette semaine ?' : 'Modifier le planning récurrent ?'}
        message={
          scope === 'this-week-only'
            ? `Les jours modifiés de la semaine affichée deviendront des exceptions pour ${employee.name}. Les semaines suivantes continueront de suivre la règle récurrente actuelle.`
            : `La règle récurrente de ${employee.name} sera remplacée à partir du ${effectiveFrom}. Toutes les semaines futures suivront automatiquement ce nouveau planning.`
        }
        confirmLabel="Confirmer"
        variant="warning"
        onConfirm={doSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
