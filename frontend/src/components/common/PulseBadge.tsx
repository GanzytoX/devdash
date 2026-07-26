import React from 'react';

interface PulseBadgeProps {
  status: 'online' | 'offline' | 'degraded' | 'unknown' | 'paused';
}

export const PulseBadge: React.FC<PulseBadgeProps> = ({ status }) => {
  const config = {
    online: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      pulse: 'bg-emerald-400',
      label: 'En línea',
    },
    degraded: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      pulse: 'bg-amber-400',
      label: 'Degradado',
    },
    offline: {
      bg: 'bg-red-500/10 text-red-400 border-red-500/25',
      pulse: 'bg-red-400',
      label: 'Fuera de línea',
    },
    paused: {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
      pulse: 'bg-slate-500',
      label: 'Pausado',
    },
    unknown: {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
      pulse: 'bg-slate-500',
      label: 'Pendiente',
    },
  };

  const active = config[status];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border ${active.bg}`}>
      {status !== 'paused' && status !== 'unknown' ? (
        <span className="relative flex h-2 w-2">
          {/* Radar effect for pulsing status */}
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${active.pulse}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${active.pulse}`}></span>
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-slate-500"></span>
      )}
      {active.label}
    </span>
  );
};
