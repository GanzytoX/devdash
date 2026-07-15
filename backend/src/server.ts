import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { scheduler } from "./services/scheduler";
import os from 'os';
import { execSync } from 'child_process';
import type { NextFunction, Request, Response } from 'express';
import { config, validateConfig } from './config';
import { assertSafeTarget, loginRateLimit, parseServiceInput, securityHeaders } from './security';

dotenv.config();

const app = express();
validateConfig();
const PORT = config.port;
const JWT_SECRET = config.jwtSecret;

app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.nodeEnv !== 'production' || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '32kb' }));

// Seed default admin user
async function seedAdminUser() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("No users found. Seeding default admin user...");
      if (!config.adminUsername || !config.adminPassword || config.adminPassword.length < 12) {
        console.warn('No users exist. Set ADMIN_USERNAME and a 12+ character ADMIN_PASSWORD to create the first account.');
        return;
      }
      const hashedPassword = await bcrypt.hash(config.adminPassword, 12);
      await prisma.user.create({
        data: {
          username: config.adminUsername,
          password: hashedPassword,
        },
      });
      console.log(`Initial administrator created: ${config.adminUsername}.`);
    }
  } catch (error) {
    console.error("Error seeding default admin user:", error);
  }
}

// Middleware to authenticate JWT tokens
type AuthenticatedRequest = Request & { user?: { id: string; username: string } };
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Falta el token de sesión." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "El token no es válido o ha vencido." });
    }
    req.user = user as { id: string; username: string };
    next();
  });
};

// --- AUTH ROUTE (Unprotected) ---

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', version: '1.0.0-beta', timestamp: new Date().toISOString() });
  } catch { res.status(503).json({ status: 'unhealthy' }); }
});

const periodSince = (period: string) => {
  const duration = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  return new Date(Date.now() - duration * 86_400_000);
};

