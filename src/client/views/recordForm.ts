import { elemento } from "./dom.js";
import type {
  NodeRecord,
  PacketRecord,
  Resource,
} from "../models/types.js";

type FormField = [
  keyof PacketRecord | keyof NodeRecord,
  string,
  "text" | "select",
  string[]?,
];

const campos: Record<Resource, FormField[]> = {
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

export function abrirFormulario(
  recurso: Resource,
  registro: PacketRecord | NodeRecord | null = null,
) {
  document.querySelector<HTMLElement>("#dialog-kicker")!.textContent =
    recurso === "packets" ? "Pacote" : "Nó monitorado";
  document.querySelector<HTMLElement>("#dialog-title")!.textContent = registro
    ? "Editar registro"
    : "Novo registro";
  document.querySelector<HTMLElement>("#dialog-submit")!.textContent = registro
    ? "Salvar alterações"
    : "Criar registro";

  const formulario = document.querySelector<HTMLElement>("#record-fields")!;
  formulario.replaceChildren();

  for (const [nome, rotulo, tipo, opcoes] of campos[recurso]) {
    const etiqueta = elemento(
      "label",
      "form-label tiny-text fw-semibold text-muted-brand",
      rotulo,
    );
    const entrada =
      tipo === "select"
        ? document.createElement("select")
        : document.createElement("input");
    entrada.id = `field-${nome}`;
    entrada.name = nome;
    entrada.required = true;
    entrada.className =
      tipo === "select"
        ? "form-select mt-1"
        : "form-control mt-1";

    const valorAtual =
      registro && nome in registro ? Reflect.get(registro, nome) : "";
    if (tipo === "select" && entrada instanceof HTMLSelectElement) {
      const valores = [...new Set([...(opcoes || []), valorAtual].filter(Boolean))];
      for (const opcao of valores) {
        const item = elemento("option", "", opcao);
        item.value = opcao;
        entrada.appendChild(item);
      }
      if (registro) entrada.value = String(valorAtual);
    } else {
      if (entrada instanceof HTMLInputElement) entrada.type = "text";
      if (registro) entrada.value = String(valorAtual || "");
    }

    etiqueta.appendChild(entrada);
    formulario.appendChild(etiqueta);
  }
  document.querySelector<HTMLDialogElement>("#record-dialog")!.showModal();
}

export function lerDadosFormulario(
  formulario: HTMLFormElement,
): Record<string, string> {
  const dados: Record<string, string> = {};
  for (const entrada of formulario.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    "[name]",
  )) {
    dados[entrada.name] = entrada.value;
  }
  return dados;
}