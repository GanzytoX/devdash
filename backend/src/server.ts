import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { app } from "./app";
import { prisma } from "./database/prisma";
import { config } from "./config";
import { scheduler } from "./services/scheduler";

const PORT = config.port;

// Seed default admin user if database is empty
async function seedAdminUser() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("No users found. Seeding default admin user...");
      if (!config.adminUsername || !config.adminPassword || config.adminPassword.length < 12) {
        console.warn('No users exist. Set ADMIN_USERNAME and a 12+ character ADMIN_PASSWORD to create the first account.');
        return;
      }
      const hashedPassword = await bcrypt.hash(config.adminPassword, 12);
      await prisma.user.create({
        data: {
          username: config.adminUsername,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log(`Initial administrator created: ${config.adminUsername}.`);
    }
  } catch (error) {
    console.error("Error seeding default admin user:", error);
  }
}

async function seedDemoUser() {
  if (!config.demoModeEnabled) return;

  try {
    const existing = await prisma.user.findUnique({
      where: { username: config.demoUsername },
    });
    if (existing?.role === 'ADMIN') {
      console.warn(`Demo mode is disabled for reserved administrator username: ${config.demoUsername}.`);
      return;
    }

    const randomPassword = randomBytes(32).toString('hex');
    const password = await bcrypt.hash(randomPassword, 12);
    await prisma.user.upsert({
      where: { username: config.demoUsername },
      update: { role: 'DEMO' },
      create: {
        username: config.demoUsername,
        password,
        role: 'DEMO',
      },
    });
    console.log(`Read-only demo account ready: ${config.demoUsername}.`);
  } catch (error) {
    console.error('Error seeding demo user:', error);
  }
}

// Start HTTP server listener
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 DevDash server successfully started on port ${PORT}`);

  // Seed default admin user
  await seedAdminUser();
  await seedDemoUser();

  // Start scheduler
  await scheduler.start();
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

// Clean shutdown handler
async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down cleanly.`);
  scheduler.stop();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
