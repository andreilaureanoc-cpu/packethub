import { database } from "../infrastructure/database.js";
import type { NetworkLayer } from "./types.js";

export async function listarCamadas(): Promise<NetworkLayer[]> {
  const camadas = await database.layer.findMany({ orderBy: { id: "asc" } });
  return camadas.map(({ id, protocolsJson }) => ({
    id,
    protocols: JSON.parse(protocolsJson) as string[],
  }));
}
