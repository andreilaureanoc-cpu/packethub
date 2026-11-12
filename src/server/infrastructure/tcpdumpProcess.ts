import {
  spawn,
  type ChildProcessByStdio,
} from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import type { Readable } from "node:stream";
import { atualizarCaptura, obterCaptura } from "../models/captureModel.js";
import { criarPacote } from "../models/packetModel.js";
import type { Capture, Packet } from "../models/types.js";

const filtros = [
  { id: "all", label: "Todo o tráfego", expressao: "" },
  { id: "tcp", label: "TCP", expressao: "tcp" },
  { id: "udp", label: "UDP", expressao: "udp" },
  { id: "icmp", label: "ICMP", expressao: "icmp" },
  { id: "dns", label: "DNS", expressao: "port 53" },
] as const;

const limitePacotes = 1000;
const duracaoMaximaMs = 5 * 60 * 1000;
const duracaoParadaMs = 2000;

type TcpdumpChild = ChildProcessByStdio<null, Readable, Readable>;

let processoCaptura: TcpdumpChild | null = null;
let inicioCaptura: number | null = null;
let temporizadorLimite: ReturnType<typeof setTimeout> | null = null;
let totalPacotesCapturados = 0;

export class TcpdumpError extends Error {}

function listarInterfacesPermitidas(): string[] {
  const disponiveis = networkInterfaces();
  return [...new Set((process.env.TCPDUMP_INTERFACES || "")
    .split(",")
    .map((interfaceRede) => interfaceRede.trim())
    .filter(
      (interfaceRede) =>
        interfaceRede !== "any" &&
        /^[a-zA-Z0-9_.:-]{1,15}$/.test(interfaceRede) &&
        Boolean(disponiveis[interfaceRede]),
    ))];
}

export function obterOpcoesCaptura() {
  const interfaces = listarInterfacesPermitidas();
  const temToken =
    typeof process.env.CAPTURE_ADMIN_TOKEN === "string" &&
    process.env.CAPTURE_ADMIN_TOKEN.length >= 32;
  const enabled =
    process.env.TCPDUMP_ENABLED === "true" && interfaces.length > 0 && temToken;

  return {
    enabled,
    interfaces: enabled ? interfaces : [],
    filters: filtros.map(({ id, label }) => ({ id, label })),
    message: enabled
      ? ""
      : "Captura desativada. Configure tcpdump, interface autorizada e token de administração no servidor.",
  };
}

export function validarTokenCaptura(token: string | undefined): boolean {
  const esperado = process.env.CAPTURE_ADMIN_TOKEN;
  if (!esperado || esperado.length < 32 || !token) return false;
  const recebidoBuffer = Buffer.from(token);
  const esperadoBuffer = Buffer.from(esperado);
  return (
    recebidoBuffer.length === esperadoBuffer.length &&
    timingSafeEqual(recebidoBuffer, esperadoBuffer)
  );
}

export function validarInterfaceCaptura(interfaceRede: string): boolean {
  const { enabled, interfaces } = obterOpcoesCaptura();
  return enabled && interfaces.includes(interfaceRede);
}

export function validarFiltroCaptura(filtro: string): boolean {
  return filtros.some((item) => item.id === filtro);
}

export function obterEstadoCaptura(): Capture {
  const captura = obterCaptura();
  if (!processoCaptura || inicioCaptura === null) return captura;
  return {
    ...captura,
    duration: formatarDuracao(Date.now() - inicioCaptura),
    active: true,
  };
}

