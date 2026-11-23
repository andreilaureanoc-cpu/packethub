import "dotenv/config";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
const databasePath = resolve(
  process.env.DATABASE_PATH || join(projectRoot, "data/packethub.sqlite"),
);
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);
database.exec("PRAGMA foreign_keys = ON");
database.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const migrationDirectory = join(projectRoot, "src/server/migrations");
const migrations = readdirSync(migrationDirectory)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort(
    (left, right) =>
      Number(left.split("_", 1)[0]) - Number(right.split("_", 1)[0]),
  );

for (const name of migrations) {
  const version = Number(name.split("_", 1)[0]);
  const applied = database
    .prepare("SELECT 1 FROM schema_migrations WHERE version = ?")
    .get(version);
  if (applied) continue;

  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(readFileSync(join(migrationDirectory, name), "utf8"));
    database
      .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)")
      .run(version, name);
    database.exec("COMMIT");
  } catch (erro) {
    database.exec("ROLLBACK");
    throw erro;
  }
}

const registros = database
  .prepare(
    `SELECT
      (SELECT COUNT(*) FROM packets) +
      (SELECT COUNT(*) FROM nodes) +
      (SELECT COUNT(*) FROM capture) +
      (SELECT COUNT(*) FROM layers) AS total`,
  )
  .get() as { total: number };

if (registros.total === 0) {
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec(
      readFileSync(join(projectRoot, "src/server/seed.sql"), "utf8"),
    );
    database.exec("COMMIT");
  } catch (erro) {
    database.exec("ROLLBACK");
    throw erro;
  }
}
