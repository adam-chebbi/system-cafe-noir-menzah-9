import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { exportToCsv, exportToExcel, todayFileTag, ExportRow } from '../../utils/exportData';
import { INGREDIENT_CATEGORY_LABELS } from '../../utils/ingredientCategories';
import {
  Receipt,
  Truck,
  Wallet,
  Boxes,
  Users,
  FileText,
  FileSpreadsheet,
  FileType,
  Loader2
} from 'lucide-react';

type DatasetKey = 'sales' | 'purchases' | 'expenses' | 'stock' | 'personnel' | 'journal';

interface DatasetDefinition {
  key: DatasetKey;
  label: string;
  description: string;
  icon: React.ElementType;
  sheetName: string;
  load: () => Promise<{ headers: string[]; rows: ExportRow[] }>;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  especes: 'Espèces',
  card: 'Carte',
  tpe: 'TPE',
  contactless: 'Sans contact',
  voucher: 'Ticket restaurant',
  ticket_restaurant: 'Ticket restaurant',
  split: 'Paiement mixte'
};

const paymentLabel = (method?: string) => PAYMENT_METHOD_LABELS[method || ''] || method || '—';

const DATASETS: DatasetDefinition[] = [
  {
    key: 'sales',
    label: 'Ventes',
    description: 'Historique complet des ventes encaissées.',
    icon: Receipt,
    sheetName: 'Ventes',
    load: async () => {
      const sales = await api.getSales();
      return {
        headers: ['N° vente', 'Date', 'Montant TTC (DT)', 'TVA (DT)', 'Mode de paiement', 'Type', 'Caissier'],
        rows: sales.map(s => [
          s.saleNumber,
          new Date(s.createdAt).toLocaleString('fr-FR'),
          s.totalAmount.toFixed(3),
          s.totalTva.toFixed(3),
          paymentLabel(s.paymentMethod),
          s.consumptionType === 'a_emporter' ? 'À emporter' : 'Sur place',
          s.cashierName
        ])
      };
    }
  },
  {
    key: 'purchases',
    label: 'Achats fournisseurs',
    description: 'Factures fournisseurs et leur statut de paiement.',
    icon: Truck,
    sheetName: 'Factures fournisseurs',
    load: async () => {
      const invoices = await api.getSupplierInvoices();
      return {
        headers: ['N° facture', 'Fournisseur', 'Date facture', 'Échéance', 'Montant TTC (DT)', 'Statut paiement'],
        rows: invoices.map(inv => [
          inv.invoiceNumber,
          inv.supplierName,
          inv.invoiceDate,
          inv.dueDate,
          (inv.totalTTC || inv.totalAmount).toFixed(3),
          inv.paymentStatus === 'paid' ? 'Payée' : inv.paymentStatus === 'partially_paid' ? 'Partiellement payée' : 'Non payée'
        ])
      };
    }
  },
  {
    key: 'expenses',
    label: 'Dépenses',
    description: "Registre des charges d'exploitation.",
    icon: Wallet,
    sheetName: 'Dépenses',
    load: async () => {
      const [expenses, categories] = await Promise.all([api.getExpenses(), api.getExpenseCategories()]);
      const categoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
      return {
        headers: ['N° dépense', 'Intitulé', 'Catégorie', 'Montant (DT)', 'Date', 'Statut'],
        rows: expenses.map(e => [
          e.expenseNumber,
          e.title,
          categoryName(e.category),
          e.amount.toFixed(3),
          e.date,
          e.paymentStatus === 'paid' ? 'Payée' : 'En attente'
        ])
      };
    }
  },
  {
    key: 'stock',
    label: 'Stock (ingrédients)',
    description: 'État et valorisation du stock actuel.',
    icon: Boxes,
    sheetName: 'Stock',
    load: async () => {
      const ingredients = await api.getIngredients();
      return {
        headers: ['Nom', 'Catégorie', 'Stock actuel', 'Unité', 'Seuil minimal', 'Coût unitaire (DT)', 'Valeur stock (DT)'],
        rows: ingredients.map(ing => [
          ing.name,
          INGREDIENT_CATEGORY_LABELS[ing.category] || ing.category,
          ing.currentStock,
          ing.unit,
          ing.minStockThreshold,
          ing.costPerUnit.toFixed(3),
          (Math.max(0, ing.currentStock) * ing.costPerUnit).toFixed(3)
        ])
      };
    }
  },
  {
    key: 'personnel',
    label: 'Personnel (financier)',
    description: 'Salaires de base, avances, primes et paiements.',
    icon: Users,
    sheetName: 'Personnel',
    load: async () => {
      const records = await api.getPersonnelFinancialRecords();
      return {
        headers: ['Employé', 'Date', 'Salaire base (DT)', 'Avances (DT)', 'Primes (DT)', 'Retenues (DT)', 'Payé (DT)', 'Date de paiement'],
        rows: records.map(r => [
          r.employeeName,
          r.date,
          r.baseSalary.toFixed(3),
          r.advances.toFixed(3),
          r.bonuses.toFixed(3),
          r.deductions.toFixed(3),
          r.amountPaid.toFixed(3),
          r.paymentDate || '—'
        ])
      };
    }
  },
  {
    key: 'journal',
    label: "Journal d'activité",
    description: 'Traçabilité complète : qui a fait quoi, et quand.',
    icon: FileText,
    sheetName: 'Journal',
    load: async () => {
      const logs = await api.getJournalLogs();
      return {
        headers: ['Date', 'Heure', 'Module', 'Action', 'Utilisateur', 'Détails', 'Valeur précédente', 'Nouvelle valeur'],
        rows: logs.map(l => [
          new Date(l.createdAt).toLocaleDateString('fr-FR'),
          new Date(l.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          l.category,
          l.action,
          l.performedBy,
          l.details,
          l.previousValue || '',
          l.newValue || ''
        ])
      };
    }
  }
];

export const ExportsTab: React.FC = () => {
  const { showRouteNotification } = useSystem();
  const [loadingKey, setLoadingKey] = useState<`${DatasetKey}-${'csv' | 'excel'}` | null>(null);

  const handleExport = async (dataset: DatasetDefinition, format: 'csv' | 'excel') => {
    const loadingId = `${dataset.key}-${format}` as const;
    try {
      setLoadingKey(loadingId);
      const { headers, rows } = await dataset.load();
      if (rows.length === 0) {
        showRouteNotification(`Aucune donnée à exporter pour "${dataset.label}".`, 'warning');
        return;
      }
      const filename = `${dataset.key}_cafe_noir_${todayFileTag()}`;
      if (format === 'csv') {
        exportToCsv(filename, headers, rows);
      } else {
        exportToExcel(filename, dataset.sheetName, headers, rows);
      }
      showRouteNotification(`Export "${dataset.label}" (${format.toUpperCase()}) généré.`, 'success');
    } catch (err: any) {
      showRouteNotification(`Erreur lors de l'export : ${err.message}`, 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="bg-[#F2F3F0] p-4 sm:p-5 rounded-2xl border border-[#D9DDD8] shadow-xs">
        <h2 className="text-lg font-bold text-[#252A27]">Exports de données</h2>
        <p className="text-xs text-[#555D58] mt-1">
          Téléchargez les données actuelles de chaque module au format Excel (.xlsx) ou CSV, pour votre comptable ou vos propres analyses.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DATASETS.map(dataset => {
          const Icon = dataset.icon;
          const isCsvLoading = loadingKey === `${dataset.key}-csv`;
          const isExcelLoading = loadingKey === `${dataset.key}-excel`;
          return (
            <div key={dataset.key} className="bg-white border border-[#D9DDD8] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ECEEEA] border border-[#D9DDD8] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#252A27]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#252A27]">{dataset.label}</h3>
                  <p className="text-xs text-[#555D58] mt-0.5">{dataset.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleExport(dataset, 'csv')}
                  disabled={loadingKey !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isCsvLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />}
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExport(dataset, 'excel')}
                  disabled={loadingKey !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#252A27] hover:bg-[#343B37] text-[#A4DEC2] text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isExcelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Excel</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
