import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import {
  gerarHashSenha,
  gerarJwt,
  obterJwtSecret,
  verificarSenha,
} from "../infrastructure/authentication.js";
import {
  criarUsuario,
  obterUsuarioPorEmail,
  revogarToken,
} from "../models/userModel.js";
import { HttpError, responderJson, validarCampos } from "./httpController.js";

function validarCredenciais(body: unknown): { email: string; password: string } {
  const dados = validarCampos(
    body,
    ["email", "password"],
    ["email", "password"],
  );
  const email = (dados.email as string).trim().toLowerCase();
  const password = dados.password as string;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new HttpError(400, "Informe um e-mail válido.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new HttpError(400, "A senha deve ter entre 8 e 128 caracteres.");
  }
  return { email, password };
}

function responderSessao(
  response: Response,
  usuario: { id: string; email: string },
  status: number,
): void {
  responderJson(response, status, {
    token: gerarJwt(usuario),
    user: usuario,
  });
}

export async function registrar(
  request: Request,
  response: Response,
): Promise<void> {
  obterJwtSecret();
  const { email, password } = validarCredenciais(request.body);
  if (await obterUsuarioPorEmail(email)) {
    throw new HttpError(409, "Já existe uma conta com este e-mail.");
  }

  const usuario = await criarUsuario(
    randomUUID(),
    email,
    await gerarHashSenha(password),
  );
  if (!usuario) {
    throw new HttpError(409, "Já existe uma conta com este e-mail.");
  }
  responderSessao(response, usuario, 201);
}

export async function entrar(
  request: Request,
  response: Response,
): Promise<void> {
  obterJwtSecret();
  const { email, password } = validarCredenciais(request.body);
  const usuario = await obterUsuarioPorEmail(email);
  if (!usuario || !(await verificarSenha(password, usuario.passwordHash))) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }
  responderSessao(response, { id: usuario.id, email: usuario.email }, 200);
}

export function obterSessao(_request: Request, response: Response): void {
  const { id, email } = response.locals.authUser;
  responderJson(response, 200, { user: { id, email } });
}

export async function sair(
  _request: Request,
  response: Response,
): Promise<void> {
  const { tokenId, expiresAt } = response.locals.authUser;
  await revogarToken(tokenId, expiresAt);
  response.status(204).end();
}
