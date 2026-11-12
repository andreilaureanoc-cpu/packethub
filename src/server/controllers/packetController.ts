import type { IncomingMessage, ServerResponse } from "node:http";
import {
  atualizarPacote,
  criarPacote,
  excluirPacote,
  listarPacotes,
  obterPacote,
} from "../models/packetModel.js";
import type { NewPacket, Packet } from "../models/types.js";
import {
  HttpError,
  lerJson,
  metodoNaoPermitido,
  responderJson,
  validarCampos,
} from "./httpController.js";

const camposPacote = ["time", "src", "dst", "protocol", "info", "size", "dropped"];
const camposObrigatorios = camposPacote.slice(0, 6);

export async function controlarPacotes(
  request: IncomingMessage,
  response: ServerResponse,
  id: string | null,
  url: URL,
): Promise<void> {
  if (request.method === "GET") {
    const pacote = id ? obterPacote(id) : null;
    if (id && !pacote) throw new HttpError(404, "Pacote não encontrado.");
    responderJson(
      response,
      200,
      id ? pacote : listarPacotes(url.searchParams.get("protocol") || ""),
    );
    return;
  }
  if (request.method === "POST" && !id) {
    const dados = validarCampos(
      await lerJson(request),
      camposObrigatorios,
      camposPacote,
      ["dropped"],
      ["info"],
    ) as unknown as NewPacket;
    responderJson(response, 201, criarPacote(dados));
    return;
  }
  if (request.method === "PATCH" && id) {
    const alteracoes = validarCampos(
      await lerJson(request),
      [],
      camposPacote,
      ["dropped"],
      ["info"],
    ) as Partial<NewPacket>;
    const pacote = atualizarPacote(id, alteracoes);
    if (!pacote) throw new HttpError(404, "Pacote não encontrado.");
    responderJson(response, 200, pacote);
    return;
  }
  if (request.method === "DELETE" && id) {
    if (!excluirPacote(id)) throw new HttpError(404, "Pacote não encontrado.");
    responderJson(response, 200, {});
    return;
  }
  metodoNaoPermitido("GET, POST, PATCH, DELETE");
}
