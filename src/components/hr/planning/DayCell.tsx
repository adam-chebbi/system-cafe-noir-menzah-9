import React from 'react';
import { ResolvedDay, STATUS_META, SHIFT_META } from '../../../utils/scheduling';

interface DayCellProps {
  resolved: ResolvedDay;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * One employee×date grid cell. Visually distinguishes three states:
 * - Non configuré : placeholder pointillé, invite à configurer la semaine type.
 * - Règle récurrente (pas d'exception) : style discret (contour léger), montre le shift/horaire prévu.
 * - Exception ponctuelle : badge de statut plein + pastille "exception" dans le coin, pour sauter aux yeux.
 */
export const DayCell: React.FC<DayCellProps> = ({ resolved, isToday, isSelected, onClick }) => {
  const meta = STATUS_META[resolved.status];
  const StatusIcon = meta.icon;
  const ShiftIcon = resolved.shift ? SHIFT_META[resolved.shift].icon : null;

  const isPlainRecurringWork = !resolved.isException && resolved.status === 'present';
  const isPlainRecurringRest = !resolved.isException && resolved.status === 'rest';
  const isUnconfigured = resolved.status === 'unconfigured';

  const badgeClass = isUnconfigured
    ? 'bg-[#F7F7F5] border-dashed border-[#D9DDD8] text-[#9AA39C] hover:border-[#252A27] hover:text-[#252A27]'
    : isPlainRecurringWork || isPlainRecurringRest
    ? `${meta.badgeSoft} hover:brightness-95`
    : `${meta.badge} hover:brightness-95`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full min-h-[52px] rounded-lg border px-1.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${badgeClass} ${
        isSelected ? 'ring-2 ring-[#252A27] ring-offset-1' : ''
      } ${isToday ? 'shadow-2xs' : ''}`}
    >
      {resolved.isException && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#252A27] ring-2 ring-white"
          title="Exception ponctuelle (dérogation au planning récurrent)"
        />
      )}

      {isUnconfigured ? (
        <span>+ Configurer</span>
      ) : (
        <>
          <span className="flex items-center justify-center gap-1">
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span>{meta.label}</span>
          </span>
          {resolved.shift && resolved.status !== 'rest' && (
            <span className="flex items-center justify-center gap-0.5 font-normal text-[10px] mt-0.5 opacity-90">
              {ShiftIcon && <ShiftIcon className="w-2.5 h-2.5 shrink-0" />}
              <span>
                {resolved.startTime || '—'}–{resolved.endTime || '—'}
              </span>
            </span>
          )}
          {resolved.status === 'late' && resolved.actualStartTime && (
            <span className="block font-normal text-[9.5px] mt-0.5 opacity-90">
              Arrivée {resolved.actualStartTime}
              {typeof resolved.lateMinutes === 'number' && resolved.lateMinutes > 0 && ` (+${resolved.lateMinutes}min)`}
            </span>
          )}
          {isPlainRecurringRest && <span className="block font-normal text-[9.5px] mt-0.5 opacity-70">récurrent</span>}
        </>
      )}
    </button>
  );
};
