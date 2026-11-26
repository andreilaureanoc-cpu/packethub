import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let databasePath = resolve(
  process.env.DATABASE_PATH || join(projectRoot, "data/packethub.sqlite"),
);
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${databasePath}`;
} else if (process.env.DATABASE_URL.startsWith("file:")) {
  const filePath = process.env.DATABASE_URL
    .slice("file:".length)
    .split("?", 1)[0];
  databasePath = resolve(projectRoot, "prisma", decodeURIComponent(filePath));
}
mkdirSync(dirname(databasePath), { recursive: true });

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const prismaCli = join(projectRoot, "node_modules/prisma/build/index.js");
const schemaPath = join(projectRoot, "prisma/schema.prisma");

function runPrisma(args) {
  execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
}

try {
  await prisma.$connect();
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type = 'table'
  `;
  const tableNames = new Set(tables.map(({ name }) => name));

  if (tableNames.has("schema_migrations")) {
    const applied = await prisma.$queryRaw`
      SELECT version FROM schema_migrations ORDER BY version
    `;
    let version = applied.at(-1)?.version ?? 0;
    for (const migration of [
      "001_initial.sql",
      "002_authentication.sql",
      "003_packet_source.sql",
      "004_packet_storage.sql",
      "005_remove_demo_nodes.sql",
    ]) {
      const currentVersion = Number(migration.slice(0, 3));
      if (currentVersion <= version) continue;
      runPrisma([
        "db",
        "execute",
        "--file",
        join(projectRoot, "src/server/migrations", migration),
        "--schema",
        schemaPath,
      ]);
      await prisma.$executeRaw`
        INSERT INTO schema_migrations (version, name) VALUES (${currentVersion}, ${migration})
      `;
      version = currentVersion;
    }

    const prismaMigrations = tableNames.has("_prisma_migrations")
      ? new Set(
          (
            await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations`
          ).map(({ migration_name }) => migration_name),
        )
      : new Set();
    for (const migration of [
      "20261126224000_initial",
      "20261126224100_packet_storage_triggers",
    ]) {
      if (prismaMigrations.has(migration)) continue;
      runPrisma([
        "migrate",
        "resolve",
        "--applied",
        migration,
        "--schema",
        schemaPath,
      ]);
    }
    runPrisma(["migrate", "deploy", "--schema", schemaPath]);
  } else {
    runPrisma(["migrate", "deploy", "--schema", schemaPath]);
  }
} finally {
  await prisma.$disconnect();
}
