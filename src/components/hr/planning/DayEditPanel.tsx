import React, { useEffect, useState } from 'react';
import { AttendanceStatus, EmployeeRecord, ShiftType } from '../../../types';
import { api } from '../../../services/api';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import {
  ResolvedDay,
  STATUS_META,
  SHIFT_META,
  QUICK_ACTION_STATUSES,
  computeLateMinutes
} from '../../../utils/scheduling';
import { ArrowRight, RotateCcw, Save, CalendarRange, X } from 'lucide-react';

interface DayEditPanelProps {
  employee: EmployeeRecord;
  date: string;
  resolved: ResolvedDay;
  performedBy: string;
  onClose: () => void;
  onSaved: () => void;
  onViewEmployee: () => void;
}

const formatDateFull = (dateStr: string) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const DayEditPanel: React.FC<DayEditPanelProps> = ({ employee, date, resolved, performedBy, onClose, onSaved, onViewEmployee }) => {
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [shift, setShift] = useState<ShiftType | undefined>('matin');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [actualStartTime, setActualStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isRange, setIsRange] = useState(false);
  const [rangeEnd, setRangeEnd] = useState(date);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(resolved.status === 'unconfigured' ? 'present' : resolved.status);
    setShift(resolved.shift || 'matin');
    setStartTime(resolved.startTime || SHIFT_META[resolved.shift || 'matin'].defaultStart);
    setEndTime(resolved.endTime || SHIFT_META[resolved.shift || 'matin'].defaultEnd);
    setActualStartTime(resolved.actualStartTime || '');
    setNotes(resolved.notes || '');
    setIsRange(false);
    setRangeEnd(date);
    setError('');
  }, [employee.id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyShiftDefaults = (next: ShiftType) => {
    setShift(next);
    setStartTime(SHIFT_META[next].defaultStart);
    setEndTime(SHIFT_META[next].defaultEnd);
  };

  const lateMinutes = status === 'late' ? computeLateMinutes(startTime, actualStartTime) : undefined;
  const showTimes = status === 'present' || status === 'absent' || status === 'late';
  const meta = STATUS_META[resolved.status];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        employeeId: employee.id,
        employeeName: employee.name,
        status,
        shift: showTimes ? shift : undefined,
        plannedStartTime: showTimes ? startTime : undefined,
        plannedEndTime: showTimes ? endTime : undefined,
        actualStartTime: status === 'late' ? actualStartTime || undefined : undefined,
        notes: notes || undefined
      };

      if (status === 'leave' && isRange && rangeEnd > date) {
        await api.saveAttendanceRange({ ...payload, startDate: date, endDate: rangeEnd }, performedBy);
      } else {
        await api.saveAttendance({ ...payload, date }, performedBy);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async () => {
    if (!resolved.attendanceRecord) return;
    setSaving(true);
    try {
      if (resolved.attendanceRecord.leaveGroupId) {
        await api.deleteAttendanceGroup(resolved.attendanceRecord.leaveGroupId, performedBy);
      } else {
        await api.deleteAttendance(resolved.attendanceRecord.id, performedBy);
      }
      setConfirmDelete(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  const isMultiDayGroup = !!resolved.attendanceRecord?.leaveGroupId;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[#D9DDD8]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#555D58]">Édition rapide du jour</p>
          <h3 className="font-bold text-sm text-[#252A27]">{employee.name}</h3>
          <p className="text-[11px] text-[#555D58] capitalize">{formatDateFull(date)}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] hover:bg-[#D9DDD8] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Current state banner */}
        <div className={`rounded-xl border px-3 py-2 text-[11px] font-semibold flex items-center gap-2 ${resolved.isException ? 'bg-[#252A27]/5 border-[#252A27]/20 text-[#252A27]' : 'bg-[#F7F7F5] border-[#D9DDD8] text-[#555D58]'}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
          {resolved.status === 'unconfigured' ? (
            <span>Aucun planning récurrent défini pour ce jour de la semaine.</span>
          ) : resolved.isException ? (
            <span>
              Exception ponctuelle{isMultiDayGroup ? ' (période de plusieurs jours)' : ''} — remplace uniquement ce jour, la règle récurrente reste inchangée.
            </span>
          ) : (
            <span>
              Planning récurrent : {resolved.status === 'rest' ? 'Repos habituel' : `${shift ? SHIFT_META[shift].label : ''} ${resolved.startTime || ''}–${resolved.endTime || ''}`}
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#252A27]">Action rapide</label>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_ACTION_STATUSES.map(key => {
              const m = STATUS_META[key];
              const Icon = m.icon;
              const active = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                    active ? m.badge : 'bg-white border-[#D9DDD8] text-[#555D58] hover:bg-[#ECEEEA]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift + times */}
        {showTimes && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#252A27]">
              Shift {status === 'absent' && <span className="font-medium text-[#929A95]">(prévu — conservé pour référence)</span>}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(SHIFT_META) as [ShiftType, typeof SHIFT_META[ShiftType]][]).map(([key, m]) => {
                const Icon = m.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyShiftDefaults(key)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      shift === key ? 'bg-[#252A27] text-[#A4DEC2] border-[#252A27]' : 'bg-white border-[#D9DDD8] text-[#555D58] hover:bg-[#ECEEEA]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${shift === key ? '' : m.color}`} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#555D58]">Début</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#555D58]">Fin</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]" />
              </div>
            </div>
          </div>
        )}

        {/* Retard : heure d'arrivée réelle */}
        {status === 'late' && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#252A27]">Heure d'arrivée réelle</label>
            <input type="time" value={actualStartTime} onChange={e => setActualStartTime(e.target.value)} className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]" />
            {typeof lateMinutes === 'number' && (
              <p className="text-[11px] font-bold text-amber-700">
                {lateMinutes > 0 ? `Retard de ${lateMinutes} min` : 'Pas de retard calculé (arrivée à l’heure ou avant).'}
              </p>
            )}
          </div>
        )}

        {/* Congé : période multi-jours */}
        {status === 'leave' && (
          <div className="space-y-2 bg-violet-50/50 border border-violet-200 rounded-xl p-3">
            <label className="flex items-center gap-2 text-[11px] font-bold text-[#252A27] cursor-pointer">
              <input type="checkbox" checked={isRange} onChange={e => { setIsRange(e.target.checked); if (e.target.checked && rangeEnd < date) setRangeEnd(date); }} />
              <CalendarRange className="w-3.5 h-3.5 text-violet-700" />
              Étendre sur plusieurs jours
            </label>
            {isRange && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555D58]">Du</label>
                  <input type="date" value={date} disabled className="w-full p-2 bg-[#ECEEEA] border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#555D58]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#555D58]">Au</label>
                  <input
                    type="date"
                    min={date}
                    value={rangeEnd}
                    onChange={e => setRangeEnd(e.target.value)}
                    className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-[#252A27]">Note (optionnel)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex : motif, contexte..."
            className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-semibold text-[#252A27]"
          />
        </div>

        {error && <p className="text-[11px] font-semibold text-rose-700">{error}</p>}

        <button onClick={onViewEmployee} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#555D58] hover:text-[#252A27] py-1.5 transition-colors">
          Voir le planning complet de {employee.name.split(' ')[0]}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="border-t border-[#D9DDD8] p-3 space-y-2">
        {resolved.isException && (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#555D58] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isMultiDayGroup ? 'Supprimer toute la période' : 'Revenir au planning récurrent'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black border border-[#8BCFAE] shadow-2xs transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={isMultiDayGroup ? 'Supprimer la période de congé' : "Revenir au planning récurrent"}
        message={
          isMultiDayGroup
            ? `Cette période (à partir du ${resolved.attendanceRecord?.date}) sera entièrement supprimée. Chaque jour concerné redeviendra conforme au planning récurrent de ${employee.name}.`
            : `Le ${formatDateFull(date)} redeviendra conforme au planning récurrent habituel de ${employee.name}.`
        }
        confirmLabel="Confirmer"
        variant="warning"
        onConfirm={handleRevert}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
