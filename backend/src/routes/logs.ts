import { Router } from "express";
import { prisma } from "../database/prisma";

const router = Router();

// 7. Obtener logs recientes para el terminal
router.get("/api/logs", async (req, res) => {
  try {
    const logs = await prisma.logEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(logs.reverse());
  } catch (error) {
    console.error("Error al obtener logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 8. Limpiar todos los logs del sistema
router.delete("/api/logs", async (req, res) => {
  try {
    await prisma.logEntry.deleteMany({});

    // Crear log de reinicio del terminal
    await prisma.logEntry.create({
      data: {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message:
          "Historial de consola del terminal reiniciado por el operador.",
      },
    });

    res.json({ success: true, message: "Logs limpiados con éxito." });
  } catch (error) {
    console.error("Error al limpiar logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
