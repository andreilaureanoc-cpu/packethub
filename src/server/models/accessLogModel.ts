import { database } from "../infrastructure/database.js";

export async function registrarAcesso(
  ipAddress: string,
  userAgent: string,
  page: string,
): Promise<void> {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await database.$transaction([
    database.accessLog.deleteMany({
      where: { accessedAt: { lt: limite } },
    }),
    database.accessLog.create({
      data: {
        ipAddress: ipAddress.slice(0, 64),
        userAgent: userAgent.slice(0, 512),
        page: page.slice(0, 512),
      },
    }),
  ]);
}
