import React, { useState } from 'react';
import type { Service } from '../../services/apiService';
import { useServices } from '../../hooks/useServices';
import { PulseBadge } from '../common/PulseBadge';
import { GlassCard } from '../common/GlassCard';
import { Play, Pause, Trash2, Edit3, Shield, ShieldAlert, ShieldOff, RefreshCw } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit }) => {
  const { togglePauseService, deleteService, triggerManualCheck } = useServices();
  const [isPinging, setIsPinging] = useState(false);

  const handleManualPing = async () => {
    if (service.paused) return;
    setIsPinging(true);
    try { await triggerManualCheck(service.id); } finally { setIsPinging(false); }
  };

  // Sparkline calculation using inline SVG for maximum lightweight speed and cleanliness
  const renderSparkline = () => {
    const history = service.latencyHistory || [];
    if (history.length < 2) return null;
    
    const width = 120;
    const height = 24;
    const padding = 2;
    
    // Filter history to ignore 0 (offline)
    const validHistory = history.filter(h => h > 0);
    const minVal = validHistory.length ? Math.min(...validHistory) : 0;
    const maxVal = validHistory.length ? Math.max(...validHistory) : 100;
    const valRange = maxVal - minVal || 1;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * (width - padding * 2) + padding;
      // If offline (val === 0), map to the bottom
      const valToMap = val === 0 ? minVal : val;
      const y = height - padding - ((valToMap - minVal) / valRange) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = service.status === 'offline' 
      ? '#EF4444' 
      : service.status === 'degraded' 
      ? '#F59E0B' 
      : '#10B981';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // SSL status styling
  const renderSslStatus = () => {
    if (service.sslStatus === 'none' || service.sslExpiryDays === null) {
      return (
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]" title="Sin cifrado SSL">
          <ShieldOff className="h-3.5 w-3.5" />
          <span>HTTP</span>
        </div>
      );
    }

    if (service.sslStatus === 'expired') {
      return (
        <div className="flex items-center gap-1.5 text-red-400 font-mono text-[10px] font-bold" title="Certificado Expirado!">
          <ShieldAlert className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          <span>EXPIRADO</span>
        </div>
      );
    }

    if (service.sslStatus === 'expiring') {
      return (
        <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] font-bold" title={`Expira pronto en ${service.sslExpiryDays} días!`}>
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          <span>EXPIRA: {service.sslExpiryDays}d</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]" title={`Certificado Válido (Expira en ${service.sslExpiryDays} días)`}>
        <Shield className="h-3.5 w-3.5 text-emerald-400" />
        <span>SSL: {service.sslExpiryDays}d</span>
      </div>
    );
  };

  return (
    <GlassCard hoverEffect={true} className="flex flex-col relative h-full">
      {/* Upper header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="overflow-hidden">
          <h4 className="text-sm font-semibold text-slate-100 font-sans tracking-tight truncate m-0 mb-1" title={service.name}>
            {service.name}
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-brand-blue-300 px-1.5 py-0.5 rounded">
              {service.method}
            </span>
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px] inline-block" title={service.url}>
              {service.url.replace(/https?:\/\//, '')}
            </span>
          </div>
        </div>
        <PulseBadge status={service.paused ? 'paused' : service.status} />
      </div>

      {/* Latency & History Row */}
      <div className="flex items-center justify-between my-4 border-t border-white/5 pt-4">
        <div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Latencia</div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {service.status === 'offline' || service.paused ? '--' : `${service.latency}ms`}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Tendencia</div>
          {service.paused ? (
            <span className="text-[10px] font-mono text-slate-500 py-1.5">Monitoreo pausado</span>
          ) : (
            renderSparkline()
          )}
        </div>
      </div>

      {/* Uptime history block timeline (30 ticks) */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1.5">
          <span>Disponibilidad (Últimos 30)</span>
          <span>{service.paused || service.uptimeHistory.length === 0 ? '--' : `${((service.uptimeHistory.filter(Boolean).length / service.uptimeHistory.length) * 100).toFixed(1)}%`}</span>
        </div>
        <div className="flex gap-[2px] w-full justify-between">
          {service.uptimeHistory.map((val, idx) => (
            <div
              key={idx}
              className={`h-4 flex-1 rounded-sm ${
                service.paused
                  ? 'bg-slate-800/40'
                  : val
                  ? service.status === 'degraded' && idx === service.uptimeHistory.length - 1
                    ? 'bg-amber-500/70'
                    : 'bg-emerald-500/70 hover:bg-emerald-400'
                  : 'bg-red-500/70 hover:bg-red-400'
              } transition-colors duration-150`}
              title={`Verificación ${idx + 1}: ${service.paused ? 'Pausado' : val ? 'Correcto' : 'Error / Caído'}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom controls / metadata */}
      <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-3.5">
        {/* SSL indicator */}
        {renderSslStatus()}

        {/* Quick controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleManualPing}
            disabled={service.paused}
            className={`p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
              isPinging ? 'animate-spin' : ''
            }`}
            title="Ping instantáneo"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => togglePauseService(service.id)}
            className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={service.paused ? 'Reanudar monitoreo' : 'Pausar monitoreo'}
          >
            {service.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => onEdit(service)}
            className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Editar servicio"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => window.confirm(`¿Eliminar ${service.name}? Esta acción también elimina su historial.`) && deleteService(service.id)}
            className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Eliminar servicio"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
};
