import React from 'react';
import { ViewMode } from '../types';
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
  FileSpreadsheet,
  AlertTriangle,
  PlusCircle,
  History,
  Tag,
  ScanLine,
  UserPlus,
  Download,
  Percent,
  Layers,
  ShoppingBag
} from 'lucide-react';

export interface CircularShortcut {
  id: string;
  label: string;
  icon: React.ElementType;
  subTab?: string;
  action?: string;
  badge?: string;
  keywords?: string[];
  metadata?: any;
}

export interface ModuleSection {
  id: string;
  title: string;
  categoryTag: string;
  subtitle: string;
  icon: React.ElementType;
  mainView: ViewMode;
  matchingViews: ViewMode[];
  shortcuts: CircularShortcut[];
}

export const NAVIGATION_MODULES: ModuleSection[] = [
  {
    id: 'dashboard',
    title: 'Tableau de Bord',
    categoryTag: 'Supervision',
    subtitle: 'Vue globale, KPIs en direct, alertes & activité du jour',
    icon: LayoutDashboard,
    mainView: 'dashboard',
    matchingViews: ['dashboard', 'alerts'],
    shortcuts: [
      { id: 'dash-overview', label: 'Vue Globale', icon: LayoutDashboard, keywords: ['cockpit', 'accueil', 'synthèse', 'résumé', 'statistiques'] },
      { id: 'dash-kpis', label: 'KPIs & Ventes', icon: TrendingUp, subTab: 'kpis', keywords: ['chiffre d affaires', 'ca', 'panier moyen', 'revenus', 'volume'] },
      { id: 'dash-alerts', label: 'Alertes', icon: AlertTriangle, subTab: 'alerts', keywords: ['urgent', 'seuil bas', 'notification', 'rupture', 'avertissement'] },
      { id: 'dash-retro', label: 'Reprise Ancien', icon: History, action: 'retro-progress', keywords: ['coexistence', 'ancien système', 'digitalisation', 'papiers', 'rattrapage'] },
      { id: 'dash-pnl', label: 'Rapport P&L', icon: DollarSign, subTab: 'reports', keywords: ['rentabilité', 'compte de résultat', 'marge', 'bilan'] }
    ]
  },
  {
    id: 'pos',
    title: 'Caisse POS (Ventes)',
    categoryTag: 'Encaissement',
    subtitle: 'Prise de commande tactile, clôture de caisse & règlements',
    icon: CreditCard,
    mainView: 'pos',
    matchingViews: ['pos'],
    shortcuts: [
      { id: 'pos-main', label: 'Caisse Tactile', icon: CreditCard, subTab: 'pos', keywords: ['écran tactile', 'touch', 'terminal', 'vente', 'commander'] },
      { id: 'pos-session', label: 'Clôture / Z Caisse', icon: Clock, subTab: 'register', action: 'session', keywords: ['session', 'fond de caisse', 'fermeture', 'z de caisse', 'comptage'] },
      { id: 'pos-discount', label: 'Remises / Offert', icon: Percent, action: 'discount', keywords: ['rabais', 'réduction', 'geste commercial', 'offert', 'pourcentage'] },
      { id: 'pos-tables', label: 'Affecter Table', icon: Grid, action: 'table_select', keywords: ['salle', 'numéro table', 'addition sur table'] },
      { id: 'pos-takeaway', label: 'À Emporter', icon: ShoppingBag, action: 'takeaway', keywords: ['direct', 'emporter', 'takeaway', 'comptoir'] }
    ]
  },
  {
    id: 'kds',
    title: 'KDS & Cuisine',
    categoryTag: 'Production',
    subtitle: 'File de préparation Barista, Cuisine & tickets de service',
    icon: ChefHat,
    mainView: 'orders',
    matchingViews: ['orders'],
    shortcuts: [
      { id: 'kds-pending', label: 'Nouvelles Commandes', icon: ChefHat, subTab: 'pending_qr', keywords: ['commandes clients', 'qr', 'nouveau', 'file attente', 'à valider'] },
      { id: 'kds-active', label: 'En Préparation', icon: Clock, subTab: 'active', keywords: ['cuisine', 'barista', 'au passe', 'cours', 'fabrication'] },
      { id: 'kds-history', label: 'Historique KDS', icon: History, subTab: 'history', keywords: ['servies', 'terminées', 'tickets passés', 'archives'] }
    ]
  },
  {
    id: 'tables',
    title: 'Plan de Salle & Tables',
    categoryTag: 'Espaces',
    subtitle: 'Plan interactif par glisser-déposer, réservations & QR stands',
    icon: Grid,
    mainView: 'tables',
    matchingViews: ['tables', 'reservations'],
    shortcuts: [
      { id: 'tbl-plan', label: 'Plan Interactif', icon: Grid, subTab: 'plan', keywords: ['glisser déposer', 'salle', 'terrasse', 'disposition', 'mobilier'] },
      { id: 'tbl-list', label: 'Liste Tables', icon: Layers, subTab: 'list', keywords: ['tableau', 'numérotation', 'couverts', 'capacité'] },
      { id: 'tbl-resas', label: 'Réservations', icon: Calendar, subTab: 'reservations', keywords: ['booking', 'résa', 'client', 'planning salle', 'horaire'] },
      { id: 'tbl-qr', label: 'QR Stands & PDF', icon: QrCode, action: 'qr_modal', keywords: ['chevalet', 'flash code', 'impression', 'autocollant'] },
      { id: 'tbl-new', label: 'Nouvelle Table', icon: PlusCircle, action: 'new_table', keywords: ['ajouter table', 'créer emplacement'] }
    ]
  },
  {
    id: 'products',
    title: 'Carte & Fiches Tech.',
    categoryTag: 'Catalogue',
    subtitle: 'Gestion des produits, fiches recettes, marges & allergènes',
    icon: Coffee,
    mainView: 'products',
    matchingViews: ['products', 'categories', 'ingredients', 'recipes', 'csv_import'],
    shortcuts: [
      { id: 'prod-catalog', label: 'Catalogue', icon: Coffee, subTab: 'products', keywords: ['carte', 'menu', 'boissons', 'pâtisseries', 'snacks', 'prix'] },
      { id: 'prod-recipes', label: 'Fiches Recettes', icon: FileText, subTab: 'recipes', keywords: ['fiche technique', 'recette', 'food cost', 'coût matière', 'grammage', 'allergènes', 'marge'] },
      { id: 'prod-cats', label: 'Catégories', icon: Tag, action: 'category_modal', keywords: ['familles', 'rayons', 'classement', 'rubriques'] },
      { id: 'prod-csv', label: 'Import CSV', icon: FileSpreadsheet, action: 'csv_modal', keywords: ['excel', 'importation', 'catalogue en masse', 'fichier'] },
      { id: 'prod-new', label: 'Nouveau Produit', icon: PlusCircle, action: 'new_product', keywords: ['ajouter article', 'créer boisson', 'nouveau plat'] }
    ]
  },
  {
    id: 'stock',
    title: 'Stock & Pertes',
    categoryTag: 'Matières',
    subtitle: 'Matières premières, alertes de réassort, pertes & audits',
    icon: Boxes,
    mainView: 'stock',
    matchingViews: ['stock', 'stock_movements', 'stock_wastes', 'inventory_audit'],
    shortcuts: [
      { id: 'stk-inventory', label: 'État des Stocks', icon: Boxes, subTab: 'inventory', keywords: ['inventaire', 'matières premières', 'grains', 'lait', 'sirop', 'réserve', 'seuil bas'] },
      { id: 'stk-mvmts', label: 'Mouvements E/S', icon: History, subTab: 'movements', keywords: ['entrées', 'sorties', 'réappro', 'correction mouvement', 'historique stock'] },
      { id: 'stk-audits', label: 'Audits & Brouillons', icon: ScanLine, subTab: 'audits', keywords: ['comptage physique', 'inventaire mensuel', 'brouillon audit', 'écart stock'] },
      { id: 'stk-waste', label: 'Pertes & Casse', icon: AlertTriangle, subTab: 'wastes', keywords: ['démarque', 'gaspillage', 'périmé', 'déchet', 'déclaration perte'] },
      { id: 'stk-audit-action', label: 'Faire Inventaire', icon: ScanLine, action: 'audit_modal', keywords: ['lancer inventaire', 'ajustement réel'] },
      { id: 'stk-waste-action', label: 'Déclarer Perte', icon: AlertTriangle, action: 'waste_modal', keywords: ['enregistrer perte', 'casser bouteille'] },
      { id: 'stk-new-ing', label: 'Nouvelle Matière', icon: PlusCircle, action: 'new_ingredient', keywords: ['créer ingrédient', 'ajouter fourniture'] }
    ]
  },
  {
    id: 'suppliers',
    title: 'Fournisseurs & Factures OCR',
    categoryTag: 'Achats',
    subtitle: 'Répertoire fournisseurs, bons de commande & scanner IA',
    icon: Truck,
    mainView: 'suppliers',
    matchingViews: ['suppliers', 'purchase_orders', 'supplier_invoices', 'ocr_invoice'],
    shortcuts: [
      { id: 'sup-directory', label: 'Fournisseurs', icon: Truck, subTab: 'suppliers', keywords: ['annuaire', 'contacts', 'grossistes', 'torréfacteur', 'laitier', 'modifier fournisseur'] },
      { id: 'sup-orders', label: 'Bons Commande', icon: FileText, subTab: 'orders', keywords: ['achats', 'bon de commande', 'po', 'réception', 'livraison'] },
      { id: 'sup-invoices', label: 'Factures', icon: Receipt, subTab: 'invoices', keywords: ['factures d achats', 'règlements', 'dépenses fournisseurs', 'historique achats'] },
      { id: 'sup-ocr', label: 'Scan Facture', icon: FileText, action: 'ocr_modal', badge: 'OCR', keywords: ['scanner', 'ocr', 'reconnaissance', 'photo facture', 'local', 'sans ia'] },
      { id: 'sup-retro', label: 'Saisie Facture Hist.', icon: History, action: 'retro-invoice', keywords: ['facture papier', 'coexistence', 'ancien fournisseur', 'rattrapage'] },
      { id: 'sup-new', label: 'Nouveau Fournisseur', icon: PlusCircle, action: 'new_supplier', keywords: ['créer fournisseur', 'ajouter grossiste'] }
    ]
  },
  {
    id: 'hr',
    title: 'Équipe & Pointage (RH)',
    categoryTag: 'Personnel',
    subtitle: 'Planning des shifts, badgeuse en temps réel, congés & calcul de paie',
    icon: Users,
    mainView: 'hr',
    matchingViews: ['hr', 'employees', 'attendance', 'planning', 'leaves', 'payroll', 'performance'],
    shortcuts: [
      { id: 'hr-team', label: 'Trombinoscope', icon: Users, subTab: 'team', keywords: ['équipe', 'collaborateurs', 'baristas', 'salariés', 'pin', 'taux horaire', 'profil'] },
      { id: 'hr-shifts', label: 'Planning Shifts', icon: Calendar, subTab: 'shifts', keywords: ['horaires', 'emploi du temps', 'semaine', 'shifts', 'créneaux'] },
      { id: 'hr-clock', label: 'Pointage Heures', icon: Clock, subTab: 'attendance', keywords: ['badgeuse', 'arrivée', 'départ', 'heures travaillées', 'pointage réel'] },
      { id: 'hr-payroll', label: 'Bulletins & Paie', icon: DollarSign, subTab: 'payroll', keywords: ['salaires', 'fiche de paie', 'net à payer', 'charges salariales', 'brut'] },
      { id: 'hr-retro-pay', label: 'Saisie Paie Hist.', icon: History, action: 'retro-payroll', keywords: ['bulletin ancien', 'paie papier', 'historique salaires', 'archive paie'] },
      { id: 'hr-new-emp', label: 'Nouvel Employé', icon: UserPlus, action: 'new_employee', keywords: ['embauche', 'créer profil', 'ajouter collaborateur'] },
      { id: 'hr-new-shift', label: 'Planifier Shift', icon: Calendar, action: 'new_shift', keywords: ['ajouter shift', 'programmer horaire'] }
    ]
  },
  {
    id: 'expenses',
    title: 'Charges & Dépenses',
    categoryTag: 'Finances',
    subtitle: 'Suivi des charges d’exploitation (loyer, énergie, logiciels)',
    icon: Receipt,
    mainView: 'expenses',
    matchingViews: ['expenses'],
    shortcuts: [
      { id: 'exp-list', label: 'Registre Charges', icon: Receipt, subTab: 'list', keywords: ['dépenses', 'frais généraux', 'loyer', 'électricité', 'eau', 'abonnements', 'décaissements'] },
      { id: 'exp-retro', label: 'Saisie Dépense Hist.', icon: History, action: 'retro-expense', keywords: ['charge ancienne', 'reprise dépenses', 'facture passée', 'papier'] },
      { id: 'exp-new', label: 'Nouvelle Charge', icon: PlusCircle, action: 'new_expense', keywords: ['déclarer dépense', 'ajouter charge', 'paiement'] }
    ]
  },
  {
    id: 'reports',
    title: 'Rapports & Rentabilité',
    categoryTag: 'Comptabilité',
    subtitle: 'Compte de résultat d’exploitation, marges brutes & bilans',
    icon: TrendingUp,
    mainView: 'reports',
    matchingViews: ['reports'],
    shortcuts: [
      { id: 'rep-30d', label: 'P&L 30 Jours', icon: TrendingUp, subTab: '30days', keywords: ['rentabilité', 'compte de résultat', 'marge brute', 'bénéfice net'] },
      { id: 'rep-today', label: 'Ventes du Jour', icon: Clock, subTab: 'today', keywords: ['ca jour', 'ticket moyen', 'recettes aujourd hui'] },
      { id: 'rep-7d', label: 'Analyse 7 Jours', icon: DollarSign, subTab: '7days', keywords: ['semaine', 'évolution', 'hebdomadaire'] },
      { id: 'rep-90d', label: 'Bilan Trimestre (90j)', icon: FileSpreadsheet, subTab: '90days', keywords: ['trimestre', '3 mois', 'bilan comptable', 'expert comptable'] },
      { id: 'rep-retro', label: 'Saisie Vente Hist.', icon: History, action: 'retro-sale', keywords: ['ticket ancien', 'reprise caisse', 'vente papier', 'archive vente'] },
      { id: 'rep-export', label: 'Exporter Données', icon: Download, action: 'export', keywords: ['télécharger', 'json', 'excel', 'export comptable'] }
    ]
  },
  {
    id: 'journal',
    title: 'Journal d’Audit',
    categoryTag: 'Sécurité',
    subtitle: 'Traçabilité complète et immuable de toutes les opérations',
    icon: FileText,
    mainView: 'journal',
    matchingViews: ['journal'],
    shortcuts: [
      { id: 'jrn-all', label: 'Tous les Logs', icon: FileText, subTab: 'all', keywords: ['audit trail', 'historique complet', 'actions', 'sécurité'] },
      { id: 'jrn-sales', label: 'Audit Ventes', icon: CreditCard, subTab: 'sales', keywords: ['logs encaissement', 'annulation ticket', 'remise'] },
      { id: 'jrn-stock', label: 'Audit Stock', icon: Boxes, subTab: 'stock', keywords: ['logs inventaire', 'correction stock', 'mouvements'] },
      { id: 'jrn-hr', label: 'Audit RH', icon: Users, subTab: 'hr', keywords: ['logs pointage', 'modifications salaires', 'planning'] }
    ]
  },
  {
    id: 'public',
    title: 'Site Public & Commandes QR',
    categoryTag: 'Client',
    subtitle: 'Vitrine web pour les clients et commande digitale sur table',
    icon: Globe,
    mainView: 'public_website' as any,
    matchingViews: ['public_site', 'public_website' as any, 'qr_customer_order'],
    shortcuts: [
      { id: 'pub-site', label: 'Vitrine Web', icon: Globe, keywords: ['site client', 'carte en ligne', 'menu digital', 'vitrine internet'] },
      { id: 'pub-qr', label: 'Commande Smartphone', icon: QrCode, subTab: 'qr', keywords: ['session table', 'commander au smartphone', 'qr table'] }
    ]
  }
];

export function getActiveModule(currentView: ViewMode): ModuleSection {
  const found = NAVIGATION_MODULES.find(m =>
    m.mainView === currentView || m.matchingViews.includes(currentView)
  );
  return found || NAVIGATION_MODULES[0];
}
