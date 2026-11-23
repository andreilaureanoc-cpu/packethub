import { Router, type Request, type Response } from "express";
import {
  entrar,
  obterSessao,
  registrar,
  sair,
} from "../controllers/authController.js";
import {
  controlarEstadoCaptura,
  controlarOpcoesCaptura,
  controlarCamadas,
  iniciarCaptura,
  pararCaptura,
} from "../controllers/networkController.js";
import { controlarNos } from "../controllers/nodeController.js";
import { controlarPacotes } from "../controllers/packetController.js";
import { HttpError } from "../controllers/httpController.js";
import { autenticar } from "../middleware/authenticationMiddleware.js";

function decodificarId(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    throw new HttpError(400, "Identificador inválido.");
  }
}

export async function tratarApi(
  request: Request,
  response: Response,
  url: URL,
): Promise<void> {
  const segmentos = url.pathname.split("/").filter(Boolean);
  const recurso = segmentos[1];
  if (segmentos.length > 3) throw new HttpError(404, "Rota não encontrada.");

  switch (recurso) {
    case "packetRecords":
      await controlarPacotes(
        request,
        response,
        segmentos[2] ? decodificarId(segmentos[2]) : null,
        url,
      );
      return;
    case "nodeRecords":
      await controlarNos(
        request,
        response,
        segmentos[2] ? decodificarId(segmentos[2]) : null,
      );
      return;
    case "capture":
      if (!segmentos[2]) {
        controlarEstadoCaptura(request, response);
        return;
      }
      if (segmentos[2] === "options") {
        controlarOpcoesCaptura(request, response);
        return;
      }
      if (segmentos[2] === "start") {
        await iniciarCaptura(request, response);
        return;
      }
      if (segmentos[2] === "stop") {
        await pararCaptura(request, response);
        return;
      }
      throw new HttpError(404, "Rota não encontrada.");
    case "layers":
      if (segmentos[2]) throw new HttpError(404, "Rota não encontrada.");
      controlarCamadas(request, response);
      return;
    default:
      throw new HttpError(404, "Rota não encontrada.");
  }
}

export const apiRouter = Router();

apiRouter.post("/auth/register", registrar);
apiRouter.post("/auth/login", entrar);
apiRouter.use(autenticar);
apiRouter.get("/auth/me", obterSessao);
apiRouter.post("/auth/logout", sair);
apiRouter.use(async (request, response, next) => {
  try {
    await tratarApi(
      request,
      response,
      new URL(request.originalUrl, "http://localhost"),
    );
  } catch (erro) {
    next(erro);
  }
});
