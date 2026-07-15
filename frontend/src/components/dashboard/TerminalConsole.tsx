import React, { useState, useRef, useEffect } from 'react';
import { useServices } from '../../hooks/useServices';
import { useLogs } from '../../hooks/useLogs';
import { fetchWithAuth, API_URL } from '../../lib/fetcher';
import { GlassCard } from '../common/GlassCard';
import { Terminal, Trash2, Copy, Check } from 'lucide-react';

interface ConsoleLine {
  text: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'input' | 'output';
}

export const TerminalConsole: React.FC = () => {
  const { services, triggerManualCheck } = useServices();
  const { logs, clearLogs } = useLogs();
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([
    { text: 'Terminal interactiva de disponibilidad DevDash v1.0.0-beta', type: 'info' },
    { text: 'Escribe "help" para ver la lista de comandos de diagnóstico disponibles.', type: 'info' },
    { text: '', type: 'info' },
  ]);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLines, logs]);

  const handleCopyOutput = () => {
    const systemLogsText = logs.map(log => `[${log.timestamp}] [${log.serviceName}] ${log.message}`).join('\n');
    const separator = consoleLines.length > 0 && logs.length > 0 ? '\n--- PROCESADOR DE COMANDOS DE DIAGNÓSTICO ---\n' : '';
    const consoleLinesText = consoleLines.map(line => line.text).join('\n');
    const fullOutputText = systemLogsText + separator + consoleLinesText;

    navigator.clipboard.writeText(fullOutputText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error al copiar logs:', err);
      });
  };

  const addConsoleLine = (text: string, type: ConsoleLine['type'] = 'output') => {
    setConsoleLines(prev => [...prev, { text, type }]);
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Add command to output
    setConsoleLines(prev => [...prev, { text: `op@devdash:~# ${cmd}`, type: 'input' }]);
    setCommandInput('');

    const tokens = cmd.split(' ');
    const primaryCmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    switch (primaryCmd) {
      case 'help':
        addConsoleLine('Comandos Disponibles:', 'info');
        addConsoleLine('  help               Muestra esta ayuda', 'info');
        addConsoleLine('  clear              Limpia la terminal de comandos manuales', 'info');
        addConsoleLine('  services           Lista todos los servicios monitoreados y su estado', 'info');
        addConsoleLine('  ping <url/name>    Ejecuta un diagnóstico ICMP sobre el host', 'info');
        addConsoleLine('  status             Muestra el diagnóstico de recursos del host autohospedado', 'info');
        break;

      case 'clear':
        setConsoleLines([]);
        break;

      case 'services':
        addConsoleLine('Lista de Servicios Registrados:', 'info');
        addConsoleLine('------------------------------------------------------------', 'info');
        services.forEach(s => {
          const statusChar = s.paused ? '⏸️' : s.status === 'online' ? '🟢' : s.status === 'degraded' ? '⚠️' : '🔴';
          const latencyStr = s.status === 'offline' ? 'N/D' : `${s.latency}ms`;
          const sslStr = s.sslStatus === 'valid' ? 'VÁLIDO' : s.sslStatus === 'expiring' ? 'EXPIRANDO' : s.sslStatus === 'expired' ? 'EXPIRADO' : 'NINGUNO';
          addConsoleLine(`[${s.id}] ${statusChar} ${s.name.padEnd(28)} | Ping: ${latencyStr.padEnd(6)} | SSL: ${sslStr}`, 'info');
        });
        break;

      case 'status':
        try {
          addConsoleLine('Consultando diagnóstico de hardware en tiempo real...', 'info');
          const res = await fetchWithAuth(`${API_URL}/system/detailed`);
          if (res.ok) {
            const data = await res.json();
            addConsoleLine('ESTADO DE LA INSTANCIA VPS (DIAGNÓSTICO REAL):', 'info');
            addConsoleLine(`  Tiempo activo       : ${data.systemUptime}`, 'info');
            addConsoleLine(`  Uso de CPU          : ${data.cpuUsage} (${data.cpuModel})`, 'info');
            addConsoleLine(`  Uso de RAM          : ${data.ramUsage}`, 'info');
            addConsoleLine(`  Espacio en Disco    : ${data.diskUsage}`, 'info');
            addConsoleLine(`  Persistencia DB     : SQLite (Prisma ORM activo)`, 'info');
          } else {
            addConsoleLine('Error: No se pudo obtener la respuesta del servidor.', 'error');
          }
        } catch {
          addConsoleLine('Error: Falló la conexión con el servidor backend.', 'error');
        }
        break;

      case 'ping': {
        if (args.length === 0) {
          addConsoleLine('Error: Debes especificar un host o nombre de servicio. Ej: ping github.com', 'error');
          break;
        }
        const targetHost = args[0];
        const matchedService = services.find(
          s => s.name.toLowerCase() === targetHost.toLowerCase() || s.url.includes(targetHost)
        );
        if (!matchedService) { addConsoleLine('El host debe estar registrado como servicio para aplicar las validaciones de seguridad.', 'error'); break; }
        addConsoleLine(`Ejecutando comprobación HTTP/SSL real para ${matchedService.name}…`, 'info');
        try {
          await triggerManualCheck(matchedService.id);
          addConsoleLine('Comprobación completada. Los datos del servicio fueron actualizados.', 'success');
        } catch (error) {
          addConsoleLine(error instanceof Error ? error.message : 'La comprobación falló.', 'error');
        }
        break;
      }

      default:
        addConsoleLine(`sh: comando no encontrado: ${primaryCmd}. Escribe 'help' para sugerencias.`, 'error');
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warn': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <GlassCard className="flex flex-col h-[320px] overflow-hidden p-0 rounded-2xl relative">
      {/* Console Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-brand-blue-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            Consola de Flujos y Diagnóstico de Red
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyOutput}
            className="p-1 rounded-lg border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
            title="Copiar salida de consola"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={clearLogs}
            className="p-1 rounded-lg border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
            title="Limpiar logs del sistema"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal View Body */}
      <div
        className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1.5 bg-slate-950/40 relative"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Real-time system streams (synced from state) */}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-slate-500 font-bold shrink-0">[{log.timestamp}]</span>
            <span className="text-brand-blue-400 font-semibold shrink-0">[{log.serviceName}]</span>
            <span className={getLogTypeColor(log.type)}>{log.message}</span>
          </div>
        ))}

        {/* Separator if user typed command lines */}
        {consoleLines.length > 0 && logs.length > 0 && (
          <div className="border-t border-white/5 my-3 pt-3 text-slate-600 font-bold">--- PROCESADOR DE COMANDOS DE DIAGNÓSTICO ---</div>
        )}

        {/* Console lines printed by user commands */}
        {consoleLines.map((line, idx) => (
          <div
            key={idx}
            className={`leading-relaxed ${
              line.type === 'input'
                ? 'text-slate-100 font-bold'
                : line.type === 'error'
                ? 'text-red-400'
                : line.type === 'success'
                ? 'text-emerald-400'
                : line.type === 'warn'
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {line.text}
          </div>
        ))}

        <div ref={outputEndRef} />
      </div>

      {/* Input CLI Bar */}
      <form
        onSubmit={handleCommandSubmit}
        className="px-6 py-2 bg-slate-950/60 border-t border-white/5 shrink-0 flex items-center gap-1.5 font-mono text-xs"
      >
        <span className="text-brand-blue-400 font-bold">op@devdash:~#</span>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={e => setCommandInput(e.target.value)}
          className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none caret-brand-blue-500 font-mono py-1"
          placeholder="Escribe un comando (ej. help, ping)..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {/* Blinking CLI Cursor */}
        <span className="animate-blink h-3.5 w-1.5 bg-brand-blue-600 rounded-sm"></span>
      </form>
    </GlassCard>
  );
};
