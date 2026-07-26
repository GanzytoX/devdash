// Type definitions for DevDash API data models

export interface Service {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  latency: number;
  latencyHistory: number[];
  uptimeHistory: boolean[]; // Last 30 checks
  sslStatus: 'valid' | 'expiring' | 'expired' | 'invalid' | 'unknown' | 'none';
  sslExpiryDays: number | null;
  sslExpiryDate: string | null;
  interval: number; // in seconds
  paused: boolean;
  publicVisible: boolean;
  tags: string;
  lastChecked: string;
}

export interface Incident {
  id: string;
  type: string;
  status: 'open' | 'resolved';
  message: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMs: number | null;
  service: { name: string };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  serviceId: string | null;
  serviceName: string | null;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}
