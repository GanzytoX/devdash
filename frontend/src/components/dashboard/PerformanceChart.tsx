import React from 'react';
import { useServices } from '../../hooks/useServices';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '../common/GlassCard';
import { Info } from 'lucide-react';

type ChartPoint = Record<string, string | number | null>;

interface TooltipEntry {
  color?: string;
  stroke?: string;
  name?: string;
  value?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

export const PerformanceChart: React.FC = () => {
  const { services } = useServices();

  const chartServices = React.useMemo(
    () => services.filter(
      service => !service.paused
        && service.status !== 'offline'
        && (service.latency > 0 || service.latencyHistory.some(value => value > 0))
    ).slice(0, 4),
    [services]
  );

  const chartData = React.useMemo(() => {
    const pointsCount = 24;
    const data = Array.from({ length: pointsCount }, (_, index) => {
      const item: ChartPoint = { name: `T-${pointsCount - 1 - index}` };

      chartServices.forEach(s => {
        const historyValue = s.latencyHistory[index] ?? s.latency;
        item[s.name] = historyValue > 0 ? historyValue : null;
      });

      return item;
    });
    return data;
  }, [chartServices]);

  const serviceColors = [
    { stroke: '#1d72fe', fill: 'url(#colorBrandBlue650)' },
    { stroke: '#64a0ff', fill: 'url(#colorBrandBlue400)' },
    { stroke: '#9ac2ff', fill: 'url(#colorBrandBlue300)' },
    { stroke: '#3884fe', fill: 'url(#colorBrandBlue500)' },
  ];

  const activeServices = services.filter(s => !s.paused);
  const emptyMessage = services.length === 0
    ? 'No hay servicios registrados para mostrar métricas.'
    : activeServices.length === 0
      ? 'Todos los servicios están pausados.'
      : chartServices.length === 0
        ? 'Todavía no hay mediciones de latencia disponibles.'
        : null;

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-xs font-sans shadow-2xl backdrop-blur-xl bg-slate-950/80">
          <p className="font-mono text-slate-400 mb-2 border-b border-white/5 pb-1 font-bold">Chequeo {label}</p>
          <div className="space-y-1.5">
            {payload.map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                  <span className="text-slate-200 font-medium">{entry.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-100">{entry.value} ms</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard className="flex flex-col h-[320px] sm:h-[400px]">
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 font-sans tracking-tight m-0">Latencia de Red</h3>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-sans mt-0.5">Tiempos de respuesta históricos comparados</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] sm:text-[10px] font-mono text-slate-400 shrink-0">
          <Info className="h-3 w-3 text-brand-blue-400" />
          <span className="sm:hidden">En vivo</span>
          <span className="hidden sm:inline">Frecuencia en tiempo real</span>
        </div>
      </div>

      <div className="flex-1 w-full text-xs font-mono">
        {emptyMessage ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 4, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBrandBlue650" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d72fe" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#1d72fe" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBrandBlue400" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64a0ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#64a0ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBrandBlue300" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9ac2ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#9ac2ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBrandBlue500" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3884fe" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3884fe" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="rgba(255, 255, 255, 0.3)"
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.3)"
                tickLine={false}
                axisLine={false}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1 }} />
              {chartServices.map((service, idx) => {
                const colorConfig = serviceColors[idx % serviceColors.length];
                return (
                  <Area
                    key={service.id}
                    type="monotone"
                    dataKey={service.name}
                    stroke={colorConfig.stroke}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={colorConfig.fill}
                    activeDot={{ r: 4, strokeWidth: 1 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
};
