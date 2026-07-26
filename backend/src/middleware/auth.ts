import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

const JWT_SECRET = config.jwtSecret;

export type AuthenticatedRequest = Request & { user?: { id: string; username: string } };

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Falta el token de sesión." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "El token no es válido o ha vencido." });
    }
    req.user = user as { id: string; username: string };
    next();
  });
};
