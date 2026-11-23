import type { Request, Response } from "express";
import type { TLSSocket } from "node:tls";
import {
  obterEstadoCaptura,
  obterOpcoesCaptura,
  iniciarTcpdump,
  pararTcpdump,
  TcpdumpError,
  validarFiltroCaptura,
  validarInterfaceCaptura,
} from "../infrastructure/tcpdumpProcess.js";
import { listarCamadas } from "../models/layerModel.js";
import {
  HttpError,
  lerJson,
  metodoNaoPermitido,
  responderJson,
  validarCampos,
} from "./httpController.js";

function requisicaoSegura(request: Request): boolean {
  const endereco = request.socket.remoteAddress || "";
  const local =
    endereco === "::1" ||
    endereco === "127.0.0.1" ||
    endereco.startsWith("127.") ||
    endereco.startsWith("::ffff:127.");
  const tlsDireto = Boolean((request.socket as TLSSocket).encrypted);
  const tlsProxy =
    process.env.TRUST_PROXY === "true" &&
    request.headers["x-forwarded-proto"] === "https";
  return local || tlsDireto || tlsProxy;
}

function autorizarControleCaptura(request: Request): void {
  if (!obterOpcoesCaptura().enabled) {
    throw new HttpError(
      503,
      "Captura desativada. Configure tcpdump e uma interface autorizada no servidor.",
    );
  }
  if (!requisicaoSegura(request)) {
    throw new HttpError(
      403,
      "O controle remoto da captura exige HTTPS.",
    );
  }
}

export function controlarOpcoesCaptura(
  request: Request,
  response: Response,
): void {
  if (request.method !== "GET") metodoNaoPermitido("GET");
  responderJson(response, 200, obterOpcoesCaptura());
}

export function controlarEstadoCaptura(
  request: Request,
  response: Response,
): void {
  if (request.method !== "GET") metodoNaoPermitido("GET");
  responderJson(response, 200, obterEstadoCaptura());
}

export async function iniciarCaptura(
  request: Request,
  response: Response,
): Promise<void> {
  if (request.method !== "POST") metodoNaoPermitido("POST");
  autorizarControleCaptura(request);
  const dados = validarCampos(
    await lerJson(request),
    ["interface", "filter"],
    ["interface", "filter"],
  );
  const interfaceRede = dados.interface as string;
  const filtro = dados.filter as string;
  if (!validarInterfaceCaptura(interfaceRede)) {
    throw new HttpError(400, "A interface não está autorizada para captura.");
  }
  if (!validarFiltroCaptura(filtro)) {
    throw new HttpError(400, "Filtro de captura inválido.");
  }
  try {
    responderJson(response, 200, await iniciarTcpdump(interfaceRede, filtro));
  } catch (erro) {
    if (erro instanceof TcpdumpError) {
      throw new HttpError(503, erro.message);
    }
    throw erro;
  }
}

export async function pararCaptura(
  request: Request,
  response: Response,
): Promise<void> {
  if (request.method !== "POST") metodoNaoPermitido("POST");
  autorizarControleCaptura(request);
  responderJson(response, 200, await pararTcpdump());
}

export function controlarCamadas(
  request: Request,
  response: Response,
): void {
  if (request.method !== "GET") metodoNaoPermitido("GET");
  responderJson(response, 200, listarCamadas());
}
