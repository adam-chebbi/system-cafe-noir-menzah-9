import React from 'react';
import { LayoutDashboard, CreditCard, Coffee, Boxes, Truck, Users, Receipt, TrendingUp, FileText, Globe, Edit3, Download, History, AlertTriangle, Calendar } from 'lucide-react';
import { ViewMode } from '../types';
export interface CircularShortcut { id:string; label:string; icon:React.ElementType; subTab?:string; action?:string; badge?:string; keywords?:string[]; metadata?:any }
export interface ModuleSection { id:string; title:string; categoryTag:string; subtitle:string; icon:React.ElementType; mainView:ViewMode; matchingViews:ViewMode[]; shortcuts:CircularShortcut[] }
const shortcut = (id:string,label:string,icon:React.ElementType,subTab?:string):CircularShortcut => ({id,label,icon,subTab});
export const NAVIGATION_MODULES: ModuleSection[] = [
 {id:'dashboard',title:'Tableau de bord',categoryTag:'Supervision',subtitle:'KPIs et alertes',icon:LayoutDashboard,mainView:'dashboard',matchingViews:['dashboard','alerts'],shortcuts:[shortcut('dash-overview','Vue globale',LayoutDashboard),shortcut('dash-kpis','KPIs',TrendingUp,'kpis'),shortcut('dash-alerts','Alertes',AlertTriangle,'alerts')]},
 {id:'sales',title:'Ventes',categoryTag:'Ventes',subtitle:'Saisie, import et historique',icon:CreditCard,mainView:'pos',matchingViews:['pos'],shortcuts:[shortcut('sales-manual','Saisie manuelle',Edit3,'manual'),shortcut('sales-import','Import Excel/CSV',Download,'import'),shortcut('sales-history','Historique',History,'history')]},
 {id:'products',title:'Carte & fiches techniques',categoryTag:'Catalogue',subtitle:'Produits et recettes',icon:Coffee,mainView:'products',matchingViews:['products','categories','ingredients','recipes','csv_import'],shortcuts:[shortcut('products-catalog','Catalogue',Coffee,'products')]},
 {id:'stock',title:'Stock & pertes',categoryTag:'Matières',subtitle:'Réserve principale et dépôt',icon:Boxes,mainView:'stock',matchingViews:['stock','stock_movements','stock_wastes','inventory_audit'],shortcuts:[shortcut('stock-inventory','État des stocks',Boxes,'inventory')]},
 {id:'suppliers',title:'Fournisseurs & factures OCR',categoryTag:'Achats',subtitle:'Achats et factures',icon:Truck,mainView:'suppliers',matchingViews:['suppliers','purchase_orders','supplier_invoices','ocr_invoice'],shortcuts:[shortcut('suppliers-directory','Fournisseurs',Truck,'suppliers')]},
 {id:'hr',title:'Équipe & présence',categoryTag:'Personnel',subtitle:'Dossiers, planning et présence manuelle',icon:Users,mainView:'hr',matchingViews:['hr','employees','attendance','planning'],shortcuts:[shortcut('hr-team','Équipe',Users,'team'),shortcut('hr-planning','Planning',Calendar,'shifts'),shortcut('hr-presence','Présence manuelle',Edit3,'attendance')]},
 {id:'expenses',title:'Charges & dépenses',categoryTag:'Finances',subtitle:'Registre des charges',icon:Receipt,mainView:'expenses',matchingViews:['expenses'],shortcuts:[shortcut('expenses-list','Registre',Receipt,'list')]},
 {id:'reports',title:'Rapports & rentabilité',categoryTag:'Comptabilité',subtitle:'Rapports financiers',icon:TrendingUp,mainView:'reports',matchingViews:['reports'],shortcuts:[shortcut('reports-main','Rapports',TrendingUp)]},
 {id:'journal',title:'Journal d’activité',categoryTag:'Traçabilité',subtitle:'Ventes, stock et RH',icon:FileText,mainView:'journal',matchingViews:['journal'],shortcuts:[shortcut('journal-all','Journal',FileText)]},
 {id:'public',title:'Site public & menu digital',categoryTag:'Client',subtitle:'Vitrine et menu en lecture seule',icon:Globe,mainView:'public_website',matchingViews:['public_website','public_site'],shortcuts:[shortcut('pub-site','Site public',Globe)]}
];
export function getActiveModule(view:ViewMode):ModuleSection { return NAVIGATION_MODULES.find(m=>m.mainView===view || m.matchingViews.includes(view)) || NAVIGATION_MODULES[0]; }
