require("dotenv").config();
const { prisma } = require("../lib/prisma");

prisma
  .$queryRawUnsafe("SELECT 1 AS ok")
  .then((rows) => {
    console.log("db ok", rows);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