export async function iniciarTcpdump(
  interfaceRede: string,
  filtroId: string,
): Promise<Capture> {
  if (!validarInterfaceCaptura(interfaceRede)) {
    throw new TcpdumpError("A captura não está habilitada para essa interface.");
  }
  const filtro = filtros.find((item) => item.id === filtroId);
  if (!filtro) throw new TcpdumpError("Filtro de captura inválido.");
  if (processoCaptura) throw new TcpdumpError("Já existe uma captura em andamento.");

  const args = [
    "-n",
    "-l",
    "-tttt",
    "-i",
    interfaceRede,
    "-s",
    "96",
    ...(filtro.expressao ? [filtro.expressao] : []),
  ];
  const executavel = process.env.TCPDUMP_PATH || "tcpdump";
  const processo = spawn(executavel, args, {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let inicializado = false;
  const pronto = new Promise<void>((resolve, reject) => {
    processo.once("spawn", () => {
      inicializado = true;
      resolve();
    });
    processo.once("error", (erro) => {
      if (!inicializado) {
        reject(
          new TcpdumpError(
            `Não foi possível iniciar tcpdump: ${erro.message}`,
          ),
        );
      }
    });
  });

  await pronto;
  processoCaptura = processo;
  inicioCaptura = Date.now();
  totalPacotesCapturados = 0;
  let encerrouDuranteInicializacao = false;
  lerSaidaTcpdump(processo);
  processo.stderr.on("data", (parte: Buffer) => {
    const mensagem = parte.toString("utf8").trim();
    if (mensagem) console.error("tcpdump:", mensagem);
  });
  processo.on("error", (erro) => {
    console.error("Falha no processo tcpdump:", erro);
    finalizarCaptura(processo);
  });
  processo.once("close", (codigo, sinal) => {
    encerrouDuranteInicializacao = true;
    if (codigo !== 0 && sinal !== "SIGINT" && sinal !== "SIGTERM") {
      console.error(`tcpdump encerrou com código ${codigo ?? "desconhecido"}.`);
    }
    finalizarCaptura(processo);
  });
  if (processo.exitCode !== null || processo.signalCode !== null) {
    encerrouDuranteInicializacao = true;
  }

  const expressaoVisivel = filtro.expressao ? ` ${filtro.expressao}` : "";
  const command = `tcpdump -n -l -tttt -i ${interfaceRede} -s 96${expressaoVisivel}`;
  if (encerrouDuranteInicializacao) {
    finalizarCaptura(processo);
    return atualizarCaptura({
      interface: interfaceRede,
      command,
      filter: filtroId,
      active: false,
    });
  }

  temporizadorLimite = setTimeout(() => {
    void pararTcpdump();
  }, duracaoMaximaMs);
  return atualizarCaptura({
    interface: interfaceRede,
    command,
    duration: "00:00:00",
    filter: filtroId,
    active: true,
  });
}

export async function pararTcpdump(): Promise<Capture> {
  const processo = processoCaptura;
  if (!processo) {
    return atualizarCaptura({ active: false });
  }

  const encerrado = new Promise<void>((resolve) => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const concluir = () => {
      if (temporizador) clearTimeout(temporizador);
      resolve();
    };
    processo.once("close", concluir);
    processo.kill("SIGINT");
    temporizador = setTimeout(() => {
      if (processoCaptura === processo) processo.kill("SIGTERM");
      concluir();
    }, duracaoParadaMs);
  });
  await encerrado;
  finalizarCaptura(processo);
  return atualizarCaptura({
    active: false,
    duration:
      inicioCaptura === null
        ? obterCaptura().duration
        : formatarDuracao(Date.now() - inicioCaptura),
  });
}

function lerSaidaTcpdump(
  processo: TcpdumpChild,
): void {
  let buffer = "";
  processo.stdout.setEncoding("utf8");
  processo.stdout.on("data", (parte: string) => {
    buffer += parte;
    if (buffer.length > 8192 && !buffer.includes("\n")) buffer = "";
    const linhas = buffer.split(/\r?\n/);
    buffer = linhas.pop() || "";
    for (const linha of linhas) {
      const pacote = converterLinhaTcpdump(linha);
      if (!pacote) continue;
      try {
        criarPacote(pacote);
        totalPacotesCapturados += 1;
        if (totalPacotesCapturados >= limitePacotes) {
          void pararTcpdump();
          return;
        }
      } catch (erro) {
        console.error("Não foi possível salvar metadados do pacote:", erro);
        void pararTcpdump();
        return;
      }
    }
  });
}

export function converterLinhaTcpdump(linha: string): Omit<Packet, "id"> | null {
  const timestamp = linha.match(
    /^(?:\d{4}-\d{2}-\d{2}\s+)?(\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s+/,
  );
  if (!timestamp) return null;

  const dados = linha.slice(timestamp[0].length);
  const separadorOrigem = dados.indexOf(" > ");
  if (separadorOrigem < 0) return null;
  const cabecalho = dados.slice(0, separadorOrigem).trim();
  const separadorDestino = dados.indexOf(": ", separadorOrigem + 3);
  if (separadorDestino < 0) return null;

  const src = cabecalho.replace(/^(?:IP6?|ARP)\s+/, "");
  const dst = dados.slice(separadorOrigem + 3, separadorDestino).trim();
  const detalhes = dados.slice(separadorDestino + 2);
  if (!src || !dst) return null;

  const protocolo =
    /^ARP\b/.test(cabecalho) ? "ARP" :
    /\bFlags\s+\[/.test(detalhes) ? "TCP" :
    /^UDP\b/.test(detalhes) ? "UDP" :
    /\bICMP6?\b/.test(detalhes) ? "ICMP" :
    cabecalho.startsWith("IP6 ") ? "IPv6" :
    "IP";
  const flags = detalhes.match(/Flags\s+(\[[^\]]+\])/);
  const tamanho = detalhes.match(/\blength\s+(\d+)/i);
  const fracao = (timestamp[2] || "").slice(0, 3).padEnd(3, "0");

  return {
    time: `${timestamp[1]}.${fracao}`,
    src,
    dst,
    protocol: protocolo,
    info: flags ? `TCP ${flags[1]}` : `${protocolo} packet`,
    size: `${Number(tamanho?.[1] || 0)} B`,
  };
}

function finalizarCaptura(
  processo: TcpdumpChild,
): void {
  if (processoCaptura !== processo) return;
  processoCaptura = null;
  if (temporizadorLimite) clearTimeout(temporizadorLimite);
  temporizadorLimite = null;
  const duracao =
    inicioCaptura === null
      ? obterCaptura().duration
      : formatarDuracao(Date.now() - inicioCaptura);
  inicioCaptura = null;
  atualizarCaptura({ active: false, duration: duracao });
}

function formatarDuracao(duracaoMs: number): string {
  const totalSegundos = Math.floor(duracaoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return [horas, minutos, segundos]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");
}

if (obterCaptura().active) {
  atualizarCaptura({
    active: false,
    command: "tcpdump (desativado)",
    duration: "00:00:00",
    filter: "all",
    interface: "",
  });
}
