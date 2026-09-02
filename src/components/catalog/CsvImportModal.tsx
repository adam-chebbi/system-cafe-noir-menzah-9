import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { FileSpreadsheet, Upload, Download, Check, AlertCircle, X } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { showRouteNotification } = useSystem();
  const [csvContent, setCsvContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) return;
    try {
      setLoading(true);
      const res = await api.importProductsCsv(csvContent, currentUser?.name || 'Admin');
      setResult(res);
      if (res.imported > 0) {
        showRouteNotification(`${res.imported} produit(s) importé(s) avec succès`, 'success');
        onSuccess();
      }
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  const sampleCsv = `ID;Nom;Categorie;Prix;TVA;Disponible;Station;Description;Image
prod_101;Cold Brew Signature;Boissons Fraîches;5.50;10;OUI;bar;Infusion à froid 18h grains Colombie;https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80
prod_102;Matcha Latte Bio;Thés & Infusions;5.20;10;OUI;bar;Matcha de cérémonie Uji et lait végétal;https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80
prod_103;Cinnamon Roll Artisanal;Pâtisseries & Brunch;4.80;10;OUI;kitchen;Roulé à la cannelle de Ceylan glacé;`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_produits_cafe_noir.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9DDD8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#252A27]">Importer des Produits (CSV)</h3>
              <p className="text-[11px] text-[#555D58]">Mise à jour groupée du catalogue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-[#ECEEEA] text-[#252A27] border border-[#D9DDD8]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Download sample */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#D9DDD8]">
            <div className="text-xs text-[#555D58]">
              <span className="font-bold text-[#252A27] block text-[11px]">Format attendu :</span>
              Séparateur point-virgule (;) · Colonnes : ID, Nom, Catégorie, Prix, TVA, Disponible, Station, Description, <span className="font-semibold text-[#252A27]">Image (URL)</span>
            </div>
            <button
              onClick={handleDownloadSample}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8] text-xs font-bold text-[#252A27] hover:bg-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Modèle CSV</span>
            </button>
          </div>

          {/* File dropzone */}
          <div className="border-2 border-dashed border-[#D9DDD8] hover:border-[#252A27] rounded-xl p-5 text-center cursor-pointer bg-white transition-colors relative">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-[#555D58] mx-auto mb-1.5" />
            <p className="text-xs font-bold text-[#252A27]">Cliquez ou glissez votre fichier CSV ici</p>
            <p className="text-[10px] text-[#555D58]">Format UTF-8 recommandé</p>
          </div>

          {csvContent && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#252A27]">
                Aperçu du contenu ({csvContent.split('\n').length} lignes)
              </label>
              <textarea
                rows={3}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg font-mono text-[10px] text-[#252A27] focus:outline-none focus:border-[#252A27]"
              />
            </div>
          )}

          {result && (
            <div
              className={`p-2.5 rounded-xl text-xs ${
                result.imported > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <p className="font-bold">
                {result.imported} produit(s) importé(s) ou mis à jour avec succès !
              </p>
              {result.errors.length > 0 && (
                <ul className="list-disc list-inside mt-1 text-[10px] space-y-0.5">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="pt-2 flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
            >
              Fermer
            </button>
            <button
              onClick={handleImport}
              disabled={!csvContent || loading}
              className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-bold border border-[#8BCFAE] transition-colors disabled:opacity-40 shadow-2xs"
            >
              {loading ? 'Importation...' : 'Lancer l’importation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
