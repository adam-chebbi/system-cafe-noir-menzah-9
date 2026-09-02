import React from 'react';
import { AlertTriangle, Trash2, X, CheckCircle2 } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Optional: extra detail input (e.g. cancellation reason) */
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  reasonLabel,
  reasonRequired = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reasonRequired && !reason.trim()) return;
    onConfirm(reason.trim() || undefined);
  };

  const variantStyles: Record<ConfirmVariant, { icon: React.ReactNode; btn: string; bg: string }> = {
    danger: {
      icon: <Trash2 className="w-5 h-5 text-rose-700" />,
      btn: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700',
      bg: 'bg-rose-50 border-rose-200',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-700" />,
      btn: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
    info: {
      icon: <CheckCircle2 className="w-5 h-5 text-[#252A27]" />,
      btn: 'bg-[#252A27] hover:bg-[#1a1f1c] text-white border-[#252A27]',
      bg: 'bg-[#F2F3F0] border-[#D9DDD8]',
    },
  };

  const { icon, btn, bg } = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D9DDD8] w-full max-w-sm animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
              {icon}
            </div>
            <h3 className="font-bold text-sm text-[#252A27]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-[#555D58] hover:bg-[#ECEEEA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-4">
          <p className="text-xs text-[#555D58] leading-relaxed">{message}</p>

          {reasonLabel && (
            <div className="mt-3 space-y-1">
              <label className="text-[11px] font-bold text-[#252A27]">
                {reasonLabel}
                {reasonRequired && <span className="text-rose-600 ml-0.5">*</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Motif requis..."
                className="w-full p-2 text-xs bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-[#252A27] resize-none focus:outline-none focus:border-[#252A27]"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-[#ECEEEA] hover:bg-[#D9DDD8] text-xs font-bold text-[#252A27] border border-[#D9DDD8] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={reasonRequired && !reason.trim()}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
