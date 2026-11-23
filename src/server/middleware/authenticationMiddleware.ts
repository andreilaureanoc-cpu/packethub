import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../controllers/httpController.js";
import { validarJwt } from "../infrastructure/authentication.js";
import { tokenRevogado } from "../models/userModel.js";

export function autenticar(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const autorizacao = request.get("authorization") || "";
  const token = autorizacao.startsWith("Bearer ")
    ? autorizacao.slice("Bearer ".length)
    : "";
  if (!token) {
    next(new HttpError(401, "Autenticação necessária."));
    return;
  }

  try {
    const usuario = validarJwt(token);
    if (tokenRevogado(usuario.tokenId)) {
      next(new HttpError(401, "Token de autenticação revogado."));
      return;
    }
    response.locals.authUser = usuario;
    next();
  } catch (erro) {
    if (erro instanceof HttpError) {
      next(erro);
    } else {
      next(erro);
    }
  }
}