app.get('/api/public/status', async (req, res) => {
  const period = ['24h', '7d', '30d'].includes(String(req.query.period)) ? String(req.query.period) : '24h';
  const since = periodSince(period);
  const services = await prisma.service.findMany({
    where: { publicVisible: true },
    include: { pingResults: { where: { timestamp: { gte: since } }, orderBy: { timestamp: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  const incidents = await prisma.incident.findMany({
    where: { startedAt: { gte: since }, service: { publicVisible: true } },
    include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 30,
  });
  const mapped = services.map(service => {
    const total = service.pingResults.length;
    const successful = service.pingResults.filter(p => p.status !== 'offline').length;
    const latencies = service.pingResults.filter(p => p.status !== 'offline').map(p => p.latency);
    return {
      id: service.id, name: service.name, status: service.paused ? 'paused' : service.status,
      lastChecked: service.lastChecked, sslStatus: service.sslStatus, sslExpiryDays: service.sslExpiryDays,
      tags: service.tags.split(',').map(t => t.trim()).filter(Boolean),
      uptime: total ? Number(((successful / total) * 100).toFixed(2)) : null,
      averageLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      history: service.pingResults.slice(-60).map(p => ({ timestamp: p.timestamp, status: p.status, latency: p.latency })),
    };
  });
  const operational = mapped.every(s => s.status === 'online' || s.status === 'paused');
  res.json({ instance: config.instanceName, region: config.instanceRegion, hostedOn: 'CubePath', period, operational, updatedAt: new Date().toISOString(), services: mapped, incidents });
});

app.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "El usuario y la contraseña son obligatorios." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Protect all subsequent API endpoints
app.use("/api", authenticateToken);

// --- ENDPOINTS DE LA API (Protected) ---

// 1. Obtener lista de servicios con sus historiales agregados
app.get("/api/services", async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        pingResults: {
          orderBy: { timestamp: "desc" },
          take: 30,
        },
      },
    });

    // Mapear los datos al formato esperado por el frontend
    const mappedServices = services.map((s) => {
      // Revertir para orden cronológico (más antiguo al más nuevo)
      const results = [...s.pingResults].reverse();
      const uptimeHistory = results.map((r) => r.status !== "offline");
      const latencyHistory = results.slice(-24).map((r) => r.latency);

      return {
        id: s.id,
        name: s.name,
        url: s.url,
        method: s.method,
        status: s.status,
        latency: s.latency,
        sslStatus: s.sslStatus,
        sslExpiryDays: s.sslExpiryDays,
        sslExpiryDate: s.sslExpiryDate,
        interval: s.interval,
        paused: s.paused,
        publicVisible: s.publicVisible,
        tags: s.tags,
        lastChecked: s.lastChecked,
        uptimeHistory,
        latencyHistory,
      };
    });

    res.json(mappedServices);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 2. Crear un nuevo servicio
app.post("/api/services", async (req, res) => {
  try {
    const input = parseServiceInput(req.body);
    await assertSafeTarget(String(input.url));

    const timestampStr = new Date().toLocaleTimeString();

    // Crear registro en la base de datos con estado inicial offline
    const service = await prisma.service.create({
      data: {
        ...(input as any),
        status: "unknown",
        latency: 0,
        sslStatus: "none",
        paused: false,
        lastChecked: timestampStr,
      },
    });

    // Registrar en logs del sistema
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Servicio registrado: ${input.name} (${input.url})`,
        serviceId: service.id,
        serviceName: String(input.name),
      },
    });

    // Programar el pinger
    scheduler.schedule(service);

    res.status(201).json(service);
  } catch (error) {
    console.error("Error al crear servicio:", error);
    res.status(error instanceof Error && /nombre|URL|método|intervalo|destinos|HTTP/i.test(error.message) ? 400 : 500).json({ error: error instanceof Error ? error.message : "Error interno del servidor" });
  }
});

// 3. Editar un servicio existente
app.put("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const input = parseServiceInput(req.body, true);
    if (input.url) await assertSafeTarget(String(input.url));

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(input as any),
      },
    });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Configuración de servicio actualizada: ${updated.name}`,
        serviceId: updated.id,
        serviceName: updated.name,
      },
    });

    // Reprogramar el pinger si está activo
    if (!updated.paused) {
      scheduler.schedule(updated);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error al actualizar servicio:", error);
    res.status(error instanceof Error && /nombre|URL|método|intervalo|destinos|HTTP/i.test(error.message) ? 400 : 500).json({ error: error instanceof Error ? error.message : "Error interno del servidor" });
  }
});

// 4. Eliminar un servicio
app.delete("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    // Detener el pinger
    scheduler.unschedule(id);

    // Borrado en cascada (Prisma lo maneja según schema)
    await prisma.service.delete({ where: { id } });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Servicio eliminado permanentemente: ${existing.name}`,
      },
    });

    res.json({ success: true, message: "Servicio eliminado" });
  } catch (error) {
    console.error("Error al borrar servicio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 5. Alternar pausa de monitoreo
app.post("/api/services/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const nextPauseState = !existing.paused;

    const updated = await prisma.service.update({
      where: { id },
      data: { paused: nextPauseState },
    });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: nextPauseState
          ? `Monitoreo pausado para: ${existing.name}`
          : `Monitoreo reanudado para: ${existing.name}`,
        serviceId: existing.id,
        serviceName: existing.name,
      },
    });

    if (nextPauseState) {
      scheduler.unschedule(id);
    } else {
      scheduler.schedule(updated);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error al alternar pausa de servicio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 6. Forzar chequeo de ping y SSL manual inmediato
app.post("/api/services/:id/check", async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    await scheduler.runCheck(service.id);
    const updated = await prisma.service.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    console.error("Error en chequeo manual:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 7. Obtener logs recientes para el terminal
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await prisma.logEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Los devolvemos en orden inverso para que aparezcan correctamente ordenados cronológicamente
    res.json(logs.reverse());
  } catch (error) {
    console.error("Error al obtener logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 8. Limpiar todos los logs del sistema
app.delete("/api/logs", async (req, res) => {
  try {
    await prisma.logEntry.deleteMany({});

    // Crear log de reinicio del terminal
    await prisma.logEntry.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message:
          "Historial de consola del terminal reiniciado por el operador.",
      },
    });

    res.json({ success: true, message: "Logs limpiados con éxito." });
  } catch (error) {
    console.error("Error al limpiar logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get('/api/incidents', async (req, res) => {
  const period = ['24h', '7d', '30d'].includes(String(req.query.period)) ? String(req.query.period) : '7d';
  res.json(await prisma.incident.findMany({ where: { startedAt: { gte: periodSince(period) } }, include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 200 }));
});

app.get('/api/incidents/export.csv', async (_req, res) => {
  const incidents = await prisma.incident.findMany({ include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' } });
  const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['service','type','status','startedAt','resolvedAt','durationSeconds','message'], ...incidents.map(i => [i.service.name, i.type, i.status, i.startedAt.toISOString(), i.resolvedAt?.toISOString() || '', i.durationMs ? Math.round(i.durationMs / 1000) : '', i.message])];
  res.type('text/csv').attachment('devdash-incidents.csv').send(rows.map(r => r.map(escape).join(',')).join('\n'));
});

app.get('/api/settings', (_req, res) => res.json({
  slackConfigured: Boolean(process.env.SLACK_WEBHOOK_URL), discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
  genericConfigured: Boolean(process.env.GENERIC_WEBHOOK_URL), publicAppUrl: config.publicAppUrl,
  instanceName: config.instanceName, instanceRegion: config.instanceRegion, retentionDays: config.retentionDays,
}));

app.post('/api/settings/test-webhook/:channel', async (req, res) => {
  const channel = req.params.channel;
  const envName = channel === 'slack' ? 'SLACK_WEBHOOK_URL' : channel === 'discord' ? 'DISCORD_WEBHOOK_URL' : channel === 'generic' ? 'GENERIC_WEBHOOK_URL' : '';
  if (!envName) return res.status(400).json({ error: 'El canal de webhook no existe.' });
  if (!process.env[envName]) return res.status(400).json({ error: `${channel} no está configurado en el servidor.` });
  await (await import('./services/pinger')).sendWebhookAlert('Prueba de DevDash', config.publicAppUrl, 'online', 'Un operador autenticado solicitó esta alerta de prueba.', channel as 'slack' | 'discord' | 'generic');
  res.json({ success: true });
});

// 9. Get live OS statistics (fast uptime)
app.get("/api/system/stats", (req, res) => {
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
app.get("/api/system/detailed", (req, res) => {
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

// Server initialization
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 DevDash server successfully started on port ${PORT}`);

  // Seed default admin user
  await seedAdminUser();

  // Start scheduler
  await scheduler.start();
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down cleanly.`);
  scheduler.stop();
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
