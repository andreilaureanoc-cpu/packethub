import { elemento, formatarNumero } from "./dom.js";
import { resumirProtocolosDoHost } from "../models/hostTraffic.js";
import type { NodeRecord, PacketRecord } from "../models/types.js";
import type { RecordActions } from "./types.js";
import {
  adicionarBotoesDeAcao,
  adicionarCelula,
  atualizarTabela,
} from "./tableView.js";

export function mostrarNos(
  nos: NodeRecord[],
  pacotes: PacketRecord[],
  acoes: RecordActions,
) {
  const tabela = document.querySelector<HTMLTableSectionElement>("#nodes-body");
  const contador = document.querySelector("#node-count");
  if (contador) {
    contador.textContent = `${nos.length} ${nos.length === 1 ? "host cadastrado" : "hosts cadastrados"}`;
  }

  if (!tabela) return;

  const linhas = [];
  for (const no of nos) {
    const linha = elemento("tr");
    let corStatus = "text-coral";
    if (no.status === "Operacional") corStatus = "text-teal";
    if (no.status === "Atenção") corStatus = "text-amber-brand";

    adicionarCelula(linha, no.host, "px-3 py-3 fw-semibold");
    adicionarCelula(linha, no.ip, "px-3 py-3 font-monospace");
    adicionarCelula(linha, no.service, "px-3 py-3");
    adicionarCelula(linha, no.latency, "px-3 py-3");
    adicionarCelula(linha, no.load, "px-3 py-3");
    adicionarCelula(
      linha,
      `● ${no.status}`,
      `px-3 py-3 fw-bold ${corStatus}`,
    );
    const celulaProtocolos = adicionarCelula(linha, "", "px-3 py-3");
    const protocolos = resumirProtocolosDoHost(no, pacotes);
    if (protocolos.length === 0) {
      celulaProtocolos.textContent = "Nenhum tráfego capturado";
    } else {
      const listaProtocolos = elemento("div", "d-flex flex-wrap gap-1");
      for (const { protocol, count } of protocolos) {
        listaProtocolos.appendChild(
          elemento(
            "span",
            "badge rounded-1 px-2 py-1 tiny-text bg-brand-blue-pale text-blue-brand",
            `${protocol} · ${formatarNumero.format(count)}`,
          ),
        );
      }
      celulaProtocolos.appendChild(listaProtocolos);
    }
    adicionarBotoesDeAcao(
      adicionarCelula(linha, "", "px-3 py-3"),
      "nodes",
      no,
      acoes,
    );
    linhas.push(linha);
  }

  atualizarTabela(tabela, linhas, {
    pageLength: 10,
    lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "Todos"]],
    order: [[0, "asc"]],
    emptyTable: "Nenhum nó cadastrado.",
  });
}


export function mostrarResumoNos(nos: NodeRecord[]) {
  const contagens = {
    total: nos.length,
    operational: nos.filter((no) => no.status === "Operacional").length,
    attention: nos.filter((no) => no.status === "Atenção").length,
    unavailable: nos.filter((no) => no.status === "Indisponível").length,
  };

  for (const [estado, quantidade] of Object.entries(contagens)) {
    const destino = document.querySelector(`#report-nodes-${estado}`);
    if (destino) destino.textContent = formatarNumero.format(quantidade);
  }

  const alertas = nos.filter((no) => no.status !== "Operacional");
  const contadorAlertas = document.querySelector("#report-alert-count");
  if (contadorAlertas) {
    contadorAlertas.textContent = `${alertas.length} ${alertas.length === 1 ? "alerta ativo" : "alertas ativos"}`;
  }

  const listaAlertas = document.querySelector("#report-alerts-body");
  if (!listaAlertas) return;
  if (alertas.length === 0) {
    listaAlertas.replaceChildren(
      elemento("p", "mb-0 py-3 small-text text-muted-brand", "Nenhum alerta ativo."),
    );
    return;
  }

  listaAlertas.replaceChildren();
  for (const no of alertas) {
    const indisponivel = no.status === "Indisponível";
    const item = elemento(
      "article",
      "d-flex flex-column gap-1 border-bottom border-brand-line py-3 flex-sm-row justify-content-sm-between",
    );
    const titulo = elemento(
      "strong",
      indisponivel ? "text-coral" : "text-amber-brand",
      `${no.host} · ${no.status}`,
    );
    const detalhes = elemento(
      "span",
      "small-text text-muted-brand",
      `${no.ip} · ${no.service} · Carga ${no.load} · Latência ${no.latency}`,
    );
    item.append(titulo, detalhes);
    listaAlertas.appendChild(item);
  }
}
export function mostrarAlertas(nos: NodeRecord[]) {
  const alertas = nos.filter((no) => no.status !== "Operacional");
  document.querySelectorAll("[data-alert-count]").forEach((contador) => {
    contador.textContent = String(alertas.length);
    contador.classList.toggle("d-none", alertas.length === 0);
  });

  const resumo = document.querySelector("#alert-count");
  if (resumo) {
    resumo.textContent = `${alertas.length} ${alertas.length === 1 ? "host requer" : "hosts requerem"} atenção`;
  }

  const lista = document.querySelector("#alerts-body");
  if (!lista) return;
  if (alertas.length === 0) {
    lista.replaceChildren(
      elemento("p", "py-5 text-center small-text text-muted-brand", "Nenhum host requer atenção no momento."),
    );
    return;
  }

  lista.replaceChildren();
  for (const no of alertas) {
    const indisponivel = no.status === "Indisponível";
    const item = elemento(
      "article",
      "d-grid gap-3 border-bottom border-brand-line py-4 grid-cols-sm-alert align-items-sm-center",
    );
    const detalhes = elemento("div");
    const titulo = elemento(
      "p",
      "fs-6 fw-semibold mb-0",
      `${no.host} · ${no.status}`,
    );
    const descricao = elemento(
      "p",
      "mt-1 small-text text-muted-brand",
      `${no.ip} · ${no.service} Carga ${no.load} Latência ${no.latency}`,
    );
    const gravidade = elemento(
      "span",
      `d-inline-flex badge rounded-1 px-2 py-1 tiny-text fw-bold ${indisponivel ? "bg-brand-coral-pale text-coral" : "bg-brand-amber-pale text-amber-brand"}`,
      indisponivel ? "Indisponível" : "Atenção",
    );
    detalhes.append(titulo, descricao);
    item.append(detalhes, gravidade);
    lista.appendChild(item);
  }
}
