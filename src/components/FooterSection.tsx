import type { ReactElement } from 'react';

export function FooterSection(): ReactElement {
  return (
    <footer 
      className="w-full bg-[#050505] text-zinc-500 py-16 px-6 border-t border-zinc-800/50"
    >
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="text-xl font-bold text-zinc-300">DDC Live Journal</div>
          <p className="text-sm">Documenting the journey, one checkpoint at a time.</p>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#" className="hover:text-amber-500 transition-colors">Instagram</a>
          <a href="#" className="hover:text-amber-500 transition-colors">Twitter</a>
          <a href="#" className="hover:text-amber-500 transition-colors">YouTube</a>
        </div>
      </div>
      <div className="mt-12 text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} DDC. All rights reserved. Built with Astro & React.
      </div>
    </footer>
  );
}
