import { elemento, formatarNumero } from "./dom.js";

const instanciasTabela = new WeakMap();

const idiomaDataTables = {
  info: "Exibindo _START_ a _END_ de _TOTAL_ registros",
  infoEmpty: "Exibindo 0 registros",
  infoFiltered: "(filtrados de _MAX_ registros)",
  lengthMenu: "Exibir _MENU_ registros",
  loadingRecords: "Carregando...",
  processing: "Processando...",
  search: "Buscar:",
  searchPlaceholder: "Buscar registros",
  zeroRecords: "Nenhum registro correspondente encontrado.",
  paginate: {
    first: "Primeira",
    last: "Última",
    next: "Próxima",
    previous: "Anterior",
  },
};

function atualizarTabela(corpoTabela, linhas, configuracao) {
  const tabela = corpoTabela?.closest("table");
  if (!tabela) return;

  let instancia = instanciasTabela.get(tabela);
  if (!instancia) {
    instancia = new window.DataTable(tabela, {
      pageLength: configuracao.pageLength,
      lengthMenu: configuracao.lengthMenu,
      order: configuracao.order,
      columnDefs: [{ targets: -1, orderable: false, searchable: false }],
      language: {
        ...idiomaDataTables,
        emptyTable: configuracao.emptyTable,
      },
    });
    instanciasTabela.set(tabela, instancia);
  }

  instancia.clear().rows.add(linhas).draw();
}

function escaparCampoCSV(valor) {
  const texto = String(valor ?? "");
  const seguro = /^[\t\r ]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function baixarCSV(nomeArquivo, linhas) {
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
  const tabela = corpoTabela?.closest("table");
  const instancia = tabela && instanciasTabela.get(tabela);
  if (!tabela || !instancia) return;

  const cabecalhos = Array.from(tabela.tHead.rows[0].cells)
    .slice(0, -1)
    .map((celula) => celula.textContent.trim());
  const linhas = instancia
    .rows({ search: "applied", order: "applied" })
    .nodes()
    .toArray()
    .map((linha) =>
      Array.from(linha.cells)
        .slice(0, -1)
        .map((celula) => celula.textContent.trim()),
    );
  baixarCSV("pacotes.csv", [cabecalhos, ...linhas]);
}

function adicionarCelula(linha, valor, classe = "") {
  const celula = elemento("td", classe, valor);
  linha.appendChild(celula);
  return celula;
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

const estilosProtocolo = {
  TCP: { badge: "bg-brand-green-pale text-teal", barra: "bg-brand-teal" },
  UDP: { badge: "bg-brand-amber-pale text-amber-brand", barra: "bg-brand-gold" },
  DNS: { badge: "bg-brand-blue-pale text-blue-brand", barra: "bg-brand-blue" },
  HTTP: { badge: "bg-brand-coral-pale text-coral", barra: "bg-brand-coral" },
  ARP: { badge: "bg-brand-soft text-blue-brand", barra: "bg-brand-blue" },
  ICMP: { badge: "bg-brand-blue-pale text-blue-brand", barra: "bg-brand-teal" },
};

function obterEstiloProtocolo(protocolo) {
  return estilosProtocolo[protocolo] || {
    badge: "bg-brand-soft text-blue-brand",
    barra: "bg-brand-blue",
  };
}

function atualizarFiltroProtocolos(pacotes) {
  const filtro = document.querySelector("#protocol-filter");
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

export function filtrarPacotesPorProtocolo(protocolo) {
  const tabela = document.querySelector("#packets-body")?.closest("table");
  const instancia = tabela && instanciasTabela.get(tabela);
  if (!instancia) return;

  const expressao = protocolo
    ? `^${protocolo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
    : "";
  instancia.column(4).search(expressao, true, false).draw();
}

function criarCartaoResumoProtocolo(protocolo) {
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

function criarCartaoDetalhadoProtocolo(protocolo) {
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

function mostrarCartoesProtocolos(protocolos) {
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

export function mostrarPacotes(pacotes, acoes) {
  const tabela = document.querySelector("#packets-body");
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
  const botaoExportar = document.querySelector("#export-packets");
  if (botaoExportar) botaoExportar.disabled = false;
}

export function mostrarNos(nos, acoes) {
  const tabela = document.querySelector("#nodes-body");
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

export function mostrarResumoNos(nos) {
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