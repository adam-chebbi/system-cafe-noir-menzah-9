import React, { useEffect, useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { ViewMode } from '../../types';
import {
  LayoutDashboard,
  CreditCard,
  Coffee,
  Boxes,
  Truck,
  Users,
  Receipt,
  TrendingUp,
  Bell,
  LogOut,
  Wifi,
  WifiOff,
  AlertTriangle,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle
} from 'lucide-react';

interface MenuTile {
  id: string;
  label: string;
  icon: React.ElementType;
  view: ViewMode;
  from: string;
  to: string;
  glow: string;
}

const MENU_TILES: MenuTile[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, view: 'dashboard', from: '#8B5CF6', to: '#C4B5FD', glow: 'rgba(139,92,246,0.5)' },
  { id: 'sales', label: 'Ventes', icon: CreditCard, view: 'pos', from: '#FB7185', to: '#FDA4AF', glow: 'rgba(251,113,133,0.5)' },
  { id: 'products', label: 'Produits', icon: Coffee, view: 'products', from: '#F472B6', to: '#FBCFE8', glow: 'rgba(244,114,182,0.45)' },
  { id: 'stock', label: 'Stock', icon: Boxes, view: 'stock', from: '#A855F7', to: '#D8B4FE', glow: 'rgba(168,85,247,0.5)' },
  { id: 'suppliers', label: 'Achats & Fournisseurs & Factures', icon: Truck, view: 'suppliers', from: '#FB7185', to: '#F472B6', glow: 'rgba(244,63,94,0.45)' },
  { id: 'hr', label: 'Équipe & Présence', icon: Users, view: 'hr', from: '#EC4899', to: '#C084FC', glow: 'rgba(236,72,153,0.45)' },
  { id: 'expenses', label: 'Dépenses', icon: Receipt, view: 'expenses', from: '#F43F5E', to: '#FB7185', glow: 'rgba(244,63,94,0.5)' },
  { id: 'reports', label: 'Rapports Financiers & Rentabilité', icon: TrendingUp, view: 'reports', from: '#A78BFA', to: '#EDE9FE', glow: 'rgba(167,139,250,0.45)' }
];

// Menzah 9, Tunis — no API key required (Open-Meteo).
const WEATHER_LAT = 36.85;
const WEATHER_LON = 10.17;

function weatherInfo(code: number): { icon: React.ElementType; label: string } {
  if (code === 0) return { icon: Sun, label: 'Ciel dégagé' };
  if (code === 1 || code === 2) return { icon: CloudSun, label: 'Partiellement nuageux' };
  if (code === 3) return { icon: Cloud, label: 'Couvert' };
  if (code === 45 || code === 48) return { icon: CloudFog, label: 'Brouillard' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: CloudDrizzle, label: 'Bruine' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: CloudRain, label: 'Pluie' };
  if ([71, 73, 75, 77].includes(code)) return { icon: CloudSnow, label: 'Neige' };
  if ([95, 96, 99].includes(code)) return { icon: CloudLightning, label: 'Orage' };
  return { icon: Cloud, label: 'Variable' };
}

