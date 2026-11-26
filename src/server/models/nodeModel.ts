import { database } from "../infrastructure/database.js";
import type { NewNode, NodeRecord } from "./types.js";

export async function listarNos(): Promise<NodeRecord[]> {
  const nos = await database.node.findMany();
  return nos.sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
}

export async function obterNo(id: string): Promise<NodeRecord | null> {
  return database.node.findUnique({ where: { id } });
}

export async function criarNo(
  dados: NewNode,
  userId: string,
): Promise<NodeRecord> {
  return database.$transaction(async (transaction) => {
    const [proximo] = await transaction.$queryRaw<{ id: number }[]>`
      SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM nodes
    `;
    return transaction.node.create({
      data: { ...dados, id: String(proximo.id), createdByUserId: userId },
    });
  });
}

export async function atualizarNo(
  id: string,
  alteracoes: Partial<NewNode>,
): Promise<NodeRecord | null> {
  return database.$transaction(async (transaction) => {
    const atual = await transaction.node.findUnique({ where: { id } });
    if (!atual) return null;
    return transaction.node.update({ where: { id }, data: alteracoes });
  });
}

export async function excluirNo(id: string): Promise<boolean> {
  const resultado = await database.node.deleteMany({ where: { id } });
  return resultado.count > 0;
}
