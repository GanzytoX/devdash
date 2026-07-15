import React from 'react';
import { useServices } from '../../hooks/useServices';
import { GlassCard } from '../common/GlassCard';
import { Activity, Server, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const OverviewStats: React.FC = () => {
  const { services } = useServices();

  // Calculations
  const totalServices = services.length;
  const activeServices = services.filter(s => s.status === 'online' || s.status === 'degraded').length;
  
  // Calculate average uptime across active history
  const averageUptime = React.useMemo(() => {
    if (totalServices === 0) return 100;
    let totalChecks = 0;
    let successfulChecks = 0;

    services.forEach(s => {
      if (s.paused) return;
      s.uptimeHistory.forEach(check => {
        totalChecks++;
        if (check) successfulChecks++;
      });
    });

    return totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
  }, [services, totalServices]);

  // Calculate average latency
  const avgLatency = React.useMemo(() => {
    const activePings = services.filter(s => !s.paused && (s.status === 'online' || s.status === 'degraded'));
    if (activePings.length === 0) return 0;
    const sum = activePings.reduce((acc, s) => acc + s.latency, 0);
    return Math.round(sum / activePings.length);
  }, [services]);

  // Calculate SSL Alerts
  const sslAlertsCount = services.filter(
    s => !s.paused && (s.sslStatus === 'expiring' || s.sslStatus === 'expired')
  ).length;

  const stats = [
    {
      title: 'Disponibilidad Promedio',
      value: `${averageUptime.toFixed(2)}%`,
      icon: Activity,
      color: 'text-emerald-400',
      bgGlow: 'group-hover:shadow-emerald-500/5',
      desc: 'Promedio global (últimas 30 pings)',
    },
    {
      title: 'Servicios Activos',
      value: `${activeServices} / ${totalServices}`,
      icon: Server,
      color: 'text-brand-blue-400',
      bgGlow: 'group-hover:shadow-brand-blue-500/5',
      desc: 'Servicios respondiendo correctamente',
    },
    {
      title: 'Latencia Promedio',
      value: `${avgLatency} ms`,
      icon: Clock,
      color: 'text-violet-400',
      bgGlow: 'group-hover:shadow-violet-500/5',
      desc: 'Tiempo de respuesta del servidor',
    },
    {
      title: 'Certificados SSL',
      value: sslAlertsCount > 0 ? `${sslAlertsCount} Alertas` : 'Al Día',
      icon: sslAlertsCount > 0 ? AlertTriangle : ShieldCheck,
      color: sslAlertsCount > 0 ? 'text-amber-400' : 'text-teal-400',
      bgGlow: sslAlertsCount > 0 ? 'group-hover:shadow-amber-500/5' : 'group-hover:shadow-teal-500/5',
      desc: sslAlertsCount > 0 ? 'Vencimiento próximo (< 7 días)' : 'Todos los dominios protegidos',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">
                {stat.title}
              </span>
              <div className={`p-2.5 rounded-xl bg-white/5 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-bold font-mono tracking-tight text-white mb-1">
                {stat.value}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                {stat.desc}
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};
