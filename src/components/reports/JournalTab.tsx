import React, { useState, useEffect, useRef } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { JournalEntry as JournalLog } from '../../types/index';
import { CopyLinkButton } from '../common/CopyLinkButton';
import {
  FileText,
  Search,
  ShieldCheck,
  Lock
} from 'lucide-react';

export const JournalTab: React.FC = () => {
  const {
    globalVersion,
    currentSubTab,
    setCurrentSubTab,
    currentRecordId,
    setCurrentRecordId,
    showRouteNotification
  } = useSystem();
  const [logs, setLogs] = useState<JournalLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<JournalLog | null>(null);
  const hasValidatedIdRef = useRef(false);

  useEffect(() => {
    if (currentSubTab && currentSubTab !== 'journal') {
      setSelectedCategory(currentSubTab);
    }
  }, [currentSubTab]);

  const loadLogs = async () => {
    try {
      const data = await api.getJournalLogs();
      const safeData = Array.isArray(data) ? data : [];
      setLogs(safeData);

      if (currentRecordId) {
        const found = safeData.find(l => l.id === currentRecordId);
        if (found) {
          setSelectedLog(found);
        } else if (!hasValidatedIdRef.current) {
          showRouteNotification(`L'entrée du journal (ID: "${currentRecordId}") est introuvable.`, 'warning');
          if (safeData.length > 0) setSelectedLog(safeData[0]);
        }
        hasValidatedIdRef.current = true;
      } else if (safeData.length > 0 && !selectedLog) {
        setSelectedLog(safeData[0]);
      }
    } catch (err) {
      console.error('Failed to load journal logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [globalVersion]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const q = (searchQuery || '').toLowerCase();
  const filteredLogs = safeLogs.filter(l => {
    const matchesCat = selectedCategory === 'all' || l.category === selectedCategory;
    const matchesSearch =
      (l.action || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.performedBy || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-13.5rem)] min-h-[420px] flex flex-col overflow-hidden bg-[#F7F7F5] rounded-2xl border border-[#D9DDD8] animate-in fade-in duration-150">
      {/* Top Header & Sub-bar */}
      <div className="bg-[#F2F3F0] border-b border-[#D9DDD8] px-4 py-2.5 shrink-0 rounded-t-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif font-black text-base text-[#252A27]">
                  Journal d'Activité & Traçabilité
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                  {logs.length} événements
                </span>
              </div>
              <p className="text-[11px] text-[#555D58]">
                Date, heure, utilisateur, module et action de chaque opération importante
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-[#555D58] flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D9DDD8]">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              Lecture seule — aucune modification possible
            </span>
          </div>
        </div>

        {/* Filter categories & search */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#D9DDD8]/60 gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'sales', label: 'Ventes' },
              { id: 'stock', label: 'Stock & Pertes' },
              { id: 'finance', label: 'Finances' },
              { id: 'hr', label: 'RH & Présence' },
              { id: 'admin', label: 'Administration' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setCurrentSubTab(c.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedCategory === c.id
                    ? 'bg-[#252A27] text-white'
                    : 'bg-white text-[#555D58] hover:bg-[#ECEEEA] border border-[#D9DDD8]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-[#555D58] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] focus:outline-none focus:border-[#252A27]"
            />
          </div>
        </div>
      </div>

      {/* Master-Detail Split Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Master List (Left) */}
        <div className="w-full lg:w-3/5 border-r border-[#D9DDD8] overflow-y-auto bg-white divide-y divide-[#ECEEEA]">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#555D58]">
              Aucun événement ne correspond à vos filtres.
            </div>
          ) : (
            filteredLogs.map(log => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setCurrentRecordId(log.id, { replace: true });
                  }}
                  className={`p-3 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-[#ECEEEA] border-l-4 border-[#252A27]' : 'hover:bg-[#F7F7F5]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs text-[#252A27] truncate">{log.action}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#F2F3F0] text-[#555D58] border border-[#D9DDD8] uppercase">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#555D58] mt-0.5 line-clamp-1">{log.details}</p>
                    <p className="text-[10px] text-[#555D58]/80 mt-0.5">
                      Par <strong className="text-[#252A27] font-semibold">{log.performedBy}</strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] text-[#555D58] block">
                      {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-mono text-[10px] text-[#555D58]/70 block">
                      {new Date(log.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Inspector (Right) */}
        <div className="hidden lg:flex w-2/5 flex-col bg-[#F2F3F0] overflow-y-auto p-4 space-y-4">
          {selectedLog ? (
            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#555D58] tracking-wider block">
                    Détail de l'Événement
                  </span>
                  <h3 className="font-serif font-black text-base text-[#252A27]">
                    {selectedLog.action}
                  </h3>
                  <span className="text-xs text-[#555D58]">Module : {selectedLog.category}</span>
                </div>
                <CopyLinkButton
                  view="reports"
                  subTab={selectedCategory !== 'all' ? selectedCategory : 'journal'}
                  id={selectedLog.id}
                  iconOnly
                />
              </div>

              <div className="pt-2 border-t border-[#ECEEEA] text-xs space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#555D58] block">Description & Détails</span>
                  <p className="font-medium text-[#252A27] bg-[#F7F7F5] p-2.5 rounded-lg border border-[#D9DDD8] mt-1 text-xs">
                    {selectedLog.details}
                  </p>
                </div>

                {(selectedLog.previousValue || selectedLog.newValue) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#555D58] block">Valeur précédente</span>
                      <p className="text-[#252A27] bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1 text-[11px]">
                        {selectedLog.previousValue || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#555D58] block">Nouvelle valeur</span>
                      <p className="text-[#252A27] bg-emerald-50 border border-emerald-200 p-2 rounded-lg mt-1 text-[11px]">
                        {selectedLog.newValue || '—'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Utilisateur</span>
                    <p className="font-semibold text-[#252A27] mt-0.5">{selectedLog.performedBy}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#555D58]">Date & heure</span>
                    <p className="font-mono text-xs text-[#252A27] mt-0.5">
                      {new Date(selectedLog.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ECEEEA] flex items-center gap-1.5 text-[10px] text-[#555D58]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Entrée immuable — identifiant {selectedLog.id}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#555D58]">
              Sélectionnez une entrée du journal pour inspecter les détails.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
