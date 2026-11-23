import {
  excluirPacote,
  listarPacotes,
  salvarPacote,
} from "../models/packetModel.js";
import {
  excluirNo,
  listarNos,
  salvarNo,
} from "../models/nodeModel.js";
import {
  listarCamadas,
  iniciarCaptura,
  obterCaptura,
  obterOpcoesCaptura,
  pararCaptura,
} from "../models/networkModel.js";
import {
  encerrarSessao,
  obterUsuario,
} from "../models/authModel.js";
import { tokenSessionKey } from "../models/apiClient.js";
import { calcularResumoPacotes } from "../models/packetStatistics.js";
import { limparErro, mostrarErro } from "../views/dom.js";
import {
  lerDadosFormulario,
  abrirFormulario,
} from "../views/recordForm.js";
import {
  filtrarPacotesPorProtocolo,
  exportarPacotesCSV,
  mostrarPacotes,
} from "../views/packetView.js";
import {
  mostrarAlertas,
  mostrarNos,
  mostrarResumoNos,
} from "../views/nodeView.js";
import {
  mostrarCamadas,
  mostrarCaptura,
  mostrarOpcoesCaptura,
  mostrarResumo,
} from "../views/dashboardView.js";
import type {
  Capture,
  NodeRecord,
  PacketSummary,
  PacketRecord,
  Resource,
} from "../models/types.js";
import type { RecordActions } from "../views/types.js";

let pacotes: PacketRecord[] = [];
let nos: NodeRecord[] = [];
let captura: Capture = {
  interface: "",
  command: "",
  duration: "",
  filter: "",
  active: false,
};
let resumoCaptura: PacketSummary | null = null;
const protocoloInicial = new URLSearchParams(window.location.search).get("protocol") || "";
let protocoloInicialAplicado = false;
let recursoEditado: Resource = "nodes";
let idEditado: string | null = null;
let temporizadorCaptura: number | null = null;
let atualizacaoCapturaEmAndamento = false;

const acoesRegistro: RecordActions = {
  editar(recurso, registro) {
    recursoEditado = recurso;
    idEditado = registro.id;
    abrirFormulario(recurso, registro);
  },
  excluir: excluirRegistro,
};

async function carregarPacotes() {
  pacotes = await listarPacotes();
  mostrarPacotes(pacotes, acoesRegistro);
  const filtro = document.querySelector<HTMLSelectElement>("#protocol-filter");
  if (!protocoloInicialAplicado && filtro) {
    if ([...filtro.options].some((opcao) => opcao.value === protocoloInicial)) {
      filtro.value = protocoloInicial;
      filtrarPacotesPorProtocolo(protocoloInicial);
    }
    protocoloInicialAplicado = true;
  }
}

async function carregarNos() {
  nos = await listarNos();
  mostrarNos(nos, acoesRegistro);
  mostrarAlertas(nos);
  mostrarResumoNos(nos);
}

async function carregarResumo() {
  resumoCaptura = calcularResumoPacotes(await listarPacotes());
  mostrarResumo(resumoCaptura);
}

async function carregarCaptura() {
  const possuiControles = Boolean(document.querySelector("#capture-toggle"));
  const opcoes = possuiControles ? await obterOpcoesCaptura() : null;
  captura = await obterCaptura();
  mostrarCaptura(captura);
  if (opcoes) mostrarOpcoesCaptura(opcoes, captura.active);
  if (captura.active) monitorarCaptura();
}

async function carregarCamadas() {
  mostrarCamadas(await listarCamadas());
}

