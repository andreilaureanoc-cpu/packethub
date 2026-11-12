import { apiRequest } from "./apiClient.js";
import type { PacketRecord } from "./types.js";

export function listarPacotes(protocolo = ""): Promise<PacketRecord[]> {
  const filtro = protocolo ? `?protocol=${encodeURIComponent(protocolo)}` : "";
  return apiRequest(`/packetRecords${filtro}`);
}

export function salvarPacote(
  id: string | null,
  dados: Record<string, string>,
): Promise<PacketRecord> {
  const caminho = `/packetRecords${id === null ? "" : `/${encodeURIComponent(id)}`}`;
  return apiRequest(caminho, {
    method: id === null ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export function excluirPacote(id: string): Promise<void> {
  return apiRequest(`/packetRecords/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
