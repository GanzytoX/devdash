import dotenv from 'dotenv';

dotenv.config();

const parseList = (value?: string) => (value || '').split(',').map(v => v.trim()).filter(Boolean);
const nodeEnv = process.env.NODE_ENV || 'development';
const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
const secureCookies = publicAppUrl.startsWith('https://');
const sessionTtlMinutes = Number(process.env.SESSION_TTL_MINUTES || 480);

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || '',
  corsOrigins: parseList(process.env.CORS_ORIGINS || (nodeEnv === 'development' ? 'http://localhost:5173' : '')),
  publicAppUrl,
  instanceName: process.env.INSTANCE_NAME || 'DevDash local',
  instanceRegion: process.env.INSTANCE_REGION || 'Entorno local',
  retentionDays: Math.max(1, Number(process.env.RETENTION_DAYS || 30)),
  allowPrivateTargets: process.env.ALLOW_PRIVATE_TARGETS === 'true',
  trustProxy: Math.max(0, Number(process.env.TRUST_PROXY || 0)),
  secureCookies,
  sessionCookieName: secureCookies ? '__Host-devdash_session' : 'devdash_session',
  sessionTtlMs: sessionTtlMinutes * 60 * 1000,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  demoModeEnabled: process.env.DEMO_MODE_ENABLED === 'true',
  demoUsername: process.env.DEMO_USERNAME?.trim() || 'demo',
};

export function validateConfig() {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters. See .env.example.');
  }
  if (!Number.isInteger(config.port) || config.port < 1) throw new Error('PORT is invalid.');
  if (!Number.isInteger(config.trustProxy)) throw new Error('TRUST_PROXY must be a non-negative integer.');
  if (!Number.isInteger(sessionTtlMinutes) || sessionTtlMinutes < 15 || sessionTtlMinutes > 1440) {
    throw new Error('SESSION_TTL_MINUTES must be an integer between 15 and 1440.');
  }
  if (config.nodeEnv === 'production' && config.corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one trusted origin in production.');
  }
  if (config.demoModeEnabled && (!config.demoUsername || config.demoUsername.length > 80)) {
    throw new Error('DEMO_USERNAME must contain between 1 and 80 characters.');
  }
  let publicUrl: URL;
  try {
    publicUrl = new URL(config.publicAppUrl);
  } catch {
    throw new Error('PUBLIC_APP_URL must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(publicUrl.protocol)) {
    throw new Error('PUBLIC_APP_URL must be a valid HTTP or HTTPS URL.');
  }
  const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
  if (
    config.nodeEnv === 'production'
    && publicUrl.protocol !== 'https:'
    && !localHostnames.has(publicUrl.hostname)
  ) {
    throw new Error('PUBLIC_APP_URL must use HTTPS in production.');
  }
}
