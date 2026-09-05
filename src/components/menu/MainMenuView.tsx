import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { AnimatedBackground } from '../common/AnimatedBackground';
import { ViewMode } from '../../types';
import {
  LayoutDashboard,
  CreditCard,
  Coffee,
  Boxes,
  Truck,
  Users,
  Receipt,
  TrendingUp
} from 'lucide-react';

interface MenuTile {
  id: string;
  label: string;
  icon: React.ElementType;
  view: ViewMode;
  color: string;
}

const MENU_TILES: MenuTile[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, view: 'dashboard', color: '#6DBE96' },
  { id: 'sales', label: 'Ventes', icon: CreditCard, view: 'pos', color: '#E5AD3E' },
  { id: 'products', label: 'Produits', icon: Coffee, view: 'products', color: '#9A8064' },
  { id: 'stock', label: 'Stock', icon: Boxes, view: 'stock', color: '#7C9A6B' },
  { id: 'suppliers', label: 'Achats & Fournisseurs & Factures', icon: Truck, view: 'suppliers', color: '#55A9C0' },
  { id: 'hr', label: 'Équipe & Présence', icon: Users, view: 'hr', color: '#C97B84' },
  { id: 'expenses', label: 'Dépenses', icon: Receipt, view: 'expenses', color: '#C0793E' },
  { id: 'reports', label: 'Rapports Financiers & Rentabilité', icon: TrendingUp, view: 'reports', color: '#7C6FA3' }
];

export const MainMenuView: React.FC = () => {
  const { navigateTo } = useSystem();
  const { currentUser } = useAuth();

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const firstName = (currentUser?.name || 'Bienvenue').split(' ')[0];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-14">
        <div className="w-full max-w-5xl animate-fade-rise-in">
          {/* Welcoming header */}
          <div className="text-center mb-9 sm:mb-12">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#A4DEC2] text-[#252A27] flex items-center justify-center shadow-xl mx-auto mb-4 font-serif font-black text-2xl">
              CN
            </div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#A4DEC2]">
              Café Noir Système
            </p>
            <h1 className="font-serif text-2xl sm:text-4xl font-black text-white mt-2">
              Bonjour, {firstName}
            </h1>
            <p className="text-sm text-white/60 mt-2 capitalize">{today}</p>
          </div>

          {/* 8-module launcher grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5">
            {MENU_TILES.map(tile => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => navigateTo(tile.view)}
                  className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-[#F7F7F5]/97 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 active:scale-[0.96] active:translate-y-0 transition-all duration-300 ease-out p-4 sm:p-6 h-36 sm:h-44 cursor-pointer touch-manipulation"
                >
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-100"
                    style={{ backgroundColor: tile.color }}
                  >
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#252A27] text-center leading-tight px-1">
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="relative z-10 text-center text-[11px] text-white/40 pb-4 sm:pb-6">
        Café Noir Système &middot; Plateforme opérationnelle
      </p>
    </div>
  );
};
