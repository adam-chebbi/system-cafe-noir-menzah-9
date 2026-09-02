import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, SystemAlert, CashRegisterSession } from '../types/index';
import { api } from '../services/api';
import { parseCurrentUrl, pushRoute, replaceRoute, buildUrl, copyLinkToClipboard, RouteState } from '../services/router';

export interface RouteNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface SystemContextType {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode, options?: { replace?: boolean }) => void;
  currentSubTab: string | null;
  setCurrentSubTab: (subTab: string | null, options?: { replace?: boolean }) => void;
  currentAction: string | null;
  setCurrentAction: (action: string | null, options?: { replace?: boolean }) => void;
  currentRecordId: string | null;
  setCurrentRecordId: (id: string | null, options?: { replace?: boolean }) => void;
  navigateTo: (
    view: ViewMode,
    subTab?: string | null,
    action?: string | null,
    metadataOrId?: string | { id?: string; tableId?: string; [key: string]: any } | null,
    options?: { replace?: boolean }
  ) => void;
  navigateBackToRoot: () => void;
  closeRecordModal: () => void;
  clearSubTabAction: () => void;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  toggleLauncher: () => void;
  alerts: SystemAlert[];
  unreadAlertsCount: number;
  pendingOrdersCount: number;
  refreshAlerts: () => Promise<void>;
  activeRegister: CashRegisterSession | null;
  refreshRegister: () => Promise<void>;
  globalVersion: number;
  triggerGlobalRefresh: () => void;
  activeQrTableId: string | null;
  setActiveQrTableId: (id: string | null) => void;
  playOrderChime: () => void;
  generateUrl: (params?: Partial<RouteState>, fullOrigin?: boolean) => string;
  copyCurrentLink: (params?: Partial<RouteState>) => Promise<boolean>;
  routeNotification: RouteNotification | null;
  showRouteNotification: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => void;
  clearRouteNotification: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Parse initial route state from current URL
  const initialRoute = parseCurrentUrl();

  const [currentView, setCurrentViewState] = useState<ViewMode>(initialRoute.view);
  const [currentSubTab, setCurrentSubTabState] = useState<string | null>(initialRoute.subTab || null);
  const [currentAction, setCurrentActionState] = useState<string | null>(initialRoute.action || null);
  const [currentRecordId, setCurrentRecordIdState] = useState<string | null>(initialRoute.id || null);
  const [activeQrTableId, setActiveQrTableIdState] = useState<string | null>(initialRoute.tableId || null);

  const [launcherOpen, setLauncherOpen] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [activeRegister, setActiveRegister] = useState<CashRegisterSession | null>(null);
  const [globalVersion, setGlobalVersion] = useState<number>(1);
  const [routeNotification, setRouteNotification] = useState<RouteNotification | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Normalize initial URL if legacy hash or table param was used
  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && Boolean(window.location.hash);
    const hasRawTableOnly = typeof window !== 'undefined' &&
      Boolean(new URLSearchParams(window.location.search).get('table')) &&
      !new URLSearchParams(window.location.search).get('view');

    if (hasHash || hasRawTableOnly) {
      replaceRoute({
        view: initialRoute.view,
        subTab: initialRoute.subTab,
        action: initialRoute.action,
        id: initialRoute.id,
        tableId: initialRoute.tableId
      });
    }
  }, []);

  const showRouteNotification = useCallback((message: string, type: 'info' | 'warning' | 'error' | 'success' = 'warning') => {
    const notif: RouteNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type
    };
    setRouteNotification(notif);
    setTimeout(() => {
      setRouteNotification(prev => (prev?.id === notif.id ? null : prev));
    }, 4000);
  }, []);

  const clearRouteNotification = useCallback(() => {
    setRouteNotification(null);
  }, []);

  // Update browser history and state synchronously
  const syncRoute = (state: RouteState, replace = false) => {
    if (replace) {
      replaceRoute(state);
    } else {
      pushRoute(state);
    }
  };

  const setCurrentView = (view: ViewMode, options?: { replace?: boolean }) => {
    setCurrentViewState(view);
    setCurrentSubTabState(null);
    setCurrentActionState(null);
    setCurrentRecordIdState(null);
    setLauncherOpen(false);

    syncRoute({
      view,
      subTab: null,
      action: null,
      id: null,
      tableId: view === 'qr_customer_order' ? activeQrTableId : null
    }, options?.replace);
  };

  const setCurrentSubTab = (subTab: string | null, options?: { replace?: boolean }) => {
    setCurrentSubTabState(subTab);
    syncRoute({
      view: currentView,
      subTab,
      action: currentAction,
      id: currentRecordId,
      tableId: activeQrTableId
    }, options?.replace);
  };

  const setCurrentAction = (action: string | null, options?: { replace?: boolean }) => {
    setCurrentActionState(action);
    syncRoute({
      view: currentView,
      subTab: currentSubTab,
      action,
      id: currentRecordId,
      tableId: activeQrTableId
    }, options?.replace);
  };

  const setCurrentRecordId = (id: string | null, options?: { replace?: boolean }) => {
    setCurrentRecordIdState(id);
    syncRoute({
      view: currentView,
      subTab: currentSubTab,
      action: currentAction,
      id,
      tableId: activeQrTableId
    }, options?.replace);
  };

  const setActiveQrTableId = (id: string | null) => {
    setActiveQrTableIdState(id);
    if (currentView === 'qr_customer_order') {
      syncRoute({
        view: 'qr_customer_order',
        subTab: null,
        action: null,
        id,
        tableId: id
      }, true);
    }
  };

  const navigateTo = (
    view: ViewMode,
    subTab?: string | null,
    action?: string | null,
    metadataOrId?: string | { id?: string; tableId?: string; [key: string]: any } | null,
    options?: { replace?: boolean }
  ) => {
    let recId: string | null = null;
    let tblId: string | null = activeQrTableId;

    if (typeof metadataOrId === 'string') {
      recId = metadataOrId;
      if (view === 'qr_customer_order') {
        tblId = metadataOrId;
      }
    } else if (metadataOrId && typeof metadataOrId === 'object') {
      if (metadataOrId.id) recId = metadataOrId.id;
      if (metadataOrId.tableId) tblId = metadataOrId.tableId;
    }

    setCurrentViewState(view);
    setCurrentSubTabState(subTab || null);
    setCurrentActionState(action || null);
    setCurrentRecordIdState(recId);
    if (view === 'qr_customer_order' && tblId) {
      setActiveQrTableIdState(tblId);
    }
    setLauncherOpen(false);

    syncRoute({
      view,
      subTab: subTab || null,
      action: action || null,
      id: recId,
      tableId: view === 'qr_customer_order' ? (tblId || recId) : tblId
    }, options?.replace);
  };

  const clearSubTabAction = () => {
    setCurrentSubTabState(null);
    setCurrentActionState(null);
    setCurrentRecordIdState(null);
    syncRoute({
      view: currentView,
      subTab: null,
      action: null,
      id: null,
      tableId: activeQrTableId
    }, true);
  };

  const toggleLauncher = () => setLauncherOpen(prev => !prev);

  const triggerGlobalRefresh = useCallback(() => {
    setGlobalVersion(v => v + 1);
  }, []);

  const playOrderChime = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (_) {}
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const [alertsData, ordersData] = await Promise.all([
        api.getAlerts(),
        api.getOrders({ status: 'pending_approval' })
      ]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);

      const newPendingCount = Array.isArray(ordersData) ? ordersData.length : 0;
      if (!isInitialLoadRef.current && newPendingCount > pendingOrdersCount) {
        playOrderChime();
      }
      isInitialLoadRef.current = false;
      setPendingOrdersCount(newPendingCount);
    } catch (err) {
      console.error('Failed to refresh alerts/orders:', err);
      setAlerts([]);
      setPendingOrdersCount(0);
    }
  }, [pendingOrdersCount, playOrderChime]);

  const refreshRegister = useCallback(async () => {
    try {
      const reg = await api.getActiveRegister();
      setActiveRegister(reg || null);
    } catch (err) {
      console.error('Failed to load register:', err);
    }
  }, []);

  // Listen to browser Back / Forward buttons (popstate) and hash changes
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentUrl();
      setCurrentViewState(route.view);
      setCurrentSubTabState(route.subTab || null);
      setCurrentActionState(route.action || null);
      setCurrentRecordIdState(route.id || null);
      if (route.tableId) {
        setActiveQrTableIdState(route.tableId);
      }
      setLauncherOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Background polling for alerts
  useEffect(() => {
    refreshAlerts();
    refreshRegister();

    const interval = setInterval(() => {
      refreshAlerts();
    }, 6000);

    return () => clearInterval(interval);
  }, [refreshAlerts, refreshRegister, globalVersion]);

  const generateUrl = useCallback((params?: Partial<RouteState>, fullOrigin = false): string => {
    return buildUrl({
      view: params?.view || currentView,
      subTab: params?.subTab !== undefined ? params.subTab : currentSubTab,
      action: params?.action !== undefined ? params.action : currentAction,
      id: params?.id !== undefined ? params.id : currentRecordId,
      tableId: params?.tableId !== undefined ? params.tableId : activeQrTableId
    }, fullOrigin);
  }, [currentView, currentSubTab, currentAction, currentRecordId, activeQrTableId]);

  const copyCurrentLink = useCallback(async (params?: Partial<RouteState>): Promise<boolean> => {
    return copyLinkToClipboard({
      view: params?.view || currentView,
      subTab: params?.subTab !== undefined ? params.subTab : currentSubTab,
      action: params?.action !== undefined ? params.action : currentAction,
      id: params?.id !== undefined ? params.id : currentRecordId,
      tableId: params?.tableId !== undefined ? params.tableId : activeQrTableId
    });
  }, [currentView, currentSubTab, currentAction, currentRecordId, activeQrTableId]);

  const unreadAlertsCount = (alerts || []).filter(a => !a.read).length;

  return (
    <SystemContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentSubTab,
        setCurrentSubTab,
        currentAction,
        setCurrentAction,
        currentRecordId,
        setCurrentRecordId,
        navigateTo,
        clearSubTabAction,
        launcherOpen,
        setLauncherOpen,
        toggleLauncher,
        alerts,
        unreadAlertsCount,
        pendingOrdersCount,
        refreshAlerts,
        activeRegister,
        refreshRegister,
        globalVersion,
        triggerGlobalRefresh,
        activeQrTableId,
        setActiveQrTableId,
        playOrderChime,
        generateUrl,
        copyCurrentLink,
        routeNotification,
        showRouteNotification,
        clearRouteNotification
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) throw new Error('useSystem must be used within a SystemProvider');
  return context;
};
