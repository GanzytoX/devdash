import React from "react";
import { Server } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="glass-panel border-x-0 border-b-0 border-t border-white/5 py-6 px-4 sm:px-8 mb-24 lg:mb-0 mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs font-sans text-slate-400">
      <div>
        <p>
          © 2026 DevDash. Hecho por{" "}
          <a
            href="https://github.com/GanzytoX"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue-500 hover:text-brand-blue-400 font-bold transition-colors">
            GonzaDev
          </a>
        </p>
      </div>

      {/* Official "Hosted on CubePath" Badge */}
      <a
        href="https://cubepath.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-white/10 hover:border-brand-blue-600/30 transition-all duration-300 group shadow-md shadow-black/10 text-slate-300 hover:text-brand-blue-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue-600"></span>
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase font-semibold">
          <span>Hospedado en</span>
          <span className="text-white group-hover:text-brand-blue-300 transition-colors">
            CubePath
          </span>
        </div>
        <Server className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-blue-500 transition-colors group-hover:rotate-12 duration-300" />
      </a>
    </footer>
  );
};
