import React from "react";
import { useDashboard } from "../../hooks/useDashboard";
import { useSystemStats } from "../../hooks/useSystemStats";
import {
  LayoutDashboard,
  Server,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, isDemo } = useDashboard();
  const { vpsUptime, serverStatus } = useSystemStats();

  const menuItems = [
    { id: "dashboard" as const, label: "Panel", icon: LayoutDashboard },
    { id: "services" as const, label: "Servicios", icon: Server },
    { id: "analytics" as const, label: "Analíticas", icon: BarChart3 },
    { id: "settings" as const, label: "Ajustes", icon: Settings },
  ].filter(item => !isDemo || item.id !== 'settings');

  return (
    <>
      <aside className="hidden lg:flex w-64 glass-panel border-r border-y-0 border-l-0 flex-col h-screen sticky top-0 shrink-0 z-20">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-blue-700 to-brand-blue-600 flex items-center justify-center shadow-lg shadow-brand-blue-700/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-100 font-sans tracking-tight m-0 leading-none">
            DevDash
          </h1>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Navegación principal">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-sans transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-brand-blue-700 text-white shadow-lg shadow-brand-blue-700/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Instance Summary Footer inside Sidebar */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20">
          <div className="rounded-lg p-3 bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Servidor:</span>
              <span
                className={
                  serverStatus === "online" ? "text-emerald-400" : "text-red-400"
                }
              >
                {serverStatus === "online" ? "En línea" : "Fuera de línea"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Tiempo activo:</span>
              <span className="text-slate-200">{vpsUptime}</span>
            </div>
          </div>
        </div>
      </aside>

      <nav
        className="lg:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 glass-panel rounded-2xl p-1.5 flex items-stretch justify-around shadow-2xl shadow-black/60"
        aria-label="Navegación móvil"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`min-w-0 flex-1 flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "bg-brand-blue-700 text-white"
                  : "text-slate-400 active:bg-white/5 active:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
