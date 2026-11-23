import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "packethub-test-"));
process.env.DATABASE_PATH = join(temporaryDirectory, "test.sqlite");
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.TCPDUMP_ENABLED = "false";

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

    const storedUser = database
      .prepare("SELECT password_hash FROM users WHERE id = ?")
      .get(session.user.id);
    assert.match(storedUser.password_hash, /^scrypt\$/);
    assert.equal(storedUser.password_hash.includes("correct-horse-42"), false);
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()
        .count,
      3,
    );
    assert.ok(
      database
        .prepare("PRAGMA foreign_key_list(nodes)")
        .all()
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
    const persistedNode = database
      .prepare("SELECT created_by_user_id FROM nodes WHERE id = ?")
      .get(node.id);
    assert.equal(persistedNode.created_by_user_id, loginSession.user.id);

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
    database.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
