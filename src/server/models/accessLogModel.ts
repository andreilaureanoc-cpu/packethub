import { database } from "../infrastructure/database.js";

export function registrarAcesso(
  ipAddress: string,
  userAgent: string,
  page: string,
): void {
  database
    .prepare("DELETE FROM access_logs WHERE accessed_at < datetime('now', '-1 day')")
    .run();
  database
    .prepare(
      `INSERT INTO access_logs (ip_address, user_agent, page)
       VALUES (?, ?, ?)`,
    )
    .run(ipAddress.slice(0, 64), userAgent.slice(0, 512), page.slice(0, 512));
}
