import React, { useState } from 'react';
import { StockLot } from '../../types';
import { PackageCheck, AlertTriangle, Archive, Settings2 } from 'lucide-react';
import { ZONE_LABELS } from '../../utils/stockZones';

type EnrichedLot = StockLot & { isExpired: boolean; isExpiringSoon: boolean; daysUntilExpiry: number | null };

interface LotsPanelProps {
  lots: EnrichedLot[];
  defaultExpiryAlertLeadDays: number;
  onArchive: (lot: EnrichedLot) => void;
  onUpdateDefaultLeadDays: (days: number) => void;
}

export const LotsPanel: React.FC<LotsPanelProps> = ({ lots, defaultExpiryAlertLeadDays, onArchive, onUpdateDefaultLeadDays }) => {
  const [leadDaysInput, setLeadDaysInput] = useState(defaultExpiryAlertLeadDays);
  const [showSettings, setShowSettings] = useState(false);

  const activeLots = lots.filter(l => l.status === 'active');
  const archivedLots = lots.filter(l => l.status === 'archived');
  const sorted = [...activeLots].sort((a, b) => {
    const rank = (l: EnrichedLot) => l.isExpired ? 0 : l.isExpiringSoon ? 1 : 2;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999);
  });

  const expiredCount = activeLots.filter(l => l.isExpired).length;
  const expiringCount = activeLots.filter(l => l.isExpiringSoon && !l.isExpired).length;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#D9DDD8] p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-4 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-bold text-[#555D58]">Lots actifs</span>
            <span className="font-mono font-bold text-[#252A27]">{activeLots.length}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-rose-800">Périmés</span>
            <span className="font-mono font-bold text-rose-800">{expiredCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-amber-800">Bientôt périmés</span>
            <span className="font-mono font-bold text-amber-800">{expiringCount}</span>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] text-xs font-bold border border-[#D9DDD8] transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Délai d'alerte par défaut</span>
        </button>
      </div>

      {showSettings && (
        <div className="bg-white rounded-2xl border border-[#D9DDD8] p-3.5 shadow-2xs flex items-center gap-2.5">
          <label className="text-xs font-bold text-[#252A27]">
            Alerter par défaut (produits sans délai propre) :
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={leadDaysInput}
            onChange={e => setLeadDaysInput(parseInt(e.target.value) || 0)}
            className="w-16 p-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg font-bold text-center text-xs text-[#252A27]"
          />
          <span className="text-xs text-[#555D58]">jours avant péremption</span>
          <button
            onClick={() => { onUpdateDefaultLeadDays(leadDaysInput); setShowSettings(false); }}
            className="ml-auto px-2.5 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold transition-colors border border-[#8BCFAE]"
          >
            Enregistrer
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#D9DDD8] overflow-hidden shadow-2xs divide-y divide-[#ECEEEA]">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#555D58]">
            Aucun lot actif. Les lots se créent à la réception de stock pour les produits avec suivi de lots activé.
          </div>
        ) : (
          sorted.map(lot => (
            <div key={lot.id} className="p-3 flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  lot.isExpired ? 'bg-rose-50 text-rose-800 border-rose-200' :
                  lot.isExpiringSoon ? 'bg-amber-100 text-amber-900 border-amber-200' :
                  'bg-[#ECEEEA] text-[#252A27] border-[#D9DDD8]'
                }`}>
                  {lot.isExpired || lot.isExpiringSoon ? <AlertTriangle className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="font-bold text-[#252A27]">{lot.ingredientName}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                      {ZONE_LABELS[lot.zone]}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F2F3F0] text-[#555D58] border border-[#D9DDD8]">
                      Lot {lot.lotNumber}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#555D58] mt-0.5">
                    {lot.quantity} {lot.unit}
                    {lot.expirationDate ? (
                      <>
                        {' '}&bull; Péremption : {new Date(lot.expirationDate).toLocaleDateString('fr-FR')}
                        {lot.isExpired ? (
                          <span className="text-rose-800 font-bold"> (périmé depuis {Math.abs(lot.daysUntilExpiry || 0)} j)</span>
                        ) : lot.isExpiringSoon ? (
                          <span className="text-amber-800 font-bold"> (dans {lot.daysUntilExpiry} j)</span>
                        ) : null}
                      </>
                    ) : ' — sans date de péremption'}
                    {lot.notes ? ` — ${lot.notes}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onArchive(lot)}
                className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#555D58] hover:text-[#252A27] transition-colors shrink-0"
                title="Archiver ce lot (consommé / retiré)"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {archivedLots.length > 0 && (
        <details className="bg-white rounded-2xl border border-[#D9DDD8] shadow-2xs p-3">
          <summary className="text-xs font-bold text-[#555D58] cursor-pointer">Lots archivés ({archivedLots.length})</summary>
          <div className="mt-2 divide-y divide-[#ECEEEA]">
            {archivedLots.map(lot => (
              <div key={lot.id} className="py-2 text-xs text-[#555D58] flex items-center justify-between">
                <span>{lot.ingredientName} — Lot {lot.lotNumber} ({lot.quantity} {lot.unit})</span>
                <span className="text-[10px]">{ZONE_LABELS[lot.zone]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
