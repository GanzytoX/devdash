export type ServiceMethod = 'GET' | 'POST' | 'HEAD';

export interface ServiceInput {
  name: string;
  url: string;
  method: ServiceMethod;
  interval: number;
  publicVisible?: boolean;
  tags?: string;
}

export const validMethod = (value: unknown): value is ServiceMethod =>
  typeof value === 'string' && ['GET', 'POST', 'HEAD'].includes(value);

export function parseServiceInput(body: Record<string, unknown>): ServiceInput;
export function parseServiceInput(body: Record<string, unknown>, partial: true): Partial<ServiceInput>;
export function parseServiceInput(
  body: Record<string, unknown>,
  partial = false,
): ServiceInput | Partial<ServiceInput> {
  const result: Partial<ServiceInput> = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) {
      throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
    }
    result.name = body.name.trim();
  }

  if (!partial || body.url !== undefined) {
    if (typeof body.url !== 'string' || body.url.length > 2048) {
      throw new Error('La URL es obligatoria.');
    }
    result.url = body.url;
  }

  if (!partial || body.method !== undefined) {
    if (!validMethod(body.method)) {
      throw new Error('El método debe ser GET, POST o HEAD.');
    }
    result.method = body.method;
  }

  if (!partial || body.interval !== undefined) {
    const interval = Number(body.interval);
    if (!Number.isInteger(interval) || interval < 30 || interval > 86400) {
      throw new Error('El intervalo debe estar entre 30 y 86400 segundos.');
    }
    result.interval = interval;
  }

  if (body.publicVisible !== undefined) {
    result.publicVisible = Boolean(body.publicVisible);
  }

  if (body.tags !== undefined) {
    result.tags = String(body.tags).slice(0, 200);
  }

  return result as ServiceInput;
}
