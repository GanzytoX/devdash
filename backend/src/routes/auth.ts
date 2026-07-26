import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { config } from "../config";
import { loginRateLimit } from "../security";

const router = Router();
const JWT_SECRET = config.jwtSecret;

// Root health check endpoint
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", version: "1.0.0-beta", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "unhealthy" });
  }
});

// Auth route - Login
router.post("/api/auth/login", loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "El usuario y la contraseña son obligatorios." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
