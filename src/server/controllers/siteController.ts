import type { IncomingMessage } from "node:http";
import { registrarAcesso } from "../models/accessLogModel.js";

export function registrarVisita(
  request: IncomingMessage,
  page: string,
): void {
  registrarAcesso(
    request.socket.remoteAddress || "unknown",
    request.headers["user-agent"] || "",
    page,
  );
}
