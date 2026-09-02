import React from 'react';
import { Table, Space } from '../../types';
import { QrCode, Printer, X, ExternalLink } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  space?: Space;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({ isOpen, onClose, table, space }) => {
  const { setCurrentView, setActiveQrTableId } = useSystem();
  if (!isOpen || !table) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleTestClientSession = () => {
    setActiveQrTableId(table.id);
    setCurrentView('qr_customer_order');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
        {/* Actions header (no-print) */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9DDD8] no-print">
          <span className="font-bold text-xs text-[#252A27]">Chevalet QR Code de Table</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-[#ECEEEA] text-[#555D58] hover:text-[#252A27] transition-colors border border-[#D9DDD8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Table QR Display Stand */}
        <div className="receipt-print bg-[#F7F7F5] p-5 rounded-xl border border-[#D9DDD8] text-center space-y-3.5">
          <div>
            <h3 className="font-serif font-bold text-base tracking-wider text-[#252A27]">
              CAFÉ NOIR
            </h3>
            <p className="text-[11px] text-[#555D58] mt-0.5">Scannez pour commander sans contact</p>
          </div>

          {/* QR Code Canvas / Image */}
          <div className="bg-white p-3.5 rounded-xl border border-[#D9DDD8] inline-block shadow-2xs">
            {table.qrCodeUrl ? (
              <img
                src={table.qrCodeUrl}
                alt={`QR Table ${table.number}`}
                className="w-44 h-44 mx-auto object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-[#ECEEEA] text-[#555D58]">
                <QrCode className="w-14 h-14" />
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="inline-block px-3 py-0.5 rounded-md bg-[#252A27] text-[#A4DEC2] font-bold text-xs tracking-wider">
              TABLE {table.number}
            </div>
            <p className="text-[11px] text-[#555D58] font-medium pt-1">
              {space?.name || 'Salle'} &bull; {table.capacity} personnes
            </p>
          </div>

          <p className="text-[10px] text-[#555D58] pt-2 border-t border-[#D9DDD8]">
            Pointez l'appareil photo de votre smartphone pour ouvrir la carte & passer commande
          </p>
        </div>

        {/* Test live button (no-print) */}
        <div className="mt-3.5 space-y-2 no-print">
          <button
            onClick={handleTestClientSession}
            className="w-full py-2.5 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] active:bg-[#6DBE96] text-[#252A27] text-xs font-bold flex items-center justify-center space-x-2 border border-[#8BCFAE] transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Tester la commande client sur Table {table.number}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
