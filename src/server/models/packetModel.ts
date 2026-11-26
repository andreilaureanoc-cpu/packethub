import type { Prisma } from "@prisma/client";
import { database } from "../infrastructure/database.js";
import type { NewPacket, Packet } from "./types.js";

const limiteArmazenamentoPacotesBytes = 100_000_000;

function mapearPacote(linha: {
  id: string;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  infoJson: string;
  size: string;
  dropped: boolean | null;
  source: string;
}): Packet {
  const pacote: Packet = {
    id: linha.id,
    time: linha.time,
    src: linha.src,
    dst: linha.dst,
    protocol: linha.protocol,
    info: JSON.parse(linha.infoJson) as Packet["info"],
    size: linha.size,
  };
  if (linha.dropped !== null) pacote.dropped = linha.dropped;
  if (linha.source) pacote.source = linha.source as Packet["source"];
  return pacote;
}

async function descartarPacotesMaisAntigos(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  let armazenamento = await transaction.packetStorage.findUniqueOrThrow({
    where: { id: 1 },
  });

  while (armazenamento.totalBytes >= limiteArmazenamentoPacotesBytes) {
    const [maisAntigo] = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM packets ORDER BY rowid LIMIT 1
    `;
    if (!maisAntigo) return;
    await transaction.packet.delete({ where: { id: maisAntigo.id } });
    armazenamento = await transaction.packetStorage.findUniqueOrThrow({
      where: { id: 1 },
    });
  }
}

export async function listarPacotes(protocolo = ""): Promise<Packet[]> {
  const pacotes = await database.packet.findMany({
    where: protocolo ? { protocol: protocolo } : undefined,
  });
  return pacotes
    .sort((left, right) =>
      left.id.localeCompare(right.id, undefined, { numeric: true }),
    )
    .map(mapearPacote);
}

export async function obterPacote(id: string): Promise<Packet | null> {
  const pacote = await database.packet.findUnique({ where: { id } });
  return pacote ? mapearPacote(pacote) : null;
}

export async function criarPacote(
  dados: NewPacket,
  userId?: string,
): Promise<Packet> {
  return database.$transaction(async (transaction) => {
    const [proximo] = await transaction.$queryRaw<{ id: number }[]>`
      SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 AS id FROM packets
    `;
    const criado = await transaction.packet.create({
      data: {
        id: String(proximo.id),
        time: dados.time,
        src: dados.src,
        dst: dados.dst,
        protocol: dados.protocol,
        infoJson: JSON.stringify(dados.info),
        size: dados.size,
        dropped: dados.dropped ?? null,
        source: dados.source ?? (userId ? "manual" : "capture"),
        createdByUserId: userId,
      },
    });
    await descartarPacotesMaisAntigos(transaction);
    return mapearPacote(criado);
  });
}

export async function limparPacotesDemonstrativos(): Promise<number> {
  const resultado = await database.packet.deleteMany({ where: { source: "demo" } });
  return resultado.count;
}

export async function atualizarPacote(
  id: string,
  alteracoes: Partial<NewPacket>,
): Promise<Packet | null> {
  return database.$transaction(async (transaction) => {
    const atual = await transaction.packet.findUnique({ where: { id } });
    if (!atual) return null;
    const atualizado = await transaction.packet.update({
      where: { id },
      data: {
        ...(alteracoes.time !== undefined && { time: alteracoes.time }),
        ...(alteracoes.src !== undefined && { src: alteracoes.src }),
        ...(alteracoes.dst !== undefined && { dst: alteracoes.dst }),
        ...(alteracoes.protocol !== undefined && { protocol: alteracoes.protocol }),
        ...(alteracoes.info !== undefined && {
          infoJson: JSON.stringify(alteracoes.info),
        }),
        ...(alteracoes.size !== undefined && { size: alteracoes.size }),
        ...(alteracoes.dropped !== undefined && {
          dropped: alteracoes.dropped,
        }),
      },
    });
    await descartarPacotesMaisAntigos(transaction);
    return mapearPacote(atualizado);
  });
}

export async function excluirPacote(id: string): Promise<boolean> {
  const resultado = await database.packet.deleteMany({ where: { id } });
  return resultado.count > 0;
}
