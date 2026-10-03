import {
  atualizarCaptura as salvarCaptura,
  excluirRegistro as removerRegistro,
  listarCamadas,
  listarNos,
  listarPacotes,
  obterCaptura,
  salvarRegistro as persistirRegistro,
} from "./js/api.js";
import { calcularResumoPacotes } from "./js/estatisticas.js";
import { limparErro, mostrarErro } from "./js/dom.js";
import { lerDadosFormulario, abrirFormulario } from "./js/formularios.js";
import {
  mostrarAlertas,
  mostrarCamadas,
  mostrarCaptura,
  mostrarNos,
  mostrarPacotes,
  mostrarResumoNos,
  mostrarResumo,
  exportarPacotesCSV,
  filtrarPacotesPorProtocolo,
} from "./js/interface.js";

let pacotes = [];
let nos = [];
let captura = {};
let resumoCaptura = {};
const protocoloInicial = new URLSearchParams(window.location.search).get("protocol") || "";
let protocoloInicialAplicado = false;
let recursoEditado = "";
let idEditado = null;

const acoesRegistro = {
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
  const filtro = document.querySelector("#protocol-filter");
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
  captura = await obterCaptura();
  mostrarCaptura(captura);
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

async function salvarRegistro(evento) {
  evento.preventDefault();
  limparErro();

  try {
    await persistirRegistro(
      recursoEditado,
      idEditado,
      lerDadosFormulario(evento.currentTarget),
    );
    document.querySelector("#record-dialog").close();

    if (recursoEditado === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function excluirRegistro(recurso, id) {
  if (!confirm(`Excluir o registro ${id}?`)) return;
  limparErro();

  try {
    await removerRegistro(recurso, id);
    if (recurso === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function atualizarCaptura(alteracoes) {
  limparErro();
  try {
    captura = await salvarCaptura(alteracoes);
    await carregarCaptura();
  } catch (erro) {
    mostrarErro(erro);
  }
}

document.querySelector("#add-node")?.addEventListener("click", () => {
  recursoEditado = "nodes";
  idEditado = null;
  abrirFormulario("nodes");
});
document.querySelector("#protocol-filter")?.addEventListener("change", (evento) =>
  filtrarPacotesPorProtocolo(evento.currentTarget.value),
);
document.querySelector("#export-packets")?.addEventListener("click", () => {
  try {
    exportarPacotesCSV();
  } catch (erro) {
    mostrarErro(erro);
  }
});
document.querySelector("#dialog-close")?.addEventListener("click", () =>
  document.querySelector("#record-dialog").close(),
);
document.querySelector("#dialog-cancel")?.addEventListener("click", () =>
  document.querySelector("#record-dialog").close(),
);
document.querySelector("#record-form")?.addEventListener("submit", salvarRegistro);
document.querySelector("#capture-toggle")?.addEventListener("click", () =>
  atualizarCaptura({ active: !captura.active }),
);
document.querySelectorAll("[data-capture-filter]").forEach((filtro) => {
  filtro.addEventListener("change", (evento) =>
    atualizarCaptura({ filter: evento.currentTarget.value }),
  );
});

carregarPagina();