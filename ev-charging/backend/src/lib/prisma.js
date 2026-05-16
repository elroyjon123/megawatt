require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Ensure we only create one PrismaClient instance in dev (hot reload) / tests.
// This avoids exhausting the DB connection limit.
let prisma = globalThis.__prisma;

if (!prisma) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required (set it in backend/.env)");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({ adapter });
  // Prevent unhandled promise rejections from crashing the process in dev.
  // Route handlers should still properly handle and return 500s on DB errors.
  prisma.$on("error", (e) => {
    // eslint-disable-next-line no-console
    console.error("[Prisma] client error", e);
  });
  globalThis.__prisma = prisma;
}

module.exports = prisma;
