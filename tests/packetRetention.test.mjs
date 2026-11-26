import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-retention-"));
process.env.DATABASE_PATH = join(temporaryDirectory, "test.sqlite");
process.env.DATABASE_URL = `file:${process.env.DATABASE_PATH}`;
execFileSync(process.execPath, ["scripts/migrate.mjs"], {
  cwd: process.cwd(),
  env: process.env,
});

const [{ database }, { criarPacote, obterPacote }] = await Promise.all([
  import("../dist/server/infrastructure/database.js"),
  import("../dist/server/models/packetModel.js"),
]);

test("evicts oldest packets of any source when stored packet data reaches 100 MB", async () => {
  const limiteBytes = 100_000_000;
  try {
    await database.packet.deleteMany();
    const manual = await criarPacote({
      time: "12:00:00.000",
      src: "192.0.2.1",
      dst: "192.0.2.2",
      protocol: "TCP",
      info: "x".repeat(512),
      size: "64 B",
      source: "manual",
    });
    const capturaAntiga = await criarPacote({
      time: "12:00:01.000",
      src: "192.0.2.3",
      dst: "192.0.2.4",
      protocol: "UDP",
      info: "old capture",
      size: "64 B",
      source: "capture",
    });
    await database.packetStorage.update({
      where: { id: 1 },
      data: { totalBytes: limiteBytes - 1 },
    });

    const capturaNova = await criarPacote({
      time: "12:00:02.000",
      src: "192.0.2.5",
      dst: "192.0.2.6",
      protocol: "LLDP",
      info: "new capture",
      size: "64 B",
      source: "capture",
    });

    assert.equal(await obterPacote(manual.id), null);
    assert.ok(await obterPacote(capturaAntiga.id));
    assert.ok(await obterPacote(capturaNova.id));
    assert.ok(
      (await database.packetStorage.findUniqueOrThrow({ where: { id: 1 } }))
        .totalBytes < limiteBytes,
    );
  } finally {
    await database.$disconnect();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
