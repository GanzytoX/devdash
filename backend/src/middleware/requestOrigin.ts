import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateRequestOrigin(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const fetchSite = req.get('Sec-Fetch-Site');
  if (fetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Solicitud entre sitios bloqueada.' });
  }

  const origin = req.get('Origin');
  if (origin && !config.corsOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }

  next();
}
