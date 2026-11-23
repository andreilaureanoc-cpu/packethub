import type { NodeRecord, PacketRecord } from "./types.js";

export type HostProtocolCount = {
  protocol: string;
  count: number;
};

function endpointCorrespondeAoHost(endpoint: string, no: NodeRecord): boolean {
  const endereco = endpoint.trim().toLowerCase();
  const ip = no.ip.trim().toLowerCase();
  if (!ip) return false;
  if (endereco === ip) return true;

  return [".", ":"].some((separador) => {
    const prefixo = `${ip}${separador}`;
    const porta = endereco.startsWith(prefixo)
      ? endereco.slice(prefixo.length)
      : "";
    return /^\d+$/.test(porta);
  });
}

export function encontrarHostDoEndpoint(
  endpoint: string,
  nos: NodeRecord[],
): NodeRecord | undefined {
  return nos.find((no) => endpointCorrespondeAoHost(endpoint, no));
}

export function resumirProtocolosDoHost(
  no: NodeRecord,
  pacotes: PacketRecord[],
): HostProtocolCount[] {
  const contagens = new Map<string, number>();
  for (const pacote of pacotes) {
    if (
      pacote.source !== "capture" ||
      (!endpointCorrespondeAoHost(pacote.src, no) &&
        !endpointCorrespondeAoHost(pacote.dst, no))
    ) {
      continue;
    }

    const protocolo = pacote.protocol.trim();
    if (protocolo) contagens.set(protocolo, (contagens.get(protocolo) || 0) + 1);
  }

  return [...contagens]
    .map(([protocol, count]) => ({ protocol, count }))
    .sort(
      (primeiro, segundo) =>
        segundo.count - primeiro.count ||
        primeiro.protocol.localeCompare(segundo.protocol),
    );
}
