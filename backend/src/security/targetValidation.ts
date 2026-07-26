import dns from 'dns/promises';
import net from 'net';
import { config } from '../config';
import { RequestValidationError } from '../errors/RequestValidationError';

export interface ResolvedTarget {
  url: URL;
  hostname: string;
  address: string;
  family: 4 | 6;
}

const blockedAddresses = new net.BlockList();

[
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
].forEach(([address, prefix]) => {
  blockedAddresses.addSubnet(String(address), Number(prefix), 'ipv4');
});

[
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
].forEach(([address, prefix]) => {
  blockedAddresses.addSubnet(String(address), Number(prefix), 'ipv6');
});

export const isBlockedAddress = (address: string) => {
  if (net.isIPv4(address)) return blockedAddresses.check(address, 'ipv4');
  if (net.isIPv6(address)) {
    if (address.toLowerCase().startsWith('::ffff:')) return true;
    return blockedAddresses.check(address, 'ipv6');
  }
  return true;
};

export async function resolveSafeTarget(value: string): Promise<ResolvedTarget> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new RequestValidationError('La URL no es válida.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new RequestValidationError('Solo se admiten direcciones HTTP y HTTPS.');
  }
  if (url.username || url.password) {
    throw new RequestValidationError('No se permiten credenciales dentro de la URL.');
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(
      url.hostname.replace(/^\[|\]$/g, ''),
      { all: true, verbatim: true },
    );
  } catch {
    throw new RequestValidationError('No se pudo resolver el dominio indicado.');
  }

  if (!addresses.length) {
    throw new RequestValidationError('No se pudo resolver el dominio indicado.');
  }
  if (!config.allowPrivateTargets && addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new RequestValidationError('Los destinos de red privados, locales y de metadatos están bloqueados.');
  }

  const selected = addresses[0];
  const family = net.isIP(selected.address);
  if (family !== 4 && family !== 6) {
    throw new RequestValidationError('El dominio devolvió una dirección de red no válida.');
  }

  return {
    url,
    hostname: url.hostname.replace(/^\[|\]$/g, ''),
    address: selected.address,
    family,
  };
}

export async function assertSafeTarget(value: string) {
  return (await resolveSafeTarget(value)).url;
}
