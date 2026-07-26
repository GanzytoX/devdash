import { Router } from "express";
import { prisma } from "../db";
import { buildIncidentCsv } from "../utils/incidentCsv";

const router = Router();

const periodSince = (period: string) => {
  const duration = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  return new Date(Date.now() - duration * 86_400_000);
};

router.get('/api/incidents', async (req, res) => {
  const period = ['24h', '7d', '30d'].includes(String(req.query.period)) ? String(req.query.period) : '7d';
  res.json(await prisma.incident.findMany({ where: { startedAt: { gte: periodSince(period) } }, include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' }, take: 200 }));
});

router.get('/api/incidents/export.csv', async (_req, res) => {
  const incidents = await prisma.incident.findMany({ include: { service: { select: { name: true } } }, orderBy: { startedAt: 'desc' } });
  const csv = buildIncidentCsv(incidents.map(incident => ({
    serviceName: incident.service.name,
    type: incident.type,
    status: incident.status,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    durationMs: incident.durationMs,
    message: incident.message,
  })));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.attachment('devdash-incidents.csv').send(csv);
});

export default router;
