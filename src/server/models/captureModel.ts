import { database } from "../infrastructure/database.js";
import type { Capture } from "./types.js";

type CaptureRow = Omit<Capture, "active"> & { active: number };

export function obterCaptura(): Capture {
  const captura = database
    .prepare(
      "SELECT interface, command, duration, filter, active FROM capture WHERE id = 1",
    )
    .get() as CaptureRow;
  return { ...captura, active: Boolean(captura.active) };
}

export function atualizarCaptura(
  alteracoes: Partial<Capture>,
): Capture {
  const atual = obterCaptura();
  const captura = { ...atual, ...alteracoes };
  database
    .prepare(
      `UPDATE capture
       SET interface = ?, command = ?, duration = ?, filter = ?, active = ?
       WHERE id = 1`,
    )
    .run(
      captura.interface,
      captura.command,
      captura.duration,
      captura.filter,
      Number(captura.active),
    );
  return captura;
}
