import { database } from "../infrastructure/database.js";
import type { NetworkLayer } from "./types.js";

type LayerRow = { id: string; protocols_json: string };

export function listarCamadas(): NetworkLayer[] {
  const camadas = database
    .prepare("SELECT id, protocols_json FROM layers ORDER BY rowid")
    .all() as unknown as LayerRow[];
  return camadas.map(({ id, protocols_json }) => ({
    id,
    protocols: JSON.parse(protocols_json) as string[],
  }));
}
