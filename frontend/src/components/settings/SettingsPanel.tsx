import { useState } from 'react';
import { CheckCircle2, Database, ExternalLink, Send, Settings, ShieldCheck, XCircle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useSystemDetailed } from '../../hooks/useSystemDetailed';

export function SettingsPanel() {
  const { settings, testWebhook } = useSettings();
  const { dbProvider } = useSystemDetailed();
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState('');
  const runTest = async (channel: 'slack'|'discord'|'generic') => {
    setTesting(channel); setMessage('');
    try { await testWebhook(channel); setMessage(`La prueba de ${channel} se envió correctamente.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo probar el webhook.'); }
    finally { setTesting(''); }
  };
  const channels = [
    ['slack', settings?.slackConfigured], ['discord', settings?.discordConfigured], ['generic', settings?.genericConfigured],
  ] as const;
  return <div className="space-y-8 animate-fade-in text-xs">
    <section className="glass-panel p-6 rounded-2xl space-y-5"><h2 className="flex items-center gap-2 font-mono font-bold uppercase"><Settings className="h-4 w-4 text-brand-blue-400" /> Canales de alertas</h2>
      <p className="text-slate-400">Los secretos se administran de forma segura mediante variables de entorno del servidor. DevDash nunca envía las URL de los webhooks al navegador.</p>
      <div className="grid sm:grid-cols-3 gap-3">{channels.map(([channel, configured]) => <div key={channel} className="bg-white/5 border border-white/5 rounded-xl p-4"><div className="flex justify-between"><strong className="capitalize">{channel === 'generic' ? 'Genérico' : channel}</strong>{configured ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-slate-500" />}</div><p className="text-slate-400 mt-2">{configured ? 'Configurado' : 'Sin configurar'}</p><button disabled={!configured || Boolean(testing)} onClick={() => runTest(channel)} className="glass-btn mt-3 px-3 py-2 flex items-center gap-2 disabled:opacity-40"><Send className="h-3 w-3" />{testing === channel ? 'Enviando…' : 'Enviar prueba real'}</button></div>)}</div>
      {message && <p role="status" className="bg-brand-blue-500/10 border border-brand-blue-500/20 rounded-lg p-3">{message}</p>}
    </section>
    <section className="glass-panel p-6 rounded-2xl space-y-4"><h2 className="flex items-center gap-2 font-mono font-bold uppercase"><Database className="h-4 w-4 text-brand-blue-400" /> Configuración de la instancia</h2><div className="grid sm:grid-cols-2 gap-5"><div><p className="text-slate-400">Instancia</p><p className="mt-1 font-semibold">{settings?.instanceName || 'Cargando…'}</p><p className="text-slate-400 mt-1">{settings?.instanceRegion}</p></div><div><p className="text-slate-400">Almacenamiento</p><p className="mt-1 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" />{dbProvider}</p><p className="text-slate-400 mt-1">Conservación del historial: {settings?.retentionDays} días</p></div></div><a href="/status" target="_blank" rel="noopener noreferrer" className="glass-btn inline-flex px-3 py-2 items-center gap-2">Abrir página pública de estado <ExternalLink className="h-3 w-3" /></a></section>
  </div>;
}
