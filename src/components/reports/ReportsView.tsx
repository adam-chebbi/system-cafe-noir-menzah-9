import React, { useEffect, useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { TrendingUp, Download, AlertTriangle, FileText } from 'lucide-react';
import { RapportsTab } from './RapportsTab';
import { ExportsTab } from './ExportsTab';
import { AlertsTab } from './AlertsTab';
import { JournalTab } from './JournalTab';

type MainTab = 'rapports' | 'exports' | 'alerts' | 'journal';

const JOURNAL_CATEGORY_SUBTABS = ['all', 'sales', 'stock', 'finance', 'hr', 'admin'];
const RAPPORTS_PERIOD_SUBTABS = ['today', '7days', '30days', '90days'];

const resolveTab = (currentView: string, currentSubTab: string | null): MainTab => {
  if (currentSubTab === 'exports') return 'exports';
  if (currentSubTab === 'alerts' || currentView === 'alerts') return 'alerts';
  if (currentSubTab === 'journal' || currentView === 'journal' || JOURNAL_CATEGORY_SUBTABS.includes(currentSubTab || '')) return 'journal';
  if (currentSubTab === 'rapports' || RAPPORTS_PERIOD_SUBTABS.includes(currentSubTab || '')) return 'rapports';
  return 'rapports';
};

export const ReportsView: React.FC = () => {
  const { currentView, currentSubTab, setCurrentSubTab } = useSystem();
  const [tab, setTab] = useState<MainTab>(() => resolveTab(currentView, currentSubTab));

  useEffect(() => {
    setTab(resolveTab(currentView, currentSubTab));
  }, [currentView, currentSubTab]);

  const selectTab = (next: MainTab) => {
    setTab(next);
    setCurrentSubTab(next === 'rapports' ? null : next);
  };

  return (
    <main className="min-h-[calc(100vh-3.25rem)] bg-[#F7F7F5] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-[#555D58]">Pilotage</p>
          <h1 className="font-serif text-2xl font-black text-[#252A27]">Rapports, alertes & traçabilité</h1>
          <p className="text-sm text-[#555D58] mt-1">
            Analyse de rentabilité, exports Excel/CSV, alertes opérationnelles et journal d'activité — tout au même endroit.
          </p>
        </header>

        <nav className="flex gap-1 p-1 bg-[#ECEEEA] rounded-xl w-fit">
          {(
            [
              { id: 'rapports', label: 'Rapports', icon: TrendingUp },
              { id: 'exports', label: 'Exports', icon: Download },
              { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
              { id: 'journal', label: "Journal d'activité", icon: FileText }
            ] as { id: MainTab; label: string; icon: React.ElementType }[]
          ).map(item => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                  isActive ? 'bg-[#252A27] text-[#A4DEC2] shadow-xs' : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {tab === 'rapports' && <RapportsTab />}
        {tab === 'exports' && <ExportsTab />}
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'journal' && <JournalTab />}
      </div>
    </main>
  );
};
