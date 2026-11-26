import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-test-"));
process.env.DATABASE_PATH = join(temporaryDirectory, "test.sqlite");
process.env.DATABASE_URL = `file:${process.env.DATABASE_PATH}`;
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.TCPDUMP_ENABLED = "false";
execFileSync(process.execPath, ["scripts/migrate.mjs"], {
  cwd: process.cwd(),
  env: process.env,
});

const [{ app }, { database }] = await Promise.all([
  import("../dist/server/app.js"),
  import("../dist/server/infrastructure/database.js"),
]);

test("Express API registration, JWT protection, persistence, logout and errors", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    let response = await fetch(`${baseUrl}/api/nodeRecords`);
    assert.equal(response.status, 401);

    response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operator@example.com",
        password: "correct-horse-42",
      }),
    });
    assert.equal(response.status, 201);
    const session = await response.json();
    assert.equal(session.user.email, "operator@example.com");
    assert.ok(session.token);

    const storedUser = await database.user.findUniqueOrThrow({
      where: { id: session.user.id },
    });
    assert.match(storedUser.passwordHash, /^scrypt\$/);
    assert.equal(storedUser.passwordHash.includes("correct-horse-42"), false);
    assert.equal(
      Number(
        (await database.$queryRaw`SELECT COUNT(*) AS count FROM _prisma_migrations`)[0]
          .count,
      ),
      2,
    );
    assert.ok(
      (await database.$queryRaw`PRAGMA foreign_key_list(nodes)`)
        .some((foreignKey) => foreignKey.table === "users"),
    );

    response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "OPERATOR@example.com",
        password: "another-password",
      }),
    });
    assert.equal(response.status, 409);

    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operator@example.com",
        password: "wrong-password",
      }),
    });
    assert.equal(response.status, 401);

    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "OPERATOR@example.com",
        password: "correct-horse-42",
      }),
    });
    assert.equal(response.status, 200);
    const loginSession = await response.json();

    const authorization = {
      Authorization: `Bearer ${loginSession.token}`,
    };
    response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: authorization,
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).user, loginSession.user);

    response = await fetch(`${baseUrl}/api/nodeRecords`, {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: "test-node",
        ip: "127.0.0.2",
        service: "HTTP",
        latency: "1 ms",
        load: "0%",
        status: "Operacional",
      }),
    });
    assert.equal(response.status, 201);
    const node = await response.json();
    const persistedNode = await database.node.findUniqueOrThrow({
      where: { id: node.id },
    });
    assert.equal(persistedNode.createdByUserId, loginSession.user.id);

    const fakeTcpdump = join(temporaryDirectory, "tcpdump");
    writeFileSync(
      fakeTcpdump,
      `#!/usr/bin/env node
process.stderr.write("listening on lo, link-type EN10MB (Ethernet), snapshot length 96 bytes\\n");
process.stdout.write("2026-11-23 12:49:00.123456 IP 127.0.0.1.54321 > 127.0.0.1.443: Flags [S], seq 100, length 0\\n");
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`,
    );
    chmodSync(fakeTcpdump, 0o700);
    process.env.TCPDUMP_ENABLED = "true";
    process.env.TCPDUMP_INTERFACES = "lo";
    delete process.env.CAPTURE_ADMIN_TOKEN;
    process.env.TCPDUMP_PATH = fakeTcpdump;

    response = await fetch(`${baseUrl}/api/capture/options`, {
      headers: authorization,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).enabled, true);

    response = await fetch(`${baseUrl}/api/capture/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interface: "lo", filter: "tcp" }),
    });
    assert.equal(response.status, 401);

    response = await fetch(`${baseUrl}/api/capture/start`, {
      method: "POST",
      headers: { ...authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ interface: "lo", filter: "tcp" }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).active, true);

    response = await fetch(`${baseUrl}/api/capture/stop`, {
      method: "POST",
      headers: authorization,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).active, false);

    response = await fetch(`${baseUrl}/api/packetRecords`, {
      headers: authorization,
    });
    assert.equal(response.status, 200);
    const capturedPackets = await response.json();
    assert.equal(capturedPackets.length, 1);
    assert.equal(capturedPackets[0].protocol, "TCP");
    assert.equal(capturedPackets[0].src, "127.0.0.1.54321");
    assert.equal(capturedPackets[0].source, "capture");

    response = await fetch(`${baseUrl}/api/nodeRecords`, {
      headers: { Authorization: "Bearer invalid-token" },
    });
    assert.equal(response.status, 401);

    response = await fetch(`${baseUrl}/api/nodeRecords`, {
      method: "POST",
      headers: {
        ...authorization,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    assert.equal(response.status, 400);

    response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: authorization,
    });
    assert.equal(response.status, 204);
    response = await fetch(`${baseUrl}/api/nodeRecords`, {
      headers: authorization,
    });
    assert.equal(response.status, 401);

    response = await fetch(`${baseUrl}/login.html`);
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await database.$disconnect();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
