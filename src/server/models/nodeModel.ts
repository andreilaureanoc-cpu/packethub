import { database } from "../infrastructure/database.js";
import type { NewNode, NodeRecord } from "./types.js";

export function listarNos(): NodeRecord[] {
  return database
    .prepare("SELECT * FROM nodes ORDER BY rowid")
    .all() as unknown as NodeRecord[];
}

export function obterNo(id: string): NodeRecord | undefined {
  return database
    .prepare("SELECT * FROM nodes WHERE id = ?")
    .get(id) as NodeRecord | undefined;
}

export function criarNo(dados: NewNode): NodeRecord {
  const proximo = database
    .prepare("SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM nodes")
    .get() as { id: number };
  const registro: NodeRecord = { ...dados, id: String(proximo.id) };
  database
    .prepare(
      `INSERT INTO nodes (id, host, ip, service, latency, load, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      registro.id,
      registro.host,
      registro.ip,
      registro.service,
      registro.latency,
      registro.load,
      registro.status,
    );
  return registro;
}

export function atualizarNo(
  id: string,
  alteracoes: Partial<NewNode>,
): NodeRecord | undefined {
  const atual = obterNo(id);
  if (!atual) return undefined;
  const registro = { ...atual, ...alteracoes };
  database
    .prepare(
      `UPDATE nodes SET host = ?, ip = ?, service = ?, latency = ?, load = ?, status = ?
       WHERE id = ?`,
    )
    .run(
      registro.host,
      registro.ip,
      registro.service,
      registro.latency,
      registro.load,
      registro.status,
      registro.id,
    );
  return registro;
}

export function excluirNo(id: string): boolean {
  return database.prepare("DELETE FROM nodes WHERE id = ?").run(id).changes > 0;
}
