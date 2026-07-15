import { prisma } from '../db';
import { pingService, checkSSL, sendWebhookAlert } from './pinger';
import { config } from '../config';

export class PingerScheduler {
  private static instance: PingerScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private running: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): PingerScheduler {
    if (!PingerScheduler.instance) {
      PingerScheduler.instance = new PingerScheduler();
    }
    return PingerScheduler.instance;
  }

  // Inicializa el monitoreo de todos los servicios activos
  public async start(): Promise<void> {
    try {
      console.log('Iniciando planificador de monitoreo de red...');
      const services = await prisma.service.findMany({
        where: { paused: false }
      });

      console.log(`Se encontraron ${services.length} servicios activos para monitorear.`);
      for (const service of services) {
        this.schedule(service);
      }
      await this.pruneHistory();
    } catch (e) {
      console.error('Error al iniciar el planificador:', e);
    }
  }

  // Registra e inicia un temporizador de chequeo para un servicio
  public schedule(service: { id: string; name: string; url: string; method: string; interval: number }): void {
    this.unschedule(service.id);

    console.log(`Programando monitoreo para: ${service.name} cada ${service.interval}s`);

    // Ejecutar chequeo inicial inmediato en segundo plano
    this.runCheck(service.id).catch(err => {
      console.error(`Error en chequeo inicial de ${service.name}:`, err);
    });

    const timer = setInterval(async () => {
      try {
        await this.runCheck(service.id);
      } catch (err) {
        console.error(`Error en chequeo planificado de ${service.id}:`, err);
      }
    }, service.interval * 1000);

    this.intervals.set(service.id, timer);
  }

  // Cancela y elimina el temporizador de chequeo de un servicio
  public unschedule(serviceId: string): void {
    const timer = this.intervals.get(serviceId);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(serviceId);
      console.log(`Monitoreo detenido para el servicio: ${serviceId}`);
    }
  }

  // Ejecuta la lógica de chequeo HTTP + SSL y actualiza la base de datos
  public async runCheck(serviceId: string): Promise<void> {
    if (this.running.has(serviceId)) return;
    this.running.add(serviceId);
    try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service || service.paused) {
      this.unschedule(serviceId);
      return;
    }

    // Realizar pings HTTP y chequeo de certificado SSL
    const pingResult = await pingService(service.url, service.method);
    const sslResult = await checkSSL(service.url);

    const timestampStr = new Date().toLocaleTimeString();
    const previousStatus = service.status;
    const previousSslStatus = service.sslStatus;

    // Persistir el resultado individual del ping
    await prisma.pingResult.create({
      data: {
        serviceId: service.id,
        latency: pingResult.latency,
        status: pingResult.status
      }
    });

    // Actualizar el estado del servicio en la base de datos
    const updatedService = await prisma.service.update({
      where: { id: service.id },
      data: {
        status: pingResult.status,
        latency: pingResult.latency,
        sslStatus: sslResult.sslStatus,
        sslExpiryDays: sslResult.sslExpiryDays,
        sslExpiryDate: sslResult.sslExpiryDate,
        lastChecked: timestampStr
      }
    });

    // Registrar logs si el estado de red cambia
    if (previousStatus !== pingResult.status) {
      let logType: 'info' | 'success' | 'warn' | 'error' = 'info';
      let message = '';

      if (pingResult.status === 'online') {
        logType = 'success';
        message = `El servicio se ha recuperado y está en línea (${pingResult.latency} ms)`;
      } else if (pingResult.status === 'degraded') {
        logType = 'warn';
        message = `Servicio degradado. Latencia muy alta detectada (${pingResult.latency} ms)`;
      } else {
        logType = 'error';
        message = `El servicio está caído. No responde a las peticiones de red.`;
      }

      await prisma.logEntry.create({
        data: {
          timestamp: timestampStr,
          type: logType,
          message: message,
          serviceId: service.id,
          serviceName: service.name
        }
      });

      // Disparar Webhooks
      await sendWebhookAlert(service.name, service.url, pingResult.status, message);
    }

    if (previousStatus !== 'offline' && pingResult.status === 'offline') {
      await prisma.incident.create({
        data: { serviceId: service.id, type: 'outage', message: `El servicio dejó de estar disponible (${pingResult.latency} ms).` }
      });
    } else if (previousStatus === 'offline' && pingResult.status !== 'offline') {
      const openIncident = await prisma.incident.findFirst({
        where: { serviceId: service.id, status: 'open' }, orderBy: { startedAt: 'desc' }
      });
      if (openIncident) {
        const resolvedAt = new Date();
        await prisma.incident.update({
          where: { id: openIncident.id },
          data: { status: 'resolved', resolvedAt, durationMs: resolvedAt.getTime() - openIncident.startedAt.getTime() }
        });
      }
    }

    // Registrar logs si el estado del certificado SSL cambia
    if (previousSslStatus !== sslResult.sslStatus && sslResult.sslStatus !== 'none') {
      let logType: 'info' | 'success' | 'warn' | 'error' = 'info';
      let message = '';

      if (sslResult.sslStatus === 'valid') {
        logType = 'success';
        message = `Certificado SSL verificado como válido. Expira en ${sslResult.sslExpiryDays} días.`;
      } else if (sslResult.sslStatus === 'expiring') {
        logType = 'warn';
        message = `ADVERTENCIA: El certificado SSL expira pronto (en ${sslResult.sslExpiryDays} días: ${sslResult.sslExpiryDate})`;
      } else {
        logType = 'error';
        message = `PELIGRO: El certificado SSL ha expirado o está dañado.`;
      }

      await prisma.logEntry.create({
        data: {
          timestamp: timestampStr,
          type: logType,
          message: message,
          serviceId: service.id,
          serviceName: service.name
        }
      });
    }
    } finally {
      this.running.delete(serviceId);
    }
  }

  public async pruneHistory(): Promise<void> {
    const cutoff = new Date(Date.now() - config.retentionDays * 86_400_000);
    const [pings, logs] = await prisma.$transaction([
      prisma.pingResult.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.logEntry.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    ]);
    console.log(`Retention cleanup: ${pings.count} pings and ${logs.count} logs removed.`);
  }

  public stop(): void {
    for (const timer of this.intervals.values()) clearInterval(timer);
    this.intervals.clear();
  }
}
export const scheduler = PingerScheduler.getInstance();
