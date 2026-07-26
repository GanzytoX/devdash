import { Router } from "express";
import { prisma } from "../db";

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
  const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [['service','type','status','startedAt','resolvedAt','durationSeconds','message'], ...incidents.map(i => [i.service.name, i.type, i.status, i.startedAt.toISOString(), i.resolvedAt?.toISOString() || '', i.durationMs ? Math.round(i.durationMs / 1000) : '', i.message])];
  res.type('text/csv').attachment('devdash-incidents.csv').send(rows.map(r => r.map(escape).join(',')).join('\n'));
});

export default router;
