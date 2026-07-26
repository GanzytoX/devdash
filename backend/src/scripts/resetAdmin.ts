import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma';
import { config } from '../config';

async function main() {
  if (!config.adminUsername || !config.adminPassword || config.adminPassword.length < 12) {
    throw new Error('Set ADMIN_USERNAME and an ADMIN_PASSWORD with at least 12 characters.');
  }
  const password = await bcrypt.hash(config.adminPassword, 12);
  await prisma.user.upsert({
    where: { username: config.adminUsername },
    update: { password },
    create: { username: config.adminUsername, password },
  });
  console.log(`Administrator credentials updated for ${config.adminUsername}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
