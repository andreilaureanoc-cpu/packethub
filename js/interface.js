import { elemento, formatarNumero } from "./dom.js";

function adicionarCelula(linha, valor, classe = "") {
  const celula = elemento("td", classe, valor);
  linha.appendChild(celula);
  return celula;
}

function mostrarLinhaVazia(tabela, quantidadeColunas, mensagem, classe) {
  const linha = elemento("tr");
  const celula = elemento("td", classe, mensagem);
  celula.colSpan = quantidadeColunas;
  linha.appendChild(celula);
  tabela.replaceChildren(linha);
}

function textoDaInformacao(pacote) {
  if (typeof pacote.info === "string") return pacote.info;
  if (pacote.info && pacote.info.flags) {
    let texto = `[${pacote.info.flags.join(",")}]`;
    if (pacote.info.sequenceNumber) texto += ` Seq=${pacote.info.sequenceNumber}`;
    if (pacote.info.windowSize) texto += ` Win=${pacote.info.windowSize}`;
    if (pacote.info.payloadLength) texto += ` Len=${pacote.info.payloadLength}`;
    return texto;
  }
  if (pacote.info && pacote.info.queryType) {
    return `${pacote.info.queryType} ${pacote.info.recordType} ${pacote.info.domain}`;
  }
  return (pacote.info && pacote.info.summary) || "—";
}

function adicionarBotoesDeAcao(celula, recurso, registro, acoes) {
  const grupo = elemento("div", "d-flex gap-2 text-nowrap");
  const editar = elemento(
    "button",
    "btn btn-link btn-sm p-0 fw-semibold text-teal",
    "Editar",
  );
  editar.type = "button";
  editar.addEventListener("click", () => acoes.editar(recurso, registro));

  const excluir = elemento(
    "button",
    "btn btn-link btn-sm p-0 fw-semibold text-coral",
    "Excluir",
  );
  excluir.type = "button";
  excluir.addEventListener("click", () => acoes.excluir(recurso, registro.id));

  grupo.appendChild(editar);
  grupo.appendChild(excluir);
  celula.appendChild(grupo);
}

export function mostrarPacotes(pacotes, acoes) {
  const tabela = document.querySelector("#packets-body");
  const busca =
    document.querySelector("#packet-search")?.value.toLowerCase() || "";
  const limite = document.querySelector("#packet-limit")?.value || "all";

  let pacotesVisiveis = pacotes.filter((pacote) => {
    const texto = `${pacote.id} ${pacote.time} ${pacote.src} ${pacote.dst} ${pacote.protocol} ${textoDaInformacao(pacote)}`;
    return texto.toLowerCase().includes(busca);
  });
  const contador = document.querySelector("#packet-count");
  if (contador) {
    contador.textContent = `${pacotesVisiveis.length} ${pacotesVisiveis.length === 1 ? "pacote" : "pacotes"}`;
  }
  pacotesVisiveis.sort((primeiro, segundo) =>
    segundo.time.localeCompare(primeiro.time),
  );
  if (limite !== "all") {
    pacotesVisiveis = pacotesVisiveis.slice(0, Number(limite));
  }

  if (pacotesVisiveis.length === 0) {
    mostrarLinhaVazia(
      tabela,
      8,
      "Nenhum pacote encontrado.",
      "px-5 py-5 text-center text-subdued",
    );
    return;
  }

  const cores = {
    TCP: "bg-brand-green-pale text-teal",
    UDP: "bg-brand-amber-pale text-amber-brand",
    DNS: "bg-brand-blue-pale text-blue-brand",
    HTTP: "bg-brand-coral-pale text-coral",
  };

  tabela.replaceChildren();
  for (let indice = 0; indice < pacotesVisiveis.length; indice++) {
    const pacote = pacotesVisiveis[indice];
    const linha = elemento("tr", indice === 0 ? "bg-packet-highlight" : "");
    let idExibido = pacote.id;
    if (/^\d+$/.test(String(pacote.id))) {
      idExibido = formatarNumero.format(Number(pacote.id));
    }

    adicionarCelula(
      linha,
      idExibido,
      `px-5 py-4 fw-bold ${indice === 0 ? "text-coral" : "text-subdued"}`,
    );
    adicionarCelula(linha, pacote.time, "px-5 py-4 text-muted-brand");
    adicionarCelula(linha, pacote.src, "px-5 py-4");
    adicionarCelula(linha, pacote.dst, "px-5 py-4");

    const etiqueta = elemento(
      "b",
      `badge rounded-1 px-2 py-1 ${cores[pacote.protocol] || "bg-brand-soft text-muted-brand"}`,
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
    tabela.appendChild(linha);
  }
}

export function mostrarNos(nos, acoes) {
  const tabela = document.querySelector("#nodes-body");
  const contador = document.querySelector("#node-count");
  if (contador) {
    contador.textContent = `${nos.length} ${nos.length === 1 ? "host cadastrado" : "hosts cadastrados"}`;
  }

  if (!tabela) return;

  if (nos.length === 0) {
    mostrarLinhaVazia(
      tabela,
      7,
      "Nenhum nó cadastrado.",
      "px-3 py-4 text-center text-subdued",
    );
    return;
  }

  tabela.replaceChildren();
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
    adicionarBotoesDeAcao(
      adicionarCelula(linha, "", "px-3 py-3"),
      "nodes",
      no,
      acoes,
    );
    tabela.appendChild(linha);
  }
}

