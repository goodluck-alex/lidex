const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

function createClient() {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === "1" ? ["query", "error", "warn"] : ["error", "warn"],
  });
}

const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = { prisma, disconnect };
