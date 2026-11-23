import type { ErrorRequestHandler, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly allow?: string,
  ) {
    super(message);
  }
}

export function responderJson(
  response: Response,
  status: number,
  dados: unknown,
): void {
  response.status(status).json(dados);
}

export async function lerJson(request: Request): Promise<unknown> {
  return request.body;
}

export function validarObjeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new HttpError(400, "Envie um objeto JSON.");
  }
  return valor as Record<string, unknown>;
}

export function validarCampos(
  valor: unknown,
  obrigatorios: string[],
  permitidos: string[],
  camposBooleanos: string[] = [],
  camposObjeto: string[] = [],
): Record<string, unknown> {
  const dados = validarObjeto(valor);
  for (const chave of Object.keys(dados)) {
    if (!permitidos.includes(chave)) {
      throw new HttpError(400, `Campo não permitido: ${chave}.`);
    }
  }
  for (const chave of obrigatorios) {
    if (typeof dados[chave] !== "string" || dados[chave].length === 0) {
      throw new HttpError(400, `O campo ${chave} é obrigatório.`);
    }
  }
  for (const [chave, campo] of Object.entries(dados)) {
    const valido = camposBooleanos.includes(chave)
      ? typeof campo === "boolean"
      : camposObjeto.includes(chave)
        ? typeof campo === "string" ||
          (Boolean(campo) && typeof campo === "object" && !Array.isArray(campo))
        : typeof campo === "string";
    if (!valido) {
      throw new HttpError(400, `Valor inválido para o campo ${chave}.`);
    }
  }
  return dados;
}

export function responderErroApi(
  erro: unknown,
  request: Request,
  response: Response,
  next: Parameters<ErrorRequestHandler>[3],
): void {
  if (response.headersSent) {
    next(erro);
    return;
  }
  if (erro instanceof HttpError) {
    if (request.originalUrl.startsWith("/api")) {
      if (erro.allow) response.set("Allow", erro.allow);
      responderJson(response, erro.status, { error: erro.message });
    } else {
      response.status(erro.status).type("text/plain").send(erro.message);
    }
    return;
  }
  if (!request.originalUrl.startsWith("/api")) {
    response.status(500).type("text/plain").send("Internal server error");
    return;
  }
  const erroParser = erro as { status?: unknown; type?: unknown };
  if (erroParser.status === 400 || erroParser.status === 413) {
    responderJson(response, erroParser.status, {
      error:
        erroParser.status === 413
          ? "O corpo da requisição excede 1 MB."
          : "O corpo da requisição deve ser um JSON válido.",
    });
    return;
  }
  console.error("Erro ao processar a API:", erro);
  responderJson(response, 500, { error: "Erro interno do servidor." });
}

export function metodoNaoPermitido(allow: string): never {
  throw new HttpError(405, "Método não permitido.", allow);
}
