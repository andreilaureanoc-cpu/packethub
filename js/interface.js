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
    let texto = `[${pacote.info.flags.join(", ")}]`;
    if (pacote.info.sequenceNumber)
      texto += ` Seq=${pacote.info.sequenceNumber}`;
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
  const grupo = elemento("div", "flex gap-2 font-sans whitespace-nowrap");
  const editar = elemento(
    "button",
    "font-semibold text-teal hover:underline",
    "Editar",
  );
  editar.type = "button";
  editar.addEventListener("click", () => acoes.editar(recurso, registro));

  const excluir = elemento(
    "button",
    "font-semibold text-signal hover:underline",
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
      "px-5 py-8 text-center font-sans text-[#78918b]",
    );
    return;
  }

  const cores = {
    TCP: "bg-[#e7f6ee] text-teal",
    UDP: "bg-[#fff3da] text-[#a26900]",
    DNS: "bg-[#eef3ff] text-[#526fa6]",
    HTTP: "bg-[#fff0ed] text-signal",
  };

  tabela.replaceChildren();
  for (let indice = 0; indice < pacotesVisiveis.length; indice++) {
    const pacote = pacotesVisiveis[indice];
    const linha = elemento("tr", indice === 0 ? "bg-[#fffaf8]" : "");
    let idExibido = pacote.id;
    if (/^\d+$/.test(String(pacote.id))) {
      idExibido = formatarNumero.format(Number(pacote.id));
    }

    adicionarCelula(
      linha,
      idExibido,
      `px-5 py-4 font-bold ${indice === 0 ? "text-signal" : "text-[#78918b]"}`,
    );
    adicionarCelula(linha, pacote.time, "px-5 py-4 text-[#66817a]");
    adicionarCelula(linha, pacote.src, "px-5 py-4");
    adicionarCelula(linha, pacote.dst, "px-5 py-4");

    const etiqueta = elemento(
      "b",
      `rounded px-2 py-1 font-sans ${cores[pacote.protocol] || "bg-[#eef6f1] text-[#66817a]"}`,
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
      "px-3 py-8 text-center text-[#78918b]",
    );
    return;
  }

  tabela.replaceChildren();
  for (const no of nos) {
    const linha = elemento("tr");
    let corStatus = "signal";
    if (no.status === "Operacional") corStatus = "teal";
    if (no.status === "Atenção") corStatus = "[#b27608]";

    adicionarCelula(linha, no.host, "px-3 py-3 font-semibold");
    adicionarCelula(linha, no.ip, "px-3 py-3 font-mono");
    adicionarCelula(linha, no.service, "px-3 py-3");
    adicionarCelula(linha, no.latency, "px-3 py-3");
    adicionarCelula(linha, no.load, "px-3 py-3");
    adicionarCelula(
      linha,
      `● ${no.status}`,
      `px-3 py-3 font-bold text-${corStatus}`,
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
    contador.classList.toggle("hidden", alertas.length === 0);
  });

  const resumo = document.querySelector("#alert-count");
  if (resumo) {
    resumo.textContent = `${alertas.length} ${alertas.length === 1 ? "host requer" : "hosts requerem"} atenção`;
  }

  const lista = document.querySelector("#alerts-body");
  if (!lista) return;
  if (alertas.length === 0) {
    lista.replaceChildren(
      elemento("p", "py-12 text-center text-sm text-[#66817a]", "Nenhum host requer atenção no momento."),
    );
    return;
  }

  lista.replaceChildren();
  for (const no of alertas) {
    const indisponivel = no.status === "Indisponível";
    const item = elemento(
      "article",
      "grid gap-3 border-b border-[#e5eee9] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
    );
    const detalhes = elemento("div");
    const titulo = elemento(
      "h3",
      "font-semibold",
      `${no.host} · ${no.status}`,
    );
    const descricao = elemento(
      "p",
      "mt-1 text-sm text-[#66817a]",
      `${no.ip} · ${no.service} · Carga ${no.load} · Latência ${no.latency}`,
    );
    const gravidade = elemento(
      "span",
      `inline-flex rounded px-2.5 py-1 text-xs font-bold ${indisponivel ? "bg-[#fff0ed] text-signal" : "bg-[#fff3da] text-[#a26900]"}`,
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
  const filtroCaptura = document.querySelector("#capture-filter");
  if (filtroCaptura) filtroCaptura.value = captura.filter;
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
      ? " Captura em andamento"
      : " Captura pausada";
    status.classList.toggle("text-signal", captura.active);
    status.classList.toggle("text-[#78918b]", !captura.active);
    status.querySelector("i").classList.toggle("bg-signal", captura.active);
    status.querySelector("i").classList.toggle("bg-[#78918b]", !captura.active);
  }

  const botao = document.querySelector("#capture-toggle");
  if (botao) botao.textContent = captura.active ? "Parar captura" : "Retomar captura";

  const interfaceAgente = document.querySelector("#capture-agent-interface");
  if (interfaceAgente) interfaceAgente.textContent = `Interface ${captura.interface}`;
  const estadoAgente = document.querySelector("#capture-agent-state");
  if (estadoAgente) estadoAgente.textContent = captura.active ? "AO VIVO" : "PAUSADA";
  const indicadorAgente = document.querySelector("#capture-agent-indicator");
  if (indicadorAgente) {
    indicadorAgente.classList.toggle("bg-[#7ed8bb]", captura.active);
    indicadorAgente.classList.toggle("bg-[#f06449]", !captura.active);
  }
}

export function mostrarCamadas(camadas) {
  for (const camada of camadas) {
    const linha = document.querySelector(`#layer-${camada.id}`);
    if (linha) {
      const protocolos = linha.querySelector("b") || linha;
      protocolos.textContent = camada.protocols.join(" · ");
    }
  }
}