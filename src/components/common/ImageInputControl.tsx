import React, { useState, useRef } from 'react';
import { ItemThumbnail } from './ItemThumbnail';
import { useSystem } from '../../context/SystemContext';
import {
  Image as ImageIcon,
  Upload,
  Link,
  Sparkles,
  X,
  Check,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export interface ImageInputControlProps {
  value: string;
  onChange: (imageUrl: string) => void;
  label?: string;
  category?: string;
  type?: 'product' | 'ingredient';
  helperText?: string;
}

const PRESET_GALLERY = {
  product: [
    { label: 'Espresso', url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=80' },
    { label: 'Flat White / Latte', url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=500&auto=format&fit=crop&q=80' },
    { label: 'Iced Latte', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80' },
    { label: 'Matcha Latte', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80' },
    { label: 'Cappuccino', url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80' },
    { label: 'Croissant Pur Beurre', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80' },
    { label: 'Cookie Chocolat', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80' },
    { label: 'Avocado Toast', url: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=500&auto=format&fit=crop&q=80' },
    { label: 'Cold Brew / Jus', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80' }
  ],
  ingredient: [
    { label: 'Grains Éthiopie', url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=500&auto=format&fit=crop&q=80' },
    { label: 'Grains Colombie', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80' },
    { label: 'Lait Bio Entier', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80' },
    { label: 'Lait Avoine Barista', url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500&auto=format&fit=crop&q=80' },
    { label: 'Vanille Bourbon', url: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=500&auto=format&fit=crop&q=80' },
    { label: 'Caramel Beurre Salé', url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=500&auto=format&fit=crop&q=80' },
    { label: 'Poudre Matcha Uji', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80' },
    { label: 'Avocats Frais', url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&auto=format&fit=crop&q=80' },
    { label: 'Pain au Levain', url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=500&auto=format&fit=crop&q=80' }
  ]
};

export const ImageInputControl: React.FC<ImageInputControlProps> = ({
  value,
  onChange,
  label = 'Illustration / Photo',
  category = '',
  type = 'product',
  helperText = 'URL Web ou import de fichier local (JPG, PNG, WebP)'
}) => {
  const { showRouteNotification } = useSystem();
  const [showPresets, setShowPresets] = useState(false);
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = PRESET_GALLERY[type] || PRESET_GALLERY.product;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showRouteNotification('Veuillez sélectionner un fichier image valide.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[#252A27] flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#555D58]" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-[10px] font-bold text-[#252A27] hover:text-black flex items-center space-x-1 bg-[#ECEEEA] px-2 py-0.5 rounded-md border border-[#D9DDD8] transition-colors"
        >
          <Sparkles className="w-3 h-3 text-[#A4DEC2]" />
          <span>{showPresets ? 'Masquer suggestions' : 'Galerie rapide'}</span>
        </button>
      </div>

      {/* Main Preview and Input Box */}
      <div className="p-3 bg-white rounded-xl border border-[#D9DDD8] shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          {/* Live Thumbnail Preview */}
          <div className="relative group shrink-0">
            <ItemThumbnail
              src={value}
              alt="Aperçu"
              category={category}
              type={type}
              size="lg"
              rounded="xl"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-xs transition-colors"
                title="Supprimer l'image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Input Controls */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center space-x-1 bg-[#F7F7F5] p-0.5 rounded-lg border border-[#D9DDD8] w-fit">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center space-x-1 ${
                  mode === 'url'
                    ? 'bg-[#252A27] text-white shadow-2xs'
                    : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <Link className="w-3 h-3" />
                <span>Lien URL</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('upload');
                  fileInputRef.current?.click();
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center space-x-1 ${
                  mode === 'upload'
                    ? 'bg-[#252A27] text-white shadow-2xs'
                    : 'text-[#555D58] hover:text-[#252A27]'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Importer Fichier</span>
              </button>
            </div>

            {mode === 'url' ? (
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  className="w-full pl-2.5 pr-8 py-1.5 bg-[#F7F7F5] border border-[#D9DDD8] rounded-lg text-xs font-medium text-[#252A27] placeholder:text-[#555D58] focus:outline-none focus:border-[#252A27]"
                />
                {value && (
                  <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#555D58] hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#ECEEEA] hover:bg-[#D9DDD8] text-[#252A27] text-xs font-bold rounded-lg border border-[#D9DDD8] flex items-center space-x-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{value.startsWith('data:') ? 'Changer l\'image locale' : 'Sélectionner une image locale'}</span>
                </button>
                {value.startsWith('data:') && (
                  <span className="text-[10px] text-emerald-800 font-bold flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Image locale chargée</span>
                  </span>
                )}
              </div>
            )}
            <p className="text-[10px] text-[#555D58]">{helperText}</p>
          </div>
        </div>

        {/* Quick Presets Gallery Drawer */}
        {showPresets && (
          <div className="pt-3 border-t border-[#ECEEEA] space-y-2 animate-in fade-in duration-150">
            <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
              Suggestions de photos Café Noir en 1 clic :
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {presets.map((preset, idx) => {
                const isSelected = value === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(preset.url);
                      setMode('url');
                    }}
                    className={`p-1.5 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-[#A4DEC2]/30 border-[#252A27] ring-1 ring-[#252A27]'
                        : 'bg-[#F7F7F5] border-[#D9DDD8] hover:bg-[#ECEEEA]'
                    }`}
                  >
                    <ItemThumbnail
                      src={preset.url}
                      alt={preset.label}
                      size="sm"
                      rounded="lg"
                    />
                    <span className="text-[11px] font-semibold text-[#252A27] truncate">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
