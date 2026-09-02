import React, { useState, useEffect } from 'react';
import { CashRegisterSession, CashMovement, User } from '../../types';
import { api } from '../../services/api';
import { useSystem } from '../../context/SystemContext';
import { SessionClosingModal } from './SessionClosingModal';
import {
  Lock,
  Unlock,
  DollarSign,
  PlusCircle,
  MinusCircle,
  Receipt,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  X,
  CreditCard,
  Banknote,
  Percent,
  RefreshCw
} from 'lucide-react';

interface CashRegisterManagerProps {
  activeRegister: CashRegisterSession | null;
  currentUser: User | null;
  onRefresh: () => Promise<void>;
}

export const CashRegisterManager: React.FC<CashRegisterManagerProps> = ({
  activeRegister,
  currentUser,
  onRefresh
}) => {
  const { showRouteNotification } = useSystem();
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('150');

  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal' | 'expense'>('deposit');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);

  const [selectedSessionForZReport, setSelectedSessionForZReport] = useState<CashRegisterSession | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [histSessions, movs] = await Promise.all([
        api.getRegisterSessions(),
        activeRegister ? api.getCashMovements(activeRegister.id) : Promise.resolve([])
      ]);
      setSessions(histSessions);
      setMovements(movs);
    } catch (err) {
      console.error('Failed to load register sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeRegister?.id]);

  // Open register handler
  const handleOpenRegister = async () => {
    setActionLoading(true);
    try {
      await api.openRegister(
        currentUser?.id || 'usr_staff',
        currentUser?.name || 'Caissier',
        parseFloat(openingCashInput) || 0
      );
      setIsOpeningModalOpen(false);
      showRouteNotification('Caisse ouverte avec succès', 'success');
      await onRefresh();
      await loadData();
    } catch (err: any) {
      showRouteNotification(`Erreur d'ouverture: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Add movement handler
  const handleAddMovement = async () => {
    if (!activeRegister || !movementAmount) return;
    setActionLoading(true);
    try {
      await api.addCashMovement(activeRegister.id, {
        type: movementType,
        amount: parseFloat(movementAmount) || 0,
        reason: movementReason || 'Mouvement de caisse',
        performedBy: currentUser?.name || 'Caissier'
      });
      setIsMovementModalOpen(false);
      setMovementAmount('');
      setMovementReason('');
      showRouteNotification('Mouvement de caisse enregistré', 'success');
      await onRefresh();
      await loadData();
    } catch (err: any) {
      showRouteNotification(`Erreur: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Callback when SessionClosingModal confirms the closure
  const handleSessionClosed = async (closedSession: CashRegisterSession) => {
    setSelectedSessionForZReport(closedSession);
    showRouteNotification('Clôture de caisse (Ticket Z) effectuée avec succès', 'success');
    await onRefresh();
    await loadData();
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F7F5] overflow-hidden">
      {/* Top Header Banner */}
      <div className="p-4 bg-white border-b border-[#D9DDD8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              activeRegister
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            {activeRegister ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-serif font-black text-[#252A27]">
              {activeRegister ? 'Caisse Ouverte & Opérationnelle' : 'Caisse Actuellement Fermée'}
            </h2>
            <p className="text-xs text-[#555D58]">
              {activeRegister
                ? `Ouverte par ${activeRegister.cashierName} le ${new Date(activeRegister.openedAt).toLocaleString('fr-FR')}`
                : 'Une ouverture de caisse avec fond initial est nécessaire pour démarrer le service'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeRegister ? (
            <>
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-white border border-[#D9DDD8] text-xs font-bold text-[#252A27] hover:bg-[#ECEEEA] transition-colors flex items-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Mouvement d'Espèces</span>
              </button>
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-2xs flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Clôturer la Caisse (Z)</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-all shadow-xs border border-[#8BCFAE] flex items-center space-x-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Ouvrir une Session de Caisse</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-white border border-[#D9DDD8] text-[#252A27] hover:bg-[#ECEEEA]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Session Dashboard Cards */}
        {activeRegister && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] space-y-1">
              <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
                Fond de Caisse Initial
              </span>
              <span className="text-xl font-serif font-black text-[#252A27]">
                {activeRegister.openingCash.toFixed(3)} DT
              </span>
              <span className="text-[11px] text-[#555D58] block">Saisi à l'ouverture</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] space-y-1">
              <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
                Espèces Théoriques en Tiroir
              </span>
              <span className="text-xl font-serif font-black text-emerald-800">
                {activeRegister.expectedClosingCash.toFixed(3)} DT
              </span>
              <span className="text-[11px] text-[#555D58] block">
                Fond + Ventes Espèces ({activeRegister.totalSalesCash.toFixed(3)} DT)
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] space-y-1">
              <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
                Ventes Cartes & Sans Contact
              </span>
              <span className="text-xl font-serif font-black text-blue-800">
                {activeRegister.totalSalesCard.toFixed(3)} DT
              </span>
              <span className="text-[11px] text-[#555D58] block">TPE / Bancaire</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#D9DDD8] space-y-1">
              <span className="text-[10px] font-bold text-[#555D58] uppercase tracking-wider block">
                Chiffre d'Affaires Session
              </span>
              <span className="text-xl font-serif font-black text-[#252A27]">
                {activeRegister.totalSalesAmount.toFixed(3)} DT
              </span>
              <span className="text-[11px] text-[#555D58] block">Tous modes de paiement</span>
            </div>
          </div>
        )}

        {/* Cash Movements Ledger */}
        {activeRegister && (
          <div className="bg-white rounded-xl border border-[#D9DDD8] p-4 space-y-3 shadow-2xs">
            <div className="flex justify-between items-center pb-2 border-b border-[#ECEEEA]">
              <h3 className="font-bold text-xs text-[#252A27] uppercase tracking-wider">
                Mouvements de Caisse de la Session ({movements.length})
              </h3>
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="text-xs font-bold text-[#252A27] hover:underline flex items-center space-x-1"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Nouveau mouvement</span>
              </button>
            </div>

            {movements.length === 0 ? (
              <p className="text-xs text-[#555D58] py-2">
                Aucun mouvement d'espèces enregistré (apport, retrait, dépense) pour cette session.
              </p>
            ) : (
              <div className="divide-y divide-[#ECEEEA]">
                {movements.map(m => (
                  <div key={m.id} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#252A27] mr-2">
                        {m.type === 'deposit'
                          ? 'Apport de fond'
                          : m.type === 'withdrawal'
                          ? 'Retrait d\'espèces'
                          : 'Dépense directe'}
                      </span>
                      <span className="text-[#555D58]">({m.reason})</span>
                      <span className="text-[10px] text-[#555D58] block">
                        Par {m.performedByName} à {new Date(m.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <span
                      className={`font-serif font-black text-sm ${
                        m.type === 'deposit' ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {m.type === 'deposit' ? `+${m.amount.toFixed(3)}` : `-${m.amount.toFixed(3)}`} DT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Historical Closed Sessions (Rapports Z) */}
        <div className="bg-white rounded-xl border border-[#D9DDD8] p-4 space-y-3 shadow-2xs">
          <h3 className="font-bold text-xs text-[#252A27] uppercase tracking-wider pb-2 border-b border-[#ECEEEA]">
            Historique des Clôtures de Caisse (Rapports Z)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2F3F0] text-[#555D58] font-bold border-b border-[#D9DDD8]">
                <tr>
                  <th className="p-2.5">Date Ouverture</th>
                  <th className="p-2.5">Date Clôture</th>
                  <th className="p-2.5">Caissier</th>
                  <th className="p-2.5 text-right">Fond Init.</th>
                  <th className="p-2.5 text-right">CA Total</th>
                  <th className="p-2.5 text-right">Espèces Réelles</th>
                  <th className="p-2.5 text-center">Écart</th>
                  <th className="p-2.5 text-center">Statut</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEEA]">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-[#F7F7F5]">
                    <td className="p-2.5 font-medium">
                      {new Date(s.openedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-2.5 text-[#555D58]">
                      {s.closedAt
                        ? new Date(s.closedAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td className="p-2.5 font-medium text-[#252A27]">{s.cashierName}</td>
                    <td className="p-2.5 text-right font-medium">{s.openingCash.toFixed(3)} DT</td>
                    <td className="p-2.5 text-right font-serif font-bold text-[#252A27]">
                      {s.totalSalesAmount.toFixed(3)} DT
                    </td>
                    <td className="p-2.5 text-right font-medium">
                      {s.actualClosingCash !== undefined ? `${s.actualClosingCash.toFixed(3)} DT` : '-'}
                    </td>
                    <td className="p-2.5 text-center">
                      {s.discrepancy !== undefined ? (
                        <span
                          className={`font-bold ${
                            s.discrepancy === 0
                              ? 'text-emerald-700'
                              : s.discrepancy > 0
                              ? 'text-blue-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {s.discrepancy > 0 ? `+${s.discrepancy.toFixed(2)}` : s.discrepancy.toFixed(3)} DT
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'open'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                        }`}
                      >
                        {s.status === 'open' ? 'En cours' : 'Clôturée (Z)'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      {s.status === 'closed' && (
                        <button
                          onClick={() => setSelectedSessionForZReport(s)}
                          className="px-2 py-1 rounded bg-[#252A27] text-[#A4DEC2] text-[11px] font-bold hover:bg-[#343B37] transition-colors"
                        >
                          Ticket Z
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: OPEN REGISTER */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#252A27] mb-1">Ouverture de Caisse</h3>
            <p className="text-xs text-[#555D58] mb-4">
              Indiquez le montant du fond de caisse initial déposé dans le tiroir.
            </p>

            <div className="space-y-3 mb-4">
              <label className="text-xs font-bold text-[#252A27]">Fond de caisse initial (DT) :</label>
              <input
                type="number"
                step="5"
                value={openingCashInput}
                onChange={e => setOpeningCashInput(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#D9DDD8] rounded-lg text-sm font-bold text-[#252A27]"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleOpenRegister}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-lg bg-[#A4DEC2] hover:bg-[#8BCFAE] text-[#252A27] text-xs font-black transition-colors"
              >
                {actionLoading ? 'Ouverture...' : 'Valider l\'Ouverture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CASH MOVEMENT */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-md w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#252A27] mb-1">Mouvement d'Espèces</h3>
            <p className="text-xs text-[#555D58] mb-4">
              Enregistrez un apport, un retrait pour dépôt bancaire ou un achat direct.
            </p>

            <div className="space-y-3 mb-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#252A27]">Type de mouvement :</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('deposit')}
                    className={`p-2 rounded-lg text-xs font-bold border ${
                      movementType === 'deposit' ? 'bg-[#252A27] text-[#A4DEC2]' : 'bg-white text-[#252A27]'
                    }`}
                  >
                    Apport (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('withdrawal')}
                    className={`p-2 rounded-lg text-xs font-bold border ${
                      movementType === 'withdrawal' ? 'bg-[#252A27] text-[#A4DEC2]' : 'bg-white text-[#252A27]'
                    }`}
                  >
                    Retrait (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('expense')}
                    className={`p-2 rounded-lg text-xs font-bold border ${
                      movementType === 'expense' ? 'bg-[#252A27] text-[#A4DEC2]' : 'bg-white text-[#252A27]'
                    }`}
                  >
                    Dépense (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#252A27]">Montant (DT) :</label>
                <input
                  type="number"
                  step="0.5"
                  value={movementAmount}
                  onChange={e => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs font-bold text-[#252A27]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#252A27]">Motif / Justification :</label>
                <input
                  type="text"
                  placeholder="Ex: Achat lait de secours épicerie, monnaie banque..."
                  value={movementReason}
                  onChange={e => setMovementReason(e.target.value)}
                  className="w-full p-2 bg-white border border-[#D9DDD8] rounded-lg text-xs text-[#252A27]"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(false)}
                className="flex-1 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddMovement}
                disabled={actionLoading || !movementAmount}
                className="flex-1 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold hover:bg-[#343B37] disabled:opacity-40"
              >
                {actionLoading ? 'Enregistrement...' : 'Valider le Mouvement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE REGISTER (Z) — Wizard Multi-Étapes */}
      {isClosingModalOpen && activeRegister && (
        <SessionClosingModal
          isOpen={isClosingModalOpen}
          onClose={() => setIsClosingModalOpen(false)}
          session={activeRegister}
          performedBy={currentUser?.name || 'Caissier'}
          onClosed={handleSessionClosed}
        />
      )}

      {/* OFFICIAL Z REPORT MODAL */}
      {selectedSessionForZReport && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F2F3F0] rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#C7CDC8] animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-[#D9DDD8]">
              <h3 className="font-bold text-sm text-[#252A27]">Rapport de Clôture Z</h3>
              <button
                onClick={() => setSelectedSessionForZReport(null)}
                className="p-1 rounded bg-[#ECEEEA] text-[#555D58]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal style Z Ticket */}
            <div className="my-3 bg-white p-4 rounded-xl border border-[#D9DDD8] font-mono text-xs text-[#252A27] space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-[#C7CDC8]">
                <h4 className="font-bold text-sm">CAFÉ NOIR</h4>
                <p className="text-[10px] text-[#555D58]">RAPPORT OFFICIEL Z DE CAISSE</p>
                <p className="text-[10px] text-[#555D58]">
                  Du : {new Date(selectedSessionForZReport.openedAt).toLocaleDateString('fr-FR')} au{' '}
                  {selectedSessionForZReport.closedAt
                    ? new Date(selectedSessionForZReport.closedAt).toLocaleDateString('fr-FR')
                    : ''}
                </p>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-[#C7CDC8]">
                <div className="flex justify-between">
                  <span>Fond initial :</span>
                  <span>{selectedSessionForZReport.openingCash.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Espèces :</span>
                  <span>{selectedSessionForZReport.totalSalesCash.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cartes :</span>
                  <span>{selectedSessionForZReport.totalSalesCard.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Autres :</span>
                  <span>{selectedSessionForZReport.totalSalesOther.toFixed(3)} DT</span>
                </div>
              </div>

              <div className="pt-1 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>TOTAL CA TTC :</span>
                  <span>{selectedSessionForZReport.totalSalesAmount.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between">
                  <span>Espèces réelles :</span>
                  <span>{selectedSessionForZReport.actualClosingCash?.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Écart de caisse :</span>
                  <span>{selectedSessionForZReport.cashDifference !== undefined ? `${selectedSessionForZReport.cashDifference > 0 ? '+' : ''}${selectedSessionForZReport.cashDifference.toFixed(3)} DT` : '0.00 DT'}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-[#D9DDD8]">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-[#252A27] text-[#A4DEC2] text-xs font-bold flex items-center justify-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Z</span>
              </button>
              <button
                onClick={() => setSelectedSessionForZReport(null)}
                className="px-4 py-2 rounded-lg bg-[#ECEEEA] text-xs font-bold text-[#252A27] border border-[#D9DDD8]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
