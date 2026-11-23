import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app.js";

const port = Number(process.env.PORT || 8080);
const server = createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`PacketHub disponível na porta ${port}`);
});

server.on("error", (erro) => {
  console.error("Não foi possível iniciar o servidor:", erro);
  process.exitCode = 1;
});
