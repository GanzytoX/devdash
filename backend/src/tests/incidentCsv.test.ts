import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIncidentCsv } from '../exporters/incidentCsv';

test('exports localized, Excel-compatible incident data', () => {
  const csv = buildIncidentCsv([{
    serviceName: 'Prueba',
    type: 'outage',
    status: 'resolved',
    startedAt: new Date('2026-07-26T08:05:22.794Z'),
    resolvedAt: new Date('2026-07-26T08:06:04.829Z'),
    durationMs: 42_035,
    message: 'El servicio dejó de estar disponible.',
  }]);

  assert.ok(csv.startsWith('\uFEFF"Servicio","Tipo","Estado"'));
  assert.ok(csv.includes('"Prueba","Caída","Resuelto"'));
  assert.ok(csv.includes('"42"'));
  assert.ok(csv.endsWith('\r\n'));
});

test('neutralizes spreadsheet formulas in user-controlled fields', () => {
  const csv = buildIncidentCsv([{
    serviceName: '=HYPERLINK("https://example.com")',
    type: 'outage',
    status: 'open',
    startedAt: new Date('2026-07-26T08:05:22.794Z'),
    resolvedAt: null,
    durationMs: null,
    message: '+SUM(1,1)',
  }]);

  assert.ok(csv.includes(`"'=HYPERLINK(""https://example.com"")"`));
  assert.ok(csv.includes(`"'+SUM(1,1)"`));
});
