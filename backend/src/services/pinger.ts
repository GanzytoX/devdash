import axios from 'axios';
import https from 'https';
import { URL } from 'url';
import { performance } from 'perf_hooks';
import { assertSafeTarget } from '../security';

export interface PingResultInfo {
  status: 'online' | 'offline' | 'degraded';
  latency: number;
}

export interface SSLResultInfo {
  sslStatus: 'valid' | 'expiring' | 'expired' | 'none';
  sslExpiryDays: number | null;
  sslExpiryDate: string | null;
}

// Mide la latencia y la salud del servicio mediante una llamada HTTP/HEAD con timeout
export async function pingService(url: string, method: string): Promise<PingResultInfo> {
  const start = performance.now();
  try {
    await assertSafeTarget(url);
    const response = await axios({
      method: method as any,
      url: url,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: () => true, // Resolver la promesa para cualquier status code HTTP
      headers: {
        'User-Agent': 'DevDash/1.0.0-Uptime-Monitor'
      }
    });
    const duration = Math.round(performance.now() - start);

    // Consideramos "online" si es menor a 400 (códigos 2xx y 3xx)
    const isSuccess = response.status >= 200 && response.status < 400;

    if (!isSuccess) {
      return { status: 'offline', latency: duration };
    }

    // Si la latencia es extremadamente alta (> 1000ms), reporta "degraded"
    if (duration > 1000) {
      return { status: 'degraded', latency: duration };
    }

    return { status: 'online', latency: duration };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    return { status: 'offline', latency: duration };
  }
}

// Verifica de forma asíncrona la expiración del certificado SSL usando el cliente nativo de Node.js
export function checkSSL(urlString: string): Promise<SSLResultInfo> {
  if (!urlString.startsWith('https:')) {
    return Promise.resolve({
      sslStatus: 'none',
      sslExpiryDays: null,
      sslExpiryDate: null,
    });
  }

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlString);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'HEAD',
        rejectUnauthorized: false, // Permitir obtener datos aunque el cert esté vencido
        agent: false,
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        const socket = res.socket as any;
        if (socket && typeof socket.getPeerCertificate === 'function') {
          const cert = socket.getPeerCertificate(true);
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let sslStatus: 'valid' | 'expiring' | 'expired' = 'valid';
            if (!socket.authorized || diffDays <= 0) {
              sslStatus = 'expired';
            } else if (diffDays < 15) {
              sslStatus = 'expiring';
            }

            resolve({
              sslStatus,
              sslExpiryDays: diffDays,
              sslExpiryDate: expiryDate.toISOString().split('T')[0],
            });
            req.destroy();
            return;
          }
        }
        resolve({ sslStatus: 'expired', sslExpiryDays: 0, sslExpiryDate: 'Error' });
        req.destroy();
      });

      req.on('error', () => {
        resolve({ sslStatus: 'expired', sslExpiryDays: 0, sslExpiryDate: 'Error' });
      });

      req.on('timeout', () => {
        resolve({ sslStatus: 'expired', sslExpiryDays: 0, sslExpiryDate: 'Timeout' });
        req.destroy();
      });

      req.end();
    } catch (e) {
      resolve({ sslStatus: 'expired', sslExpiryDays: 0, sslExpiryDate: 'Error' });
    }
  });
}

// Envía alertas de canal a Slack/Discord si están configurados en el .env
export async function sendWebhookAlert(serviceName: string, url: string, status: string, details: string, onlyChannel?: 'slack' | 'discord' | 'generic') {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const genericUrl = process.env.GENERIC_WEBHOOK_URL;

  const color = status === 'online' ? '#10b981' : status === 'degraded' ? '#f59e0b' : '#ef4444';
  const emoji = status === 'online' ? '🟢' : status === 'degraded' ? '🟡' : '🔴';
  const statusLabel = status === 'online' ? 'EN LÍNEA' : status === 'degraded' ? 'DEGRADADO' : 'FUERA DE LÍNEA';

  if (slackUrl && (!onlyChannel || onlyChannel === 'slack')) {
    try {
      await axios.post(slackUrl, {
        attachments: [
          {
            color: color,
            title: `${emoji} Alerta DevDash: ${serviceName} está ${statusLabel}`,
            text: `El servicio ${serviceName} (${url}) cambió su estado a *${statusLabel}*.\nDetalles: ${details}`,
            ts: Math.floor(Date.now() / 1000),
          }
        ]
      });
    } catch (e) {
      console.error('Error enviando webhook a Slack:', e);
    }
  }

  if (discordUrl && (!onlyChannel || onlyChannel === 'discord')) {
    try {
      await axios.post(discordUrl, {
        embeds: [
          {
            color: parseInt(color.replace('#', ''), 16),
            title: `${emoji} Alerta DevDash: ${serviceName} está ${statusLabel}`,
            description: `El servicio [${serviceName}](${url}) cambió su estado a **${statusLabel}**.\n**Detalles:** ${details}`,
            timestamp: new Date().toISOString(),
          }
        ]
      });
    } catch (e) {
      console.error('Error enviando webhook a Discord:', e);
    }
  }

  if (genericUrl && (!onlyChannel || onlyChannel === 'generic')) {
    try {
      await axios.post(genericUrl, {
        event: 'service.status_changed', serviceName, url, status, details, timestamp: new Date().toISOString(),
      }, { timeout: 5000 });
    } catch (e) {
      console.error('Error enviando webhook genérico:', e);
    }
  }
}
