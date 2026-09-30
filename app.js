import {
  atualizarCaptura as salvarCaptura,
  excluirRegistro as removerRegistro,
  listarCamadas,
  listarNos,
  listarPacotes,
  obterCaptura,
  obterResumo,
  salvarRegistro as persistirRegistro,
} from "./js/api.js";
import { limparErro, mostrarErro } from "./js/dom.js";
import { lerDadosFormulario, abrirFormulario } from "./js/formularios.js";
import {
  mostrarAlertas,
  mostrarCamadas,
  mostrarCaptura,
  mostrarNos,
  mostrarPacotes,
  mostrarResumo,
} from "./js/interface.js";

let pacotes = [];
let nos = [];
let captura = {};
let resumoCaptura = {};
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
  const protocolo = document.querySelector("#protocol-filter")?.value || "";
  pacotes = await listarPacotes(protocolo);
  mostrarPacotes(pacotes, acoesRegistro);
}

async function carregarNos() {
  nos = await listarNos();
  mostrarNos(nos, acoesRegistro);
  mostrarAlertas(nos);
}

async function carregarResumo() {
  resumoCaptura = await obterResumo();
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

document.querySelector("#add-packet")?.addEventListener("click", () => {
  recursoEditado = "packets";
  idEditado = null;
  abrirFormulario("packets");
});
document.querySelector("#add-node")?.addEventListener("click", () => {
  recursoEditado = "nodes";
  idEditado = null;
  abrirFormulario("nodes");
});
document
  .querySelector("#packet-search")
  ?.addEventListener("input", () => mostrarPacotes(pacotes, acoesRegistro));
document
  .querySelector("#packet-limit")
  ?.addEventListener("change", () => mostrarPacotes(pacotes, acoesRegistro));
document.querySelector("#protocol-filter")?.addEventListener("change", () =>
  carregarPacotes().catch(mostrarErro),
);
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

const filtroInicial = document.querySelector("#protocol-filter");
if (filtroInicial) {
  const protocoloInicial = new URLSearchParams(window.location.search).get("protocol");
  if ([...filtroInicial.options].some((opcao) => opcao.value === protocoloInicial)) {
    filtroInicial.value = protocoloInicial;
  }
}

carregarPagina();