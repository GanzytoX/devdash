import useSWR from 'swr';
import { Activity, CheckCircle2, Clock3, ExternalLink, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import { API_URL } from '../../lib/fetcher';

interface PublicService {
  id: string; name: string; status: string; lastChecked: string | null;
  sslStatus: string; sslExpiryDays: number | null; tags: string[]; uptime: number | null; averageLatency: number | null;
  history: { timestamp: string; status: string; latency: number }[];
}
interface PublicPayload {
  instance: string; region: string; hostedOn: string; period: string; operational: boolean; updatedAt: string;
  services: PublicService[];
  incidents: { id: string; status: string; message: string; startedAt: string; resolvedAt: string | null; service: { name: string } }[];
}

const fetcher = (url: string) => fetch(url).then(async r => { if (!r.ok) throw new Error('La API de estado no está disponible'); return r.json(); });
const statusLabel = (status: string) => ({ online: 'En línea', offline: 'Fuera de línea', degraded: 'Degradado', paused: 'Pausado', unknown: 'Pendiente', open: 'Abierto', resolved: 'Resuelto' }[status] || status);
const sslLabel = (status: string) => ({
  valid: 'Válido',
  expiring: 'Próximo a vencer',
  expired: 'Vencido',
  invalid: 'No confiable',
  unknown: 'No disponible',
  none: 'Sin SSL',
}[status] || status);

export function PublicStatusPage() {
  const params = new URLSearchParams(window.location.search);
  const period = params.get('period') || '24h';
  const { data, error, isLoading } = useSWR<PublicPayload>(`${API_URL}/public/status?period=${period}`, fetcher, { refreshInterval: 15000 });
  const changePeriod = (value: string) => { window.location.search = `period=${value}`; };
  const hasServices = Boolean(data?.services.length);
  const allServicesPaused = hasServices && data!.services.every(service => service.status === 'paused');
  const monitoringPartial = hasServices
    && data!.services.some(service => service.status === 'paused')
    && data!.services.every(service => service.status === 'online' || service.status === 'paused');

  return (
    <main className="min-h-screen bg-[#040815] text-slate-100 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><p className="text-brand-blue-400 font-mono text-xs uppercase tracking-widest">Estado público de DevDash</p><h1 className="text-3xl font-bold mt-1">{data?.instance || 'Estado de los servicios'}</h1><p className="text-slate-400 text-sm mt-1">{data?.region || 'Infraestructura de CubePath'}</p></div>
          <a href="/" className="glass-btn px-4 py-2 text-xs inline-flex items-center gap-2">Panel del operador <ExternalLink className="h-3.5 w-3.5" /></a>
        </header>

        {isLoading && <div className="glass-panel rounded-2xl p-10 text-center text-slate-400">Cargando el estado en tiempo real…</div>}
        {error && <div className="rounded-2xl p-6 border border-red-500/30 bg-red-500/10 text-red-300">La API de estado no está disponible temporalmente.</div>}
        {data && <>
          <section className={`rounded-2xl p-6 border flex items-center gap-4 ${
            !hasServices
              ? 'bg-slate-500/10 border-slate-500/30'
              : data.operational
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            {!hasServices || allServicesPaused
              ? <Server className="h-8 w-8 text-slate-400" />
              : data.operational
                ? <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                : <TriangleAlert className="h-8 w-8 text-amber-400" />}
            <div>
              <h2 className="font-bold text-lg">
                {!hasServices
                  ? 'No hay servicios públicos registrados'
                  : allServicesPaused
                    ? 'El monitoreo está temporalmente pausado'
                    : monitoringPartial
                      ? 'Los sistemas funcionan con monitoreo parcial'
                  : data.operational
                    ? 'Todos los sistemas funcionan correctamente'
                    : 'Algunos sistemas presentan problemas'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {!hasServices
                  ? 'El estado estará disponible cuando se publique el primer servicio.'
                  : allServicesPaused
                    ? 'Reanuda un servicio para actualizar su estado en tiempo real.'
                    : monitoringPartial
                      ? 'Uno o más servicios están pausados y conservan su último estado conocido.'
                  : `Actualizado el ${new Date(data.updatedAt).toLocaleString()}`}
              </p>
            </div>
          </section>

          <div className="flex gap-2" aria-label="Periodo del estado">
            {['24h','7d','30d'].map(p => <button key={p} onClick={() => changePeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs ${period === p ? 'bg-brand-blue-600 text-white' : 'glass-btn'}`}>{p}</button>)}
          </div>

          <section className="space-y-3" aria-labelledby="services-title"><h2 id="services-title" className="font-bold">Servicios monitoreados</h2>
            {data.services.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-400">
                No hay servicios visibles en la página pública.
              </div>
            ) : data.services.map(service => <article key={service.id} className="glass-panel rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{service.name}</h3><div className="flex gap-1 mt-2">{service.tags.map(tag => <span key={tag} className="text-[9px] font-mono bg-white/5 px-2 py-1 rounded">{tag}</span>)}</div></div><span className={`text-xs font-bold uppercase ${service.status === 'online' ? 'text-emerald-400' : service.status === 'degraded' ? 'text-amber-400' : service.status === 'paused' || service.status === 'unknown' ? 'text-slate-400' : 'text-red-400'}`}>{statusLabel(service.status)}</span></div>
              <div className="grid grid-cols-3 gap-3 mt-5 text-sm"><div><p className="text-[10px] text-slate-500 uppercase">Disponibilidad</p><p className="font-mono mt-1">{service.uptime === null ? '—' : `${service.uptime}%`}</p></div><div><p className="text-[10px] text-slate-500 uppercase">Latencia promedio</p><p className="font-mono mt-1">{service.averageLatency === null ? '—' : `${service.averageLatency} ms`}</p></div><div><p className="text-[10px] text-slate-500 uppercase">SSL</p><p className="font-mono mt-1">{sslLabel(service.sslStatus)}</p></div></div>
              {service.history.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500">Sin verificaciones recientes.</p>
              ) : (
                <div className="flex gap-1 mt-4 h-5" aria-label="Disponibilidad reciente">{service.history.slice(-30).map((point, index) => <span key={index} title={`${new Date(point.timestamp).toLocaleString()} · ${statusLabel(point.status)} · ${point.latency} ms`} className={`flex-1 rounded-sm ${point.status === 'online' ? 'bg-emerald-500/70' : point.status === 'degraded' ? 'bg-amber-500/70' : 'bg-red-500/70'}`} />)}</div>
              )}
            </article>)}
          </section>

          <section className="glass-panel rounded-2xl p-5"><h2 className="font-bold flex items-center gap-2"><Clock3 className="h-4 w-4" /> Incidentes recientes</h2><div className="mt-4 divide-y divide-white/5">{data.services.length === 0 ? <p className="text-sm text-slate-400 py-4">No hay servicios públicos para consultar incidentes.</p> : data.incidents.length === 0 ? <p className="text-sm text-slate-400 py-4">No hubo incidentes durante este periodo.</p> : data.incidents.map(i => <div key={i.id} className="py-3 flex justify-between gap-4 text-sm"><div><p className="font-medium">{i.service.name}</p><p className="text-slate-400 text-xs mt-1">{i.message}</p></div><span className={i.status === 'resolved' ? 'text-emerald-400' : 'text-red-400'}>{statusLabel(i.status)}</span></div>)}</div></section>
        </>}
        <footer className="text-center text-xs text-slate-500 pt-4 flex justify-center items-center gap-2"><Server className="h-3.5 w-3.5" /> Alojado en <a className="text-brand-blue-400" href="https://cubepath.com" target="_blank" rel="noopener noreferrer">CubePath</a><span>·</span><ShieldCheck className="h-3.5 w-3.5" /> Desarrollado con DevDash <Activity className="h-3.5 w-3.5" /></footer>
      </div>
    </main>
  );
}
