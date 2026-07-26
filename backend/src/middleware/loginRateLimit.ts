import type { NextFunction, Request, Response } from 'express';

const attempts = new Map<string, { count: number; reset: number }>();

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.reset <= now) {
    attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
  } else if (++entry.count > 10) {
    return res.status(429).json({
      error: 'Demasiados intentos de acceso. Inténtalo más tarde.',
    });
  }

  next();
}
