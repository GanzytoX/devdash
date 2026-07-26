import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { readSessionCookie } from "../security/session";

const JWT_SECRET = config.jwtSecret;
const JWT_OPTIONS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: 'devdash',
  audience: 'devdash-dashboard',
};

export type AuthenticatedRequest = Request & { user?: { id: string; username: string } };

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;
  const token = readSessionCookie(req.headers.cookie) || bearerToken;

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Falta la sesión." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, JWT_OPTIONS);
    if (typeof payload === 'string') {
      throw new Error('Invalid session payload');
    }

    const claims = payload as jwt.JwtPayload;
    if (typeof claims.id !== 'string' || typeof claims.username !== 'string') {
      throw new Error('Invalid session payload');
    }

    req.user = { id: claims.id, username: claims.username };
    next();
  } catch {
    return res.status(401).json({ error: "La sesión no es válida o ha vencido." });
  }
};
