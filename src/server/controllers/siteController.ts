import type { Request } from "express";
import { registrarAcesso } from "../models/accessLogModel.js";

export async function registrarVisita(
  request: Request,
  page: string,
): Promise<void> {
  await registrarAcesso(
    request.socket.remoteAddress || "unknown",
    request.headers["user-agent"] || "",
    page,
  );
}
