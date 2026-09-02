import React, { useState } from 'react';
import { Link2, Check, Copy } from 'lucide-react';
import { ViewMode } from '../../types';
import { copyLinkToClipboard } from '../../services/router';

interface CopyLinkButtonProps {
  view?: ViewMode;
  subTab?: string | null;
  action?: string | null;
  id?: string | null;
  tableId?: string | null;
  label?: string;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'xs';
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  view,
  subTab,
  action,
  id,
  tableId,
  label = 'Copier le lien',
  className = '',
  iconOnly = false,
  size = 'sm'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const success = await copyLinkToClipboard({
      view,
      subTab,
      action,
      id,
      tableId
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs'
  }[size];

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
          copied
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-white hover:bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border-[#D9DDD8]'
        } ${className}`}
        title={copied ? 'Lien copié dans le presse-papiers !' : label}
        aria-label={label}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Link2 className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded-lg border font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs ${sizeClasses} ${
        copied
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-white hover:bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] border-[#D9DDD8]'
      } ${className}`}
      title="Copier le lien direct vers cet enregistrement"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span className="text-emerald-800 font-bold">Lien copié !</span>
        </>
      ) : (
        <>
          <Link2 className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
