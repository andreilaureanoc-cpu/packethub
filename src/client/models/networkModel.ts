import { apiRequest } from "./apiClient.js";
import type {
  Capture,
  CaptureOptions,
  NetworkLayer,
} from "./types.js";

export function obterCaptura(): Promise<Capture> {
  return apiRequest("/capture");
}

export function obterOpcoesCaptura(): Promise<CaptureOptions> {
  return apiRequest("/capture/options");
}

export function iniciarCaptura(
  interfaceRede: string,
  filtro: string,
): Promise<Capture> {
  return apiRequest("/capture/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interface: interfaceRede, filter: filtro }),
  });
}

export function pararCaptura(): Promise<Capture> {
  return apiRequest("/capture/stop", { method: "POST" });
}

export function listarCamadas(): Promise<NetworkLayer[]> {
  return apiRequest("/layers");
}
