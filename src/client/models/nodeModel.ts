import { apiRequest } from "./apiClient.js";
import type { NodeRecord } from "./types.js";

export function listarNos(): Promise<NodeRecord[]> {
  return apiRequest("/nodeRecords");
}

export function salvarNo(
  id: string | null,
  dados: Record<string, string>,
): Promise<NodeRecord> {
  const caminho = `/nodeRecords${id === null ? "" : `/${encodeURIComponent(id)}`}`;
  return apiRequest(caminho, {
    method: id === null ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export function excluirNo(id: string): Promise<void> {
  return apiRequest(`/nodeRecords/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
