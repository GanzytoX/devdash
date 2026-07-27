import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { Bell, Check, Sparkles, LogOut, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    notifications,
    markNotificationsRead,
    activeView,
    userId,
    username,
    isDemo,
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
        return 'Ajustes';
      default:
        return 'DevDash';
    }
  };

  return (
    <header className="glass-panel navigation-surface border-x-0 border-t-0 border-b px-3 sm:px-4 md:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30 gap-2">
      {/* Title */}
      <div className="min-w-0">
        <h2 className="text-base sm:text-xl font-semibold text-slate-100 font-sans tracking-tight m-0 flex items-center gap-1.5 sm:gap-2 truncate">
          {getTitle()}
          {activeView === 'dashboard' && <Sparkles className="h-4 w-4 text-brand-blue-400" />}
        </h2>
        <p className="hidden sm:block text-xs text-slate-400 font-sans truncate">
          {activeView === 'dashboard' ? 'Resumen de salud y latencia de infraestructura' : 'Administra y examina tus servicios'}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
        <a href="/status" target="_blank" rel="noopener noreferrer" aria-label="Abrir página pública" title="Página pública" className="p-2 sm:p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:text-white"><ExternalLink className="h-4 w-4" /></a>



        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleNotificationClick}
            aria-label="Notificaciones"
            aria-expanded={showNotifications}
            className="p-2 sm:p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors relative cursor-pointer"
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
            <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80 rounded-2xl overflow-hidden shadow-2xl z-40 animate-fade-in border border-brand-blue-900/40 bg-slate-950/95 backdrop-blur-xl shadow-black/60">
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
        <div className="flex items-center gap-2.5 sm:pl-2 sm:border-l border-white/5">
          <div className="hidden sm:flex h-8 w-8 rounded-full bg-gradient-to-tr from-brand-blue-500/20 to-violet-500/20 border border-brand-blue-500/30 items-center justify-center font-bold text-brand-blue-300 text-xs font-mono">
            {(username || 'OP').slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <div className="text-xs font-bold text-slate-200 font-sans leading-none">{username || 'Operador'}</div>
            <div
              className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-blue-400"
              title={userId ? `UUID: ${userId}` : undefined}
            >
              {isDemo ? 'Demostración' : 'Administrador'}{userId ? ` · ${userId.slice(0, 8)}` : ''}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 sm:p-1.5 sm:ml-1.5 rounded-lg border border-white/5 hover:border-white/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center"
            title="Cerrar sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
