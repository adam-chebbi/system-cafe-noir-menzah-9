import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSystem } from '../../context/SystemContext';
import { ViewMode } from '../../types';
import {
  LayoutDashboard,
  CreditCard,
  ChefHat,
  Grid,
  Coffee,
  Boxes,
  Truck,
  Users,
  Receipt,
  TrendingUp,
  FileText,
  Globe,
  QrCode,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  Search,
  X,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  PlusCircle,
  History,
  Tag,
  ScanLine,
  UserPlus,
  Download,
  Percent,
  Compass,
  Palmtree,
  ShieldCheck,
  Building,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  Sliders
} from 'lucide-react';

import { NAVIGATION_MODULES, ModuleSection, CircularShortcut } from '../../config/navigationModules';

// Normalizer for accent-insensitive search
const normalizeStr = (str: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const QuickAccessLauncher: React.FC = () => {
  const {
    launcherOpen,
    setLauncherOpen,
    currentView,
    currentSubTab,
    navigateTo,
    pendingOrdersCount,
    unreadAlertsCount
  } = useSystem();

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Swipe & Drag Gesture State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragDirection, setDragDirection] = useState<'open' | 'close' | null>(null);

  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    isTracking: boolean;
    hasLockedHorizontal: boolean;
    initialLauncherOpen: boolean;
  }>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isTracking: false,
    hasLockedHorizontal: false,
    initialLauncherOpen: false
  });

  const getDrawerWidth = useCallback(() => {
    if (typeof window === 'undefined') return 560;
    const w = window.innerWidth;
    if (w < 640) return Math.min(w * 0.92, 560);
    if (w < 1024) return 640;
    return 740;
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (launcherOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 180);
    } else {
      setSearchQuery('');
    }
  }, [launcherOpen]);

  // Keyboard shortcut listener (Escape to close, Cmd/Ctrl+K or Alt+N to toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && launcherOpen) {
        setLauncherOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLauncherOpen(!launcherOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [launcherOpen, setLauncherOpen]);

  // Global edge-swipe gesture controller
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const isNearLeftEdge = e.clientX <= 55;
      const isOpen = launcherOpen;

      if (!isOpen && !isNearLeftEdge) {
        return;
      }

      gestureRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        isTracking: true,
        hasLockedHorizontal: false,
        initialLauncherOpen: isOpen
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g.isTracking) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!g.hasLockedHorizontal) {
        if (absDx > 8 && absDx > absDy) {
          g.hasLockedHorizontal = true;
        } else if (absDy > 12) {
          g.isTracking = false;
          return;
        } else {
          return;
        }
      }

      const drawerW = getDrawerWidth();

      if (!g.initialLauncherOpen) {
        if (dx > 0) {
          setIsDragging(true);
          setDragDirection('open');
          setDragOffset(Math.min(drawerW, Math.max(0, dx)));
        }
      } else {
        if (dx < 0) {
          setIsDragging(true);
          setDragDirection('close');
          setDragOffset(Math.max(-drawerW, Math.min(0, dx)));
        } else if (dx > 0) {
          setDragOffset(Math.min(25, dx * 0.2));
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g.isTracking) return;

      const dx = e.clientX - g.startX;
      const dt = Math.max(1, Date.now() - g.startTime);
      const velocity = dx / dt;
      const drawerW = getDrawerWidth();

      if (g.hasLockedHorizontal) {
        if (!g.initialLauncherOpen) {
          if (dx > 75 || velocity > 0.3) {
            setLauncherOpen(true);
          }
        } else {
          if (dx < -65 || velocity < -0.3) {
            setLauncherOpen(false);
          }
        }
      }

      g.isTracking = false;
      g.hasLockedHorizontal = false;
      setIsDragging(false);
      setDragOffset(0);
      setDragDirection(null);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [launcherOpen, setLauncherOpen, getDrawerWidth]);

  // 100% Comprehensive Modules Definition from shared NAVIGATION_MODULES
  const modules: ModuleSection[] = NAVIGATION_MODULES.map(mod => ({
    ...mod,
    shortcuts: mod.shortcuts.map(s => {
      if (s.id === 'reports-alerts' && unreadAlertsCount > 0) {
        return { ...s, badge: `${unreadAlertsCount}` };
      }
      if (s.id === 'kds-pending' && pendingOrdersCount > 0) {
        return { ...s, badge: `${pendingOrdersCount}` };
      }
      return s;
    })
  }));

  // Enhanced search filter with full synonyms and keywords support
  const queryNormalized = normalizeStr(searchQuery);

  const filteredModules = (modules || [])
    .map(mod => {
      if (!queryNormalized) return mod;

      const modTitleNorm = normalizeStr(mod.title);
      const modSubNorm = normalizeStr(mod.subtitle);
      const modTagNorm = normalizeStr(mod.categoryTag);

      const modMatches =
        modTitleNorm.includes(queryNormalized) ||
        modSubNorm.includes(queryNormalized) ||
        modTagNorm.includes(queryNormalized);

      const shortcuts = Array.isArray(mod.shortcuts) ? mod.shortcuts : [];
      const matchingShortcuts = shortcuts.filter(s => {
        const labelNorm = normalizeStr(s.label);
        if (labelNorm.includes(queryNormalized)) return true;
        if (s.keywords && s.keywords.some(k => normalizeStr(k).includes(queryNormalized))) {
          return true;
        }
        return modMatches;
      });

      if (modMatches || matchingShortcuts.length > 0) {
        return {
          ...mod,
          shortcuts: matchingShortcuts.length > 0 ? matchingShortcuts : shortcuts
        };
      }
      return null;
    })
    .filter(Boolean) as ModuleSection[];

  const drawerWidth = getDrawerWidth();

  let drawerTranslateX = 0;
  let backdropOpacity = 1;
  const isDisplaying = launcherOpen || (isDragging && dragDirection === 'open' && dragOffset > 0);

  if (isDragging) {
    if (dragDirection === 'open') {
      drawerTranslateX = -drawerWidth + dragOffset;
      backdropOpacity = Math.min(1, Math.max(0, dragOffset / drawerWidth));
    } else if (dragDirection === 'close') {
      drawerTranslateX = dragOffset;
      backdropOpacity = Math.max(0, (drawerWidth + dragOffset) / drawerWidth);
    }
  }

  return (
    <>
      {/* 1. Global Left-Edge Swipe Sensor */}
      {!launcherOpen && !isDragging && (
        <div
          className="fixed left-0 top-0 bottom-0 w-8 z-30 pointer-events-auto touch-pan-y"
          title="Glisser vers la droite pour ouvrir la Navigation Rapide"
          aria-hidden="true"
        />
      )}

      {/* 2. Floating Collapsed Side Tab */}
      <AnimatePresence>
        {!launcherOpen && !isDragging && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40"
          >
            <button
              id="btn-quick-access-tab"
              onClick={() => setLauncherOpen(true)}
              title="Ouvrir la Navigation Rapide (Ctrl+K ou glisser vers la droite)"
              aria-label="Ouvrir la Navigation Rapide"
              className="group relative bg-[#252A27] text-[#A4DEC2] hover:bg-[#343B37] py-4 px-2 sm:px-2.5 rounded-r-2xl shadow-xl flex flex-col items-center justify-center space-y-2 border-y border-r border-[#404743] transition-all hover:pl-3.5 active:scale-95 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="w-5 h-5 rounded-md bg-[#343B37] group-hover:bg-[#404743] flex items-center justify-center text-[#A4DEC2] transition-colors">
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold tracking-wider text-[#A4DEC2]/90 group-hover:text-white uppercase transition-colors">
                Navigation Rapide
              </span>

              {(pendingOrdersCount > 0 || unreadAlertsCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-[#E5AD3E] animate-ping absolute -top-1 right-1" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Full-Height Overlay Navigation Panel */}
      <AnimatePresence>
        {isDisplaying && (
          <div
            className="fixed inset-0 z-50 flex select-none"
            style={{
              pointerEvents: isDragging ? 'auto' : 'auto'
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: backdropOpacity }}
              exit={{ opacity: 0 }}
              transition={isDragging ? { duration: 0 } : { duration: 0.18 }}
              onClick={() => {
                if (!isDragging) setLauncherOpen(false);
              }}
              style={{
                opacity: isDragging ? backdropOpacity : undefined
              }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            />

            {/* Main Side Panel Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{
                x: isDragging ? drawerTranslateX : 0
              }}
              exit={{ x: '-100%' }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : { type: 'spring', damping: 28, stiffness: 320 }
              }
              style={{
                transform: isDragging ? `translateX(${drawerTranslateX}px)` : undefined,
                touchAction: 'pan-y'
              }}
              className="relative w-full max-w-[92vw] sm:max-w-[580px] md:max-w-[660px] lg:max-w-[740px] bg-[#F7F7F5] text-[#252A27] h-full shadow-2xl flex flex-col z-10 border-r border-[#D9DDD8] overflow-hidden will-change-transform"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-[#F2F3F0] border-b border-[#D9DDD8] flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#252A27] text-[#A4DEC2] flex items-center justify-center font-serif font-black text-sm shadow-xs">
                      CN
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="font-serif font-black text-sm sm:text-base tracking-tight text-[#252A27] leading-none">
                          NAVIGATION RAPIDE
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#A4DEC2] text-[#252A27] border border-[#8BCFAE]">
                          100% Connectée
                        </span>
                      </div>
                      <p className="text-[11px] text-[#555D58] font-medium mt-0.5">
                        Tous les modules, sous-onglets & actions &bull; Glisser &larr; pour fermer
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="hidden sm:inline text-[10px] text-[#555D58] font-semibold bg-[#ECEEEA] px-2 py-1 rounded-md border border-[#D9DDD8]">
                      Échap / Ctrl+K
                    </span>
                    <button
                      id="btn-close-quick-launcher"
                      onClick={() => setLauncherOpen(false)}
                      className="p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#252A27] border border-[#D9DDD8] transition-colors cursor-pointer"
                      title="Fermer la navigation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar with Instant Keyword Matching */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#555D58] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher (ex: Caisse, Congé, Loyer, OCR, Inventaire, Marge, Z de caisse)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#D9DDD8] text-xs text-[#252A27] placeholder-[#555D58] focus:outline-none focus:ring-2 focus:ring-[#A4DEC2] focus:border-transparent transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#ECEEEA] text-[#555D58] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Module Sections List */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 divide-y divide-[#D9DDD8]/60">
                {filteredModules.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Search className="w-8 h-8 text-[#555D58] mx-auto opacity-40" />
                    <p className="text-sm font-bold text-[#252A27]">Aucun raccourci ne correspond à votre recherche</p>
                    <p className="text-xs text-[#555D58]">
                      Essayez un mot-clé générique (ex: "ventes", "stock", "paie", "table", "facture").
                    </p>
                  </div>
                ) : (
                  filteredModules.map((mod, modIdx) => {
                    const ModIcon = mod.icon;
                    const isModActive =
                      currentView === mod.mainView ||
                      (mod.id === 'kds' && currentView === 'orders') ||
                      (mod.id === 'public' && currentView === 'public_website');

                    return (
                      <motion.div
                        key={mod.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: modIdx * 0.02, duration: 0.15 }}
                        className="pt-4 first:pt-0 space-y-3"
                      >
                        {/* Module Header */}
                        <div className="flex items-center justify-between group">
                          <button
                            id={`module-title-${mod.id}`}
                            onClick={() => {
                              if (mod.id === 'public') {
                                navigateTo('public_website' as any);
                              } else {
                                navigateTo(mod.mainView);
                              }
                            }}
                            className="flex items-center space-x-2.5 text-left group-hover:opacity-85 transition-opacity cursor-pointer"
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                isModActive
                                  ? 'bg-[#252A27] text-[#A4DEC2] shadow-xs'
                                  : 'bg-[#ECEEEA] text-[#252A27] group-hover:bg-[#252A27] group-hover:text-[#A4DEC2]'
                              }`}
                            >
                              <ModIcon className="w-4 h-4" />
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-xs sm:text-sm text-[#252A27] group-hover:underline flex items-center">
                                  {mod.title}
                                  <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#555D58] group-hover:translate-x-0.5 transition-transform" />
                                </h3>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md bg-[#ECEEEA] text-[#555D58] border border-[#D9DDD8]">
                                  {mod.categoryTag}
                                </span>
                                {isModActive && (
                                  <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-md bg-[#A4DEC2] text-[#252A27]">
                                    Actuel
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#555D58] line-clamp-1">{mod.subtitle}</p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              if (mod.id === 'public') {
                                navigateTo('public_website' as any);
                              } else {
                                navigateTo(mod.mainView);
                              }
                            }}
                            className="text-[11px] font-bold text-[#555D58] hover:text-[#252A27] hover:bg-[#ECEEEA] px-2 py-1 rounded-md transition-colors hidden sm:block cursor-pointer"
                          >
                            Ouvrir &rarr;
                          </button>
                        </div>

                        {/* Circular Functionality Buttons */}
                        <div className="flex flex-wrap items-start gap-2.5 sm:gap-3 pl-1">
                          {mod.shortcuts.map(shortcut => {
                            const ShortcutIcon = shortcut.icon;
                            const isCurrentShortcut =
                              isModActive &&
                              ((shortcut.subTab && currentSubTab === shortcut.subTab) ||
                                (!shortcut.subTab && !currentSubTab));

                            return (
                              <motion.button
                                key={shortcut.id}
                                id={`shortcut-${shortcut.id}`}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  if (shortcut.id === 'pub-site') {
                                    navigateTo('public_website' as any);
                                  } else if (shortcut.id === 'pub-qr') {
                                    navigateTo('qr_customer_order' as any);
                                  } else {
                                    navigateTo(
                                      mod.mainView,
                                      shortcut.subTab,
                                      shortcut.action,
                                      shortcut.metadata
                                    );
                                  }
                                }}
                                className="flex flex-col items-center group cursor-pointer focus:outline-none w-[72px] sm:w-[80px]"
                              >
                                <div
                                  className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center border transition-all duration-150 shadow-2xs ${
                                    isCurrentShortcut
                                      ? 'bg-[#A4DEC2] text-[#252A27] border-[#8BCFAE] ring-2 ring-[#252A27]/20 shadow-xs'
                                      : 'bg-white text-[#252A27] border-[#D9DDD8] group-hover:border-[#252A27] group-hover:bg-[#F2F3F0]'
                                  }`}
                                >
                                  <ShortcutIcon className="w-5 h-5 transition-transform group-hover:scale-110" />

                                  {shortcut.badge && (
                                    <span
                                      className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-xs ${
                                        shortcut.badge === 'IA'
                                          ? 'bg-[#252A27] text-[#A4DEC2] border border-[#A4DEC2]'
                                          : 'bg-rose-600 text-white'
                                      }`}
                                    >
                                      {shortcut.badge}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`mt-1.5 text-[11px] leading-tight text-center transition-colors line-clamp-2 px-0.5 ${
                                    isCurrentShortcut
                                      ? 'font-bold text-[#252A27]'
                                      : 'font-medium text-[#555D58] group-hover:text-[#252A27]'
                                  }`}
                                >
                                  {shortcut.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-[#F2F3F0] border-t border-[#D9DDD8] flex items-center justify-between text-[11px] text-[#555D58] shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-[#252A27]">100% des Fonctions Disponibles</span>
                </div>
                <span className="font-mono font-medium text-[10px] text-[#555D58]">
                  Glisser gauche/droite &bull; Ctrl+K
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
