import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import { User, Sale } from '../../types';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Check,
  RefreshCw,
  FileText,
  HelpCircle
} from 'lucide-react';

interface SalesExcelCsvImportProps {
  currentUser: User | null;
  onImportCompleted: () => void;
}

interface ParsedSaleRow {
  rowNumber: number;
  date: string;
  tableNumber: string;
  productName: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  paymentMethod: string;
  consumptionType: string;
  ticketCount: number;
  cashierName: string;
  notes: string;
  isValid: boolean;
  errors: string[];
}

export const SalesExcelCsvImport: React.FC<SalesExcelCsvImportProps> = ({
  currentUser,
  onImportCompleted
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedSaleRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Handle File Upload (Excel or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse JSON rows
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawJson.length < 2) {
          setErrorMsg('Le fichier sélectionné est vide ou ne contient pas d\'en-tête.');
          setParsedRows([]);
          return;
        }

        // Header is row 0
        const rows: ParsedSaleRow[] = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

          // Expected columns: Date, Table, Produit, Variante, Quantité, Prix, TVA, Mode Paiement, Consommation, Tickets, Caissier, Notes
          const dateStr = row[0] ? String(row[0]).trim() : new Date().toISOString();
          const tableStr = row[1] ? String(row[1]).trim() : 'Sur place';
          const productStr = row[2] ? String(row[2]).trim() : '';
          const variantStr = row[3] ? String(row[3]).trim() : '';
          const qty = parseInt(row[4]) || 1;
          const price = parseFloat(String(row[5]).replace(',', '.')) || 0;
          const tva = parseFloat(String(row[6]).replace(',', '.')) || 7;
          const payStr = row[7] ? String(row[7]).trim() : 'Espèces';
          const consStr = row[8] ? String(row[8]).trim() : 'Sur place';
          const tickets = parseInt(row[9]) || 1;
          const cashierStr = row[10] ? String(row[10]).trim() : currentUser?.name || 'Administrateur';
          const notesStr = row[11] ? String(row[11]).trim() : 'Import Excel/CSV';

          const errors: string[] = [];
          if (!productStr) errors.push('Nom de produit manquant');
          if (price <= 0) errors.push('Prix unitaire invalide (> 0)');
          if (qty <= 0) errors.push('Quantité invalide (>= 1)');

          rows.push({
            rowNumber: i + 1,
            date: dateStr,
            tableNumber: tableStr,
            productName: productStr,
            variant: variantStr,
            quantity: qty,
            unitPrice: price,
            tvaRate: tva,
            paymentMethod: payStr,
            consumptionType: consStr,
            ticketCount: tickets,
            cashierName: cashierStr,
            notes: notesStr,
            isValid: errors.length === 0,
            errors
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        setErrorMsg(`Erreur lors de la lecture du fichier : ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      [
        'Date (AAAA-MM-JJ HH:MM)',
        'Table / Emplacement',
        'Produit',
        'Variante',
        'Quantité',
        'Prix Unitaire TTC (DT)',
        'TVA %',
        'Mode de Paiement (Espèces / TPE / Ticket restaurant)',
        'Type de Consommation (Sur place / À emporter)',
        'Nombre de Tickets',
        'Caissier / Opérateur',
        'Notes & Références'
      ],
      [
        new Date().toISOString().slice(0, 16).replace('T', ' '),
        'Table 1',
        'Café Espresso',
        'Simple',
        2,
        3.500,
        7,
        'Espèces',
        'Sur place',
        1,
        currentUser?.name || 'Administrateur',
        'Ticket caisse n°101'
      ],
      [
        new Date().toISOString().slice(0, 16).replace('T', ' '),
        'Comptoir',
        'Cappuccino Viennois',
        'Grand',
        1,
        5.800,
        7,
        'TPE',
        'À emporter',
        1,
        currentUser?.name || 'Administrateur',
        'Paiement sans contact TPE'
      ],
      [
        new Date().toISOString().slice(0, 16).replace('T', ' '),
        'Table 5',
        'Cheesecake Spéculoos',
        'Part entière',
        2,
        8.000,
        7,
        'Ticket restaurant',
        'Sur place',
        2,
        currentUser?.name || 'Administrateur',
        'Règlement par titre repas'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle_Ventes');
    XLSX.writeFile(wb, 'modele_import_ventes_cafe_noir.xlsx');
  };

  // Commit and Import batch
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const batchPayload = validRows.map(r => ({
        date: r.date,
        tableNumber: r.tableNumber,
        productName: r.productName,
        variant: r.variant,
        unitPrice: r.unitPrice,
        quantity: r.quantity,
        tvaRate: r.tvaRate,
        paymentMethod: r.paymentMethod,
        consumptionType: r.consumptionType,
        ticketCount: r.ticketCount,
        cashierName: r.cashierName,
        notes: r.notes
      }));

      const res = await api.importSalesBatch(batchPayload, currentUser?.name || 'Administrateur');
      setImportResult(res);
      setParsedRows([]);
      setFileName('');
      onImportCompleted();
    } catch (err: any) {
      setErrorMsg(`Erreur d'importation : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const totalAmountEstimated = parsedRows
    .filter(r => r.isValid)
    .reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-y-auto p-4 max-w-5xl mx-auto w-full space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D9DDD8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-black text-lg text-[#252A27]">
            Importation de Ventes par Fichier Excel & CSV
          </h2>
          <p className="text-xs text-[#555D58]">
            Intégrez en masse vos ventes historiques, récapitulatifs ou relevés de service (.xlsx, .xls, .csv)
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 rounded-xl bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-all flex items-center space-x-1.5 shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Télécharger le Modèle Excel</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {importResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 space-y-2 animate-in fade-in">
          <p className="font-bold flex items-center space-x-2 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>Importation réussie avec succès !</span>
          </p>
          <p>
            <strong>{importResult.importedCount} vente(s)</strong> ont été enregistrées pour un chiffre d'affaires total de{' '}
            <strong>{importResult.totalAmount.toFixed(3)} DT</strong>.
          </p>
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="pt-2 border-t border-emerald-200 text-rose-700 space-y-1">
              <p className="font-bold">Avertissements ({importResult.errors.length}) :</p>
              <ul className="list-disc list-inside">
                {importResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-[#D9DDD8] p-6 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-[#ECEEEA] text-[#252A27] flex items-center justify-center mx-auto border border-[#D9DDD8]">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-bold text-sm text-[#252A27]">
            {fileName ? `Fichier sélectionné : ${fileName}` : 'Glissez-déposez votre fichier Excel ou CSV ici'}
          </h3>
          <p className="text-xs text-[#555D58] mt-1">
            Formats acceptés : .xlsx, .xls, .csv &bull; Respectez les colonnes du modèle
          </p>
        </div>

        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          className="hidden"
          id="sales-file-upload-input"
        />

        <label
          htmlFor="sales-file-upload-input"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#252A27] text-[#A4DEC2] text-xs font-black cursor-pointer hover:bg-[#343B37] transition-all shadow-xs"
        >
          <Upload className="w-4 h-4" />
          <span>Parcourir les fichiers</span>
        </label>
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D9DDD8] p-4 sm:p-5 space-y-4 shadow-2xs animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ECEEEA]">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#252A27]">
                Prévisualisation & Contrôle de Cohérence ({parsedRows.length} lignes)
              </h3>
              <p className="text-xs text-[#555D58]">
                Lignes valides : <strong className="text-emerald-700">{validCount}</strong> &bull; Lignes avec erreurs :{' '}
                <strong className={invalidCount > 0 ? 'text-rose-700' : 'text-[#555D58]'}>{invalidCount}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-[#555D58] uppercase block">Total estimé :</span>
              <span className="font-serif font-black text-base text-[#252A27]">
                {totalAmountEstimated.toFixed(3)} DT
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto border border-[#D9DDD8] rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2F3F0] text-[#555D58] font-bold border-b border-[#D9DDD8] sticky top-0">
                <tr>
                  <th className="p-2.5">Ligne</th>
                  <th className="p-2.5">Statut</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Produit & Variante</th>
                  <th className="p-2.5 text-center">Qté</th>
                  <th className="p-2.5 text-right">Prix Unit.</th>
                  <th className="p-2.5 text-right">Total</th>
                  <th className="p-2.5">Paiement</th>
                  <th className="p-2.5">Consommation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEEA]">
                {parsedRows.map(r => (
                  <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-[#F7F7F5]' : 'bg-rose-50/60'}>
                    <td className="p-2.5 font-bold text-[#555D58]">#{r.rowNumber}</td>
                    <td className="p-2.5">
                      {r.isValid ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Valide
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold cursor-help"
                          title={r.errors.join(', ')}
                        >
                          Erreur
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-[#555D58]">{r.date}</td>
                    <td className="p-2.5 font-bold text-[#252A27]">
                      {r.productName}
                      {r.variant && <span className="text-[10px] font-normal text-[#555D58] block">↳ {r.variant}</span>}
                    </td>
                    <td className="p-2.5 text-center font-bold">{r.quantity}</td>
                    <td className="p-2.5 text-right">{r.unitPrice.toFixed(3)} DT</td>
                    <td className="p-2.5 text-right font-serif font-black text-[#252A27]">
                      {(r.quantity * r.unitPrice).toFixed(3)} DT
                    </td>
                    <td className="p-2.5 text-[11px] uppercase font-bold text-[#555D58]">{r.paymentMethod}</td>
                    <td className="p-2.5 text-[11px] text-[#555D58]">{r.consumptionType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={loading || validCount === 0}
            className="w-full py-3 rounded-xl bg-[#A4DEC2] hover:bg-[#8BCFAE] disabled:opacity-50 text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importation par lot en cours...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmer et Enregistrer les {validCount} ventes valides ({totalAmountEstimated.toFixed(3)} DT)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
