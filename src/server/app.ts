import "dotenv/config";
import express from "express";
import { responderErroApi } from "./controllers/httpController.js";
import { apiRouter } from "./routes/apiRoutes.js";
import { servirArquivoEstático } from "./staticFiles.js";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);
app.use(servirArquivoEstático);
app.use(responderErroApi);
