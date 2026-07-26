import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { readSessionCookie } from "../security/session";
import { isUserRole, type UserRole } from "../security/userRole";

const JWT_SECRET = config.jwtSecret;
const JWT_OPTIONS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: 'devdash',
  audience: 'devdash-dashboard',
};

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

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
    if (
      typeof claims.id !== 'string'
      || typeof claims.username !== 'string'
      || !isUserRole(claims.role)
    ) {
      throw new Error('Invalid session payload');
    }

    req.user = { id: claims.id, username: claims.username, role: claims.role };
    next();
  } catch {
    return res.status(401).json({ error: "La sesión no es válida o ha vencido." });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'El modo demostración es de solo lectura.',
      code: 'DEMO_READ_ONLY',
    });
  }

  next();
};
