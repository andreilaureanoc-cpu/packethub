import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
let databasePath = resolve(
  process.env.DATABASE_PATH || join(projectRoot, "data/packethub.sqlite"),
);
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${databasePath}`;
} else if (process.env.DATABASE_URL.startsWith("file:")) {
  const filePath = process.env.DATABASE_URL
    .slice("file:".length)
    .split("?", 1)[0];
  databasePath = resolve(projectRoot, "prisma", decodeURIComponent(filePath));
}
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new PrismaClient();

await database.$connect();

const [pacotes, nos, capturas, camadas] = await Promise.all([
  database.packet.count(),
  database.node.count(),
  database.capture.count(),
  database.layer.count(),
]);

if (pacotes + nos + capturas + camadas === 0) {
  await database.$transaction([
    database.capture.create({
      data: {
        id: 1,
        interface: "",
        command: "tcpdump (desativado)",
        duration: "00:00:00",
        filter: "all",
        active: false,
      },
    }),
    database.layer.create({
      data: {
        id: "application",
        protocolsJson: JSON.stringify(["HTTP", "DNS", "SSH"]),
      },
    }),
    database.layer.create({
      data: {
        id: "transport",
        protocolsJson: JSON.stringify(["TCP", "UDP"]),
      },
    }),
    database.layer.create({
      data: {
        id: "network",
        protocolsJson: JSON.stringify(["IP", "ARP", "Ethernet"]),
      },
    }),
  ]);
}
