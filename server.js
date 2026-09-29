import { createReadStream, statSync } from "node:fs";
import { createServer, request as proxyRequest } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const contentTypes = {
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

function encaminharApi(request, response, url) {
  const headers = { ...request.headers };
  delete headers.connection;
  delete headers.host;
  delete headers["proxy-connection"];

  const caminho = `${url.pathname.slice("/api".length) || "/"}${url.search}`;
  const chamadaApi = proxyRequest(
    {
      hostname: "127.0.0.1",
      port: 3000,
      path: caminho,
      method: request.method,
      headers,
    },
    (respostaApi) => {
      response.writeHead(respostaApi.statusCode || 502, respostaApi.headers);
      respostaApi.pipe(response);
    },
  );

  chamadaApi.on("error", () => {
    if (response.headersSent) {
      response.end();
      return;
    }

    const corpo = JSON.stringify({ error: "JSON Server indisponível" });
    response.writeHead(502, {
      "Content-Length": Buffer.byteLength(corpo),
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(corpo);
  });

  request.pipe(chamadaApi);
}

const server = createServer((request, response) => {
  let url;
  try {
    url = new URL(request.url, "http://localhost");
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    encaminharApi(request, response, url);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    return;
  }

  let caminho;
  try {
    caminho = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  const arquivo = resolve(root, `.${caminho === "/" ? "/index.html" : caminho}`);
  if (arquivo !== root && !arquivo.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  const contentType = contentTypes[extname(arquivo).toLowerCase()];
  if (!contentType) {
    response.writeHead(404).end("Not found");
    return;
  }

  let arquivoInfo;
  try {
    arquivoInfo = statSync(arquivo);
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }

  if (!arquivoInfo.isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Length": arquivoInfo.size,
    "Content-Type": contentType,
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(arquivo).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Site disponível na porta ${port}`);
});