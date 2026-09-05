import React, { useEffect, useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { SystemAlert } from '../../types';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Check,
  Undo2,
  Settings2,
  ExternalLink
} from 'lucide-react';

const SEVERITY_META: Record<SystemAlert['severity'], { label: string; badge: string; icon: React.ElementType }> = {
  critical: { label: 'Critique', badge: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertCircle },
  warning: { label: 'Attention', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  info: { label: 'Info', badge: 'bg-sky-100 text-sky-800 border-sky-200', icon: Info },
  success: { label: 'OK', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 }
};

const LINK_VIEW_MAP: Record<string, string> = {
  '/stock': 'stock',
  '/suppliers': 'suppliers',
  '/products': 'products'
};

export const AlertsTab: React.FC = () => {
  const { navigateTo, showRouteNotification, triggerGlobalRefresh } = useSystem();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTreated, setShowTreated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<number>(20);

  const load = async () => {
    try {
      setLoading(true);
      const [alertsData, settings] = await Promise.all([api.getAlerts(), api.getSettings()]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setThresholdInput(settings.significantDiscrepancyThresholdDT);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const untreated = alerts.filter(a => !a.read);
  const treated = alerts.filter(a => a.read);
  const visibleAlerts = showTreated ? alerts : untreated;

  const handleDismiss = async (alert: SystemAlert) => {
    try {
      await api.markAlertRead(alert.id);
      setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  const handleRestore = async (alert: SystemAlert) => {
    try {
      await api.restoreAlert(alert.id);
      setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, read: false } : a)));
      triggerGlobalRefresh();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      triggerGlobalRefresh();
      showRouteNotification('Toutes les alertes ont été marquées comme traitées.', 'success');
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  const handleSaveThreshold = async () => {
    try {
      await api.updateSettings({ significantDiscrepancyThresholdDT: thresholdInput }, 'Administrateur');
      showRouteNotification('Seuil mis à jour.', 'success');
      load();
    } catch (err: any) {
      showRouteNotification(err.message || 'Erreur.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#252A27] border-t-[#A4DEC2] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#252A27]">
            Alertes opérationnelles {untreated.length > 0 && <span className="text-rose-700">({untreated.length})</span>}
          </h2>
          <p className="text-xs text-[#555D58] mt-1">
            Stock bas, ruptures, péremptions, factures OCR à vérifier, échéances fournisseurs, écarts d'inventaire et marges sous objectif — calculées en direct, sans notification externe.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] text-xs font-bold border border-[#D9DDD8] transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Seuils</span>
          </button>
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#555D58]">
            <input type="checkbox" checked={showTreated} onChange={e => setShowTreated(e.target.checked)} />
            Afficher les alertes traitées ({treated.length})
          </label>
          {untreated.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tout marquer traité</span>
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 shadow-2xs flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-[#252A27]">
            Écart d'inventaire jugé "significatif" à partir de :
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={thresholdInput}
            onChange={e => setThresholdInput(parseFloat(e.target.value) || 0)}
            className="w-24 p-2 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
          />
          <span className="text-xs text-[#555D58]">DT</span>
          <button
            onClick={handleSaveThreshold}
            className="px-3 py-1.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors"
          >
            Enregistrer
          </button>
        </div>
      )}

      {visibleAlerts.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-700" />
          <p className="text-sm font-bold text-emerald-900">Toutes les opérations sont conformes.</p>
          <p className="text-xs text-emerald-800 mt-1">Aucune alerte active pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleAlerts.map(alert => {
            const meta = SEVERITY_META[alert.severity];
            const Icon = meta.icon;
            const targetView = alert.linkUrl ? LINK_VIEW_MAP[alert.linkUrl] : undefined;
            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-2xl p-4 flex items-start gap-3 shadow-2xs ${alert.read ? 'opacity-60 border-[#D9DDD8]' : 'border-[#D9DDD8]'}`}
              >
                <div className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${meta.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-[#252A27]">{alert.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>{meta.label}</span>
                    {alert.read && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Traitée
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#555D58] mt-1">{alert.message}</p>
                  {targetView && (
                    <button
                      onClick={() => navigateTo(targetView as any)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#252A27] hover:underline mt-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ouvrir le module concerné
                    </button>
                  )}
                </div>
                <div className="shrink-0">
                  {alert.read ? (
                    <button
                      onClick={() => handleRestore(alert)}
                      className="p-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] transition-colors"
                      title="Remettre en attente"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDismiss(alert)}
                      className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                      title="Marquer comme traitée"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
