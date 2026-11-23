import { elemento, formatarNumero } from "./dom.js";
import type {
  Capture,
  CaptureOptions,
  NetworkLayer,
  PacketSummary,
} from "../models/types.js";
import { mostrarCartoesProtocolos } from "./protocolView.js";

export function mostrarResumo(resumoCaptura: PacketSummary) {
  const capturados = document.querySelector("#stat-captured");
  if (capturados) capturados.textContent = formatarNumero.format(resumoCaptura.captured);
  const taxa = document.querySelector("#stat-rate");
  if (taxa) taxa.textContent = formatarNumero.format(resumoCaptura.rate);
  const dados = document.querySelector("#stat-data");
  if (dados) dados.textContent = resumoCaptura.dataLabel;
  const descartados = document.querySelector("#stat-dropped");
  if (descartados) descartados.textContent = resumoCaptura.droppedPct || "N/D";

  const camposRelatorio = {
    captured: formatarNumero.format(resumoCaptura.captured),
    rate: `${formatarNumero.format(resumoCaptura.rate)} pkt/s`,
    data: resumoCaptura.dataLabel,
    dropped: resumoCaptura.droppedPct || "N/D",
  };
  for (const [campo, valor] of Object.entries(camposRelatorio)) {
    const destino = document.querySelector(`[data-report="${campo}"]`);
    if (destino) destino.textContent = valor;
  }
  const protocolos = resumoCaptura.protocols || [];
  mostrarCartoesProtocolos(protocolos);

  const tabelaProtocolosRelatorio = document.querySelector(
    "#report-protocols-body",
  );
  if (tabelaProtocolosRelatorio) {
    const linhas = protocolos.map((protocolo) => {
      const linha = elemento("tr");
      linha.append(
        elemento("td", "px-4 py-3 fw-bold", protocolo.name),
        elemento("td", "px-4 py-3", formatarNumero.format(protocolo.total)),
        elemento("td", "px-4 py-3", protocolo.percentage),
        elemento("td", "px-4 py-3 text-muted-brand", protocolo.label),
      );
      return linha;
    });
    tabelaProtocolosRelatorio.replaceChildren(...linhas);
  }
}

export function mostrarCaptura(captura: Capture) {
  const interfaceCaptura = document.querySelector("#capture-interface");
  if (interfaceCaptura) interfaceCaptura.textContent = captura.interface;
  const comandoCaptura = document.querySelector("#capture-command");
  if (comandoCaptura) comandoCaptura.textContent = captura.command;
  const duracaoCaptura = document.querySelector("#capture-duration");
  if (duracaoCaptura) duracaoCaptura.textContent = captura.duration;
  document.querySelectorAll<HTMLSelectElement>("[data-capture-filter]").forEach((filtro) => {
    filtro.value = captura.filter;
  });
  const camposRelatorio = {
    interface: captura.interface || "—",
    status: captura.active ? "Em andamento" : "Pausada",
    duration: captura.duration || "—",
  };
  for (const [campo, valor] of Object.entries(camposRelatorio)) {
    const destino = document.querySelector(`#report-${campo}`);
    if (destino) destino.textContent = valor;
  }

  const status = document.querySelector("#capture-status");
  if (status) {
    if (status.lastChild) status.lastChild.textContent = captura.active
      ? "Captura em andamento"
      : "Captura pausada";
    status.classList.toggle("text-coral", captura.active);
    status.classList.toggle("text-subdued", !captura.active);
    status.querySelector("i")?.classList.toggle("bg-brand-coral", captura.active);
    status.querySelector("i")?.classList.toggle("bg-subdued", !captura.active);
  }

  const botao = document.querySelector("#capture-toggle");
  if (botao) botao.textContent = captura.active ? "Parar captura" : "Retomar captura";

  const interfaceAgente = document.querySelector("#capture-agent-interface");
  if (interfaceAgente) interfaceAgente.textContent = `Interface ${captura.interface}`;
  const estadoAgente = document.querySelector("#capture-agent-state");
  if (estadoAgente) estadoAgente.textContent = captura.active ? "AO VIVO" : "PAUSADA";
  const indicadorAgente = document.querySelector("#capture-agent-indicator");
  if (indicadorAgente) {
    indicadorAgente.classList.toggle("bg-brand-mint", captura.active);
    indicadorAgente.classList.toggle("bg-brand-coral", !captura.active);
  }
}

export function mostrarOpcoesCaptura(
  opcoes: CaptureOptions,
  capturaAtiva: boolean,
): void {
  const interfaceSelect =
    document.querySelector<HTMLSelectElement>("#capture-interface-select");
  if (interfaceSelect) {
    const interfaceAtual = interfaceSelect.value;
    const opcoesInterface = opcoes.interfaces.map((interfaceRede) => {
      const opcao = elemento("option", "", interfaceRede);
      opcao.value = interfaceRede;
      return opcao;
    });
    interfaceSelect.replaceChildren(...opcoesInterface);
    if (opcoes.interfaces.includes(interfaceAtual)) {
      interfaceSelect.value = interfaceAtual;
    } else {
      interfaceSelect.value = opcoes.interfaces[0] || "";
    }
    interfaceSelect.disabled = !opcoes.enabled;
  }

  const filtroSelect =
    document.querySelector<HTMLSelectElement>("[data-capture-filter]");
  if (filtroSelect) {
    const filtroAtual = filtroSelect.value;
    const opcoesFiltro = opcoes.filters.map((filtro) => {
      const opcao = elemento("option", "", filtro.label);
      opcao.value = filtro.id;
      return opcao;
    });
    filtroSelect.replaceChildren(...opcoesFiltro);
    filtroSelect.value = opcoes.filters.some(
      (filtro) => filtro.id === filtroAtual,
    )
      ? filtroAtual
      : opcoes.filters[0]?.id || "";
    filtroSelect.disabled = !opcoes.enabled;
  }

  const botao = document.querySelector<HTMLButtonElement>("#capture-toggle");
  if (botao) botao.disabled = !opcoes.enabled && !capturaAtiva;

  const mensagem = document.querySelector("#capture-configuration");
  if (mensagem) {
    mensagem.textContent = opcoes.enabled
      ? "Captura limitada a metadados; os dados de payload não são exibidos nem armazenados."
      : opcoes.message;
  }
}

export function mostrarCamadas(camadas: NetworkLayer[]) {
  for (const camada of camadas) {
    const linha = document.querySelector(`#layer-${camada.id}`);
    if (linha) {
      const protocolos = linha.querySelector("b") || linha;
      protocolos.textContent = camada.protocols.join("·");
    }
  }
}