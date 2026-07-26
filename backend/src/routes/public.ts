import { Router } from "express";
import { prisma } from "../db";
import { config } from "../config";

const router = Router();

const periodSince = (period: string) => {
  const duration = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  return new Date(Date.now() - duration * 86_400_000);
};

router.get('/api/public/status', async (req, res) => {
  const period = ['24h', '7d', '30d'].includes(String(req.query.period)) ? String(req.query.period) : '24h';
  const since = periodSince(period);
  const services = await prisma.service.findMany({
    where: { publicVisible: true },
    include: { pingResults: { where: { timestamp: { gte: since } }, orderBy: { timestamp: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  const incidents = await prisma.incident.findMany({
    where: { startedAt: { gte: since }, service: { publicVisible: true } },
    include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 30,
  });
  const mapped = services.map(service => {
    const total = service.pingResults.length;
    const successful = service.pingResults.filter(p => p.status !== 'offline').length;
    const latencies = service.pingResults.filter(p => p.status !== 'offline').map(p => p.latency);
    return {
      id: service.id, name: service.name, status: service.paused ? 'paused' : service.status,
      lastChecked: service.lastChecked, sslStatus: service.sslStatus, sslExpiryDays: service.sslExpiryDays,
      tags: service.tags.split(',').map(t => t.trim()).filter(Boolean),
      uptime: total ? Number(((successful / total) * 100).toFixed(2)) : null,
      averageLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      history: service.pingResults.slice(-60).map(p => ({ timestamp: p.timestamp, status: p.status, latency: p.latency })),
    };
  });
  const operational = mapped.every(s => s.status === 'online' || s.status === 'paused');
  res.json({ instance: config.instanceName, region: config.instanceRegion, hostedOn: 'CubePath', period, operational, updatedAt: new Date().toISOString(), services: mapped, incidents });
});

export default router;
