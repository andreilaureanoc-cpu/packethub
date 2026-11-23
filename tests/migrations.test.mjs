import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

test("migrations preserve an existing SQLite database", () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-migration-"));
  const databasePath = join(temporaryDirectory, "legacy.sqlite");
  const legacyDatabase = new DatabaseSync(databasePath);
  legacyDatabase.exec(
    readFileSync("src/server/migrations/001_initial.sql", "utf8"),
  );
  legacyDatabase
    .prepare(
      `INSERT INTO nodes (id, host, ip, service, latency, load, status)
       VALUES ('legacy-node', 'legacy', '127.0.0.1', 'HTTP', '1 ms', '0%', 'Operacional')`,
    )
    .run();
  legacyDatabase.close();

  const script = `
    import assert from "node:assert/strict";
    import { database } from "./dist/server/infrastructure/database.js";
    const node = database.prepare("SELECT host, created_by_user_id FROM nodes WHERE id = ?").get("legacy-node");
    assert.equal(node.host, "legacy");
    assert.equal(node.created_by_user_id, null);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 2);
    database.close();
  `;
  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_PATH: databasePath,
        JWT_SECRET: randomBytes(32).toString("hex"),
      },
      stdio: "pipe",
    });
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
