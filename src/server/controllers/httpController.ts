import type { IncomingMessage, ServerResponse } from "node:http";

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
  response: ServerResponse,
  status: number,
  dados: unknown,
): void {
  const corpo = JSON.stringify(dados);
  response.writeHead(status, {
    "Content-Length": Buffer.byteLength(corpo),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(corpo);
}

export async function lerJson(request: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  let tamanho = 0;
  for await (const parte of request) {
    const buffer = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
    tamanho += buffer.length;
    if (tamanho > 1024 * 1024) {
      throw new HttpError(413, "O corpo da requisição excede 1 MB.");
    }
    partes.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    throw new HttpError(400, "O corpo da requisição deve ser um JSON válido.");
  }
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
  response: ServerResponse,
  erro: unknown,
): void {
  if (erro instanceof HttpError) {
    if (erro.allow) response.setHeader("Allow", erro.allow);
    responderJson(response, erro.status, { error: erro.message });
    return;
  }
  console.error("Erro ao processar a API:", erro);
  responderJson(response, 500, { error: "Erro interno do servidor." });
}

export function metodoNaoPermitido(allow: string): never {
  throw new HttpError(405, "Método não permitido.", allow);
}
