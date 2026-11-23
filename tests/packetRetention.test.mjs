import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-retention-"));
process.env.DATABASE_PATH = join(temporaryDirectory, "test.sqlite");

const [{ database }, { criarPacote, obterPacote }] = await Promise.all([
  import("../dist/server/infrastructure/database.js"),
  import("../dist/server/models/packetModel.js"),
]);

test("evicts oldest packets of any source when stored packet data reaches 100 MB", () => {
  const limiteBytes = 100_000_000;
  try {
    database.prepare("DELETE FROM packets").run();
    const manual = criarPacote({
      time: "12:00:00.000",
      src: "192.0.2.1",
      dst: "192.0.2.2",
      protocol: "TCP",
      info: "x".repeat(512),
      size: "64 B",
      source: "manual",
    });
    const capturaAntiga = criarPacote({
      time: "12:00:01.000",
      src: "192.0.2.3",
      dst: "192.0.2.4",
      protocol: "UDP",
      info: "old capture",
      size: "64 B",
      source: "capture",
    });
    database
      .prepare("UPDATE packet_storage SET total_bytes = ? WHERE id = 1")
      .run(limiteBytes - 1);

    const capturaNova = criarPacote({
      time: "12:00:02.000",
      src: "192.0.2.5",
      dst: "192.0.2.6",
      protocol: "LLDP",
      info: "new capture",
      size: "64 B",
      source: "capture",
    });

    assert.equal(obterPacote(manual.id), undefined);
    assert.ok(obterPacote(capturaAntiga.id));
    assert.ok(obterPacote(capturaNova.id));
    assert.ok(
      database
        .prepare("SELECT total_bytes FROM packet_storage WHERE id = 1")
        .get().total_bytes < limiteBytes,
    );
  } finally {
    database.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
