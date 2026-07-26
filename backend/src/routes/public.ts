import { Router } from "express";
import { prisma } from "../database/prisma";
import { config } from "../config";
import { createRequestRateLimit } from "../middleware/requestRateLimit";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();
const publicRateLimit = createRequestRateLimit({
  maxRequests: 120,
  windowMs: 60_000,
});

router.use('/api/public', publicRateLimit);

const periodSince = (period: string) => {
  const duration = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  return new Date(Date.now() - duration * 86_400_000);
};

router.get('/api/public/status', asyncHandler(async (req, res) => {
  const period = ['24h', '7d', '30d'].includes(String(req.query.period)) ? String(req.query.period) : '24h';
  const since = periodSince(period);
  const services = await prisma.service.findMany({
    where: { publicVisible: true },
    include: {
      pingResults: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
        take: 2880,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const incidents = await prisma.incident.findMany({
    where: { startedAt: { gte: since }, service: { publicVisible: true } },
    include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 30,
  });
  const mapped = services.map(service => {
    const results = [...service.pingResults].reverse();
    const total = results.length;
    const successful = results.filter(p => p.status !== 'offline').length;
    const latencies = results.filter(p => p.status !== 'offline').map(p => p.latency);
    return {
      id: service.id, name: service.name, status: service.paused ? 'paused' : service.status,
      lastChecked: service.lastChecked, sslStatus: service.sslStatus, sslExpiryDays: service.sslExpiryDays,
      tags: service.tags.split(',').map(t => t.trim()).filter(Boolean),
      uptime: total ? Number(((successful / total) * 100).toFixed(2)) : null,
      averageLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      history: results.slice(-60).map(p => ({ timestamp: p.timestamp, status: p.status, latency: p.latency })),
    };
  });
  const operational = mapped.length > 0 && mapped.every(s => s.status === 'online');
  res.json({ instance: config.instanceName, region: config.instanceRegion, hostedOn: 'CubePath', period, operational, updatedAt: new Date().toISOString(), services: mapped, incidents });
}));

export default router;
