import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  reset: number;
}

export function createRequestRateLimit(options: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const existing = entries.get(key);
    if (!existing && entries.size >= 10_000) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.reset <= now) entries.delete(storedKey);
      }
      if (entries.size >= 10_000) {
        return res.status(429).json({
          error: 'El servicio está recibiendo demasiadas solicitudes.',
        });
      }
    }
    const entry = !existing || existing.reset <= now
      ? { count: 0, reset: now + options.windowMs }
      : existing;

    entry.count += 1;
    entries.set(key, entry);

    res.setHeader('RateLimit-Limit', options.maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, options.maxRequests - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil(entry.reset / 1000));

    if (entry.count > options.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({
        error: 'Se alcanzó el límite temporal de solicitudes.',
      });
    }

    next();
  };
}
