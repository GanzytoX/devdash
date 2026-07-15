import dns from 'dns/promises';
import net from 'net';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config';

const privateV4 = (ip: string) => {
  const p = ip.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || p[0] >= 224;
};

const privateIp = (ip: string) => net.isIPv4(ip)
  ? privateV4(ip)
  : ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');

export async function assertSafeTarget(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('La URL no es válida.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Solo se admiten direcciones HTTP y HTTPS.');
  if (url.username || url.password) throw new Error('No se permiten credenciales dentro de la URL.');
  if (config.allowPrivateTargets) return url;
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
    throw new Error('Los destinos de red privados, locales y de metadatos están bloqueados.');
  }
  return url;
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  next();
}

const attempts = new Map<string, { count: number; reset: number }>();
export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset <= now) attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
  else if (++entry.count > 10) return res.status(429).json({ error: 'Demasiados intentos de acceso. Inténtalo más tarde.' });
  next();
}

export const validMethod = (value: unknown): value is 'GET' | 'POST' | 'HEAD' =>
  typeof value === 'string' && ['GET', 'POST', 'HEAD'].includes(value);

export function parseServiceInput(body: Record<string, unknown>, partial = false) {
  const result: Record<string, unknown> = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
    result.name = body.name.trim();
  }
  if (!partial || body.url !== undefined) {
    if (typeof body.url !== 'string' || body.url.length > 2048) throw new Error('La URL es obligatoria.');
    result.url = body.url;
  }
  if (!partial || body.method !== undefined) {
    if (!validMethod(body.method)) throw new Error('El método debe ser GET, POST o HEAD.');
    result.method = body.method;
  }
  if (!partial || body.interval !== undefined) {
    const interval = Number(body.interval);
    if (!Number.isInteger(interval) || interval < 30 || interval > 86400) throw new Error('El intervalo debe estar entre 30 y 86400 segundos.');
    result.interval = interval;
  }
  if (body.publicVisible !== undefined) result.publicVisible = Boolean(body.publicVisible);
  if (body.tags !== undefined) result.tags = String(body.tags).slice(0, 200);
  return result;
}
