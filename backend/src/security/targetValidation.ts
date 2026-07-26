import dns from 'dns/promises';
import net from 'net';
import { config } from '../config';

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
