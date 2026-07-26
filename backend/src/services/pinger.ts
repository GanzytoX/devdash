import axios from 'axios';
import http from 'http';
import https from 'https';
import { TLSSocket } from 'tls';
import { URL } from 'url';
import { performance } from 'perf_hooks';
import {
  resolveSafeTarget,
  type ResolvedTarget,
} from '../security/targetValidation';

export interface PingResultInfo {
  status: 'online' | 'offline' | 'degraded';
  latency: number;
}

export interface SSLResultInfo {
  sslStatus: 'valid' | 'expiring' | 'expired' | 'invalid' | 'unknown' | 'none';
  sslExpiryDays: number | null;
  sslExpiryDate: string | null;
}

const buildPinnedRequest = (target: ResolvedTarget) => {
  const requestUrl = new URL(target.url);
  requestUrl.hostname = target.family === 6 ? `[${target.address}]` : target.address;

  return {
    requestUrl: requestUrl.toString(),
    hostHeader: target.url.host,
    httpsAgent: target.url.protocol === 'https:'
      ? new https.Agent({ servername: target.hostname })
      : undefined,
    httpAgent: target.url.protocol === 'http:'
      ? new http.Agent()
      : undefined,
  };
};

export async function pingService(url: string, method: string): Promise<PingResultInfo> {
  const start = performance.now();
  try {
    const target = await resolveSafeTarget(url);
    const pinned = buildPinnedRequest(target);
    const response = await axios({
      method,
      url: pinned.requestUrl,
      timeout: 5000,
      maxRedirects: 0,
      proxy: false,
      responseType: 'stream',
      httpAgent: pinned.httpAgent,
      httpsAgent: pinned.httpsAgent,
      validateStatus: () => true,
      headers: {
        Host: pinned.hostHeader,
        'User-Agent': 'DevDash/1.0.0-Uptime-Monitor'
      },
    });
    response.data.destroy();
    const duration = Math.round(performance.now() - start);

    const isSuccess = response.status >= 200 && response.status < 400;

    if (!isSuccess) {
      return { status: 'offline', latency: duration };
    }

    if (duration > 1000) {
      return { status: 'degraded', latency: duration };
    }

    return { status: 'online', latency: duration };
  } catch {
    const duration = Math.round(performance.now() - start);
    return { status: 'offline', latency: duration };
  }
}

export async function checkSSL(urlString: string): Promise<SSLResultInfo> {
  if (!urlString.startsWith('https:')) {
    return {
      sslStatus: 'none',
      sslExpiryDays: null,
      sslExpiryDate: null,
    };
  }

  let target: ResolvedTarget;
  try {
    target = await resolveSafeTarget(urlString);
  } catch {
    return { sslStatus: 'unknown', sslExpiryDays: null, sslExpiryDate: null };
  }

  return new Promise((resolve) => {
    try {
      const options = {
        hostname: target.address,
        servername: target.hostname,
        port: target.url.port || 443,
        path: target.url.pathname + target.url.search,
        method: 'HEAD',
        headers: { Host: target.url.host },
        rejectUnauthorized: false,
        agent: false,
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        const socket = res.socket;
        if (socket instanceof TLSSocket) {
          const cert = socket.getPeerCertificate(true);
          if (cert && cert.valid_to) {
            const expiryDate = new Date(cert.valid_to);
            const now = new Date();
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let sslStatus: SSLResultInfo['sslStatus'] = 'valid';
            if (diffDays <= 0) {
              sslStatus = 'expired';
            } else if (!socket.authorized) {
              sslStatus = 'invalid';
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
        resolve({ sslStatus: 'unknown', sslExpiryDays: null, sslExpiryDate: null });
        req.destroy();
      });

      req.on('error', () => {
        resolve({ sslStatus: 'unknown', sslExpiryDays: null, sslExpiryDate: null });
      });

      req.on('timeout', () => {
        resolve({ sslStatus: 'unknown', sslExpiryDays: null, sslExpiryDate: null });
        req.destroy();
      });

      req.end();
    } catch {
      resolve({ sslStatus: 'unknown', sslExpiryDays: null, sslExpiryDate: null });
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
      }, { timeout: 5000, maxRedirects: 0 });
    } catch {
      console.error('No se pudo entregar el webhook de Slack.');
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
      }, { timeout: 5000, maxRedirects: 0 });
    } catch {
      console.error('No se pudo entregar el webhook de Discord.');
    }
  }

  if (genericUrl && (!onlyChannel || onlyChannel === 'generic')) {
    try {
      await axios.post(genericUrl, {
        event: 'service.status_changed', serviceName, url, status, details, timestamp: new Date().toISOString(),
      }, { timeout: 5000, maxRedirects: 0 });
    } catch {
      console.error('No se pudo entregar el webhook genérico.');
    }
  }
}
