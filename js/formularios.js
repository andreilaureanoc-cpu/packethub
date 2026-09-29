import { elemento } from "./dom.js";

const campos = {
  packets: [
    ["time", "Tempo", "text"],
    ["src", "Origem", "text"],
    ["dst", "Destino", "text"],
    ["protocol", "Protocolo", "select", ["TCP", "UDP", "DNS", "HTTP"]],
    ["info", "Informação", "text"],
    ["size", "Tamanho", "text"],
  ],
  nodes: [
    ["host", "Host", "text"],
    ["ip", "IP", "text"],
    ["service", "Serviço", "text"],
    ["latency", "Latência", "text"],
    ["load", "Carga", "text"],
    ["status", "Status", "select", ["Operacional", "Atenção", "Indisponível"]],
  ],
};

export function abrirFormulario(recurso, registro = null) {
  document.querySelector("#dialog-kicker").textContent =
    recurso === "packets" ? "Pacote" : "Nó monitorado";
  document.querySelector("#dialog-title").textContent = registro
    ? "Editar registro"
    : "Novo registro";
  document.querySelector("#dialog-submit").textContent = registro
    ? "Salvar alterações"
    : "Criar registro";

  const formulario = document.querySelector("#record-fields");
  formulario.replaceChildren();

  for (const [nome, rotulo, tipo, opcoes] of campos[recurso]) {
    const etiqueta = elemento(
      "label",
      "text-xs font-semibold text-[#52635f]",
      rotulo,
    );
    const entrada = document.createElement(
      tipo === "select" ? "select" : "input",
    );
    entrada.id = `field-${nome}`;
    entrada.name = nome;
    entrada.required = true;
    entrada.className =
      tipo === "select"
        ? "mt-1 w-full rounded-lg border border-[#d3e1db] bg-white px-3 py-2.5 text-sm"
        : "mt-1 w-full rounded-lg border border-[#d3e1db] px-3 py-2.5 text-sm outline-none focus:border-[#137f78]";

    if (tipo === "select") {
      for (const opcao of opcoes) {
        const item = elemento("option", "", opcao);
        item.value = opcao;
        entrada.appendChild(item);
      }
      if (registro) entrada.value = registro[nome];
    } else {
      entrada.type = "text";
      if (registro) entrada.value = registro[nome] || "";
    }

    etiqueta.appendChild(entrada);
    formulario.appendChild(etiqueta);
  }
  document.querySelector("#record-dialog").showModal();
}

export function lerDadosFormulario(formulario) {
  const dados = {};
  for (const entrada of formulario.querySelectorAll("[name]")) {
    dados[entrada.name] = entrada.value;
  }
  return dados;
}