import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("Prisma baselines the existing SQLite schema without losing stored data", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-migration-"));
  const databasePath = join(temporaryDirectory, "legacy.sqlite");
  const fixturePath = join(temporaryDirectory, "legacy.sql");
  const env = {
    ...process.env,
    DATABASE_PATH: databasePath,
    DATABASE_URL: `file:${databasePath}`,
  };
  const schema = readFileSync("tests/fixtures/legacySchema.sql", "utf8");
  writeFileSync(
    fixturePath,
    `${schema}
      INSERT INTO schema_migrations (version, name) VALUES (5, '005_remove_demo_nodes.sql');
      INSERT INTO nodes (id, host, ip, service, latency, load, status)
        VALUES ('legacy-node', 'legacy', '127.0.0.1', 'HTTP', '1 ms', '0%', 'Operacional');
      INSERT INTO packets (id, time, src, dst, protocol, info_json, size)
        VALUES ('legacy-packet', '12:00:00.000', '192.0.2.1', '192.0.2.2',
          'TCP', '"legacy packet"', '64 B');
    `,
  );

  try {
    execFileSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "db",
        "execute",
        "--file",
        fixturePath,
        "--schema",
        "prisma/schema.prisma",
      ],
      { cwd: process.cwd(), env, stdio: "inherit" },
    );
    execFileSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    process.env.DATABASE_PATH = databasePath;
    process.env.DATABASE_URL = `file:${databasePath}`;
    const { database } = await import("../dist/server/infrastructure/database.js");
    try {
      const node = await database.node.findUniqueOrThrow({
        where: { id: "legacy-node" },
      });
      const packet = await database.packet.findUniqueOrThrow({
        where: { id: "legacy-packet" },
      });
      const storage = await database.packetStorage.findUniqueOrThrow({
        where: { id: 1 },
      });

      assert.equal(node.host, "legacy");
      assert.equal(node.createdByUserId, null);
      assert.equal(packet.source, "demo");
      assert.ok(storage.totalBytes > 0);
      assert.equal(
        Number(
          (await database.$queryRaw`SELECT COUNT(*) AS count FROM _prisma_migrations`)[0]
            .count,
        ),
        2,
      );
    } finally {
      await database.$disconnect();
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
