import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { Bell, Check, Sparkles, LogOut, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    notifications,
    markNotificationsRead,
    activeView,
    username,
    logout,
  } = useDashboard();

  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Panel General';
      case 'services':
        return 'Servicios Monitoreados';
      case 'analytics':
        return 'Métricas Avanzadas';
      case 'settings':
        return 'Configuración del Sistema';
      default:
        return 'DevDash';
    }
  };

  return (
    <header className="glass-panel border-x-0 border-t-0 border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10 gap-3">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 font-sans tracking-tight m-0 flex items-center gap-2">
          {getTitle()}
          {activeView === 'dashboard' && <Sparkles className="h-4 w-4 text-brand-blue-400" />}
        </h2>
        <p className="text-xs text-slate-400 font-sans">
          {activeView === 'dashboard' ? 'Resumen de salud y latencia de infraestructura' : 'Administra y examina tus servicios'}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        <a href="/status" target="_blank" aria-label="Abrir página pública" title="Página pública" className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:text-white"><ExternalLink className="h-4 w-4" /></a>



        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleNotificationClick}
            aria-label="Notificaciones"
            className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-blue-600 text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl overflow-hidden shadow-2xl z-30 animate-fade-in border border-brand-blue-900/40 bg-slate-950/95 backdrop-blur-xl shadow-black/60">
              <div className="p-4 border-b border-brand-blue-950/40 bg-slate-900/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 font-sans">Eventos Recientes</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-brand-blue-600/25 text-brand-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                    {unreadCount} nuevos
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-brand-blue-950/40">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 font-sans">
                    No hay notificaciones disponibles
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors ${notif.read ? 'bg-transparent' : 'bg-brand-blue-600/10'}`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[11px] font-bold text-slate-200">{notif.title}</span>
                        <span className="text-[9px] font-mono text-brand-blue-400 shrink-0">{notif.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-normal mb-1">{notif.message}</p>
                      {!notif.read && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-brand-blue-400">
                          <Check className="h-3 w-3" /> Nuevo aviso
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-brand-blue-950/40 bg-slate-900/30 text-center">
                <button
                  onClick={markNotificationsRead}
                  disabled={unreadCount === 0}
                  className="text-[10px] font-mono text-brand-blue-300 hover:text-white transition-colors w-full py-1 cursor-pointer disabled:text-slate-500 disabled:cursor-default"
                >
                  Marcar todo como leído
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile identifier */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-blue-500/20 to-violet-500/20 border border-brand-blue-500/30 flex items-center justify-center font-bold text-brand-blue-300 text-xs font-mono">
            {(username || 'OP').slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-bold text-slate-200 font-sans leading-none">{username || 'Operador'}</div>
            <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider text-brand-blue-400">Administrador</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 ml-1.5 rounded-lg border border-white/5 hover:border-white/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center"
            title="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
