import type { IncomingMessage, ServerResponse } from "node:http";
import {
  atualizarNo,
  criarNo,
  excluirNo,
  listarNos,
  obterNo,
} from "../models/nodeModel.js";
import type { NewNode } from "../models/types.js";
import {
  HttpError,
  lerJson,
  metodoNaoPermitido,
  responderJson,
  validarCampos,
} from "./httpController.js";

const camposNo = ["host", "ip", "service", "latency", "load", "status"];

export async function controlarNos(
  request: IncomingMessage,
  response: ServerResponse,
  id: string | null,
): Promise<void> {
  if (request.method === "GET") {
    const no = id ? obterNo(id) : null;
    if (id && !no) throw new HttpError(404, "Nó não encontrado.");
    responderJson(response, 200, id ? no : listarNos());
    return;
  }
  if (request.method === "POST" && !id) {
    const dados = validarCampos(
      await lerJson(request),
      camposNo,
      camposNo,
    ) as unknown as NewNode;
    responderJson(response, 201, criarNo(dados));
    return;
  }
  if (request.method === "PATCH" && id) {
    const alteracoes = validarCampos(
      await lerJson(request),
      [],
      camposNo,
    ) as Partial<NewNode>;
    const no = atualizarNo(id, alteracoes);
    if (!no) throw new HttpError(404, "Nó não encontrado.");
    responderJson(response, 200, no);
    return;
  }
  if (request.method === "DELETE" && id) {
    if (!excluirNo(id)) throw new HttpError(404, "Nó não encontrado.");
    responderJson(response, 200, {});
    return;
  }
  metodoNaoPermitido("GET, POST, PATCH, DELETE");
}
