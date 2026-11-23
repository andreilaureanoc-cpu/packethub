import type { Request } from "express";
import { registrarAcesso } from "../models/accessLogModel.js";

export function registrarVisita(
  request: Request,
  page: string,
): void {
  registrarAcesso(
    request.socket.remoteAddress || "unknown",
    request.headers["user-agent"] || "",
    page,
  );
}
