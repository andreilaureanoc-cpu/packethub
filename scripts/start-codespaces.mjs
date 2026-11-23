import { spawn, spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function executar(comando, argumentos, opcoes = {}) {
  const resultado = spawnSync(comando, argumentos, {
    cwd: root,
    encoding: "utf8",
    ...opcoes,
  });
  if (resultado.error) throw resultado.error;
  return resultado;
}

function garantirDependencias() {
  try {
    accessSync(join(root, "node_modules/.bin/tsc"), constants.X_OK);
  } catch {
    console.log("Dependências ausentes ou incompletas; executando npm install.");
    const resultado = executar(npm, ["install"], { stdio: "inherit" });
    if (resultado.status !== 0) {
      throw new Error(`npm install falhou (código ${resultado.status ?? "desconhecido"}).`);
    }
  }
}

function lerEnv(caminho) {
  if (!existsSync(caminho)) copyFileSync(join(root, ".env.example"), caminho);
  return readFileSync(caminho, "utf8");
}

function obterValorEnv(conteudo, chave) {
  return conteudo
    .split(/\r?\n/)
    .find((linha) => linha.startsWith(`${chave}=`))
    ?.slice(chave.length + 1) ?? "";
}

function definirEnv(caminho, chave, valor) {
  const linhas = readFileSync(caminho, "utf8").split(/\r?\n/);
  const indice = linhas.findIndex((linha) => linha.startsWith(`${chave}=`));
  const linha = `${chave}=${valor}`;
  if (indice < 0) linhas.push(linha);
  else linhas[indice] = linha;
  writeFileSync(caminho, linhas.join("\n").replace(/\n*$/, "\n"));
}

function detectarInterface() {
  const resultado = executar("ip", ["-br", "addr"]);
  if (resultado.status !== 0) {
    throw new Error(`Não foi possível listar interfaces de rede: ${resultado.stderr.trim()}`);
  }
  const interfaces = resultado.stdout
    .split(/\r?\n/)
    .map((linha) => linha.trim().split(/\s+/))
    .filter(([nome, estado, endereco]) =>
      nome &&
      nome !== "lo" &&
      !/^(?:docker|br-|veth|vbox)/.test(nome) &&
      estado === "UP" &&
      endereco,
    )
    .map(([nome]) => nome.split("@", 1)[0])
    .filter((nome) => Boolean(networkInterfaces()[nome]));
  return [...new Set(interfaces)];
}

function configurar() {
  const caminhoEnv = join(root, ".env");
  const conteudo = lerEnv(caminhoEnv);
  const interfaces = detectarInterface();
  const selecionada =
    process.env.IFACE ||
    process.argv[2] ||
    obterValorEnv(conteudo, "TCPDUMP_INTERFACES").split(",")[0] ||
    interfaces[0];
  if (!selecionada || !interfaces.includes(selecionada)) {
    throw new Error(
      `Interface inválida ou indisponível: ${selecionada || "(nenhuma)"}. ` +
      `Interfaces UP disponíveis: ${interfaces.join(", ") || "(nenhuma)"}. ` +
      "Use IFACE=nome npm run start:codespaces.",
    );
  }

  const jwtSecret = obterValorEnv(conteudo, "JWT_SECRET");
  definirEnv(
    caminhoEnv,
    "JWT_SECRET",
    jwtSecret.length >= 32 ? jwtSecret : randomBytes(32).toString("hex"),
  );
  definirEnv(caminhoEnv, "TCPDUMP_ENABLED", "true");
  definirEnv(caminhoEnv, "TCPDUMP_INTERFACES", selecionada);
  definirEnv(caminhoEnv, "TCPDUMP_PATH", "tcpdump");
  definirEnv(caminhoEnv, "TRUST_PROXY", "true");

  for (const chave of ["JWT_SECRET", "TCPDUMP_ENABLED", "TCPDUMP_INTERFACES", "TCPDUMP_PATH", "TRUST_PROXY"]) {
    process.env[chave] = obterValorEnv(readFileSync(caminhoEnv, "utf8"), chave);
  }
  process.env.DATABASE_PATH ||= obterValorEnv(readFileSync(caminhoEnv, "utf8"), "DATABASE_PATH");

  const tcpdump = process.env.TCPDUMP_PATH || "tcpdump";
  const versao = executar(tcpdump, ["--version"], { stdio: "ignore" });
  if (versao.error || versao.status !== 0) {
    throw new Error(
      "tcpdump não foi encontrado. Instale tcpdump no ambiente e tente novamente.",
    );
  }

  console.log(`Interface configurada: ${selecionada}`);
  console.log(
    "Se a captura retornar erro de permissão, solicite ao administrador " +
    "do ambiente a autorização de captura do tcpdump.",
  );
}

function iniciarServidor() {
  const servidor = spawn(npm, ["start"], { cwd: root, stdio: "inherit" });
  const encaminharSinal = (sinal) => servidor.kill(sinal);
  process.once("SIGINT", () => encaminharSinal("SIGINT"));
  process.once("SIGTERM", () => encaminharSinal("SIGTERM"));
  servidor.once("error", (erro) => {
    console.error("Não foi possível iniciar o servidor:", erro);
    process.exitCode = 1;
  });
  servidor.once("exit", (codigo, sinal) => {
    process.exitCode = codigo ?? (sinal ? 1 : 0);
  });
}

try {
  garantirDependencias();
  configurar();
  iniciarServidor();
} catch (erro) {
  console.error("Falha ao preparar o PacketHub:", erro.message);
  process.exitCode = 1;
}
