import React, { useState, useEffect } from 'react';
import { useDashboard } from './context/DashboardContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { OverviewStats } from './components/dashboard/OverviewStats';
import { PerformanceChart } from './components/dashboard/PerformanceChart';
import { TerminalConsole } from './components/dashboard/TerminalConsole';
import { ServicesGrid } from './components/services/ServicesGrid';
import { ServiceFormModal } from './components/services/ServiceFormModal';
import type { Service } from './services/apiService';
import { LoginView } from './components/auth/LoginView';
import { useServices } from './hooks/useServices';
import { useLogs } from './hooks/useLogs';
import { IncidentTimeline } from './components/dashboard/IncidentTimeline';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useIncidents } from './hooks/useIncidents';
import {
  LineChart,
  AlertOctagon,
  CheckCircle2,
  Gauge,
} from 'lucide-react';

export const App: React.FC = () => {
  const { activeView, isAuthenticated, processNewLogs } = useDashboard();
  const { services } = useServices();
  const { logs } = useLogs();
  const { incidents } = useIncidents('7d');

  // Process new logs for notifications
  useEffect(() => {
    if (logs.length > 0) {
      processNewLogs(logs);
    }
  // processNewLogs intentionally reads the latest context state while logs are the event source.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  // Modal handlers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);


  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleAddService = () => {
    setSelectedService(null);
    setIsModalOpen(true);
  };


  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Row 1: Metrics summary grid */}
            <OverviewStats />

            {/* Row 2: Performance Chart and Mini Activity summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PerformanceChart />
              </div>

              {/* Incident report sidebar */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <AlertOctagon className="h-4 w-4 text-brand-blue-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                    Diagnóstico de Red
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                  {services.map(s => {
                    // Weighting: 60% current instant status + 40% historical uptime consistency (last 30 checks)
                    const currentWeight = s.status === 'offline' ? 0 : s.status === 'degraded' ? 80 : 100;
                    const successfulChecks = s.uptimeHistory.filter(Boolean).length;
                    const historyUptimeRatio = s.uptimeHistory.length > 0
                      ? (successfulChecks / s.uptimeHistory.length) * 100
                      : 100;

                    const healthPercent = Math.round(currentWeight * 0.6 + historyUptimeRatio * 0.4);

                    return (
                      <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{s.name}</span>
                          <span className={`font-mono text-[10px] font-bold ${
                            s.status === 'online'
                              ? 'text-emerald-400'
                              : s.status === 'degraded'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {s.status === 'online' ? 'EN LÍNEA' : s.status === 'degraded' ? 'DEGRADADO' : 'CAÍDO'}
                          </span>
                        </div>

                        {/* Custom progress indicators */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>Puntuación de salud:</span>
                            <span>{healthPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                healthPercent >= 90
                                  ? 'bg-emerald-500'
                                  : healthPercent >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${healthPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 3: Interactive Command Line Terminal (Signature) */}
            <TerminalConsole />
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6 animate-fade-in">
            <ServicesGrid
              onAddClick={handleAddService}
              onEditClick={handleEditService}
            />
          </div>
        );

      case 'analytics': {
        // Dynamically computed real statistics
        const allUptimeChecks = services.flatMap(s => s.uptimeHistory);
        const totalUptimeChecks = allUptimeChecks.length;
        const successfulUptimeChecks = allUptimeChecks.filter(Boolean).length;
        const realAvgUptime = totalUptimeChecks > 0
          ? ((successfulUptimeChecks / totalUptimeChecks) * 100).toFixed(2) + '%'
          : '100.00%';

        // Count of real outages from the persisted log history
        const realCaidasCount = incidents.length;

        // Real aggregate latency average of all active services
        const activeServicesList = services.filter(s => s.status !== 'offline' && !s.paused && s.latency > 0);
        const realAvgLatency = activeServicesList.length > 0
          ? (activeServicesList.reduce((sum, s) => sum + s.latency, 0) / activeServicesList.length).toFixed(1) + ' ms'
          : '-- ms';

        return (
          <div className="space-y-8 animate-fade-in">
            {/* Analytics overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-brand-blue-500/10 text-brand-blue-400 rounded-xl border border-brand-blue-500/20">
                  <Gauge className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold font-mono text-white">{realAvgUptime}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Disponibilidad · últimas 30 verificaciones</p>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold font-mono text-white">{realCaidasCount} {realCaidasCount === 1 ? 'Caída' : 'Caídas'}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Incidentes · 7 días</p>
                </div>
              </div>
              <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20">
                  <LineChart className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xl font-bold font-mono text-white">{realAvgLatency}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Latencia Agregada</p>
                </div>
              </div>
            </div>

            {/* Performance line comparison */}
            <PerformanceChart />
            <IncidentTimeline />

            {/* Latency Percentiles matrix */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Matriz de Consistencia y Percentiles de Latencia
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 font-mono text-slate-400">
                      <th className="p-4 font-semibold">Servicio</th>
                      <th className="p-4 font-semibold text-right">Promedio</th>
                      <th className="p-4 font-semibold text-right">P90</th>
                      <th className="p-4 font-semibold text-right">P95</th>
                      <th className="p-4 font-semibold text-right">P99</th>
                      <th className="p-4 font-semibold text-right">Desviación Estándar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-slate-200">
                    {services.map(s => {
                      const history = s.latencyHistory.filter(l => l > 0);
                      const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0;

                      const sorted = [...history].sort((a, b) => a - b);
                      const getPercentile = (p: number) => {
                        if (sorted.length === 0) return 0;
                        const index = Math.ceil((p / 100) * sorted.length) - 1;
                        return sorted[Math.max(0, index)];
                      };
                      const p90 = getPercentile(90);
                      const p95 = getPercentile(95);
                      const p99 = getPercentile(99);

                      const getStdDev = () => {
                        if (history.length <= 1) return 0;
                        const mean = history.reduce((a, b) => a + b, 0) / history.length;
                        const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
                        return Math.sqrt(variance);
                      };
                      const stdDev = getStdDev().toFixed(1);

                      return (
                        <tr key={s.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-sans font-bold flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              s.status === 'online' ? 'bg-emerald-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            {s.name}
                          </td>
                          <td className="p-4 text-right">{avg > 0 ? `${avg} ms` : '--'}</td>
                          <td className="p-4 text-right">{p90 > 0 ? `${p90} ms` : '--'}</td>
                          <td className="p-4 text-right">{p95 > 0 ? `${p95} ms` : '--'}</td>
                          <td className="p-4 text-right">{p99 > 0 ? `${p99} ms` : '--'}</td>
                          <td className="p-4 text-right text-slate-400">{avg > 0 ? `±${stdDev} ms` : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'settings':
        return <SettingsPanel />;

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-[#060a13] to-[#060a13]">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main dashboard content panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* Render selected route panel */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {renderView()}
        </main>

        <Footer />
      </div>

      {/* Glassmorphic Endpoint Form Modal */}
      <ServiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingService={selectedService}
      />
    </div>
  );
};

export default App;
