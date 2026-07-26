import type { NextFunction, Request, Response } from 'express';

const attempts = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && entry.reset <= now) attempts.delete(key);

  const activeEntry = attempts.get(key);
  if (activeEntry && activeEntry.count >= MAX_ATTEMPTS) {
    res.setHeader('Retry-After', Math.ceil((activeEntry.reset - now) / 1000));
    return res.status(429).json({
      error: 'Demasiados intentos de acceso. Inténtalo más tarde.',
    });
  }

  res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      attempts.delete(key);
    } else if (res.statusCode === 401) {
      if (!attempts.has(key) && attempts.size >= 10_000) {
        const oldestKey = attempts.keys().next().value;
        if (typeof oldestKey === 'string') attempts.delete(oldestKey);
      }
      const current = attempts.get(key);
      attempts.set(key, current && current.reset > Date.now()
        ? { ...current, count: current.count + 1 }
        : { count: 1, reset: Date.now() + WINDOW_MS });
    }
  });

  next();
}
