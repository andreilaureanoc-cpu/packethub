import { database } from "../infrastructure/database.js";
import type { NewPacket, Packet } from "./types.js";

type PacketRow = Omit<Packet, "info" | "dropped"> & {
  info_json: string;
  dropped: number | null;
};

const limiteArmazenamentoPacotesBytes = 100_000_000;

function obterTotalBytesPacotes(): number {
  const linha = database
    .prepare("SELECT total_bytes FROM packet_storage WHERE id = 1")
    .get() as { total_bytes: number };
  return linha.total_bytes;
}

function descartarPacotesMaisAntigos(): void {
  let totalBytes = obterTotalBytesPacotes();
  const obterMaisAntigo = database.prepare(
    "SELECT id FROM packets ORDER BY rowid LIMIT 1",
  );
  const excluir = database.prepare("DELETE FROM packets WHERE id = ?");

  while (totalBytes >= limiteArmazenamentoPacotesBytes) {
    const pacote = obterMaisAntigo.get() as { id: string } | undefined;
    if (!pacote) return;
    excluir.run(pacote.id);
    totalBytes = obterTotalBytesPacotes();
  }
}

function executarComLimite<T>(operacao: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const resultado = operacao();
    descartarPacotesMaisAntigos();
    database.exec("COMMIT");
    return resultado;
  } catch (erro) {
    database.exec("ROLLBACK");
    throw erro;
  }
}

function mapearPacote(linha: PacketRow): Packet {
  const pacote: Packet = {
    id: linha.id,
    time: linha.time,
    src: linha.src,
    dst: linha.dst,
    protocol: linha.protocol,
    info: JSON.parse(linha.info_json) as Packet["info"],
    size: linha.size,
  };
  if (linha.dropped !== null) pacote.dropped = Boolean(linha.dropped);
  if (linha.source) pacote.source = linha.source;
  return pacote;
}

export function listarPacotes(protocolo = ""): Packet[] {
  const linhas = protocolo
    ? database
        .prepare("SELECT * FROM packets WHERE protocol = ? ORDER BY rowid")
        .all(protocolo)
    : database.prepare("SELECT * FROM packets ORDER BY rowid").all();
  return (linhas as unknown as PacketRow[]).map(mapearPacote);
}

export function obterPacote(id: string): Packet | undefined {
  const linha = database
    .prepare("SELECT * FROM packets WHERE id = ?")
    .get(id) as PacketRow | undefined;
  return linha ? mapearPacote(linha) : undefined;
}

export function criarPacote(
  dados: NewPacket,
  userId?: string,
): Packet {
  return executarComLimite(() => {
    const proximo = database
      .prepare("SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM packets")
      .get() as { id: number };
    const pacote: Packet = { ...dados, id: String(proximo.id) };
    database
      .prepare(
        `INSERT INTO packets
         (id, time, src, dst, protocol, info_json, size, dropped, created_by_user_id, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        pacote.id,
        pacote.time,
        pacote.src,
        pacote.dst,
        pacote.protocol,
        JSON.stringify(pacote.info),
        pacote.size,
        pacote.dropped === undefined ? null : Number(pacote.dropped),
        userId ?? null,
        pacote.source ?? (userId ? "manual" : "capture"),
      );
    return pacote;
  });
}

export function limparPacotesDemonstrativos(): number {
  return Number(database
    .prepare("DELETE FROM packets WHERE source = 'demo'")
    .run().changes);
}

export function atualizarPacote(
  id: string,
  alteracoes: Partial<NewPacket>,
): Packet | undefined {
  return executarComLimite(() => {
    const pacoteAtual = obterPacote(id);
    if (!pacoteAtual) return undefined;
    const pacote = { ...pacoteAtual, ...alteracoes };
    database
      .prepare(
        `UPDATE packets
         SET time = ?, src = ?, dst = ?, protocol = ?, info_json = ?, size = ?, dropped = ?
         WHERE id = ?`,
      )
      .run(
        pacote.time,
        pacote.src,
        pacote.dst,
        pacote.protocol,
        JSON.stringify(pacote.info),
        pacote.size,
        pacote.dropped === undefined ? null : Number(pacote.dropped),
        id,
      );
    return pacote;
  });
}

export function excluirPacote(id: string): boolean {
  return database.prepare("DELETE FROM packets WHERE id = ?").run(id).changes > 0;
}

executarComLimite(() => undefined);
