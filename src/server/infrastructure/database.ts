import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
const databasePath = resolve(
  process.env.DATABASE_PATH || join(projectRoot, "data/packethub.sqlite"),
);
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);
database.exec(
  readFileSync(join(projectRoot, "src/server/schema.sql"), "utf8"),
);

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
