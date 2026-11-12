import { elemento, formatarNumero } from "./dom.js";
import { obterEstiloProtocolo } from "./protocolView.js";
import type { NodeRecord, PacketRecord } from "../models/types.js";
import type { RecordActions } from "./types.js";
import {
  adicionarBotoesDeAcao,
  adicionarCelula,
  atualizarTabela,
  obterInstanciaTabela,
} from "./tableView.js";

function escaparCampoCSV(valor: unknown): string {
  const texto = String(valor ?? "");
  const seguro = /^[\t\r ]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const conteudo = linhas
    .map((linha) => linha.map(escaparCampoCSV).join(","))
    .join("\r\n");
  const arquivo = new Blob(["\uFEFF", conteudo], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarPacotesCSV() {
  const corpoTabela = document.querySelector("#packets-body");
  const tabela = corpoTabela?.closest("table") as HTMLTableElement | null;
  const instancia = tabela && obterInstanciaTabela(tabela);
  if (!tabela || !instancia) return;

  const cabecalhos = Array.from(tabela.tHead?.rows[0]?.cells || [])
    .slice(0, -1)
    .map((celula) => celula.textContent?.trim() || "");
  const linhas = instancia
    .rows({ search: "applied", order: "applied" })
    .nodes()
    .toArray()
    .map((linha) =>
      Array.from(linha.cells)
        .slice(0, -1)
        .map((celula) => celula.textContent?.trim() || ""),
    );
  baixarCSV("pacotes.csv", [cabecalhos, ...linhas]);
}

function textoDaInformacao(pacote: PacketRecord): string {
  if (typeof pacote.info === "string") return pacote.info;
  const info = pacote.info;
  if ("flags" in info && Array.isArray(info.flags)) {
    let texto = `[${info.flags.join(",")}]`;
    if (info.sequenceNumber) texto += ` Seq=${info.sequenceNumber}`;
    if (info.windowSize) texto += ` Win=${info.windowSize}`;
    if (info.payloadLength) texto += ` Len=${info.payloadLength}`;
    return texto;
  }
  if ("queryType" in info) {
    return `${info.queryType} ${info.recordType} ${info.domain}`;
  }
  return "summary" in info && typeof info.summary === "string"
    ? info.summary
    : "—";
}

function atualizarFiltroProtocolos(pacotes: PacketRecord[]) {
  const filtro = document.querySelector<HTMLSelectElement>("#protocol-filter");
  if (!filtro) return;

  const selecionado = filtro.value;
  const protocolos = [
    ...new Set(
      pacotes
        .map((pacote) => String(pacote.protocol || "").trim())
        .filter(Boolean),
    ),
  ].sort((primeiro, segundo) => primeiro.localeCompare(segundo));
  const opcoes = [elemento("option", "", "Todos os protocolos")];
  opcoes[0].value = "";
  for (const protocolo of protocolos) {
    const opcao = elemento("option", "", protocolo);
    opcao.value = protocolo;
    opcoes.push(opcao);
  }
  filtro.replaceChildren(...opcoes);
  filtro.value = protocolos.includes(selecionado) ? selecionado : "";
}

export function filtrarPacotesPorProtocolo(protocolo: string) {
  const tabela = document.querySelector("#packets-body")?.closest("table") as
    | HTMLTableElement
    | undefined;
  const instancia = tabela && obterInstanciaTabela(tabela);
  if (!instancia) return;

  const expressao = protocolo
    ? `^${protocolo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
    : "";
  instancia.column(4).search(expressao, true, false).draw();
}

export function mostrarPacotes(pacotes: PacketRecord[], acoes: RecordActions) {
  const tabela = document.querySelector<HTMLTableSectionElement>("#packets-body");
  const linhas = [];
  atualizarFiltroProtocolos(pacotes);

  for (const pacote of pacotes) {
    const linha = elemento("tr");
    let idExibido = pacote.id;
    if (/^\d+$/.test(String(pacote.id))) {
      idExibido = formatarNumero.format(Number(pacote.id));
    }

    adicionarCelula(
      linha,
      idExibido,
      "px-5 py-4 fw-bold text-subdued",
    );
    adicionarCelula(linha, pacote.time, "px-5 py-4 text-muted-brand");
    adicionarCelula(linha, pacote.src, "px-5 py-4");
    adicionarCelula(linha, pacote.dst, "px-5 py-4");

    const etiqueta = elemento(
      "b",
      `badge rounded-1 px-2 py-1 ${obterEstiloProtocolo(pacote.protocol).badge}`,
      pacote.protocol,
    );
    adicionarCelula(linha, "", "px-5 py-4").appendChild(etiqueta);
    adicionarCelula(linha, textoDaInformacao(pacote), "px-5 py-4");
    adicionarCelula(linha, pacote.size, "px-5 py-4");
    adicionarBotoesDeAcao(
      adicionarCelula(linha, "", "px-5 py-4"),
      "packets",
      pacote,
      acoes,
    );
    linhas.push(linha);
  }

  atualizarTabela(tabela, linhas, {
    pageLength: 5,
    lengthMenu: [[5, 50, 100, -1], [5, 50, 100, "Todos"]],
    order: [[1, "desc"]],
    emptyTable: "Nenhum pacote encontrado.",
  });
  const botaoExportar = document.querySelector<HTMLButtonElement>("#export-packets");
  if (botaoExportar) botaoExportar.disabled = false;
}
