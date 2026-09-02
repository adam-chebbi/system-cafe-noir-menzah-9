import React from 'react';
import { History, Calendar, Hash, Info } from 'lucide-react';
import { AttachmentUpload } from './AttachmentViewer';

export interface RetroactiveFields {
  documentDate: string;
  referenceNumber: string;
  attachmentUrl: string;
  applyToStock: boolean;
  applyToCash: boolean;
  notes: string;
}

interface RetroactiveDocumentPanelProps {
  value: RetroactiveFields;
  onChange: (fields: RetroactiveFields) => void;
  /** Show "apply to stock" checkbox */
  showApplyToStock?: boolean;
  /** Show "apply to cash" checkbox */
  showApplyToCash?: boolean;
  /** Custom label for the apply-to-stock checkbox */
  applyToStockLabel?: string;
  /** Custom label for the apply-to-cash checkbox */
  applyToCashLabel?: string;
}

/**
 * Panneau de saisie rétroactive (mode "document historique").
 * À insérer dans un formulaire existant pour activer le mode rétroactif.
 */
export const RetroactiveDocumentPanel: React.FC<RetroactiveDocumentPanelProps> = ({
  value,
  onChange,
  showApplyToStock = false,
  showApplyToCash = false,
  applyToStockLabel = 'Appliquer également au stock (mouvement d\'entrée)',
  applyToCashLabel = 'Inclure dans les rapports de la période sélectionnée',
}) => {
  const set = (partial: Partial<RetroactiveFields>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
          <History className="w-3.5 h-3.5 text-amber-800" />
        </div>
        <div>
          <p className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Mode Saisie Historique</p>
          <p className="text-[10px] text-amber-700">Ce document provient de votre ancien système ou d'un document papier.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Date réelle du document */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Date réelle du document</span>
          </label>
          <input
            type="date"
            value={value.documentDate}
            onChange={e => set({ documentDate: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-[#252A27] focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Numéro de référence */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>N° de référence / Ticket</span>
          </label>
          <input
            type="text"
            value={value.referenceNumber}
            onChange={e => set({ referenceNumber: e.target.value })}
            placeholder="Ex: FAC-2024-001"
            className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-[#252A27] focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Pièce jointe */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-amber-900">Photo / Scan du document original</label>
        <AttachmentUpload
          value={value.attachmentUrl}
          onChange={url => set({ attachmentUrl: url })}
          label="Photographier ou importer le document"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-amber-900">Notes de rattrapage (optionnel)</label>
        <textarea
          value={value.notes}
          onChange={e => set({ notes: e.target.value })}
          rows={2}
          placeholder="Ex: Document retrouvé dans les archives du mois de mars..."
          className="w-full p-1.5 bg-white border border-amber-200 rounded-lg text-xs text-[#252A27] resize-none focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Impact options */}
      {(showApplyToStock || showApplyToCash) && (
        <div className="pt-1 border-t border-amber-200 space-y-2">
          <p className="text-[10px] font-bold text-amber-800 flex items-center space-x-1">
            <Info className="w-3 h-3" />
            <span>Par défaut, ce document n'a aucun impact automatique sur le stock ou la caisse.</span>
          </p>
          {showApplyToStock && (
            <label className="flex items-start space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={value.applyToStock}
                onChange={e => set({ applyToStock: e.target.checked })}
                className="mt-0.5 rounded"
              />
              <span className="text-[11px] text-amber-900 group-hover:text-amber-700 leading-snug">{applyToStockLabel}</span>
            </label>
          )}
          {showApplyToCash && (
            <label className="flex items-start space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={value.applyToCash}
                onChange={e => set({ applyToCash: e.target.checked })}
                className="mt-0.5 rounded"
              />
              <span className="text-[11px] text-amber-900 group-hover:text-amber-700 leading-snug">{applyToCashLabel}</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
};

/** Default empty state for RetroactiveFields */
export const emptyRetroactiveFields = (): RetroactiveFields => ({
  documentDate: new Date().toISOString().split('T')[0],
  referenceNumber: '',
  attachmentUrl: '',
  applyToStock: false,
  applyToCash: false,
  notes: '',
});
