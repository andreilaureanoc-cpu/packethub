import { database } from "../infrastructure/database.js";
import type { Capture } from "./types.js";

export async function obterCaptura(): Promise<Capture> {
  const captura = await database.capture.findUniqueOrThrow({ where: { id: 1 } });
  return {
    interface: captura.interface,
    command: captura.command,
    duration: captura.duration,
    filter: captura.filter,
    active: captura.active,
  };
}

export async function atualizarCaptura(
  alteracoes: Partial<Capture>,
): Promise<Capture> {
  const atual = await obterCaptura();
  const captura = { ...atual, ...alteracoes };
  await database.capture.upsert({
    where: { id: 1 },
    create: { id: 1, ...captura },
    update: captura,
  });
  return captura;
}
