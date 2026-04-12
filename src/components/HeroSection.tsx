import type { ReactElement } from 'react';

export function HeroSection(): ReactElement {
  return (
    <section 
      className="relative w-full h-screen flex flex-col items-center justify-center bg-[#0a0a09] text-[#f4f4f5] overflow-hidden"
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Dynamic faint background graphic or simple gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 via-[#0a0a09] to-[#0a0a09] z-0"></div>

      <div className="z-10 text-center space-y-6 max-w-4xl px-6">
        <span className="inline-block py-1 px-3 rounded-full bg-amber-500/10 text-amber-500 text-sm font-semibold tracking-wider uppercase border border-amber-500/20 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          Live Journey
        </span>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-[family:var(--font-display)] tracking-tight leading-tight uppercase">
          Surabaya to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
            Bandung
          </span>
        </h1>
        <p className="text-lg md:text-2xl text-zinc-400 font-medium max-w-2xl mx-auto">
          Scroll down to ride along through a visual and interactive mapping experience.
        </p>
      </div>

      {/* Floating scroll indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-70">
        <span className="text-xs font-semibold uppercase tracking-widest">Scroll</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7"/>
        </svg>
      </div>
    </section>
  );
}
