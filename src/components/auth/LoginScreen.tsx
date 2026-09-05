import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AnimatedBackground } from '../common/AnimatedBackground';
import { Coffee, Delete, Lock } from 'lucide-react';

const PIN_LENGTH = 8;

export const LoginScreen: React.FC = () => {
  const { login, isAuthenticating, authError, clearAuthError } = useAuth();
  const [digits, setDigits] = useState<string>('');
  const [shake, setShake] = useState(false);
  const submittingRef = useRef(false);

  const pushDigit = useCallback((digit: string) => {
    if (isAuthenticating || submittingRef.current) return;
    setDigits(prev => (prev.length >= PIN_LENGTH ? prev : prev + digit));
    if (authError) clearAuthError();
  }, [isAuthenticating, authError, clearAuthError]);

  const popDigit = useCallback(() => {
    if (isAuthenticating || submittingRef.current) return;
    setDigits(prev => prev.slice(0, -1));
  }, [isAuthenticating]);

  const clearDigits = useCallback(() => {
    if (isAuthenticating || submittingRef.current) return;
    setDigits('');
  }, [isAuthenticating]);

  // Physical keyboard support (desktop testing / accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        pushDigit(e.key);
      } else if (e.key === 'Backspace') {
        popDigit();
      } else if (e.key === 'Escape') {
        clearDigits();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pushDigit, popDigit, clearDigits]);

  // Auto-submit once all 8 digits are entered
  useEffect(() => {
    if (digits.length !== PIN_LENGTH || submittingRef.current) return;
    submittingRef.current = true;

    const submit = async () => {
      const pin = digits;
      const ok = await login(pin);
      if (ok) {
        window.history.replaceState(null, '', '/');
      } else {
        setShake(true);
        setDigits('');
        setTimeout(() => setShake(false), 500);
      }
      submittingRef.current = false;
    };

    const timer = setTimeout(submit, 150);
    return () => clearTimeout(timer);
  }, [digits, login]);

  const keypadRows: (string | 'backspace' | 'clear')[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace']
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-sm animate-fade-rise-in">
        <div className="bg-[#F7F7F5]/97 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-6 sm:p-8">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#252A27] text-[#A4DEC2] flex items-center justify-center shadow-lg mb-3">
              <Coffee className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-xl font-black text-[#252A27]">Café Noir Système</h1>
            <p className="text-xs text-[#555D58] mt-1">Saisissez votre code PIN à 8 chiffres pour continuer</p>
          </div>

          {/* PIN display */}
          <div className={`flex items-center justify-center gap-1.5 sm:gap-2 mb-5 ${shake ? 'animate-pin-shake' : ''}`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`w-7 h-9 sm:w-8 sm:h-10 rounded-lg border-2 flex items-center justify-center transition-colors duration-150 ${
                  i < digits.length
                    ? 'border-[#252A27] bg-[#252A27]'
                    : 'border-[#D9DDD8] bg-white'
                }`}
              >
                {i < digits.length && <span className="w-2 h-2 rounded-full bg-[#A4DEC2]" />}
              </div>
            ))}
          </div>

          {/* Error message */}
          <div className="h-5 mb-2 text-center">
            {authError && (
              <p className="text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                {authError}
              </p>
            )}
            {isAuthenticating && !authError && (
              <p className="text-xs font-bold text-[#555D58]">Vérification en cours...</p>
            )}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {keypadRows.flat().map((key, idx) => {
              if (key === 'backspace') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={popDigit}
                    aria-label="Effacer le dernier chiffre"
                    className="h-14 sm:h-16 rounded-2xl bg-[#ECEEEA] hover:bg-[#E3E7E3] active:scale-95 border border-[#D9DDD8] flex items-center justify-center text-[#252A27] transition-all duration-150 cursor-pointer touch-manipulation"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              if (key === 'clear') {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={clearDigits}
                    aria-label="Tout effacer"
                    className="h-14 sm:h-16 rounded-2xl bg-[#ECEEEA] hover:bg-[#E3E7E3] active:scale-95 border border-[#D9DDD8] flex items-center justify-center text-[10px] sm:text-xs font-bold text-[#555D58] uppercase tracking-wide transition-all duration-150 cursor-pointer touch-manipulation"
                  >
                    Effacer
                  </button>
                );
              }
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pushDigit(key)}
                  className="h-14 sm:h-16 rounded-2xl bg-white hover:bg-[#F2F3F0] active:scale-95 border border-[#D9DDD8] shadow-2xs flex items-center justify-center text-xl sm:text-2xl font-bold text-[#252A27] transition-all duration-150 cursor-pointer touch-manipulation"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-white/50 mt-5">
          Café Noir Système &middot; Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
};
