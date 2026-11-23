import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError, responderErroApi } from "./controllers/httpController.js";
import { registrarVisita } from "./controllers/siteController.js";
import { apiRouter } from "./routes/apiRoutes.js";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
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

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);

app.use((request: Request, response: Response, next: NextFunction) => {
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
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/app.js") {
    pathname = "/dist/client/controllers/applicationController.js";
  }
  if (pathname === "/auth.js") {
    pathname = "/dist/client/controllers/authController.js";
  }

  const extension = extname(pathname).toLowerCase();
  const allowedClientScript =
    extension === ".js" && pathname.startsWith("/dist/client/");
  if (
    !contentTypes[extension] ||
    (extension === ".js" && !allowedClientScript)
  ) {
    next(new HttpError(404, "Not found"));
    return;
  }

  const file = resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    next(new HttpError(403, "Forbidden"));
    return;
  }
  if (
    extension === ".js" &&
    !file.startsWith(`${resolve(root, "dist/client")}${sep}`)
  ) {
    next(new HttpError(404, "Not found"));
    return;
  }

  if (extension === ".html" && request.method === "GET") {
    try {
      registrarVisita(request, pathname);
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
});

app.use(responderErroApi);
