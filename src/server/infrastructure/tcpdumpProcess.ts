import {
  spawn,
  type ChildProcessByStdio,
} from "node:child_process";
import { networkInterfaces } from "node:os";
import type { Readable } from "node:stream";
import { atualizarCaptura, obterCaptura } from "../models/captureModel.js";
import {
  criarPacote,
  limparPacotesDemonstrativos,
} from "../models/packetModel.js";
import type { Capture, Packet } from "../models/types.js";

const filtros = [
  { id: "all", label: "Todo o tráfego", expressao: "" },
  { id: "tcp", label: "TCP", expressao: "tcp" },
  { id: "udp", label: "UDP", expressao: "udp" },
  { id: "icmp", label: "ICMP", expressao: "icmp or icmp6" },
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
  const enabled = process.env.TCPDUMP_ENABLED === "true" && interfaces.length > 0;

  return {
    enabled,
    interfaces: enabled ? interfaces : [],
    filters: filtros.map(({ id, label }) => ({ id, label })),
    message: enabled
      ? ""
      : "Captura desativada. Configure tcpdump e uma interface autorizada no servidor.",
  };
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

  processoCaptura = processo;
  inicioCaptura = Date.now();
  totalPacotesCapturados = 0;
  lerSaidaTcpdump(processo);
  let inicializado = false;
  let mensagemErro = "";
  const pronto = new Promise<void>((resolve, reject) => {
    const temporizadorInicializacao = setTimeout(() => {
      reject(new TcpdumpError("tcpdump não confirmou o início da captura."));
    }, 5000);
    const confirmar = () => {
      if (inicializado) return;
      inicializado = true;
      clearTimeout(temporizadorInicializacao);
      resolve();
    };
    const falhar = (mensagem: string) => {
      if (inicializado) return;
      clearTimeout(temporizadorInicializacao);
      reject(new TcpdumpError(mensagem));
    };
    processo.once("spawn", () => {
      processo.stderr.on("data", (parte: Buffer) => {
        const mensagem = parte.toString("utf8").trim();
        if (!mensagem) return;
        console.error("tcpdump:", mensagem);
        mensagemErro = `${mensagemErro}\n${mensagem}`.slice(-2000);
        if (/\blistening on\b/i.test(mensagemErro)) {
          confirmar();
        } else if (
          /permission denied|don't have permission|no such device|device not found/i.test(
            mensagemErro,
          )
        ) {
          falhar(`Não foi possível capturar nesta interface: ${mensagem}`);
        }
      });
    });
    processo.once("error", (erro) => {
      if (inicializado) {
        console.error("Falha no processo tcpdump:", erro);
      } else {
        falhar(`Não foi possível iniciar tcpdump: ${erro.message}`);
      }
      finalizarCaptura(processo);
    });
    processo.once("close", (codigo, sinal) => {
      if (!inicializado) {
        falhar(
          mensagemErro ||
            `tcpdump encerrou durante a inicialização (código ${codigo ?? sinal ?? "desconhecido"}).`,
        );
      } else if (codigo !== 0 && sinal !== "SIGINT" && sinal !== "SIGTERM") {
        console.error(`tcpdump encerrou com código ${codigo ?? "desconhecido"}.`);
      }
      finalizarCaptura(processo);
    });
  });

  try {
    await pronto;
  } catch (erro) {
    processo.kill("SIGTERM");
    finalizarCaptura(processo);
    throw erro;
  }

  if (
    processo.exitCode !== null ||
    processo.signalCode !== null ||
    processoCaptura !== processo
  ) {
    finalizarCaptura(processo);
    throw new TcpdumpError("tcpdump encerrou antes de iniciar a captura.");
  }

  limparPacotesDemonstrativos();

  const expressaoVisivel = filtro.expressao ? ` ${filtro.expressao}` : "";
  const command = `tcpdump -n -l -tttt -i ${interfaceRede} -s 96${expressaoVisivel}`;

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
  const processarLinha = (linha: string) => {
    const pacote = converterLinhaTcpdump(linha);
    if (!pacote) return;
    try {
      criarPacote({ ...pacote, source: "capture" });
      totalPacotesCapturados += 1;
      if (totalPacotesCapturados >= limitePacotes) {
        void pararTcpdump();
      }
    } catch (erro) {
      console.error("Não foi possível salvar metadados do pacote:", erro);
      void pararTcpdump();
    }
  };

  processo.stdout.setEncoding("utf8");
  processo.stdout.on("data", (parte: string) => {
    buffer += parte;
    if (buffer.length > 8192 && !buffer.includes("\n")) buffer = "";
    const linhas = buffer.split(/\r?\n/);
    buffer = linhas.pop() || "";
    for (const linha of linhas) processarLinha(linha);
  });
  processo.stdout.on("end", () => {
    if (buffer.trim()) processarLinha(buffer.trim());
  });
}

