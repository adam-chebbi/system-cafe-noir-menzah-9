import React from 'react';
import { History, Ban, CheckCircle, Clock } from 'lucide-react';

interface SoftDeleteBadgeProps {
  cancelled?: boolean;
  cancelReason?: string;
  isRetroactive?: boolean;
  status?: string;
  className?: string;
}

export const SoftDeleteBadge: React.FC<SoftDeleteBadgeProps> = ({
  cancelled,
  cancelReason,
  isRetroactive,
  status,
  className = '',
}) => {
  const isCancelled = cancelled || status === 'cancelled';

  if (!isCancelled && !isRetroactive) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {isRetroactive && (
        <span
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold"
          title="Document saisi en mode rétroactif / rattrapage"
        >
          <History className="w-3 h-3 text-amber-700" />
          <span>Historique</span>
        </span>
      )}
      {isCancelled && (
        <span
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold"
          title={cancelReason ? `Annulé : ${cancelReason}` : 'Enregistrement annulé'}
        >
          <Ban className="w-3 h-3 text-rose-700" />
          <span>Annulé</span>
          {cancelReason && <span className="font-normal text-[9px] opacity-80">({cancelReason})</span>}
        </span>
      )}
    </div>
  );
};
