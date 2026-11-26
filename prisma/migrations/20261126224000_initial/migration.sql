-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "token_id" TEXT NOT NULL PRIMARY KEY,
    "expires_at" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "packets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "time" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "dst" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "info_json" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "dropped" BOOLEAN,
    "created_by_user_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'demo',
    CONSTRAINT "packets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "host" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "latency" TEXT NOT NULL,
    "load" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    CONSTRAINT "nodes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "capture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "interface" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "filter" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "layers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocols_json" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "packet_storage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "total_bytes" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessed_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "page" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "packets_protocol_idx" ON "packets"("protocol");

-- CreateIndex
CREATE INDEX "packets_created_by_user_idx" ON "packets"("created_by_user_id");

-- CreateIndex
CREATE INDEX "nodes_created_by_user_idx" ON "nodes"("created_by_user_id");

-- CreateIndex
CREATE INDEX "access_logs_accessed_at_idx" ON "access_logs"("accessed_at");