const StatusChip: React.FC<{ icon: React.ElementType; label: string; tone?: 'good' | 'bad' | 'neutral' }> = ({ icon: Icon, label, tone = 'neutral' }) => (
  <div
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-sm border ${
      tone === 'good'
        ? 'bg-emerald-400/15 border-emerald-300/30 text-emerald-100'
        : tone === 'bad'
        ? 'bg-rose-400/15 border-rose-300/30 text-rose-100'
        : 'bg-white/10 border-white/20 text-white/90'
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </div>
);

export const MainMenuView: React.FC = () => {
  const { navigateTo, unreadAlertsCount } = useSystem();
  const { currentUser, logout } = useAuth();

  const [now, setNow] = useState(new Date());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data?.current_weather) {
          setWeather({ temp: Math.round(data.current_weather.temperature), code: data.current_weather.weathercode });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const firstName = (currentUser?.name || 'Bienvenue').split(' ')[0];
  const WeatherIcon = weather ? weatherInfo(weather.code).icon : Cloud;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left sidebar : date, clock, weather, status (desktop / tablet landscape) ── */}
      <aside className="hidden lg:flex lg:w-[34%] xl:w-[32%] shrink-0 relative flex-col p-8 xl:p-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #4A1942 0%, #7A2048 38%, #9C2545 62%, #5C1830 100%)' }}
        />
        <div className="animate-ambient-a absolute -top-24 -left-20 w-[30rem] h-[30rem] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, #F472B6 0%, transparent 70%)' }} />
        <div className="animate-ambient-b absolute bottom-0 -right-24 w-[26rem] h-[26rem] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full animate-fade-rise-in">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center font-serif font-black text-white text-lg shadow-lg">
            CN
          </div>

          <div className="flex-1 flex flex-col justify-center gap-9">
            <div>
              <p className="text-white/70 text-xs xl:text-sm font-bold uppercase tracking-[0.2em] capitalize">{dateStr}</p>
              <p className="text-white font-black text-6xl xl:text-7xl tracking-tight mt-3 tabular-nums" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.25)' }}>
                {timeStr}
              </p>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <WeatherIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-2xl leading-none">{weather ? `${weather.temp}°C` : '—'}</p>
                <p className="text-white/60 text-xs mt-1">{weather ? weatherInfo(weather.code).label : 'Météo indisponible'} · Menzah 9</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip icon={isOnline ? Wifi : WifiOff} label={isOnline ? 'Connecté' : 'Hors ligne'} tone={isOnline ? 'good' : 'bad'} />
              <StatusChip icon={AlertTriangle} label={`${unreadAlertsCount} alerte${unreadAlertsCount > 1 ? 's' : ''}`} tone={unreadAlertsCount > 0 ? 'bad' : 'neutral'} />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area : brand bar, module grid, user bar ── */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 100% at 20% 0%, #241B45 0%, #171334 45%, #0D0B21 100%)' }} />
        <div className="animate-ambient-c absolute top-1/4 -right-32 w-[38rem] h-[38rem] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 70%)' }} />
        <div className="animate-ambient-glow absolute bottom-0 left-1/3 w-[40rem] h-[40rem] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.18) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Top bar */}
          <header className="flex items-center justify-between px-5 sm:px-8 xl:px-12 py-5 sm:py-6 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-pink-200" />
              </div>
              <span className="text-white/80 text-xs font-bold uppercase tracking-[0.22em]">Café Noir Système</span>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <StatusChip icon={isOnline ? Wifi : WifiOff} label={isOnline ? 'En ligne' : 'Hors ligne'} tone={isOnline ? 'good' : 'bad'} />
            </div>

            <button
              type="button"
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors cursor-pointer"
              title="Alertes opérationnelles"
              onClick={() => navigateTo('reports', 'alerts')}
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>
          </header>

          {/* Compact info strip for mobile / narrow tablets (sidebar hidden below lg) */}
          <div className="lg:hidden flex items-center justify-center gap-4 flex-wrap px-5 pb-4 shrink-0">
            <span className="text-white/70 text-xs font-bold uppercase tracking-widest capitalize">{dateStr}</span>
            <span className="text-white font-black text-xl tabular-nums">{timeStr}</span>
            <span className="flex items-center gap-1.5 text-white/70 text-xs font-semibold">
              <WeatherIcon className="w-4 h-4" />
              {weather ? `${weather.temp}°C` : '—'}
            </span>
          </div>

          {/* Module grid */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 xl:px-12 py-4 overflow-y-auto">
            <div className="w-full max-w-4xl animate-fade-rise-in">
              <div className="text-center mb-8 sm:mb-10">
                <h1 className="font-serif text-2xl sm:text-3xl font-black text-white">Bonjour, {firstName}</h1>
                <p className="text-white/50 text-sm mt-1.5">Sélectionnez un module pour continuer</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 xl:gap-6">
                {MENU_TILES.map(tile => {
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => navigateTo(tile.view)}
                      className="group flex flex-col items-center justify-center gap-4 rounded-[2rem] bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.45)] hover:-translate-y-2 active:scale-[0.97] active:translate-y-0 transition-all duration-300 ease-out p-5 sm:p-6 h-40 sm:h-48 cursor-pointer touch-manipulation"
                    >
                      <div
                        className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-3xl flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-100"
                        style={{
                          background: `linear-gradient(145deg, ${tile.from}, ${tile.to})`,
                          boxShadow: `0 12px 28px ${tile.glow}, inset 0 1.5px 1.5px rgba(255,255,255,0.55), inset 0 -6px 10px rgba(0,0,0,0.18)`
                        }}
                      >
                        <Icon className="w-8 h-8 text-white drop-shadow-sm" strokeWidth={2.1} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-white/90 text-center leading-tight px-1">
                        {tile.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom bar : user info & settings */}
          <footer className="flex items-center justify-between px-5 sm:px-8 xl:px-12 py-5 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center font-black text-xs shrink-0">
                {(currentUser?.name?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold leading-none truncate">{currentUser?.name || 'Utilisateur'}</p>
                <p className="text-white/50 text-[11px] mt-1">Administrateur</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-400/30 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
              title="Se déconnecter (code PIN requis pour revenir)"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
};
