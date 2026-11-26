import type { NextFunction, Request, Response } from "express";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError } from "./controllers/httpController.js";
import { registrarVisita } from "./controllers/siteController.js";

const projectRoot = resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const viewRoot = resolve(projectRoot, "src/server/views");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function resolverArquivo(pathname: string): string | null {
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/app.js") pathname = "/dist/client/controllers/applicationController.js";
  if (pathname === "/auth.js") pathname = "/dist/client/controllers/authController.js";

  const extension = extname(pathname).toLowerCase();
  const allowedClientScript =
    extension === ".js" && pathname.startsWith("/dist/client/");
  if (!contentTypes[extension] || (extension === ".js" && !allowedClientScript)) {
    return null;
  }

  const fileRoot = extension === ".html" ? viewRoot : projectRoot;
  const file = resolve(fileRoot, `.${pathname}`);
  if (file !== fileRoot && !file.startsWith(`${fileRoot}${sep}`)) {
    throw new HttpError(403, "Forbidden");
  }
  if (extension === ".js" && !file.startsWith(`${resolve(projectRoot, "dist/client")}${sep}`)) {
    return null;
  }
  return file;
}

export async function servirArquivoEstático(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.set("Allow", "GET, HEAD").status(405).send("Method not allowed");
    return;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(request.path);
  } catch {
    next(new HttpError(400, "Bad request"));
    return;
  }

  let file: string | null;
  try {
    file = resolverArquivo(pathname);
  } catch (erro) {
    next(erro);
    return;
  }
  if (!file) {
    next(new HttpError(404, "Not found"));
    return;
  }

  const extension = extname(file).toLowerCase();
  if (extension === ".html" && request.method === "GET") {
    try {
      await registrarVisita(request, pathname);
    } catch (erro) {
      next(erro);
      return;
    }
  }

  response.set("Cache-Control", "no-cache");
  response.sendFile(file, (erro) => {
    if (erro && "status" in erro && erro.status === 404) {
      next(new HttpError(404, "Not found"));
    } else if (erro) {
      next(erro);
    }
  });
}