async function carregarPagina() {
  limparErro();
  try {
    if (document.querySelector("#packets-body")) await carregarPacotes();
    if (
      document.querySelector("#nodes-body") ||
      document.querySelector("#alerts-body") ||
      document.querySelector("[data-alert-count]")
    ) {
      await carregarNos();
    }
    if (
      document.querySelector("#stat-captured") ||
      document.querySelector("#protocols") ||
      document.querySelector("#protocol-cards") ||
      document.querySelector("[data-protocol]") ||
      document.querySelector("[data-report]")
    ) {
      await carregarResumo();
    }
    if (
      document.querySelector("#capture-interface") ||
      document.querySelector("#capture-agent-interface")
    ) {
      await carregarCaptura();
    }
    if (document.querySelector("#layer-application")) await carregarCamadas();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function salvarRegistro(evento: Event) {
  evento.preventDefault();
  limparErro();

  try {
    const formulario = evento.currentTarget;
    if (!(formulario instanceof HTMLFormElement)) return;
    const dados = lerDadosFormulario(formulario);
    if (recursoEditado === "packets") {
      await salvarPacote(idEditado, dados);
    } else {
      await salvarNo(idEditado, dados);
    }
    document.querySelector<HTMLDialogElement>("#record-dialog")?.close();

    if (recursoEditado === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function excluirRegistro(recurso: Resource, id: string) {
  if (!confirm(`Excluir o registro ${id}?`)) return;
  limparErro();

  try {
    if (recurso === "packets") await excluirPacote(id);
    else await excluirNo(id);
    if (recurso === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function alternarCaptura() {
  limparErro();
  try {
    if (captura.active) {
      captura = await pararCaptura();
    } else {
      const interfaceSelect =
        document.querySelector<HTMLSelectElement>("#capture-interface-select");
      const filtroSelect =
        document.querySelector<HTMLSelectElement>("[data-capture-filter]");
      if (!interfaceSelect?.value || !filtroSelect?.value) {
        throw new Error("Selecione uma interface e um filtro autorizados.");
      }
      captura = await iniciarCaptura(
        interfaceSelect.value,
        filtroSelect.value,
      );
    }
    await carregarCaptura();
  } catch (erro) {
    mostrarErro(erro);
  }
}

function monitorarCaptura() {
  if (temporizadorCaptura !== null) return;
  temporizadorCaptura = window.setInterval(async () => {
    if (atualizacaoCapturaEmAndamento) return;
    atualizacaoCapturaEmAndamento = true;
    try {
      captura = await obterCaptura();
      mostrarCaptura(captura);
      if (!captura.active) {
        window.clearInterval(temporizadorCaptura!);
        temporizadorCaptura = null;
        return;
      }
      if (document.querySelector("#packets-body")) await carregarPacotes();
      if (
        document.querySelector("#stat-captured") ||
        document.querySelector("#protocols") ||
        document.querySelector("#protocol-cards") ||
        document.querySelector("[data-report]")
      ) {
        await carregarResumo();
      }
    } catch (erro) {
      mostrarErro(erro);
      if (temporizadorCaptura !== null) {
        window.clearInterval(temporizadorCaptura);
        temporizadorCaptura = null;
      }
    } finally {
      atualizacaoCapturaEmAndamento = false;
    }
  }, 2000);
}

function mostrarSessao(email: string): void {
  const principal = document.querySelector("main");
  if (!principal) return;

  const controles = document.createElement("div");
  controles.className = "mb-3 d-flex align-items-center justify-content-end gap-3";
  const usuario = document.createElement("span");
  usuario.className = "nano-text text-subdued";
  usuario.textContent = email;
  const sair = document.createElement("button");
  sair.className = "btn btn-outline-secondary btn-sm";
  sair.type = "button";
  sair.textContent = "Sair";
  sair.addEventListener("click", async () => {
    sair.disabled = true;
    try {
      await encerrarSessao();
    } catch (erro) {
      mostrarErro(erro);
    } finally {
      window.location.replace("/login.html");
    }
  });
  controles.append(usuario, sair);
  principal.prepend(controles);
}

async function iniciarAplicacao(): Promise<void> {
  if (!sessionStorage.getItem(tokenSessionKey)) {
    window.location.replace(
      `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`,
    );
    return;
  }
  try {
    const sessao = await obterUsuario();
    mostrarSessao(sessao.user.email);
    await carregarPagina();
  } catch (erro) {
    mostrarErro(erro);
  }
}

document.querySelector("#add-node")?.addEventListener("click", () => {
  recursoEditado = "nodes";
  idEditado = null;
  abrirFormulario("nodes");
});
document.querySelector<HTMLSelectElement>("#protocol-filter")?.addEventListener(
  "change",
  (evento) => {
    if (evento.currentTarget instanceof HTMLSelectElement) {
      filtrarPacotesPorProtocolo(evento.currentTarget.value);
    }
  },
);
document.querySelector("#export-packets")?.addEventListener("click", () => {
  try {
    exportarPacotesCSV();
  } catch (erro) {
    mostrarErro(erro);
  }
});
document.querySelector("#dialog-close")?.addEventListener("click", () =>
  document.querySelector<HTMLDialogElement>("#record-dialog")?.close(),
);
document.querySelector("#dialog-cancel")?.addEventListener("click", () =>
  document.querySelector<HTMLDialogElement>("#record-dialog")?.close(),
);
document.querySelector("#record-form")?.addEventListener("submit", salvarRegistro);
document
  .querySelector("#capture-toggle")
  ?.addEventListener("click", alternarCaptura);

void iniciarAplicacao();