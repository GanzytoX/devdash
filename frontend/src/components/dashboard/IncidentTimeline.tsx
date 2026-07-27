import { Download, Timer, TriangleAlert } from 'lucide-react';
import { useIncidents } from '../../hooks/useIncidents';
import { useServices } from '../../hooks/useServices';
import { API_URL, fetchWithAuth } from '../../lib/fetcher';

const duration = (ms: number | null) => ms === null ? 'En curso' : ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60_000)} min`;

export function IncidentTimeline() {
  const { incidents, isLoading } = useIncidents('7d');
  const { services } = useServices();

  const exportCsv = async () => {
    const res = await fetchWithAuth(`${API_URL}/incidents/export.csv`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'devdash-incidents.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="font-bold flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-400 shrink-0" />
          Línea de incidentes · 7 días
        </h2>
        <button
          disabled={incidents.length === 0}
          onClick={exportCsv}
          className="glass-btn px-3 py-2 flex items-center justify-center gap-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-3 w-3" />
          Exportar CSV
        </button>
      </div>

      <div className="mt-4 divide-y divide-white/5">
        {isLoading ? (
          <p className="py-4 text-slate-400">Cargando incidentes…</p>
        ) : services.length === 0 ? (
          <p className="py-4 text-slate-400">Añade un servicio para comenzar a registrar incidentes.</p>
        ) : incidents.length === 0 ? (
          <p className="py-4 text-slate-400">No se registraron caídas durante este periodo.</p>
        ) : incidents.map(incident => (
          <article
            key={incident.id}
            className="py-4 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-5 text-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold">{incident.service.name}</p>
              <p className="text-xs text-slate-400 mt-1 break-words">
                {new Date(incident.startedAt).toLocaleString()} · {incident.message}
              </p>
            </div>
            <span className={`text-xs flex items-center gap-1 shrink-0 ${incident.status === 'open' ? 'text-red-400' : 'text-emerald-400'}`}>
              <Timer className="h-3 w-3" />
              {duration(incident.durationMs)}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