export function converterLinhaTcpdump(linha: string): Omit<Packet, "id"> | null {
  const timestamp = linha.match(
    /^(?:\d{4}-\d{2}-\d{2}\s+)?(\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s+/,
  );
  if (!timestamp) return null;

  const dados = linha.slice(timestamp[0].length);
  const fracao = (timestamp[2] || "").slice(0, 3).padEnd(3, "0");
  const time = `${timestamp[1]}.${fracao}`;
  const tamanho = dados.match(/\blength\s+(\d+)/i);
  const size = `${Number(tamanho?.[1] || 0)} B`;

  if (/^ARP\b/i.test(dados)) {
    const quemPossui = dados.match(/\bwho-has\s+([^\s,]+)/i);
    const diz = dados.match(/\btell\s+([^\s,]+)/i);
    if (quemPossui && diz) {
      return {
        time,
        src: diz[1],
        dst: quemPossui[1],
        protocol: "ARP",
        info: dados.includes("Request") ? "Who has request" : "ARP packet",
        size,
      };
    }
  }

  const separadorOrigem = dados.indexOf(" > ");
  const cabecalho = separadorOrigem < 0
    ? ""
    : dados.slice(0, separadorOrigem).trim();
  const separadorDestino = separadorOrigem < 0
    ? -1
    : dados.indexOf(": ", separadorOrigem + 3);
  const enderecoOrigem = cabecalho.replace(/^(?:IP6?|ARP)\s+/, "");
  const destino = separadorOrigem < 0
    ? ""
    : dados.slice(
        separadorOrigem + 3,
        separadorDestino < 0 ? undefined : separadorDestino,
      ).trim();
  const src = enderecoOrigem || "-";
  const dst = destino || "-";
  const detalhes = separadorDestino < 0
    ? dados
    : dados.slice(separadorDestino + 2);

  const portaSrc = src.match(/\.([0-9]+)$/)?.[1];
  const portaDst = dst.match(/\.([0-9]+)$/)?.[1];
  const ehDNS =
    portaSrc === "53" ||
    portaDst === "53" ||
    /\b(?:A|AAAA|PTR|MX|TXT|NS|SRV)\?\b/i.test(detalhes);
  const protocoloCabecalho =
    cabecalho.match(/^[A-Za-z][\w.-]*/)?.[0] ||
    dados.split(/[\s,]+/, 1)[0] ||
    "UNKNOWN";
  const protocolo =
    ehDNS ? "DNS"
    : /\bFlags\s+\[/.test(detalhes) ? "TCP"
    : /\bUDP\b/i.test(detalhes) ? "UDP"
    : /\bICMP6?\b/i.test(detalhes) ? "ICMP"
    : /\bHTTP\b/i.test(detalhes) ? "HTTP"
    : /^IP6?\s/.test(cabecalho) ? (cabecalho.startsWith("IP6 ") ? "IPv6" : "IP")
    : protocoloCabecalho;
  const protocoloTransporte = detalhes.match(/^([A-Za-z][\w.-]*)/);
  const protocoloExibido = (protocolo === "IP" || protocolo === "IPv6") &&
      protocoloTransporte &&
      !/^(?:length|id|tos|ttl|proto)$/i.test(protocoloTransporte[1])
    ? protocoloTransporte[1]
    : protocolo;
  const flags = detalhes.match(/Flags\s+(\[[^\]]+\])/);

  return {
    time,
    src,
    dst,
    protocol: protocoloExibido,
    info: flags ? `TCP ${flags[1]}` : detalhes,
    size,
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
