import { createReadStream, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { responderErroApi } from "./controllers/httpController.js";
import { registrarVisita } from "./controllers/siteController.js";
import { tratarApi } from "./routes/apiRoutes.js";

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
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

function responderTexto(
  response: ServerResponse,
  status: number,
  mensagem: string,
): void {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(mensagem);
}

function servirArquivo(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): void {
  let caminho: string;
  try {
    caminho = decodeURIComponent(url.pathname);
  } catch {
    responderTexto(response, 400, "Bad request");
    return;
  }

  if (caminho === "/") caminho = "/index.html";
  if (caminho === "/app.js") {
    caminho = "/dist/client/controllers/applicationController.js";
  }
  const arquivo = resolve(root, `.${caminho}`);
  if (arquivo !== root && !arquivo.startsWith(`${root}${sep}`)) {
    responderTexto(response, 403, "Forbidden");
    return;
  }

  const contentType = contentTypes[extname(arquivo).toLowerCase()];
  if (!contentType) {
    responderTexto(response, 404, "Not found");
    return;
  }

  let arquivoInfo;
  try {
    arquivoInfo = statSync(arquivo);
  } catch {
    responderTexto(response, 404, "Not found");
    return;
  }

  if (!arquivoInfo.isFile()) {
    responderTexto(response, 404, "Not found");
    return;
  }

  if (
    request.method === "GET" &&
    extname(arquivo).toLowerCase() === ".html"
  ) {
    try {
      registrarVisita(request, url.pathname);
    } catch (erro) {
      console.error("Não foi possível registrar o acesso ao site:", erro);
      responderTexto(response, 500, "Não foi possível registrar o acesso.");
      return;
    }
  }

  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Length": arquivoInfo.size,
    "Content-Type": contentType,
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    createReadStream(arquivo).pipe(response);
  }
}

const server = createServer(async (request, response) => {
  let url: URL;
  try {
    url = new URL(request.url || "/", "http://localhost");
  } catch {
    responderTexto(response, 400, "Bad request");
    return;
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    try {
      await tratarApi(request, response, url);
    } catch (erro) {
      responderErroApi(response, erro);
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }
  servirArquivo(request, response, url);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`PacketHub disponível na porta ${port}`);
});

server.on("error", (erro) => {
  console.error("Não foi possível iniciar o servidor:", erro);
  process.exitCode = 1;
});
