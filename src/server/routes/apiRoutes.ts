import { Router, type NextFunction, type Request, type Response } from "express";
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

function executar(
  controlador: (
    request: Request,
    response: Response,
  ) => void | Promise<void>,
) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    Promise.resolve(controlador(request, response)).catch(next);
  };
}

function obterId(request: Request): string {
  const id = request.params.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new HttpError(400, "Identificador inválido.");
  }
  return id;
}

export const apiRouter = Router();

apiRouter.post("/auth/register", registrar);
apiRouter.post("/auth/login", entrar);
apiRouter.use(autenticar);
apiRouter.get("/auth/me", obterSessao);
apiRouter.post("/auth/logout", sair);

apiRouter.route("/packetRecords")
  .get(executar((request, response) =>
    controlarPacotes(request, response, null, new URL(request.originalUrl, "http://localhost"))))
  .post(executar((request, response) =>
    controlarPacotes(request, response, null, new URL(request.originalUrl, "http://localhost"))));
apiRouter.route("/packetRecords/:id")
  .get(executar((request, response) =>
    controlarPacotes(request, response, obterId(request), new URL(request.originalUrl, "http://localhost"))))
  .patch(executar((request, response) =>
    controlarPacotes(request, response, obterId(request), new URL(request.originalUrl, "http://localhost"))))
  .delete(executar((request, response) =>
    controlarPacotes(request, response, obterId(request), new URL(request.originalUrl, "http://localhost"))));

apiRouter.route("/nodeRecords")
  .get(executar((request, response) => controlarNos(request, response, null)))
  .post(executar((request, response) => controlarNos(request, response, null)));
apiRouter.route("/nodeRecords/:id")
  .get(executar((request, response) => controlarNos(request, response, obterId(request))))
  .patch(executar((request, response) => controlarNos(request, response, obterId(request))))
  .delete(executar((request, response) => controlarNos(request, response, obterId(request))));

apiRouter.get("/capture", controlarEstadoCaptura);
apiRouter.get("/capture/options", controlarOpcoesCaptura);
apiRouter.post("/capture/start", executar(iniciarCaptura));
apiRouter.post("/capture/stop", executar(pararCaptura));
apiRouter.get("/layers", controlarCamadas);
