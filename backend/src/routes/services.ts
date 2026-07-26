import { Router } from "express";
import { prisma } from "../db";
import { scheduler } from "../services/scheduler";
import { parseServiceInput, assertSafeTarget } from "../security";

const router = Router();

// 1. Obtener lista de servicios con sus historiales agregados
router.get("/api/services", async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        pingResults: {
          orderBy: { timestamp: "desc" },
          take: 30,
        },
      },
    });

    // Mapear los datos al formato esperado por el frontend
    const mappedServices = services.map((s) => {
      // Revertir para orden cronológico (más antiguo al más nuevo)
      const results = [...s.pingResults].reverse();
      const uptimeHistory = results.map((r) => r.status !== "offline");
      const latencyHistory = results.slice(-24).map((r) => r.latency);

      return {
        id: s.id,
        name: s.name,
        url: s.url,
        method: s.method,
        status: s.status,
        latency: s.latency,
        sslStatus: s.sslStatus,
        sslExpiryDays: s.sslExpiryDays,
        sslExpiryDate: s.sslExpiryDate,
        interval: s.interval,
        paused: s.paused,
        publicVisible: s.publicVisible,
        tags: s.tags,
        lastChecked: s.lastChecked,
        uptimeHistory,
        latencyHistory,
      };
    });

    res.json(mappedServices);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 2. Crear un nuevo servicio
router.post("/api/services", async (req, res) => {
  try {
    const input = parseServiceInput(req.body);
    await assertSafeTarget(String(input.url));

    const timestampStr = new Date().toLocaleTimeString();

    // Crear registro en la base de datos con estado inicial offline
    const service = await prisma.service.create({
      data: {
        ...(input as any),
        status: "unknown",
        latency: 0,
        sslStatus: "none",
        paused: false,
        lastChecked: timestampStr,
      },
    });

    // Registrar en logs del sistema
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Servicio registrado: ${input.name} (${input.url})`,
        serviceId: service.id,
        serviceName: String(input.name),
      },
    });

    // Programar el pinger
    scheduler.schedule(service);

    res.status(201).json(service);
  } catch (error) {
    console.error("Error al crear servicio:", error);
    res.status(error instanceof Error && /nombre|URL|método|intervalo|destinos|HTTP/i.test(error.message) ? 400 : 500).json({ error: error instanceof Error ? error.message : "Error interno del servidor" });
  }
});

// 3. Editar un servicio existente
router.put("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const input = parseServiceInput(req.body, true);
    if (input.url) await assertSafeTarget(String(input.url));

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(input as any),
      },
    });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Configuración de servicio actualizada: ${updated.name}`,
        serviceId: updated.id,
        serviceName: updated.name,
      },
    });

    // Reprogramar el pinger si está activo
    if (!updated.paused) {
      scheduler.schedule(updated);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error al actualizar servicio:", error);
    res.status(error instanceof Error && /nombre|URL|método|intervalo|destinos|HTTP/i.test(error.message) ? 400 : 500).json({ error: error instanceof Error ? error.message : "Error interno del servidor" });
  }
});

// 4. Eliminar un servicio
router.delete("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    // Detener el pinger
    scheduler.unschedule(id);

    // Borrado en cascada (Prisma lo maneja según schema)
    await prisma.service.delete({ where: { id } });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: `Servicio eliminado permanentemente: ${existing.name}`,
        serviceName: existing.name,
      },
    });

    res.json({ success: true, message: "Servicio eliminado" });
  } catch (error) {
    console.error("Error al borrar servicio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 5. Alternar pausa de monitoreo
router.post("/api/services/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const nextPauseState = !existing.paused;

    const updated = await prisma.service.update({
      where: { id },
      data: { paused: nextPauseState },
    });

    const timestampStr = new Date().toLocaleTimeString();
    await prisma.logEntry.create({
      data: {
        timestamp: timestampStr,
        type: "info",
        message: nextPauseState
          ? `Monitoreo pausado para: ${existing.name}`
          : `Monitoreo reanudado para: ${existing.name}`,
        serviceId: existing.id,
        serviceName: existing.name,
      },
    });

    if (nextPauseState) {
      scheduler.unschedule(id);
    } else {
      scheduler.schedule(updated);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error al alternar pausa de servicio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 6. Forzar chequeo de ping y SSL manual inmediato
router.post("/api/services/:id/check", async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    await scheduler.runCheck(service.id);
    const updated = await prisma.service.findUnique({ where: { id } });
    res.json(updated);
  } catch (error) {
    console.error("Error en chequeo manual:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
