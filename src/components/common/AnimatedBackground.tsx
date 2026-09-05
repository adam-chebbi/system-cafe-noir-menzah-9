import React from 'react';

/**
 * Calm, premium ambient background used only behind the login screen and the main menu launcher —
 * a deep, warm gradient with a few large, softly blurred shapes drifting very slowly. Never used
 * behind an actual module screen, which keeps the app's regular flat, high-contrast surfaces intact.
 */
export const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#1B211D]" aria-hidden="true">
      {/* Base depth gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 15% 0%, #2B332C 0%, #1B211D 45%, #141815 100%)'
        }}
      />

      {/* Ambient drifting shapes */}
      <div
        className="animate-ambient-a absolute -top-32 -left-24 w-[42rem] h-[42rem] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #A4DEC2 0%, transparent 70%)' }}
      />
      <div
        className="animate-ambient-b absolute top-1/3 -right-32 w-[38rem] h-[38rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #9A8064 0%, transparent 70%)' }}
      />
      <div
        className="animate-ambient-c absolute -bottom-40 left-1/4 w-[46rem] h-[46rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #55A9C0 0%, transparent 72%)' }}
      />

      {/* Soft central glow behind content */}
      <div
        className="animate-ambient-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52rem] h-[52rem] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(164,222,194,0.14) 0%, transparent 70%)' }}
      />

      {/* Fine grain vignette for depth and to keep foreground text/icons crisp */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 100% at 50% 20%, transparent 40%, rgba(10,12,10,0.55) 100%)' }}
      />
    </div>
  );
};
