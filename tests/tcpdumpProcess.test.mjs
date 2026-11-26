import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-tcpdump-"));
process.env.DATABASE_PATH = join(temporaryDirectory, "test.sqlite");
process.env.DATABASE_URL = `file:${process.env.DATABASE_PATH}`;
execFileSync(process.execPath, ["scripts/migrate.mjs"], {
  cwd: process.cwd(),
  env: process.env,
});
const { database } = await import("../dist/server/infrastructure/database.js");
after(async () => {
  await database.$disconnect();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

const { converterLinhaTcpdump } = await import("../dist/server/infrastructure/tcpdumpProcess.js");

test("preserves packets from protocols without a dedicated decoder", () => {
  const pacote = converterLinhaTcpdump(
    "2026-11-23 12:49:00.123456 IP 192.0.2.1 > 198.51.100.2: GREv0, length 32",
  );

  assert.deepEqual(pacote, {
    time: "12:49:00.123",
    src: "192.0.2.1",
    dst: "198.51.100.2",
    protocol: "GREv0",
    info: "GREv0, length 32",
    size: "32 B",
  });
});

test("records non-IP packets even when tcpdump does not print addresses", () => {
  const pacote = converterLinhaTcpdump(
    "2026-11-23 12:49:00.123456 LLDP, length 60",
  );

  assert.deepEqual(pacote, {
    time: "12:49:00.123",
    src: "-",
    dst: "-",
    protocol: "LLDP",
    info: "LLDP, length 60",
    size: "60 B",
  });
});

test("classifies ICMPv6 capture lines as ICMP", () => {
  const pacote = converterLinhaTcpdump(
    "2026-11-23 12:49:00.123456 IP6 2001:db8::1 > 2001:db8::2: ICMP6, echo request, length 64",
  );

  assert.equal(pacote?.protocol, "ICMP");
  assert.equal(pacote?.src, "2001:db8::1");
  assert.equal(pacote?.dst, "2001:db8::2");
});
