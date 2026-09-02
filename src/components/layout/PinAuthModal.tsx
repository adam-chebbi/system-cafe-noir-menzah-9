import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Delete, UserCheck, CheckCircle2, X } from 'lucide-react';

export const PinAuthModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { loginWithPin, users } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const verifyPin = async (inputPin: string) => {
    setLoading(true);
    try {
      const ok = await loginWithPin(inputPin);
      if (ok) {
        setPin('');
        onClose();
      } else {
        setError('Code PIN invalide. Réessayez.');
        setPin('');
      }
    } catch (_) {
      setError('Erreur d’authentification');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F2F3F0] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#C7CDC8] text-center animate-in zoom-in-95 duration-150 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#555D58] hover:text-[#252A27] transition-colors border border-[#D9DDD8]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-[#252A27] text-[#A4DEC2] flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-5 h-5" />
        </div>

        <h3 className="font-serif font-bold text-lg text-[#252A27]">Identification Équipe</h3>
        <p className="text-xs text-[#555D58] mt-0.5 mb-5">
          Saisissez votre code PIN à 4 chiffres
        </p>

        {/* PIN indicator dots */}
        <div className="flex justify-center space-x-3 mb-5">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                i < pin.length
                  ? 'bg-[#252A27] border-[#252A27] scale-110'
                  : 'border-[#D9DDD8] bg-[#ECEEEA]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-semibold text-[#D96B61] mb-4 bg-[#D96B61]/15 py-1.5 px-3 rounded-lg border border-[#D96B61]/30">
            {error}
          </p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              id={`pin-btn-${d}`}
              onClick={() => handleDigit(d)}
              disabled={loading}
              className="h-12 rounded-xl bg-[#F7F7F5] hover:bg-[#E3E7E3] text-lg font-bold text-[#252A27] border border-[#D9DDD8] active:bg-[#ECEEEA] transition-all shadow-2xs"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-12 rounded-xl bg-[#ECEEEA] hover:bg-[#E3E7E3] text-xs font-semibold text-[#555D58] border border-[#D9DDD8] active:bg-[#D9DDD8] transition-all"
          >
            Effacer
          </button>
          <button
            id="pin-btn-0"
            onClick={() => handleDigit('0')}
            disabled={loading}
            className="h-12 rounded-xl bg-[#F7F7F5] hover:bg-[#E3E7E3] text-lg font-bold text-[#252A27] border border-[#D9DDD8] active:bg-[#ECEEEA] transition-all shadow-2xs"
          >
            0
          </button>
          <button
            id="pin-btn-backspace"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#ECEEEA] hover:bg-[#E3E7E3] text-[#555D58] flex items-center justify-center border border-[#D9DDD8] active:bg-[#D9DDD8] transition-all"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Quick hint / Team members list */}
        <div className="text-left bg-[#ECEEEA] p-3 rounded-xl border border-[#D9DDD8] text-[11px] text-[#555D58] max-h-40 overflow-y-auto">
          <p className="font-bold text-[#252A27] mb-1.5 flex items-center justify-between">
            <span>Comptes d'accès configurés :</span>
            <span className="text-[10px] text-[#7A827C] font-normal">Cliquer pour tester</span>
          </p>
          <div className="space-y-1">
            {(users && users.length > 0 ? users : [
              { id: 'usr_admin', name: 'Adam Mansour', role: 'admin', pin: '1234' },
              { id: 'usr_victor', name: 'Victor Noir', role: 'admin', pin: '0000' },
              { id: 'usr_manager', name: 'Camille Laurent', role: 'manager', pin: '2025' },
              { id: 'usr_sarah', name: 'Sarah Alami', role: 'barista', pin: '5678' },
              { id: 'usr_julien', name: 'Julien Moreau', role: 'kitchen', pin: '4321' },
              { id: 'usr_barista', name: 'Lucas Morel', role: 'barista', pin: '1111' },
              { id: 'usr_server', name: 'Sophie Dubois', role: 'server', pin: '2222' },
            ]).map((u: any) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setPin(u.pin || '1234');
                  verifyPin(u.pin || '1234');
                }}
                className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white/80 transition-colors text-left"
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#252A27]"></span>
                  <span className="font-medium text-[#252A27] truncate">{u.name}</span>
                  <span className="text-[10px] text-[#7A827C]">({u.role})</span>
                </div>
                <span className="font-mono font-bold text-[#252A27] bg-[#D9DDD8] px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-1">
                  {u.pin || '1234'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
