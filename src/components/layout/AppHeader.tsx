import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { getActiveModule, CircularShortcut } from '../../config/navigationModules';
import {
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  QrCode,
  Sparkles
} from 'lucide-react';

export const AppHeader: React.FC = () => {
  const {
    currentView,
    currentSubTab,
    currentAction,
    navigateTo,
    setCurrentView,
    alerts,
    unreadAlertsCount,
    pendingOrdersCount
  } = useSystem();

  const { currentUser, logout } = useAuth();

  // Dropdown state for notifications
  const [isAlertsDropdownOpen, setIsAlertsDropdownOpen] = useState(false);

  // Page vertical scroll state for sticky animation
  const [isPageScrolled, setIsPageScrolled] = useState(false);

  // Horizontal scroll state & refs for contextual actions
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  // Active module & shortcuts
  const activeModule = getActiveModule(currentView);

  // Check horizontal scroll limits
  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 4);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Monitor vertical scroll on window and document elements for header elevation animation
  useEffect(() => {
    const handleScroll = (e?: Event) => {
      let scrolled = window.scrollY > 6 || document.documentElement.scrollTop > 6 || document.body.scrollTop > 6;
      if (!scrolled && e && e.target && e.target !== document && (e.target as HTMLElement).scrollTop !== undefined) {
        scrolled = (e.target as HTMLElement).scrollTop > 6;
      }
      setIsPageScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [currentView]);

  // Monitor horizontal scroll & resize of contextual action bar
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollButtons();

    const handleScroll = () => updateScrollButtons();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollButtons());
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', updateScrollButtons);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [activeModule, updateScrollButtons]);

  // Reset scroll position to beginning when module changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeModule.id]);

  // Handle smooth scroll clicks
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Continuous scroll when holding arrow
  const startContinuousScroll = (direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    scrollIntervalRef.current = window.setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({
          left: direction === 'left' ? -35 : 35,
          behavior: 'auto'
        });
      }
    }, 25);
  };

  const stopContinuousScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // Shortcut click handler
  const handleShortcutClick = (shortcut: CircularShortcut) => {
    if (shortcut.id === 'pub-site') {
      navigateTo('public_website' as any);
    } else if (shortcut.id === 'pub-qr') {
      navigateTo('qr_customer_order' as any);
    } else {
      navigateTo(
        activeModule.mainView,
        shortcut.subTab,
        shortcut.action,
        shortcut.metadata
      );
    }
  };

  // Check if a shortcut is currently active
  const isShortcutActive = (shortcut: CircularShortcut, index: number) => {
    // 1. Exact action match
    if (shortcut.action && currentAction === shortcut.action) {
      return true;
    }
    // 2. Exact subTab match
    if (shortcut.subTab && currentSubTab === shortcut.subTab) {
      return true;
    }
    // 3. Neither subTab nor action are in route -> first default item is active
    if (!currentSubTab && !currentAction && !shortcut.subTab && !shortcut.action) {
      return true;
    }
    // 4. Default fallback: if first item has subTab but currentSubTab is undefined
    if (index === 0 && !currentSubTab && !currentAction && shortcut.subTab) {
      return true;
    }
    return false;
  };

  return (
    <header
      className={`sticky top-0 z-30 px-3 sm:px-4 py-2 flex items-center justify-between transition-all duration-300 ease-out select-none ${
        isPageScrolled
          ? 'bg-[#F2F3F0]/95 backdrop-blur-md border-b border-[#C7CDC8] shadow-md'
          : 'bg-[#F2F3F0] border-b border-[#D9DDD8] shadow-2xs'
      }`}
    >
      {/* Left Zone: Back-to-Menu Control & Current Module Icon & Title */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0 pl-0.5 pr-2.5 sm:pr-3.5 border-r border-[#D9DDD8]">
        <button
          type="button"
          onClick={() => setCurrentView('menu')}
          className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="Retour au menu principal"
          aria-label="Retour au menu principal"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline text-[10px] sm:text-xs font-black tracking-wider">MENU</span>
        </button>

        <div className="w-px h-6 bg-[#D9DDD8] hidden xs:block" />

        <button
          type="button"
          onClick={() => {
            if (activeModule.id === 'public') {
              navigateTo('public_website' as any);
            } else {
              navigateTo(activeModule.mainView);
            }
          }}
          className="flex items-center space-x-2 text-left focus:outline-none group cursor-pointer"
          title={`Module actif : ${activeModule.title} (${activeModule.categoryTag})`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#252A27] text-[#A4DEC2] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <activeModule.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#A4DEC2]" />
          </div>
          <div className="hidden xs:block sm:block">
            <span className="font-bold text-xs sm:text-sm text-[#252A27] leading-none block whitespace-nowrap group-hover:text-black transition-colors">
              {activeModule.title}
            </span>
            <span className="text-[8.5px] font-semibold text-[#555D58] uppercase tracking-wider block mt-0.5 leading-none">
              {activeModule.categoryTag}
            </span>
          </div>
        </button>
      </div>

      {/* Central Zone: Dynamic Contextual Module Actions with Gradient Overlays */}
      <div className="flex-1 min-w-0 relative flex items-center px-2 sm:px-3">
        {/* Left Overflow Gradient & Scroll Arrow */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#F2F3F0] via-[#F2F3F0]/90 to-transparent pointer-events-none flex items-center justify-start z-10 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={scrollLeft}
              onMouseDown={() => startContinuousScroll('left')}
              onMouseUp={stopContinuousScroll}
              onMouseLeave={stopContinuousScroll}
              onTouchStart={() => startContinuousScroll('left')}
              onTouchEnd={stopContinuousScroll}
              className="pointer-events-auto ml-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 border border-[#D9DDD8] text-[#252A27] shadow-xs flex items-center justify-center hover:bg-[#252A27] hover:text-[#A4DEC2] hover:border-[#252A27] transition-all cursor-pointer"
              title="Défiler vers la gauche"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Horizontal Container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto no-scrollbar scroll-smooth flex items-center space-x-1.5 sm:space-x-2 py-0.5 px-0.5"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {activeModule.shortcuts.map((shortcut, idx) => {
            const ShortcutIcon = shortcut.icon;
            const active = isShortcutActive(shortcut, idx);

            return (
              <button
                key={shortcut.id}
                id={`header-shortcut-${shortcut.id}`}
                type="button"
                onClick={() => handleShortcutClick(shortcut)}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer touch-manipulation ${
                  active
                    ? 'bg-[#252A27] text-[#A4DEC2] border border-[#252A27] shadow-xs ring-1 ring-[#252A27]/20'
                    : 'bg-[#ECEEEA] text-[#252A27] hover:bg-white hover:text-[#252A27] border border-[#D9DDD8] hover:border-[#C7CDC8] shadow-2xs'
                }`}
              >
                <ShortcutIcon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
                    active ? 'text-[#A4DEC2] scale-105' : 'text-[#555D58]'
                  }`}
                />
                <span className="leading-tight">{shortcut.label}</span>

                {shortcut.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      shortcut.badge === 'OCR' || shortcut.badge === 'IA'
                        ? 'bg-[#A4DEC2] text-[#252A27]'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {shortcut.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Overflow Gradient & Scroll Arrow */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F2F3F0] via-[#F2F3F0]/90 to-transparent pointer-events-none flex items-center justify-end z-10 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={scrollRight}
              onMouseDown={() => startContinuousScroll('right')}
              onMouseUp={stopContinuousScroll}
              onMouseLeave={stopContinuousScroll}
              onTouchStart={() => startContinuousScroll('right')}
              onTouchEnd={stopContinuousScroll}
              className="pointer-events-auto mr-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 border border-[#D9DDD8] text-[#252A27] shadow-xs flex items-center justify-center hover:bg-[#252A27] hover:text-[#A4DEC2] hover:border-[#252A27] transition-all cursor-pointer"
              title="Défiler vers la droite"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right Zone: Alerts Notification & Minimalist User Avatar */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Live Pending QR Orders Indicator Badge (if pending orders exist) */}
        {pendingOrdersCount > 0 && (
          <button
            type="button"
            onClick={() => navigateTo('orders', 'pending_qr')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#E5AD3E]/20 hover:bg-[#E5AD3E]/30 text-[#252A27] border border-[#E5AD3E] font-bold text-xs shadow-2xs transition-all animate-pulse cursor-pointer"
            title={`${pendingOrdersCount} commande(s) QR en attente`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#E5AD3E]" />
            <span className="hidden md:inline font-bold">{pendingOrdersCount} QR</span>
            <span className="md:hidden font-bold">{pendingOrdersCount}</span>
          </button>
        )}

        {/* Operational Alerts Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAlertsDropdownOpen(!isAlertsDropdownOpen)}
            className="p-1.5 sm:p-2 rounded-lg bg-[#ECEEEA] hover:bg-white text-[#252A27] border border-[#D9DDD8] transition-colors relative shadow-2xs cursor-pointer"
            title="Alertes opérationnelles"
            aria-label="Alertes opérationnelles"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Alerts dropdown */}
          {isAlertsDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-[#F2F3F0] rounded-xl shadow-xl border border-[#C7CDC8] p-3 z-50 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9DDD8]">
                <span className="text-xs font-bold text-[#252A27]">
                  Alertes Opérationnelles ({unreadAlertsCount})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAlertsDropdownOpen(false)}
                  className="p-1 rounded-md text-[#555D58] hover:bg-[#ECEEEA] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-1.5 max-h-60 overflow-y-auto space-y-1.5 text-xs divide-y divide-[#D9DDD8]">
                {alerts.filter(a => !a.read).length === 0 ? (
                  <p className="text-center py-3 text-[#555D58] text-[11px]">Aucune alerte active</p>
                ) : (
                  alerts.filter(a => !a.read).slice(0, 8).map(a => (
                    <div
                      key={a.id}
                      className="pt-1.5 first:pt-0 cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors"
                      onClick={() => {
                        setIsAlertsDropdownOpen(false);
                        if (a.type === 'low_stock' || a.type === 'negative_stock' || a.type === 'lot_expiring' || a.type === 'lot_expired' || a.type === 'inventory_discrepancy') {
                          navigateTo('stock');
                        } else if (a.type === 'ocr_review' || a.type === 'invoice_due') {
                          navigateTo('suppliers');
                        } else if (a.type === 'margin_below_target') {
                          navigateTo('products');
                        }
                      }}
                    >
                      <p className="font-bold text-[#252A27] flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-[#E5AD3E]" />
                        <span className="text-xs">{a.title}</span>
                      </p>
                      <p className="text-[11px] text-[#555D58] mt-0.5">{a.message}</p>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAlertsDropdownOpen(false);
                  navigateTo('reports', 'alerts');
                }}
                className="w-full mt-2 pt-2 border-t border-[#D9DDD8] text-center text-[11px] font-bold text-[#252A27] hover:underline cursor-pointer"
              >
                Gérer toutes les alertes &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Minimalist User Avatar: Single Letter Pill (Click to lock and return to PIN entry) */}
        <button
          type="button"
          onClick={logout}
          className="w-8 h-8 rounded-full bg-[#252A27] text-[#A4DEC2] text-xs font-black flex items-center justify-center cursor-pointer shadow-2xs border border-[#252A27] hover:ring-2 hover:ring-[#8BCFAE] hover:scale-105 active:scale-95 transition-all"
          title={`${currentUser?.name || 'Utilisateur'} — Cliquer pour verrouiller la session (code PIN)`}
          aria-label={`Compte utilisateur ${currentUser?.name || ''} - Verrouiller la session`}
        >
          {(currentUser?.name?.charAt(0) || 'U').toUpperCase()}
        </button>
      </div>
    </header>
  );
};
