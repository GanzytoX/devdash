import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma";
import { config } from "../config";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth";
import { loginRateLimit } from "../middleware/loginRateLimit";
import { createRequestRateLimit } from "../middleware/requestRateLimit";
import {
  clearedSessionCookieOptions,
  sessionCookieOptions,
} from "../security/session";
import { isUserRole, type UserRole } from "../security/userRole";

const router = Router();
const JWT_SECRET = config.jwtSecret;
const DUMMY_PASSWORD_HASH = '$2b$12$U4gj3EsZSNi7hy2uLM8jPeNdKoWPP54mGhuXlOtSKkWI1gdqk0goC';
const healthRateLimit = createRequestRateLimit({
  maxRequests: 120,
  windowMs: 60_000,
});
const demoLoginRateLimit = createRequestRateLimit({
  maxRequests: 20,
  windowMs: 60_000,
});

const issueSession = (
  res: Response,
  user: { id: string; username: string; role: UserRole },
) => {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'devdash',
      audience: 'devdash-dashboard',
      expiresIn: Math.floor(config.sessionTtlMs / 1000),
    },
  );

  res.setHeader('Cache-Control', 'no-store');
  res.cookie(config.sessionCookieName, token, sessionCookieOptions);
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
};

// Root health check endpoint
router.get("/health", healthRateLimit, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", version: "1.0.0-beta", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "unhealthy" });
  }
});

// Auth route - Login
router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username || username.length > 80 || !password || password.length > 128) {
    return res.status(400).json({ error: "El usuario y la contraseña son obligatorios." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    const role = user?.role;
    if (!user || !isMatch || !isUserRole(role)) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    return issueSession(res, {
      id: user.id,
      username: user.username,
      role,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post('/api/auth/demo', demoLoginRateLimit, async (_req, res) => {
  if (!config.demoModeEnabled) {
    return res.status(404).json({ error: 'El modo demostración no está disponible.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: config.demoUsername },
    });
    if (!user || user.role !== 'DEMO') {
      return res.status(503).json({ error: 'El modo demostración no está disponible temporalmente.' });
    }

    return issueSession(res, {
      id: user.id,
      username: user.username,
      role: 'DEMO',
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get(
  "/api/auth/session",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      authenticated: true,
      user: req.user,
    });
  },
);

router.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(config.sessionCookieName, clearedSessionCookieOptions);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true });
});

export default router;