export function mostrarAlertas(nos) {
  const alertas = nos.filter((no) => no.status !== "Operacional");
  document.querySelectorAll("[data-alert-count]").forEach((contador) => {
    contador.textContent = alertas.length;
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

export function mostrarResumo(resumoCaptura) {
  const capturados = document.querySelector("#stat-captured");
  if (capturados) capturados.textContent = formatarNumero.format(resumoCaptura.captured);
  const taxa = document.querySelector("#stat-rate");
  if (taxa) taxa.textContent = formatarNumero.format(resumoCaptura.rate);
  const dados = document.querySelector("#stat-data");
  if (dados) dados.textContent = formatarNumero.format(resumoCaptura.dataMB);
  const descartados = document.querySelector("#stat-dropped");
  if (descartados) descartados.textContent = resumoCaptura.droppedPct;

  const camposRelatorio = {
    captured: formatarNumero.format(resumoCaptura.captured),
    rate: `${formatarNumero.format(resumoCaptura.rate)} pkt/s`,
    data: `${formatarNumero.format(resumoCaptura.dataMB)} MB`,
    dropped: resumoCaptura.droppedPct,
  };
  for (const [campo, valor] of Object.entries(camposRelatorio)) {
    const destino = document.querySelector(`[data-report="${campo}"]`);
    if (destino) destino.textContent = valor;
  }
  for (const protocolo of resumoCaptura.protocols) {
    const cartao = document.querySelector(
      `[data-protocol="${protocolo.name}"]`,
    );
    if (cartao) {
      cartao.querySelector("span").textContent = protocolo.percentage;
      cartao.querySelector("strong").textContent = formatarNumero.format(
        protocolo.total,
      );
      cartao.querySelector("p").textContent = protocolo.label;
      const barra = cartao.querySelector("[data-protocol-bar]");
      if (barra) barra.style.width = protocolo.percentage;
    }
  }
}

export function mostrarCaptura(captura) {
  const interfaceCaptura = document.querySelector("#capture-interface");
  if (interfaceCaptura) interfaceCaptura.textContent = captura.interface;
  const comandoCaptura = document.querySelector("#capture-command");
  if (comandoCaptura) comandoCaptura.textContent = captura.command;
  const duracaoCaptura = document.querySelector("#capture-duration");
  if (duracaoCaptura) duracaoCaptura.textContent = captura.duration;
  document.querySelectorAll("[data-capture-filter]").forEach((filtro) => {
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
    status.lastChild.textContent = captura.active
      ? "Captura em andamento"
      : "Captura pausada";
    status.classList.toggle("text-coral", captura.active);
    status.classList.toggle("text-subdued", !captura.active);
    status.querySelector("i").classList.toggle("bg-brand-coral", captura.active);
    status.querySelector("i").classList.toggle("bg-subdued", !captura.active);
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

export function mostrarCamadas(camadas) {
  for (const camada of camadas) {
    const linha = document.querySelector(`#layer-${camada.id}`);
    if (linha) {
      const protocolos = linha.querySelector("b") || linha;
      protocolos.textContent = camada.protocols.join("·");
    }
  }
}