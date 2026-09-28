// Endereço do JSON Server.
const api = "http://localhost:3000";
const formatarNumero = new Intl.NumberFormat("en-US");

// Dados que a página recebe do servidor.
let pacotes = [];
let nos = [];
let captura = {};
let resumoCaptura = {};
let recursoEditado = "";
let idEditado = null;

function elemento(tag, classe = "", texto = "") {
  const novoElemento = document.createElement(tag);
  novoElemento.className = classe;
  novoElemento.textContent = texto ?? "";
  return novoElemento;
}

function mostrarErro(erro) {
  const aviso = document.querySelector("#api-feedback");
  aviso.textContent = `Não foi possível concluir a operação: ${erro.message}`;
  aviso.classList.remove("hidden");
}

function limparErro() {
  const aviso = document.querySelector("#api-feedback");
  aviso.textContent = "";
  aviso.classList.add("hidden");
}

// Lê a resposta e interrompe o fluxo se o status HTTP indicar erro.
async function lerResposta(resposta) {
  const texto = await resposta.text();
  let dados = texto;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    if (resposta.ok)
      throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!resposta.ok) {
    let mensagem = dados;
    if (dados && typeof dados === "object") {
      mensagem = dados.message || dados.error;
    }
    throw new Error(
      `${mensagem || "Falha na requisição"} (HTTP ${resposta.status})`,
    );
  }
  return dados;
}

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

function adicionarBotoesDeAcao(celula, recurso, registro) {
  const grupo = elemento("div", "flex gap-2 font-sans whitespace-nowrap");
  const editar = elemento(
    "button",
    "font-semibold text-teal hover:underline",
    "Editar",
  );
  editar.type = "button";
  editar.addEventListener("click", () => abrirFormulario(recurso, registro));

  const excluir = elemento(
    "button",
    "font-semibold text-signal hover:underline",
    "Excluir",
  );
  excluir.type = "button";
  excluir.addEventListener("click", () =>
    excluirRegistro(recurso, registro.id),
  );

  grupo.appendChild(editar);
  grupo.appendChild(excluir);
  celula.appendChild(grupo);
}

function mostrarPacotes() {
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
    );
    tabela.appendChild(linha);
  }
}

function mostrarNos() {
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
    adicionarBotoesDeAcao(adicionarCelula(linha, "", "px-3 py-3"), "nodes", no);
    tabela.appendChild(linha);
  }
}

function mostrarAlertas() {
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

async function carregarPacotes() {
  const protocolo = document.querySelector("#protocol-filter")?.value || "";
  let url = `${api}/packets`;
  if (protocolo) url += `?protocol=${encodeURIComponent(protocolo)}`;

  const resposta = await fetch(url);
  pacotes = await lerResposta(resposta);
  mostrarPacotes();
}

async function carregarNos() {
  const resposta = await fetch(`${api}/nodes`);
  nos = await lerResposta(resposta);
  mostrarNos();
  mostrarAlertas();
}

async function carregarResumo() {
  const resposta = await fetch(`${api}/stats`);
  resumoCaptura = await lerResposta(resposta);
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

async function carregarCaptura() {
  const resposta = await fetch(`${api}/capture`);
  captura = await lerResposta(resposta);
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

async function carregarCamadas() {
  const resposta = await fetch(`${api}/layers`);
  const camadas = await lerResposta(resposta);
  for (const camada of camadas) {
    const linha = document.querySelector(`#layer-${camada.id}`);
    if (linha) {
      const protocolos = linha.querySelector("b") || linha;
      protocolos.textContent = camada.protocols.join(" · ");
    }
  }
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

function exportarRelatorio() {
  const linhas = [
    ["Categoria", "Indicador", "Valor"],
    ["Relatório", "Gerado em", new Date().toISOString()],
    ["Captura atual", "Interface", captura.interface || "—"],
    ["Captura atual", "Estado", captura.active ? "Ativa" : "Pausada"],
    ["Captura atual", "Duração", captura.duration || "—"],
    ["Métricas", "Pacotes capturados", resumoCaptura.captured ?? "—"],
    ["Métricas", "Taxa atual (pkt/s)", resumoCaptura.rate ?? "—"],
    ["Métricas", "Dados analisados (MB)", resumoCaptura.dataMB ?? "—"],
    ["Métricas", "Pacotes descartados", resumoCaptura.droppedPct ?? "—"],
    ...((resumoCaptura.protocols || []).map((protocolo) => [
      "Protocolo",
      protocolo.name,
      `${protocolo.total} (${protocolo.percentage})`,
    ])),
  ];
  const csv = linhas
    .map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const arquivo = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = "packethub-relatorio-atual.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

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

function abrirFormulario(recurso, registro = null) {
  recursoEditado = recurso;
  idEditado = registro ? registro.id : null;
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

  for (const campo of campos[recurso]) {
    const nome = campo[0];
    const rotulo = campo[1];
    const tipo = campo[2];
    const opcoes = campo[3];
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

async function salvarRegistro(evento) {
  evento.preventDefault();
  limparErro();

  const formulario = evento.currentTarget;
  const entradas = formulario.querySelectorAll("[name]");
  const dados = {};
  for (const entrada of entradas) dados[entrada.name] = entrada.value;

  let url = `${api}/${recursoEditado}`;
  let metodo = "POST";
  if (idEditado) {
    url += `/${encodeURIComponent(idEditado)}`;
    metodo = "PATCH";
  }

  try {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    await lerResposta(resposta);
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
    const resposta = await fetch(
      `${api}/${recurso}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
    await lerResposta(resposta);

    if (recurso === "packets") await carregarPacotes();
    else await carregarNos();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function atualizarCaptura(alteracoes) {
  limparErro();
  try {
    const resposta = await fetch(`${api}/capture`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alteracoes),
    });
    captura = await lerResposta(resposta);
    await carregarCaptura();
  } catch (erro) {
    mostrarErro(erro);
  }
}

document
  .querySelector("#add-packet")
  ?.addEventListener("click", () => abrirFormulario("packets"));
document
  .querySelector("#add-node")
  ?.addEventListener("click", () => abrirFormulario("nodes"));
document
  .querySelector("#packet-search")
  ?.addEventListener("input", mostrarPacotes);
document
  .querySelector("#packet-limit")
  ?.addEventListener("change", mostrarPacotes);
document.querySelector("#protocol-filter")?.addEventListener("change", () =>
  carregarPacotes().catch(mostrarErro),
);
document.querySelector("#dialog-close")?.addEventListener("click", () =>
  document.querySelector("#record-dialog").close(),
);
document.querySelector("#dialog-cancel")?.addEventListener("click", () =>
  document.querySelector("#record-dialog").close(),
);
document
  .querySelector("#record-form")
  ?.addEventListener("submit", salvarRegistro);
document.querySelector("#capture-toggle")?.addEventListener("click", () =>
  atualizarCaptura({ active: !captura.active }),
);
document.querySelector("#capture-filter")?.addEventListener("change", (evento) =>
  atualizarCaptura({ filter: evento.currentTarget.value }),
);
document
  .querySelector("#report-export")
  ?.addEventListener("click", exportarRelatorio);

const filtroInicial = document.querySelector("#protocol-filter");
if (filtroInicial) {
  const protocoloInicial = new URLSearchParams(window.location.search).get("protocol");
  if ([...filtroInicial.options].some((opcao) => opcao.value === protocoloInicial)) {
    filtroInicial.value = protocoloInicial;
  }
}

carregarPagina();
