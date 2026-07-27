import React from 'react';
import { useServices } from '../../hooks/useServices';
import { GlassCard } from '../common/GlassCard';
import { Activity, Server, Clock, AlertTriangle, ShieldCheck, ShieldQuestion } from 'lucide-react';

export const OverviewStats: React.FC = () => {
  const { services } = useServices();

  // Calculations
  const totalServices = services.length;
  const activeServices = services.filter(
    s => !s.paused && (s.status === 'online' || s.status === 'degraded')
  ).length;

  // Calculate average uptime across active history
  const averageUptime = React.useMemo<number | null>(() => {
    let totalChecks = 0;
    let successfulChecks = 0;

    services.forEach(s => {
      if (s.paused) return;
      s.uptimeHistory.forEach(check => {
        totalChecks++;
        if (check) successfulChecks++;
      });
    });

    return totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : null;
  }, [services]);

  // Calculate average latency
  const avgLatency = React.useMemo<number | null>(() => {
    const activePings = services.filter(
      s => !s.paused
        && (s.status === 'online' || s.status === 'degraded')
        && s.latency > 0
    );
    if (activePings.length === 0) return null;
    const sum = activePings.reduce((acc, s) => acc + s.latency, 0);
    return Math.round(sum / activePings.length);
  }, [services]);

  const monitoredServices = services.filter(s => !s.paused);
  const sslAlertsCount = monitoredServices.filter(
    s => s.sslStatus === 'expiring'
      || s.sslStatus === 'expired'
      || s.sslStatus === 'invalid'
  ).length;
  const pendingSslCount = monitoredServices.filter(s => s.sslStatus === 'unknown').length;
  const certificateCount = monitoredServices.filter(s => s.sslStatus !== 'none').length;

  const sslSummary = (() => {
    if (totalServices === 0) {
      return {
        value: '--',
        desc: 'Sin servicios registrados',
        icon: ShieldQuestion,
        color: 'text-slate-400',
        bgGlow: 'group-hover:shadow-slate-500/5',
      };
    }
    if (monitoredServices.length === 0) {
      return {
        value: '--',
        desc: 'Todos los servicios están pausados',
        icon: ShieldQuestion,
        color: 'text-slate-400',
        bgGlow: 'group-hover:shadow-slate-500/5',
      };
    }
    if (sslAlertsCount > 0) {
      return {
        value: `${sslAlertsCount} ${sslAlertsCount === 1 ? 'Alerta' : 'Alertas'}`,
        desc: 'Hay certificados que requieren atención',
        icon: AlertTriangle,
        color: 'text-amber-400',
        bgGlow: 'group-hover:shadow-amber-500/5',
      };
    }
    if (pendingSslCount > 0) {
      return {
        value: 'Pendiente',
        desc: 'Hay certificados sin verificar',
        icon: ShieldQuestion,
        color: 'text-slate-400',
        bgGlow: 'group-hover:shadow-slate-500/5',
      };
    }
    if (certificateCount === 0) {
      return {
        value: 'No aplica',
        desc: 'No hay conexiones HTTPS',
        icon: ShieldQuestion,
        color: 'text-slate-400',
        bgGlow: 'group-hover:shadow-slate-500/5',
      };
    }
    return {
      value: 'Al día',
      desc: 'Certificados supervisados sin alertas',
      icon: ShieldCheck,
      color: 'text-teal-400',
      bgGlow: 'group-hover:shadow-teal-500/5',
    };
  })();

  const stats = [
    {
      title: 'Disponibilidad Promedio',
      value: averageUptime === null ? '--' : `${averageUptime.toFixed(2)}%`,
      icon: Activity,
      color: averageUptime === null ? 'text-slate-400' : 'text-emerald-400',
      bgGlow: averageUptime === null ? 'group-hover:shadow-slate-500/5' : 'group-hover:shadow-emerald-500/5',
      desc: totalServices === 0
        ? 'Sin servicios registrados'
        : monitoredServices.length === 0
          ? 'Todos los servicios están pausados'
        : averageUptime === null
          ? 'Sin verificaciones disponibles'
          : 'Promedio global (últimas 30 verificaciones)',
    },
    {
      title: 'Servicios Activos',
      value: `${activeServices} / ${totalServices}`,
      icon: Server,
      color: 'text-brand-blue-400',
      bgGlow: 'group-hover:shadow-brand-blue-500/5',
      desc: totalServices === 0
        ? 'Sin servicios registrados'
        : monitoredServices.length === 0
          ? 'Todos los servicios están pausados'
          : 'Servicios con respuesta',
    },
    {
      title: 'Latencia Promedio',
      value: avgLatency === null ? '--' : `${avgLatency} ms`,
      icon: Clock,
      color: avgLatency === null ? 'text-slate-400' : 'text-violet-400',
      bgGlow: avgLatency === null ? 'group-hover:shadow-slate-500/5' : 'group-hover:shadow-violet-500/5',
      desc: totalServices === 0
        ? 'Sin servicios registrados'
        : monitoredServices.length === 0
          ? 'Todos los servicios están pausados'
        : avgLatency === null
          ? 'Sin mediciones disponibles'
          : 'Tiempo de respuesta promedio',
    },
    {
      title: 'Certificados SSL',
      ...sslSummary,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <GlassCard
            key={idx}
            hoverEffect={true}
            className={`group relative overflow-hidden transition-all duration-300 ${stat.bgGlow}`}
          >
            {/* Ambient Background Gradient for Hover */}
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-brand-blue-500/5 blur-3xl group-hover:bg-brand-blue-500/10 transition-colors duration-300" />

            <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
              <span className="text-[9px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase leading-tight">
                {stat.title}
              </span>
              <div className={`p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-white mb-1 break-words">
                {stat.value}
              </span>
              <span className="text-[9px] sm:text-[10px] leading-snug text-slate-400 font-sans">
                {stat.desc}
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};
