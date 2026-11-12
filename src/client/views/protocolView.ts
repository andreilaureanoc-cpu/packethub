import { elemento, formatarNumero } from "./dom.js";
import type { ProtocolSummary } from "../models/types.js";

const estilosProtocolo: Record<string, { badge: string; barra: string }> = {
  TCP: { badge: "bg-brand-green-pale text-teal", barra: "bg-brand-teal" },
  UDP: { badge: "bg-brand-amber-pale text-amber-brand", barra: "bg-brand-gold" },
  DNS: { badge: "bg-brand-blue-pale text-blue-brand", barra: "bg-brand-blue" },
  HTTP: { badge: "bg-brand-coral-pale text-coral", barra: "bg-brand-coral" },
  ARP: { badge: "bg-brand-soft text-blue-brand", barra: "bg-brand-blue" },
  ICMP: { badge: "bg-brand-blue-pale text-blue-brand", barra: "bg-brand-teal" },
};

export function obterEstiloProtocolo(protocolo: string) {
  return estilosProtocolo[protocolo] || {
    badge: "bg-brand-soft text-blue-brand",
    barra: "bg-brand-blue",
  };
}

function criarCartaoResumoProtocolo(protocolo: ProtocolSummary) {
  const estilo = obterEstiloProtocolo(protocolo.name);
  const cartao = elemento(
    "a",
    "d-block rounded-3 border border-brand bg-white p-4 hover-brand",
  );
  cartao.href = "protocols.html";

  const cabecalho = elemento("div", "mb-3 d-flex justify-content-between");
  cabecalho.append(
    elemento("b", `rounded-1 px-2 py-1 tiny-text ${estilo.badge}`, protocolo.name),
    elemento("span", "tiny-text text-subdued", protocolo.percentage),
  );
  cartao.append(
    cabecalho,
    elemento("strong", "font-display fs-3", formatarNumero.format(protocolo.total)),
    elemento("p", "mt-1 tiny-text text-subdued", protocolo.label),
  );
  return cartao;
}

function criarCartaoDetalhadoProtocolo(protocolo: ProtocolSummary) {
  const estilo = obterEstiloProtocolo(protocolo.name);
  const cartao = elemento("article", "rounded-3 border border-brand bg-white p-5");
  const cabecalho = elemento("div", "mb-4 d-flex align-items-center justify-content-between");
  cabecalho.append(
    elemento("b", `rounded-1 px-2 py-1 tiny-text ${estilo.badge}`, protocolo.name),
    elemento("span", "tiny-text text-subdued", protocolo.percentage),
  );

  const barra = elemento("div", `progress-bar ${estilo.barra}`);
  barra.style.width = protocolo.percentage;
  const trilho = elemento("div", "progress mt-4");
  trilho.setAttribute("role", "progressbar");
  trilho.setAttribute("aria-label", `Distribuição ${protocolo.name}`);
  trilho.setAttribute("aria-valuenow", String(Number.parseFloat(protocolo.percentage) || 0));
  trilho.setAttribute("aria-valuemin", "0");
  trilho.setAttribute("aria-valuemax", "100");
  trilho.appendChild(barra);

  const linkPacotes = elemento(
    "a",
    "mt-4 d-inline-block tiny-text fw-bold text-teal link-underline",
    `Ver pacotes ${protocolo.name} →`,
  );
  linkPacotes.href = `packets.html?protocol=${encodeURIComponent(protocolo.name)}`;
  cartao.append(
    cabecalho,
    elemento("strong", "font-display fs-2", formatarNumero.format(protocolo.total)),
    elemento("p", "mt-1 small-text text-subdued", protocolo.label),
    trilho,
    linkPacotes,
  );
  return cartao;
}

export function mostrarCartoesProtocolos(protocolos: ProtocolSummary[]) {
  const cartoesInicio = document.querySelector("#protocols");
  if (cartoesInicio) {
    cartoesInicio.replaceChildren(...protocolos.map(criarCartaoResumoProtocolo));
  }

  const cartoesDetalhados = document.querySelector("#protocol-cards");
  if (cartoesDetalhados) {
    cartoesDetalhados.replaceChildren(
      ...protocolos.map(criarCartaoDetalhadoProtocolo),
    );
  }
}
