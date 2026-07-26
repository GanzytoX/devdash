import { Router } from "express";
import os from "os";
import { execSync } from "child_process";
import { config } from "../config";

const router = Router();

// 9. Get live OS statistics (fast uptime)
router.get("/api/system/stats", (req, res) => {
  try {
    const uptime = os.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const vpsUptime = `${days}d ${hours}h ${minutes}m`;

    res.json({
      serverStatus: "online",
      vpsUptime: vpsUptime,
    });
  } catch (error) {
    console.error("Error fetching machine uptime:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 10. Get detailed hardware diagnostics in real-time (CPU, RAM, Disk)
router.get("/api/system/detailed", (req, res) => {
  try {
    const uptime = os.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const systemUptime = `${days} días, ${hours} horas, ${minutes} minutos`;

    // CPU information
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : "CPU Genérica";
    const loadAvg = os.loadavg()[0]; // Last minute load average
    const cpuCores = cpus.length || 1;
    const cpuUsagePercent = Math.min(100, Math.round((loadAvg / cpuCores) * 100));
    const cpuUsage = `${cpuUsagePercent}% (${cpuCores} vCPU)`;

    // RAM information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const ramPercent = Math.round((usedMemory / totalMemory) * 100);
    const ramUsage = `${(usedMemory / (1024 ** 3)).toFixed(2)} GB / ${(
      totalMemory /
      (1024 ** 3)
    ).toFixed(2)} GB (${ramPercent}%)`;

    // Disk space information
    let diskUsage = "No Disponible";
    try {
      const out = execSync("df -h / | tail -1").toString().trim();
      const parts = out.split(/\s+/);
      if (parts.length >= 5) {
        diskUsage = `${parts[2]} / ${parts[1]} (${parts[4]})`;
      }
    } catch (e) {
      diskUsage = "Unavailable on this operating system";
    }

    const dbProvider = "Conector SQLite Activo (Incrustado Local)";

    res.json({
      systemUptime,
      cpuModel,
      cpuUsage,
      ramUsage,
      diskUsage,
      dbProvider,
      instanceName: config.instanceName,
      instanceRegion: config.instanceRegion,
      version: '1.0.0-beta'
    });
  } catch (error) {
    console.error("Error fetching detailed hardware diagnostics:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get('/api/settings', (_req, res) => res.json({
  slackConfigured: Boolean(process.env.SLACK_WEBHOOK_URL), discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
  genericConfigured: Boolean(process.env.GENERIC_WEBHOOK_URL), publicAppUrl: config.publicAppUrl,
  instanceName: config.instanceName, instanceRegion: config.instanceRegion, retentionDays: config.retentionDays,
}));

router.post('/api/settings/test-webhook/:channel', async (req, res) => {
  const channel = req.params.channel;
  const envName = channel === 'slack' ? 'SLACK_WEBHOOK_URL' : channel === 'discord' ? 'DISCORD_WEBHOOK_URL' : channel === 'generic' ? 'GENERIC_WEBHOOK_URL' : '';
  if (!envName) return res.status(400).json({ error: 'El canal de webhook no existe.' });
  if (!process.env[envName]) return res.status(400).json({ error: `${channel} no está configurado en el servidor.` });
  await (await import('../services/pinger')).sendWebhookAlert('Prueba de DevDash', config.publicAppUrl, 'online', 'Un operador autenticado solicitó esta alerta de prueba.', channel as 'slack' | 'discord' | 'generic');
  res.json({ success: true });
});

export default router;
