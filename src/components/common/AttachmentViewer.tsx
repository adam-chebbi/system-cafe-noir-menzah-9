import React, { useState } from 'react';
import { Paperclip, ZoomIn, ZoomOut, X, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachmentViewerProps {
  /** data-URL or remote URL of the attachment */
  url: string | undefined | null;
  /** Filename hint for download */
  filename?: string;
  /** Compact inline button (default) or full badge display */
  variant?: 'button' | 'badge';
}

/**
 * Displays a clickable link that opens an attachment in a modal overlay.
 * Supports base64 data-URLs (images) and regular URLs.
 */
export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  url,
  filename = 'document',
  variant = 'button',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!url) return null;

  const isImage =
    url.startsWith('data:image') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

  const triggerCls =
    variant === 'badge'
      ? 'inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8] text-[11px] font-bold text-[#252A27] hover:bg-white transition-colors cursor-pointer'
      : 'p-1.5 rounded-lg bg-[#ECEEEA] border border-[#D9DDD8] text-[#555D58] hover:text-[#252A27] hover:bg-white transition-colors';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerCls}
        title="Voir la pièce jointe"
      >
        {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
        {variant === 'badge' && <span>Pièce jointe</span>}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          {/* Toolbar */}
          <div className="flex items-center space-x-2 mb-3">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom(z => Math.max(0.3, z - 0.25))}
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-white text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-white/20" />
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[80vh] overflow-auto rounded-xl">
            {isImage ? (
              <img
                src={url}
                alt={filename}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                className="max-w-full rounded-xl shadow-2xl transition-transform duration-150"
              />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center space-y-3 max-w-xs">
                <FileText className="w-12 h-12 text-[#555D58] mx-auto" />
                <p className="text-sm font-semibold text-[#252A27]">{filename}</p>
                <p className="text-xs text-[#555D58]">Prévisualisation non disponible pour ce type de fichier.</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-[#252A27] text-white text-xs font-bold"
                >
                  Télécharger
                </button>
              </div>
            )}
          </div>

          <p className="text-white/40 text-[11px] mt-3">Cliquez en dehors pour fermer</p>
        </div>
      )}
    </>
  );
};

/**
 * Converts a File object to a base64 data URL string.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compact attachment upload trigger (camera / file picker).
 */
interface AttachmentUploadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  value,
  onChange,
  label = 'Joindre un document',
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onChange(dataUrl);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFile}
        capture="environment"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#ECEEEA] hover:bg-white border border-[#D9DDD8] text-xs font-bold text-[#252A27] transition-colors"
      >
        <Paperclip className="w-3.5 h-3.5" />
        <span>{value ? 'Changer le document' : label}</span>
      </button>
      {value && (
        <>
          <AttachmentViewer url={value} variant="badge" filename="document" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded-lg text-[#555D58] hover:text-rose-700 hover:bg-rose-50 transition-colors"
            title="Supprimer la pièce jointe"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
