import React from 'react';
import { STATUS_META, SHIFT_META, ResolvedStatus } from '../../../utils/scheduling';

const LEGEND_STATUSES: ResolvedStatus[] = ['present', 'absent', 'leave', 'late', 'rest'];

export const PlanningLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-1.5">
        {LEGEND_STATUSES.map(key => {
          const meta = STATUS_META[key];
          return (
            <span key={key} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F7F7F5] border border-[#D9DDD8] text-[#555D58] font-semibold">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="h-4 w-px bg-[#D9DDD8]" />

      <div className="flex items-center gap-1.5">
        {(Object.entries(SHIFT_META) as [keyof typeof SHIFT_META, typeof SHIFT_META[keyof typeof SHIFT_META]][]).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <span key={key} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F7F7F5] border border-[#D9DDD8] text-[#555D58] font-semibold">
              <Icon className={`w-3 h-3 ${meta.color}`} />
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="h-4 w-px bg-[#D9DDD8]" />

      <div className="flex items-center gap-3 text-[#555D58] font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-[#D9DDD8] bg-white" />
          Règle récurrente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative w-2.5 h-2.5 rounded-full bg-[#ECEEEA] border border-[#D9DDD8]">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#252A27] ring-1 ring-white" />
          </span>
          Exception ponctuelle
        </span>
      </div>
    </div>
  );
};
