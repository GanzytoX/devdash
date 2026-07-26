import dotenv from 'dotenv';

dotenv.config();

const parseList = (value?: string) => (value || '').split(',').map(v => v.trim()).filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || '',
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  instanceName: process.env.INSTANCE_NAME || 'DevDash local',
  instanceRegion: process.env.INSTANCE_REGION || 'Entorno local',
  retentionDays: Math.max(1, Number(process.env.RETENTION_DAYS || 30)),
  allowPrivateTargets: process.env.ALLOW_PRIVATE_TARGETS === 'true',
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
};

export function validateConfig() {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters. See .env.example.');
  }
  if (!Number.isInteger(config.port) || config.port < 1) throw new Error('PORT is invalid.');
}
