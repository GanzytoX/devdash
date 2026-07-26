interface IncidentCsvRow {
  serviceName: string;
  type: string;
  status: string;
  startedAt: Date;
  resolvedAt: Date | null;
  durationMs: number | null;
  message: string;
}

const incidentTypeLabel = (type: string) => type === 'outage' ? 'Caída' : type;

const incidentStatusLabel = (status: string) => {
  if (status === 'open') return 'Abierto';
  if (status === 'resolved') return 'Resuelto';
  return status;
};

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

export function buildIncidentCsv(incidents: IncidentCsvRow[]) {
  const rows = [
    ['Servicio', 'Tipo', 'Estado', 'Inicio', 'Resolución', 'Duración (segundos)', 'Mensaje'],
    ...incidents.map(incident => [
      incident.serviceName,
      incidentTypeLabel(incident.type),
      incidentStatusLabel(incident.status),
      incident.startedAt.toISOString(),
      incident.resolvedAt?.toISOString() || '',
      incident.durationMs !== null ? Math.round(incident.durationMs / 1000) : '',
      incident.message,
    ]),
  ];

  return `\uFEFF${rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
}
